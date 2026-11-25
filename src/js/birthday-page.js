// fakeronjan.com/birthday: same-birthday famous people, people closest in age by
// group, and history that happened closer to your birth than to today.
// Data: /data/birthdays/ (built by tools/birthdays/build.py from Wikipedia + Wikidata).
// The birthday never leaves the browser; it's remembered in localStorage only.

const $ = (s) => document.querySelector(s);
const DAY = 86400000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
const STORE_KEY = 'birthday-date';
const GROUPS = [
  ['all', 'Everyone'], ['nba', 'NBA'], ['nfl', 'NFL'], ['mlb', 'MLB'], ['nhl', 'NHL'], ['wnba', 'WNBA'],
  ['soccer', 'Soccer'], ['tennis', 'Tennis'], ['actors', 'Actors'], ['musicians', 'Musicians'],
  ['uspol', 'US politicians'],
];
const SAME_DAY_SHOWN = 20, AGE_SHOWN = 25, EVENTS_SHOWN = 15, WINDOW_DAYS = 31;
const TABS = ['same', 'age', 'half', 'numbers'];
const TIME_KEY = 'birthday-time';
let birthTime = '';   // 'HH:MM' if given; the By the numbers tab counts from it, else from midnight
let tab = 'same';

let birth = null;        // UTC-midnight ms
let isExample = false;
let group = 'all';
let events = [];
const yearCache = new Map();

// ------------------------------------------------------------------ helpers

const pad = (n) => String(n).padStart(2, '0');
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const parseIso = (s) => Date.parse(s + 'T00:00:00Z');
function todayMs() { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }
function fmtDate(ms, withYear = true) {
  const d = new Date(ms);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${withYear ? `, ${d.getUTCFullYear()}` : ''}`;
}
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function wikiLink(title, text) {
  if (!title) return esc(text);
  return `<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}" target="_blank" rel="noopener">${esc(text)}</a>`;
}
// Whole years and leftover days between two dates, "34 years" / "3 years, 2 months"
function yearsBetween(a, b) {
  const da = new Date(a), db = new Date(b);
  let y = db.getUTCFullYear() - da.getUTCFullYear();
  if (db.getUTCMonth() < da.getUTCMonth() || (db.getUTCMonth() === da.getUTCMonth() && db.getUTCDate() < da.getUTCDate())) y--;
  return y;
}
function plural(n, word) { return `${n} ${word}${n === 1 ? '' : 's'}`; }
function dayGap(days) {
  if (days === 0) return 'Same day';
  const n = Math.abs(days);
  return `${plural(n, 'day')} ${days < 0 ? 'older' : 'younger'}`;
}

// Photos: a Wikipedia lead image on Wikimedia Commons, stored as its file path ('3/34/Name.jpg') or,
// for SVG/TIFF/PDF files, the whole thumbnail path. No photo: a circle with initials.
const SVG_NS = 'http://www.w3.org/2000/svg';
function photoURL(i, px = 120) {   // Wikimedia serves set widths only: 120 or 250 here
  if (!i) return null;
  const base = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';
  return /\/\d+px-[^/]+$/.test(i) ? base + i : `${base}${i}/${px}px-${i.split('/').pop()}`;
}
const initials = (n) => n.replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
function face(p, px) {
  const u = photoURL(p.i, px);
  return u ? `<img class="bd-face" src="${u}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="bd-face ini" aria-hidden="true">${esc(initials(p.n))}</span>`;
}

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}
async function yearFile(y) {
  if (!yearCache.has(y)) yearCache.set(y, getJSON(`/data/birthdays/years/${y}.json`).then(x => x || []));
  return yearCache.get(y);
}

// ------------------------------------------------------------------ same birthday

async function renderSameDay() {
  const d = new Date(birth);
  const md = `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const people = (await getJSON(`/data/birthdays/days/${md}.json`)) || [];
  const y = d.getUTCFullYear();
  $('#bd-same-title').textContent = `Born on ${fmtDate(birth, false)}`;
  const twins = people.filter(p => p.y === y);
  $('#bd-twins').innerHTML = twins.length
    ? `<p class="bd-twins">Born the exact same day as you: ${twins.map(p => `<strong>${wikiLink(p.t, p.n)}</strong> (${esc(p.d)})`).join(', ')}</p>`
    : '';
  const yr = (p) => (p.y < 0 ? `${-p.y} BC` : p.y);
  const wikiURL = (t) => `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
  $('#bd-cal').innerHTML = `<div class="bd-cal" aria-hidden="true"><div class="bd-cal-mon">${MONTHS[d.getUTCMonth()]}</div><div class="bd-cal-day">${d.getUTCDate()}</div></div>
    <div class="bd-five">${people.slice(0, 5).map(p => `<a ${p.t ? `href="${wikiURL(p.t)}" target="_blank" rel="noopener"` : ''}>${face(p, 250)}${esc(p.n)}<span>${yr(p)}</span></a>`).join('')}</div>`;
  const row = (p) => `<li class="with-face"><span class="bd-year">${yr(p)}</span>${face(p)}<span class="bd-who">${wikiLink(p.t, p.n)}<span class="bd-desc">${esc(p.d)}${p.x ? ` (died ${p.x})` : ''}</span></span></li>`;
  const list = $('#bd-same');
  list.innerHTML = people.slice(0, SAME_DAY_SHOWN).map(row).join('');
  const more = $('#bd-same-more');
  more.hidden = people.length <= SAME_DAY_SHOWN;
  more.textContent = `Show all ${people.length}`;
  more.onclick = () => { list.innerHTML = people.map(row).join(''); more.hidden = true; };
}

// ------------------------------------------------------------------ closest in age

async function renderAge() {
  const lo = birth - WINDOW_DAYS * DAY, hi = birth + WINDOW_DAYS * DAY;
  const years = [...new Set([new Date(lo).getUTCFullYear(), new Date(birth).getUTCFullYear(), new Date(hi).getUTCFullYear()])];
  const all = (await Promise.all(years.map(yearFile))).flat();
  const inWindow = all.filter(p => { const b = parseIso(p.b); return b >= lo && b <= hi; });
  const counts = {};
  inWindow.forEach(p => p.g.forEach(g => { counts[g] = (counts[g] || 0) + 1; }));
  counts.all = inWindow.length;
  $('#bd-groups').innerHTML = GROUPS.map(([id, label]) =>
    `<button type="button" class="pill${id === group ? ' active' : ''}" data-g="${id}"${counts[id] ? '' : ' disabled'}>${label} <span class="bd-count">${counts[id] || 0}</span></button>`).join('');
  document.querySelectorAll('#bd-groups button').forEach(b => b.addEventListener('click', () => { group = b.dataset.g; renderAge(); }));

  const label = Object.fromEntries(GROUPS);
  // The most famous in the window (most Wikipedia languages), then listed by how close they are
  // to you (Ronjan 11/24: closeness alone surfaced obscure athletes). "Show all" lists everyone by closeness.
  const byGap = (a, b) => Math.abs(a.gap) - Math.abs(b.gap) || b.s - a.s;
  const shown = inWindow
    .filter(p => group === 'all' || p.g.includes(group))
    .map(p => ({ ...p, gap: Math.round((parseIso(p.b) - birth) / DAY) }))
    .sort(byGap);
  const top = [...shown].sort((a, b) => b.s - a.s).slice(0, AGE_SHOWN).sort(byGap);
  ageTimeline(top);
  const row = (p) => `<li class="with-face"><span class="bd-gap${p.gap === 0 ? ' same' : ''}">${dayGap(p.gap)}</span>${face(p)}<span class="bd-who">${wikiLink(p.t, p.n)}<span class="bd-desc">${esc(p.d)}${group === 'all' && p.g.length ? ` <span class="bd-tag">${p.g.map(g => label[g]).join(', ')}</span>` : ''}</span></span><span class="bd-born">${fmtDate(parseIso(p.b))}</span></li>`;
  const list = $('#bd-age');
  list.innerHTML = shown.length ? top.map(row).join('') : '<li class="bd-none">Nobody in this group was born within a month of you</li>';
  const more = $('#bd-age-more');
  more.hidden = shown.length <= AGE_SHOWN;
  more.textContent = `Show all ${shown.length}`;
  more.onclick = () => { list.innerHTML = shown.map(row).join(''); more.hidden = true; };
}

// The shown people on a line from a month older to a month younger, as photos at their birth dates.
// Drawn at the box's own pixel width, so photos stay full size on phones; birthdays that bunch
// together stack upward.
function ageTimeline(people) {
  const box = $('#bd-age-tl');
  if (!people.length) { box.innerHTML = ''; return; }
  const W = Math.max(280, box.clientWidth || 900), small = W < 560;
  const R = small ? 23 : 32, PAD = R + 4, base = 0;
  const x = (gap) => PAD + ((gap + WINDOW_DAYS) / (2 * WINDOW_DAYS)) * (W - 2 * PAD);
  const rows = [];   // per row, the x positions used
  const placed = [...people].sort((a, b) => a.gap - b.gap).map((p) => {
    const px = x(p.gap);
    let r = 0;
    while ((rows[r] || []).some((q) => Math.abs(q - px) < 2 * R + 4)) r++;
    (rows[r] = rows[r] || []).push(px);
    return { p, px, row: r };
  });
  const top = -(rows.length - 1) * (2 * R + 6) - 2 * R - 18;
  const cy = (row) => base - R - 12 - row * (2 * R + 6);
  const parts = placed.map(({ p, px, row }, i) => {
    const y = cy(row), u = photoURL(p.i, 250), tip = `${p.n}: ${dayGap(p.gap).toLowerCase()}`;
    const pic = u
      ? `<clipPath id="bdc${i}"><circle cx="${px}" cy="${y}" r="${R}"/></clipPath><image href="${u}" x="${px - R}" y="${y - R}" width="${2 * R}" height="${2 * R}" clip-path="url(#bdc${i})" preserveAspectRatio="xMidYMid slice"/>`
      : `<circle cx="${px}" cy="${y}" r="${R}" class="ini-c"/><text x="${px}" y="${y}" class="ini-t">${esc(initials(p.n))}</text>`;
    return `<line x1="${px}" y1="${y + R}" x2="${px}" y2="${base}" class="stem"/><a href="https://en.wikipedia.org/wiki/${encodeURIComponent((p.t || p.n).replace(/ /g, '_'))}" target="_blank" rel="noopener"><title>${esc(tip)}</title>${pic}<circle cx="${px}" cy="${y}" r="${R}" class="ring"/></a>`;
  }).join('');
  const mid = x(0);
  box.innerHTML = `<svg viewBox="0 ${top} ${W} ${-top + 40}" role="img" aria-label="People closest in age on a line from a month older to a month younger">
    <line x1="${mid}" y1="${top + 6}" x2="${mid}" y2="${base + 8}" class="you"/>${parts}
    <line x1="${PAD}" y1="${base}" x2="${W - PAD}" y2="${base}" class="axis"/>
    <text x="${mid}" y="${base + 26}" class="you-l">You, ${esc(fmtDate(birth, !small))}</text>
    <text x="${PAD}" y="${base + 26}" class="end">${small ? '1 mo older' : '1 month older'}</text>
    <text x="${W - PAD}" y="${base + 26}" class="end" text-anchor="end">${small ? '1 mo younger' : '1 month younger'}</text></svg>`;
}

// From the same number of days before your birth to today: the events closer to your birth than to
// today as dots, with names written on the graph (Ronjan 11/24) for the oldest few and the 3 right
// before and after your birth. The oldest hang right of their pointers, oldest on top. The 3 before
// your birth hang left (away from the birth marker), the latest on top; the 3 after hang right, the
// earliest on top. Stacked that way, no pointer runs through another label. When the oldest labels
// reach over to the near-birth ones (a short stretch), the near-birth groups move up above them.
function halfTimeline(mirror, half, today, inside, after) {
  const box = $('#bd-half-tl');
  if (!inside) { box.innerHTML = ''; return; }
  const W = Math.max(280, box.clientWidth || 900), small = W < 560, PAD = 8;
  const x = (t) => PAD + ((t - mirror) / (today - mirror)) * (W - 2 * PAD);
  const axisY = 0, oldN = small ? 3 : 5, charW = small ? 6.2 : 7;
  const oldest = inside.slice(0, oldN);
  const before = inside.slice(Math.max(oldN, inside.length - 3));
  const lab = (e, dir, row) => {
    const t = parseIso(e.date), px = x(t);
    // A name too long for the screen with its year drops the year (the dates are in the list below)
    const year = `${e.label} ${new Date(t).getUTCFullYear()}`.length * charW <= W - 2 * PAD ? new Date(t).getUTCFullYear() : '';
    const w = `${e.label} ${year}`.trim().length * charW;
    let a = dir === 'r' ? px + 6 : px - 6 - w;
    a = Math.min(Math.max(a, PAD), W - PAD - w);
    return { e, px, a, b: a + w, row, year };
  };
  // The oldest events are the point of this picture (Ronjan 11/24), so they're labeled first and
  // dropped last. Phones label only the oldest; the events around your birth stay as larger dots there.
  const near0 = small ? [] : [...before.map((e, k) => lab(e, 'l', k)), ...after.map((e, k) => lab(e, 'r', after.length - 1 - k))];
  const old0 = oldest.map((e, i) => lab(e, 'r', oldest.length - 1 - i));
  // Trouble = text over text, or a pointer through a lower label
  const trouble = (L) => L.reduce((n, q) => n + L.filter(o => o !== q && (
    (o.row === q.row && q.a < o.b + 8 && q.b > o.a - 8) || (o.row > q.row && o.px > q.a - 3 && o.px < q.b + 3))).length, 0);
  // Near-birth groups beside the oldest, above them, or the oldest on top: whichever has least trouble
  const k0 = old0.length;
  let labels = [[...old0, ...near0], [...old0, ...near0.map(q => ({ ...q, row: q.row + k0 }))], [...old0.map(q => ({ ...q, row: q.row + 3 })), ...near0]]
    .sort((u, v) => trouble(u) - trouble(v))[0];
  // Still crowded: drop near-birth labels first (the most troublesome each time), then the newest of the oldest
  while (trouble(labels) > 0) {
    const nearLeft = labels.filter(q => !oldest.includes(q.e));
    const pool = nearLeft.length ? nearLeft : [labels.filter(q => oldest.includes(q.e)).sort((u, v) => v.e.date.localeCompare(u.e.date))[0]];
    const worst = pool.map(q => [q, trouble(labels) - trouble(labels.filter(o => o !== q))]).sort((u, v) => v[1] - u[1])[0][0];
    labels = labels.filter(o => o !== worst);
  }
  // Rows packed down after any drops, keeping their order
  const used = [...new Set(labels.map(q => q.row))].sort((u, v) => u - v);
  labels = labels.map(q => ({ ...q, row: used.indexOf(q.row) }));
  const rows = labels.length ? Math.max(...labels.map(q => q.row)) + 1 : 1;
  const rowH = 20, ly = (row) => axisY - 30 - row * rowH;
  const zoneLabelY = ly(rows - 1) - 24;
  const labeled = new Set([...labels.map(q => q.e), ...before, ...after]);
  const dot = (e) => `<circle cx="${x(parseIso(e.date)).toFixed(1)}" cy="${axisY}" r="${labeled.has(e) ? 5 : 4}" class="ev${labeled.has(e) ? ' top' : ''}"><title>${esc(e.label)}, ${esc(fmtDate(parseIso(e.date)))}</title></circle>`;
  const dots = inside.map(dot).join('') + after.map(dot).join('');
  const stems = labels.map(({ px, row }) => `<line x1="${px}" y1="${axisY - 6}" x2="${px}" y2="${ly(row) - 4}" class="lead"/>`).join('');
  const texts = labels.map(({ e, a, row, year }) => `<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(e.wiki.replace(/ /g, '_'))}" target="_blank" rel="noopener"><text x="${a}" y="${ly(row)}" class="ev-l">${esc(e.label)} <tspan class="ev-y">${year}</tspan></text></a>`).join('');
  const marks = [[mirror, 'Same distance back', ''], [birth, 'You were born', 'born'], [half, 'Half your age', 'half'], [today, 'Today', '']];
  const mk = marks.map(([t, l, c], i) => {
    const px = x(t), anchor = i === 0 ? 'start' : i === marks.length - 1 ? 'end' : 'middle';
    const dy = small && i % 2 === 1 ? 34 : 0;
    return `<line x1="${px}" y1="${axisY - 12}" x2="${px}" y2="${axisY + 12 + dy}" class="mk ${c}"/>
      <text x="${px}" y="${axisY + 30 + dy}" class="mk-l ${c}" text-anchor="${anchor}">${l}</text>
      <text x="${px}" y="${axisY + 46 + dy}" class="mk-d" text-anchor="${anchor}">${esc(small ? new Date(t).getUTCFullYear() : fmtDate(t))}</text>`;
  }).join('');
  const bottom = axisY + 52 + (small ? 34 : 0);
  box.innerHTML = `<svg viewBox="0 ${zoneLabelY - 16} ${W} ${bottom - zoneLabelY + 16}" role="img" aria-label="Timeline from ${esc(fmtDate(mirror))} to today, with ${inside.length} events before your birth">
    <rect x="${x(mirror)}" y="${axisY - 12}" width="${x(birth) - x(mirror)}" height="24" rx="4" class="zone"/>
    <text x="${x(mirror)}" y="${zoneLabelY}" class="zone-l" style="text-anchor:start">Closer to your birth than to today</text>
    <line x1="${PAD}" y1="${axisY}" x2="${W - PAD}" y2="${axisY}" class="axis"/>${stems}${dots}${texts}${mk}</svg>`;
}

// ------------------------------------------------------------------ by the numbers

// Round numbers in each unit (Ronjan 11/24): days, hours, minutes, seconds, plus repeating-digit days
const UNITS = [
  ['days', 'Days', 86400e3, [1000, 5000, 10000, 11111, 15000, 20000, 22222, 25000, 30000, 33333, 35000]],
  ['hours', 'Hours', 3600e3, [100e3, 250e3, 500e3, 750e3, 1e6]],
  ['minutes', 'Minutes', 60e3, [1e6, 10e6, 20e6, 30e6, 40e6, 50e6]],
  ['seconds', 'Seconds', 1e3, [1e9, 1.5e9, 2e9, 2.5e9, 3e9]],
];
const bigNum = (n) => (n >= 1e9 ? `${+(n / 1e9).toFixed(1)} billion` : n >= 1e6 ? `${+(n / 1e6).toFixed(1)} million` : n.toLocaleString('en-US'));
const shortNum = (n) => (n >= 1e9 ? `${+(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n % 1000 ? n.toLocaleString('en-US') : `${n / 1e3}k`);
function birthMoment() {
  const d = new Date(birth), [h, m] = birthTime ? birthTime.split(':').map(Number) : [0, 0];
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m).getTime();   // your local clock
}
function localDate(ms) { const d = new Date(ms); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }
function fromNow(ms, now) {
  const days = Math.round((ms - now) / DAY), n = Math.abs(days);
  if (n === 0) return 'Today';
  const span = n < 365 ? plural(n, 'day') : plural(Math.floor(n / 365.25), 'year');
  return days > 0 ? `In ${span}` : `${span} ago`;
}
let numTimer = null;
function renderNumbers() {
  clearInterval(numTimer);
  const b0 = birthMoment();
  $('#bd-num-note').textContent = birthTime ? `Counted from ${localDate(b0)} at ${new Date(b0).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : 'Counted from midnight on your birthday. Add the time you were born for exact numbers.';
  const all = UNITS.flatMap(([id, name, ms, list]) => list.map(n => ({ id, name, n, at: b0 + n * ms })));
  const now0 = Date.now();
  // The live count: each unit so far, and its next round number
  const nowTable = () => {
    const now = Date.now();
    return `<thead><tr><th>Unit</th><th class="col-num">So far</th><th class="bd-wide">Next round number</th><th class="bd-wide">Date</th><th class="bd-wide">When</th></tr></thead><tbody>${UNITS.map(([id, name, ms]) => {
      const nxt = all.filter(m => m.id === id && m.at > now).sort((a, c) => a.at - c.at)[0];
      return `<tr><td>${name}</td><td class="col-num big">${Math.floor((now - b0) / ms).toLocaleString('en-US')}${nxt ? `<span class="bd-sub">Next: ${bigNum(nxt.n)}, ${fromNow(nxt.at, now).toLowerCase()}</span>` : ''}</td><td class="bd-wide">${nxt ? `${bigNum(nxt.n)} ${id}` : '-'}</td><td class="bd-wide">${nxt ? localDate(nxt.at) : '-'}</td><td class="bd-wide">${nxt ? fromNow(nxt.at, now) : '-'}</td></tr>`;
    }).join('')}</tbody>`;
  };
  $('#bd-num-now').innerHTML = nowTable();
  numTimer = setInterval(() => { if (tab === 'numbers') $('#bd-num-now').innerHTML = nowTable(); }, 1000);

  // Every round number in date order; the next one in each unit in bold
  const nextOf = new Set(UNITS.map(([id]) => all.filter(m => m.id === id && m.at > now0).sort((a, c) => a.at - c.at)[0]).filter(Boolean));
  $('#bd-num-list').innerHTML = `<thead><tr><th>Round number</th><th>Date</th><th class="bd-wide">When</th></tr></thead><tbody>${[...all].sort((a, c) => a.at - c.at).map(m =>
    `<tr class="${m.at <= now0 ? 'past' : nextOf.has(m) ? 'next' : ''}"><td>${bigNum(m.n)} ${m.id}</td><td>${localDate(m.at)}<span class="bd-sub">${fromNow(m.at, now0)}</span></td><td class="bd-wide">${fromNow(m.at, now0)}</td></tr>`).join('')}</tbody>`;

  // Four lanes from your birth to age 95, a dot per round number (filled once passed), and now
  const box = $('#bd-num-tl');
  const W = Math.max(280, box.clientWidth || 900), small = W < 560, L = small ? 62 : 80, PAD = 14;
  const end = b0 + 95 * 365.25 * DAY;
  const x = (t) => L + ((t - b0) / (end - b0)) * (W - L - PAD);
  const laneY = (i) => 26 + i * 44;
  const lanes = UNITS.map(([id, name], i) => {
    const pts = all.filter(m => m.id === id && m.at <= end);
    let lastX = -99;
    return `<text x="0" y="${laneY(i) + 4}" class="lane-l">${name}</text><line x1="${L}" y1="${laneY(i)}" x2="${W - PAD}" y2="${laneY(i)}" class="lane"/>` +
      pts.map(m => {
        const px = x(m.at), st = m.at <= now0 ? 'past' : 'future', showL = px - lastX > (small ? 26 : 30);
        if (showL) lastX = px;
        return `<circle cx="${px.toFixed(1)}" cy="${laneY(i)}" r="5" class="ms ${st}"><title>${bigNum(m.n)} ${m.id}: ${localDate(m.at)}</title></circle>${showL ? `<text x="${px.toFixed(1)}" y="${laneY(i) - 10}" class="ms-l ${st}">${shortNum(m.n)}</text>` : ''}`;
      }).join('');
  }).join('');
  const h = laneY(UNITS.length - 1) + 22;
  const ticks = Array.from({ length: 10 }, (_, k) => k * 10).filter(a => !small || a % 20 === 0)
    .map(a => `<text x="${x(b0 + a * 365.25 * DAY).toFixed(1)}" y="${h + 14}" class="tick">${a === 0 ? 'Born' : a}</text>`).join('');
  const nx = x(now0);
  box.innerHTML = `<svg viewBox="0 0 ${W} ${h + 40}" role="img" aria-label="Round-number milestones from your birth to age 95">
    ${lanes}<line x1="${nx}" y1="6" x2="${nx}" y2="${h}" class="now"/><text x="${nx}" y="${h + 30}" class="now-l">Now</text>${ticks}</svg>`;
}

// ------------------------------------------------------------------ halfway back

function renderHalfway() {
  const today = todayMs();
  const age = today - birth;
  const mirror = birth - age;                    // as far before your birth as today is after it
  const half = birth + Math.round(age / 2 / DAY) * DAY;   // when you were half your current age
  const inside = events.filter(e => { const t = parseIso(e.date); return t >= mirror && t < birth; })
    .sort((a, b) => a.date.localeCompare(b.date));
  const head = $('#bd-half-head');
  if (birth >= today) { head.innerHTML = '<p>Pick a birthday in the past to see this</p>'; $('#bd-events').innerHTML = ''; halfTimeline(0, 0, 0, null); return; }
  const after = events.filter(e => { const t = parseIso(e.date); return t >= birth && t <= today; })
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);   // the first 3 after your birth
  halfTimeline(mirror, half, today, inside, after);
  const first = inside[0];
  head.innerHTML = `
    ${first ? `<p class="bd-kicker">You were born closer to this than to today</p><p class="bd-headline">${wikiLink(first.wiki, first.label)}<span class="bd-hdate">${fmtDate(parseIso(first.date))}</span></p>` : ''}
    <p>Today is ${Math.round(age / DAY).toLocaleString('en-US')} days (${plural(yearsBetween(birth, today), 'year')}) after your birth. The same number of days before your birth is <strong>${fmtDate(mirror)}</strong>, so anything after that date happened closer to your birth than to today.</p>
    <p>You were half your current age on <strong>${fmtDate(half)}</strong>.</p>`;
  const eventRow = (e) => {
    const t = parseIso(e.date), yrs = yearsBetween(t, birth);
      const before = yrs >= 1 ? `${plural(yrs, 'year')} before you were born` : `${plural(Math.round((birth - t) / DAY), 'day')} before you were born`;
      return `<li><span class="bd-edate">${fmtDate(t)}</span><span class="bd-who">${wikiLink(e.wiki, e.label)}<span class="bd-desc">${before}</span></span></li>`;
  };
  const evList = $('#bd-events');
  evList.innerHTML = inside.length ? inside.slice(0, EVENTS_SHOWN).map(eventRow).join('') : '<li class="bd-none">None of the events on this list fall in that window</li>';
  const more = $('#bd-events-more');
  more.hidden = inside.length <= EVENTS_SHOWN;
  more.textContent = `Show all ${inside.length}`;
  more.onclick = () => { evList.innerHTML = inside.map(eventRow).join(''); more.hidden = true; };
}

// ------------------------------------------------------------------ setup

function showTab() {
  document.querySelectorAll('#bd-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  TABS.forEach(t => { $(`#bd-sec-${t}`).hidden = t !== tab; });
  // Written by hand so the time reads t=14:35 (URLSearchParams would encode the colon)
  const parts = [];
  if (!isExample) parts.push(`d=${iso(birth)}`);
  if (!isExample && birthTime) parts.push(`t=${birthTime}`);
  if (tab !== 'same') parts.push(`tab=${tab}`);
  history.replaceState(null, '', location.pathname + (parts.length ? `?${parts.join('&')}` : '') + location.hash);
}

async function render() {
  showTab();
  $('#bd-example').hidden = !isExample;
  $('#bd-date').value = iso(birth);
  $('#bd-next').disabled = birth >= todayMs();
  $('#bd-prev').disabled = birth <= parseIso('1900-01-01');
  await Promise.all([renderSameDay(), renderAge()]);
  renderHalfway();
  if (tab === 'numbers') renderNumbers();
}

async function init() {
  events = (await getJSON('/data/birthdays/events.json')) || [];
  // A shared link's birthday (and birth time) shows without replacing the one saved in this browser;
  // changing the date or time here saves it as yours
  const q = new URL(location.href).searchParams;
  const qd = q.get('d'), qtime = q.get('t');
  const linkDate = qd && /^\d{4}-\d{2}-\d{2}$/.test(qd) && !isNaN(parseIso(qd)) && parseIso(qd) <= todayMs() && qd >= '1900-01-01' ? qd : null;
  let saved = null;
  try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* storage off */ }
  if (linkDate) { birth = parseIso(linkDate); isExample = false; }
  else if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) { birth = parseIso(saved); isExample = false; }
  else {
    // Example until you enter yours: today's date, 40 years ago
    const t = new Date(todayMs());
    birth = Date.UTC(t.getUTCFullYear() - 40, t.getUTCMonth(), t.getUTCDate());
    isExample = true;
  }
  const qt = new URL(location.href).searchParams.get('tab');
  if (TABS.includes(qt)) tab = qt;
  // A hidden section has no width to draw at, so switching tabs draws its picture fresh
  document.querySelectorAll('#bd-tabs button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 150); });
  if (linkDate) birthTime = qtime && /^\d{2}:\d{2}$/.test(qtime) ? qtime : '';
  else { try { birthTime = localStorage.getItem(TIME_KEY) || ''; } catch (e) { /* storage off */ } }
  if (!isExample) $('#bd-time').value = birthTime;
  $('#bd-time').addEventListener('change', (e) => {
    birthTime = e.target.value || '';
    if (isExample) isExample = false;
    try {
      localStorage.setItem(STORE_KEY, iso(birth));
      if (birthTime) localStorage.setItem(TIME_KEY, birthTime); else localStorage.removeItem(TIME_KEY);
    } catch (err) { /* storage off */ }
    render();
  });
  $('#bd-date').max = iso(todayMs());
  // Arrows: one day back or forward, never past today
  const step = (dir) => {
    const next = birth + dir * DAY;
    if (next > todayMs() || next < parseIso('1900-01-01')) return;
    birth = next; isExample = false;
    try { localStorage.setItem(STORE_KEY, iso(birth)); } catch (err) { /* storage off */ }
    render();
  };
  $('#bd-prev').addEventListener('click', () => step(-1));
  $('#bd-next').addEventListener('click', () => step(1));
  $('#bd-date').addEventListener('change', (e) => {
    if (!e.target.value) return;
    birth = parseIso(e.target.value); isExample = false;
    try { localStorage.setItem(STORE_KEY, e.target.value); } catch (err) { /* storage off */ }
    render();
  });
  render();
}

init();
