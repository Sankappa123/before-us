// Starts the game, reads input, runs the loop, and ties host and guest together.
import { generateWorld, World, treesNear, pushOut, LAKE, riverX } from './worldgen';
import { Sim, State, Action, GameEvent, isNight, SHELTER_LOGS, SHELTER_THATCH } from './sim';
import { Scene3D } from './scene';
import { Entities } from './entities';
import { loadActors } from './actors';
import { Birds } from './birds';
import { MapView } from './map';
import { STORY, COMPANION } from './story';
import { initMenus, loadSettings, Settings } from './menus';

let settings = loadSettings();
function applySettings(s: Settings) {
  settings = s;
  if (s.scale > 0) { scale = s.scale; view.resize(innerWidth, innerHeight, scale); }
  view.setQuality(s.grass, s.shadows); sound.setVolume(s.volume);
}
import { Sound } from './audio';
import { Link, localLink, onlineLink } from './net';
import { WorldStore, browserSaveChanged, SAVE, DEFAULT_DB } from './store';

const $ = (id: string) => document.getElementById(id)!;
const params = new URLSearchParams(location.search);
let store: WorldStore | null = null, linkText = '';
const sound = new Sound();

let birds: Birds, map: MapView, mapT = 0;
let world: World, view: Scene3D, ents: Entities, link: Link | null = null, sim: Sim | null = null;
let state: State, myId = '', isHost = true, room = '';
const me = { x: 0, y: 0, z: 0, ry: 0, vy: 0, spd: 0, crouch: false, mode: 0, ground: true };
let yaw = Math.PI, pitch = -0.12;
const keys = new Set<string>();
let target: { label: string; act: Action } | null = null;
let lastSnap = performance.now(), fps = 60, scale = Math.min(1, window.devicePixelRatio || 1), slowFor = 0;

// ---------- menu ----------
let ch = Number(params.get('ch') ?? 1);
const nameBox = $('name') as HTMLInputElement;
nameBox.value = params.get('name') ?? localStorage.getItem('beforeus:name') ?? '';
const pickCh = (c: number) => { ch = c; $('ch0').classList.toggle('sel', c === 0); $('ch1').classList.toggle('sel', c === 1); };
pickCh(ch);
$('ch0').onclick = () => pickCh(0); $('ch1').onclick = () => pickCh(1);
if (params.get('join')) { $('saveTools').style.display = 'none'; $('status').textContent = 'Joining your friend’s world.'; }
else if (localStorage.getItem(SAVE)) $('status').textContent = 'A saved world was found and will be continued.';
$('newWorld').onclick = () => { if (confirm('Delete the saved world and start again?')) { localStorage.removeItem(SAVE); browserSaveChanged(); $('status').textContent = 'A new world will be created.'; } };
$('exportSave').onclick = () => {
  const data = localStorage.getItem(SAVE); if (!data) { $('status').textContent = 'Nothing saved yet.'; return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = 'before-us-save.json'; a.click();
};
$('importSave').onclick = () => ($('importFile') as HTMLInputElement).click();
($('importFile') as HTMLInputElement).onchange = async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
  try { const s = JSON.parse(await f.text()); if (s.v !== 1 || !s.players) throw 0; localStorage.setItem(SAVE, JSON.stringify(s)); browserSaveChanged(); $('status').textContent = 'Save imported.'; }
  catch { $('status').textContent = 'That file is not a BEFORE US save.'; }
};
$('go').onclick = () => start().catch((e) => { console.error(e); $('status').textContent = 'Could not start: ' + (e?.message ?? e); });
if (params.get('auto')) start();

function toast(text: string) {
  if (!text) return;
  const t = $('toast'); t.textContent = text; t.style.opacity = '1';
  clearTimeout((toast as any).h); (toast as any).h = setTimeout(() => (t.style.opacity = '0'), 3500);
}

// ---------- start ----------
async function start() {
  sound.start();
  const name = (nameBox.value.trim() || (params.get('join') ? 'Friend' : 'Host')).slice(0, 16);
  localStorage.setItem('beforeus:name', name); localStorage.setItem('beforeus:ch', String(ch));
  isHost = !params.get('join');
  room = params.get('join') ?? params.get('room') ?? localStorage.getItem('beforeus:room') ?? Math.random().toString(36).slice(2, 7);
  if (isHost) localStorage.setItem('beforeus:room', room);
  const local = !!params.get('local');
  $('status').textContent = 'Connecting…';
  try {
    link = local ? localLink(room) : await onlineLink(room, isHost);
    await Promise.race([link.ready, new Promise((_, rej) => setTimeout(() => rej(new Error('timed out')), 12000))]);
  } catch (e: any) {
    link = null;
    if (!isHost) throw new Error('could not reach the host (' + (e?.type ?? e?.message ?? e) + ')');
    console.warn('Playing without a connection:', e);
  }

  if (isHost) {
    let saved: State | undefined;
    const fresh = !!params.get('fresh');
    store = new WorldStore(room, params.get('db') ?? DEFAULT_DB);
    if (!fresh) { $('status').textContent = 'Looking for your saved world…'; saved = (await store.load()).state; }
    store.onChange = (w) => { showLink(); toast(w === 'database' ? 'Saved to database' : 'Database not reachable. Saved in this browser only.'); };
    $('status').textContent = 'Shaping the valley…';
    await new Promise((r) => setTimeout(r, 30));
    world = generateWorld(saved?.seed ?? Number(params.get('seed') ?? Math.floor(Math.random() * 1e6)));
    sim = new Sim(world, saved); state = sim.state;
    myId = 'p:' + name.toLowerCase();
    const p = sim.join(myId, name, ch);
    Object.assign(me, { x: p.x, y: p.y, z: p.z, ry: p.ry });
    hostNetwork();
    await begin(local);
    setInterval(hostTick, 33);
    setInterval(save, 45000);
    addEventListener('pagehide', save);
  } else {
    const l = link!;
    await new Promise<void>((resolve) => {
      const hello = () => l.send({ t: 'hello', name, ch });
      const timer = setInterval(hello, 1000); hello();
      l.onMessage = (m) => {
        if (m.t === 'welcome') {
          clearInterval(timer);
          myId = m.id; state = m.state;
          $('status').textContent = 'Shaping the valley…';
          setTimeout(() => { world = generateWorld(m.seed); const p = state.players[myId]; Object.assign(me, { x: p.x, y: p.y, z: p.z, ry: p.ry }); resolve(); }, 30);
        } else guestMessage(m);
      };
    });
    await begin(local);
    setInterval(() => link!.send({ t: 'pos', x: me.x, y: me.y, z: me.z, ry: me.ry, spd: me.spd, mode: me.mode, crouch: me.crouch }), 66);
  }
}

async function begin(local: boolean) {
  $('status').textContent = 'Waking the people…';
  await loadActors();
  const canvas = $('c') as HTMLCanvasElement;
  view = new Scene3D(canvas, world); ents = new Entities(view, world);
  birds = new Birds(view.scene, me.x, me.z); map = new MapView(world, $('map') as HTMLCanvasElement);
  map.onPlace = (n) => toast('You have found ' + n);
  initMenus({ state: () => state, myId: () => myId, act: doAct, apply: applySettings, settings, preview: (n) => { previewWho = n; } });
  applySettings(settings);
  const fit = () => view.resize(innerWidth, innerHeight, scale);
  addEventListener('resize', fit); fit();
  $('menu').style.display = 'none';
  const url = location.origin + location.pathname + '?join=' + room + (local ? '&local=1' : '');
  linkText = isHost ? (link ? 'Friend’s link: ' + url : 'Playing alone (no connection)') : 'Joined ' + room;
  showLink();
  $('link').onclick = () => { navigator.clipboard?.writeText(url); toast('Link copied'); };
  input(canvas);
  let last = performance.now();
  const loop = (now: number) => { const dt = Math.min(0.1, (now - last) / 1000); last = now; frame(dt); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  toast(`${COMPANION}: ${STORY[state.story ?? 0].line}`);
  (window as any).game = { get state() { return state; }, me, get sim() { return sim; }, act: doAct, get fps() { return fps; }, get scale() { return scale; }, get target() { return target; }, look: (y: number, p: number) => { yaw = y; pitch = p; }, zoom: (d: number) => { camDist = d; }, view: () => view, get map() { return map; } };
}

// ---------- host ----------
const peers = new Map<string, { pid: string; seen: number }>();
let lastRev = -1, sinceSnap = 0, lastTick = performance.now();
let pending: GameEvent[] = [];

function hostNetwork() {
  if (!link) return;
  link.onMessage = (m, from) => {
    const s = sim!;
    if (m.t === 'hello') {
      let pid = 'p:' + String(m.name).toLowerCase(); if (pid === myId) pid += '-2';
      peers.set(from, { pid, seen: performance.now() });
      s.join(pid, m.name, m.ch);
      link!.send({ t: 'welcome', id: pid, seed: world.seed, state: s.state }, from);
      toast(m.name + ' has arrived');
      return;
    }
    const peer = peers.get(from); if (!peer) return;
    peer.seen = performance.now();
    const p = s.state.players[peer.pid]; if (!p) return;
    if (m.t === 'pos') { if (!p.online) p.online = true; p.x = m.x; p.y = m.y; p.z = m.z; p.ry = m.ry; p.spd = m.spd; p.mode = m.mode; p.crouch = m.crouch; }
    else if (m.t === 'act') { const text = s.act(peer.pid, m.a); if (text) link!.send({ t: 'msg', text }, from); }
  };
  link.onLeave = (from) => { const peer = peers.get(from); if (peer) { sim!.leave(peer.pid); peers.delete(from); toast('Your friend has left'); } };
}

function hostTick() {
  const s = sim!, now = performance.now();
  let dt = Math.min(1.5, (now - lastTick) / 1000); lastTick = now;
  const p = s.state.players[myId];
  Object.assign(p, { x: me.x, y: me.y, z: me.z, ry: me.ry, spd: me.spd, mode: me.mode, crouch: me.crouch });
  for (const [from, peer] of peers) if (now - peer.seen > 8000) { s.leave(peer.pid); peers.delete(from); toast('Your friend has left'); }
  while (dt > 0) { const h = Math.min(0.05, dt); s.step(h); dt -= h; }
  const ev = s.events.splice(0);
  for (const e of ev) { if (e.e === 'death' && e.who === myId) Object.assign(me, { x: p.x, y: p.y, z: p.z }); if (e.e === 'morning') save(); }
  handleEvents(ev); pending.push(...ev);
  sinceSnap += 33;
  if (link && sinceSnap >= 100) {
    sinceSnap = 0;
    const st = s.state, snap: any = { day: st.day, time: st.time, wind: st.wind, players: st.players, fires: st.fires, shelter: st.shelter, animals: st.animals, rev: st.rev, story: st.story };
    if (st.rev !== lastRev) { snap.items = st.items; snap.cut = st.cut; lastRev = st.rev; }
    link.send({ t: 'snap', s: snap, ev: pending }); pending = [];
  }
}

function save() { if (sim && store) store.save(sim.state); }
function showLink() { const where = store?.label(); $('link').textContent = linkText + (where ? ' · ' + where : ''); }

// ---------- guest ----------
function guestMessage(m: any) {
  if (m.t === 'snap') {
    lastSnap = performance.now();
    state = { ...state, ...m.s };
    for (const e of m.ev as GameEvent[]) if (e.e === 'death' && e.who === myId) { const p = state.players[myId]; Object.assign(me, { x: p.x, y: p.y, z: p.z }); }
    handleEvents(m.ev);
  } else if (m.t === 'msg') toast(m.text);
  else if (m.t === 'welcome') { state = m.state; lastRev = -1; } // host restarted
}

function handleEvents(ev: GameEvent[]) {
  for (const e of ev) {
    sound.event(e.e, Math.hypot(e.x - me.x, e.z - me.z));
    if (e.e === 'morning') toast(isHost ? 'Morning. The world has been saved.' : 'Morning.');
    else if (e.e === 'death' && e.who === myId) toast('You wake by the first camp. What you carried lies where you fell.');
    else if (e.e === 'bite' && e.who === myId) toast('A wolf bites you');
    else if (e.e === 'howl') toast('Wolves are near. Stay by a fire.');
    else if (e.e === 'cooked') toast('The meat is cooked');
    else if (e.e === 'fall') toast('The tree comes down');
    else if (e.e === 'story') toast(`${COMPANION}: ${STORY[state.story].line}`);
    else if (e.e === 'say' && e.who) toast(`${COMPANION}: ${e.who}`);
  }
}

function doAct(a: Action) {
  if (isHost) toast(sim!.act(myId, a));
  else link?.send({ t: 'act', a });
}

// ---------- input ----------
function input(canvas: HTMLCanvasElement) {
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    const p = state.players[myId]; if (!p) return;
    if (e.code === 'KeyE' && target) doAct(target.act);
    else if (e.code === 'Digit1') doAct({ a: 'craft', r: 'flake' });
    else if (e.code === 'Digit2') doAct({ a: 'craft', r: 'axe' });
    else if (e.code === 'Digit3') doAct({ a: 'fire' });
    else if (e.code === 'Digit4') doAct({ a: 'shelter' });
    else if (e.code === 'KeyF') doAct({ a: 'eat' });
    else if (e.code === 'KeyG') doAct({ a: 'drop', k: 'log' });
    else if (e.code === 'KeyM') { map.toggle(); document.body.classList.toggle('map-open', map.open); }
    else if (e.code === 'KeyH') doAct({ a: 'style' });
    else if (e.code === 'KeyJ') doAct({ a: 'style', npc: true });
    else if (e.code === 'KeyO') doAct({ a: 'dress' });
    else if (e.code === 'KeyP') doAct({ a: 'dress', npc: true });
    else if (e.code === 'KeyQ') {
      let best = -1, bd = 18;
      for (const an of state.animals) {
        if (an.st === 'dead') continue;
        const dx = an.x - me.x, dz = an.z - me.z, d = Math.hypot(dx, dz);
        if (d < bd && (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / (d || 1) > 0.4) { bd = d; best = an.id; }
      }
      if (best >= 0) doAct({ a: 'throw', id: best }); else toast('Nothing in range to throw at');
    }
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  canvas.addEventListener('click', () => { sound.start(); canvas.requestPointerLock?.(); });
  canvas.addEventListener('wheel', (e) => { if (map.open) return; camDist = Math.max(1.3, Math.min(9, camDist + Math.sign(e.deltaY) * 0.4)); e.preventDefault(); }, { passive: false });
  let drag = false;
  canvas.addEventListener('mousedown', () => (drag = true)); addEventListener('mouseup', () => (drag = false));
  addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas && !drag) return;
    yaw -= e.movementX * 0.0025 * settings.sens; pitch = Math.max(-1.1, Math.min(0.6, pitch - e.movementY * 0.002 * settings.sens * (settings.invert ? -1 : 1)));
  });
}

// ---------- per-frame ----------
function movePlayer(dt: number) {
  const p = state.players[myId]; if (!p) return;
  if (keys.has('ArrowLeft')) yaw += dt * 1.8; if (keys.has('ArrowRight')) yaw -= dt * 1.8;
  if (keys.has('ArrowUp')) pitch = Math.min(0.6, pitch + dt); if (keys.has('ArrowDown')) pitch = Math.max(-1.1, pitch - dt);
  let fz = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0), fx = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  if (p.asleep) fx = fz = 0;
  let dx = Math.sin(yaw) * fz - Math.cos(yaw) * fx, dz = Math.cos(yaw) * fz + Math.sin(yaw) * fx;
  const l = Math.hypot(dx, dz), depth = world.depth(me.x, me.z), swim = depth > 1.35, logs = p.inv.log ?? 0;
  me.crouch = keys.has('KeyC') && !swim;
  const sprint = keys.has('ShiftLeft') && p.stamina > 3 && !me.crouch && !swim && l > 0 && logs === 0;
  let sp = swim ? 1.9 : me.crouch ? 1.7 : sprint ? 6.6 : 4.2;
  if (!swim && depth > 0.45) sp *= 0.55; if (logs > 0) sp *= 0.75;
  let vx = 0, vz = 0;
  if (l > 0) {
    dx /= l; dz /= l; vx = dx * sp; vz = dz * sp;
    let d = Math.atan2(dx, dz) - me.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); me.ry += d * (1 - Math.exp(-dt * 12));
  }
  if (depth > 0.3 && me.z < world.river[world.river.length - 1].z) { const f = world.flow(me.z), c = Math.min(1.6, depth) * 0.9; vx += f.x * c; vz += f.z * c; }
  const ox = me.x, oz = me.z;
  for (const [mx, mz] of [[vx * dt, vz * dt], [vx * dt, 0], [0, vz * dt]]) {
    const nx = me.x + mx, nz = me.z + mz;
    if (Math.abs(nx) > 500 || Math.abs(nz) > 500) continue;
    if (world.height(nx, nz) > me.y + 0.02 && world.slopeY(nx, nz) < 0.55 && world.depth(nx, nz) < 1.2) continue; // too steep to climb
    me.x = nx; me.z = nz; break;
  }
  { const q = pushOut(world, me.x, me.z, state.cut); me.x = q.x; me.z = q.z; } // trees, fallen logs, big bushes, old stumps
  const ground = world.depth(me.x, me.z) > 1.35 ? world.waterAt(me.x, me.z) - 1.3 : world.height(me.x, me.z);
  if (keys.has('Space') && me.ground && !swim && !p.asleep) { me.vy = 5.2; me.ground = false; }
  if (!me.ground || me.y > ground + 0.35) { me.vy -= 16 * dt; me.y += me.vy * dt; me.ground = false; if (me.y <= ground) { me.y = ground; me.vy = 0; me.ground = true; } }
  else { me.y = ground; me.vy = 0; }
  me.spd = Math.hypot(me.x - ox, me.z - oz) / Math.max(dt, 1e-4);
  me.mode = world.depth(me.x, me.z) > 1.35 ? 2 : sprint ? 1 : 0;
}

const NAMES: Record<string, string> = { stick: 'stick', stone: 'stone', fibre: 'reeds for fibre', berry: 'berries', flake: 'sharp flake', log: 'log', meat: 'raw meat', cooked: 'cooked meat' };
function findTarget(): typeof target {
  const p = state.players[myId]; if (!p || p.asleep) return p?.asleep ? { label: 'E  Get up', act: { a: 'sleep' } } : null;
  const near = (x: number, z: number) => Math.hypot(x - me.x, z - me.z);
  for (const a of state.animals) if (a.st === 'dead' && near(a.x, a.z) < 3) return { label: 'E  Butcher the ' + a.k, act: { a: 'harvest', id: a.id } };
  const fire = state.fires.map((f) => ({ f, d: near(f.x, f.z) })).sort((a, b) => a.d - b.d)[0];
  const fireTarget = () => {
    const f = fire.f;
    const label = f.ready > 0 ? 'Take cooked meat' : !f.lit ? 'Light the fire (2 stones + fibre)' : p.inv.meat && f.cookT <= 0 ? 'Cook meat' : p.inv.log || p.inv.stick ? `Add fuel (${Math.ceil(f.fuel)}s left)` : f.cookT > 0 ? `Cooking… ${Math.ceil(f.cookT)}s` : `Fire (${Math.ceil(f.fuel)}s of fuel)`;
    return { label: 'E  ' + label, act: { a: 'useFire', id: f.id } as Action };
  };
  if (fire && fire.d < 2.2) return fireTarget();
  const npc = Object.values(state.players).find((q) => q.npc);
  if (npc && near(npc.x, npc.z) < 3 && Object.keys(npc.inv).length) return { label: `E  Take what ${npc.name} gathered`, act: { a: 'npcGive' } };
  let bi = -1, bd = 2.6;
  for (const it of state.items) { const d = near(it[2], it[3]); if (d < bd) { bd = d; bi = it[0]; } }
  if (bi >= 0) { const it = state.items.find((q) => q[0] === bi)!; return { label: 'E  Pick up ' + NAMES[it[1]], act: { a: 'pickup', id: bi } }; }
  const sh = state.shelter;
  if (sh && near(sh.x, sh.z) < 4.5) {
    if (!sh.done) return { label: `E  Add to shelter (logs ${sh.logs}/${SHELTER_LOGS}, thatch ${sh.thatch}/${SHELTER_THATCH})`, act: { a: 'build' } };
    if (isNight(state.time)) return { label: 'E  Sleep until morning', act: { a: 'sleep' } };
  }
  if (p.axe > 0) {
    let ti = -1, td = 3.2;
    for (const id of treesNear(world, me.x, me.z)) { if (state.cut.includes(id)) continue; const t = world.trees[id], d = near(t.x, t.z); if (d < td) { td = d; ti = id; } }
    if (ti >= 0) return { label: `E  Chop (${state.treeHp?.[ti] ?? 5} blows left)`, act: { a: 'chop', id: ti } };
    for (const a of state.animals) if (a.st !== 'dead' && near(a.x, a.z) < 2.8) return { label: 'E  Strike the ' + a.k, act: { a: 'hit', id: a.id } };
  }
  if (fire && fire.d < 3.2) return fireTarget();
  if (p.thirst < 92) for (let a = 0; a < 6.28; a += 0.785) if (world.depth(me.x + Math.cos(a) * 1.8, me.z + Math.sin(a) * 1.8) > 0.05) return { label: 'E  Drink', act: { a: 'drink' } };
  return null;
}

let hudT = 0, promptText = '', upT = 0, fastFor = 0;
let camDist = 4.4, previewWho = -1;
function hud(dt: number) {
  const p = state.players[myId]; if (!p) return;
  const text = target?.label ?? '';
  if (text !== promptText) { promptText = text; const el = $('prompt'); el.textContent = text; el.style.display = text ? 'block' : 'none'; }
  hudT -= dt; if (hudT > 0) return; hudT = 0.2;
  for (const k of ['health', 'hunger', 'thirst', 'stamina'] as const) $('b-' + k).style.width = Math.min(100, (p[k] / (k === 'stamina' ? 120 : 100)) * 100) + '%';
  const inv = Object.entries(p.inv).map(([k, n]) => `${NAMES[k] ?? k} ×${n}`);
  if (p.axe > 0) inv.unshift(`stone axe (${p.axe})`);
  $('inv').textContent = inv.length ? inv.join(' · ') : 'Carrying nothing';
  const h = state.time * 24, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  const rel = state.wind - yaw, arrow = '↑↗→↘↓↙←↖'[((Math.round(-rel / (Math.PI / 4)) % 8) + 8) % 8];
  const others = Object.values(state.players).filter((q) => q.online && q.id !== myId).map((q) => q.name).join(', ');
  $('top').textContent = `Day ${state.day} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · wind ${arrow}${others ? ' · with ' + others : ''}${settings.fps ? ' · ' + Math.round(fps) + ' fps' : ''}`;
  const has = (k: string, n = 1) => (p.inv[k] ?? 0) >= n;
  $('r1').classList.toggle('off', !has('stone', 2)); $('r2').classList.toggle('off', !(has('flake') && has('stick') && has('fibre')));
  $('r3').classList.toggle('off', !has('stick', 3)); $('r4').classList.toggle('off', !has('log', 2) || !!state.shelter);
  const ch = STORY[state.story ?? 0];
  $('story').innerHTML = `<b>${ch.title}</b><br>${ch.goal}`;
  if (!isHost && performance.now() - lastSnap > 5000) $('link').textContent = 'Lost contact with the host…';
}

function frame(dt: number) {
  const p = state.players[myId]; if (!p) return;
  movePlayer(dt);
  target = findTarget();
  view.update(dt, state.time, me.x, me.y, me.z, state.wind);
  ents.sync(state, myId, { x: me.x, y: me.y, z: me.z, ry: me.ry, pose: { speed: me.spd, crouch: me.crouch, act: p.act, actT: p.actT, swim: me.mode === 2, asleep: p.asleep, axe: p.axe > 0, logs: p.inv.log ?? 0, air: !me.ground } }, dt);

  // Third-person camera over the right shoulder, kept above the ground.
  const cp = Math.cos(pitch), dir = { x: Math.sin(yaw) * cp, y: Math.sin(pitch), z: Math.cos(yaw) * cp };
  const tx = me.x - Math.cos(yaw) * 0.45, ty = me.y + (me.crouch ? 1.15 : 1.55), tz = me.z + Math.sin(yaw) * 0.45;
  let cx = tx - dir.x * camDist, cy = ty - dir.y * camDist + 0.07 * camDist, cz = tz - dir.z * camDist;
  cy = Math.max(cy, world.height(cx, cz) + 0.45, world.waterAt(cx, cz) + 0.3);
  const cam = view.camera, k = 1 - Math.exp(-dt * 18);
  cam.position.set(cam.position.x + (cx - cam.position.x) * k, cam.position.y + (cy - cam.position.y) * k, cam.position.z + (cz - cam.position.z) * k);
  cam.lookAt(tx + dir.x * 6, ty + dir.y * 6 + 0.2, tz + dir.z * 6);
  if (previewWho >= 0) {
    // Character screen: face the chosen character from the front, placed on the right of the picture, turning slowly.
    const q = previewWho === 1 ? Object.values(state.players).find((o) => o.npc) : undefined;
    const px = q ? q.x : me.x, py = q ? q.y : me.y, pz = q ? q.z : me.z, a = (q ? q.ry : me.ry) + Math.sin(performance.now() / 2500) * 0.6, R = 2.9;
    const ex = px + Math.sin(a) * R, ez = pz + Math.cos(a) * R, fx = (px - ex) / R, fz = (pz - ez) / R;
    cam.position.set(ex, Math.max(py + 1.2, world.height(ex, ez) + 0.5), ez);
    cam.lookAt(px + fz * 0.8, py + 0.95, pz - fx * 0.8);
  }

  const riverEnd = world.river[world.river.length - 1].z;
  let fireDist = 999; for (const f of state.fires) if (f.lit) fireDist = Math.min(fireDist, Math.hypot(f.x - me.x, f.z - me.z));
  sound.update(dt, {
    day: view.daylight, windy: Math.min(1, me.y / 120) + 0.3, time: state.time, speed: me.ground ? me.spd : 0,
    riverDist: me.z < riverEnd ? Math.abs(me.x - riverX(me.z)) : Math.max(0, Math.hypot(me.x - LAKE.x, me.z - LAKE.z) - LAKE.r),
    fallDist: Math.hypot(me.x - riverX(-310), me.z + 310), fireDist,
    surface: world.depth(me.x, me.z) > 0.1 ? 'water' : world.slopeY(me.x, me.z) < 0.8 || me.y > 150 ? 'rock' : 'grass',
  });
  birds.update(dt, me.x, me.z, me.y, view.daylight);
  mapT -= dt; if (mapT <= 0) { mapT = 0.5; map.reveal(me.x, me.z); map.draw(state, me, yaw, myId); }
  view.setWaypoint(map.waypoint);
  map.mini($('mini') as HTMLCanvasElement, state, me, yaw, myId, view.daylight < 0.4);
  hud(dt);
  view.render();

  // Lower the render resolution if the machine cannot keep up.
  fps += (1 / Math.max(dt, 1e-3) - fps) * 0.05;
  // Skip the first seconds (loading hitches), and sharpen again when there is headroom.
  upT += dt;
  if (upT > 10 && settings.scale === 0) {
    slowFor = fps < 27 ? slowFor + dt : 0; fastFor = fps > 50 ? fastFor + dt : 0;
    const top = Math.min(1, window.devicePixelRatio || 1);
    if (slowFor > 3 && scale > 0.5) { scale = Math.max(0.5, scale * 0.85); slowFor = 0; view.resize(innerWidth, innerHeight, scale); }
    else if (fastFor > 6 && scale < top) { scale = Math.min(top, scale * 1.12); fastFor = 0; view.resize(innerWidth, innerHeight, scale); }
  }
}
