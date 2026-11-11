// Places worth a name, found from the shape of the land (never typed-in numbers),
// plus the small pieces of map arithmetic. No drawing here, so tests can use it.
import { World, LAKE, HALF } from './worldgen';

export interface Place {
  id: string; name: string; kind: 'falls' | 'lake' | 'plateau' | 'ford';
  x: number; z: number; r: number;                 // a dry spot to stand on, and how near counts as "found"
  alt?: { x: number; z: number; r: number };       // a second way of finding it (the lake from any shore)
}

/** A dry point on the bank beside river point i, on the given side (+1 east, -1 west). */
export function bankPoint(w: World, i: number, side: number, extra = 4) {
  const p = w.river[Math.max(0, Math.min(w.river.length - 1, i))];
  let d = p.w;
  while (d < 60 && (w.depth(p.x + side * d, p.z) > 0 || w.wetAt(p.x + side * d, p.z) > 0.97)) d += 1;
  return { x: p.x + side * (d + extra), z: p.z };
}

/** Index of the river point at the lip of the biggest drop (the waterfall). */
export function fallsTop(w: World, span = 12) {
  let best = 0, drop = 0;
  for (let i = 0; i + span < w.river.length; i++) { const d = w.river[i].y - w.river[i + span].y; if (d > drop) { drop = d; best = i; } }
  return best;
}

/** Deepest water across the channel at river point i: the lower, the easier to wade. */
export function channelDepth(w: World, i: number) {
  const p = w.river[i]; let m = 0;
  for (let d = -p.w * 1.6; d <= p.w * 1.6; d += 1) m = Math.max(m, w.depth(p.x + d, p.z));
  return m;
}

/** The lake shore on the side the river comes in from: walk out from the middle until the ground is dry. */
export function lakeShore(w: World) {
  const end = w.river[w.river.length - 1], dx = end.x - LAKE.x + 30 * (Math.sign(w.spawn.x - end.x) || 1), dz = end.z - LAKE.z, l = Math.hypot(dx, dz);
  let d = LAKE.r * 0.5, dry = 0;
  for (; d < LAKE.r * 2.5 && dry < 6; d += 1) dry = w.depth(LAKE.x + (dx / l) * d, LAKE.z + (dz / l) * d) > 0 ? 0 : dry + 1;
  return { x: LAKE.x + (dx / l) * d, z: LAKE.z + (dz / l) * d };
}

export function findPlaces(w: World): Place[] {
  const rv = w.river;
  const home = rv.reduce((a, p) => (Math.abs(p.z - w.spawn.z) < Math.abs(a.z - w.spawn.z) ? p : a));
  const side = Math.sign(w.spawn.x - home.x) || 1;             // the bank the players start on
  const top = fallsTop(w);
  let foot = Math.min(rv.length - 1, top + 12);
  while (foot < rv.length - 1 && rv[foot].steep > 0.3) foot++;
  foot = Math.min(rv.length - 1, foot + 8);                     // stand clear of the spray
  const shelf = Math.max(0, top - 16);
  // The ford: the shallowest stretch of river, with nearness to the start counting for more.
  let ford = 0, score = Infinity;
  for (let i = foot; i < rv.length; i += 2) {
    const s = channelDepth(w, i) * 40 + Math.abs(rv[i].z - w.spawn.z);
    if (s < score) { score = s; ford = i; }
  }
  const at = (i: number) => bankPoint(w, i, side);
  return [
    { id: 'falls', name: 'The Falling Water', kind: 'falls', ...at(foot), r: 40 },
    { id: 'lake', name: 'Still Water', kind: 'lake', ...lakeShore(w), r: 45, alt: { x: LAKE.x, z: LAKE.z, r: LAKE.r + 25 } },
    { id: 'shelf', name: 'The High Shelf', kind: 'plateau', ...at(shelf), r: 35 },
    { id: 'ford', name: 'The Crossing', kind: 'ford', ...at(ford), r: 22 },
  ];
}

export const near = (p: Place, x: number, z: number) =>
  Math.hypot(p.x - x, p.z - z) < p.r || (!!p.alt && Math.hypot(p.alt.x - x, p.alt.z - z) < p.alt.r);

/** Where a point dx,dz metres from the player lands on the round minimap that turns with the camera.
 *  Points beyond the rim are pulled back onto it; `ang` is then the direction to draw the arrow. */
export function miniProject(dx: number, dz: number, yaw: number, pxPerM: number, R: number, margin = 9) {
  const a = yaw + Math.PI, c = Math.cos(a), s = Math.sin(a);
  let x = (dx * c - dz * s) * pxPerM, y = (dx * s + dz * c) * pxPerM;
  const d = Math.hypot(x, y), lim = R - margin, out = d > lim;
  if (out) { x *= lim / d; y *= lim / d; }
  return { x: R + x, y: R + y, out, ang: Math.atan2(y, x) };
}

/** The full map's window: zoom 1..4 and the top-left corner, in unzoomed map pixels. */
export interface Viewport { zoom: number; ox: number; oy: number }
export function clampView(v: Viewport, size: number): Viewport {
  const zoom = Math.max(1, Math.min(4, v.zoom)), max = size - size / zoom;
  return { zoom, ox: Math.max(0, Math.min(max, v.ox)), oy: Math.max(0, Math.min(max, v.oy)) };
}
/** Zoom by `factor` keeping the map point under the cursor (px,py in canvas pixels) where it is. */
export function zoomAt(v: Viewport, px: number, py: number, factor: number, size: number): Viewport {
  const zoom = Math.max(1, Math.min(4, v.zoom * factor));
  const mx = v.ox + px / v.zoom, my = v.oy + py / v.zoom;
  return clampView({ zoom, ox: mx - px / zoom, oy: my - py / zoom }, size);
}
export const viewToWorld = (v: Viewport, px: number, py: number, size: number) =>
  ({ x: ((v.ox + px / v.zoom) / size) * (HALF * 2) - HALF, z: ((v.oy + py / v.zoom) / size) * (HALF * 2) - HALF });
export const worldToView = (v: Viewport, x: number, z: number, size: number) =>
  ({ x: (((x + HALF) / (HALF * 2)) * size - v.ox) * v.zoom, y: (((z + HALF) / (HALF * 2)) * size - v.oy) * v.zoom });
