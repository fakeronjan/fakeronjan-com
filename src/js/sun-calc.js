// Sun math for the sunrise/sunset page. Pure functions, no DOM, so it also runs in
// Node for accuracy checks. NOAA's solar position equations (after Meeus): good to
// about a minute away from the poles.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const MS_DAY = 86400000;

// Altitude of the sun's center at each event, in degrees.
export const ALT_SUNRISE = -0.833;   // upper limb on the horizon, with refraction
export const ALT_CIVIL = -6;         // civil twilight: first light / last light

function solarParams(ms) {
  const T = (ms / MS_DAY + 2440587.5 - 2451545) / 36525;   // Julian centuries from J2000
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T))
    + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T)
    + Math.sin(3 * M * RAD) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const appLong = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const meanObliq = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const obliq = meanObliq + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(obliq * RAD) * Math.sin(appLong * RAD));
  const y = Math.tan(obliq * RAD / 2) ** 2;
  const eot = 4 * DEG * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD)
    + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD)
    - 0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));
  return { decl, eot };   // radians, minutes
}

// Solar noon (ms since epoch) for the day whose UTC midnight is dayMs.
function solarNoon(dayMs, lon) {
  let noon = dayMs + (720 - 4 * lon) * 60000;
  for (let i = 0; i < 2; i++) noon = dayMs + (720 - 4 * lon - solarParams(noon).eot) * 60000;
  return noon;
}

// Rise and set instants for one altitude. Returns { rise, set } in ms, or
// { up: true } (sun never drops that low) / { up: false } (never gets that high).
function crossing(dayMs, lat, lon, alt) {
  const noon = solarNoon(dayMs, lon);
  const one = (sign) => {
    let t = noon;
    for (let i = 0; i < 4; i++) {
      const { decl, eot } = solarParams(t);
      const cosH = (Math.sin(alt * RAD) - Math.sin(lat * RAD) * Math.sin(decl))
        / (Math.cos(lat * RAD) * Math.cos(decl));
      if (cosH > 1) return { up: false };
      if (cosH < -1) return { up: true };
      const n = dayMs + (720 - 4 * lon - eot) * 60000;
      t = n + sign * 4 * Math.acos(cosH) * DEG * 60000;
    }
    return { t };
  };
  const r = one(-1), s = one(1);
  if (r.t === undefined || s.t === undefined) {
    const up = r.up ?? s.up;
    return { up, noon };
  }
  return { rise: r.t, set: s.t, noon };
}

// ---------------------------------------------------------------- time zones

const fmtCache = new Map();
function partsFmt(tz) {
  if (!fmtCache.has(tz)) {
    fmtCache.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    }));
  }
  return fmtCache.get(tz);
}

// Offset of the zone's wall clock from UTC at instant ms, in minutes.
export function tzOffset(tz, ms) {
  const p = Object.fromEntries(partsFmt(tz).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((wall - Math.floor(ms / 1000) * 1000) / 60000);
}

// The zone's standard (non-daylight-saving) offset for a year: the smaller of the
// January and July offsets, which works in both hemispheres.
export function standardOffset(tz, year) {
  return Math.min(tzOffset(tz, Date.UTC(year, 0, 1)), tzOffset(tz, Date.UTC(year, 6, 1)));
}

export function hasDST(tz, year) {
  return tzOffset(tz, Date.UTC(year, 0, 1)) !== tzOffset(tz, Date.UTC(year, 6, 1));
}

// Today's calendar date at the location, as a UTC-midnight ms value.
export function localToday(tz, nowMs = Date.now()) {
  const p = Object.fromEntries(partsFmt(tz).formatToParts(new Date(nowMs)).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day);
}

// ---------------------------------------------------------------- one day

// Everything the page needs for one local calendar date (dayMs = that date's UTC
// midnight). Times are minutes after local midnight, under both clocks:
//   clock: the zone's real wall clock (daylight saving included)
//   standard: the zone's standard offset all year
// A time is null when that event doesn't happen that day.
export function sunDay(dayMs, lat, lon, tz, stdOffset) {
  const sun = crossing(dayMs, lat, lon, ALT_SUNRISE);
  const civ = crossing(dayMs, lat, lon, ALT_CIVIL);
  const clockOff = tzOffset(tz, dayMs + 12 * 3600000 - stdOffset * 60000);
  const toMin = (ms, off) => ms == null ? null : (ms - dayMs) / 60000 + off;
  const times = (off) => ({
    sunrise: toMin(sun.rise, off), sunset: toMin(sun.set, off),
    dawn: toMin(civ.rise, off), dusk: toMin(civ.set, off),
  });
  const clockTimes = {};
  for (const [k, ms] of [['sunrise', sun.rise], ['sunset', sun.set], ['dawn', civ.rise], ['dusk', civ.set]]) {
    clockTimes[k] = ms == null ? null : toMin(ms, tzOffset(tz, ms));
  }
  let daylight;   // seconds
  if (sun.rise != null) daylight = (sun.set - sun.rise) / 1000;
  else daylight = sun.up ? 86400 : 0;
  return {
    dayMs, daylight, clockOffset: clockOff,
    polar: sun.rise == null ? (sun.up ? 'day' : 'night') : null,
    civilPolar: civ.rise == null ? (civ.up ? 'day' : 'night') : null,
    clock: clockTimes,
    standard: times(stdOffset),
  };
}

export function sunDays(startMs, count, lat, lon, tz) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = startMs + i * MS_DAY;
    const year = new Date(d).getUTCFullYear();
    out.push(sunDay(d, lat, lon, tz, standardOffset(tz, year)));
  }
  return out;
}

// ---------------------------------------------------------------- the stats

// First index after 0 where test(value) holds, skipping nulls. -1 if none.
function nextIndex(vals, test) {
  for (let i = 1; i < vals.length; i++) if (vals[i] != null && test(vals[i])) return i;
  return -1;
}

// "Today's X is the latest until <date>" (or earliest/longest/shortest). Of the two
// directions, one usually ends tomorrow; the other is the one worth saying.
// Returns { dir: 'max'|'min', untilIdx } or null.
export function untilStat(vals) {
  const v = vals[0];
  if (v == null) return null;
  const ge = nextIndex(vals, x => x >= v);   // today is the max until this day
  const le = nextIndex(vals, x => x <= v);   // today is the min until this day
  if (ge > 1 && (le === 1 || le === -1)) return { dir: 'max', untilIdx: ge };
  if (le > 1 && (ge === 1 || ge === -1)) return { dir: 'min', untilIdx: le };
  return null;
}

// Index of the extreme value within the window. Ties go to the earliest day.
export function extremeIndex(vals, dir) {
  let best = -1;
  vals.forEach((x, i) => {
    if (x == null) return;
    if (best === -1 || (dir === 'min' ? x < vals[best] : x > vals[best])) best = i;
  });
  return best;
}

// Next day the value crosses a whole-hour line (minutes for times, seconds for
// daylight via unit). Returns { idx, up, hour } or null.
export function nextHourCrossing(vals, unit) {
  const bucket = x => Math.floor(x / unit);
  if (vals[0] == null) return null;
  const b0 = bucket(vals[0]);
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] == null) continue;
    const b = bucket(vals[i]);
    if (b !== b0) return b > b0 ? { idx: i, up: true, hour: b } : { idx: i, up: false, hour: b0 };
  }
  return null;
}

// Next day the clock offset changes (daylight saving starts or ends).
export function nextClockChange(days) {
  for (let i = 1; i < days.length; i++) {
    if (days[i].clockOffset !== days[i - 1].clockOffset) {
      return { idx: i, ahead: days[i].clockOffset > days[i - 1].clockOffset };
    }
  }
  return null;
}
