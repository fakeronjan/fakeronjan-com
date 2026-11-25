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
const TABS = ['same', 'age', 'half'];
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
  const row = (p) => `<li class="with-face"><span class="bd-gap${p.gap === 0 ? ' same' : ''}">${dayGap(p.gap)}</span>${face(p)}<span class="bd-who">${wikiLink(p.t, p.n)}<span class="bd-desc">${esc(p.d)}${group === 'all' ? ` <span class="bd-tag">${p.g.map(g => label[g]).join(', ')}</span>` : ''}</span></span><span class="bd-born">${fmtDate(parseIso(p.b))}</span></li>`;
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
// today as dots. Highlighted without hovering (Ronjan 11/24): the oldest few, the 3 right before your
// birth, and the 3 right after. They get numbered badges on the line (stacked where events bunch up)
// and a key below in those three groups. Full-text labels on the line ran into each other.
function halfTimeline(mirror, half, today, inside, after) {
  const box = $('#bd-half-tl');
  if (!inside) { box.innerHTML = ''; return; }
  const W = Math.max(280, box.clientWidth || 900), small = W < 560, PAD = 12;
  const x = (t) => PAD + ((t - mirror) / (today - mirror)) * (W - 2 * PAD);
  const axisY = 0, oldN = small ? 3 : 5;
  const oldest = inside.slice(0, oldN);
  const before = inside.slice(Math.max(oldN, inside.length - 3));
  const groups = [['The oldest', oldest], ['Right before you were born', before], ['Right after you were born', after]].filter(([, l]) => l.length);
  let n = 0;
  const numbered = groups.flatMap(([, l]) => l.map(e => ({ e, n: ++n, px: x(parseIso(e.date)) })));
  // Badges sit above their dots; one that would touch an earlier badge moves up a level
  const R = 10, levels = [];
  numbered.forEach((b) => {
    let lv = 0;
    while ((levels[lv] || []).some(px => Math.abs(px - b.px) < 2 * R + 3)) lv++;
    (levels[lv] = levels[lv] || []).push(b.px);
    b.lv = lv;
  });
  const by = (lv) => axisY - 26 - lv * (2 * R + 4);
  const topY = numbered.length ? by(Math.max(...numbered.map(b => b.lv))) - R : axisY - 20;
  const zoneLabelY = topY - 12;
  const isNum = new Set(numbered.map(b => b.e));
  const dot = (e) => `<circle cx="${x(parseIso(e.date)).toFixed(1)}" cy="${axisY}" r="${isNum.has(e) ? 5 : 4}" class="ev${isNum.has(e) ? ' top' : ''}"><title>${esc(e.label)}, ${esc(fmtDate(parseIso(e.date)))}</title></circle>`;
  const stems = numbered.map(({ px, lv }) => `<line x1="${px}" y1="${axisY - 5}" x2="${px}" y2="${by(lv) + R}" class="lead"/>`).join('');
  const badges = stems + numbered.map(({ e, n: k, px, lv }) => `
    <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(e.wiki.replace(/ /g, '_'))}" target="_blank" rel="noopener"><title>${esc(e.label)}, ${esc(fmtDate(parseIso(e.date)))}</title>
    <circle cx="${px}" cy="${by(lv)}" r="${R}" class="num-c"/><text x="${px}" y="${by(lv)}" class="num-t">${k}</text></a>`).join('');
  const marks = [[mirror, 'Same distance back', ''], [birth, 'You were born', 'born'], [half, 'Half your age', 'half'], [today, 'Today', '']];
  const mk = marks.map(([t, l, c], i) => {
    const px = x(t), anchor = i === 0 ? 'start' : i === marks.length - 1 ? 'end' : 'middle';
    const dy = small && i % 2 === 1 ? 34 : 0;
    return `<line x1="${px}" y1="${axisY - 12}" x2="${px}" y2="${axisY + 12 + dy}" class="mk ${c}"/>
      <text x="${px}" y="${axisY + 30 + dy}" class="mk-l ${c}" text-anchor="${anchor}">${l}</text>
      <text x="${px}" y="${axisY + 46 + dy}" class="mk-d" text-anchor="${anchor}">${esc(small ? new Date(t).getUTCFullYear() : fmtDate(t))}</text>`;
  }).join('');
  const bottom = axisY + 52 + (small ? 34 : 0);
  k = 0;
  const key = groups.map(([title, l]) => `<div><h3>${title}</h3><ol>${l.map(e => `<li value="${++k}">${wikiLink(e.wiki, e.label)} <span>${esc(fmtDate(parseIso(e.date)))}</span></li>`).join('')}</ol></div>`).join('');
  box.innerHTML = `<svg viewBox="0 ${zoneLabelY - 16} ${W} ${bottom - zoneLabelY + 16}" role="img" aria-label="Timeline from ${esc(fmtDate(mirror))} to today, with ${inside.length} events before your birth">
    <rect x="${x(mirror)}" y="${axisY - 12}" width="${x(birth) - x(mirror)}" height="24" rx="4" class="zone"/>
    <text x="${x(mirror)}" y="${zoneLabelY}" class="zone-l" style="text-anchor:start">Closer to your birth than to today</text>
    <line x1="${PAD}" y1="${axisY}" x2="${W - PAD}" y2="${axisY}" class="axis"/>${dots(inside, after, dot)}${badges}${mk}</svg>
    <div class="bd-key">${key}</div>`;
}
let k = 0;
const dots = (inside, after, dot) => inside.map(dot).join('') + after.map(dot).join('');

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
  const u = new URL(location.href);
  if (tab === 'same') u.searchParams.delete('tab'); else u.searchParams.set('tab', tab);
  history.replaceState(null, '', u);
}

async function render() {
  showTab();
  $('#bd-example').hidden = !isExample;
  $('#bd-date').value = iso(birth);
  await Promise.all([renderSameDay(), renderAge()]);
  renderHalfway();
}

async function init() {
  events = (await getJSON('/data/birthdays/events.json')) || [];
  let saved = null;
  try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* storage off */ }
  if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) { birth = parseIso(saved); isExample = false; }
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
  $('#bd-date').max = iso(todayMs());
  $('#bd-date').addEventListener('change', (e) => {
    if (!e.target.value) return;
    birth = parseIso(e.target.value); isExample = false;
    try { localStorage.setItem(STORE_KEY, e.target.value); } catch (err) { /* storage off */ }
    render();
  });
  render();
}

init();
