import * as S from './sun-calc.js';
import { CITIES } from './sun-cities.js';

const $ = (s) => document.querySelector(s);
const DAY = 86400000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_PLACE = { name: 'New York, New York, United States', lat: 40.7128, lon: -74.006, tz: 'America/New_York' };
const STORE_KEY = 'sun-place';

let place = null;
let mode = 'clock';
let days = [];      // from today, 800 days (an "until" can land a year out)
let yearDays = [];  // the calendar year, for the chart
let pickedDay = null;  // a chosen date (UTC-midnight ms), or null for the real today
let placeB = null;  // second place, when comparing
let bDay = null;    // the second place on the first place's date
let bYear = [];     // the second place over the same calendar year

// ------------------------------------------------------------------ formatting

function fmtTime(min, { note = true } = {}) {
  if (min == null) return '-';
  if (note && min >= 1440) return `${fmtTime(min - 1440, { note: false })} the next morning`;
  let m = Math.round(min);
  m = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60), mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`;
}

function fmtDuration(sec) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

// Words that change once a date other than today is picked
const picked = () => pickedDay !== null;
const W_YEST = () => (picked() ? 'the previous day' : 'yesterday');
const W_TOM = () => (picked() ? 'the next day' : 'tomorrow');

function fmtChange(sec) {
  const s = Math.round(Math.abs(sec));
  const m = Math.floor(s / 60), r = s % 60;
  const amount = m ? `${m}m ${r}s` : `${r}s`;
  if (s === 0) return `Same as ${W_YEST()}`;
  return `${amount} ${sec > 0 ? 'more' : 'less'} than ${W_YEST()}`;
}

function dateObj(dayMs) { return new Date(dayMs); }
function fmtDate(dayMs, withYear) {
  const d = dateObj(dayMs);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${withYear ? `, ${d.getUTCFullYear()}` : ''}`;
}
// Year only when the date is far enough out that the month alone could mislead.
function fmtUntil(idx) { return fmtDate(days[idx].dayMs, idx > 300); }
function fmtShort(dayMs) {
  const d = dateObj(dayMs);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
}
function fmtIn(idx) {
  if (idx === 0) return picked() ? 'Same day' : 'Today';
  if (idx === 1) return picked() ? 'Next day' : 'Tomorrow';
  if (picked()) return `${idx} days later`;
  return `In ${idx} days`;
}

// ------------------------------------------------------------------ the stats

const vals = (k) => days.map(d => d[mode][k]);

let yest = null;     // yesterday, for the "than yesterday" lines

function fmtAmount(sec) {
  const s = Math.round(Math.abs(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  if (h) return `${h}h ${m}m`;
  return m ? `${m}m ${r}s` : `${r}s`;
}

// "1m 12s later than yesterday" for a sunrise/sunset time (minutes).
function vsYesterday(today, before) {
  if (today == null || before == null) return '';
  const sec = (today - before) * 60;
  if (Math.round(Math.abs(sec)) === 0) return `Same as ${W_YEST()}`;
  return `${fmtAmount(sec)} ${sec > 0 ? 'later' : 'earlier'} than ${W_YEST()}`;
}

// Both directions, even when one of them ends tomorrow ("Latest until tomorrow").
function untilLines(v, minWord, maxWord) {
  if (v[0] == null) return [];
  const next = (test) => v.findIndex((x, i) => i > 0 && x != null && test(x));
  const when = (i) => (i === 1 ? W_TOM() : fmtUntil(i));
  const lo = next(x => x <= v[0]), hi = next(x => x >= v[0]);
  const out = [];
  // Nothing matches it in the 800 days ahead: it's the year's extreme (solstice days)
  if (lo > 0) out.push(`${minWord} until ${when(lo)}`);
  else if (hi === 1) out.push(`${minWord} of the year`);
  if (hi > 0) out.push(`${maxWord} until ${when(hi)}`);
  else if (lo === 1) out.push(`${maxWord} of the year`);
  return out;
}

// The three stat columns under the sky picture: sunrise, daylight, sunset.
function todayColumns() {
  const t = days[0], tm = t[mode], ym = yest[mode];
  const timeCol = (k, label, lightKey, lightLabel, cls) => {
    const v = vals(k);
    if (v[0] == null) {
      const next = v.findIndex((x, i) => i > 0 && x != null);
      return { cls, label, big: k === 'sunrise' ? 'No sunrise' : 'No sunset',
        ctx: next > 0 ? [`Next ${label.toLowerCase()} ${fmtUntil(next)}`] : [],
        subs: [tm[lightKey] != null ? `${lightLabel} ${fmtTime(tm[lightKey])}` : ''] };
    }
    return { cls, label, big: fmtTime(v[0]), ctx: untilLines(v, 'Earliest', 'Latest'),
      subs: [vsYesterday(v[0], ym[k]), tm[lightKey] != null ? `${lightLabel} ${fmtTime(tm[lightKey])}` : ''] };
  };
  const dl = days.map(d => d.daylight);
  return [
    timeCol('sunrise', 'Sunrise', 'dawn', 'First light', 'rise'),
    { cls: 'day', label: 'Daylight', big: fmtDuration(dl[0]),
      // Polar night/day: every day ties at 0h or 24h, so the until lines say nothing
      ctx: dl[0] === 0 || dl[0] === 86400 ? [] : untilLines(dl, 'Shortest day', 'Longest day').reverse(), subs: [fmtChange(dl[0] - yest.daylight)] },
    timeCol('sunset', 'Sunset', 'dusk', 'Last light', 'set'),
  ];
}

function comingUp() {
  const rows = [];
  const win = 366;
  const add = (idx, kind, text, short) => { if (idx >= 0 && idx < win) rows.push({ idx, kind, text, short }); };
  const hourLabel = (h) => fmtTime(h * 60).replace(':00', '');

  // Turning points
  for (const [k, word, kind] of [['sunrise', 'sunrise', 'rise'], ['sunset', 'sunset', 'set']]) {
    const v = vals(k).slice(0, win);
    const lo = S.extremeIndex(v, 'min'), hi = S.extremeIndex(v, 'max');
    if (lo >= 0) add(lo, kind, `Earliest ${word} (${fmtTime(v[lo])})`, `Earliest ${word}`);
    if (hi >= 0) add(hi, kind, `Latest ${word} (${fmtTime(v[hi])})`, `Latest ${word}`);
  }
  const dl = days.map(d => d.daylight).slice(0, win);
  const short = S.extremeIndex(dl, 'min'), long = S.extremeIndex(dl, 'max');
  const nextWhere = (from, test) => { for (let i = from + 1; i < days.length; i++) if (test(days[i])) return i; return -1; };
  if (dl[short] === 0) {
    const back = nextWhere(short, d => d.daylight > 0);
    add(short, 'day', `The sun stops rising${back > 0 ? ` (next sunrise ${fmtUntil(back)})` : ''}`, 'The sun stops rising');
  } else add(short, 'day', `Shortest day (${fmtDuration(dl[short])} of daylight)`, 'Shortest day');
  if (dl[long] === 86400) {
    const back = nextWhere(long, d => d.daylight < 86400);
    add(long, 'day', `The sun stops setting${back > 0 ? ` (next sunset ${fmtUntil(back)})` : ''}`, 'The sun stops setting');
  } else add(long, 'day', `Longest day (${fmtDuration(dl[long])} of daylight)`, 'Longest day');

  // Whole-hour crossings
  for (const [k, word, kind] of [['sunrise', 'sunrise', 'rise'], ['sunset', 'sunset', 'set']]) {
    const v = vals(k).slice(0, win);
    const c = S.nextHourCrossing(v, 60);
    if (c) {
      const at = fmtTime(v[c.idx]), line = fmtTime(c.hour * 60);
      const dir = c.up ? 'after' : 'before';
      add(c.idx, kind, `First ${word} ${dir} ${line}${at === line ? '' : ` (${at})`}`, `First ${word} ${dir} ${hourLabel(c.hour)}`);
    }
  }
  const c = S.nextHourCrossing(dl, 3600);
  if (c) {
    const amt = fmtDuration(dl[c.idx]);
    const extra = amt === `${c.hour}h 0m` ? '' : ` (${amt})`;
    if (c.up) add(c.idx, 'day', `First day with ${c.hour}+ hours of daylight${extra}`, `${c.hour}+ hours of daylight`);
    else add(c.idx, 'day', `First day under ${c.hour} hours of daylight${extra}`, `Under ${c.hour} hours of daylight`);
  }
  // 12 hours of daylight, both ways (near the equinoxes, but a few days off them).
  // Skipped where the next-hour crossing above already is that 12-hour line.
  for (let i = 1; i < dl.length; i++) {
    const was = dl[i - 1] >= 43200, now = dl[i] >= 43200;
    if (was === now || (c && c.idx === i && c.hour === 12)) continue;
    if (now) add(i, 'day', 'First day with 12+ hours of daylight', '12+ hours of daylight');
    else add(i, 'day', 'First day under 12 hours of daylight', 'Under 12 hours of daylight');
  }

  // Daylight saving, both directions (clock time only; standard time ignores it)
  if (mode === 'clock') {
    for (const ch of S.clockChanges(days.slice(0, win))) {
      const a = days[ch.idx - 1].clock, b = days[ch.idx].clock;
      const moves = [];
      if (a.sunrise != null && b.sunrise != null) moves.push(`sunrise ${fmtTime(a.sunrise)} to ${fmtTime(b.sunrise)}`);
      if (a.sunset != null && b.sunset != null) moves.push(`sunset ${fmtTime(a.sunset)} to ${fmtTime(b.sunset)}`);
      const verb = ch.ahead ? 'move ahead' : 'move back';
      add(ch.idx, 'clock', `Clocks ${verb} an hour${moves.length ? ` (${moves.join(', ')})` : ''}`, `Clocks ${verb}`);
    }
  }

  return rows.sort((a, b) => a.idx - b.idx);
}

// ------------------------------------------------------------------ rendering

function shortNames() {
  const a = place.name.split(',')[0], b = placeB ? placeB.name.split(',')[0] : '';
  return a === b ? [place.name, placeB.name] : [a, b];   // two Portlands keep their full names
}

function render() {
  const t = dateObj(days[0].dayMs);
  const [shortName, shortB] = shortNames();
  const dateLine = `${WEEKDAYS[t.getUTCDay()]}, ${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}${picked() ? `, ${t.getUTCFullYear()}` : ''}`;
  $('#sun-today-title').textContent = placeB
    ? `${dateLine}: ${shortName} vs. ${shortB}`
    : picked() ? `${shortName}: ${dateLine}` : `Today in ${shortName}: ${dateLine}`;
  $('#sun-date').value = isoDate(days[0].dayMs);
  $('#sun-back').hidden = !picked();

  drawSky();
  if (placeB) renderCompare(shortName, shortB);
  else $('#sun-stats').innerHTML = todayColumns().map(c => `
    <div class="sun-stat">
      <span class="sun-kicker">${c.label}</span>
      <span class="sun-big">${c.big}</span>
      ${c.ctx.map(x => `<span class="sun-ctx k-${c.cls}">${x}</span>`).join('')}
      ${c.subs.filter(Boolean).map(x => `<span class="sun-sub">${x}</span>`).join('')}
    </div>`).join('');

  $('#sun-ms-title').textContent = placeB ? `Milestones over the next year in ${shortName}` : 'Milestones over the next year';
  const rows = comingUp();
  drawTimeline(rows);
  $('#sun-coming').innerHTML = rows.map(r =>
    `<tr><td class="sun-date">${fmtShort(days[r.idx].dayMs)}</td><td class="sun-in">${fmtIn(r.idx)}</td><td><span class="sun-dot k-${r.kind}" aria-hidden="true"></span>${r.text}</td></tr>`
  ).join('');
  $('#sun-chart-title').textContent = placeB
    ? `${t.getUTCFullYear()}: ${shortName} vs. ${shortB}`
    : `${t.getUTCFullYear()} in ${shortName}`;
  $('#sun-legend').innerHTML = placeB
    ? `<span class="l-a">${shortName} daylight</span><span class="l-b">${shortB} daylight</span><span class="l-twi">Twilight</span><span class="l-today">${picked() ? 'Selected day' : 'Today'}</span>`
    : `<span class="l-day">Daylight</span><span class="l-twi">Twilight</span><span class="l-today">${picked() ? 'Selected day' : 'Today'}</span>`;
  $('#sun-cross').hidden = !placeB;
  $('#sun-side').hidden = !placeB;
  if (placeB) renderSide(shortName, shortB);
  drawChart();
}

// ------------------------------------------------------------------ comparing

const swatch = (k) => `<span class="sun-sw ${k}" aria-hidden="true"></span>`;

function fmtGap(sec) {
  const s = Math.round(Math.abs(sec)), h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

// Today: both values per stat, then the gap as one sentence.
function renderCompare(nA, nB) {
  const a = days[0], b = bDay, am = a[mode], bm = b[mode];
  const where = mode === 'clock' ? 'on the clock' : 'in standard time';
  const timeGap = (ta, tb, word) => {
    if (ta == null || tb == null) return '';
    const g = (tb - ta) * 60;
    if (Math.abs(g) < 60) return '<span class="sun-sub">About the same time</span>';
    return `<span class="sun-diff">${nB}'s ${word} is ${fmtGap(g)} ${g > 0 ? 'later' : 'earlier'} ${where}</span>`;
  };
  const dg = b.daylight - a.daylight;
  const cols = [
    ['Sunrise', fmtTime(am.sunrise), fmtTime(bm.sunrise), timeGap(am.sunrise, bm.sunrise, 'sunrise')],
    ['Daylight', fmtDuration(a.daylight), fmtDuration(b.daylight), Math.abs(dg) < 60
      ? '<span class="sun-sub">About the same daylight</span>'
      : `<span class="sun-diff">${nB} gets ${fmtGap(dg)} ${dg > 0 ? 'more' : 'less'} daylight</span>`],
    ['Sunset', fmtTime(am.sunset), fmtTime(bm.sunset), timeGap(am.sunset, bm.sunset, 'sunset')],
  ];
  const none = (v, k) => v === '-' ? (k === 'Sunrise' ? 'No sunrise' : 'No sunset') : v;
  $('#sun-stats').innerHTML = cols.map(([k, va, vb, d]) => `
    <div class="sun-stat">
      <span class="sun-kicker">${k}</span>
      <div class="sun-pv">
        <span class="sun-pn">${swatch('a')}${nA}</span><span class="sun-pval">${none(va, k)}</span>
        <span class="sun-pn">${swatch('b')}${nB}</span><span class="sun-pval">${none(vb, k)}</span>
      </div>
      ${d}
    </div>`).join('');
}

// Crossover dates under the chart, and the side-by-side extremes table.
function renderSide(nA, nB) {
  const n = yearDays.length, jan1 = yearDays[0].dayMs, year = dateObj(jan1).getUTCFullYear();
  const runs = []; let start = null;
  for (let i = 0; i < n; i++) {
    const more = bYear[i].daylight > yearDays[i].daylight;
    if (more && start === null) start = i;
    if (!more && start !== null) { runs.push([start, i - 1]); start = null; }
  }
  if (start !== null) runs.push([start, n - 1]);
  const lines = [];
  if (!runs.length) lines.push(`${nA} has more daylight every day of ${year}`);
  else if (runs.length === 1 && runs[0][0] === 0 && runs[0][1] === n - 1) lines.push(`${nB} has more daylight every day of ${year}`);
  else {
    // A stretch that runs through New Year reads as one stretch
    let rs = runs;
    if (runs.length >= 2 && runs[0][0] === 0 && runs[runs.length - 1][1] === n - 1) {
      rs = [[runs[runs.length - 1][0], runs[0][1]], ...runs.slice(1, -1)];
    }
    rs.forEach(([a, b]) => lines.push(`${nB} has more daylight from ${fmtDate(jan1 + a * DAY)} to ${fmtDate(jan1 + b * DAY)}`));
    lines.push(`${nA} has more the rest of the year`);
  }
  $('#sun-cross').innerHTML = lines.map(l => `<li>${l}</li>`).join('');

  const pick = (arr, f, dir) => {
    let bi = -1;
    arr.forEach((d, i) => { const v = f(d); if (v == null) return; if (bi < 0 || (dir < 0 ? v < f(arr[bi]) : v > f(arr[bi]))) bi = i; });
    return bi;
  };
  const timeCell = (arr, k, dir) => {
    const i = pick(arr, d => d[mode][k], dir);
    return i < 0 ? '<b>None</b>' : `<b>${fmtTime(arr[i][mode][k])}</b><span class="sun-d">${fmtShort(arr[i].dayMs)}</span>`;
  };
  const dayCell = (arr, dir) => {
    const i = pick(arr, d => d.daylight, dir), v = arr[i].daylight;
    if (v === 0 || v === 86400) {
      const idx = arr.map((d, j) => (d.daylight === v ? j : -1)).filter(j => j >= 0);
      const one = idx[idx.length - 1] - idx[0] === idx.length - 1;
      const when = one ? `${fmtShort(arr[idx[0]].dayMs)} to ${fmtShort(arr[idx[idx.length - 1]].dayMs)}` : `in ${year}`;
      return `<b>${v === 0 ? 'No sunrise' : 'No sunset'}</b><span class="sun-d">${idx.length} days, ${when}</span>`;
    }
    return `<b>${fmtDuration(v)}</b><span class="sun-d">${fmtShort(arr[i].dayMs)}</span>`;
  };
  const rows = [
    ['Longest day', dayCell(yearDays, 1), dayCell(bYear, 1)],
    ['Shortest day', dayCell(yearDays, -1), dayCell(bYear, -1)],
    ['Earliest sunrise', timeCell(yearDays, 'sunrise', -1), timeCell(bYear, 'sunrise', -1)],
    ['Latest sunrise', timeCell(yearDays, 'sunrise', 1), timeCell(bYear, 'sunrise', 1)],
    ['Earliest sunset', timeCell(yearDays, 'sunset', -1), timeCell(bYear, 'sunset', -1)],
    ['Latest sunset', timeCell(yearDays, 'sunset', 1), timeCell(bYear, 'sunset', 1)],
  ];
  const total = (arr) => Math.round(arr.reduce((t, d) => t + d.daylight, 0) / 3600).toLocaleString('en-US');
  $('#sun-ext').innerHTML =
    `<thead><tr><th></th><th>${swatch('a')}${nA}</th><th>${swatch('b')}${nB}</th></tr></thead><tbody>` +
    rows.map(([k, a, b]) => `<tr><td class="sun-label">${k}</td><td>${a}</td><td>${b}</td></tr>`).join('') +
    `<tr class="sun-total"><td class="sun-label">Daylight in ${year}</td><td><b>${total(yearDays)} hours</b></td><td><b>${total(bYear)} hours</b></td></tr></tbody>`;
}

function setModeVisibility() {
  const year = dateObj(days[0].dayMs).getUTCFullYear();
  const dstIn = (p) => S.hasDST(p.tz, year) || S.hasDST(p.tz, year + 1);
  const dst = dstIn(place) || (placeB && dstIn(placeB));
  $('#sun-mode').hidden = !dst;
  if (!dst) mode = 'clock';
  document.querySelectorAll('#sun-mode button').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
    b.setAttribute('aria-pressed', b.dataset.mode === mode);
  });
}

function compute() {
  const today = pickedDay ?? S.localToday(place.tz);
  days = S.sunDays(today, 800, place.lat, place.lon, place.tz);
  yest = S.sunDays(today - DAY, 1, place.lat, place.lon, place.tz)[0];
  const y = dateObj(today).getUTCFullYear();
  const jan1 = Date.UTC(y, 0, 1);
  const len = (Date.UTC(y + 1, 0, 1) - jan1) / DAY;
  yearDays = S.sunDays(jan1, len, place.lat, place.lon, place.tz);
  if (placeB) {
    // Same calendar date as the first place, so the numbers line up
    bDay = S.sunDay(today, placeB.lat, placeB.lon, placeB.tz, S.standardOffset(placeB.tz, y));
    bYear = S.sunDays(jan1, len, placeB.lat, placeB.lon, placeB.tz);
  }
}

function setPlace(p, { remember = true, url = true } = {}) {
  place = p;
  $('#sun-search').value = p.name;
  if (remember) { try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) { /* storage off */ } }
  const q = new URLSearchParams(location.search);
  if (url) {
    q.set('place', p.name); q.set('lat', p.lat); q.set('lon', p.lon); q.set('tz', p.tz);
  } else {
    ['place', 'lat', 'lon', 'tz'].forEach(k => q.delete(k));
  }
  history.replaceState(null, '', `${location.pathname}${q.toString() ? '?' + q : ''}`);
  compute();
  setModeVisibility();
  render();
}

// ------------------------------------------------------------------ today's sky

// Today's sun path on a 24-hour line: night, twilight, and daylight bands, with the
// arc from sunrise to sunset. Fixed viewBox; it scales with the page.
function drawSky() {
  if (placeB) { drawSkyPair(); return; }
  const host = $('#sun-sky');
  host.innerHTML = '';
  // Drawn at the real pixel width so labels stay full size on phones
  const W = host.clientWidth || 720, H = W < 500 ? 150 : 176;
  const L = 14, R = W - 14, TOP = 10, BASE = H - 30;
  const CTRL = TOP - (BASE - TOP) * 0.15;      // arc control point; the apex sits halfway to it
  const APEX = (BASE + CTRL) / 2;
  const x = (min) => L + (min / 1440) * (R - L);
  const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Today's sun in ${place.name}: sunrise ${fmtTime(days[0][mode].sunrise)}, sunset ${fmtTime(days[0][mode].sunset)}` });
  const clipId = 'sun-sky-clip';
  const defs = el('defs', {}, svg);
  el('rect', { x: L, y: TOP, width: R - L, height: BASE - TOP + 2 }, el('clipPath', { id: clipId }, defs));
  const g = el('g', { 'clip-path': `url(#${clipId})` }, svg);
  el('rect', { x: L, y: TOP, width: R - L, height: BASE - TOP, rx: 6, class: 'sky-night' }, g);
  const band = (a, b, cls) => {
    if (a < 0) { band(a + 1440, 1440, cls); band(0, b, cls); return; }
    if (b > 1440) { band(a, 1440, cls); band(0, b - 1440, cls); return; }
    if (b > a) el('rect', { x: x(a), y: TOP, width: x(b) - x(a), height: BASE - TOP, class: cls }, g);
  };
  const d = days[0], t = d[mode];
  if (d.civilPolar === 'day') band(0, 1440, 'sky-twi');
  else if (t.dawn != null) band(t.dawn, t.dusk, 'sky-twi');
  if (d.polar === 'day') band(0, 1440, 'sky-day');
  else if (t.sunrise != null) band(t.sunrise, t.sunset, 'sky-day');

  if (t.sunrise != null) {
    const x1 = x(t.sunrise), x2 = x(t.sunset), mx = (x1 + x2) / 2;
    el('path', { d: `M${x1} ${BASE} Q${mx} ${CTRL} ${x2} ${BASE}`, class: 'sky-arc' }, g);
    el('circle', { cx: mx, cy: APEX, r: 10, class: 'sky-sun' }, g);
    el('circle', { cx: x1, cy: BASE, r: 5, class: 'sky-dot k-rise' }, svg);
    el('circle', { cx: x2, cy: BASE, r: 5, class: 'sky-dot k-set' }, svg);
  } else if (d.polar === 'day') {
    el('circle', { cx: x(720), cy: APEX, r: 10, class: 'sky-sun' }, g);
  }
  el('line', { x1: L, x2: R, y1: BASE, y2: BASE, class: 'sky-horizon' }, svg);
  [[0, 'start'], [360, 'middle'], [720, 'middle'], [1080, 'middle'], [1440, 'end']].forEach(([m, anchor]) => {
    const lab = el('text', { x: x(m), y: H - 10, class: 'sun-axis sky-axis', 'text-anchor': anchor }, svg);
    lab.textContent = fmtTime(m % 1440).replace(':00', '');
  });
  host.appendChild(svg);
}

// Compare mode: both places' days stacked on one 24-hour line, each named above its bar.
function drawSkyPair() {
  const host = $('#sun-sky');
  host.innerHTML = '';
  const W = host.clientWidth || 720, L = 14, R = W - 14;
  const ROW = W < 500 ? 52 : 64, LABEL = 20, GAP = 10;
  const H = (LABEL + ROW) * 2 + GAP + 26;
  const x = (min) => L + (min / 1440) * (R - L);
  const [nA, nB] = shortNames();
  const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Today's sun in ${place.name} and ${placeB.name}` });
  const defs = el('defs', {}, svg);
  [[days[0], nA, 'a'], [bDay, nB, 'b']].forEach(([d, name, k], r) => {
    const top = r * (LABEL + ROW + GAP) + LABEL, base = top + ROW;
    const sw = el('rect', { x: L, y: top - 15, width: 11, height: 11, rx: 2.5, class: `sky-sw ${k}` }, svg);
    const lab = el('text', { x: L + 17, y: top - 6, class: 'sky-name' }, svg);
    lab.textContent = name;
    const clipId = `sun-sky-clip-${k}`;
    el('rect', { x: L, y: top, width: R - L, height: ROW + 2 }, el('clipPath', { id: clipId }, defs));
    const g = el('g', { 'clip-path': `url(#${clipId})` }, svg);
    el('rect', { x: L, y: top, width: R - L, height: ROW, rx: 5, class: 'sky-night' }, g);
    const band = (a, b, cls) => {
      if (a < 0) { band(a + 1440, 1440, cls); band(0, b, cls); return; }
      if (b > 1440) { band(a, 1440, cls); band(0, b - 1440, cls); return; }
      if (b > a) el('rect', { x: x(a), y: top, width: x(b) - x(a), height: ROW, class: cls }, g);
    };
    const t = d[mode];
    if (d.civilPolar === 'day') band(0, 1440, 'sky-twi');
    else if (t.dawn != null) band(t.dawn, t.dusk, 'sky-twi');
    if (d.polar === 'day') band(0, 1440, 'sky-day');
    else if (t.sunrise != null) band(t.sunrise, t.sunset, 'sky-day');
    if (t.sunrise != null) {
      const x1 = x(t.sunrise), x2 = x(t.sunset), mx = (x1 + x2) / 2, ctrl = top - ROW * 0.5;
      el('path', { d: `M${x1} ${base} Q${mx} ${ctrl} ${x2} ${base}`, class: 'sky-arc' }, g);
      el('circle', { cx: mx, cy: (base + ctrl) / 2, r: 7, class: 'sky-sun' }, g);
    } else if (d.polar === 'day') {
      el('circle', { cx: x(720), cy: top + ROW * 0.35, r: 7, class: 'sky-sun' }, g);
    }
    el('line', { x1: L, x2: R, y1: base, y2: base, class: 'sky-horizon' }, svg);
  });
  [[0, 'start'], [360, 'middle'], [720, 'middle'], [1080, 'middle'], [1440, 'end']].forEach(([m, anchor]) => {
    const lab = el('text', { x: x(m), y: H - 8, class: 'sun-axis sky-axis', 'text-anchor': anchor }, svg);
    lab.textContent = fmtTime(m % 1440).replace(':00', '');
  });
  host.appendChild(svg);
}

// ------------------------------------------------------------------ coming-up timeline

// The next 12 months on one line. Each label takes the first row (nearest the line
// first) where it clears the label to its left; rows alternate above and below.
function drawTimeline(rows) {
  const host = $('#sun-timeline');
  host.innerHTML = '';
  // Real pixels, at least 640 wide (narrower screens scroll it sideways)
  const W = Math.max(640, host.clientWidth || 900), H = 236, L = 30, R = W - 30, MID = 112;
  const X = (idx) => L + (idx / 365) * (R - L);
  const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Sun milestones over the next 12 months' });
  host.appendChild(svg);   // in the DOM first, so getBBox can measure labels
  el('line', { x1: L, x2: R, y1: MID, y2: MID, class: 'tl-axis' }, svg);
  const start = days[0].dayMs;
  const d0 = dateObj(start);
  for (let i = 1; i <= 12; i++) {
    const first = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + i, 1);
    const idx = (first - start) / DAY;
    if (idx > 365) break;
    el('line', { x1: X(idx), x2: X(idx), y1: MID - 4, y2: MID + 4, class: 'tl-axis' }, svg);
    const lab = el('text', { x: X(idx) + 2, y: MID + 17, class: 'sun-axis' }, svg);
    lab.textContent = MONTHS[dateObj(first).getUTCMonth()].slice(0, 3);
  }
  el('circle', { cx: L, cy: MID, r: 6, class: 'tl-today' }, svg);
  const tl = el('text', { x: L, y: MID + 33, class: 'sun-axis', 'text-anchor': 'middle' }, svg);
  tl.textContent = picked() ? fmtShort(start).replace(/\/\d{4}$/, '') : 'Today';

  const lanes = [{ y: 83, up: true }, { y: 157, up: false }, { y: 53, up: true }, { y: 187, up: false },
    { y: 23, up: true }, { y: 217, up: false }];
  const laneEnd = lanes.map(() => -Infinity);
  const gStem = el('g', {}, svg), gDot = el('g', {}, svg), gText = el('g', {}, svg);
  rows.forEach(r => {
    const x = X(r.idx);
    const t1 = el('text', { class: 'tl-label' }, gText); t1.textContent = r.short;
    const t2 = el('text', { class: 'tl-date' }, gText); t2.textContent = fmtShort(days[r.idx].dayMs).replace(/\/\d{4}$/, '');
    const w = Math.max(t1.getBBox().width, t2.getBBox().width);
    const flip = x + 4 + w > W - 6;
    const left = flip ? x - 4 - w : x;
    let ln = laneEnd.findIndex(e => e < left - 8);
    if (ln === -1) ln = laneEnd.indexOf(Math.min(...laneEnd));
    laneEnd[ln] = flip ? x : x + 4 + w;
    const { y, up } = lanes[ln];
    for (const t of [t1, t2]) { t.setAttribute('x', flip ? x - 4 : x + 4); if (flip) t.setAttribute('text-anchor', 'end'); }
    t2.setAttribute('y', up ? y + 14 : y);
    t1.setAttribute('y', up ? y : y + 14);
    el('line', { x1: x, x2: x, y1: MID, y2: up ? y - 10 : y + 18, class: `tl-stem k-${r.kind}` }, gStem);
    el('circle', { cx: x, cy: MID, r: 5, class: `tl-dot k-${r.kind}` }, gDot);
  });
}

// ------------------------------------------------------------------ the chart

const SVGNS = 'http://www.w3.org/2000/svg';
function el(name, attrs, parent) {
  const e = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

function drawChart() {
  const wrap = $('#sun-chart');
  wrap.querySelector('svg')?.remove();
  const W = wrap.clientWidth || 600;
  const H = Math.round(Math.min(380, Math.max(260, W * 0.55)));
  const m = { l: 44, r: 8, t: 8, b: 26 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const n = yearDays.length;
  const x = (i) => m.l + (i / n) * iw;
  // 12am at the top, the day reading downward: sunrise above sunset
  const y = (min) => m.t + (Math.max(0, Math.min(1440, min)) / 1440) * ih;
  const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Sunrise, sunset, and twilight through the year in ${place.name}` });

  // Grid + y labels every 3 hours
  for (let h = 0; h <= 24; h += 3) {
    el('line', { x1: m.l, x2: m.l + iw, y1: y(h * 60), y2: y(h * 60), class: 'sun-grid' }, svg);
    const lab = el('text', { x: m.l - 6, y: y(h * 60) + 4, class: 'sun-axis', 'text-anchor': 'end' }, svg);
    lab.textContent = fmtTime((h % 24) * 60).replace(':00', '');
  }

  // Bands: one thin column per day, so polar days and after-midnight sunsets just work
  // Whole-pixel columns with crisp edges, so neighboring days don't leave seams
  // Ranges that run past midnight (either side) wrap to the other edge of the chart.
  const band = (y1, y2, cls, i) => {
    if (y1 < 0) { band(y1 + 1440, 1440, cls, i); band(0, y2, cls, i); return; }
    if (y2 > 1440) { band(y1, 1440, cls, i); band(0, y2 - 1440, cls, i); return; }
    if (y2 <= y1) return;
    const x0 = Math.round(x(i)), x1 = Math.round(x(i + 1));
    if (x1 <= x0) return;
    el('rect', { x: x0, y: y(y1), width: x1 - x0, height: y(y2) - y(y1), class: cls, 'shape-rendering': 'crispEdges' }, svg);
  };
  yearDays.forEach((d, i) => {
    const t = d[mode];
    if (d.polar === 'day') { band(0, 1440, 'sun-day', i); return; }
    // Twilight
    if (d.civilPolar === 'day') band(0, 1440, 'sun-twi', i);
    else if (t.dawn != null) band(t.dawn, t.dusk, 'sun-twi', i);
    if (d.polar === 'night') return;
    band(t.sunrise, t.sunset, 'sun-day', i);
  });

  // Sunrise and sunset edges
  for (const k of ['sunrise', 'sunset']) {
    let dstr = '', pen = false;
    yearDays.forEach((d, i) => {
      const v = d[mode][k];
      if (v == null || v > 1440 || v < 0) { pen = false; return; }
      const px = x(i + 0.5).toFixed(1), py = y(v).toFixed(1);
      // Break the line at the daylight saving jump instead of drawing a vertical
      if (pen && i > 0 && yearDays[i - 1][mode][k] != null && Math.abs(v - yearDays[i - 1][mode][k]) > 30) pen = false;
      dstr += `${pen ? 'L' : 'M'}${px},${py}`;
      pen = true;
    });
    el('path', { d: dstr, class: 'sun-edge' }, svg);
  }

  // Second place: its sunrise and sunset as outlined lines over the first place's bands
  if (placeB) {
    for (const k of ['sunrise', 'sunset']) {
      let dstr = '', pen = false;
      bYear.forEach((d, i) => {
        const v = d[mode][k];
        if (v == null || v > 1440 || v < 0) { pen = false; return; }
        const prev = i > 0 ? bYear[i - 1][mode][k] : null;
        if (pen && prev != null && Math.abs(v - prev) > 30) pen = false;
        dstr += `${pen ? 'L' : 'M'}${x(i + 0.5).toFixed(1)},${y(v).toFixed(1)}`;
        pen = true;
      });
      el('path', { d: dstr, class: 'sun-b-edge' }, svg);
    }
  }

  // Month labels
  const y0 = dateObj(yearDays[0].dayMs).getUTCFullYear();
  for (let mo = 0; mo < 12; mo++) {
    const i = (Date.UTC(y0, mo, 1) - yearDays[0].dayMs) / DAY;
    el('line', { x1: x(i), x2: x(i), y1: m.t + ih, y2: m.t + ih + 4, class: 'sun-tick' }, svg);
    const lab = el('text', { x: x(i + 15), y: H - 8, class: 'sun-axis', 'text-anchor': 'middle' }, svg);
    lab.textContent = MONTHS[mo].slice(0, iw < 420 ? 1 : 3);
  }

  // Today
  const ti = (days[0].dayMs - yearDays[0].dayMs) / DAY;
  el('line', { x1: x(ti + 0.5), x2: x(ti + 0.5), y1: m.t, y2: m.t + ih, class: 'sun-today' }, svg);

  // Hover
  const cross = el('line', { x1: 0, x2: 0, y1: m.t, y2: m.t + ih, class: 'sun-cross', visibility: 'hidden' }, svg);
  const hit = el('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent' }, svg);
  const tip = $('#sun-tip');
  const move = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    const i = Math.max(0, Math.min(n - 1, Math.floor(((px - m.l) / iw) * n)));
    const d = yearDays[i];
    const cx = x(i + 0.5);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
    if (placeB) {
      const [nA, nB] = shortNames(), b = bYear[i];
      const line = (n, x) => `${n}: ${fmtTime(x[mode].sunrise)} to ${fmtTime(x[mode].sunset)} (${fmtDuration(x.daylight)})`;
      tip.innerHTML = `<strong>${fmtDate(d.dayMs)}</strong><br>${line(nA, d)}<br>${line(nB, b)}`;
    } else {
      tip.innerHTML = `<strong>${fmtDate(d.dayMs)}</strong><br>Sunrise ${fmtTime(d[mode].sunrise)}<br>Sunset ${fmtTime(d[mode].sunset)}<br>Daylight ${fmtDuration(d.daylight)}`;
    }
    tip.hidden = false;
    const wr = wrap.getBoundingClientRect();
    const tw = tip.offsetWidth;
    let left = r.left - wr.left + cx + 10;
    if (left + tw > wr.width) left = r.left - wr.left + cx - tw - 10;
    tip.style.left = `${Math.max(0, left)}px`;
    tip.style.top = `${m.t + 6}px`;
  };
  const leave = () => { cross.setAttribute('visibility', 'hidden'); tip.hidden = true; };
  hit.addEventListener('mousemove', move);
  hit.addEventListener('mouseleave', leave);
  hit.addEventListener('touchstart', move, { passive: true });
  hit.addEventListener('touchmove', move, { passive: true });
  hit.addEventListener('touchend', leave);

  wrap.prepend(svg);
}

// ------------------------------------------------------------------ picking a day

function isoDate(ms) { return new Date(ms).toISOString().slice(0, 10); }

// null = back to the real today. The date rides in the URL as ?date=YYYY-MM-DD.
function setDay(ms) {
  if (ms !== null && ms === S.localToday(place.tz)) ms = null;
  pickedDay = ms;
  const q = new URLSearchParams(location.search);
  if (ms === null) q.delete('date'); else q.set('date', isoDate(ms));
  history.replaceState(null, '', `${location.pathname}${q.toString() ? '?' + q : ''}`);
  compute();
  setModeVisibility();
  render();
}

// ------------------------------------------------------------------ search

const searchTimer = { a: null, b: null }, searchSeq = { a: 0, b: 0 };
function placeName(r) { return [r.name, r.admin1, r.country].filter((v, i, a) => v && a.indexOf(v) === i).join(', '); }

async function search(q, which = 'a') {
  const seq = ++searchSeq[which];
  const list = $(which === 'b' ? '#sun-results-b' : '#sun-results');
  if (q.trim().length < 2) { list.hidden = true; return; }
  let results = [];
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=8&language=en&format=json`);
    results = (await r.json()).results || [];
  } catch (e) { results = []; }
  if (seq !== searchSeq[which]) return;
  results = results.filter(r => r.timezone);
  list.innerHTML = results.length
    ? results.map((r, i) => `<li><button type="button" data-i="${i}">${placeName(r)}</button></li>`).join('')
    : '<li class="sun-none">No matches</li>';
  list.hidden = false;
  list.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const r = results[+b.dataset.i];
    list.hidden = true;
    const p = { name: placeName(r), lat: r.latitude, lon: r.longitude, tz: r.timezone };
    if (which === 'b') setPlaceB(p); else setPlace(p);
  }));
}

function randomCity(avoid) {
  let c;
  do { c = CITIES[Math.floor(Math.random() * CITIES.length)]; } while (CITIES.length > 2 && avoid.includes(c[0]));
  return { name: c[0], lat: c[1], lon: c[2], tz: c[3] };
}

// Second place on or off. It lives in the URL (place2/lat2/lon2/tz2) so a comparison can be shared.
function setPlaceB(p, { url = true } = {}) {
  placeB = p;
  $('#sun-row-b').hidden = !p && !$('#sun-row-b').dataset.open;
  $('#sun-compare').hidden = !!p || !!$('#sun-row-b').dataset.open;
  $('#sun-search-b').value = p ? p.name : '';
  document.querySelector('.sun-controls').classList.toggle('comparing', !!p || !!$('#sun-row-b').dataset.open);
  const q = new URLSearchParams(location.search);
  if (p && url) { q.set('place2', p.name); q.set('lat2', p.lat); q.set('lon2', p.lon); q.set('tz2', p.tz); }
  else ['place2', 'lat2', 'lon2', 'tz2'].forEach(k => q.delete(k));
  history.replaceState(null, '', `${location.pathname}${q.toString() ? '?' + q : ''}`);
  if (!place) return;
  compute();
  setModeVisibility();
  render();
}

function init() {
  const q = new URLSearchParams(location.search);
  let start = null;
  if (q.get('lat') && q.get('lon') && q.get('tz')) {
    start = { name: q.get('place') || 'Selected place', lat: +q.get('lat'), lon: +q.get('lon'), tz: q.get('tz') };
  } else {
    try { start = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { start = null; }
  }
  if (!start || !isFinite(start.lat) || !isFinite(start.lon)) start = DEFAULT_PLACE;
  try { S.tzOffset(start.tz, Date.now()); } catch (e) { start = DEFAULT_PLACE; }

  for (const [which, id] of [['a', '#sun-search'], ['b', '#sun-search-b']]) {
    $(id).addEventListener('input', (e) => {
      clearTimeout(searchTimer[which]);
      searchTimer[which] = setTimeout(() => search(e.target.value, which), 250);
    });
    $(id).addEventListener('focus', (e) => e.target.select());
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sun-field')) { $('#sun-results').hidden = true; $('#sun-results-b').hidden = true; }
  });
  $('#sun-random').addEventListener('click', () => setPlace(randomCity([place.name, placeB?.name])));
  $('#sun-random-b').addEventListener('click', () => {
    $('#sun-row-b').dataset.open = '1';
    setPlaceB(randomCity([place.name, placeB?.name]));
  });
  $('#sun-compare').addEventListener('click', () => {
    $('#sun-row-b').dataset.open = '1';
    $('#sun-row-b').hidden = false;
    $('#sun-compare').hidden = true;
    document.querySelector('.sun-controls').classList.add('comparing');
    $('#sun-search-b').focus();
  });
  $('#sun-clear-b').addEventListener('click', () => {
    delete $('#sun-row-b').dataset.open;
    $('#sun-results-b').hidden = true;
    setPlaceB(null);
  });
  $('#sun-locate').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    $('#sun-locate').disabled = true;
    navigator.geolocation.getCurrentPosition((pos) => {
      $('#sun-locate').disabled = false;
      setPlace({ name: 'Your location', lat: pos.coords.latitude, lon: pos.coords.longitude,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone }, { remember: false, url: false });
    }, () => { $('#sun-locate').disabled = false; });
  });
  document.querySelectorAll('#sun-mode button').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    setModeVisibility();
    render();
  }));
  let lastW = 0;
  window.addEventListener('resize', () => {
    const w = $('#sun-chart').clientWidth;
    if (w !== lastW) { lastW = w; drawChart(); drawSky(); drawTimeline(comingUp()); }
  });

  const qd = q.get('date');
  if (qd && /^\d{4}-\d{2}-\d{2}$/.test(qd) && !isNaN(Date.parse(qd + 'T00:00:00Z'))) pickedDay = Date.parse(qd + 'T00:00:00Z');
  $('#sun-date').addEventListener('change', (e) => {
    if (e.target.value) setDay(Date.parse(e.target.value + 'T00:00:00Z'));
  });
  $('#sun-prev').addEventListener('click', () => setDay(days[0].dayMs - DAY));
  $('#sun-next').addEventListener('click', () => setDay(days[0].dayMs + DAY));
  $('#sun-back').addEventListener('click', () => setDay(null));
  if (q.get('lat2') && q.get('lon2') && q.get('tz2')) {
    const b = { name: q.get('place2') || 'Second place', lat: +q.get('lat2'), lon: +q.get('lon2'), tz: q.get('tz2') };
    try { S.tzOffset(b.tz, Date.now()); if (isFinite(b.lat) && isFinite(b.lon)) { $('#sun-row-b').dataset.open = '1'; setPlaceB(b); } } catch (e) { /* bad zone: ignore */ }
  }
  setPlace(start, { remember: false, url: !!q.get('lat') });
}

init();
