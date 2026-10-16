(function () {
const D = window.PT_DATA;
const $ = (s) => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const IMG = (id) => `/blog/img/phone-timeline/${id}.jpg`;
const MAKERS = ['Apple', 'Samsung', 'Google', 'Motorola', 'Microsoft', 'HTC'];
const SHORT = { 'Motorola Droid RAZR Maxx 4G': 'Droid RAZR Maxx', 'HTC Droid Incredible': 'Droid Incredible', 'Samsung Droid Charge': 'Droid Charge',
  'Samsung Galaxy S6 Edge': 'Galaxy S6 Edge', 'Samsung Galaxy S7': 'Galaxy S7', 'Samsung Galaxy S10e': 'Galaxy S10e', 'Samsung Galaxy Z Flip 3': 'Galaxy Z Flip 3',
  'Samsung Galaxy Z Flip 6': 'Galaxy Z Flip 6', 'Samsung Galaxy Z Fold 6': 'Galaxy Z Fold 6', 'Samsung Galaxy Z Fold 7': 'Galaxy Z Fold 7', 'Samsung Galaxy Z Fold 8 Ultra': 'Galaxy Z Fold 8 Ultra',
  'Google Pixel 3': 'Pixel 3', 'Google Pixel 7': 'Pixel 7', 'Motorola Razr+': 'Razr+', 'Microsoft Surface Duo': 'Surface Duo' };
const DAY = 864e5;
const pd = (s) => { const [m, d, y] = s.split('/').map(Number); return new Date(y, m - 1, d); };
const my = (d) => `${d.getMonth() + 1}/${d.getFullYear()}`;
const span = (p) => `${my(p.start)}–${p.current ? 'now' : my(p.end)} (${p.days.toLocaleString('en-US')} days)`;
const col = (m) => `var(--${m.toLowerCase()})`;
const TODAY = pd(D.snapshot);

const phones = D.phones.map(([name, use, maker, color, s, e, rating, reason, comment, img, ending, paid, roles, note]) => {
  const start = pd(s), end = e ? pd(e) : TODAY, days = Math.round((end - start) / DAY);
  const segs = (roles || [[s, e, use === 'Work' ? 'W' : 'P']]).map(([a, b, r]) => ({ start: pd(a), end: b ? pd(b) : TODAY, r }));
  return { name, short: SHORT[name] || name, use, maker, color, start, end, current: !e, rating, reason, comment, img, ending, paid, segs, note, days, trial: days < 30 };
});
// stories ordered by when each one first happened
const STORY_ORDER = [...D.storyOrder].sort((a, b) => Math.min(...D.stories.filter((r) => r[0] === a).map((r) => pd(D.phones[r[1]][4]))) - Math.min(...D.stories.filter((r) => r[0] === b).map((r) => pd(D.phones[r[1]][4]))));
const NEXT = { ...D.next, short: D.next.name, start: pd(D.next.start), preorder: true };
const EMPLOYERS = D.employers.map(([n, a, b]) => ({ n, start: pd(a), end: b ? pd(b) : null }));
const label = (p) => p.name === 'iPhone 13 Pro' ? `iPhone 13 Pro (${p.color}${p.use === 'Work' ? ', work' : ''})` : p.name;
const pic = (p) => `<img src="${IMG(p.img)}" alt="${label(p)} in ${p.color}" loading="lazy">`;
const ROLE = { P: 'Personal', W: 'Work', PW: 'Personal and work' };
function roleLine(p) {
  const both = p.segs.filter((g) => g.r === 'PW');
  if (!both.length) return p.use;
  return both.map((g) => `Personal and work ${my(g.start)}–${my(g.end)}`).join('<br>');
}

// ---------- tooltip ----------
const tip = $('#pt-tip');
function tipHTML(p) {
  if (p.preorder) return `<div class="ph">${pic(p)}</div><div class="body"><b>${p.name}</b><span class="m">${p.maker}, ${p.color}</span><span>${p.note}</span></div>`;
  return `<div class="ph">${pic(p)}</div><div class="body"><b>${label(p)}</b><span class="m">${p.maker}, ${p.color}, ${p.paid ? `paid for by ${p.paid}` : 'bought'}</span>
    <span class="d">${span(p)}</span>
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
// waits for fonts so label widths are measured with the real face
(document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
  const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const W = 960, LEFT = 78, RIGHT = 134, BH = 34, LG = 8, TIER = 15;
  const X0 = new Date(2008, 0, 1), X1 = new Date(2027, 2, 1);
  const x = (d) => LEFT + (d - X0) / (X1 - X0) * (W - LEFT - RIGHT);
  const daily = phones.filter((p) => !p.trial), trials = phones.filter((p) => p.trial).sort((a, b) => a.start - b.start);
  const svg = $('#pt-chart');
  const measure = (() => { const t = el('text', { class: 'lbl', x: -999, y: -999 }, svg); return (s) => { t.textContent = s; return t.getComputedTextLength(); }; })();

  // ---- shapes, in lane-relative coordinates (Personal lane top = 0) ----
  // Layers: when several phones share a lane at once, the lane splits into stacked slots for that stretch.
  // Each phone is one connected shape whose top and bottom edges step as its role or slot changes.
  const LANES = { P: ['P'], W: ['W'], PW: ['P', 'W'] };
  const laneTop = { P: 0, W: BH + LG };
  // trim overlaps of a few days (a handoff, not two phones in use) so they don't split a lane
  const bySlot = { P: [], W: [] };
  for (const p of daily) for (const g of p.segs) for (const l of LANES[g.r]) bySlot[l].push({ p, g });
  for (const l in bySlot) {
    const L = bySlot[l].sort((a, b) => a.g.start - b.g.start);
    for (let i = 1; i < L.length; i++) { const prev = L[i - 1].g, cur = L[i].g;
      if (prev.end > cur.start && (prev.end - cur.start) / DAY <= 3 && prev.end <= cur.end) prev.end = cur.start; }
  }
  const active = (l, t) => bySlot[l].filter(({ g }) => g.start.getTime() <= t && t < g.end.getTime()).map(({ p }) => p).sort((a, b) => a.start - b.start);
  const cuts = [...new Set(daily.flatMap((p) => p.segs.flatMap((g) => [g.start.getTime(), g.end.getTime()])))].sort((a, b) => a - b);
  function pieces(p) {
    const out = [];
    for (const g of p.segs) {
      const pts = [g.start.getTime(), ...cuts.filter((t) => t > g.start.getTime() && t < g.end.getTime()), g.end.getTime()];
      for (let i = 0; i < pts.length - 1; i++) {
        const ys = LANES[g.r].map((l) => { const A = active(l, pts[i]), k = Math.max(1, A.length), j = Math.max(0, A.indexOf(p));
          return [laneTop[l] + j * BH / k, laneTop[l] + (j + 1) * BH / k]; });
        const y1 = ys[0][0], y2 = ys.at(-1)[1], last = out.at(-1);
        if (last && last.end === pts[i] && last.y1 === y1 && last.y2 === y2) last.end = pts[i + 1];
        else out.push({ start: pts[i], end: pts[i + 1], y1, y2 });
      }
    }
    return out;
  }

  // ---- labels: inside the bar when the name fits, otherwise a callout on a leader line ----
  const items = daily.map((p) => {
    const pcs = pieces(p);
    const score = (s) => (x(s.end) - x(s.start)) * Math.min(1, (s.y2 - s.y1) / BH);
    const big = pcs.reduce((a, b) => score(b) > score(a) ? b : a);
    const w = measure(p.short);
    const inside = w + 14 <= x(big.end) - x(big.start) && big.y2 - big.y1 >= 15;
    return { p, pcs, big, w, inside, side: p.use === 'Work' ? 'bottom' : 'top' };
  });
  const tiers = { top: [], bottom: [] };
  for (const side of ['top', 'bottom']) {
    // Labels run right from their leader. Placing right to left, a label sits one tier above every leader it covers,
    // so leaders never cross a label (a staircase that steps down toward the newer phones).
    const outs = items.filter((it) => !it.inside && it.side === side);
    for (const it of outs) {
      const s = it.big; it.ax = Math.max(x(s.start) + 1.5, Math.min(x(s.end) - 1.5, (x(s.start) + x(s.end)) / 2));
      const right = it.ax + 4 + it.w <= W - 2;
      it.x1 = right ? it.ax + 4 : it.ax - 4 - it.w; it.x2 = it.x1 + it.w; it.anchor = right ? 'start' : 'end';
    }
    outs.sort((a, b) => b.ax - a.ax);
    const placed = [];
    for (const it of outs) {
      // above every leader my label covers, and below every label my leader would pass through
      const lower = Math.max(0, ...placed.filter((o) => it.x1 - 3 <= o.ax && o.ax <= it.x2 + 3).map((o) => o.k + 1));
      const upper = Math.min(Infinity, ...placed.filter((o) => o.x1 - 3 <= it.ax && it.ax <= o.x2 + 3).map((o) => o.k));
      const free = (k) => !placed.some((o) => o.k === k && it.x1 - 8 < o.x2 && o.x1 < it.x2 + 8);
      let k = lower;
      while (k < upper && !free(k)) k++;
      if (k >= upper) { k = lower; while (!free(k)) k++; } // no clean slot: accept a crossing rather than overlap
      it.k = k; placed.push(it);
    }
    tiers[side] = placed;
  }
  const nTop = Math.max(0, ...tiers.top.map((i) => i.k + 1)), nBot = Math.max(0, ...tiers.bottom.map((i) => i.k + 1));

  // ---- vertical layout ----
  const tTop = 30, tH = 70, base = tTop + tH - 4;
  const pY = base + 16 + nTop * TIER + (nTop ? 6 : 0), wY = pY + BH + LG;
  const botEdge = wY + BH, eY = botEdge + 12 + nBot * TIER + (nBot ? 4 : 0), H = eY + 16 + 34;
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
    const text = `${p.short} (${p.days}d)`, lw = measure(text);
    const nextCx = trials[i + 1] ? x(trials[i + 1].start) : Infinity;
    let lv = (cx + 9 + lw > nextCx - 8 || cx - 4 <= levels[0]) ? 1 : 0; if (lv === 1 && cx - 4 <= levels[1]) lv = 2;
    levels[lv] = cx + 9 + lw; const ly = cy + 4 - lv * 16;
    el('rect', { x: cx - 9, y: ly - 14, width: lw + 20, height: base - ly + 16, fill: 'transparent' }, g);
    el('line', { x1: cx, x2: cx, y1: ly - 4, y2: base, stroke: col(p.maker), 'stroke-width': 1.5, 'stroke-opacity': 0.6 }, g);
    el('path', { d: `M${cx} ${cy - 6} L${cx + 6} ${cy} L${cx} ${cy + 6} L${cx - 6} ${cy} Z`, fill: col(p.maker), stroke: 'var(--panel)', 'stroke-width': 2 }, g);
    const tx = el('text', { x: cx + 9, y: ly, class: 'lbl' }, g); tx.textContent = text;
    bindTip(g, p);
  });

  [['Personal', pY], ['Work', wY]].forEach(([l, y]) => { const t = el('text', { x: 0, y: y + BH / 2 + 4, class: 'lane' }, svg); t.textContent = l; });

  function shape(L) {
    L = L.map((s) => ({ x1: x(s.start), x2: x(s.end), y1: pY + s.y1 + (s.y2 - s.y1 < BH ? 1 : 0), y2: pY + s.y2 - (s.y2 - s.y1 < BH ? 1 : 0) }));
    L[0].x1 += 1; L[L.length - 1].x2 = Math.max(L[L.length - 1].x2 - 1, L[0].x1 + 2);
    let d = `M${L[0].x1} ${L[0].y1}`;
    L.forEach((s, i) => { if (i) d += ` L${s.x1} ${s.y1}`; d += ` L${s.x2} ${s.y1}`; });
    for (let i = L.length - 1; i >= 0; i--) d += ` L${L[i].x2} ${L[i].y2} L${L[i].x1} ${L[i].y2}`;
    return d + ' Z';
  }
  for (const it of items) {
    const { p, pcs, big } = it;
    const g = el('g', { class: 'mark', 'aria-label': label(p) }, svg);
    const runs = []; let cur = [];
    pcs.forEach((s, i) => { if (i && s.start !== pcs[i - 1].end) { runs.push(cur); cur = []; } cur.push(s); });
    runs.push(cur);
    runs.forEach((r) => el('path', { d: shape(r), fill: fillOf(p), stroke: 'transparent', 'stroke-width': 4, 'stroke-linejoin': 'round' }, g));
    if (p.current) { const last = pcs.at(-1); el('rect', { x: x(last.end), y: pY + last.y1, width: 6, height: last.y2 - last.y1, rx: 2, fill: col(p.maker), 'fill-opacity': 0.35 }, g); }
    if (it.inside) {
      const t = el('text', { x: x(big.start) + 7, y: pY + (big.y1 + big.y2) / 2 + 4, class: 'lbl' }, g); t.textContent = p.short;
      t.style.fill = ['Google', 'Microsoft'].includes(p.maker) ? '#122014' : '#fff';
    } else {
      const top = it.side === 'top';
      const ly = top ? pY - 8 - it.k * TIER : botEdge + 16 + it.k * TIER;
      const edge = top ? pY + big.y1 : pY + big.y2;
      el('line', { x1: it.ax, x2: it.ax, y1: top ? ly + 3 : ly - 10, y2: edge, stroke: 'var(--ink-3)', 'stroke-width': 1 }, g);
      el('rect', { x: it.x1 - 2, y: ly - 11, width: it.w + 4, height: 14, fill: 'transparent' }, g);
      const t = el('text', { x: it.anchor === 'start' ? it.x1 : it.x2, y: ly, 'text-anchor': it.anchor, class: 'lbl callout' }, g); t.textContent = p.short;
    }
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
});

// ---------- preferences ----------
(function () {
  // which phone covered each lane each day: daily drivers first, short stints only to fill personal gaps
  const covers = (p, t, l) => p.segs.some((g) => (g.r === l || g.r === 'PW') && g.start.getTime() <= t && t < g.end.getTime());
  const daily = phones.filter((p) => !p.trial), trials = phones.filter((p) => p.trial);
  const days = [];
  for (let t = phones[0].start.getTime(); t < TODAY.getTime(); t += DAY) {
    const pick = (list, l) => list.filter((p) => covers(p, t, l)).sort((a, b) => b.start - a.start)[0];
    days.push({ t, P: pick(daily, 'P') || pick(trials, 'P') || null, W: pick(daily, 'W') || null });
  }
  // a phone covering both lanes on a day counts once, in the lane it was bought for
  for (const d of days) d.both = d.P && d.P === d.W;
  const lanesOf = (d) => d.both ? [d.P.use === 'Work' ? 'W' : 'P'] : ['P', 'W'].filter((l) => d[l]);
  const totals = { P: 0, W: 0 };
  for (const d of days) for (const l of lanesOf(d)) totals[l]++;
  const FIN = D.finish, FORM = D.form;
  const attrs = [
    { key: 'OS', of: (p) => p.maker === 'Apple' ? 'iOS' : 'Android', color: (c) => c === 'iOS' ? 'var(--apple)' : 'var(--samsung)' },
    { key: 'Manufacturer', of: (p) => p.maker, color: (c) => col(c) },
    { key: 'Color', of: (p) => FIN[p.img][1], color: (c, p) => p ? FIN[p.img][0] : ({ 'Black': '#1c1c1e', 'Gray': '#54524f', 'White or cream': '#efede6', 'Blue': '#6f9fd0', 'Green': '#7d9a74', 'Silver or titanium': '#b9b8b3', 'Pink': '#f2dcd5', 'Purple': '#594f63' })[c] },
    { key: 'Form factor', of: (p) => FORM[p.img] || 'Slab', color: (c) => ({ Slab: 'var(--ink-3)', Flip: 'var(--motorola)', Fold: 'var(--apple)' })[c] },
    { key: 'Who paid', of: (p) => p.paid ? 'Employer' : 'Bought', color: (c) => c === 'Employer' ? 'var(--htc)' : 'var(--ink-3)' },
  ];
  const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const W = 960, LEFT = 78, RIGHT = 134, X0 = new Date(2008, 0, 1), X1 = new Date(2027, 2, 1), SH = 12, SG = 3;
  const x = (t) => LEFT + (t - X0) / (X1 - X0) * (W - LEFT - RIGHT);
  const pct = (n, d) => { const v = d ? n / d : 0; return v === 0 ? '-' : v >= 0.995 && v < 1 ? '>99%' : v < 0.005 ? '<1%' : Math.round(v * 100) + '%'; };
  const body = $('#pt-prefs-body');
  const head = '<div class="cathead"><span></span><span></span><span>Personal</span><span>Work</span><span>Phones</span></div>';
  for (const a of attrs) {
    const sec = document.createElement('div'); sec.className = 'pref';
    const H = SH * 2 + SG + 18;
    sec.innerHTML = `<h3>${a.key}</h3><div class="strip"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${a.key} of the personal and work phones over time"></svg></div>`;
    body.appendChild(sec);
    const svg = sec.querySelector('svg');
    for (let yr = 2008; yr <= 2027; yr++) { const xx = x(new Date(yr, 0, 1)); el('line', { x1: xx, x2: xx, y1: 0, y2: SH * 2 + SG + 2, class: 'gridline' }, svg);
      if (yr % 2 === 0) { const t = el('text', { x: xx, y: H - 2, 'text-anchor': 'middle', class: 'axis' }, svg); t.textContent = yr; } }
    [['Personal', 0], ['Work', SH + SG]].forEach(([name, y0]) => { const t = el('text', { x: 0, y: y0 + SH - 2, class: 'lane' }, svg); t.textContent = name; });
    // runs of consecutive days with the same personal and work phones; a phone covering both shows only in the lane it was bought for
    const fillFor = (p) => ({ fill: a.color(a.of(p), a.key === 'Color' ? p : null), ...(a.key === 'Color' ? { stroke: 'var(--rule)', 'stroke-width': 0.75 } : {}) });
    let i = 0;
    while (i < days.length) {
      let j = i; while (j + 1 < days.length && days[j + 1].P === days[i].P && days[j + 1].W === days[i].W) j++;
      const d = days[i], x1 = x(d.t), w = Math.max(1, x(days[j].t + DAY) - x1);
      const blocks = lanesOf(d).map((l) => [d[l], l === 'P' ? 0 : SH + SG, SH]);
      for (const [p, y0, h] of blocks) { const g = el('g', { class: 'mark' }, svg); el('rect', { x: x1, y: y0, width: w, height: h, ...fillFor(p) }, g); bindTip(g, p); }
      i = j + 1;
    }
    // breakdown: share of personal days, share of work days, phone count
    const cats = {};
    const get = (c) => (cats[c] ||= { P: 0, W: 0, n: 0 });
    for (const d of days) for (const l of lanesOf(d)) get(a.of(d[l]))[l]++;
    for (const p of phones) get(a.of(p)).n++;
    const rows = Object.entries(cats).sort((m, n) => (n[1].P + n[1].W) - (m[1].P + m[1].W) || n[1].n - m[1].n);
    const half = Math.ceil(rows.length / 2);
    const cols = rows.length > 3 ? [rows.slice(0, half), rows.slice(half)] : [rows];
    const list = document.createElement('div'); list.className = 'cats';
    list.innerHTML = cols.map((cr) => `<div>${head}${cr.map(([c, o]) => `<div class="cat"><span class="sw" style="background:${a.color(c)}"></span><span class="nm">${c}</span>
        <span class="v">${pct(o.P, totals.P)}</span><span class="v">${pct(o.W, totals.W)}</span>
        <span class="v dim">${o.n}</span></div>`).join('')}</div>`).join('');
    sec.appendChild(list);
  }
})();

// ---------- hall of fame ----------
(function () {
  const favs = D.hallOfFame.map((i) => phones[i]).sort((a, b) => a.start - b.start);
  const B = $('#pt-favs-body');
  B.innerHTML = favs.map((p) => `<div class="fav" data-i="${phones.indexOf(p)}"><span class="ph">${pic(p)}</span><b>${label(p)}</b>
    <span class="d">${span(p)}</span></div>`).join('');
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

// ---------- stories timeline ----------
(document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
  const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const COLOR = { 'Next phone up': 'var(--s-next)', 'Greener grass': 'var(--s-grass)', 'Flipped out': 'var(--s-flip)', 'Loved and Lost': 'var(--s-loved)',
    "Don't let the door hit you": 'var(--s-door)', 'Return to sender': 'var(--s-return)', 'Company phone': 'var(--s-company)', 'Pinch hitter': 'var(--s-other)', 'Pre-market test': 'var(--s-other)' };
  const W = 960, LEFT = 190, RIGHT = 134, BAR = 12, TIER = 14, X0 = new Date(2008, 0, 1), X1 = new Date(2027, 2, 1);
  const x = (d) => LEFT + (d - X0) / (X1 - X0) * (W - LEFT - RIGHT);
  const svg = $('#pt-story-chart');
  const measure = (() => { const t = el('text', { class: 'lbl', x: -999, y: -999 }, svg); return (str) => { t.textContent = str; return t.getComputedTextLength(); }; })();
  // per story row: names sit above the bars, staircased right to left so no leader crosses a name
  const rows = STORY_ORDER.map((st) => {
    const items = D.stories.filter((r) => r[0] === st).map((r) => phones[r[1]]).sort((a, b) => a.start - b.start)
      .map((p) => { const name = p.name === 'iPhone 13 Pro' ? label(p) : p.short; const x1 = x(p.start) + 1, x2 = Math.max(x(p.end) - 1, x1 + 3), w = measure(name); return { p, name, x1, x2, w, ax: x1 + 1.5 }; });
    const placed = [];
    for (const it of [...items].sort((a, b) => b.ax - a.ax)) {
      const right = it.ax + 3 + it.w <= W - 2;
      it.l1 = right ? it.ax + 3 : it.ax - 3 - it.w; it.l2 = it.l1 + it.w; it.anchor = right ? 'start' : 'end';
      const lower = Math.max(0, ...placed.filter((o) => it.l1 - 3 <= o.ax && o.ax <= it.l2 + 3).map((o) => o.k + 1));
      const upper = Math.min(Infinity, ...placed.filter((o) => o.l1 - 3 <= it.ax && it.ax <= o.l2 + 3).map((o) => o.k));
      const free = (k) => !placed.some((o) => o.k === k && it.l1 - 8 < o.l2 && o.l1 < it.l2 + 8);
      let k = lower; while (k < upper && !free(k)) k++;
      if (k >= upper) { k = lower; while (!free(k)) k++; }
      it.k = k; placed.push(it);
    }
    const tiers = Math.max(1, ...items.map((i) => i.k + 1));
    return { st, items, h: tiers * TIER + BAR + 14 };
  });
  const H = rows.reduce((a, r) => a + r.h, 0) + 30;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  for (let yr = 2008; yr <= 2027; yr++) {
    const xx = x(new Date(yr, 0, 1)); el('line', { x1: xx, x2: xx, y1: 0, y2: H - 26, class: 'gridline' }, svg);
    if (yr % 2 === 0) { const t = el('text', { x: xx, y: H - 10, 'text-anchor': 'middle', class: 'axis' }, svg); t.textContent = yr; }
  }
  let y = 0;
  for (const r of rows) {
    const barY = y + r.h - BAR - 7;
    const t = el('text', { x: 0, y: barY + BAR - 1, class: 'srow' }, svg); t.textContent = r.st;
    el('line', { x1: 0, x2: W - RIGHT, y1: y + r.h, y2: y + r.h, stroke: 'var(--rule)' }, svg);
    for (const it of r.items) {
      const { p } = it, cur = r.st === 'Current';
      const g = el('g', { class: 'mark', 'aria-label': label(p) }, svg);
      el('rect', { x: it.x1, y: barY, width: it.x2 - it.x1, height: BAR, rx: 3, fill: cur ? 'none' : COLOR[r.st], stroke: cur ? 'var(--ink-3)' : 'none', 'stroke-dasharray': '3 2' }, g);
      const ly = barY - 6 - it.k * TIER;
      el('line', { x1: it.ax, x2: it.ax, y1: ly + 3, y2: barY, stroke: 'var(--ink-3)', 'stroke-width': 1 }, g);
      el('rect', { x: it.l1 - 2, y: ly - 11, width: it.w + 4, height: 14, fill: 'transparent' }, g);
      const tx = el('text', { x: it.anchor === 'start' ? it.l1 : it.l2, y: ly, 'text-anchor': it.anchor, class: 'lbl callout' }, g); tx.textContent = it.name;
      bindTip(g, p);
    }
    y += r.h;
  }
  requestAnimationFrame(() => { const sc = $('#pt-story-scroll'); sc.scrollLeft = sc.scrollWidth; });
});

// ---------- stories ----------
(function () {
  const B = $('#pt-stories-body');
  const pidx = (i) => i === 'next' ? NEXT : D.phones[i] ? phones[i] : null;
  const shortName = (p) => p.preorder ? p.name : label(p);
  const cell = (p) => `<span class="ph" data-k="${p.preorder ? 'next' : phones.indexOf(p)}">${pic(p)}</span>`;
  for (const name of STORY_ORDER) {
    const list = D.stories.filter((r) => r[0] === name).map(([, f, t, detail]) => ({ from: pidx(f), to: t === null ? null : pidx(t), detail }))
      .sort((a, b) => a.from.start - b.from.start);
    if (!list.length) continue;
    const sec = document.createElement('div'); sec.className = 'panel story';
    sec.innerHTML = `<h3>${name}</h3><div class="cards">${list.map(({ from, to, detail }) => {
      const f = from;
      const when = span(f);
      return `<div class="scard">
        <div class="pair${to ? '' : ' solo'}">${cell(f)}${to ? `<span class="arrow" aria-label="then">→</span>${cell(to)}` : ''}</div>
        <div class="names${to ? '' : ' solo'}"><span>${shortName(f)}</span>${to ? `<span>→</span><span>${shortName(to)}</span>` : ''}</div>
        <span class="d">${when}</span>${detail ? `<span class="x">${detail}</span>` : ''}</div>`;
    }).join('')}</div>`;
    B.appendChild(sec);
  }
  B.querySelectorAll('[data-k]').forEach((n) => bindTip(n, n.dataset.k === 'next' ? NEXT : phones[+n.dataset.k]));
})();
})();
