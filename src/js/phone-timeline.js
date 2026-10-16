(function () {
const D = window.PT_DATA;
const $ = (s) => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const IMG = (id) => `/blog/img/phone-timeline/${id}.jpg`;
const MAKERS = ['Apple', 'Samsung', 'Google', 'Motorola', 'Microsoft', 'HTC'];
const ENDINGS = ['Upgraded', 'Switched', "Didn't like it", 'Returned', 'Gave away', 'Lost or stolen', 'Broke', 'New job', 'Stopgap or test', 'Not recorded'];
const SHORT = { 'Motorola Droid RAZR Maxx 4G': 'Droid RAZR Maxx', 'HTC Droid Incredible': 'Droid Incredible', 'Samsung Droid Charge': 'Droid Charge',
  'Samsung Galaxy S6 Edge': 'S6 Edge', 'Samsung Galaxy S7': 'S7', 'Samsung Galaxy S10e': 'S10e', 'Samsung Galaxy Z Flip 3': 'Z Flip 3',
  'Samsung Galaxy Z Flip 6': 'Z Flip 6', 'Samsung Galaxy Z Fold 6': 'Z Fold 6', 'Samsung Galaxy Z Fold 7': 'Z Fold 7', 'Samsung Galaxy Z Fold 8 Ultra': 'Z Fold 8 Ultra',
  'Google Pixel 3': 'Pixel 3', 'Google Pixel 7': 'Pixel 7', 'Motorola Razr+': 'Razr+', 'Microsoft Surface Duo': 'Surface Duo' };
const DAY = 864e5;
const pd = (s) => { const [m, d, y] = s.split('/').map(Number); return new Date(y, m - 1, d); };
const mdy = (d) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
const col = (m) => `var(--${m.toLowerCase()})`;
const TODAY = pd(D.snapshot);

const phones = D.phones.map(([name, use, maker, color, s, e, rating, reason, comment, img, ending]) => {
  const start = pd(s), end = e ? pd(e) : TODAY, days = Math.round((end - start) / DAY);
  return { name, short: SHORT[name] || name, use, maker, color, start, end, current: !e, rating, reason, comment, img, ending, days, trial: days < 30 };
});
const NEXT = { ...D.next, short: D.next.name, start: pd(D.next.start), preorder: true };
const FLIP = { start: pd(D.flipPersonal[0]), end: pd(D.flipPersonal[1]) };
const label = (p) => p.name === 'iPhone 13 Pro' ? `iPhone 13 Pro (${p.color}${p.use === 'Work' ? ', work' : ''})` : p.name;
const pic = (p) => `<img src="${IMG(p.img)}" alt="${label(p)} in ${p.color}" loading="lazy">`;

// ---------- tooltip ----------
const tip = $('#pt-tip');
function tipHTML(p) {
  if (p.preorder) return `<div class="ph">${pic(p)}</div><div class="body"><b>${p.name}</b><span class="m">${p.maker}, ${p.color}, ${p.use}</span><span>${p.note}</span></div>`;
  const r = '●'.repeat(p.rating) + '○'.repeat(3 - p.rating);
  return `<div class="ph">${pic(p)}</div><div class="body"><b>${label(p)}</b><span class="m">${p.maker}, ${p.color}, ${p.use}</span>
    <span class="d">${mdy(p.start)} to ${p.current ? 'now' : mdy(p.end)}</span><span class="d">${p.days.toLocaleString('en-US')} days, rating ${r}</span>
    <span>${p.reason}</span>${p.comment ? `<span class="m">${p.comment}</span>` : ''}</div>`;
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
  '<span><i class="pin"></i>Under 30 days</span><span><i class="dash"></i>Preordered</span>';

// ---------- timeline ----------
(function () {
  const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const W = 900, LEFT = 78, RIGHT = 74, BH = 20, GAP = 6;
  const X0 = new Date(2008, 0, 1), X1 = new Date(2027, 2, 1);
  const x = (d) => LEFT + (d - X0) / (X1 - X0) * (W - LEFT - RIGHT);
  const daily = phones.filter((p) => !p.trial), trials = phones.filter((p) => p.trial).sort((a, b) => a.start - b.start);

  // stack overlapping bars into sub-rows, then decide where each label fits
  function pack(list) {
    const rows = [];
    for (const p of [...list].sort((a, b) => a.start - b.start)) {
      const x1 = x(p.start), x2 = Math.max(x(p.end), x1 + 3);
      let r = rows.findIndex((end) => end - 1.5 <= x1); if (r < 0) { rows.push(0); r = rows.length - 1; }
      rows[r] = x2; p._row = r;
    }
    for (const p of list) {
      const x1 = x(p.start), x2 = Math.max(x(p.end), x1 + 3) + (p.current ? 7 : 0), lw = p.short.length * 6.4 + 12;
      if (p.preorder) { p._lab = 'out'; continue; }
      if (x2 - x1 > lw) { p._lab = 'in'; continue; }
      const next = list.filter((q) => q._row === p._row && q.start > p.start).sort((a, b) => a.start - b.start)[0];
      p._lab = ((next ? x(next.start) : W - 4) - x2) > lw ? 'out' : 'none';
    }
    return rows.length;
  }
  const tTop = 30, tH = 62, base = tTop + tH - 4;
  const lanes = {}; let y = tTop + tH + 14;
  for (const l of ['Personal', 'Work']) {
    const items = daily.filter((p) => p.use === l); if (l === 'Personal') items.push({ ...NEXT, end: X1 });
    lanes[l] = { y, items }; y += pack(items) * (BH + GAP) + 22;
  }
  const H = y + 14;
  const svg = $('#pt-chart');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  for (let yr = 2008; yr <= 2027; yr++) {
    const xx = x(new Date(yr, 0, 1)); el('line', { x1: xx, x2: xx, y1: tTop - 4, y2: H - 28, class: 'gridline' }, svg);
    if (yr % 2 === 0) { const t = el('text', { x: xx, y: H - 12, 'text-anchor': 'middle', class: 'axis' }, svg); t.textContent = yr; }
  }
  const nx = x(TODAY); el('line', { x1: nx, x2: nx, y1: tTop - 10, y2: H - 28, class: 'now' }, svg);
  const tt = el('text', { x: nx, y: tTop - 14, 'text-anchor': 'middle', class: 'axis' }, svg); tt.textContent = 'today';

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

  for (const l in lanes) {
    const { y: ly, items } = lanes[l];
    const t = el('text', { x: 0, y: ly + BH / 2 + 4, class: 'lane' }, svg); t.textContent = l;
    if (l === 'Personal') el('rect', { x: x(FLIP.start), y: ly, width: x(FLIP.end) - x(FLIP.start), height: BH, rx: 3, fill: 'var(--samsung)', 'fill-opacity': 0.3 }, svg);
    for (const p of items) {
      const yy = ly + p._row * (BH + GAP);
      const g = el('g', { class: 'mark', 'aria-label': label(p) }, svg);
      if (p.preorder) {
        const x1 = x(p.start), w = x(X1) - x1;
        el('rect', { x: x1 - 3, y: yy - 3, width: w + 76, height: BH + 6, fill: 'transparent' }, g);
        el('rect', { x: x1, y: yy + 0.75, width: w, height: BH - 1.5, rx: 3, fill: 'none', stroke: 'var(--apple)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, g);
        const t2 = el('text', { x: x1 + w + 5, y: yy + BH / 2 + 4, class: 'lbl' }, g); t2.textContent = p.name;
        bindTip(g, p); continue;
      }
      const x1 = x(p.start) + 1, w = Math.max(3, x(p.end) - 1 - x1);
      el('rect', { x: x1 - 3, y: yy - 3, width: w + 6, height: BH + 6, fill: 'transparent' }, g);
      el('rect', { x: x1, y: yy, width: w, height: BH, rx: 3, fill: col(p.maker) }, g);
      if (p.current) el('rect', { x: x1 + w, y: yy, width: 6, height: BH, rx: 2, fill: col(p.maker), 'fill-opacity': 0.35 }, g);
      if (p._lab !== 'none') {
        const t3 = el('text', { class: 'lbl', y: yy + BH / 2 + 4 }, g); t3.textContent = p.short;
        if (p._lab === 'in') { t3.setAttribute('x', x1 + 6); t3.style.fill = ['Google', 'Microsoft'].includes(p.maker) ? '#122014' : '#fff'; }
        else t3.setAttribute('x', x1 + w + (p.current ? 10 : 5));
      }
      bindTip(g, p);
    }
  }
  // on narrow screens the chart scrolls; open on the most recent years
  requestAnimationFrame(() => { const sc = $('#pt-scroll'); sc.scrollLeft = sc.scrollWidth; });
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
