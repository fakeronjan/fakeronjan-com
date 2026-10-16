(function () {
const D = window.PT_DATA;
const $ = (s) => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const IMG = (id) => `/blog/img/phone-timeline/${id}.jpg`;
const MAKERS = ['Apple', 'Samsung', 'Google', 'Motorola', 'Microsoft', 'HTC'];
const ENDINGS = ['Upgraded', 'Switched', "Didn't like it", 'Returned', 'Gave away', 'Lost or stolen', 'Broke', 'Changed jobs', 'Stopgap or test', 'Not recorded'];
const SHORT = { 'Motorola Droid RAZR Maxx 4G': 'Droid RAZR Maxx', 'HTC Droid Incredible': 'Droid Incredible', 'Samsung Droid Charge': 'Droid Charge',
  'Samsung Galaxy S6 Edge': 'S6 Edge', 'Samsung Galaxy S7': 'S7', 'Samsung Galaxy S10e': 'S10e', 'Samsung Galaxy Z Flip 3': 'Z Flip 3',
  'Samsung Galaxy Z Flip 6': 'Z Flip 6', 'Samsung Galaxy Z Fold 6': 'Z Fold 6', 'Samsung Galaxy Z Fold 7': 'Z Fold 7', 'Samsung Galaxy Z Fold 8 Ultra': 'Z Fold 8 Ultra',
  'Google Pixel 3': 'Pixel 3', 'Google Pixel 7': 'Pixel 7', 'Motorola Razr+': 'Razr+', 'Microsoft Surface Duo': 'Surface Duo' };
const DAY = 864e5;
const pd = (s) => { const [m, d, y] = s.split('/').map(Number); return new Date(y, m - 1, d); };
const mdy = (d) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
const col = (m) => `var(--${m.toLowerCase()})`;
const TODAY = pd(D.snapshot);

const phones = D.phones.map(([name, use, maker, color, s, e, rating, reason, comment, img, ending, paid, roles, note]) => {
  const start = pd(s), end = e ? pd(e) : TODAY, days = Math.round((end - start) / DAY);
  const segs = (roles || [[s, e, use === 'Work' ? 'W' : 'P']]).map(([a, b, r]) => ({ start: pd(a), end: b ? pd(b) : TODAY, r }));
  return { name, short: SHORT[name] || name, use, maker, color, start, end, current: !e, rating, reason, comment, img, ending, paid, segs, note, days, trial: days < 30 };
});
const NEXT = { ...D.next, short: D.next.name, start: pd(D.next.start), preorder: true };
const EMPLOYERS = D.employers.map(([n, a, b]) => ({ n, start: pd(a), end: b ? pd(b) : null }));
const label = (p) => p.name === 'iPhone 13 Pro' ? `iPhone 13 Pro (${p.color}${p.use === 'Work' ? ', work' : ''})` : p.name;
const pic = (p) => `<img src="${IMG(p.img)}" alt="${label(p)} in ${p.color}" loading="lazy">`;
const ROLE = { P: 'Personal', W: 'Work', PW: 'Personal and work' };
function roleLine(p) {
  const both = p.segs.filter((g) => g.r === 'PW');
  if (!both.length) return p.use;
  return both.map((g) => `Personal and work ${mdy(g.start)} to ${mdy(g.end)}`).join('<br>');
}

// ---------- tooltip ----------
const tip = $('#pt-tip');
function tipHTML(p) {
  if (p.preorder) return `<div class="ph">${pic(p)}</div><div class="body"><b>${p.name}</b><span class="m">${p.maker}, ${p.color}</span><span>${p.note}</span></div>`;
  const r = '●'.repeat(p.rating) + '○'.repeat(3 - p.rating);
  return `<div class="ph">${pic(p)}</div><div class="body"><b>${label(p)}</b><span class="m">${p.maker}, ${p.color}, ${p.paid ? `paid for by ${p.paid}` : 'bought'}</span>
    <span class="d">${mdy(p.start)} to ${p.current ? 'now' : mdy(p.end)}</span><span class="d">${p.days.toLocaleString('en-US')} days, rating ${r}</span>
    <span class="m">${roleLine(p)}</span>${p.note ? `<span class="m">${p.note}</span>` : ''}</div>`;
}
function place(x, y) {
  const w = tip.offsetWidth, h = tip.offsetHeight; let L = x + 14, T = y + 14;
  if (L + w > innerWidth - 8) L = Math.max(8, x - w - 14);
  if (T + h > innerHeight - 8) T = Math.max(8, y - h - 14);
  tip.style.left = L + 'px'; tip.style.top = T + 'px';
}
const show = (p, x, y) => { tip.innerHTML = tipHTML(p); tip.classList.add('on'); place(x, y); };
const hide = () => tip.classList.remove('on');
let pinned = null;
function bindTip(node, p) {
  node.setAttribute('tabindex', '0');
  node.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !pinned) show(p, e.clientX, e.clientY); });
  node.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pinned) hide(); });
  node.addEventListener('click', (e) => { e.stopPropagation(); pinned = pinned === node ? null : node; pinned ? show(p, e.clientX, e.clientY) : hide(); });
  node.addEventListener('focus', () => { const r = node.getBoundingClientRect(); show(p, r.right, r.top); });
  node.addEventListener('blur', () => { if (!pinned) hide(); });
}
document.addEventListener('click', () => { pinned = null; hide(); });
addEventListener('scroll', () => { if (!pinned) hide(); }, { passive: true });

// ---------- legend ----------
$('#pt-legend').innerHTML = MAKERS.map((m) => `<span><i style="background:${col(m)}"></i>${m}</span>`).join('') +
  '<span><i class="paid"></i>Paid for by employer</span><span><i class="pin"></i>Under 30 days</span><span><i class="dash"></i>Coming soon</span>';

// ---------- timeline ----------
(function () {
  const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const W = 900, LEFT = 78, RIGHT = 74, BH = 22, LG = 3;
  const X0 = new Date(2008, 0, 1), X1 = new Date(2027, 2, 1);
  const x = (d) => LEFT + (d - X0) / (X1 - X0) * (W - LEFT - RIGHT);
  const daily = phones.filter((p) => !p.trial), trials = phones.filter((p) => p.trial).sort((a, b) => a.start - b.start);
  const tTop = 30, tH = 62, base = tTop + tH - 4;
  const pY = base + 18, wY = pY + BH + LG, eY = wY + BH + 14, H = eY + 16 + 34;
  const band = { P: [pY, pY + BH], W: [wY, wY + BH], PW: [pY, wY + BH] };
  const svg = $('#pt-chart');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  // striped fill per maker for employer-paid phones
  const defs = el('defs', {}, svg);
  for (const m of MAKERS) {
    const pt = el('pattern', { id: `pt-paid-${m}`, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('rect', { width: 6, height: 6, fill: col(m) }, pt); el('rect', { width: 2.2, height: 6, fill: '#fff', opacity: 0.45 }, pt);
  }
  const fillOf = (p) => p.paid ? `url(#pt-paid-${p.maker})` : col(p.maker);

  for (let yr = 2008; yr <= 2027; yr++) {
    const xx = x(new Date(yr, 0, 1)); el('line', { x1: xx, x2: xx, y1: tTop - 4, y2: eY + 16, class: 'gridline' }, svg);
    if (yr % 2 === 0) { const t = el('text', { x: xx, y: H - 8, 'text-anchor': 'middle', class: 'axis' }, svg); t.textContent = yr; }
  }
  const nx = x(TODAY); el('line', { x1: nx, x2: nx, y1: tTop - 10, y2: eY + 16, class: 'now' }, svg);
  const tt = el('text', { x: nx, y: tTop - 14, 'text-anchor': 'middle', class: 'axis' }, svg); tt.textContent = 'today';

  // Tried row
  const t0 = el('text', { x: 0, y: base - 6, class: 'lane' }, svg); t0.textContent = 'Tried';
  el('line', { x1: LEFT, x2: W - RIGHT, y1: base, y2: base, stroke: 'var(--rule)' }, svg);
  const levels = [-Infinity, -Infinity, -Infinity];
  trials.forEach((p, i) => {
    const g = el('g', { class: 'mark', 'aria-label': label(p) }, svg); const cx = x(p.start), cy = base - 10;
    const text = `${p.short} (${p.days}d)`, lw = text.length * 6.3;
    const nextCx = trials[i + 1] ? x(trials[i + 1].start) : Infinity;
    let lv = (cx + 9 + lw > nextCx - 8 || cx - 4 <= levels[0]) ? 1 : 0; if (lv === 1 && cx - 4 <= levels[1]) lv = 2;
    levels[lv] = cx + 9 + lw; const ly = cy + 4 - lv * 16;
    el('rect', { x: cx - 9, y: ly - 14, width: lw + 20, height: base - ly + 16, fill: 'transparent' }, g);
    el('line', { x1: cx, x2: cx, y1: ly - 4, y2: base, stroke: col(p.maker), 'stroke-width': 1.5, 'stroke-opacity': 0.6 }, g);
    el('path', { d: `M${cx} ${cy - 6} L${cx + 6} ${cy} L${cx} ${cy + 6} L${cx - 6} ${cy} Z`, fill: col(p.maker), stroke: 'var(--panel)', 'stroke-width': 2 }, g);
    const tx = el('text', { x: cx + 9, y: ly, class: 'lbl' }, g); tx.textContent = text;
    bindTip(g, p);
  });

  // lane labels
  [['Personal', pY], ['Work', wY]].forEach(([l, y]) => { const t = el('text', { x: 0, y: y + BH / 2 + 4, class: 'lane' }, svg); t.textContent = l; });

  // one connected shape per run of touching segments: the top and bottom edges step between lanes as the role changes
  function shape(segs) {
    const L = segs.map((g) => ({ x1: x(g.start), x2: x(g.end), y1: band[g.r][0], y2: band[g.r][1] }));
    L[0].x1 += 1; L[L.length - 1].x2 = Math.max(L[L.length - 1].x2 - 1, L[0].x1 + 2);
    let d = `M${L[0].x1} ${L[0].y1}`;
    L.forEach((s, i) => { if (i) d += ` L${s.x1} ${s.y1}`; d += ` L${s.x2} ${s.y1}`; });
    for (let i = L.length - 1; i >= 0; i--) { d += ` L${L[i].x2} ${L[i].y2} L${L[i].x1} ${L[i].y2}`; }
    return d + ' Z';
  }
  for (const p of daily) {
    const g = el('g', { class: 'mark', 'aria-label': label(p) }, svg);
    // split into runs where one segment ends exactly where the next begins
    const runs = []; let cur = [];
    p.segs.forEach((s, i) => { if (i && s.start - p.segs[i - 1].end !== 0) { runs.push(cur); cur = []; } cur.push(s); });
    runs.push(cur);
    if (runs.length > 1) { // a phone set aside for a while: thin line joins its two stretches
      for (let i = 1; i < runs.length; i++) { const a = runs[i - 1].at(-1), b = runs[i][0], yy = (band[a.r][0] + band[a.r][1]) / 2;
        el('line', { x1: x(a.end), x2: x(b.start), y1: yy, y2: yy, stroke: col(p.maker), 'stroke-width': 2, 'stroke-dasharray': '2 3' }, g); }
    }
    const big = p.segs.reduce((a, b) => (x(b.end) - x(b.start)) > (x(a.end) - x(a.start)) ? b : a);
    const [by1, by2] = band[big.r];
    runs.forEach((r) => el('path', { d: shape(r), fill: fillOf(p), stroke: 'transparent', 'stroke-width': 4, 'stroke-linejoin': 'round' }, g));
    if (p.current) { const last = p.segs.at(-1), [y1, y2] = band[last.r]; el('rect', { x: x(last.end), y: y1, width: 6, height: y2 - y1, rx: 2, fill: col(p.maker), 'fill-opacity': 0.35 }, g); }
    // label the widest stretch if the name fits inside it
    const t = el('text', { x: x(big.start) + 6, y: (by1 + by2) / 2 + 4, class: 'lbl' }, g); t.textContent = p.short;
    t.style.fill = ['Google', 'Microsoft'].includes(p.maker) ? '#122014' : '#fff';
    if (t.getComputedTextLength() + 12 > x(big.end) - x(big.start)) t.remove();
    bindTip(g, p);
  }

  // what comes next, dashed
  const g = el('g', { class: 'mark', 'aria-label': NEXT.name }, svg);
  const nx1 = x(NEXT.start), nw = x(X1) - nx1;
  el('rect', { x: nx1 - 3, y: pY - 3, width: nw + 76, height: BH + 6, fill: 'transparent' }, g);
  el('rect', { x: nx1, y: pY + 0.75, width: nw, height: BH - 1.5, rx: 3, fill: 'none', stroke: 'var(--apple)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, g);
  const t2 = el('text', { x: nx1 + nw + 5, y: pY + BH / 2 + 4, class: 'lbl' }, g); t2.textContent = NEXT.name;
  bindTip(g, NEXT);

  // employers
  const te = el('text', { x: 0, y: eY + 12, class: 'lane' }, svg); te.textContent = 'Employer';
  for (const e of EMPLOYERS) {
    const s = e.start < X0 ? X0 : e.start, up = e.start > TODAY;
    const x1 = x(s) + 1, w = (e.end ? x(e.end) : x(X1)) - x1 - 1;
    el('rect', { x: x1, y: eY, width: w, height: 16, rx: 3, fill: up ? 'none' : 'var(--grid)', stroke: up ? 'var(--ink-3)' : 'var(--rule)', 'stroke-dasharray': up ? '3 2' : 'none' }, svg);
    const t = el('text', { x: up ? x1 + w + 5 : x1 + 6, y: eY + 12, class: 'emp' }, svg); t.textContent = e.n;
  }
  requestAnimationFrame(() => { const sc = $('#pt-scroll'); sc.scrollLeft = sc.scrollWidth; });
})();

// ---------- preferences ----------
(function () {
  // which phone was the personal phone each day: daily drivers first, short stints only to fill gaps
  const covers = (p, t) => p.segs.some((g) => (g.r === 'P' || g.r === 'PW') && g.start.getTime() <= t && t < g.end.getTime());
  const daily = phones.filter((p) => !p.trial), trials = phones.filter((p) => p.trial);
  const days = [];
  for (let t = phones[0].start.getTime(); t < TODAY.getTime(); t += DAY) {
    const pick = (list) => list.filter((p) => covers(p, t)).sort((a, b) => b.start - a.start)[0];
    days.push({ t, p: pick(daily) || pick(trials) || null });
  }
  const total = days.filter((d) => d.p).length;
  const FIN = D.finish, FORM = D.form;
  const attrs = [
    { key: 'OS', of: (p) => p.maker === 'Apple' ? 'iOS' : 'Android', color: (c) => c === 'iOS' ? 'var(--apple)' : 'var(--samsung)' },
    { key: 'Manufacturer', of: (p) => p.maker, color: (c) => col(c) },
    { key: 'Color', of: (p) => FIN[p.img][1], color: (c, p) => p ? FIN[p.img][0] : ({ 'Black': '#1c1c1e', 'Gray': '#54524f', 'White or cream': '#efede6', 'Blue': '#6f9fd0', 'Green': '#7d9a74', 'Silver or titanium': '#b9b8b3', 'Pink': '#f2dcd5', 'Purple': '#594f63' })[c] },
    { key: 'Form factor', of: (p) => FORM[p.img] || 'Slab', color: (c) => ({ Slab: 'var(--ink-3)', Flip: 'var(--motorola)', Fold: 'var(--apple)' })[c] },
    { key: 'Who paid', of: (p) => p.paid ? 'Employer' : 'Bought', color: (c) => c === 'Employer' ? 'var(--htc)' : 'var(--ink-3)' },
  ];
  const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const W = 900, LEFT = 78, RIGHT = 74, X0 = new Date(2008, 0, 1), X1 = new Date(2027, 2, 1);
  const x = (t) => LEFT + (t - X0) / (X1 - X0) * (W - LEFT - RIGHT);
  const body = $('#pt-prefs-body');
  const head = '<div class="cathead"><span></span><span></span><span></span><span>Days</span><span>Phones</span><span>Rating</span></div>';
  for (const a of attrs) {
    const sec = document.createElement('div'); sec.className = 'pref';
    sec.innerHTML = `<h3>${a.key}</h3><div class="strip"><svg viewBox="0 0 ${W} 34" role="img" aria-label="${a.key} of the personal phone over time"></svg></div>`;
    body.appendChild(sec);
    const svg = sec.querySelector('svg');
    for (let yr = 2008; yr <= 2027; yr++) { const xx = x(new Date(yr, 0, 1)); el('line', { x1: xx, x2: xx, y1: 0, y2: 18, class: 'gridline' }, svg);
      if (yr % 2 === 0) { const t = el('text', { x: xx, y: 31, 'text-anchor': 'middle', class: 'axis' }, svg); t.textContent = yr; } }
    // runs of consecutive days with the same phone
    let i = 0;
    while (i < days.length) {
      let j = i; while (j + 1 < days.length && days[j + 1].p === days[i].p) j++;
      const p = days[i].p;
      if (p) {
        const g = el('g', { class: 'mark' }, svg);
        el('rect', { x: x(days[i].t), y: 2, width: Math.max(1, x(days[j].t + DAY) - x(days[i].t)), height: 14, fill: a.color(a.of(p), a.key === 'Color' ? p : null) }, g);
        bindTip(g, p);
      }
      i = j + 1;
    }
    // breakdown: share of personal days, phone count, average rating
    const cats = {};
    for (const d of days) if (d.p) { const c = a.of(d.p); (cats[c] ||= { d: 0, n: 0, r: 0 }).d++; }
    for (const p of phones) { const c = a.of(p); const o = (cats[c] ||= { d: 0, n: 0, r: 0 }); o.n++; o.r += p.rating; }
    const rows = Object.entries(cats).sort((m, n) => n[1].d - m[1].d || n[1].n - m[1].n);
    const maxPct = Math.max(...rows.map(([, o]) => o.d)) / total;
    const half = Math.ceil(rows.length / 2);
    const cols = rows.length > 3 ? [rows.slice(0, half), rows.slice(half)] : [rows];
    const list = document.createElement('div'); list.className = 'cats';
    list.innerHTML = cols.map((cr) => `<div>${head}${cr.map(([c, o]) => {
      const pct = o.d / total;
      return `<div class="cat"><span class="sw" style="background:${a.color(c)}"></span><span class="nm">${c}</span>
        <span><span class="bar" style="display:block;width:${pct / maxPct * 100}%"></span></span><span class="v">${pct >= 0.995 ? '>99' : pct > 0 && pct < 0.005 ? '<1' : Math.round(pct * 100)}%</span>
        <span class="v dim">${o.n}</span><span class="v dim">${(o.r / o.n).toFixed(1)}</span></div>`;
    }).join('')}</div>`).join('');
    sec.appendChild(list);
  }
})();

// ---------- favorites ----------
(function () {
  const favs = phones.filter((p) => p.rating === 3).sort((a, b) => b.start - a.start);
  const B = $('#pt-favs-body');
  B.innerHTML = favs.map((p) => `<div class="fav" data-i="${phones.indexOf(p)}"><span class="ph">${pic(p)}</span><b>${label(p)}</b>
    <span class="d">${mdy(p.start)} to ${p.current ? 'now' : mdy(p.end)}, ${p.days.toLocaleString('en-US')} days</span></div>`).join('');
  B.querySelectorAll('[data-i]').forEach((n) => bindTip(n, phones[+n.dataset.i]));
})();

// ---------- longest held ----------
(function () {
  const daily = phones.filter((p) => !p.trial).sort((a, b) => b.days - a.days);
  const max = daily[0].days;
  const row = (p, i) => `<div class="rrow" data-i="${phones.indexOf(p)}"><span class="r">${i}</span><span class="ph">${pic(p)}</span><span class="n">${label(p)}</span>
    <span><span class="b" style="display:block;width:${Math.max(1, p.days / max * 100)}%;background:${col(p.maker)}"></span></span><span class="d">${p.days.toLocaleString('en-US')} days</span></div>`;
  $('#pt-rank').innerHTML = daily.map((p, i) => row(p, i + 1)).join('');
  $('#pt-tried').innerHTML = phones.filter((p) => p.trial).sort((a, b) => b.days - a.days).map((p) => row(p, '')).join('');
  document.querySelectorAll('.pt .rrow').forEach((n) => bindTip(n, phones[+n.dataset.i]));
})();

// ---------- how each phone ended ----------
(function () {
  const done = phones.filter((p) => !p.current);
  const groups = ENDINGS.map((e) => ({ e, list: done.filter((p) => p.ending === e).sort((a, b) => b.start - a.start) })).filter((g) => g.list.length);
  groups.sort((a, b) => (a.e === 'Not recorded') - (b.e === 'Not recorded') || b.list.length - a.list.length);
  const E = $('#pt-ends');
  E.innerHTML = groups.map((g) => `<div class="end"><div class="h"><b>${g.e}</b><span>${g.list.length}</span></div>
    <div class="phs">${g.list.map((p) => `<span class="ph" data-i="${phones.indexOf(p)}">${pic(p)}</span>`).join('')}</div></div>`).join('');
  E.querySelectorAll('[data-i]').forEach((n) => bindTip(n, phones[+n.dataset.i]));
})();
})();
