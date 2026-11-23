// fakeronjan.com/flights: US domestic flight stats from the Bureau of Transportation
// Statistics' on-time data (2018 on), by route, airport, and airline, each one looked up
// or ranked. Data lives in the flights-data repo (GitHub Pages); this page sums
// whichever years are picked, in the browser.

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

let meta = null, airports = {}, MARKETS = {}, marketOf = {};
const state = {
  tab: 'routes', mode: 'lookup',
  from: 'JFK', to: 'LAX', both: false, ap: 'JFK', al: 'DL', cities: false,
  y0: 'last12', y1: null,
  rk: { m: 'busiest', lo: false, fap: '', fal: '', n: 25, hl: '' },
};
const cache = new Map();

// ------------------------------------------------------------------ helpers

const pct = (a, b) => (b ? (100 * a) / b : 0);
const p1 = (x) => (x > 0 && x < 0.05 ? '<0.1%' : `${x.toFixed(1)}%`);
const num = (x) => Math.round(x).toLocaleString('en-US');
const perDay = (x) => (x >= 100 ? num(x) : x.toFixed(1));
const dur = (m) => `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
const add = (a, b) => (a ? a.map((x, i) => x + (b[i] || 0)) : [...b]);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const city = (c) => (airports[c] ? airports[c][0] : c);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const ordinal = (n) => { const t = n % 100, u = n % 10; return `${num(n)}${t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'}`; };
// Cities mode: airports BTS puts in one city market count as one unit, keyed by market id
const unitOf = (code) => (state.cities && marketOf[code]) || code;
const unitName = (u) => (MARKETS[u] ? MARKETS[u].name : city(u));
const unitCodes = (u) => (MARKETS[u] ? MARKETS[u].airports : [u]);
function fmtDate(s) { const [y, m, d] = s.split('-').map(Number); return `${MON[m - 1]} ${d}, ${y}`; }
function hour12(h) { return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`; }
async function getJSON(path) {
  if (!cache.has(path)) cache.set(path, fetch(`${DATA}/${path}`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return cache.get(path);
}
function airlineName(code) { return NAMES[code] || code; }
function logo(b, cls = '') {
  return LOGOS.has(b)
    ? `<span class="fl-logo${cls ? ` ${cls}` : ''}"><img src="/img/airlines/${b}.png" alt="${esc(airlineName(b))}" loading="lazy"></span>`
    : `<span class="fl-brand">${esc(airlineName(b))}</span>`;
}
// Links between views
const linkRoute = (o, d, text) => `<a href="#" data-go="routes" data-from="${o}" data-to="${d}">${text ?? `${o} → ${d}`}</a>`;
const linkAirport = (c, text) => `<a href="#" data-go="airports" data-ap="${c}">${text ?? c}</a>`;
const linkAirline = (b, html) => `<a href="#" class="fl-al-link" data-go="airlines" data-al="${b}">${html ?? logo(b)}</a>`;

// ------------------------------------------------------------------ the period

function windows() {
  if (state.y0 === 'last12') return ['last12'];
  const ys = meta.years.filter((y) => y >= state.y0 && y <= state.y1);
  return ys.length ? ys : [state.y0];
}
function periodDays() {
  if (state.y0 === 'last12') return 365;
  return windows().reduce((s, y) => s + meta.months_in_year[y] * 30.44, 0);
}
const partial = (y) => (meta.months_in_year[y] < 12 ? ` (through ${MON[meta.months_in_year[y] - 1]})` : '');
function periodLabel() {
  if (state.y0 === 'last12') {
    const [a, b] = meta.last12.map((s) => `${MON[+s.slice(5) - 1]} ${s.slice(0, 4)}`);
    return `the last 12 months (${a} to ${b})`;
  }
  const w = windows();
  return w.length === 1 ? `${w[0]}${partial(w[0])}` : `${w[0]} to ${w[w.length - 1]}${partial(w[w.length - 1])}`;
}
function periodTitle() {
  if (state.y0 === 'last12') {
    const [a, b] = meta.last12.map((s) => `${MON[+s.slice(5) - 1]} ${s.slice(0, 4)}`);
    return `Last 12 months: ${a} to ${b}`;
  }
  return cap(periodLabel());
}

// ------------------------------------------------------------------ combining

// Sums two summaries of the same shape (route, airport, or airline), year by year
function merge(a, b) {
  if (!a) return b ? JSON.parse(JSON.stringify(b)) : null;
  if (!b) return a;
  const out = { ...a };
  for (const k of ['c', 'x', 't']) if (b[k]) out[k] = add(a[k], b[k]);
  if (b.d !== undefined) out.d = Math.min(a.d ?? Infinity, b.d);
  for (const k of ['a', 'h', 'w', 'mo']) if (b[k]) { out[k] = { ...a[k] }; for (const [kk, v] of Object.entries(b[k])) out[k][kk] = add(out[k][kk], v); }
  for (const k of ['k', 'ab', 'airports']) if (b[k]) { out[k] = { ...a[k] }; for (const [kk, v] of Object.entries(b[k])) out[k][kk] = (out[k][kk] || 0) + v; }
  if (b.in !== undefined) out.in = (a.in || 0) + b.in;
  for (const k of ['dests', 'routes']) if (b[k]) {          // the last field is distance, which doesn't add
    out[k] = { ...a[k] };
    for (const [kk, v] of Object.entries(b[k])) out[k][kk] = out[k][kk] ? [...add(out[k][kk].slice(0, -1), v.slice(0, -1)), v[v.length - 1]] : v;
  }
  const tails = {};
  for (const [n, c] of [...(a.tl || []), ...(b.tl || [])]) tails[n] = (tails[n] || 0) + c;
  out.tl = Object.entries(tails).sort((x, y) => y[1] - x[1]).slice(0, 5);
  const pick = (k, better) => { out[k] = !a[k] ? b[k] : !b[k] ? a[k] : better(a[k], b[k]) ? a[k] : b[k]; };
  pick('fa', (x, y) => x.min <= y.min);
  pick('sl', (x, y) => x.min >= y.min);
  pick('ld', (x, y) => x.delay >= y.delay);
  return out;
}
async function summed(pathFor, key) {
  const parts = await Promise.all(windows().map((w) => getJSON(pathFor(w))));
  let r = null;
  for (const p of parts) { const v = key ? p?.[key] : p; if (v) r = merge(r, v); }
  return r;
}

// ------------------------------------------------------------------ rankings data

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
function airportTotals(dir) {
  const out = new Map();
  const get = (c) => { if (!out.has(c)) out.set(c, { ...blankRec(), inF: 0, dests: new Set() }); return out.get(c); };
  for (const [k, r] of dir) {
    const [o, d] = k.split('-').map(unitOf);
    const a = get(o);
    addRec(a, r);
    a.dests.add(d);
    get(d).inF += r.f;
  }
  return out;
}

// What can be ranked. val() is null when there isn't enough data for that stat.
// hi/lo name each end; lo: null means only the top end is worth ranking.
const METRICS = [
  { id: 'busiest', name: 'Busiest', col: 'Flights', hi: 'busiest', lo: null, all: true, val: (r) => r.f, sh: (v) => num(v) },
  { id: 'ontime', pri: 1, name: 'On time', hi: 'most on time', lo: 'least on time', val: (r) => r.on / r.f, sh: (v) => p1(100 * v) },
  { id: 'delayed', pri: 2, name: 'Delayed', hi: 'most delayed', lo: 'least delayed', val: (r) => r.late / r.f, sh: (v) => p1(100 * v) },
  { id: 'canceled', pri: 2, name: 'Canceled', hi: 'most canceled', lo: 'least canceled', val: (r) => r.canc / r.f, sh: (v) => p1(100 * v) },
  { id: 'diverted', pri: 2, name: 'Diverted', hi: 'most diverted', lo: null, val: (r) => r.div / r.f, sh: (v) => p1(100 * v) },
  { id: 'delay', pri: 1, name: 'Delay when late', hi: 'longest delays', lo: 'shortest delays', val: (r) => (r.late >= 20 ? r.dmin / r.late : null), sh: (v) => `${Math.round(v)} min` },
  { id: 'padding', pri: 2, name: 'Schedule padding', hi: 'most padded schedule', lo: 'least padded schedule', val: (r) => (r.arr >= 20 ? (r.sched - r.act) / r.arr : null), sh: (v) => `${Math.abs(Math.round(v))} min ${v >= 0 ? 'early' : 'late'}` },
  { id: 'distance', p0: true, name: 'Distance', hi: 'longest', lo: 'shortest', val: (r) => r.dist, sh: (v) => `${num(v)} mi` },
  { id: 'airlines', pri: 2, name: 'Airlines', hi: 'most airlines', lo: null, val: (r) => r.brands.size, sh: (v) => String(v) },
];
// Airports: on time, cancellations, and delays are for departures
const AMETRICS = [
  { id: 'busiest', name: 'Busiest', col: 'Flights', hi: 'busiest', lo: null, all: true, val: (r) => r.f + r.inF, sh: (v) => num(v) },
  { id: 'ontime', p0: true, name: 'On time', hi: 'most on time', lo: 'least on time', val: (r) => r.on / r.f, sh: (v) => p1(100 * v) },
  { id: 'canceled', pri: 1, name: 'Canceled', hi: 'most canceled', lo: 'least canceled', val: (r) => r.canc / r.f, sh: (v) => p1(100 * v) },
  { id: 'delay', pri: 1, name: 'Delay when late', hi: 'longest delays', lo: 'shortest delays', val: (r) => (r.late >= 20 ? r.dmin / r.late : null), sh: (v) => `${Math.round(v)} min` },
  { id: 'routes', pri: 1, name: 'Destinations', hi: 'most destinations', lo: null, all: true, val: (r) => r.dests.size, sh: (v) => String(v) },
  { id: 'airlines', pri: 1, name: 'Airlines', hi: 'most airlines', lo: null, all: true, val: (r) => r.brands.size, sh: (v) => String(v) },
];
// Airlines: v is an entry in the airline index
const ALMETRICS = [
  { id: 'busiest', name: 'Flights', hi: 'most flights', lo: 'fewest flights', val: (v) => v.c[0], sh: (x) => num(x) },
  { id: 'ontime', p0: true, name: 'On time', hi: 'most on time', lo: 'least on time', val: (v) => v.c[1] / v.c[0], sh: (x) => p1(100 * x) },
  { id: 'delayed', pri: 1, name: 'Delayed', hi: 'most delayed', lo: 'least delayed', val: (v) => v.c[2] / v.c[0], sh: (x) => p1(100 * x) },
  { id: 'canceled', pri: 1, name: 'Canceled', hi: 'most canceled', lo: 'least canceled', val: (v) => v.c[3] / v.c[0], sh: (x) => p1(100 * x) },
  { id: 'delay', pri: 1, name: 'Delay when late', hi: 'longest delays', lo: 'shortest delays', val: (v) => (v.c[2] ? v.c[5] / v.c[2] : null), sh: (x) => `${Math.round(x)} min` },
  { id: 'routes', pri: 1, name: 'Routes', hi: 'most routes', lo: 'fewest routes', val: (v) => v.nr, sh: (x) => num(x) },
  { id: 'airports', pri: 1, name: 'Airports', hi: 'most airports', lo: 'fewest airports', val: (v) => v.na, sh: (x) => num(x) },
];
const routeMetric = (id) => METRICS.find((m) => m.id === id);
const airportMetric = (id) => AMETRICS.find((m) => m.id === id);

// Routes and airports that qualify: a flight a day (each way for pairs), except the "all" metrics
function eligibleRoutes(map, m, both) {
  const min = m.all ? 1 : (both ? 2 : 1) * periodDays();
  return [...map].filter(([, r]) => r.f >= min && m.val(r) !== null && Number.isFinite(m.val(r)));
}
function eligibleAirports(totals, m) {
  const min = m.all ? 1 : periodDays();
  return [...totals].filter(([, r]) => r.f >= min && m.val(r) !== null && Number.isFinite(m.val(r)));
}
function rankOf(list, key, m, fromTop) {
  const me = list.find(([k]) => k === key);
  if (!me) return null;
  const v = m.val(me[1]);
  return { rank: list.filter(([, r]) => (fromTop ? m.val(r) > v : m.val(r) < v)).length + 1, of: list.length };
}
// A badge when notable: #1-10, then top 10%, then top 20%, from either end
function badge(list, key, m, tab) {
  let best = null;
  for (const [label, fromTop] of [[m.hi, true], ...(m.lo ? [[m.lo, false]] : [])]) {
    const r = rankOf(list, key, m, fromTop);
    if (!r) return '';
    const p = r.rank / r.of;
    const score = r.rank <= 10 ? 0 : p <= 0.1 ? 1 : p <= 0.2 ? 2 : 9;
    if (score < 9 && (!best || score < best.score || (score === best.score && r.rank < best.rank))) best = { score, label, fromTop, rank: r.rank };
  }
  if (!best) return '';
  const text = best.score === 0 ? (best.rank === 1 ? cap(best.label) : `${ordinal(best.rank)} ${best.label}`) : `Top ${best.score === 1 ? 10 : 20}% ${best.label}`;
  return `<a class="fl-badge${best.score === 0 ? ' b-top' : ''}" href="#" data-badge="${tab}" data-m="${m.id}" data-lo="${best.fromTop ? 0 : 1}" data-key="${key}">${esc(text)}</a>`;
}

// ------------------------------------------------------------------ section builders (HTML)

function factsHTML(rows) {
  return `<dl class="fl-facts">${rows.map(([k, v, b]) => `<div><dt>${k}</dt><dd>${v}</dd>${b ? `<span class="fl-bw">${b}</span>` : ''}</div>`).join('')}</dl>`;
}
function onTimeHTML(c, badges, lines) {
  const [f, on, late, canc, div] = c;
  const parts = [['On time', on, 'ok'], ['Delayed 15+ min', late, 'late'], ['Canceled', canc, 'cancel'], ['Diverted', div, 'divert']];
  return `<div class="fl-stack">${parts.map(([k, v, cl]) => `<span class="s-${cl}" style="flex:${v}" data-t="${k}: ${p1(pct(v, f))} (${num(v)} flights)"></span>`).join('')}</div>
    <div class="fl-legend">${parts.map(([k, v, cl]) => `<span class="s-${cl}">${k} <b>${p1(pct(v, f))}</b></span>`).join('')}</div>
    ${badges ? `<div class="fl-badges">${badges}</div>` : ''}
    ${lines.length ? `<ul class="fl-rank">${lines.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}`;
}
function barChart(title, items, label, opts = {}) {
  const shown = items.filter((x) => x.f >= (opts.min ?? 20));
  if (!shown.length) return '';
  const rates = shown.map((x) => (opts.value ? opts.value(x) : pct(x.on, x.f)));
  const max = Math.max(...rates), min = Math.min(...rates), top = opts.scale ? Math.max(...rates, 1) : 100;
  const cls = (x, v) => [opts.cls ? opts.cls(x) : '', !opts.plain && v === max ? 'best' : !opts.plain && v === min ? 'worst' : ''].filter(Boolean).join(' ');
  const bi = rates.indexOf(max), wi = rates.indexOf(min);
  const note = opts.note !== undefined ? opts.note : shown.length > 1 ? `Best ${label(shown[bi].k)} (${p1(max)}), worst ${label(shown[wi].k)} (${p1(min)})` : '';
  return `<div><h3>${title}</h3><div class="fl-bars">${shown.map((x, i) => `<div class="${cls(x, rates[i])}" style="height:${Math.max(2, (100 * rates[i]) / top)}%" data-t="${esc(opts.tip ? opts.tip(x, rates[i]) : `${label(x.k)}: ${p1(rates[i])} on time (${num(x.f)} flights)`)}"></div>`).join('')}</div>
    <div class="fl-ticks">${shown.map((x) => `<span>${label(x.k, true)}</span>`).join('')}</div>${note ? `<p class="fl-note">${esc(note)}</p>` : ''}</div>`;
}
function whenHTML(r) {
  return `<h2>When to fly</h2><div class="fl-charts">
    ${barChart('On time by departure hour', Object.entries(r.h).map(([k, v]) => ({ k: +k, f: v[0], on: v[1] })).sort((x, y) => x.k - y.k),
      (h, short) => (short ? (h % 3 === 0 ? `${h % 12 || 12}${h < 12 ? 'a' : 'p'}` : '') : hour12(h)))}
    ${barChart('On time by day of week', Object.entries(r.w).map(([k, v]) => ({ k: +k, f: v[0], on: v[1] })).sort((x, y) => x.k - y.k), (d) => DOW[d])}
    ${barChart('On time by month', Object.entries(r.mo).map(([k, v]) => ({ k: +k, f: v[0], on: v[1] })).sort((x, y) => x.k - y.k), (m, short) => (short ? MON[m - 1][0] : MON[m - 1]))}
  </div>`;
}
function causesHTML(r) {
  const tot = r.x.reduce((s, x) => s + x, 0);
  const ct = Object.values(r.k).reduce((s, x) => s + x, 0);
  const cancels = ct
    ? `${num(ct)} cancellation${ct === 1 ? '' : 's'}: ${Object.entries(r.k).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${Math.round(pct(v, ct))}% ${CANCEL[k] || 'other'}`).join(', ')}`
    : 'No cancellations';
  return `<h2>Why flights were late</h2><p class="fl-note fl-lead">Share of delay minutes</p>
    <div class="fl-causes">${CAUSES.map(([k, i]) => `<div><span>${k}</span><span class="track"><span class="fill" style="width:${pct(r.x[i], tot)}%"></span></span><b>${Math.round(pct(r.x[i], tot))}%</b></div>`).join('')}</div>
    <p class="fl-note">${cancels}</p>`;
}
// Most and least on time among rows sorted best first: [key, [flights, on time, ...]]
function bestWorstHTML(sorted, link) {
  const [b, w] = [sorted[0], sorted[sorted.length - 1]];
  return `<ul class="fl-rank"><li>Most on time: ${link(b[0])} (${p1(pct(b[1][1], b[1][0]))})</li><li>Least on time: ${link(w[0])} (${p1(pct(w[1][1], w[1][0]))})</li></ul>`;
}
function funHTML(facts) {
  return facts.length ? `<h2>Fun facts</h2><div class="fl-fun">${facts.map(([k, v, s]) => `<div><small>${k}</small><b>${v}</b><span>${s}</span></div>`).join('')}</div>` : '';
}
function tableHTML(head, rows, cls = '') {
  return `<div class="fl-scroll"><table class="sport-table ${cls}"><thead><tr>${head.map(([h, c]) => `<th class="${c || ''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
const flightLabel = (x) => `${airlineName(x.airline)} ${x.flight}`;
const tailFact = (tl, what) => {
  if (!tl?.length) return null;
  const [tail, n] = tl[0];
  return ['Most frequent plane', `<a href="https://registry.faa.gov/AircraftInquiry/Search/NNumberResult?nNumberTxt=${encodeURIComponent(tail)}" target="_blank" rel="noopener">${esc(tail)}</a>`, `${num(n)} flights ${what}`];
};
// Trends: every year, with the picked years highlighted when there's a pick
function trendsHTML(perYear, mixByYear, mixLabel, title = 'Flights a day') {
  const years = meta.years;
  const selected = state.y0 !== 'last12', picked = new Set(windows());
  const out = (y) => (selected && !picked.has(y) ? 'out' : '');
  const per = years.map((y) => { const c = perYear[y] || [0, 0, 0, 0, 0]; return { k: y, c, f: c[0], on: c[1], perDay: c[0] / (meta.months_in_year[y] * 30.44) }; });
  const yl = (y, short) => (short ? `'${y.slice(2)}` : `${y}${partial(y)}`);
  const withF = per.filter((p) => p.f >= 20);
  let nF = '', nO = '';
  if (withF.length >= 2) {
    const a = withF[0], b = withF[withF.length - 1];
    const chg = (b.perDay - a.perDay) / a.perDay;
    nF = Math.abs(chg) < 0.05 ? `About the same as ${a.k}` : `${Math.round(Math.abs(chg) * 100)}% ${chg > 0 ? 'more' : 'fewer'} than ${a.k}`;
    const da = pct(a.on, a.f), db = pct(b.on, b.f);
    nO = Math.abs(db - da) < 1 ? `About the same as ${a.k}` : `${(Math.abs(db - da)).toFixed(1)} points ${db > da ? 'better' : 'worse'} than ${a.k}`;
  }
  const brands = [...new Set(Object.values(mixByYear || {}).flatMap((m) => Object.keys(m)))]
    .sort((x, y) => Object.values(mixByYear).reduce((s, m) => s + (m[y] || 0), 0) - Object.values(mixByYear).reduce((s, m) => s + (m[x] || 0), 0));
  // Top five airlines plus Other; phones keep the top three plus their own Other
  const top = brands.slice(0, 5), many = brands.length > 5, phoneCut = brands.length > 3;
  const share = (m, tot, bs) => { const x = bs.reduce((s, b) => s + (m[b] || 0), 0); return x ? `${Math.round(pct(x, tot))}%` : '-'; };
  const mixRows = per.filter((p) => mixByYear?.[p.k]).map((p) => {
    const m = mixByYear[p.k], tot = Object.values(m).reduce((s, x) => s + x, 0);
    return `<tr><td>${p.k}</td>${top.map((b, i) => `<td class="${i >= 3 ? 'fl-wide-only' : ''}">${m[b] ? `${Math.round(pct(m[b], tot))}%` : '-'}</td>`).join('')}${many ? `<td class="fl-wide-only">${share(m, tot, brands.slice(5))}</td>` : ''}${phoneCut ? `<td class="fl-phone-only">${share(m, tot, brands.slice(3))}</td>` : ''}</tr>`;
  });
  const mixHead = [['Year'], ...top.map((b, i) => [LOGOS.has(b) ? logo(b, 'sm') : esc(airlineName(b)), i >= 3 ? 'fl-wide-only' : '']), ...(many ? [['Other', 'fl-wide-only']] : []), ...(phoneCut ? [['Other', 'fl-phone-only']] : [])];
  return `<h2>Trends</h2>${selected ? `<p class="fl-note fl-lead">Selected year${picked.size > 1 ? 's are' : ' is'} highlighted</p>` : ''}
    <div class="fl-charts">
      ${barChart(title, per, yl, { min: 0, scale: true, plain: true, value: (x) => x.perDay, cls: (x) => out(x.k), note: nF, tip: (x, v) => `${yl(x.k)}: ${v.toFixed(1)} a day` })}
      ${barChart('On time', per, yl, { plain: true, cls: (x) => out(x.k), note: nO, tip: (x, v) => `${yl(x.k)}: ${p1(v)} on time` })}
    </div>
    ${brands.length > 1 ? `<h3>${mixLabel}</h3>${tableHTML(mixHead, mixRows)}` : ''}`;
}

// ------------------------------------------------------------------ route page

async function renderRoute() {
  const { from: A, to: B, both } = state;
  const [ab, ba, rank, tA, tB] = await Promise.all([summed((w) => `y/${w}/${A}.json`, B), both ? summed((w) => `y/${w}/${B}.json`, A) : null,
    ranking(), getJSON(`trends/${A}.json`), both ? getJSON(`trends/${B}.json`) : null]);
  const r = both ? merge(ab, ba) : ab;   // merge keeps the original records, so dirOf can tell which way each fun fact happened
  const dirOf = (rec) => (!both || !rec ? '' : ab && [ab.fa, ab.sl, ab.ld].includes(rec) ? ` (${A} to ${B})` : ` (${B} to ${A})`);
  const head = `<p class="fl-title">${linkAirport(A)} ${both ? '⇄' : '→'} ${linkAirport(B)}</p><p class="fl-period-line">${esc(periodTitle())}</p>`;
  if (!r) return `${head}<p class="fl-sub">No flights ${both ? 'between' : 'from'} ${esc(city(A))} ${both ? 'and' : 'to'} ${esc(city(B))} on these airlines in ${esc(periodLabel())}</p>`;
  const [f, on, late, , , dmin] = r.c;
  const map = both ? rank.pairs : rank.dir, key = both ? [A, B].sort().join('-') : `${A}-${B}`;
  const B_ = (id) => badge(eligibleRoutes(map, routeMetric(id), both), key, routeMetric(id), 'routes');
  const brands = new Set(Object.keys(r.a).map((k) => k.split('|')[0]));

  // Ranking lines
  const list = eligibleRoutes(map, routeMetric('ontime'), both), rate = on / f;
  const better = (L) => L.filter(([, v]) => v.on / v.f > rate).length + 1;
  const lines = [];
  if (list.some(([k]) => k === key)) {
    lines.push(`${ordinal(better(list))} of ${num(list.length)} ${both ? 'round trips' : 'routes'} for on-time rate`);
    if (!both) {
      const fromA = list.filter(([k]) => k.startsWith(`${A}-`)), intoB = list.filter(([k]) => k.endsWith(`-${B}`));
      lines.push(`${ordinal(better(fromA))} of ${num(fromA.length)} routes out of ${A}`, `${ordinal(better(intoB))} of ${num(intoB.length)} routes into ${B}`);
    }
  }
  const nat = list.reduce((s, [, v]) => [s[0] + v.f, s[1] + v.on], [0, 0]);
  lines.push(`National average: ${p1(pct(nat[1], nat[0]))}`);

  const rows = Object.entries(r.a).sort((x, y) => y[1][0] - x[1][0]).map(([k, c]) => {
    const [m, o] = k.split('|');
    return `<tr><td>${linkAirline(m)}${m !== o ? `<small>operated by ${esc(airlineName(o))}</small>` : ''}</td><td>${num(c[0])}</td><td class="hide-sm">${p1(pct(c[0], f))}</td><td>${p1(pct(c[1], c[0]))}</td><td class="hide-sm">${p1(pct(c[3], c[0]))}</td><td>${c[2] ? `${Math.round(c[5] / c[2])} min` : '-'}</td></tr>`;
  });

  // Trends: this route (and the reverse, both ways)
  const t1 = tA?.[B], t2 = both ? tB?.[A] : null, perYear = {}, mix = {};
  for (const y of meta.years) {
    const a = t1?.y?.[y], b2 = t2?.y?.[y];
    if (a || b2) perYear[y] = add(a ? [...a] : null, b2 || [0, 0, 0, 0, 0]);
    for (const src of [t1?.a?.[y], t2?.a?.[y]]) for (const [k, v] of Object.entries(src || {})) { mix[y] = mix[y] || {}; mix[y][k] = (mix[y][k] || 0) + v; }
  }

  const facts = [];
  if (r.fa) facts.push(['Fastest flight', dur(r.fa.min), `${flightLabel(r.fa)}, ${fmtDate(r.fa.date)}${dirOf(r.fa)}`]);
  if (r.sl) facts.push(['Slowest flight', dur(r.sl.min), `${flightLabel(r.sl)}, ${fmtDate(r.sl.date)}${dirOf(r.sl)}`]);
  if (r.ld?.delay > 0) facts.push(['Longest delay', dur(r.ld.delay), `${flightLabel(r.ld)}, ${fmtDate(r.ld.date)}${dirOf(r.ld)}`]);
  const tf = tailFact(r.tl, 'on this route'); if (tf) facts.push(tf);

  return `${head}<p class="fl-sub">${esc(`${city(A)} ${both ? 'and' : 'to'} ${city(B)}, ${num(r.d)} miles`)} ${B_('distance')}</p>
    ${factsHTML([['Flights', num(f), B_('busiest')], ['Per day', perDay(f / periodDays())], ['Airlines', brands.size, B_('airlines')],
      ['Scheduled time', dur(r.t[0] / r.t[2])], ['Actual time', dur(r.t[1] / r.t[2]), B_('padding')], ['Avg delay when late', late ? `${Math.round(dmin / late)} min` : '-', B_('delay')]])}
    <h2>On time</h2>${onTimeHTML(r.c, ['ontime', 'delayed', 'canceled', 'diverted'].map(B_).join(''), lines)}
    <p class="fl-note">Ranked among ${both ? 'round trips' : 'routes'} with a flight a day${both ? ' each way' : ''}</p>
    <h2>Airlines</h2>${tableHTML([['Airline'], ['Flights'], ['Share', 'hide-sm'], ['On time'], ['Canceled', 'hide-sm'], ['Avg delay when late']], rows)}
    ${trendsHTML(perYear, mix, 'Airline share of flights')}
    ${whenHTML(r)}${causesHTML(r)}${funHTML(facts)}`;
}

// ------------------------------------------------------------------ airport page

async function renderAirport() {
  const C = state.ap, codes = unitCodes(C), isCity = !!MARKETS[C];
  const [parts, rank, trs] = await Promise.all([Promise.all(codes.map((c) => summed((w) => `y/${w}/ap/${c}.json`))), ranking(),
    Promise.all(codes.map((c) => getJSON(`trends/ap/${c}.json`)))]);
  let r = null;
  for (const p of parts) if (p) r = merge(r, p);
  const tr = { y: {}, a: {} };
  for (const t of trs) {
    for (const [y, c] of Object.entries(t?.y || {})) tr.y[y] = add(tr.y[y], c);
    for (const [y, m] of Object.entries(t?.a || {})) { tr.a[y] = tr.a[y] || {}; for (const [b, n] of Object.entries(m)) tr.a[y][b] = (tr.a[y][b] || 0) + n; }
  }
  const head = `<p class="fl-title">${esc(isCity ? unitName(C) : C)}</p><p class="fl-period-line">${esc(periodTitle())}</p>`;
  if (!r) return `${head}<p class="fl-sub">No flights at ${esc(unitName(C))} on these airlines in ${esc(periodLabel())}</p>`;
  const [f, , late, , , dmin] = r.c;
  const totals = airportTotals(rank.dir);
  const B_ = (id) => badge(eligibleAirports(totals, airportMetric(id)), C, airportMetric(id), 'airports');
  const dests = Object.entries(r.dests).sort((x, y) => y[1][0] - x[1][0]);
  const brandsHere = Object.entries(r.ab).sort((x, y) => y[1] - x[1]);
  const total = f + r.in;

  // Departures on time by airline
  const depBy = {};
  for (const [k, c] of Object.entries(r.a)) depBy[k.split('|')[0]] = add(depBy[k.split('|')[0]], c);
  const alRows = brandsHere.map(([b, n]) => { const d = depBy[b]; return `<tr><td>${linkAirline(b)}</td><td>${num(n)}</td><td>${p1(pct(n, total))}</td><td>${d ? p1(pct(d[1], d[0])) : '-'}</td><td class="hide-sm">${d ? p1(pct(d[3], d[0])) : '-'}</td></tr>`; });

  const onList = eligibleAirports(totals, airportMetric('ontime'));
  const lines = [];
  const me = rankOf(onList, C, airportMetric('ontime'), true);
  if (me) lines.push(`${ordinal(me.rank)} of ${num(me.of)} ${state.cities ? 'cities and airports' : 'airports'} for on-time departures`);

  const daily = dests.filter(([, v]) => v[0] >= periodDays());
  const destRow = ([d, v]) => `<tr><td>${isCity ? linkAirport(d, `To ${d}`) : linkRoute(C, d, `${C} → ${d}`)}<small>${esc(city(d))}</small></td><td>${num(v[0])}</td><td>${p1(pct(v[1], v[0]))}</td><td class="hide-sm">${p1(pct(v[2], v[0]))}</td></tr>`;
  const byRate = [...daily].sort((x, y) => y[1][1] / y[1][0] - x[1][1] / x[1][0]);
  const destLines = byRate.length >= 2 ? bestWorstHTML(byRate, (k) => (isCity ? linkAirport(k) : linkRoute(C, k, k))) : '';

  const longest = dests.reduce((m, x) => (!m || x[1][3] > m[1][3] ? x : m), null);
  const shortest = dests.reduce((m, x) => (!m || x[1][3] < m[1][3] ? x : m), null);
  const facts = [];
  if (longest) facts.push(['Longest nonstop', `${num(longest[1][3])} mi`, `To ${esc(city(longest[0]))} (${longest[0]})`]);
  if (shortest && shortest !== longest) facts.push(['Shortest nonstop', `${num(shortest[1][3])} mi`, `To ${esc(city(shortest[0]))} (${shortest[0]})`]);
  if (r.ld?.delay > 0) facts.push(['Longest delay', dur(r.ld.delay), `${flightLabel(r.ld)} to ${r.ld.d}, ${fmtDate(r.ld.date)}`]);
  const tf = tailFact(r.tl, `out of ${isCity ? unitName(C) : C}`); if (tf) facts.push(tf);

  return `${head}<p class="fl-sub">${isCity ? codes.map((c) => linkAirport(c)).join(', ') : esc(city(C))}</p>
    ${factsHTML([['Flights', num(total), B_('busiest')], ['Departures', num(f)], ['Arrivals', num(r.in)], ['Per day', perDay(total / periodDays())],
      ['Destinations', dests.length, B_('routes')], ['Airlines', brandsHere.length, B_('airlines')], ['Avg delay when late', late ? `${Math.round(dmin / late)} min` : '-', B_('delay')]])}
    <h2>On-time departures</h2>${onTimeHTML(r.c, ['ontime', 'canceled'].map(B_).join(''), lines)}
    <h2>Airlines</h2>${tableHTML([['Airline'], ['Flights'], ['Share'], ['On-time departures'], ['Canceled', 'hide-sm']], alRows)}
    <h2>Destinations</h2>${tableHTML([['Route'], ['Flights'], ['On time'], ['Canceled', 'hide-sm']], (allDestRows = dests.map(destRow).join(''), dests.slice(0, 15).map(destRow)), 'fl-dest')}
    ${dests.length > 15 ? `<button class="pill fl-more" type="button" data-more="dests">Show all ${dests.length}</button>` : ''}${destLines}
    ${trendsHTML(tr?.y || {}, tr?.a, 'Airline share of flights', 'Departures a day')}
    ${whenHTML(r)}${causesHTML(r)}${funHTML(facts)}`;
}

// ------------------------------------------------------------------ airline page

async function renderAirline() {
  const B = state.al;
  const [r, idxs, tr] = await Promise.all([summed((w) => `y/${w}/al/${B}.json`), Promise.all(windows().map((w) => getJSON(`y/${w}/al/index.json`))), getJSON('trends/al.json')]);
  const head = `<p class="fl-title fl-title-logo">${LOGOS.has(B) ? logo(B) : `<span>${esc(airlineName(B))}</span>`}</p><p class="fl-period-line">${esc(periodTitle())}</p>`;
  if (!r) return `${head}<p class="fl-sub">No ${esc(airlineName(B))} flights in ${esc(periodLabel())}</p>`;
  const [f, on, late, , , dmin] = r.c;
  const index = airlineIndex(idxs);
  const amongAirlines = (val, label) => {
    const vals = Object.values(index).map(val).filter((v) => v !== null);
    const mine = val(index[B]);
    return mine === null ? '' : `${ordinal(vals.filter((v) => v > mine).length + 1)} of ${vals.length} airlines ${label}`;
  };
  const routes = Object.entries(r.routes).sort((x, y) => y[1][0] - x[1][0]);
  const aps = Object.entries(r.airports).sort((x, y) => y[1] - x[1]);
  const opRows = Object.entries(r.a).sort((x, y) => y[1][0] - x[1][0]).map(([k, c]) => {
    const o = k.split('|')[1];
    return `<tr><td>${esc(airlineName(o))}</td><td>${num(c[0])}</td><td>${p1(pct(c[0], f))}</td><td>${p1(pct(c[1], c[0]))}</td><td class="hide-sm">${p1(pct(c[3], c[0]))}</td></tr>`;
  });
  const routeRow = ([k, v]) => { const [o, d] = k.split('-'); return `<tr><td>${linkRoute(o, d)}<small>${esc(city(o))} to ${esc(city(d))}</small></td><td>${num(v[0])}</td><td>${p1(pct(v[1], v[0]))}</td><td class="hide-sm">${p1(pct(v[3], v[0]))}</td></tr>`; };
  const apRow = ([c, n]) => `<tr><td>${linkAirport(c)}<small>${esc(city(c))}</small></td><td>${num(n)}</td><td>${p1(pct(n, f))}</td></tr>`;
  const daily = routes.filter(([, v]) => v[0] >= periodDays());
  const byRate = [...daily].sort((x, y) => y[1][1] / y[1][0] - x[1][1] / x[1][0]);
  const bestWorst = byRate.length >= 2 ? bestWorstHTML(byRate, (k) => linkRoute(...k.split('-'))) : '';
  const longest = routes.reduce((m, x) => (!m || x[1][5] > m[1][5] ? x : m), null);
  const shortest = routes.reduce((m, x) => (!m || x[1][5] < m[1][5] ? x : m), null);
  const facts = [];
  if (longest) facts.push(['Longest route', `${num(longest[1][5])} mi`, longest[0].replace('-', ' to ')]);
  if (shortest) facts.push(['Shortest route', `${num(shortest[1][5])} mi`, shortest[0].replace('-', ' to ')]);
  if (r.ld?.delay > 0) facts.push(['Longest delay', dur(r.ld.delay), `Flight ${r.ld.flight}, ${r.ld.o} to ${r.ld.d}, ${fmtDate(r.ld.date)}`]);
  const tf = tailFact(r.tl, `for ${airlineName(B)}`); if (tf) facts.push(tf);
  const lines = [amongAirlines((x) => (x ? x.c[1] / x.c[0] : null), 'for on-time rate'), amongAirlines((x) => (x ? x.c[0] : null), 'for flights')].filter(Boolean);

  return `${head}<p class="fl-sub">${num(routes.length)} routes, ${num(aps.length)} airports</p>
    ${factsHTML([['Flights', num(f)], ['Per day', perDay(f / periodDays())], ['Routes', num(routes.length)], ['Airports', num(aps.length)],
      ['Scheduled time', dur(r.t[0] / r.t[2])], ['Actual time', dur(r.t[1] / r.t[2])], ['Avg delay when late', late ? `${Math.round(dmin / late)} min` : '-']])}
    <h2>On time</h2>${onTimeHTML(r.c, '', lines)}
    ${opRows.length > 1 ? `<h2>Who flies it</h2>${tableHTML([['Operator'], ['Flights'], ['Share'], ['On time'], ['Canceled', 'hide-sm']], opRows)}` : ''}
    <h2>Biggest airports</h2>${tableHTML([['Airport'], ['Flights'], ['Share']], aps.slice(0, 10).map(apRow))}
    <h2>Busiest routes</h2>${tableHTML([['Route'], ['Flights'], ['On time'], ['Canceled', 'hide-sm']], routes.slice(0, 15).map(routeRow), 'fl-dest')}${bestWorst}
    ${trendsHTML(tr?.[B]?.y || {}, tr?.[B]?.ops, 'Share flown by each operator')}
    ${whenHTML(r)}${causesHTML(r)}${funHTML(facts)}`;
}
function airlineIndex(idxs) {
  const out = {};
  for (const idx of idxs) for (const [b, v] of Object.entries(idx || {})) {
    const o = out[b] || { c: null, x: null, t: null, nr: 0, na: 0 };
    out[b] = { c: add(o.c, v.c), x: add(o.x, v.x), t: add(o.t, v.t), nr: Math.max(o.nr, v.nr), na: Math.max(o.na, v.na) };
  }
  return out;
}

// ------------------------------------------------------------------ rankings

async function renderRankings() {
  const tab = state.tab, rk = state.rk;
  if (tab === 'airlines') return renderAirlineCompare();
  const metrics = tab === 'airports' ? AMETRICS : METRICS;
  if (!metrics.some((m) => m.id === rk.m)) rk.m = 'busiest';
  const m = metrics.find((x) => x.id === rk.m);
  if (!m.lo) rk.lo = false;
  const rank = await ranking();
  const allBrands = new Set();
  rank.dir.forEach((r) => r.brands.forEach((b) => allBrands.add(b)));
  if (rk.fal && !allBrands.has(rk.fal)) rk.fal = '';

  let list;
  if (tab === 'airports') {
    const dir = rk.fal ? new Map([...rank.dir].filter(([, r]) => r.brands.has(rk.fal))) : rank.dir;
    list = eligibleAirports(airportTotals(dir), m);
  } else {
    list = eligibleRoutes(state.both ? rank.pairs : rank.dir, m, state.both)
      .filter(([k, r]) => (!rk.fal || r.brands.has(rk.fal)) && (!rk.fap || k.split('-').includes(rk.fap)));
  }
  list.sort((a, b) => (rk.lo ? m.val(a[1]) - m.val(b[1]) : m.val(b[1]) - m.val(a[1])) || b[1].f - a[1].f);
  const ranked = withRanks(list, m);
  const nameCell = (k) => {
    if (tab === 'airports') return MARKETS[k] ? `<a href="#" data-go="airports" data-ap="${k}" data-cities="1">${esc(unitName(k))}</a><small>${unitCodes(k).join(', ')}</small>` : `${linkAirport(k)}<small>${esc(city(k))}</small>`;
    const [a, b] = k.split('-');
    return `${linkRoute(a, b, `${a} ${state.both ? '⇄' : '→'} ${b}`)}<small>${esc(city(a))} ${state.both ? 'and' : 'to'} ${esc(city(b))}</small>`;
  };
  const shown = ranked.slice(0, rk.n);
  const hlRow = rk.hl && !shown.some((x) => x.k === rk.hl) ? ranked.find((x) => x.k === rk.hl) : null;
  const brandList = [...allBrands].sort((a, b) => airlineName(a).localeCompare(airlineName(b)));
  const scope = tab === 'airports' ? (state.cities ? 'cities and airports' : 'airports') : state.both ? 'round trips' : 'routes';
  const minNote = m.all ? '' : tab === 'airports' ? ' with a departure a day' : ` with a flight a day${state.both ? ' each way' : ''}`;
  const nameHead = tab === 'airports' ? (state.cities ? 'City or airport' : 'Airport') : 'Route';

  return `<div class="fl-rk-row">
      ${tab === 'routes' ? `<div class="fl-field fl-rk-ap"><input id="fl-rk-ap" type="text" autocomplete="off" placeholder="Any airport" aria-label="Airport" value="${rk.fap ? esc(`${rk.fap} (${city(rk.fap)})`) : ''}"><ul class="fl-list" id="fl-rk-ap-list" hidden></ul></div>` : ''}
      <select id="fl-rk-al" aria-label="Airline"><option value="">All airlines</option>${brandList.map((b) => `<option value="${b}"${b === rk.fal ? ' selected' : ''}>${esc(airlineName(b))}</option>`).join('')}</select>
    </div>
    ${ranked.length ? rankTable(metrics, m, rk.lo, nameHead, shown, hlRow, nameCell) : '<p class="fl-sub">Nothing matches these filters</p>'}
    ${ranked.length > rk.n ? `<button class="pill fl-more" type="button" data-more="rank">Show more</button>` : ''}
    <p class="fl-note">${num(ranked.length)} ${scope}${minNote}</p>`;
}

// Equal values share a rank
function withRanks(list, m) {
  let lastV = null, lastRank = 0;
  return list.map(([k, r], i) => { const v = m.val(r); if (v !== lastV) { lastRank = i + 1; lastV = v; } return { k, r, rank: lastRank }; });
}

// One table with every stat; click a header to rank by it, again to flip it.
// Phones drop the lower-priority columns, never the ranked one.
function rankTable(cols, m, lo, nameHead, rows, hlRow, nameCell) {
  // On the narrowest phones, ranking by a lower-priority stat bumps the p0 column
  const cls = (c) => ['col-num', c === m ? 'sort-active' : c.pri ? `fl-p${c.pri}` : c.p0 && m.pri ? 'fl-p0' : ''].filter(Boolean).join(' ');
  const head = `<tr><th class="col-rank col-num">Rank</th><th class="nm">${nameHead}</th>${cols.map((c) => {
    const nextLo = c === m && c.lo ? !lo : false;
    const arrow = c === m ? ` <span class="sort-arrow">${lo ? '&uarr;' : '&darr;'}</span>` : '';
    return `<th class="${cls(c)}"><button type="button" class="fl-sort" data-m="${c.id}" data-l="${nextLo ? 1 : 0}" title="${esc(cap(c === m && c.lo ? (lo ? c.hi : c.lo) : c.hi))}">${c.col || c.name}${arrow}</button></th>`;
  }).join('')}</tr>`;
  const row = (x, hl) => `<tr class="${hl ? 'hl' : ''}"><td class="col-rank col-num">${num(x.rank)}</td><td class="nm">${nameCell(x.k)}</td>${cols.map((c) => {
    const v = c.val(x.r);
    return `<td class="${cls(c)}">${v === null || !Number.isFinite(v) ? '-' : c.sh(v)}</td>`;
  }).join('')}</tr>`;
  let body = rows.map((x) => row(x, x.k === state.rk.hl)).join('');
  if (hlRow) body += `<tr class="gap"><td colspan="${cols.length + 2}">&hellip;</td></tr>${row(hlRow, true)}`;
  return `<div class="fl-wide"><table class="sport-table fl-rk-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

// Airlines are few enough to show them all
async function renderAirlineCompare() {
  const index = airlineIndex(await Promise.all(windows().map((w) => getJSON(`y/${w}/al/index.json`))));
  const rk = state.rk;
  const m = ALMETRICS.find((c) => c.id === rk.m) || ALMETRICS[0];
  rk.m = m.id;
  if (!m.lo) rk.lo = false;
  const list = Object.entries(index).sort((a, b) => (rk.lo ? m.val(a[1]) - m.val(b[1]) : m.val(b[1]) - m.val(a[1])));
  return `${rankTable(ALMETRICS, m, rk.lo, 'Airline', withRanks(list, m), null, linkAirline)}
    <p class="fl-note">Regional partners count toward the airline you'd buy the ticket from</p>`;
}

// ------------------------------------------------------------------ page shell

function syncControls() {
  document.querySelectorAll('#fl-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
  document.querySelectorAll('#fl-mode button').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.mode));
  const lookup = state.mode === 'lookup';
  $('#fl-pick-route').hidden = !(lookup && state.tab === 'routes');
  $('#fl-pick-airport').hidden = !(lookup && state.tab === 'airports');
  $('#fl-pick-airline').hidden = !(lookup && state.tab === 'airlines');
  $('#fl-dir').hidden = state.tab !== 'routes';
  $('#fl-cities').hidden = state.tab !== 'airports';
  document.querySelectorAll('#fl-cities button').forEach((b) => b.classList.toggle('active', (b.dataset.c === 'cities') === state.cities));
  document.querySelectorAll('#fl-dir button').forEach((b) => b.classList.toggle('active', (b.dataset.d === 'both') === state.both));
  $('#fl-from').value = `${state.from} (${city(state.from)})`;
  $('#fl-to').value = `${state.to} (${city(state.to)})`;
  $('#fl-ap').value = MARKETS[state.ap] ? unitName(state.ap) : `${state.ap} (${city(state.ap)})`;
  $('#fl-y0').value = state.y0;
  const y1 = $('#fl-y1');
  y1.hidden = $('#fl-y1-label').hidden = state.y0 === 'last12';
  if (!y1.hidden) {
    y1.innerHTML = meta.years.filter((y) => y >= state.y0).slice().reverse().map((y) => `<option value="${y}">${y}</option>`).join('');
    if (!state.y1 || state.y1 < state.y0) state.y1 = state.y0;
    y1.value = state.y1;
  }
}

async function renderAirlinePicker() {
  const index = airlineIndex(await Promise.all(windows().map((w) => getJSON(`y/${w}/al/index.json`))));
  const brands = Object.keys(index).sort((a, b) => index[b].c[0] - index[a].c[0]);
  if (brands.length && !brands.includes(state.al)) state.al = brands[0];
  $('#fl-pick-airline').innerHTML = brands.map((b) => `<button type="button" class="fl-al-pick${b === state.al ? ' active' : ''}" data-al="${b}" aria-label="${esc(airlineName(b))}">${logo(b)}</button>`).join('');
}

let renderSeq = 0;
async function update() {
  setURL();
  syncControls();
  const seq = ++renderSeq;
  if (state.tab === 'airlines' && state.mode === 'lookup') await renderAirlinePicker();
  const html = state.mode === 'rank' ? await renderRankings()
    : state.tab === 'airports' ? await renderAirport() : state.tab === 'airlines' ? await renderAirline() : await renderRoute();
  if (seq !== renderSeq) return;   // a newer click already took over
  $('#fl-main').innerHTML = html;
  if (state.mode === 'rank' && state.tab === 'routes') setupSearch('#fl-rk-ap', '#fl-rk-ap-list', (c) => { state.rk.fap = c; state.rk.n = 25; state.rk.hl = ''; update(); });
  if (state.rk.hl) document.querySelector('.fl-rk-table tr.hl')?.scrollIntoView({ block: 'center' });
}

function setURL() {
  const q = new URLSearchParams();
  if (state.tab !== 'routes') q.set('tab', state.tab);
  if (state.mode === 'rank') {
    q.set('mode', 'rankings');
    q.set('m', state.rk.m); if (state.rk.lo) q.set('lo', '1');
    if (state.tab !== 'airlines' && state.rk.fal) q.set('fal', state.rk.fal);
    if (state.tab === 'routes' && state.rk.fap) q.set('fap', state.rk.fap);
  } else if (state.tab === 'routes') { q.set('from', state.from); q.set('to', state.to); }
  else if (state.tab === 'airports') q.set('ap', state.ap);
  else q.set('al', state.al);
  if (state.tab === 'airports' && state.cities) q.set('cities', '1');
  if (state.tab === 'routes' && state.both) q.set('both', '1');
  if (state.y0 !== 'last12') { q.set('y0', state.y0); q.set('y1', state.y1); }
  history.replaceState(null, '', `${location.pathname}?${q}`);
}

function setupSearch(inputSel, listSel, onPick, opts = {}) {
  const input = $(inputSel), list = $(listSel);
  if (!input || !list) return;
  const codes = Object.keys(airports).sort((a, b) => airports[b][1] - airports[a][1]);
  input.addEventListener('focus', () => input.select());
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { list.hidden = true; return; }
    const cityMode = opts.cities && state.cities;
    const cityHits = cityMode ? Object.entries(MARKETS).filter(([, m]) => m.name.toLowerCase().includes(q) || m.airports.some((c) => c.toLowerCase().startsWith(q))).map(([id]) => id) : [];
    const hits = codes.filter((c) => c.toLowerCase().startsWith(q))
      .concat(codes.filter((c) => !c.toLowerCase().startsWith(q) && airports[c][0].toLowerCase().includes(q)))
      .filter((c) => !(cityMode && marketOf[c])).slice(0, 8);
    list.innerHTML = cityHits.length + hits.length
      ? [...cityHits.map((id) => `<li><button type="button" data-c="${id}"><b>${esc(MARKETS[id].name)}</b> ${MARKETS[id].airports.join(', ')}</button></li>`),
        ...hits.map((c) => `<li><button type="button" data-c="${c}"><b>${c}</b> ${esc(airports[c][0])}</button></li>`)].join('')
      : '<li class="fl-none">No match</li>';
    list.hidden = false;
    list.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { list.hidden = true; onPick(b.dataset.c); }));
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') list.querySelector('button')?.click(); });
}

async function init() {
  let markets;
  [meta, airports, markets] = await Promise.all([getJSON('meta.json'), getJSON('airports.json'), getJSON('markets.json')]);
  for (const [id, m] of Object.entries(markets || {})) if (!id.startsWith('_')) { MARKETS[id] = m; m.airports.forEach((c) => { marketOf[c] = id; }); }
  if (!meta || !airports) { $('#fl-main').innerHTML = '<p class="fl-sub">Flight data is unavailable right now</p>'; return; }
  const q = new URLSearchParams(location.search);
  const ok = (c) => (c && airports[c.toUpperCase()] ? c.toUpperCase() : null);
  // Links from before the Routes / Airports / Airlines tabs
  if (q.get('view') === 'rankings') { q.set('mode', 'rankings'); if (q.get('rank') === 'airports') q.set('tab', 'airports'); if (q.get('ap')) q.set('fap', q.get('ap')); if (q.get('al')) q.set('fal', q.get('al')); }
  if (['routes', 'airports', 'airlines'].includes(q.get('tab'))) state.tab = q.get('tab');
  if (q.get('mode') === 'rankings') state.mode = 'rank';
  state.from = ok(q.get('from')) || state.from;
  state.to = ok(q.get('to')) || state.to;
  state.both = q.get('both') === '1';
  state.cities = q.get('cities') === '1';
  if (state.tab === 'airports' && (ok(q.get('ap')) || MARKETS[q.get('ap')])) state.ap = ok(q.get('ap')) || q.get('ap');
  if (q.get('al') && /^[A-Z0-9]{2}$/.test(q.get('al')) && state.tab === 'airlines') state.al = q.get('al');
  if (q.get('m')) state.rk.m = q.get('m');
  state.rk.lo = q.get('lo') === '1';
  state.rk.fap = ok(q.get('fap')) || '';
  state.rk.fal = q.get('fal') || '';
  if (meta.years.includes(q.get('y0'))) { state.y0 = q.get('y0'); state.y1 = meta.years.includes(q.get('y1')) ? q.get('y1') : state.y0; }

  $('#fl-y0').innerHTML = `<option value="last12">Last 12 months</option>${meta.years.slice().reverse().map((y) => `<option value="${y}">${y}${partial(y)}</option>`).join('')}`;
  $('#fl-y0').addEventListener('change', (e) => { state.y0 = e.target.value; state.y1 = state.y0 === 'last12' ? null : (state.y1 && state.y1 >= state.y0 ? state.y1 : state.y0); update(); });
  $('#fl-y1').addEventListener('change', (e) => { state.y1 = e.target.value; update(); });
  setupSearch('#fl-from', '#fl-from-list', (c) => { state.from = c; update(); });
  setupSearch('#fl-to', '#fl-to-list', (c) => { state.to = c; update(); });
  setupSearch('#fl-ap', '#fl-ap-list', (c) => { state.ap = c; update(); }, { cities: true });
  $('#fl-swap').addEventListener('click', () => { [state.from, state.to] = [state.to, state.from]; update(); });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.fl-field')) document.querySelectorAll('.fl-list').forEach((l) => { l.hidden = true; });
    const t = e.target.closest('[data-tab], [data-mode], [data-d], #fl-cities [data-c], [data-go], [data-badge], [data-m], [data-lo], [data-more], .fl-al-pick');
    if (!t || !t.closest('.fl')) return;
    e.preventDefault();
    const rk = state.rk;
    if (t.dataset.tab) { state.tab = t.dataset.tab; rk.hl = ''; rk.n = 25; }
    else if (t.dataset.mode) { state.mode = t.dataset.mode; rk.hl = ''; rk.n = 25; }
    else if (t.dataset.d) state.both = t.dataset.d === 'both';
    else if (t.dataset.c) {
      // To cities: an airport in a market becomes its city. Back to airports: the city's busiest airport.
      state.cities = t.dataset.c === 'cities';
      if (state.cities && marketOf[state.ap]) state.ap = marketOf[state.ap];
      if (!state.cities && MARKETS[state.ap]) state.ap = MARKETS[state.ap].airports[0];
      state.rk.hl = '';
    }
    else if (t.dataset.badge) {
      // From a badge to that ranking, with this route or airport highlighted
      Object.assign(rk, { m: t.dataset.m, lo: t.dataset.lo === '1', fap: '', fal: '', n: 25, hl: t.dataset.key });
      state.tab = t.dataset.badge; state.mode = 'rank';
      window.scrollTo(0, 0);
    } else if (t.dataset.go) {
      state.tab = t.dataset.go; state.mode = 'lookup';
      if (t.dataset.from) { state.from = t.dataset.from; state.to = t.dataset.to; }
      if (t.dataset.ap) { state.ap = t.dataset.ap; if (t.dataset.cities) state.cities = true; else if (!MARKETS[t.dataset.ap]) state.cities = false; }
      if (t.dataset.al) state.al = t.dataset.al;
      window.scrollTo(0, 0);
    } else if (t.classList.contains('fl-al-pick')) state.al = t.dataset.al;
    else if (t.dataset.m) { if (rk.m !== t.dataset.m) { rk.n = 25; rk.hl = ''; } rk.m = t.dataset.m; rk.lo = t.dataset.l === '1'; }
    else if (t.dataset.more === 'rank') rk.n += 50;
    else if (t.dataset.more === 'dests') {   // expands in place, no re-render
      document.querySelector('.fl-dest tbody').innerHTML = allDestRows;
      t.hidden = true;
      return;
    }
    update();
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'fl-rk-al') { state.rk.fal = e.target.value; state.rk.n = 25; update(); }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'fl-rk-ap' && !e.target.value.trim() && state.rk.fap) { state.rk.fap = ''; update(); }
  });
  const tip = $('#fl-tip');
  document.addEventListener('mousemove', (e) => {
    const t = e.target.closest('[data-t]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.dataset.t; tip.hidden = false;
    tip.style.left = `${Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8)}px`;
    tip.style.top = `${e.clientY - 34}px`;
  });
  update();
}
let allDestRows = '';   // the airport page's full destinations list, for "Show all"

init();
