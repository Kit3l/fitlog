'use strict';
/* Tiny SVG charts. No libraries, so the app works offline. */
const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
  for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
function niceTicks(min, max, n = 4) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, out = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

/*
  lineChart({ series:[{pts:[[x,y],...], cls, dots}], hlines:[{y,label}], xTicks:[{x,label}] })
*/
function lineChart(o) {
  const W = 340, H = o.height || 170, L = 38, R = 10, T = 10, B = 24;
  const all = o.series.flatMap(s => s.pts);
  if (!all.length) return h('p', { class: 'empty' }, 'No data yet.');
  let xmin = Math.min(...all.map(p => p[0])), xmax = Math.max(...all.map(p => p[0]));
  if (o.xRange) { xmin = Math.min(xmin, o.xRange[0]); xmax = Math.max(xmax, o.xRange[1]); }
  let ys = all.map(p => p[1]).concat((o.hlines || []).map(l => l.y));
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys), 4);
  const ymin = ticks[0], ymax = ticks[ticks.length - 1];
  const X = x => L + (xmax === xmin ? (W - L - R) / 2 : (x - xmin) / (xmax - xmin) * (W - L - R));
  const Y = y => T + (1 - (y - ymin) / (ymax - ymin || 1)) * (H - T - B);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': o.label || 'chart' });
  for (const t of ticks) {
    svg.append(svgEl('line', { x1: L, x2: W - R, y1: Y(t), y2: Y(t), class: 'grid' }));
    svg.append(svgEl('text', { x: L - 6, y: Y(t) + 4, class: 'axis', 'text-anchor': 'end' }, fmt(t, t % 1 ? 1 : 0)));
  }
  for (const l of o.hlines || []) {
    svg.append(svgEl('line', { x1: L, x2: W - R, y1: Y(l.y), y2: Y(l.y), class: 'goal' }));
    svg.append(svgEl('text', { x: W - R, y: Y(l.y) - 4, class: 'axis goal-t', 'text-anchor': 'end' }, l.label));
  }
  for (const t of o.xTicks || []) svg.append(svgEl('text', { x: X(t.x), y: H - 6, class: 'axis', 'text-anchor': 'middle' }, t.label));
  for (const s of o.series) {
    if (s.line !== false && s.pts.length > 1) svg.append(svgEl('polyline', { points: s.pts.map(p => X(p[0]) + ',' + Y(p[1])).join(' '), class: 'line ' + (s.cls || '') }));
    if (s.dots) for (const p of s.pts) svg.append(svgEl('circle', { cx: X(p[0]), cy: Y(p[1]), r: s.r || 2.6, class: 'dot ' + (s.cls || '') }));
  }
  return svg;
}

/* barChart({ bars:[{label, v}], target, unit }) */
function barChart(o) {
  const W = 340, H = o.height || 150, L = 38, R = 8, T = 10, B = 22;
  if (!o.bars.length) return h('p', { class: 'empty' }, 'No data yet.');
  const maxV = Math.max(...o.bars.map(b => b.v), o.target || 0, 1);
  const ticks = niceTicks(0, maxV, 3), ymax = ticks[ticks.length - 1];
  const Y = y => T + (1 - y / ymax) * (H - T - B);
  const bw = (W - L - R) / o.bars.length;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': o.label || 'chart' });
  for (const t of ticks) {
    svg.append(svgEl('line', { x1: L, x2: W - R, y1: Y(t), y2: Y(t), class: 'grid' }));
    svg.append(svgEl('text', { x: L - 6, y: Y(t) + 4, class: 'axis', 'text-anchor': 'end' }, fmt(t)));
  }
  o.bars.forEach((b, i) => {
    const x = L + i * bw + bw * 0.18, w = bw * 0.64;
    if (b.v > 0) svg.append(svgEl('rect', { x, y: Y(b.v), width: w, height: Y(0) - Y(b.v), rx: 2, class: 'bar' + ((b.over != null ? b.over : (o.target && b.v > o.target)) ? ' over' : '') }));
    if (b.label) svg.append(svgEl('text', { x: x + w / 2, y: H - 6, class: 'axis', 'text-anchor': 'middle' }, b.label));
  });
  if (o.target) {
    svg.append(svgEl('line', { x1: L, x2: W - R, y1: Y(o.target), y2: Y(o.target), class: 'goal' }));
  }
  return svg;
}
