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
  const row = (p) => `<li><span class="bd-year">${p.y < 0 ? `${-p.y} BC` : p.y}</span><span class="bd-who">${wikiLink(p.t, p.n)}<span class="bd-desc">${esc(p.d)}${p.x ? ` (died ${p.x})` : ''}</span></span></li>`;
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
  const row = (p) => `<li><span class="bd-gap${p.gap === 0 ? ' same' : ''}">${dayGap(p.gap)}</span><span class="bd-who">${wikiLink(p.t, p.n)}<span class="bd-desc">${esc(p.d)}${group === 'all' ? ` <span class="bd-tag">${p.g.map(g => label[g]).join(', ')}</span>` : ''}</span></span><span class="bd-born">${fmtDate(parseIso(p.b))}</span></li>`;
  const list = $('#bd-age');
  list.innerHTML = shown.length ? top.map(row).join('') : '<li class="bd-none">Nobody in this group was born within a month of you</li>';
  const more = $('#bd-age-more');
  more.hidden = shown.length <= AGE_SHOWN;
  more.textContent = `Show all ${shown.length}`;
  more.onclick = () => { list.innerHTML = shown.map(row).join(''); more.hidden = true; };
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
  if (birth >= today) { head.innerHTML = '<p>Pick a birthday in the past to see this</p>'; $('#bd-events').innerHTML = ''; return; }
  const first = inside[0];
  head.innerHTML = `
    ${first ? `<p class="bd-kicker">You were born closer to this than to today</p><p class="bd-headline">${wikiLink(first.wiki, first.label)}<span class="bd-hdate">${fmtDate(parseIso(first.date))}</span></p>` : ''}
    <p>Today is ${Math.round(age / DAY).toLocaleString('en-US')} days (${plural(yearsBetween(birth, today), 'year')}) after your birth. The same distance before your birth lands on <strong>${fmtDate(mirror)}</strong>, so anything after that date happened closer to your birth than to today.</p>
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

async function render() {
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
