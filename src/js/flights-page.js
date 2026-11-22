// fakeronjan.com/flights: route stats from the Bureau of Transportation Statistics'
// on-time data (2018 on). Data lives in the flights-data repo (GitHub Pages); this page
// sums whichever years are picked, in the browser.

const DATA = 'https://fakeronjan.github.io/flights-data';
const $ = (s) => document.querySelector(s);
const NAMES = { AA: 'American', DL: 'Delta', UA: 'United', WN: 'Southwest', AS: 'Alaska', B6: 'JetBlue', F9: 'Frontier', G4: 'Allegiant',
  NK: 'Spirit', HA: 'Hawaiian', VX: 'Virgin America', OO: 'SkyWest', YX: 'Republic', MQ: 'Envoy', '9E': 'Endeavor', OH: 'PSA',
  PT: 'Piedmont', QX: 'Horizon', G7: 'GoJet', C5: 'CommutAir', YV: 'Mesa', EV: 'ExpressJet', ZW: 'Air Wisconsin', AX: 'Trans States',
  CP: 'Compass', KS: 'PenAir', '9K': 'Cape Air', EM: 'Empire' };
const LOGOS = new Set(['AA', 'DL', 'UA', 'WN', 'AS', 'B6', 'F9', 'G4', 'NK', 'HA', 'VX']);
const DOW = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CAUSES = [['The airline', 0], ['Late-arriving plane', 4], ['Air traffic and airports', 2], ['Weather', 1], ['Security', 3]];
const CANCEL = { A: 'the airline', B: 'weather', C: 'air traffic and airports', D: 'security' };
const DEFAULT = { from: 'JFK', to: 'LAX' };

let meta = null, airports = {};
let state = { from: null, to: null, both: false, y0: 'last12', y1: null, view: 'route',
  rk: { kind: 'routes', m: 'busiest', lo: false, ap: '', al: '', n: 25, hl: '' } };
const cache = new Map();

// ------------------------------------------------------------------ helpers

const pct = (a, b) => (b ? (100 * a) / b : 0);
const p1 = (x) => (x > 0 && x < 0.05 ? '<0.1%' : `${x.toFixed(1)}%`);
const num = (x) => Math.round(x).toLocaleString('en-US');
const dur = (m) => `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
const add = (a, b) => (a ? a.map((x, i) => x + (b[i] || 0)) : [...b]);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const city = (c) => (airports[c] ? airports[c][0] : c);
function fmtDate(s) { const [y, m, d] = s.split('-').map(Number); return `${MON[m - 1]} ${d}, ${y}`; }
function hour12(h) { return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`; }
async function getJSON(path) {
  if (!cache.has(path)) cache.set(path, fetch(`${DATA}/${path}`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return cache.get(path);
}
function airlineName(code) { return NAMES[code] || code; }
function airlineCell(m, o) {
  const brand = LOGOS.has(m)
    ? `<span class="fl-logo"><img src="/img/airlines/${m}.png" alt="${esc(airlineName(m))}" loading="lazy"></span>`
    : `<span class="fl-brand">${esc(airlineName(m))}</span>`;
  return `${brand}${m !== o ? `<small>operated by ${esc(airlineName(o))}</small>` : ''}`;
}

// Windows the picked period covers: ['last12'] or a list of years
function windows() {
  if (state.y0 === 'last12') return ['last12'];
  const ys = meta.years.filter((y) => y >= state.y0 && y <= state.y1);
  return ys.length ? ys : [state.y0];
}
function periodDays() {
  if (state.y0 === 'last12') return 365;
  return windows().reduce((s, y) => s + meta.months_in_year[y] * 30.44, 0);
}
function periodLabel() {
  if (state.y0 === 'last12') {
    const [a, b] = meta.last12.map((s) => `${MON[+s.slice(5) - 1]} ${s.slice(0, 4)}`);
    return `the last 12 months (${a} to ${b})`;
  }
  const w = windows();
  const partial = (y) => (meta.months_in_year[y] < 12 ? ` (through ${MON[meta.months_in_year[y] - 1]})` : '');
  return w.length === 1 ? `${w[0]}${partial(w[0])}` : `${w[0]} to ${w[w.length - 1]}${partial(w[w.length - 1])}`;
}

// The period as a standalone line under the route name
function periodTitle() {
  if (state.y0 === 'last12') {
    const [a, b] = meta.last12.map((s) => `${MON[+s.slice(5) - 1]} ${s.slice(0, 4)}`);
    return `Last 12 months: ${a} to ${b}`;
  }
  const l = periodLabel();
  return l.charAt(0).toUpperCase() + l.slice(1);
}
// Years the picked period touches, for highlighting in Trends
function yearsInPeriod() {
  if (state.y0 === 'last12') return new Set(meta.last12.map((s) => s.slice(0, 4)));
  return new Set(windows());
}

// ------------------------------------------------------------------ combining

function merge(a, b) {
  if (!a) return b ? JSON.parse(JSON.stringify(b)) : null;
  if (!b) return a;
  const out = { c: add(a.c, b.c), x: add(a.x, b.x), d: Math.min(a.d, b.d), t: add(a.t, b.t), a: { ...a.a }, h: { ...a.h }, w: { ...a.w },
    mo: { ...a.mo }, k: { ...a.k }, tl: [] };
  for (const part of ['a', 'h', 'w', 'mo']) for (const [k, v] of Object.entries(b[part])) out[part][k] = add(out[part][k], v);
  for (const [k, v] of Object.entries(b.k)) out.k[k] = (out.k[k] || 0) + v;
  const tails = {};
  for (const [n, c] of [...a.tl, ...b.tl]) tails[n] = (tails[n] || 0) + c;
  out.tl = Object.entries(tails).sort((x, y) => y[1] - x[1]).slice(0, 5);
  const pick = (k, better) => { out[k] = !a[k] ? b[k] : !b[k] ? a[k] : better(a[k], b[k]) ? a[k] : b[k]; };
  pick('fa', (x, y) => x.min <= y.min);
  pick('sl', (x, y) => x.min >= y.min);
  pick('ld', (x, y) => x.delay >= y.delay);
  return out;
}

async function routeFor(o, d) {
  const parts = await Promise.all(windows().map((w) => getJSON(`y/${w}/${o}.json`)));
  let r = null;
  for (const p of parts) if (p && p[d]) r = merge(r, p[d]);
  return r;
}

// Every route's totals for the picked period: dir ("JFK-LAX") and pairs ("JFK-LAX" for both ways)
function blankRec() { return { f: 0, on: 0, late: 0, canc: 0, div: 0, dmin: 0, sched: 0, act: 0, arr: 0, dist: Infinity, brands: new Set() }; }
function addRec(t, x) {
  for (const k of ['f', 'on', 'late', 'canc', 'div', 'dmin', 'sched', 'act', 'arr']) t[k] += x[k];
  t.dist = Math.min(t.dist, x.dist);
  x.brands.forEach((b) => t.brands.add(b));
}
async function ranking() {
  const key = windows().join(',');
  if (ranking.cacheKey === key) return ranking.cached;
  const files = await Promise.all(windows().map((w) => getJSON(`y/${w}/rank.json`)));
  const dir = new Map();
  for (const file of files) for (const [o, d, f, on, late, canc, div, dmin, sched, act, arr, dist, brands] of file || []) {
    const k = `${o}-${d}`;
    if (!dir.has(k)) dir.set(k, blankRec());
    addRec(dir.get(k), { f, on, late, canc, div, dmin, sched, act, arr, dist, brands: new Set(brands.match(/../g) || []) });
  }
  const pairs = new Map();
  for (const [k, v] of dir) {
    const p = k.split('-').sort().join('-');
    if (!pairs.has(p)) pairs.set(p, blankRec());
    addRec(pairs.get(p), v);
  }
  ranking.cacheKey = key;
  ranking.cached = { dir, pairs };
  return ranking.cached;
}

// What can be ranked. val() returns null when a route doesn't have enough data for that stat.
// hi/lo name each end of the list; lo: null means only the top end is worth ranking.
const METRICS = [
  { id: 'busiest', name: 'Busiest', hi: 'busiest', lo: null, all: true, val: (r) => r.f, fmt: (v) => `${num(v)} flights`, sh: (v) => num(v) },
  { id: 'ontime', name: 'On time', hi: 'most on time', lo: 'least on time', val: (r) => r.on / r.f, fmt: (v) => `${p1(100 * v)} on time`, sh: (v) => p1(100 * v) },
  { id: 'delayed', name: 'Delayed', hi: 'most delayed', lo: 'least delayed', val: (r) => r.late / r.f, fmt: (v) => `${p1(100 * v)} delayed`, sh: (v) => p1(100 * v) },
  { id: 'canceled', name: 'Canceled', hi: 'most canceled', lo: 'least canceled', val: (r) => r.canc / r.f, fmt: (v) => `${p1(100 * v)} canceled`, sh: (v) => p1(100 * v) },
  { id: 'diverted', name: 'Diverted', hi: 'most diverted', lo: null, val: (r) => r.div / r.f, fmt: (v) => `${p1(100 * v)} diverted`, sh: (v) => p1(100 * v) },
  { id: 'delay', name: 'Delay when late', hi: 'longest delays', lo: 'shortest delays', val: (r) => (r.late >= 20 ? r.dmin / r.late : null), fmt: (v) => `${Math.round(v)} min avg delay when late`, sh: (v) => `${Math.round(v)} min` },
  { id: 'padding', name: 'Schedule padding', hi: 'most padded schedule', lo: 'least padded schedule', val: (r) => (r.arr >= 20 ? (r.sched - r.act) / r.arr : null), fmt: (v) => `${Math.abs(Math.round(v))} min ${v >= 0 ? 'shorter' : 'longer'} than scheduled`, sh: (v) => `${v >= 0 ? '' : '+'}${Math.abs(Math.round(v))} min ${v >= 0 ? 'early' : 'late'}` },
  { id: 'distance', name: 'Distance', hi: 'longest', lo: 'shortest', val: (r) => r.dist, fmt: (v) => `${num(v)} miles`, sh: (v) => `${num(v)} mi` },
  { id: 'airlines', name: 'Airlines', hi: 'most airlines', lo: null, val: (r) => r.brands.size, fmt: (v) => `${v} airline${v === 1 ? '' : 's'}`, sh: (v) => String(v) },
];
const metric = (id) => METRICS.find((m) => m.id === id);

// Routes that qualify for a metric: a flight a day (each way for pairs), except Busiest, which ranks everything
function eligible(map, m, both) {
  const min = m.all ? 1 : (both ? 2 : 1) * periodDays();
  return [...map].filter(([, r]) => r.f >= min && m.val(r) !== null && Number.isFinite(m.val(r)));
}
// 1-based rank of key from the high end (fromTop) or low end, and how many were ranked
function rankOf(list, key, m, fromTop) {
  const me = list.find(([k]) => k === key);
  if (!me) return null;
  const v = m.val(me[1]);
  const better = list.filter(([, r]) => (fromTop ? m.val(r) > v : m.val(r) < v)).length;
  return { rank: better + 1, of: list.length };
}
// The badge for one stat, or '' when it isn't notable: #1-10, then top 10%, then top 20% (either end)
function badge(map, key, m, both) {
  const list = eligible(map, m, both);
  const tiers = [[m.hi, true], ...(m.lo ? [[m.lo, false]] : [])];
  let best = null;
  for (const [label, fromTop] of tiers) {
    const r = rankOf(list, key, m, fromTop);
    if (!r) return '';
    const pctile = r.rank / r.of;
    const score = r.rank <= 10 ? 0 : pctile <= 0.1 ? 1 : pctile <= 0.2 ? 2 : 9;
    if (score < 9 && (!best || score < best.score || (score === best.score && r.rank < best.rank))) best = { score, label, fromTop, rank: r.rank };
  }
  if (!best) return '';
  const text = best.score === 0 ? `#${best.rank} ${best.label}` : `Top ${best.score === 1 ? 10 : 20}% ${best.label}`;
  return `<a class="fl-badge${best.score === 0 ? ' b-top' : ''}" href="#" data-m="${m.id}" data-lo="${best.fromTop ? 0 : 1}">${esc(text)}</a>`;
}

// ------------------------------------------------------------------ rendering

function bars(id, items, label) {
  const el = $(`#${id}`), shown = items.filter((x) => x.f >= 20);
  const rates = shown.map((x) => pct(x.on, x.f));
  const max = Math.max(...rates), min = Math.min(...rates);
  el.innerHTML = shown.map((x, i) => `<div style="height:${Math.max(2, rates[i])}%" class="${rates[i] === max ? 'best' : rates[i] === min ? 'worst' : ''}" data-t="${esc(label(x.k))}: ${p1(rates[i])} on time (${num(x.f)} flights)"></div>`).join('');
  $(`#${id}-t`).innerHTML = shown.map((x) => `<span>${label(x.k, true)}</span>`).join('');
  const bi = rates.indexOf(max), wi = rates.indexOf(min);
  $(`#${id}-n`).textContent = shown.length > 1 ? `Best ${label(shown[bi].k)} (${p1(max)}), worst ${label(shown[wi].k)} (${p1(min)})` : '';
}

async function render() {
  const { from: A, to: B, both } = state;
  $('#fl-from').value = `${A} (${city(A)})`;
  $('#fl-to').value = `${B} (${city(B)})`;
  document.querySelectorAll('#fl-dir button').forEach((b) => b.classList.toggle('active', (b.dataset.d === 'both') === both));
  const [ab, ba, rank] = await Promise.all([routeFor(A, B), both ? routeFor(B, A) : null, ranking()]);
  const r = both ? merge(ab, ba) : ab;   // merge keeps the original records, so dirOf can tell which way each fun fact happened
  const dirOf = (rec) => (!both || !rec ? '' : ab && [ab.fa, ab.sl, ab.ld].includes(rec) ? ` (${A} to ${B})` : ` (${B} to ${A})`);

  $('#fl-route').textContent = both ? `${A} ⇄ ${B}` : `${A} → ${B}`;
  $('#fl-period-line').textContent = periodTitle();
  if (!r) {
    $('#fl-route-sub').textContent = `No flights ${both ? 'between' : 'from'} ${city(A)} ${both ? 'and' : 'to'} ${city(B)} in ${periodLabel()} on the airlines this data covers`;
    $('#fl-body').hidden = true;
    return;
  }
  $('#fl-body').hidden = false;
  const [f, on, late, canc, div, dmin] = r.c;
  // Badges: where this route ranks nationally on each stat, shown only when notable
  const bmap = both ? rank.pairs : rank.dir;
  const bkey = both ? [A, B].sort().join('-') : `${A}-${B}`;
  const B_ = (id) => badge(bmap, bkey, metric(id), both);
  $('#fl-route-sub').innerHTML = `${esc(`${city(A)} ${both ? 'and' : 'to'} ${city(B)}, ${num(r.d)} miles`)} ${B_('distance')}`;
  const brands = new Set(Object.keys(r.a).map((k) => k.split('|')[0]));
  $('#fl-facts').innerHTML = [
    ['Flights', num(f), 'busiest'], ['Per day', (f / periodDays()).toFixed(1)], ['Airlines', brands.size, 'airlines'],
    ['Scheduled time', dur(r.t[0] / r.t[2])], ['Actual time', dur(r.t[1] / r.t[2]), 'padding'],
    ['Avg delay when late', late ? `${Math.round(dmin / late)} min` : '-', 'delay'],
  ].map(([k, v, id]) => { const b = id ? B_(id) : ''; return `<div><dt>${k}</dt><dd>${v}</dd>${b ? `<span class="fl-bw">${b}</span>` : ''}</div>`; }).join('');

  // On time
  const parts = [['On time', on, 'ok'], ['Delayed 15+ min', late, 'late'], ['Canceled', canc, 'cancel'], ['Diverted', div, 'divert']];
  $('#fl-stack').innerHTML = parts.map(([k, v, c]) => `<span class="s-${c}" style="flex:${v}" data-t="${k}: ${p1(pct(v, f))} (${num(v)} flights)"></span>`).join('');
  $('#fl-stack-legend').innerHTML = parts.map(([k, v, c]) => `<span class="s-${c}">${k} <b>${p1(pct(v, f))}</b></span>`).join('');
  $('#fl-stack-badges').innerHTML = ['ontime', 'delayed', 'canceled', 'diverted'].map(B_).join('');
  const rate = on / f;
  const map = both ? rank.pairs : rank.dir;
  const list = eligible(map, metric('ontime'), both);   // a flight a day, each way
  const better = (L) => L.filter(([, v]) => v.on / v.f > rate).length + 1;
  const items = [];
  const meKey = both ? [A, B].sort().join('-') : `${A}-${B}`;
  const qualifies = list.some(([k]) => k === meKey);
  if (qualifies) {
    items.push(`#${num(better(list))} of ${num(list.length)} ${both ? 'round-trip routes' : 'routes'} nationwide, best on-time rate first`);
    if (!both) {
      const fromA = list.filter(([k]) => k.startsWith(`${A}-`));
      items.push(`#${better(fromA)} of ${fromA.length} routes out of ${A}`);
      const intoB = list.filter(([k]) => k.endsWith(`-${B}`));
      items.push(`#${better(intoB)} of ${intoB.length} routes into ${B}`);
    }
  } else {
    items.push('Not ranked: fewer than one flight a day');
  }
  const nat = list.reduce((s, [, v]) => [s[0] + v.f, s[1] + v.on], [0, 0]);
  items.push(`Average across ranked routes: ${p1(pct(nat[1], nat[0]))} on time`);
  $('#fl-rank').innerHTML = items.map((x) => `<li>${x}</li>`).join('');

  // Airlines
  const rows = Object.entries(r.a).sort((x, y) => y[1][0] - x[1][0]);
  $('#fl-airlines').innerHTML = `<thead><tr><th>Airline</th><th>Flights</th><th class="hide-sm">Share</th><th>On time</th><th class="hide-sm">Canceled</th><th>Avg delay when late</th></tr></thead><tbody>` +
    rows.map(([k, c]) => {
      const [m, o] = k.split('|');
      return `<tr><td>${airlineCell(m, o)}</td><td>${num(c[0])}</td><td class="hide-sm">${p1(pct(c[0], f))}</td><td>${p1(pct(c[1], c[0]))}</td><td class="hide-sm">${p1(pct(c[3], c[0]))}</td><td>${c[2] ? `${Math.round(c[5] / c[2])} min` : '-'}</td></tr>`;
    }).join('') + '</tbody>';

  await renderTrends(A, B, both);

  // When to fly
  bars('fl-hour', Object.entries(r.h).map(([k, v]) => ({ k: +k, f: v[0], on: v[1] })).sort((x, y) => x.k - y.k),
    (h, short) => (short ? (h % 3 === 0 ? `${h % 12 || 12}${h < 12 ? 'a' : 'p'}` : '') : hour12(h)));
  bars('fl-dow', Object.entries(r.w).map(([k, v]) => ({ k: +k, f: v[0], on: v[1] })).sort((x, y) => x.k - y.k), (d) => DOW[d]);
  bars('fl-month', Object.entries(r.mo).map(([k, v]) => ({ k: +k, f: v[0], on: v[1] })).sort((x, y) => x.k - y.k),
    (m, short) => (short ? MON[m - 1][0] : MON[m - 1]));

  // Delay causes
  const tot = r.x.reduce((s, x) => s + x, 0);
  $('#fl-causes').innerHTML = CAUSES.map(([k, i]) => `<div><span>${k}</span><span class="track"><span class="fill" style="width:${pct(r.x[i], tot)}%"></span></span><b>${Math.round(pct(r.x[i], tot))}%</b></div>`).join('');
  const ct = Object.values(r.k).reduce((s, x) => s + x, 0);
  $('#fl-cancels').textContent = ct
    ? `${num(ct)} cancellation${ct === 1 ? '' : 's'}: ` + Object.entries(r.k).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${Math.round(pct(v, ct))}% ${CANCEL[k] || 'other'}`).join(', ')
    : 'No cancellations';

  // Fun facts
  const fl = (x) => `${airlineName(x.airline)} ${x.flight}`;
  const facts = [];
  if (r.fa) facts.push(['Fastest flight', dur(r.fa.min), `${fl(r.fa)}, ${fmtDate(r.fa.date)}${dirOf(r.fa)}`]);
  if (r.sl) facts.push(['Slowest flight', dur(r.sl.min), `${fl(r.sl)}, ${fmtDate(r.sl.date)}${dirOf(r.sl)}`]);
  if (r.ld && r.ld.delay > 0) facts.push(['Longest delay', dur(r.ld.delay), `${fl(r.ld)}, ${fmtDate(r.ld.date)}${dirOf(r.ld)}`]);
  if (r.tl.length) {
    const [tail, n] = r.tl[0];
    facts.push(['Most frequent plane', `<a href="https://registry.faa.gov/AircraftInquiry/Search/NNumberResult?nNumberTxt=${encodeURIComponent(tail)}" target="_blank" rel="noopener">${esc(tail)}</a>`, `Flew this route ${num(n)} times`]);
  }
  $('#fl-fun').innerHTML = facts.map(([k, v, s]) => `<div><small>${k}</small><b>${v}</b><span>${s}</span></div>`).join('');
}

// Trends: every year in the data, regardless of the picked period
async function renderTrends(A, B, both) {
  const [ta, tb] = await Promise.all([getJSON(`trends/${A}.json`), both ? getJSON(`trends/${B}.json`) : null]);
  const t1 = ta && ta[B], t2 = both && tb && tb[A];
  const years = meta.years;
  const per = years.map((y) => {
    const c = add(t1?.y?.[y] ? [...t1.y[y]] : null, t2?.y?.[y] || [0, 0, 0, 0, 0]) || [0, 0, 0, 0, 0];
    const mix = { ...(t1?.a?.[y] || {}) };
    for (const [k, v] of Object.entries(t2?.a?.[y] || {})) mix[k] = (mix[k] || 0) + v;
    return { y, c, perDay: c[0] / (meta.months_in_year[y] * 30.44), mix };
  });
  const maxDay = Math.max(...per.map((p) => p.perDay), 1);
  const yl = (y, short) => (short ? `'${y.slice(2)}` : `${y}${meta.months_in_year[y] < 12 ? ` (through ${MON[meta.months_in_year[y] - 1]})` : ''}`);
  const picked = yearsInPeriod();
  const out = (y) => (picked.has(y) ? '' : 'out');   // years outside the picked period fade
  $('#fl-tr-flights').innerHTML = per.map((p) => `<div class="${out(p.y)}" style="height:${Math.max(p.perDay ? 2 : 0, (100 * p.perDay) / maxDay)}%" data-t="${yl(p.y)}: ${p.perDay.toFixed(1)} flights a day"></div>`).join('');
  $('#fl-tr-flights-t').innerHTML = per.map((p) => `<span>${yl(p.y, true)}</span>`).join('');
  const withFlights = per.filter((p) => p.c[0] >= 20);
  $('#fl-tr-ontime').innerHTML = per.map((p) => p.c[0] >= 20
    ? `<div class="${out(p.y)}" style="height:${Math.max(2, pct(p.c[1], p.c[0]))}%" data-t="${yl(p.y)}: ${p1(pct(p.c[1], p.c[0]))} on time"></div>`
    : '<div class="empty"></div>').join('');
  $('#fl-tr-ontime-t').innerHTML = per.map((p) => `<span>${yl(p.y, true)}</span>`).join('');
  if (withFlights.length >= 2) {
    const a = withFlights[0], b = withFlights[withFlights.length - 1];
    const chg = (b.perDay - a.perDay) / a.perDay;
    $('#fl-tr-flights-n').textContent = `${Math.abs(chg) < 0.05 ? 'About the same as' : `${Math.round(Math.abs(chg) * 100)}% ${chg > 0 ? 'more' : 'fewer'} flights a day than`} in ${a.y}`;
    const da = pct(a.c[1], a.c[0]), db = pct(b.c[1], b.c[0]);
    $('#fl-tr-ontime-n').textContent = `${p1(db)} in ${b.y}, ${Math.abs(db - da) < 1 ? 'about the same as' : `${(Math.abs(db - da)).toFixed(1)} points ${db > da ? 'better' : 'worse'} than`} ${a.y}`;
  } else {
    $('#fl-tr-flights-n').textContent = '';
    $('#fl-tr-ontime-n').textContent = '';
  }
  // Airline mix by year: share of flights per brand
  const brands = [...new Set(per.flatMap((p) => Object.keys(p.mix)))]
    .sort((x, y) => per.reduce((s, p) => s + (p.mix[y] || 0), 0) - per.reduce((s, p) => s + (p.mix[x] || 0), 0));
  $('#fl-tr-mix').innerHTML = `<thead><tr><th>Year</th>${brands.map((b) => `<th>${LOGOS.has(b) ? `<span class="fl-logo sm"><img src="/img/airlines/${b}.png" alt="${esc(airlineName(b))}"></span>` : esc(airlineName(b))}</th>`).join('')}</tr></thead><tbody>` +
    per.filter((p) => p.c[0]).map((p) => {
      const tot = Object.values(p.mix).reduce((s, x) => s + x, 0);
      return `<tr><td>${p.y}</td>${brands.map((b) => `<td>${p.mix[b] ? `${Math.round(pct(p.mix[b], tot))}%` : '-'}</td>`).join('')}</tr>`;
    }).join('') + '</tbody>';
}

// ------------------------------------------------------------------ rankings view

// Airports: departures from each airport (on-time, cancellations, delays are for its departures),
// plus arrivals for traffic and the count of nonstop destinations.
const AMETRICS = [
  { id: 'busiest', name: 'Busiest', hi: 'busiest', lo: null, all: true, val: (r) => r.f + r.inF, fmt: (v) => `${num(v)} flights`, sh: (v) => num(v) },
  { id: 'ontime', name: 'On time', hi: 'most on time', lo: 'least on time', val: (r) => r.on / r.f, fmt: (v) => `${p1(100 * v)} of departures on time`, sh: (v) => p1(100 * v) },
  { id: 'canceled', name: 'Canceled', hi: 'most canceled', lo: 'least canceled', val: (r) => r.canc / r.f, fmt: (v) => `${p1(100 * v)} of departures canceled`, sh: (v) => p1(100 * v) },
  { id: 'delay', name: 'Delay when late', hi: 'longest delays', lo: 'shortest delays', val: (r) => (r.late >= 20 ? r.dmin / r.late : null), fmt: (v) => `${Math.round(v)} min avg delay when late`, sh: (v) => `${Math.round(v)} min` },
  { id: 'routes', name: 'Destinations', hi: 'most destinations', lo: null, all: true, val: (r) => r.dests.size, fmt: (v) => `${v} nonstop destinations`, sh: (v) => String(v) },
  { id: 'airlines', name: 'Airlines', hi: 'most airlines', lo: null, all: true, val: (r) => r.brands.size, fmt: (v) => `${v} airline${v === 1 ? '' : 's'}`, sh: (v) => String(v) },
];

function airportTotals(dir) {
  const out = new Map();
  const get = (c) => { if (!out.has(c)) out.set(c, { ...blankRec(), inF: 0, dests: new Set() }); return out.get(c); };
  for (const [k, r] of dir) {
    const [o, d] = k.split('-');
    const a = get(o);
    addRec(a, r);
    a.dests.add(d);
    get(d).inF += r.f;
  }
  return out;
}

async function renderRankings() {
  const rk = state.rk, airportsView = rk.kind === 'airports';
  const metrics = airportsView ? AMETRICS : METRICS;
  if (!metrics.some((m) => m.id === rk.m)) rk.m = 'busiest';
  const m = metrics.find((x) => x.id === rk.m);
  if (!m.lo) rk.lo = false;
  document.querySelectorAll('#fl-rk-kind button').forEach((b) => b.classList.toggle('active', b.dataset.k === rk.kind));
  $('#fl-rk-metrics').innerHTML = metrics.map((x) => `<button type="button" class="pill${x.id === m.id ? ' active' : ''}" data-m="${x.id}">${x.name}</button>`).join('');
  $('#fl-rk-order').innerHTML = m.lo
    ? `<button type="button" data-lo="0" class="${rk.lo ? '' : 'active'}">${cap(m.hi)}</button><button type="button" data-lo="1" class="${rk.lo ? 'active' : ''}">${cap(m.lo)}</button>`
    : '';
  $('#fl-rk-ap-wrap').hidden = airportsView;
  $('#fl-rk-ap').value = rk.ap ? `${rk.ap} (${city(rk.ap)})` : '';

  const rank = await ranking();
  // Airline filter: brands present in the period
  const allBrands = new Set();
  rank.dir.forEach((r) => r.brands.forEach((b) => allBrands.add(b)));
  const brandList = [...allBrands].sort((a, b) => airlineName(a).localeCompare(airlineName(b)));
  if (rk.al && !allBrands.has(rk.al)) rk.al = '';
  $('#fl-rk-al').innerHTML = `<option value="">All airlines</option>` + brandList.map((b) => `<option value="${b}"${b === rk.al ? ' selected' : ''}>${esc(airlineName(b))}</option>`).join('');

  let list;
  if (airportsView) {
    // Airline filter for airports: only that airline's routes count
    const dir = rk.al ? new Map([...rank.dir].filter(([, r]) => r.brands.has(rk.al))) : rank.dir;
    const totals = airportTotals(dir);
    const min = m.all ? 1 : periodDays();
    list = [...totals].filter(([, r]) => r.f >= min && m.val(r) !== null && Number.isFinite(m.val(r)));
  } else {
    const map = state.both ? rank.pairs : rank.dir;
    list = eligible(map, m, state.both)
      .filter(([k, r]) => (!rk.al || r.brands.has(rk.al)) && (!rk.ap || k.split('-').includes(rk.ap)));
  }
  list.sort((a, b) => (rk.lo ? m.val(a[1]) - m.val(b[1]) : m.val(b[1]) - m.val(a[1])) || b[1].f - a[1].f);
  // Ties share a rank
  let lastV = null, lastRank = 0;
  const ranked = list.map(([k, r], i) => { const v = m.val(r); if (v !== lastV) { lastRank = i + 1; lastV = v; } return { k, r, v, rank: lastRank }; });

  const nameCell = (k) => {
    if (airportsView) return `<a href="#" data-ap="${k}">${k}</a><small>${esc(city(k))}</small>`;
    const [a, b] = k.split('-');
    return `<a href="#" data-route="${k}">${a} ${state.both ? '⇄' : '→'} ${b}</a><small>${esc(city(a))} ${state.both ? 'and' : 'to'} ${esc(city(b))}</small>`;
  };
  const traffic = m.id !== 'busiest';   // the Busiest value already is the traffic
  const row = (x, cls = '') => `<tr class="${cls}"><td class="rk">#${num(x.rank)}</td><td class="nm">${nameCell(x.k)}</td><td class="val">${m.sh(x.v)}</td>${traffic ? `<td class="hide-sm">${num(airportsView ? x.r.f + x.r.inF : x.r.f)} flights</td>` : ''}</tr>`;
  const shown = ranked.slice(0, rk.n);
  let body = shown.map((x) => row(x, x.k === rk.hl ? 'hl' : '')).join('');
  const hlRow = rk.hl && !shown.some((x) => x.k === rk.hl) ? ranked.find((x) => x.k === rk.hl) : null;
  if (hlRow) body += `<tr class="gap"><td colspan="${traffic ? 4 : 3}">&hellip;</td></tr>${row(hlRow, 'hl')}`;
  $('#fl-rk-table').innerHTML = ranked.length
    ? `<thead><tr><th>#</th><th class="nm">${airportsView ? 'Airport' : 'Route'}</th><th>${esc(m.name)}</th>${traffic ? '<th class="hide-sm">Traffic</th>' : ''}</tr></thead><tbody>${body}</tbody>`
    : '<tbody><tr><td>Nothing matches these filters</td></tr></tbody>';
  $('#fl-rk-more').hidden = ranked.length <= rk.n;
  $('#fl-rk-more').textContent = `Show more (${num(ranked.length - rk.n)} left)`;
  const scope = airportsView ? 'airports' : state.both ? 'round-trip routes' : 'routes';
  const minNote = m.all ? '' : airportsView ? ', among airports with at least one departure a day' : `, among ${scope} with at least one flight a day${state.both ? ' each way' : ''}`;
  $('#fl-rk-note').textContent = `${num(ranked.length)} ${scope} ranked for ${periodLabel()}${minNote}`;
  if (rk.hl) document.querySelector('#fl-rk-table tr.hl')?.scrollIntoView({ block: 'center' });
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function showView() {
  const rankView = state.view === 'rank';
  document.querySelectorAll('#fl-view button').forEach((b) => b.classList.toggle('active', (b.dataset.v === 'rank') === rankView));
  $('#fl-rankings').hidden = !rankView;
  $('#fl-route-view').hidden = rankView;
  $('#fl-route-controls').hidden = rankView;
}

// ------------------------------------------------------------------ controls

function setURL() {
  const q = new URLSearchParams();
  if (state.view === 'rank') {
    q.set('view', 'rankings'); q.set('rank', state.rk.kind); q.set('m', state.rk.m);
    if (state.rk.lo) q.set('lo', '1');
    if (state.rk.ap) q.set('ap', state.rk.ap);
    if (state.rk.al) q.set('al', state.rk.al);
  } else {
    q.set('from', state.from); q.set('to', state.to);
  }
  if (state.both) q.set('both', '1');
  if (state.y0 !== 'last12') { q.set('y0', state.y0); q.set('y1', state.y1); }
  history.replaceState(null, '', `${location.pathname}?${q}`);
}
function update() {
  setURL(); syncPeriod(); showView();
  if (state.view === 'rank') renderRankings(); else render();
}

function syncPeriod() {
  $('#fl-y0').value = state.y0;
  const y1 = $('#fl-y1');
  y1.hidden = state.y0 === 'last12';
  $('#fl-y1-label').hidden = y1.hidden;
  if (!y1.hidden) {
    y1.innerHTML = meta.years.filter((y) => y >= state.y0).slice().reverse().map((y) => `<option value="${y}">${y}</option>`).join('');
    if (!state.y1 || state.y1 < state.y0) state.y1 = state.y0;
    y1.value = state.y1;
  }
}

function setupSearch(inputSel, listSel, key, onPick) {
  const input = $(inputSel), list = $(listSel);
  const codes = Object.keys(airports).sort((a, b) => airports[b][1] - airports[a][1]);
  input.addEventListener('focus', () => input.select());
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { list.hidden = true; return; }
    const hits = codes.filter((c) => c.toLowerCase().startsWith(q))
      .concat(codes.filter((c) => !c.toLowerCase().startsWith(q) && airports[c][0].toLowerCase().includes(q))).slice(0, 8);
    list.innerHTML = hits.length ? hits.map((c) => `<li><button type="button" data-c="${c}"><b>${c}</b> ${esc(airports[c][0])}</button></li>`).join('') : '<li class="fl-none">No matching airport</li>';
    list.hidden = false;
    list.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      list.hidden = true;
      if (onPick) onPick(b.dataset.c); else { state[key] = b.dataset.c; update(); }
    }));
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const first = list.querySelector('button'); if (first) first.click(); }
  });
}

async function init() {
  [meta, airports] = await Promise.all([getJSON('meta.json'), getJSON('airports.json')]);
  if (!meta || !airports) { $('#fl-route-sub').textContent = 'Flight data is not available right now'; return; }
  const q = new URLSearchParams(location.search);
  const ok = (c) => c && airports[c.toUpperCase()] ? c.toUpperCase() : null;
  state.from = ok(q.get('from')) || DEFAULT.from;
  state.to = ok(q.get('to')) || DEFAULT.to;
  state.both = q.get('both') === '1';
  if (q.get('view') === 'rankings') {
    state.view = 'rank';
    state.rk.kind = q.get('rank') === 'airports' ? 'airports' : 'routes';
    state.rk.m = q.get('m') || 'busiest';
    state.rk.lo = q.get('lo') === '1';
    state.rk.ap = ok(q.get('ap')) || '';
    state.rk.al = q.get('al') || '';
  }
  if (meta.years.includes(q.get('y0'))) { state.y0 = q.get('y0'); state.y1 = meta.years.includes(q.get('y1')) ? q.get('y1') : state.y0; }
  const partial = (y) => (meta.months_in_year[y] < 12 ? ` (through ${MON[meta.months_in_year[y] - 1]})` : '');
  $('#fl-y0').innerHTML = `<option value="last12">Last 12 months</option>` + meta.years.slice().reverse().map((y) => `<option value="${y}">${y}${partial(y)}</option>`).join('');
  $('#fl-y0').addEventListener('change', (e) => { state.y0 = e.target.value; state.y1 = state.y0 === 'last12' ? null : (state.y1 && state.y1 >= state.y0 ? state.y1 : state.y0); update(); });
  $('#fl-y1').addEventListener('change', (e) => { state.y1 = e.target.value; update(); });
  setupSearch('#fl-from', '#fl-from-list', 'from');
  setupSearch('#fl-to', '#fl-to-list', 'to');
  setupSearch('#fl-rk-ap', '#fl-rk-ap-list', null, (c) => { state.rk.ap = c; state.rk.n = 25; state.rk.hl = ''; update(); });
  $('#fl-rk-ap').addEventListener('input', (e) => { if (!e.target.value.trim() && state.rk.ap) { state.rk.ap = ''; update(); } });
  document.querySelectorAll('#fl-view button').forEach((b) => b.addEventListener('click', () => { state.view = b.dataset.v; state.rk.hl = ''; update(); }));
  document.querySelectorAll('#fl-rk-kind button').forEach((b) => b.addEventListener('click', () => { state.rk.kind = b.dataset.k; state.rk.n = 25; state.rk.hl = ''; if (b.dataset.k === 'airports') state.rk.ap = ''; update(); }));
  $('#fl-rk-al').addEventListener('change', (e) => { state.rk.al = e.target.value; state.rk.n = 25; update(); });
  $('#fl-rk-more').addEventListener('click', () => { state.rk.n += 50; renderRankings(); });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('#fl-rk-metrics [data-m], #fl-rk-order [data-lo], [data-route], [data-ap], .fl-badge');
    if (!t) return;
    e.preventDefault();
    if (t.matches('.fl-badge')) {
      // From a route's badge to that ranking, with the route highlighted
      Object.assign(state.rk, { kind: 'routes', m: t.dataset.m, lo: t.dataset.lo === '1', ap: '', al: '', n: 25,
        hl: state.both ? [state.from, state.to].sort().join('-') : `${state.from}-${state.to}` });
      state.view = 'rank';
      window.scrollTo(0, 0);
    } else if (t.dataset.m) { state.rk.m = t.dataset.m; state.rk.lo = false; state.rk.n = 25; state.rk.hl = ''; }
    else if (t.dataset.lo !== undefined) { state.rk.lo = t.dataset.lo === '1'; state.rk.n = 25; }
    else if (t.dataset.route) { [state.from, state.to] = t.dataset.route.split('-'); state.view = 'route'; window.scrollTo(0, 0); }
    else if (t.dataset.ap) { state.rk.kind = 'routes'; state.rk.ap = t.dataset.ap; state.rk.n = 25; state.rk.hl = ''; }
    update();
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.fl-field')) document.querySelectorAll('.fl-list').forEach((l) => { l.hidden = true; }); });
  $('#fl-swap').addEventListener('click', () => { [state.from, state.to] = [state.to, state.from]; update(); });
  document.querySelectorAll('#fl-dir button').forEach((b) => b.addEventListener('click', () => { state.both = b.dataset.d === 'both'; update(); }));
  const tip = $('#fl-tip');
  document.addEventListener('mousemove', (e) => {
    const t = e.target.closest('[data-t]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.dataset.t; tip.hidden = false;
    tip.style.left = `${Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8)}px`;
    tip.style.top = `${e.clientY - 34}px`;
  });
  syncPeriod();
  update();
}

init();
