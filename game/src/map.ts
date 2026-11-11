// A hand-drawn style map that fills in only where you have walked.
// It also keeps the player's own marks: a waypoint and the named places they have found.
import { World, N, HALF, SIZE } from './worldgen';
import { State } from './sim';
import { Place, findPlaces, near, miniProject, Viewport, clampView, zoomAt, viewToWorld, worldToView } from './places';

const G = 64, PX = 520, MINI_K = [5.2, 2.3]; // minimap: screen pixels per map pixel (4 m) → about 115 m or 260 m across
const WP = '#f2c14e', INK = '#1a140c';
type Me = { x: number; z: number };

export class MapView {
  open = false;
  waypoint: { x: number; z: number } | null = null;
  onPlace: (name: string) => void = () => {};
  private base = document.createElement('canvas');
  private shown = document.createElement('canvas'); // base with the unknown land inked out
  private stale = true;
  private seen = new Uint8Array(G * G);
  private el: HTMLCanvasElement; private key: string; private dirty = 0;
  private places: Place[]; private found = new Set<string>();
  private vp: Viewport = { zoom: 1, ox: 0, oy: 0 };
  private miniZoom = 0; private tick = 0;
  private last: [State, Me, number, string] | null = null;
  private wpEl = document.getElementById('wp');

  constructor(private world: World, el: HTMLCanvasElement) {
    this.el = el; el.width = el.height = PX; this.key = 'beforeus:map:' + world.seed;
    try { const raw = localStorage.getItem(this.key); if (raw) JSON.parse(raw).forEach((i: number) => (this.seen[i] = 1)); } catch { /* start blank */ }
    try { this.waypoint = JSON.parse(localStorage.getItem('beforeus:wp:' + world.seed) ?? 'null'); } catch { /* none */ }
    try { for (const id of JSON.parse(localStorage.getItem('beforeus:places:' + world.seed) ?? '[]')) this.found.add(id); } catch { /* none */ }
    this.places = findPlaces(world);
    this.base.width = this.base.height = this.shown.width = this.shown.height = N;
    const c = this.base.getContext('2d')!, img = c.createImageData(N, N), w = world;
    for (let k = 0; k < N * N; k++) {
      const i = k % N, j = Math.floor(k / N), x = i * 4 - HALF, z = j * 4 - HALF, y = w.h[k];
      const sy = w.slopeY(x, z), shade = 0.8 + 0.2 * Math.min(1, Math.max(-1, (w.h[Math.min(N * N - 1, k + 1)] - y) * 0.25));
      let r = 196, g = 178, b = 132;                                   // parchment land
      if (w.waterY[k] > y) { r = 96; g = 132; b = 150; }                // water
      else if (sy < 0.72) { r = 150; g = 138; b = 120; }                // rock
      else if (y > 215) { r = 232; g = 228; b = 218; }                  // snow
      else if (w.wet[k] > 0.5) { r = 168; g = 176; b = 112; }           // lush ground
      img.data.set([r * shade, g * shade, b * shade, 255], k * 4);
    }
    c.putImageData(img, 0, 0);
    c.fillStyle = 'rgba(70,92,48,0.55)';
    for (const t of w.trees) c.fillRect((t.x + HALF) / 4 - 0.6, (t.z + HALF) / 4 - 0.6, 1.4, 1.4);
    this.controls();
  }

  private isSeen(x: number, z: number) {
    const i = Math.floor(((x + HALF) / SIZE) * G), j = Math.floor(((z + HALF) / SIZE) * G);
    return i >= 0 && j >= 0 && i < G && j < G && !!this.seen[j * G + i];
  }

  private setWaypoint(p: { x: number; z: number } | null) {
    this.waypoint = p;
    try { if (p) localStorage.setItem('beforeus:wp:' + this.world.seed, JSON.stringify(p)); else localStorage.removeItem('beforeus:wp:' + this.world.seed); } catch { /* ignore */ }
    this.redraw();
  }

  /** Mouse on the open map: wheel zooms around the cursor, drag pans, a plain click sets or clears the waypoint. */
  private controls() {
    const el = this.el, at = (e: MouseEvent) => { const k = PX / (el.clientWidth || PX); return [e.offsetX * k, e.offsetY * k]; };
    let drag: { x: number; y: number; ox: number; oy: number; moved: boolean } | null = null;
    el.addEventListener('wheel', (e) => {
      e.preventDefault(); const [x, y] = at(e);
      this.vp = zoomAt(this.vp, x, y, e.deltaY < 0 ? 1.25 : 0.8, PX); this.redraw();
    }, { passive: false });
    el.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY, ox: this.vp.ox, oy: this.vp.oy, moved: false }; e.preventDefault(); });
    addEventListener('mousemove', (e) => {
      if (!drag) return;
      const k = PX / (el.clientWidth || PX), dx = (e.clientX - drag.x) * k, dy = (e.clientY - drag.y) * k;
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
      if (drag.moved) { this.vp = clampView({ zoom: this.vp.zoom, ox: drag.ox - dx / this.vp.zoom, oy: drag.oy - dy / this.vp.zoom }, PX); this.redraw(); }
    });
    addEventListener('mouseup', (e) => {
      const d = drag; drag = null;
      if (!d || d.moved || e.target !== el) return;
      const [x, y] = at(e), w = viewToWorld(this.vp, x, y, PX);
      if (this.waypoint) { const q = worldToView(this.vp, this.waypoint.x, this.waypoint.z, PX); if (Math.hypot(q.x - x, q.y - y) < 12) return this.setWaypoint(null); }
      if (this.isSeen(w.x, w.z)) this.setWaypoint(w);
    });
    addEventListener('keydown', (e) => {
      if (e.repeat || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'KeyN') this.miniZoom = 1 - this.miniZoom;
      else if (e.code === 'KeyX' && this.waypoint) this.setWaypoint(null);
    });
  }

  reveal(x: number, z: number) {
    const ci = Math.floor(((x + HALF) / SIZE) * G), cj = Math.floor(((z + HALF) / SIZE) * G), r = 5;
    for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
      if (i < 0 || j < 0 || i >= G || j >= G || (i - ci) ** 2 + (j - cj) ** 2 > r * r) continue;
      if (!this.seen[j * G + i]) { this.seen[j * G + i] = 1; this.dirty++; this.stale = true; }
    }
    if (this.dirty > 20) { this.dirty = 0; try { localStorage.setItem(this.key, JSON.stringify([...this.seen.keys()].filter((i) => this.seen[i]))); } catch { /* ignore */ } }
  }

  /** Name a place the first time the player stands near it. */
  private discover(s: State, me: Me) {
    const hit = (id: string, name: string) => {
      if (this.found.has(id)) return;
      this.found.add(id); this.onPlace(name); this.redraw();
      try { localStorage.setItem('beforeus:places:' + this.world.seed, JSON.stringify([...this.found])); } catch { /* ignore */ }
    };
    for (const p of this.places) if (near(p, me.x, me.z)) hit(p.id, p.name);
    const fire = this.firstFire(s);
    if (fire && Math.hypot(fire.x - me.x, fire.z - me.z) < 12) hit('fire', 'The First Fire');
    if (s.shelter && Math.hypot(s.shelter.x - me.x, s.shelter.z - me.z) < 12) hit('shelter', 'The Shelter');
  }
  private firstFire(s: State) { return s.fires.length ? s.fires.reduce((a, f) => (f.id < a.id ? f : a)) : null; }

  private land() {
    if (this.stale) {
      this.stale = false;
      const c = this.shown.getContext('2d')!, cell = (N - 1) / G;
      c.drawImage(this.base, 0, 0); c.fillStyle = '#3b3122';
      for (let k = 0; k < G * G; k++) if (!this.seen[k]) c.fillRect((k % G) * cell - 0.3, Math.floor(k / G) * cell - 0.3, cell + 0.6, cell + 0.6);
    }
    return this.shown;
  }

  /** Small ink drawings for the named places. */
  private icon(c: CanvasRenderingContext2D, kind: string, x: number, y: number, s = 1) {
    c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 1.6; c.lineCap = 'round'; c.lineJoin = 'round';
    c.fillStyle = '#efe6cc'; c.strokeStyle = INK; c.beginPath(); c.arc(0, 0, 8.5, 0, 6.3); c.fill(); c.stroke();
    c.beginPath();
    if (kind === 'falls') { c.strokeStyle = '#2f5e78'; for (const q of [-3.5, 0, 3.5]) { c.moveTo(q, -5); c.lineTo(q, q === 0 ? 5 : 3); } }
    else if (kind === 'lake') { c.strokeStyle = '#2f5e78'; for (const q of [-2.5, 2.5]) { c.moveTo(-5, q); c.quadraticCurveTo(-2.5, q - 3, 0, q); c.quadraticCurveTo(2.5, q + 3, 5, q); } }
    else if (kind === 'plateau') { c.strokeStyle = '#5a4a38'; c.moveTo(-6, 4); c.lineTo(-3, -3.5); c.lineTo(3, -3.5); c.lineTo(6, 4); }
    else if (kind === 'ford') { c.strokeStyle = '#2f5e78'; c.moveTo(-6, -4); c.lineTo(6, -4); c.moveTo(-6, 4); c.lineTo(6, 4); c.stroke(); c.beginPath(); c.fillStyle = '#5a4a38'; for (const q of [-3.5, 0, 3.5]) { c.moveTo(q + 1.4, 0); c.arc(q, 0, 1.4, 0, 6.3); } c.fill(); c.beginPath(); }
    c.stroke(); c.restore();
  }
  private diamond(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
    c.fillStyle = WP; c.strokeStyle = INK; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.75, y); c.lineTo(x, y + r); c.lineTo(x - r * 0.75, y); c.closePath(); c.fill(); c.stroke();
  }

  /** Corner minimap: turns with the camera so that "ahead" is always up. N switches between a near and a far view. */
  mini(el: HTMLCanvasElement, s: State, me: Me, yaw: number, myId: string, night: boolean) {
    if (--this.tick < 0) { this.tick = 20; this.discover(s, me); }
    const c = el.getContext('2d')!, R = el.width / 2, k = MINI_K[this.miniZoom];
    c.save(); c.clearRect(0, 0, el.width, el.height);
    c.beginPath(); c.arc(R, R, R - 2, 0, 6.3); c.clip();
    c.fillStyle = '#3b3122'; c.fillRect(0, 0, el.width, el.height);
    c.translate(R, R); c.rotate(yaw + Math.PI); c.scale(k, k);
    const mx = (me.x + HALF) / 4, mz = (me.z + HALF) / 4;
    c.imageSmoothingEnabled = true; c.drawImage(this.land(), -mx, -mz);
    const dot = (x: number, z: number, col: string, r: number) => { c.fillStyle = col; c.beginPath(); c.arc((x + HALF) / 4 - mx, (z + HALF) / 4 - mz, r / k, 0, 6.3); c.fill(); };
    for (const f of s.fires) dot(f.x, f.z, f.lit ? '#ff8a2a' : '#6b5a48', 4);
    if (s.shelter) dot(s.shelter.x, s.shelter.z, '#5a3d22', 5);
    for (const a of s.animals) if (a.k === 'wolf' && a.st !== 'dead' && night) dot(a.x, a.z, '#e03030', 3.5);
    for (const p of Object.values(s.players)) if (p.online && p.id !== myId) dot(p.x, p.z, p.npc ? '#ffb0e0' : '#9ad0ff', 4);
    c.restore();
    c.save(); c.beginPath(); c.arc(R, R, R - 2, 0, 6.3); c.clip();
    for (const p of this.places) if (this.found.has(p.id)) {
      const q = miniProject(p.x - me.x, p.z - me.z, yaw, k / 4, R, -20);
      if (!q.out) this.icon(c, p.kind, q.x, q.y, 0.72);
    }
    c.restore();
    if (this.waypoint) {
      const dx = this.waypoint.x - me.x, dz = this.waypoint.z - me.z, q = miniProject(dx, dz, yaw, k / 4, R, 10);
      if (q.out) { // on the rim, with a small arrow pointing the way
        c.save(); c.translate(q.x, q.y); c.rotate(q.ang); c.fillStyle = WP; c.strokeStyle = INK; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(8, 0); c.lineTo(-3, -6); c.lineTo(-0.5, 0); c.lineTo(-3, 6); c.closePath(); c.fill(); c.stroke(); c.restore();
      } else this.diamond(c, q.x, q.y, 7);
      if (this.wpEl) { this.wpEl.style.display = 'block'; const t = '◆ ' + Math.round(Math.hypot(dx, dz)) + ' m'; if (this.wpEl.textContent !== t) this.wpEl.textContent = t; }
    } else if (this.wpEl && this.wpEl.style.display !== 'none') this.wpEl.style.display = 'none';
    c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(R, R - 8); c.lineTo(R + 5.5, R + 6); c.lineTo(R, R + 2.5); c.lineTo(R - 5.5, R + 6); c.closePath(); c.fill(); c.stroke();
    // North marker on the rim.
    const na = yaw + Math.PI - Math.PI / 2; c.fillStyle = '#f1ece2'; c.font = '600 11px sans-serif';
    c.fillText('N', R + Math.cos(na) * (R - 11) - 4, R + Math.sin(na) * (R - 11) + 4);
  }

  toggle() {
    this.open = !this.open; this.el.style.display = this.open ? 'block' : 'none';
    if (this.open) { document.exitPointerLock?.(); this.redraw(); }
  }
  private redraw() { if (this.last) this.draw(...this.last); }

  draw(s: State, me: Me, yaw: number, myId: string) {
    this.last = [s, me, yaw, myId];
    if (!this.open) return;
    const c = this.el.getContext('2d')!, v = this.vp, P = (x: number, z: number) => worldToView(v, x, z, PX);
    c.fillStyle = '#3b3122'; c.fillRect(0, 0, PX, PX);
    c.imageSmoothingEnabled = true; c.drawImage(this.land(), -v.ox * v.zoom, -v.oy * v.zoom, PX * v.zoom, PX * v.zoom);
    const label = (text: string, x: number, y: number) => {
      c.font = 'italic 12px Georgia, serif'; c.lineWidth = 3; c.strokeStyle = 'rgba(239,230,204,0.8)'; c.strokeText(text, x, y); c.fillStyle = INK; c.fillText(text, x, y);
    };
    const dot = (x: number, z: number, col: string, r: number) => { const q = P(x, z); c.fillStyle = col; c.beginPath(); c.arc(q.x, q.y, r, 0, 6.3); c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); };
    for (const p of this.places) if (this.found.has(p.id)) { const q = P(p.x, p.z); this.icon(c, p.kind, q.x, q.y); label(p.name, q.x + 12, q.y + 4); }
    for (const f of s.fires) dot(f.x, f.z, f.lit ? '#ff8a2a' : '#6b5a48', 5);
    const ff = this.firstFire(s);
    if (ff && this.found.has('fire')) { const q = P(ff.x, ff.z); label('The First Fire', q.x + 9, q.y - 6); }
    if (s.shelter) { const q = P(s.shelter.x, s.shelter.z); c.fillStyle = '#5a3d22'; c.fillRect(q.x - 6, q.y - 5, 12, 10); if (this.found.has('shelter')) label('The Shelter', q.x + 9, q.y + 14); }
    for (const p of Object.values(s.players)) if (p.online && p.id !== myId) dot(p.x, p.z, p.npc ? '#d8a0c8' : '#9ad0ff', 5);
    if (this.waypoint) {
      const q = P(this.waypoint.x, this.waypoint.z), m = P(me.x, me.z);
      c.strokeStyle = 'rgba(26,20,12,0.55)'; c.lineWidth = 1.2; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(q.x, q.y); c.stroke(); c.setLineDash([]);
      this.diamond(c, q.x, q.y, 9);
      label(Math.round(Math.hypot(this.waypoint.x - me.x, this.waypoint.z - me.z)) + ' m', q.x + 10, q.y - 8);
    }
    const m = P(me.x, me.z);
    c.save(); c.translate(m.x, m.y); c.rotate(-yaw + Math.PI); c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 7); c.lineTo(0, 3); c.lineTo(-6, 7); c.closePath(); c.fill(); c.stroke(); c.restore();
    c.fillStyle = '#e8dfc8'; c.font = '600 13px Georgia, serif';
    c.lineWidth = 3; c.strokeStyle = 'rgba(26,20,12,0.7)';
    for (const [t, x, y] of [['N', PX / 2 - 4, 16], ['The First Valley', 12, PX - 12]] as [string, number, number][]) { c.strokeText(t, x, y); c.fillText(t, x, y); }
    c.font = '11px sans-serif'; const hint = 'click: mark · X: clear · wheel: zoom · drag: move';
    c.strokeText(hint, PX - 12 - c.measureText(hint).width, PX - 12); c.fillText(hint, PX - 12 - c.measureText(hint).width, PX - 12);
  }
}
