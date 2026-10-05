(function () {
const D = window.MU_DATA;
const PFP = { first: '/blog/img/meta-unraveled/first-profile-picture.jpg', last: '/blog/img/meta-unraveled/last-profile-picture.jpg' };
const $ = (s) => document.querySelector(s);
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const NS = 'http://www.w3.org/2000/svg';
const SERIES = [
  { k: 'fb_post', label: 'Facebook posts', c: 'var(--s1)' },
  { k: 'ig_feed', label: 'Instagram posts', c: 'var(--s2)' },
  { k: 'ig_story', label: 'Instagram stories', c: 'var(--s3)' },
  { k: 'ig_reel', label: 'Instagram reels and IGTV', c: 'var(--s4)' },
  { k: 'threads', label: 'Threads posts', c: 'var(--s5)' },
];
const YEARS = []; for (let y = 2008; y <= 2026; y++) YEARS.push(String(y));
const mY = (iso) => { const [y, m] = iso.split('-').map(Number); return `${m}/${y}`; };
const DELETED_TODAY = new Set(['FB2', 'IG4', 'TH']), TODAY = '2026-10-05';
const ACCT = { FB1: ['Facebook', '#1'], FB2: ['Facebook', '#2'], IG1: ['Instagram', '#1'], IG2: ['Instagram', '#2'], IG3: ['Instagram', '#3'], IG4: ['Instagram', '#4'], TH: ['Threads', ''] };
const acctEnd = (a) => DELETED_TODAY.has(a) ? TODAY : D.accounts[a].last;
const acctLabel = (a) => { const [p, n] = ACCT[a], A = D.accounts[a]; return `${p}${n ? ' ' + n : ''} (${mY(A.joined)}–${mY(acctEnd(a))})`; };
const mdY = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${m}/${d}/${y}`; };
function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
function niceMax(v, ticks = 4) {
  const raw = v / ticks, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [0.5, 1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => Math.ceil(v / s - 1e-9) <= ticks + 1);
  return { max: step * Math.ceil(v / step - 1e-9), step };
}
const tip = $('#tip');
function showTip(evt, html) {
  tip.innerHTML = html; tip.style.opacity = 1;
  const pad = 14, r = tip.getBoundingClientRect();
  let x = evt.clientX + pad, y = evt.clientY + pad;
  if (x + r.width > innerWidth - 8) x = evt.clientX - r.width - pad;
  if (y + r.height > innerHeight - 8) y = evt.clientY - r.height - pad;
  tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
}
function hideTip() { tip.style.opacity = 0; }
function bindTip(node, fn) { node.addEventListener('pointermove', (e) => showTip(e, fn())); node.addEventListener('pointerleave', hideTip); }
const row = (c, label, v) => `<div class="row"><span>${c ? `<i style="background:${c}"></i>` : ''}${label}</span><span>${v}</span></div>`;
function yGrid(svg, x0, x1, y0, h, max, step, fmtFn = fmt) {
  for (let v = 0; v <= max + 1e-9; v += step) {
    const y = y0 + h - (v / max) * h;
    el('line', { x1: x0, x2: x1, y1: y, y2: y, stroke: v === 0 ? 'var(--ink-3)' : 'var(--grid)', 'stroke-width': 1 }, svg);
    const t = el('text', { x: x0 - 6, y: y + 3.5, 'text-anchor': 'end' }, svg); t.textContent = fmtFn(v);
  }
}
const byYear = {};
D.timeline.forEach((r) => { const y = r.m.slice(0, 4); byYear[y] = byYear[y] || Object.fromEntries(SERIES.map((s) => [s.k, 0])); SERIES.forEach((s) => byYear[y][s.k] += r[s.k]); });
const yTot = (y) => SERIES.reduce((a, s) => a + byYear[y][s.k], 0);

// ------------------------------------------------------------ stats
const T = D.totals;
const created = (T['Facebook:post'] || 0) + (T['Instagram:feed'] || 0) + (T['Instagram:story'] || 0) + (T['Instagram:reel'] || 0) + (T['Threads:thread'] || 0);
const likes = (T['Facebook:like'] || 0) + (T['Instagram:like'] || 0) + (T['Threads:like'] || 0);
const comments = (T['Facebook:comment'] || 0) + (T['Instagram:comment'] || 0);
const legendHTML = SERIES.map((s) => `<span><i style="background:${s.c}"></i>${s.label}</span>`).join('');
$('#legend-series').innerHTML = legendHTML; $('#legend-series-2').innerHTML = legendHTML;

// ------------------------------------------------------------ timeline
(function timeline() {
  const svg = $('#chart-timeline'), tl = D.timeline;
  const W = 1000, L = 44, R = 8, top = 8, H = 230, laneTop = top + H + 30, laneH = 20, laneGap = 6;
  const lanes = [['FB', ['FB1', 'FB2']], ['IG', ['IG1', 'IG2', 'IG3', 'IG4']], ['TH', ['TH']]];
  const totalH = laneTop + lanes.length * (laneH + laneGap) - laneGap + 2;
  svg.setAttribute('viewBox', `0 0 ${W} ${totalH}`);
  const n = tl.length, pw = W - L - R, bw = pw / n;
  const sums = tl.map((r) => SERIES.reduce((a, s) => a + r[s.k], 0));
  const { max, step } = niceMax(Math.max(...sums));
  yGrid(svg, L, W - R, top, H, max, step);
  const xOf = (i) => L + i * bw;
  const monthIdx = (iso) => { const [y, m] = iso.split('-').map(Number); return (y - 2008) * 12 + (m - 1); };
  tl.forEach((r, i) => {
    let y = top + H;
    SERIES.forEach((s) => {
      const v = r[s.k]; if (!v) return;
      const h = (v / max) * H;
      el('rect', { x: xOf(i) + 0.4, y: y - h, width: Math.max(bw - 0.8, 0.6), height: Math.max(h - 0.6, 0.6), style: `fill:${s.c}` }, svg);
      y -= h;
    });
    const hit = el('rect', { x: xOf(i), y: top, width: bw, height: H, class: 'hit' }, svg);
    const [yy, mm] = r.m.split('-').map(Number);
    bindTip(hit, () => `<b>${new Date(yy, mm - 1).toLocaleString('en-US', { month: 'long' })} ${yy}</b>` +
      (sums[i] ? SERIES.filter((s) => r[s.k]).map((s) => row(s.c, s.label, r[s.k])).join('') : '<div>Nothing posted</div>'));
  });
  for (let y = 2008; y <= 2026; y += 2) {
    const x = xOf((y - 2008) * 12);
    el('line', { x1: x, x2: x, y1: top + H, y2: top + H + 5, stroke: 'var(--ink-3)' }, svg);
    const t = el('text', { x: x + 2, y: top + H + 17 }, svg); t.textContent = y;
  }
  const defs = el('defs', {}, svg);
  const pat = el('pattern', { id: 'hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--hatch)', 'stroke-width': 2 }, pat);
  lanes.forEach(([name, accts], li) => {
    const y = laneTop + li * (laneH + laneGap);
    const t = el('text', { x: L - 6, y: y + laneH / 2 + 4, 'text-anchor': 'end', class: 'lbl-ink' }, svg); t.textContent = name;
    el('rect', { x: L, y, width: pw, height: laneH, fill: 'url(#hatch)', rx: 3 }, svg);
    accts.forEach((a) => {
      const A = D.accounts[a];
      const end = acctEnd(a);
      const i0 = Math.max(0, monthIdx(A.joined)), i1 = Math.min(n, monthIdx(end) + 1);
      const x = xOf(i0), w = Math.max(xOf(i1) - x - 1.5, 2);
      el('rect', { x, y, width: w, height: laneH, rx: 3, style: 'fill:var(--lane)' }, svg);
      const lbl = ACCT[a][1] || 'Threads';
      if (w > 18) { const tt = el('text', { x: x + 6, y: y + laneH / 2 + 4, class: 'lane-txt' }, svg); tt.textContent = lbl; }
      const hit = el('rect', { x, y, width: w, height: laneH, class: 'hit' }, svg);
      bindTip(hit, () => `<b>${acctLabel(a)}</b><div>Created ${mdY(A.joined)}</div><div>${DELETED_TODAY.has(a) ? 'Deleted ' + mdY(TODAY) : 'Last activity ' + mdY(A.last)}</div>` + row('', 'Posts and stories', fmt(A.created)));
    });
  });
  $('#acct-key').innerHTML = ['FB1', 'FB2', 'IG1', 'IG2', 'IG3', 'IG4', 'TH'].map((a) => `<li>${acctLabel(a)}</li>`).join('');
  // transposed yearly table: years across, matching the chart
  const fd = D.fb_dest, cell = (v) => v ? `<td>${fmt(v)}</td>` : '<td class="zero">0</td>';
  const sub = (label, key) => `<tr class="sub"><td>${label}</td>${YEARS.map((y) => cell((fd[y] || {})[key] || 0)).join('')}<td>${fmt(YEARS.reduce((a, y) => a + ((fd[y] || {})[key] || 0), 0))}</td></tr>`;
  const sRow = (s) => `<tr><td><i style="background:${s.c}"></i>${s.label}</td>${YEARS.map((y) => cell(byYear[y][s.k])).join('')}<td>${fmt(YEARS.reduce((a, y) => a + byYear[y][s.k], 0))}</td></tr>`;
  $('#table-yearly').innerHTML = `<table class="yt"><thead><tr><th></th>${YEARS.map((y) => `<th>${y}</th>`).join('')}<th>Total</th></tr></thead><tbody>` +
    sRow(SERIES[0]) + sub('Own timeline', 'own') + sub("Friends' walls", 'friends_wall') + sub('Groups', 'group') +
    SERIES.slice(1).map(sRow).join('') +
    `<tr class="total"><td>Total</td>${YEARS.map((y) => `<td>${fmt(yTot(y))}</td>`).join('')}<td>${fmt(created)}</td></tr></tbody></table>`;
  const peakY = YEARS.filter((y) => y !== '2026').sort((a, b) => yTot(b) - yTot(a))[0];
})();

// ------------------------------------------------------------ platform shift
(function shift() {
  const svg = $('#chart-shift');
  const W = 1000, L = 44, R = 8, top = 8, H = 200;
  svg.setAttribute('viewBox', `0 0 ${W} ${top + H + 26}`);
  const bw = (W - L - R) / YEARS.length, gap = Math.min(10, bw * 0.25);
  yGrid(svg, L, W - R, top, H, 100, 25, (v) => v + '%');
  YEARS.forEach((y, i) => {
    const r = byYear[y], tot = yTot(y);
    let yy = top + H;
    SERIES.forEach((s) => {
      if (!r[s.k]) return;
      const h = (r[s.k] / tot) * H;
      el('rect', { x: L + i * bw + gap / 2, y: yy - h + 1, width: bw - gap, height: Math.max(h - 2, 0.8), style: `fill:${s.c}`, rx: 2 }, svg);
      yy -= h;
    });
    const hit = el('rect', { x: L + i * bw, y: top, width: bw, height: H, class: 'hit' }, svg);
    bindTip(hit, () => `<b>${y}</b>` + SERIES.filter((s) => r[s.k]).map((s) => row(s.c, s.label, Math.round(r[s.k] / tot * 100) + '%')).join('') + row('', 'Total', fmt(tot)));
    const t = el('text', { x: L + i * bw + bw / 2, y: top + H + 16, 'text-anchor': 'middle' }, svg); t.textContent = "'" + y.slice(2);
  });
  const share = (y, ks) => Math.round(ks.reduce((a, k) => a + byYear[y][k], 0) / yTot(y) * 100);
  const minStory = Math.min(...['2022', '2023', '2024', '2025'].map((y) => share(y, ['ig_story'])));
})();

// ------------------------------------------------------------ profile picture pins
function drawAvatars(svg, pins, top, H, W, L, R) {
  const defs = el('defs', {}, svg), AV = 30;
  pins.forEach(({ k, mx, iso, label, side }) => {
    const cx = side === 'start' ? Math.max(mx, L + AV) : Math.min(mx, W - R - AV), cy = AV + 2;
    const cp = el('clipPath', { id: 'pfp-' + k }, defs); el('circle', { cx, cy, r: AV }, cp);
    el('line', { x1: mx, x2: mx, y1: cy + AV, y2: top + H, stroke: 'var(--ink-3)', 'stroke-dasharray': '2 3' }, svg);
    el('circle', { cx, cy, r: AV + 2, style: 'fill:var(--panel);stroke:var(--rule)', 'stroke-width': 1 }, svg);
    el('image', { href: PFP[k], x: cx - AV, y: cy - AV, width: AV * 2, height: AV * 2, preserveAspectRatio: 'xMidYMid slice', 'clip-path': `url(#pfp-${k})` }, svg);
    const tx = side === 'start' ? cx + AV + 10 : cx - AV - 10, anchor = side === 'start' ? 'start' : 'end';
    const t1 = el('text', { x: tx, y: cy - 2, 'text-anchor': anchor, class: 'lbl-ink', style: 'font-family:var(--f-body);font-size:12px;font-weight:600' }, svg); t1.textContent = label;
    const t2 = el('text', { x: tx, y: cy + 14, 'text-anchor': anchor }, svg); t2.textContent = mdY(iso);
  });
}

// ------------------------------------------------------------ stacked yearly bars
function yearBars(svg, years, segs, opts = {}) {
  const W = 1000, L = 52, R = 8, top = opts.avatars ? 84 : 10, H = opts.h || 220;
  svg.setAttribute('viewBox', `0 0 ${W} ${top + H + 26}`);
  const sums = years.map((y) => segs.reduce((a, s) => a + (s.get(y) || 0), 0));
  const { max, step } = niceMax(Math.max(...sums, 1), 4);
  yGrid(svg, L, W - R, top, H, max, step);
  const bw = (W - L - R) / years.length, gap = Math.min(14, bw * 0.3);
  years.forEach((y, i) => {
    let yy = top + H; const x = L + i * bw + gap / 2;
    segs.forEach((s, si) => {
      const v = s.get(y) || 0; if (!v) return;
      const h = (v / max) * H, isTop = segs.slice(si + 1).every((t) => !t.get(y));
      const hh = Math.max(h - 2, 0.8), y0 = yy - (si ? 2 : 0);
      if (isTop && hh > 4) el('path', { d: `M${x},${y0} v${-(hh - 4)} q0,-4 4,-4 h${bw - gap - 8} q4,0 4,4 v${hh - 4} z`, style: `fill:${s.c}` }, svg);
      else el('rect', { x, y: y0 - hh, width: bw - gap, height: hh, style: `fill:${s.c}` }, svg);
      yy -= h;
    });
    const hit = el('rect', { x: L + i * bw, y: top, width: bw, height: H, class: 'hit' }, svg);
    bindTip(hit, () => `<b>${y}</b>` + segs.filter((s) => s.get(y)).map((s) => row(s.c, s.label, fmt(s.get(y)))).join('') + row('', 'Total', fmt(sums[i])));
    const t = el('text', { x: L + i * bw + bw / 2, y: top + H + 16, 'text-anchor': 'middle' }, svg); t.textContent = "'" + y.slice(2);
  });
  if (opts.avatars) {
    const barTop = (y) => top + H - (sums[years.indexOf(y)] / max) * H;
    drawAvatars(svg, opts.avatars.map((a) => ({ ...a, mx: L + years.indexOf(a.iso.slice(0, 4)) * bw + bw / 2 })), top, 0, W, L, R);
    // stop each leader at its bar's top
    [...svg.querySelectorAll('line[stroke-dasharray="2 3"]')].forEach((ln, j) => ln.setAttribute('y2', barTop(opts.avatars[j].iso.slice(0, 4)) - 4));
  }
}

// ------------------------------------------------------------ photos and videos
(function photos() {
  const M = D.media_year, g = (k) => (y) => (M[y] || {})[k] || 0;
  const segs = [
    { label: 'Facebook photos', c: 'var(--s1)', get: g('fb_photo') },
    { label: 'Instagram post photos', c: 'var(--s2)', get: g('ig_feed_photo') },
    { label: 'Instagram story photos', c: 'var(--s3)', get: g('ig_story_photo') },
    { label: 'All videos', c: 'var(--s4)', get: g('video') },
  ];
  yearBars($('#chart-photos'), YEARS, segs, { avatars: [
    { k: 'first', iso: '2008-01-31', label: 'First profile picture', side: 'start' },
    { k: 'last', iso: '2026-01-31', label: 'Last profile picture', side: 'end' },
  ] });
  const WM = D.with_media;
  const share = (y) => WM[y] ? WM[y][0] / WM[y][1] * 100 : null;
  lineChart($('#chart-withmedia'), YEARS, [{ label: 'Posts with a photo or video', c: 'var(--s2)', get: share }], { h: 160, ticks: 4, fmt: (v) => Math.round(v) + '%' });
  const sum = (ys, ks) => ys.reduce((a, y) => a + ks.reduce((b, k) => b + g(k)(y), 0), 0);
  const P = ['fb_photo', 'ig_feed_photo', 'ig_story_photo'];
  const photos = sum(YEARS, P), videos = sum(YEARS, ['video']);
  const peak = YEARS.slice().sort((a, b) => sum([b], P) - sum([a], P))[0];
  const late = YEARS.filter((y) => y >= '2022');
  const storyShare = Math.round(sum(late, ['ig_story_photo']) / sum(late, P) * 100);
  const fbMax = Math.round(Math.max(...YEARS.filter((y) => y <= '2016').map(share)));
})();

// ------------------------------------------------------------ weekday vs weekend by hour
(function hours() {
  const g = D.heat.All;
  const wd = Array.from({ length: 24 }, (_, h) => g.slice(0, 5).reduce((a, r) => a + r[h], 0));
  const we = Array.from({ length: 24 }, (_, h) => g.slice(5).reduce((a, r) => a + r[h], 0));
  const W = wd.reduce((a, b) => a + b, 0), E = we.reduce((a, b) => a + b, 0);
  const hl = (h) => h === 0 ? '12a' : h < 12 ? h + 'a' : h === 12 ? '12p' : (h - 12) + 'p';
  const hrs = Array.from({ length: 24 }, (_, h) => h);
  lineChart($('#chart-hours'), hrs, [
    { label: 'Weekdays', c: 'var(--s1)', get: (h) => wd[h] / W * 100 },
    { label: 'Weekends', c: 'var(--s2)', get: (h) => we[h] / E * 100 },
  ], { h: 220, ticks: 4, fmt: (v) => (v % 1 ? v.toFixed(1) : v) + '%', xlabel: (h) => hl(h), xtitle: (h) => `${hl(h)}–${hl((h + 1) % 24)}`, xevery: 3 });
})();

// ------------------------------------------------------------ line chart helper
function lineChart(svg, xs, series, opts = {}) {
  const W = opts.w || 1000, L = 52, R = 16, top = 12, H = opts.h || 220;
  svg.setAttribute('viewBox', `0 0 ${W} ${top + H + 26}`);
  const vals = series.flatMap((s) => xs.map(s.get)).filter((v) => v != null);
  const { max, step } = niceMax(Math.max(...vals), opts.ticks || 4);
  yGrid(svg, L, W - R, top, H, max, step, opts.fmt || fmt);
  const xOf = (i) => L + 10 + i * ((W - L - R - 20) / (xs.length - 1));
  const yOf = (v) => top + H - (v / max) * H;
  series.forEach((s) => {
    let d = '', pen = false;
    xs.forEach((x, i) => { const v = s.get(x); if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + xOf(i) + ',' + yOf(v); pen = true; });
    el('path', { d, fill: 'none', style: `stroke:${s.c}`, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    xs.forEach((x, i) => { const v = s.get(x); if (v != null) el('circle', { cx: xOf(i), cy: yOf(v), r: 4, style: `fill:${s.c};stroke:var(--panel)`, 'stroke-width': 2 }, svg); });
  });
  const cross = el('line', { y1: top, y2: top + H, stroke: 'var(--ink-3)', 'stroke-dasharray': '3 3', opacity: 0 }, svg);
  const colW = (W - L - R - 20) / (xs.length - 1);
  xs.forEach((x, i) => {
    if (!opts.xevery || i % opts.xevery === 0) { const t = el('text', { x: xOf(i), y: top + H + 16, 'text-anchor': 'middle' }, svg); t.textContent = opts.xlabel ? opts.xlabel(x) : "'" + String(x).slice(2); }
    const hit = el('rect', { x: xOf(i) - colW / 2, y: top, width: colW, height: H, class: 'hit' }, svg);
    hit.addEventListener('pointerenter', () => { cross.setAttribute('x1', xOf(i)); cross.setAttribute('x2', xOf(i)); cross.setAttribute('opacity', 1); });
    hit.addEventListener('pointerleave', () => cross.setAttribute('opacity', 0));
    bindTip(hit, () => `<b>${opts.xtitle ? opts.xtitle(x) : x}</b>` + series.map((s) => { const v = s.get(x); return row(s.c, s.label, v == null ? '-' : (opts.fmt || fmt)(v)); }).join(''));
  });
}
(function consume() {
  const by = Object.fromEntries(D.yearly.map((r) => [String(r.y), r]));
  const get = (k) => (y) => by[y] ? (by[y][k] || 0) : 0;
  lineChart($('#chart-consume'), YEARS, [
    { label: 'Posts and stories', c: 'var(--s1)', get: get('create') },
    { label: 'Comments', c: 'var(--s2)', get: get('comment') },
    { label: 'Likes and reactions', c: 'var(--s3)', get: get('like') },
  ]);
  const ratio = (y) => by[y] && by[y].create >= 30 && by[y].like ? by[y].like / by[y].create : null;
  lineChart($('#chart-ratio'), YEARS, [{ label: 'Likes per post', c: 'var(--s3)', get: ratio }], { h: 150, ticks: 3, fmt: (v) => v.toFixed(v < 10 && v % 1 ? 1 : 0) });
  const cpp = (y) => by[y].comment / by[y].create;
})();

// ------------------------------------------------------------ words
(function words() {
  const SKIP = new Set(['com', 'www', 'http', 'https', 'sikdar', 'ronjan', 'damon', "damon's", 'emily', 'lau', 'ruma', 'reena', 'connor']);
  const fx = (x) => x >= 1000 ? fmt(Number(x.toPrecision(2))) + '×' : x >= 10 ? fmt(x) + '×' : x.toFixed(1) + '×';
  function render(p) {
    const rows = D.overindex[p].filter((r) => !SKIP.has(r.w)).slice(0, 30);
    const lmax = Math.log10(rows[0].x);
    // column-major so ranks read down each column
    const half = Math.ceil(rows.length / 2), order = [];
    for (let i = 0; i < half; i++) { order.push(i); if (i + half < rows.length) order.push(i + half); }
    $('#oi').innerHTML = order.map((i) => { const r = rows[i]; return `<div class="r"><span class="k">${i + 1}</span><span class="w">${r.w}</span><span class="n">${fmt(r.n)}</span><span class="b" style="width:${Math.max(2, Math.log10(Math.max(r.x, 1)) / lmax * 100).toFixed(1)}%"></span><span class="x">${fx(r.x)}</span></div>`; }).join('');
    $('#oi-note').innerHTML = 'Usage rate compared with typical written English in the <a href="https://github.com/rspeer/wordfreq" target="_blank" rel="noopener">wordfreq</a> word-frequency list. Minimum 12 uses. Bars use a log scale';
  }
  render('All');
  $('#tags').innerHTML = D.hashtags.All.slice(0, 3).map(([w, c]) => `<div><b>#${w}</b><span>${c} uses</span></div>`).join('');
  $('#emoji').innerHTML = D.emoji.All.slice(0, 10).map(([e, c]) => `<div><span class="e">${[...e].length === 1 && e.codePointAt(0) < 0x3000 ? e + '️' : e}</span><span class="c">${fmt(c)}</span></div>`).join('');
})();

// ------------------------------------------------------------ method
(function method() {
  const ex = D.excluded, acc = D.accounts;
  const items = [
    `Built from 7 exports: ${['FB1', 'FB2', 'IG1', 'IG2', 'IG3', 'IG4', 'TH'].map(acctLabel).join(', ').replace(/, ([^,]*)$/, ', and $1')}.`,
    `Cross-posts count once on the original platform. Excluded from Facebook: 114 Instagram cross-posts from 2017 to 2018, ${ex['Instagram cross-posts']} more since 2022, and ${fmt(acc.FB2.story_crossposts)} mirrored Instagram stories.`,
    `Also excluded: ${ex['sticker-only entries']} sticker-only Facebook entries from 2022 and ${ex['profile life events']} profile life events added in bulk.`,
    'All times are Eastern. Each export\'s time zone was confirmed by matching cross-posted items.',
    'Word baseline: <a href="https://github.com/rspeer/wordfreq" target="_blank" rel="noopener">wordfreq</a> by Robyn Speer. It draws on web, news, book, subtitle, Wikipedia, and social media text.',
    'Threads activity from 4/2023 predates the public launch because of beta access.',
  ];
  $('#method-list').innerHTML = items.map((t) => `<li>${t}</li>`).join('');
})();

})();
