// The First Valley: a glacial trough running north (high) to south (low).
// A stream crosses a hanging plateau, drops over a cliff as a waterfall,
// meanders down the valley floor and ends in a lake behind a moraine ridge.
// No rendering code here, so the game rules and tests can use it directly.
import { fbm, mulberry32, smooth } from './noise';

export const N = 257;            // grid points per side
export const CELL = 4;           // metres between grid points
export const SIZE = (N - 1) * CELL; // 1024 m
export const HALF = SIZE / 2;
export const LAKE = { x: 0, z: 330, r: 95, level: 5 };

export type ItemKind = 'stick' | 'stone' | 'fibre' | 'berry' | 'flake' | 'log' | 'meat' | 'cooked';
export interface Tree { id: number; x: number; z: number; y: number; type: 0 | 1 | 2; s: number }
/** Undergrowth and dead wood. kind 0 bush, 1 fallen log, 2 old stump. `a` and `b` are two fixed random numbers for its look.
 *  `r` is how close a walker's centre may come (0 = can be walked through); a log is a segment of half-length `hl` along `yaw`. */
export interface Scenery { id: number; kind: 0 | 1 | 2; x: number; z: number; y: number; yaw: number; a: number; b: number; s: number; hl: number; r: number }
export interface RiverPoint { x: number; z: number; y: number; w: number; steep: number }
export interface World {
  seed: number;
  h: Float32Array;       // ground height
  waterY: Float32Array;  // water surface height, or -1e9 where dry
  wet: Float32Array;     // 0 dry .. 1 at the water's edge
  river: RiverPoint[];
  trees: Tree[];
  treeGrid: Map<number, number[]>;
  scenery: Scenery[];
  sceneryGrid: Map<number, number[]>;
  startItems: [ItemKind, number, number][];
  spawn: { x: number; z: number };
  height(x: number, z: number): number;
  slopeY(x: number, z: number): number;      // 1 flat .. 0 vertical
  waterAt(x: number, z: number): number;     // surface height or -1e9
  depth(x: number, z: number): number;       // water depth, 0 if dry
  wetAt(x: number, z: number): number;
  flow(z: number): { x: number; z: number }; // river direction at z
}

export const riverX = (z: number) => 55 * Math.sin(z * 0.011) + 22 * Math.sin(z * 0.029 + 1.3);
const riverHalfWidth = (z: number) => 3 + ((z + HALF) / SIZE) * 3;

/** Height of the valley floor along its length. */
export function floorH(z: number) {
  if (z < -308) {
    const plateau = 62 + (-324 - z) * 0.06;
    const t = smooth(-324, -308, z);
    return plateau * (1 - t) + 22 * t;
  }
  if (z > 250) return 6 + smooth(400, HALF, z) * 10;
  return 22 - (z + 300) * (16 / 550);
}

function lakeRadius(x: number, z: number, seed: number) {
  const a = Math.atan2(z - LAKE.z, x - LAKE.x);
  return LAKE.r * (0.8 + 0.4 * fbm(Math.cos(a) * 1.5 + 5, Math.sin(a) * 1.5 + 5, 2, seed + 9));
}

function erode(h: Float32Array, seed: number, drops: number) {
  // Droplet erosion: each raindrop runs downhill, picking up soil where it is
  // fast and dropping it where it slows. This cuts gullies into the slopes.
  const rnd = mulberry32(seed + 77);
  const at = (x: number, y: number) => h[y * N + x];
  for (let d = 0; d < drops; d++) {
    let x = rnd() * (N - 3) + 1, y = rnd() * (N - 3) + 1;
    let dx = 0, dy = 0, speed = 1, water = 1, sed = 0;
    for (let life = 0; life < 40; life++) {
      const ix = Math.floor(x), iy = Math.floor(y), u = x - ix, v = y - iy;
      const h00 = at(ix, iy), h10 = at(ix + 1, iy), h01 = at(ix, iy + 1), h11 = at(ix + 1, iy + 1);
      const gx = (h10 - h00) * (1 - v) + (h11 - h01) * v;
      const gy = (h01 - h00) * (1 - u) + (h11 - h10) * u;
      dx = dx * 0.3 - gx * 0.7; dy = dy * 0.3 - gy * 0.7;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) break;
      dx /= len; dy /= len;
      const nx = x + dx, ny = y + dy;
      if (nx < 1 || ny < 1 || nx >= N - 2 || ny >= N - 2) break;
      const hOld = h00 * (1 - u) * (1 - v) + h10 * u * (1 - v) + h01 * (1 - u) * v + h11 * u * v;
      const jx = Math.floor(nx), jy = Math.floor(ny), ju = nx - jx, jv = ny - jy;
      const hNew = at(jx, jy) * (1 - ju) * (1 - jv) + at(jx + 1, jy) * ju * (1 - jv)
        + at(jx, jy + 1) * (1 - ju) * jv + at(jx + 1, jy + 1) * ju * jv;
      const dh = hNew - hOld;
      const cap = Math.max(-dh, 0.01) * speed * water * 3;
      const w = [(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v];
      const idx = [iy * N + ix, iy * N + ix + 1, (iy + 1) * N + ix, (iy + 1) * N + ix + 1];
      if (sed > cap || dh > 0) {
        const drop = dh > 0 ? Math.min(dh, sed) : (sed - cap) * 0.3;
        sed -= drop;
        for (let k = 0; k < 4; k++) h[idx[k]] += drop * w[k];
      } else {
        const take = Math.min((cap - sed) * 0.3, -dh);
        sed += take;
        for (let k = 0; k < 4; k++) h[idx[k]] -= take * w[k];
      }
      speed = Math.sqrt(Math.max(0, speed * speed - dh * 0.4));
      water *= 0.98; x = nx; y = ny;
    }
  }
}

export function generateWorld(seed: number, drops = 30000): World {
  const h = new Float32Array(N * N), waterY = new Float32Array(N * N).fill(-1e9), wet = new Float32Array(N * N);
  const wx = (i: number) => i * CELL - HALF;

  // 1. Valley shape: flat floor, steep U-shaped walls, rougher with height.
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = wx(i), z = wx(j), d = Math.abs(x - riverX(z));
    const half = 105 + 45 * fbm(z * 0.004, 3.3, 2, seed);
    const wall = d > half ? Math.pow((d - half) / 170, 1.6) * 95 : 0;
    const amp = 1.5 + smooth(half * 0.5, half + 150, d) * 36;
    const rough = fbm(x * 0.006, z * 0.006, 5, seed + 1) * 2 - 1;
    const detail = (fbm(x * 0.03, z * 0.03, 3, seed + 2) - 0.5) * 1.6 * smooth(8, 40, d);
    h[j * N + i] = floorH(z) + wall + rough * amp + detail;
  }

  // 2. Rain erosion on the raw shape.
  erode(h, seed, drops);

  // 3. Carve the river channel and floodplain, then the lake basin.
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = wx(i), z = wx(j), k0 = j * N + i;
    const d = Math.abs(x - riverX(z)), w = riverHalfWidth(z);
    if (z < 262) {
      const k = 1 - smooth(w, w * 3.2, d);
      const bank = 1 - smooth(w * 0.6, w * 1.5, d);
      h[k0] = h[k0] * (1 - k) + (floorH(z) - 1.3 * bank) * k;
    }
    const dl = Math.hypot(x - LAKE.x, z - LAKE.z), r = lakeRadius(x, z, seed);
    if (dl < r * 1.3) {
      const k = 1 - smooth(r * 0.8, r * 1.3, dl);
      const q = Math.min(dl / r, 1);
      h[k0] = h[k0] * (1 - k) + (LAKE.level - 0.4 - 5 * (1 - q * q)) * k;
    }
  }

  const height = (x: number, z: number) => {
    const fx = Math.min(N - 1.001, Math.max(0, (x + HALF) / CELL)), fz = Math.min(N - 1.001, Math.max(0, (z + HALF) / CELL));
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * N + i;
    return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
  };
  const slopeY = (x: number, z: number) => {
    const e = 2, gx = (height(x + e, z) - height(x - e, z)) / (2 * e), gz = (height(x, z + e) - height(x, z - e)) / (2 * e);
    return 1 / Math.sqrt(1 + gx * gx + gz * gz);
  };

  // 4. River surface: follows the channel bed and can only ever go down.
  const river: RiverPoint[] = [];
  let prev = Infinity;
  for (let z = -HALF + 6; z < LAKE.z; z += 2) {
    const x = riverX(z);
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < lakeRadius(x, z, seed) * 0.85) break;
    let y = Math.max(height(x, z) + 0.6, LAKE.level);
    y = Math.min(y, prev);
    river.push({ x, z, y, w: riverHalfWidth(z), steep: prev === Infinity ? 0 : Math.min(1, (prev - y) / 1.2) });
    prev = y;
  }

  // 5. Water surface grid and wetness.
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = wx(i), z = wx(j), k0 = j * N + i;
    const dl = Math.hypot(x - LAKE.x, z - LAKE.z) - lakeRadius(x, z, seed);
    if (dl < 30 && h[k0] < LAKE.level) waterY[k0] = LAKE.level;
    const dr = Math.abs(x - riverX(z)) - riverHalfWidth(z);
    const dw = z < river[river.length - 1].z ? Math.min(dr, dl) : dl;
    wet[k0] = 1 - smooth(1, 45, dw);
  }
  for (const p of river) {
    const r = Math.ceil((p.w * 1.6) / CELL) + 1, ci = Math.round((p.x + HALF) / CELL), cj = Math.round((p.z + HALF) / CELL);
    for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const k0 = j * N + i;
      if (Math.hypot(wx(i) - p.x, wx(j) - p.z) < p.w * 1.6 + CELL && h[k0] < p.y) waterY[k0] = Math.max(waterY[k0], p.y);
    }
  }
  const cellAt = (x: number, z: number) =>
    Math.min(N - 1, Math.max(0, Math.round((z + HALF) / CELL))) * N + Math.min(N - 1, Math.max(0, Math.round((x + HALF) / CELL)));
  const waterAt = (x: number, z: number) => waterY[cellAt(x, z)];
  const depth = (x: number, z: number) => Math.max(0, waterAt(x, z) - height(x, z));
  const wetAt = (x: number, z: number) => wet[cellAt(x, z)];
  const flow = (z: number) => {
    const dx = riverX(z + 2) - riverX(z - 2), l = Math.hypot(dx, 4);
    return { x: dx / l, z: 4 / l };
  };

  // 6. Plants and loose resources, placed by ground conditions.
  const rnd = mulberry32(seed + 5);
  const spawn = { x: riverX(-60) + 48, z: -60 };
  const trees: Tree[] = [], treeGrid = new Map<number, number[]>(), startItems: [ItemKind, number, number][] = [];
  const STEP = 7;
  for (let gz = -HALF + 10; gz < HALF - 10; gz += STEP) for (let gx = -HALF + 10; gx < HALF - 10; gx += STEP) {
    const x = gx + (rnd() - 0.5) * STEP, z = gz + (rnd() - 0.5) * STEP, roll = rnd(), roll2 = rnd();
    const y = height(x, z), sy = slopeY(x, z), w = wetAt(x, z), d = Math.abs(x - riverX(z));
    if (depth(x, z) > 0 || y < waterAt(x, z) + 0.2) {
      if (depth(x, z) < 0.5 && roll < 0.05) startItems.push(['stone', x, z]);
      continue;
    }
    const nearSpawn = Math.hypot(x - spawn.x, z - spawn.z);
    if (w > 0.75) { // riverbank and lake shore: reeds, gravel, a few willows
      if (roll < 0.10) startItems.push(['fibre', x, z]);
      else if (roll < 0.20) startItems.push(['stone', x, z]);
      else if (roll < 0.26 && w < 0.95 && nearSpawn > 14) addTree(x, z, y, 2, 0.8 + roll2 * 0.5);
      continue;
    }
    if (sy < 0.74 || y > 190 || nearSpawn < 14) continue;
    const patch = fbm(x * 0.012, z * 0.012, 3, seed + 3); // forest vs meadow patches
    const onFloor = d < 150 && y < floorH(z) + 14;
    let p = 0, type: 0 | 1 | 2 = 0;
    if (onFloor) { p = patch > 0.5 ? 0.42 : 0.03; type = roll2 < 0.8 ? 0 : 1; }
    else { p = 0.35 * smooth(0.74, 0.9, sy); type = y > floorH(z) + 45 || roll2 < 0.6 ? 1 : 0; }
    if (roll < p) addTree(x, z, y, type, 0.75 + rnd() * 0.6);
    else if (onFloor && patch > 0.46 && roll > 0.93) startItems.push([roll2 < 0.75 ? 'stick' : 'berry', x, z]);
    else if (onFloor && roll > 0.985) startItems.push(['stone', x, z]);
  }
  function addTree(x: number, z: number, y: number, type: 0 | 1 | 2, s: number) {
    const id = trees.length;
    trees.push({ id, x, z, y, type, s });
    const key = Math.floor((x + HALF) / 8) * 1000 + Math.floor((z + HALF) / 8);
    (treeGrid.get(key) ?? treeGrid.set(key, []).get(key)!).push(id);
  }
  // A few guaranteed resources beside the start so nobody is stranded.
  for (let k = 0; k < 10; k++) {
    const a = rnd() * 6.28, r = 5 + rnd() * 9;
    startItems.push([k < 5 ? 'stick' : k < 8 ? 'stone' : 'berry', spawn.x + Math.cos(a) * r, spawn.z + Math.sin(a) * r]);
  }

  // 7. Undergrowth and dead wood: bushes at the forest edge, fallen logs and old stumps under the trees.
  // Its own random stream, so adding it changes nothing above. Rules and picture both read this list.
  const scenery: Scenery[] = [], sceneryGrid = new Map<number, number[]>(), rs = mulberry32(seed + 31);
  for (let tries = 0; tries < 26000; tries++) {
    const x = (rs() - 0.5) * 960, z = (rs() - 0.5) * 960, roll = rs(), a = rs(), b = rs(), yaw = rs() * 6.283;
    if (depth(x, z) > 0 || slopeY(x, z) < 0.86 || height(x, z) > 150 || wetAt(x, z) > 0.93) continue;
    const patch = fbm(x * 0.012, z * 0.012, 3, seed + 3), inForest = patch > 0.52, edge = patch > 0.43 && patch < 0.58;
    let kind: 0 | 1 | 2, s: number, hl = 0, r: number;
    if (edge && roll < 0.2 || roll < 0.012) { kind = 0; s = 0.55 + a * 0.8; r = s >= BUSH_SOLID ? 0.75 * s + 0.2 : 0; }   // small bushes are knee-high: walk through
    else if (inForest && roll > 0.975) { kind = 1; s = 0.8 + b * 0.5; hl = 2 * (0.7 + a * 0.8); r = 0.26 * s + 0.3; }
    else if (inForest && roll > 0.955) { kind = 2; s = 0.7 + a * 0.7; r = 0.32 * s + 0.3; }
    else continue;
    const ex = Math.sin(yaw) * hl, ez = Math.cos(yaw) * hl, body = Math.max(r - 0.3, 0.2);
    if (Math.hypot(x - spawn.x, z - spawn.z) < SPAWN_CLEAR + hl + 1) continue;
    if (hl > 0 && [-1, -0.5, 0.5, 1].some((k) => depth(x + ex * k, z + ez * k) > 0 || wetAt(x + ex * k, z + ez * k) > 0.93)) continue;
    if (treesNear({ treeGrid } as World, x, z).some((id) => { const t = trees[id]; return segDist(t.x, t.z, x - ex, z - ez, x + ex, z + ez).d < 0.32 * t.s + body + 0.1; })) continue;
    const id = scenery.length, key = Math.floor((x + HALF) / 8) * 1000 + Math.floor((z + HALF) / 8);
    scenery.push({ id, kind, x, z, y: height(x, z), yaw, a, b, s, hl, r });
    (sceneryGrid.get(key) ?? sceneryGrid.set(key, []).get(key)!).push(id);
  }

  return { seed, h, waterY, wet, river, trees, treeGrid, scenery, sceneryGrid, startItems, spawn, height, slopeY, waterAt, depth, wetAt, flow };
}

export function treesNear(w: World, x: number, z: number): number[] {
  const out: number[] = [], cx = Math.floor((x + HALF) / 8), cz = Math.floor((z + HALF) / 8);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const l = w.treeGrid.get((cx + a) * 1000 + cz + b);
    if (l) out.push(...l);
  }
  return out;
}

export const BUSH_SOLID = 0.9;   // bushes at or above this size (about a metre tall) block the way
export const SPAWN_CLEAR = 12;   // metres around the start kept free of undergrowth

/** Distance from a point to the segment a..b, and the nearest point on it. */
export function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
  const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * vx + (pz - az) * vz) / l2)) : 0;
  const qx = ax + vx * t, qz = az + vz * t;
  return { d: Math.hypot(px - qx, pz - qz), x: qx, z: qz };
}

export function sceneryNear(w: World, x: number, z: number): number[] {
  const out: number[] = [], cx = Math.floor((x + HALF) / 8), cz = Math.floor((z + HALF) / 8);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const l = w.sceneryGrid.get((cx + a) * 1000 + cz + b);
    if (l) out.push(...l);
  }
  return out;
}

/** Push a walker out of anything solid it has stepped into: standing trees (unless `trees` is false) and solid scenery.
 *  Only the position is corrected, never the heading, so a walker slides along a log or round a trunk.
 *  `hit` is the centre of the last thing touched, or null. Shared by the player and the rules. */
export function pushOut(w: World, x: number, z: number, cut?: { includes(id: number): boolean } | null, trees = true) {
  let hit: { x: number; z: number } | null = null;
  for (let pass = 0; pass < 2; pass++) {
    let moved = false;
    if (trees) for (const id of treesNear(w, x, z)) {
      if (cut?.includes(id)) continue;
      const t = w.trees[id], r = 0.3 * t.s + 0.3, dx = x - t.x, dz = z - t.z, d = Math.hypot(dx, dz);
      if (d < r && d > 0.001) { x = t.x + (dx / d) * r; z = t.z + (dz / d) * r; hit = t; moved = true; }
    }
    for (const id of sceneryNear(w, x, z)) {
      const o = w.scenery[id]; if (o.r <= 0) continue;
      const ex = Math.sin(o.yaw) * o.hl, ez = Math.cos(o.yaw) * o.hl, q = segDist(x, z, o.x - ex, o.z - ez, o.x + ex, o.z + ez);
      if (q.d >= o.r) continue;
      if (q.d > 0.001) { x = q.x + ((x - q.x) / q.d) * o.r; z = q.z + ((z - q.z) / q.d) * o.r; }
      else { x = q.x + Math.cos(o.yaw) * o.r; z = q.z - Math.sin(o.yaw) * o.r; } // exactly on the axis: step out sideways
      hit = o; moved = true;
    }
    if (!moved) break;
  }
  return { x, z, hit };
}

/** One step for a walker that steers itself (companion, animals): go `step` metres along the unit heading (ux, uz);
 *  if something solid stops most of that, slip sideways round it, on the side away from its middle. */
export function walkStep(w: World, x: number, z: number, ux: number, uz: number, step: number) {
  const p = pushOut(w, x + ux * step, z + uz * step, null, false);
  if (!p.hit || (p.x - x) * ux + (p.z - z) * uz > step * 0.5) return { x: p.x, z: p.z, blocked: false };
  const side = (p.hit.x - x) * -uz + (p.hit.z - z) * ux > 0 ? -1 : 1; // which side of the heading its middle lies on
  const q = pushOut(w, x - uz * side * step, z + ux * side * step, null, false);
  return { x: q.x, z: q.z, blocked: Math.hypot(q.x - x, q.z - z) < step * 0.3 };
}
