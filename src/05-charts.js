<script>
/* ============================================================
   CHARTS — hand-drawn SVG. One scale per chart, hairline grid,
   thin marks, a hover layer on every plot.
   ============================================================ */
const CHART_FNS = {};
const CHART_Q = [];
/** Charts draw at the pixel width of their container, so 11px type is 11px
 *  in a wide panel and in a narrow one. Views reserve a slot; render fills it. */
function slot(name, args, opt) {
  CHART_Q.push({ name, args, opt: opt || {} });
  return '<div class="chart-host" data-ci="' + (CHART_Q.length - 1) + '"></div>';
}
function paintCharts(root) {
  $$('.chart-host', root).forEach(el => {
    const rec = CHART_Q[Number(el.dataset.ci)];
    if (!rec || !CHART_FNS[rec.name]) return;
    const w = Math.max(300, Math.round(el.clientWidth || 640));
    el.innerHTML = CHART_FNS[rec.name].apply(null, rec.args.concat([Object.assign({}, rec.opt, { vw: w })]));
  });
}

function niceTicks(min, max, count) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const raw = span / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.abs(v) < step / 1e6 ? 0 : v);
  return out;
}
function axisFmt(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(a % 1e6 ? 1 : 0) + 'M';
  if (a >= 1000) return (v / 1000).toFixed(a % 1000 ? 1 : 0) + 'k';
  if (a >= 1) return String(Math.round(v));
  return String(+v.toFixed(2));
}
function wrap(inner, h, w) {
  w = w || 1000;
  return '<div class="chart-wrap"><svg class="chart" viewBox="0 0 ' + w + ' ' + h +
    '" style="width:100%;height:auto;aspect-ratio:' + w + '/' + h + '" role="img">' + inner + '</svg><div class="tip"></div></div>';
}

/* ---- Equity curve: line + area, emphasized endpoint, crosshair ---- */
function chartEquity(points, opt) {
  const o = Object.assign({ h: 280, pad: [16, 22, 36, 62] }, opt);
  const [pt, pr, pb, pl] = o.pad;
  const VW = o.vw || 1000;
  const h = o.h, iw = VW - pl - pr, ih = h - pt - pb;
  if (points.length < 2) return '<div class="empty">' + tx('Not enough closed trades to draw a curve yet.') + '</div>';
  const vals = points.map(p => p.v);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals), 5);
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const X = i => pl + (points.length === 1 ? iw / 2 : i / (points.length - 1) * iw);
  const Y = v => pt + ih - (v - lo) / (hi - lo || 1) * ih;

  let g = '';
  ticks.forEach(v => {
    g += '<line class="gridline" x1="' + pl + '" x2="' + (pl + iw) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/>' +
      '<text class="tick" x="' + (pl - 9) + '" y="' + (Y(v) + 3.5).toFixed(1) + '" text-anchor="end">' + axisFmt(v) + '</text>';
  });
  const line = points.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
  const area = line + ' L' + X(points.length - 1).toFixed(1) + ' ' + (pt + ih) + ' L' + X(0).toFixed(1) + ' ' + (pt + ih) + ' Z';
  const up = points[points.length - 1].v >= points[0].v;
  const col = up ? 'var(--profit)' : 'var(--loss)';

  // x labels: first, a few middles, last
  const stepL = Math.max(1, Math.round((points.length - 1) / 5));
  let xl = '';
  for (let i = 0; i < points.length; i += stepL) {
    xl += '<text class="tick" x="' + X(i).toFixed(1) + '" y="' + (pt + ih + 20) + '" text-anchor="middle">' + esc(points[i].label) + '</text>';
  }
  let hit = '';
  points.forEach((p, i) => {
    const bw = iw / Math.max(1, points.length - 1);
    hit += '<rect x="' + (X(i) - bw / 2).toFixed(1) + '" y="' + pt + '" width="' + bw.toFixed(1) + '" height="' + ih +
      '" fill="transparent" data-tip="' + esc(p.tip) + '" data-cx="' + X(i).toFixed(1) + '" data-cy="' + Y(p.v).toFixed(1) + '"/>';
  });
  const ex = X(points.length - 1), ey = Y(points[points.length - 1].v);
  return wrap(
    '<defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="' + col + '" stop-opacity=".22"/><stop offset="100%" stop-color="' + col + '" stop-opacity="0"/>' +
    '</linearGradient></defs>' + g +
    '<path d="' + area + '" fill="url(#eqg)"/>' +
    '<path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="4.5" fill="' + col + '" stroke="var(--surface)" stroke-width="2"/>' +
    '<line class="axisline" x1="' + pl + '" x2="' + (pl + iw) + '" y1="' + (pt + ih) + '" y2="' + (pt + ih) + '"/>' +
    xl + hit, h, VW);
}

/* ---- Drawdown: how far under the high-water mark, always negative ---- */
function chartDrawdown(points, opt) {
  const o = Object.assign({ h: 170, pad: [14, 22, 32, 62] }, opt);
  const [pt, pr, pb, pl] = o.pad;
  const VW = o.vw || 1000;
  const h = o.h, iw = VW - pl - pr, ih = h - pt - pb;
  if (points.length < 2) return '<div class="empty">' + tx('Not enough trades yet.') + '</div>';
  const maxDD = Math.max(0.0001, ...points.map(p => p.v));
  const ticks = niceTicks(-maxDD, 0, 3);
  const lo = ticks[0], hi = 0;
  const X = i => pl + i / (points.length - 1) * iw;
  const Y = v => pt + (0 - (-v)) / (0 - lo || 1) * ih;
  let g = '';
  ticks.forEach(v => {
    g += '<line class="gridline" x1="' + pl + '" x2="' + (pl + iw) + '" y1="' + Y(-v).toFixed(1) + '" y2="' + Y(-v).toFixed(1) + '"/>' +
      '<text class="tick" x="' + (pl - 9) + '" y="' + (Y(-v) + 3.5).toFixed(1) + '" text-anchor="end">' + axisFmt(v) + '</text>';
  });
  const line = points.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
  const area = line + ' L' + X(points.length - 1).toFixed(1) + ' ' + pt + ' L' + pl + ' ' + pt + ' Z';
  let hit = '';
  points.forEach((p, i) => {
    const bw = iw / Math.max(1, points.length - 1);
    hit += '<rect x="' + (X(i) - bw / 2).toFixed(1) + '" y="' + pt + '" width="' + bw.toFixed(1) + '" height="' + ih +
      '" fill="transparent" data-tip="' + esc(p.tip) + '" data-cx="' + X(i).toFixed(1) + '" data-cy="' + Y(p.v).toFixed(1) + '"/>';
  });
  return wrap(g +
    '<path d="' + area + '" fill="var(--loss)" fill-opacity=".16"/>' +
    '<path d="' + line + '" fill="none" stroke="var(--loss)" stroke-width="2" stroke-linejoin="round"/>' +
    '<line class="axisline" x1="' + pl + '" x2="' + (pl + iw) + '" y1="' + pt + '" y2="' + pt + '"/>' + hit, h, VW);
}

/* ---- Vertical bars around a zero baseline ---- */
function chartBars(items, opt) {
  const o = Object.assign({ h: 240, pad: [18, 22, 46, 62], colorBySign: true, fmt: v => money(v, 0) }, opt);
  const [pt, pr, pb, pl] = o.pad;
  const VW = o.vw || 1000;
  const h = o.h, iw = VW - pl - pr, ih = h - pt - pb;
  if (!items.length) return '<div class="empty">' + tx('Nothing in this range yet.') + '</div>';
  const vals = items.map(d => d.v);
  const ticks = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals), 4);
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const Y = v => pt + ih - (v - lo) / (hi - lo || 1) * ih;
  const bw = Math.min(46, iw / items.length * 0.62);
  const X = i => pl + (i + 0.5) * (iw / items.length);
  let g = '';
  ticks.forEach(v => {
    g += '<line class="gridline" x1="' + pl + '" x2="' + (pl + iw) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/>' +
      '<text class="tick" x="' + (pl - 9) + '" y="' + (Y(v) + 3.5).toFixed(1) + '" text-anchor="end">' + axisFmt(v) + '</text>';
  });
  let bars = '', labs = '';
  const per = iw / items.length;
  const skip = per < 46 ? Math.ceil(46 / per) : 1;
  items.forEach((d, i) => {
    const y0 = Y(0), y1 = Y(d.v);
    const top = Math.min(y0, y1), hgt = Math.max(2, Math.abs(y1 - y0));
    const col = d.color || (o.colorBySign ? (d.v >= 0 ? 'var(--profit)' : 'var(--loss)') : 'var(--s1)');
    if (d.v !== 0) bars += '<rect x="' + (X(i) - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) +
      '" height="' + hgt.toFixed(1) + '" rx="3" fill="' + col + '" data-tip="' + esc(d.tip || (d.label + ' · ' + o.fmt(d.v))) +
      '" data-cx="' + X(i).toFixed(1) + '" data-cy="' + top.toFixed(1) + '"/>';
    if (i % skip === 0) labs += '<text class="tick" x="' + X(i).toFixed(1) + '" y="' + (pt + ih + 20) + '" text-anchor="middle">' + esc(d.label) + '</text>';
  });
  return wrap(g + '<line class="axisline" x1="' + pl + '" x2="' + (pl + iw) + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '"/>' + bars + labs, h, VW);
}

/* ---- Donut: part-to-whole at a glance, capped at 6 slices ---- */
function chartDonut(slices, opt) {
  const o = Object.assign({ h: 230 }, opt);
  const VW = o.vw || 1000;
  const total = sum(slices.map(s => s.v));
  if (!total) return '<div class="empty">' + tx('No trades to split yet.') + '</div>';
  const cx = VW / 2, cy = o.h / 2, rOut = Math.min(o.h / 2 - 12, 92), rIn = rOut * 0.6;
  let a0 = -Math.PI / 2, out = '';
  slices.forEach(s => {
    const frac = s.v / total, a1 = a0 + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const gap = 0.012;
    const b0 = a0 + gap, b1 = Math.max(b0 + 0.001, a1 - gap);
    const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x1, y1] = p(rOut, b0), [x2, y2] = p(rOut, b1), [x3, y3] = p(rIn, b1), [x4, y4] = p(rIn, b0);
    out += '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A' + rOut + ' ' + rOut + ' 0 ' + large + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) +
      ' L' + x3.toFixed(1) + ' ' + y3.toFixed(1) + ' A' + rIn + ' ' + rIn + ' 0 ' + large + ' 0 ' + x4.toFixed(1) + ' ' + y4.toFixed(1) + ' Z" fill="' + s.color +
      '" data-tip="' + esc(s.label + ' · ' + s.v + ' trades · ' + pct(frac * 100)) + '" data-cx="' + (cx + (rOut + rIn) / 2 * Math.cos((b0 + b1) / 2)).toFixed(1) +
      '" data-cy="' + (cy + (rOut + rIn) / 2 * Math.sin((b0 + b1) / 2)).toFixed(1) + '"/>';
    a0 = a1;
  });
  const big = slices.slice().sort((a, b) => b.v - a.v)[0];
  out += '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" style="font-family:var(--font-mono);font-size:22px;font-weight:600;fill:var(--ink)">' + total + '</text>' +
    '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" style="font-size:11px;fill:var(--ink-3)">' + tx('trades') + '</text>';
  return wrap(out, o.h, VW);
}

/* ---- Monte Carlo fan: percentile bands of the same edge, reshuffled ---- */
function chartFan(bands, start, opt) {
  const o = Object.assign({ h: 300, pad: [18, 24, 38, 66] }, opt);
  const [pt, pr, pb, pl] = o.pad;
  const VW = o.vw || 1000;
  const h = o.h, iw = VW - pl - pr, ih = h - pt - pb;
  const all = bands.flatMap(b => [b.p05, b.p95]);
  const ticks = niceTicks(Math.min(...all, start), Math.max(...all, start), 5);
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const X = i => pl + i / (bands.length - 1) * iw;
  const Y = v => pt + ih - (v - lo) / (hi - lo || 1) * ih;
  let g = '';
  ticks.forEach(v => {
    g += '<line class="gridline" x1="' + pl + '" x2="' + (pl + iw) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/>' +
      '<text class="tick" x="' + (pl - 9) + '" y="' + (Y(v) + 3.5).toFixed(1) + '" text-anchor="end">' + axisFmt(v) + '</text>';
  });
  const band = (a, b) => bands.map((d, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(d[a]).toFixed(1)).join(' ') + ' ' +
    bands.slice().reverse().map((d, i) => 'L' + X(bands.length - 1 - i).toFixed(1) + ' ' + Y(d[b]).toFixed(1)).join(' ') + ' Z';
  const med = bands.map((d, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(d.p50).toFixed(1)).join(' ');
  let hit = '';
  bands.forEach((d, i) => {
    if (i % 5 && i !== bands.length - 1) return;
    const bw = iw / bands.length * 5;
    hit += '<rect x="' + (X(i) - bw / 2).toFixed(1) + '" y="' + pt + '" width="' + bw.toFixed(1) + '" height="' + ih + '" fill="transparent" data-tip="' +
      esc('Trade ' + d.s + ' — median ' + money(d.p50, 0) + ' · 90% band ' + money(d.p05, 0) + ' to ' + money(d.p95, 0)) +
      '" data-cx="' + X(i).toFixed(1) + '" data-cy="' + Y(d.p50).toFixed(1) + '"/>';
  });
  let xl = '';
  for (let i = 0; i < bands.length; i += Math.max(1, Math.round((bands.length - 1) / 5))) {
    xl += '<text class="tick" x="' + X(i).toFixed(1) + '" y="' + (pt + ih + 20) + '" text-anchor="middle">' + i + '</text>';
  }
  return wrap(g +
    '<path d="' + band('p05', 'p95') + '" fill="var(--s1)" fill-opacity=".14"/>' +
    '<path d="' + band('p25', 'p75') + '" fill="var(--s1)" fill-opacity=".24"/>' +
    '<path d="' + med + '" fill="none" stroke="var(--s1)" stroke-width="2"/>' +
    '<line x1="' + pl + '" x2="' + (pl + iw) + '" y1="' + Y(start).toFixed(1) + '" y2="' + Y(start).toFixed(1) + '" stroke="var(--ink-3)" stroke-width="1"/>' +
    '<text class="glab" x="' + (pl + iw - 4) + '" y="' + (Y(start) - 6).toFixed(1) + '" text-anchor="end">' + tx('starting equity') + '</text>' +
    '<line class="axisline" x1="' + pl + '" x2="' + (pl + iw) + '" y1="' + (pt + ih) + '" y2="' + (pt + ih) + '"/>' +
    xl + hit, h, VW);
}

/* ---- Scatter: how much of the move each trade actually kept ---- */
function chartScatter(points, opt) {
  const o = Object.assign({ h: 280, pad: [18, 26, 42, 62] }, opt);
  const [pt, pr, pb, pl] = o.pad;
  const VW = o.vw || 1000;
  const h = o.h, iw = VW - pl - pr, ih = h - pt - pb;
  if (!points.length) return '<div class="empty">' + tx('Log MFE on a few trades and this fills in.') + '</div>';
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const xt = niceTicks(0, Math.max(1, ...xs), 4), yt = niceTicks(Math.min(-1.2, ...ys), Math.max(1, ...ys), 4);
  const xlo = xt[0], xhi = xt[xt.length - 1], ylo = yt[0], yhi = yt[yt.length - 1];
  const X = v => pl + (v - xlo) / (xhi - xlo || 1) * iw;
  const Y = v => pt + ih - (v - ylo) / (yhi - ylo || 1) * ih;
  let g = '';
  yt.forEach(v => {
    g += '<line class="gridline" x1="' + pl + '" x2="' + (pl + iw) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/>' +
      '<text class="tick" x="' + (pl - 9) + '" y="' + (Y(v) + 3.5).toFixed(1) + '" text-anchor="end">' + v.toFixed(1) + 'R</text>';
  });
  xt.forEach(v => { g += '<text class="tick" x="' + X(v).toFixed(1) + '" y="' + (pt + ih + 20) + '" text-anchor="middle">' + v.toFixed(1) + 'R</text>'; });
  // The 45° line: everything the trade offered was kept
  const dmax = Math.min(xhi, yhi);
  g += '<line x1="' + X(0).toFixed(1) + '" y1="' + Y(0).toFixed(1) + '" x2="' + X(dmax).toFixed(1) + '" y2="' + Y(dmax).toFixed(1) +
    '" stroke="var(--ink-3)" stroke-width="1"/>' +
    '<text class="glab" x="' + X(dmax).toFixed(1) + '" y="' + (Y(dmax) - 8).toFixed(1) + '" text-anchor="end">' + tx('kept the whole move') + '</text>';
  let dots = '';
  points.forEach(p => {
    const col = p.y > 0 ? 'var(--profit)' : 'var(--loss)';
    dots += '<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="5" fill="' + col + '" fill-opacity=".8" stroke="var(--surface)" stroke-width="2" data-tip="' +
      esc(p.label) + '" data-cx="' + X(p.x).toFixed(1) + '" data-cy="' + Y(p.y).toFixed(1) + '"/>';
  });
  return wrap(g +
    '<line class="axisline" x1="' + pl + '" x2="' + (pl + iw) + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '"/>' +
    '<line class="axisline" x1="' + pl + '" x2="' + pl + '" y1="' + pt + '" y2="' + (pt + ih) + '"/>' + dots +
    '<text class="glab" x="' + (pl + iw / 2) + '" y="' + (pt + ih + 38) + '" text-anchor="middle">' + tx('best unrealised move (MFE, in R)') + '</text>', h, VW);
}

/* ---- Hover layer, shared by every chart ---- */
function wireCharts(root) {
  $$('.chart-wrap', root).forEach(w => {
    const tip = $('.tip', w), svg = $('svg', w);
    if (!tip || !svg) return;
    w.addEventListener('pointermove', e => {
      const el = e.target.closest('[data-tip]');
      if (!el) { tip.classList.remove('on'); return; }
      const box = svg.getBoundingClientRect();
      const wbox = w.getBoundingClientRect();
      const k = box.width / (svg.viewBox.baseVal.width || 1000);
      const ox = box.left - wbox.left, oy = box.top - wbox.top;
      const cx = ox + Number(el.dataset.cx || 0) * k;
      const cy = oy + Number(el.dataset.cy || 0) * k;
      tip.innerHTML = el.dataset.tip.split(' \u00b7 ').map((s, i) =>
        i ? '<div class="l">' + esc(s) + '</div>' : '<div class="t">' + esc(s) + '</div>').join('');
      tip.style.left = clamp(cx, 70, wbox.width - 70) + 'px';
      tip.style.top = Math.max(34, cy) + 'px';
      tip.classList.add('on');
    });
    w.addEventListener('pointerleave', () => tip.classList.remove('on'));
  });
}

Object.assign(CHART_FNS, { chartEquity, chartDrawdown, chartBars, chartDonut, chartFan, chartScatter });

/* ---- Bar list: labelled horizontal comparison, plain HTML ---- */
function barList(rows, opt) {
  const o = Object.assign({ fmt: v => money(v, 0), signed: true }, opt);
  if (!rows.length) return '<div class="empty">' + tx('Nothing to compare yet.') + '</div>';
  const max = Math.max(...rows.map(r => Math.abs(r.v)), 0.0001);
  return '<div class="blist">' + rows.map(r => {
    const w = Math.abs(r.v) / max * 100;
    const col = r.color || (o.signed ? (r.v >= 0 ? 'var(--profit)' : 'var(--loss)') : 'var(--s1)');
    const neg = o.signed && r.v < 0;
    return '<div class="brow"><div class="lab" title="' + esc(r.label) + '">' + esc(r.label) + '</div>' +
      '<div class="track">' + (neg
        ? '<div class="fill" style="right:50%;width:' + (w / 2).toFixed(1) + '%;background:' + col + '"></div><div class="fill" style="left:50%;width:1px;background:var(--line-strong)"></div>'
        : (o.signed
          ? '<div class="fill" style="left:50%;width:' + (w / 2).toFixed(1) + '%;background:' + col + '"></div><div class="fill" style="left:50%;width:1px;background:var(--line-strong)"></div>'
          : '<div class="fill" style="left:0;width:' + w.toFixed(1) + '%;background:' + col + '"></div>')) +
      '</div><div class="val ' + (o.signed ? cls(r.v) : '') + '">' + esc(r.text || o.fmt(r.v)) + '</div></div>';
  }).join('') + '</div>';
}
</script>
