// Game rules. Runs only on the host; the guest sends requests and receives
// results. No rendering code, so it can be tested without a browser.
import { mulberry32 } from './noise';
import { ItemKind, World, riverX, walkStep } from './worldgen';

export interface Player {
  id: string; name: string; ch: number; x: number; y: number; z: number; ry: number;
  spd: number; mode: number; // 0 normal, 1 sprint, 2 swim
  crouch: boolean; act: string; actT: number; inv: Record<string, number>; axe: number;
  hunger: number; thirst: number; health: number; stamina: number; online: boolean; asleep: boolean;
  npc?: boolean; goal?: string; gid?: number; nt?: number; stuck?: number; dressed?: boolean; style?: number; hair?: number; height?: number;
}
export interface Fire { id: number; x: number; z: number; fuel: number; lit: boolean; cookT: number; ready: number }
export interface Shelter { x: number; z: number; ry: number; logs: number; thatch: number; done: boolean }
export interface Animal {
  id: number; k: 'deer' | 'rabbit' | 'wolf'; x: number; z: number; ry: number;
  st: 'graze' | 'walk' | 'flee' | 'hunt' | 'wary' | 'dead'; hp: number; t: number; tx: number; tz: number; spd: number;
}
export interface GameEvent { e: string; x: number; z: number; who?: string }
export interface State {
  v: 1; seed: number; day: number; time: number; wind: number;
  players: Record<string, Player>; items: [number, ItemKind, number, number][];
  cut: number[]; treeHp: Record<number, number>; fires: Fire[]; shelter: Shelter | null;
  animals: Animal[]; nextId: number; rev: number; story: number;
}
export type Action =
  | { a: 'pickup'; id: number } | { a: 'craft'; r: 'flake' | 'axe' } | { a: 'fire' } | { a: 'useFire'; id: number }
  | { a: 'eat' } | { a: 'drink' } | { a: 'chop'; id: number } | { a: 'shelter' } | { a: 'build' } | { a: 'sleep' }
  | { a: 'throw'; id: number } | { a: 'hit'; id: number } | { a: 'harvest'; id: number } | { a: 'drop'; k: ItemKind } | { a: 'npcGive' } | { a: 'dress'; npc?: boolean } | { a: 'style'; npc?: boolean } | { a: 'look'; npc?: boolean; style?: number; dressed?: boolean; hair?: number; height?: number };

export const DAY_SECONDS = 720;
export const WEIGHT: Record<string, number> = { stick: 1, stone: 1, fibre: 0.5, berry: 0.2, flake: 0.5, log: 6, meat: 1, cooked: 1 };
export const CARRY_LIMIT = 26;
export const SHELTER_LOGS = 6, SHELTER_THATCH = 8, AXE_USES = 40, TREE_HP = 5;
const MEAT = { deer: 4, rabbit: 1, wolf: 2 }, HP = { deer: 3, rabbit: 1, wolf: 4 };
const dist = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);
export const isNight = (t: number) => t > 0.79 || t < 0.21;

export class Sim {
  state: State;
  events: GameEvent[] = [];
  private rnd: () => number;

  constructor(public world: World, saved?: State) {
    this.rnd = mulberry32(world.seed + 31);
    if (saved) {
      this.state = saved; saved.story ??= 0;
      if (!Object.values(saved.players).some((p) => p.npc)) this.addNpc();
      for (const p of Object.values(saved.players)) { p.online = false; p.asleep = false; }
    } else {
      this.state = { v: 1, seed: world.seed, day: 1, time: 0.24, wind: 0.6, players: {}, items: [], cut: [], treeHp: {}, fires: [], shelter: null, animals: [], nextId: 1, rev: 1, story: 0 };
      for (const [k, x, z] of world.startItems) this.state.items.push([this.state.nextId++, k, x, z]);
      this.spawnWildlife(); this.addNpc();
    }
  }

  private addNpc() {
    const sp = this.world.spawn, x = sp.x - 2, z = sp.z + 1.5;
    this.state.players['npc:asha'] = { id: 'npc:asha', name: 'Asha', ch: 0, x, y: this.world.height(x, z), z, ry: 0, spd: 0, mode: 0, crouch: false, act: '', actT: 0, inv: {}, axe: 0, hunger: 100, thirst: 100, health: 100, stamina: 100, online: true, asleep: false, npc: true, goal: 'follow', nt: 4, dressed: false };
  }

  private spawnWildlife() {
    const s = this.state, w = this.world;
    const place = (k: Animal['k'], cx: number, cz: number, r: number) => {
      for (let tries = 0; tries < 30; tries++) {
        const x = cx + (this.rnd() - 0.5) * r, z = cz + (this.rnd() - 0.5) * r;
        if (w.depth(x, z) > 0 || w.slopeY(x, z) < 0.8) continue;
        s.animals.push({ id: s.nextId++, k, x, z, ry: this.rnd() * 6.28, st: 'graze', hp: HP[k], t: this.rnd() * 6, tx: x, tz: z, spd: 0 });
        return;
      }
    };
    const hx = riverX(60) - 60, hz = 60;
    for (let i = 0; i < 6; i++) place('deer', hx, hz, 30);
    for (let i = 0; i < 7; i++) place('rabbit', w.spawn.x + (this.rnd() - 0.5) * 220, w.spawn.z + (this.rnd() - 0.5) * 220, 20);
  }

  join(id: string, name: string, ch: number): Player {
    const s = this.state;
    let p = s.players[id];
    if (!p) {
      const sp = this.world.spawn, n = Object.keys(s.players).length;
      p = s.players[id] = { id, name, ch, x: sp.x + n * 1.5, y: 0, z: sp.z, ry: 0, spd: 0, mode: 0, crouch: false, act: '', actT: 0, inv: {}, axe: 0, hunger: 80, thirst: 75, health: 100, stamina: 100, online: true, asleep: false, dressed: false };
      p.y = this.world.height(p.x, p.z);
    }
    p.online = true; p.name = name; p.ch = ch;
    return p;
  }
  leave(id: string) { const p = this.state.players[id]; if (p) { p.online = false; p.asleep = false; } }

  private weight(p: Player) { let w = 0; for (const k in p.inv) w += (WEIGHT[k] ?? 1) * p.inv[k]; return w; }
  private has(p: Player, k: string, n = 1) { return (p.inv[k] ?? 0) >= n; }
  private take(p: Player, k: string, n = 1) { p.inv[k] = (p.inv[k] ?? 0) - n; if (p.inv[k] <= 0) delete p.inv[k]; }
  private give(p: Player, k: string, n = 1) { p.inv[k] = (p.inv[k] ?? 0) + n; }
  private drop(k: ItemKind, x: number, z: number, spread = 1.2) {
    const s = this.state;
    s.items.push([s.nextId++, k, x + (this.rnd() - 0.5) * spread * 2, z + (this.rnd() - 0.5) * spread * 2]);
    s.rev++;
  }
  private setAct(p: Player, act: string) { p.act = act; p.actT = 0.0001; }
  private nearWater(p: Player) {
    for (let a = 0; a < 6.28; a += 0.785) if (this.world.depth(p.x + Math.cos(a) * 1.8, p.z + Math.sin(a) * 1.8) > 0.05) return true;
    return this.world.depth(p.x, p.z) > 0.05;
  }

  /** Apply one player request. Returns a short message for that player. */
  act(pid: string, a: Action): string {
    const s = this.state, p = s.players[pid], w = this.world;
    if (!p || !p.online || p.npc) return '';
    if (p.asleep && a.a !== 'sleep') return '';
    switch (a.a) {
      case 'pickup': {
        const i = s.items.findIndex((it) => it[0] === a.id);
        if (i < 0) return '';
        const it = s.items[i];
        if (dist(p.x, p.z, it[2], it[3]) > 3.5) return 'Too far away';
        if (it[1] === 'log' && (p.inv.log ?? 0) >= 2) return 'You can carry only two logs';
        if (this.weight(p) + WEIGHT[it[1]] > CARRY_LIMIT) return 'You are carrying too much';
        s.items.splice(i, 1); s.rev++; this.give(p, it[1]); this.setAct(p, 'pick');
        this.events.push({ e: 'pick', x: p.x, z: p.z });
        return '';
      }
      case 'craft': {
        if (a.r === 'flake') {
          if (!this.has(p, 'stone', 2)) return 'Needs two stones to strike together';
          this.take(p, 'stone'); this.give(p, 'flake'); this.setAct(p, 'craft');
          this.events.push({ e: 'knap', x: p.x, z: p.z });
          return 'You strike a sharp flake from the stone';
        }
        if (!this.has(p, 'flake') || !this.has(p, 'stick') || !this.has(p, 'fibre')) return 'Needs a sharp flake, a stick and plant fibre';
        this.take(p, 'flake'); this.take(p, 'stick'); this.take(p, 'fibre'); p.axe = AXE_USES; this.setAct(p, 'craft');
        this.events.push({ e: 'knap', x: p.x, z: p.z });
        return 'You bind the flake to the stick: a stone axe';
      }
      case 'fire': {
        if (!this.has(p, 'stick', 3)) return 'Needs three sticks';
        const x = p.x + Math.sin(p.ry) * 1.6, z = p.z + Math.cos(p.ry) * 1.6;
        if (w.depth(x, z) > 0) return 'Not in the water';
        this.take(p, 'stick', 3);
        s.fires.push({ id: s.nextId++, x, z, fuel: 90, lit: false, cookT: 0, ready: 0 }); s.rev++;
        this.setAct(p, 'pick');
        return 'You stack the sticks. Light it with two stones and some dry fibre';
      }
      case 'useFire': {
        const f = s.fires.find((q) => q.id === a.id);
        if (!f || dist(p.x, p.z, f.x, f.z) > 3.5) return '';
        this.setAct(p, 'pick');
        if (f.ready > 0) { f.ready--; this.give(p, 'cooked'); return 'You take the cooked meat'; }
        if (!f.lit) {
          if (!this.has(p, 'stone', 2) || !this.has(p, 'fibre')) return 'Needs two stones to strike and plant fibre as tinder';
          if (f.fuel <= 0) return 'Add sticks first';
          this.take(p, 'fibre'); f.lit = true; this.events.push({ e: 'ignite', x: f.x, z: f.z });
          return 'Sparks catch. The fire is lit';
        }
        if (this.has(p, 'meat') && f.cookT <= 0) { this.take(p, 'meat'); f.cookT = 20; return 'The meat goes on the fire'; }
        if (this.has(p, 'log')) { this.take(p, 'log'); f.fuel += 240; return 'You add a log'; }
        if (this.has(p, 'stick')) { this.take(p, 'stick'); f.fuel += 60; return 'You add a stick'; }
        return f.cookT > 0 ? 'The meat is cooking' : 'Nothing to add';
      }
      case 'eat': {
        if (this.has(p, 'cooked')) { this.take(p, 'cooked'); p.hunger = Math.min(100, p.hunger + 45); this.events.push({ e: 'eat', x: p.x, z: p.z }, { e: 'feast', x: p.x, z: p.z }); return 'Cooked meat. You feel strong'; }
        if (this.has(p, 'berry')) { this.take(p, 'berry'); p.hunger = Math.min(100, p.hunger + 8); p.thirst = Math.min(100, p.thirst + 3); this.events.push({ e: 'eat', x: p.x, z: p.z }); return 'A handful of berries'; }
        if (this.has(p, 'meat')) { this.take(p, 'meat'); p.hunger = Math.min(100, p.hunger + 15); p.health -= 8; this.events.push({ e: 'eat', x: p.x, z: p.z }); return 'Raw meat sits badly. Cook it next time'; }
        return 'Nothing to eat';
      }
      case 'drink': {
        if (!this.nearWater(p)) return 'No water here';
        p.thirst = Math.min(100, p.thirst + 35); this.setAct(p, 'pick'); this.events.push({ e: 'drink', x: p.x, z: p.z });
        return '';
      }
      case 'chop': {
        const t = w.trees[a.id];
        if (!t || s.cut.includes(a.id)) return '';
        if (p.axe <= 0) return 'You need an axe to fell a tree';
        if (dist(p.x, p.z, t.x, t.z) > 3.6) return 'Too far away';
        if (p.stamina < 6) return 'Too tired';
        p.axe--; p.stamina -= 6; this.setAct(p, 'chop');
        const hp = (s.treeHp[a.id] ?? TREE_HP) - 1;
        if (hp > 0) { s.treeHp[a.id] = hp; this.events.push({ e: 'chop', x: t.x, z: t.z }); }
        else {
          delete s.treeHp[a.id]; s.cut.push(a.id);
          for (let i = 0; i < 3; i++) this.drop('log', t.x, t.z, 2);
          for (let i = 0; i < 2; i++) this.drop('stick', t.x, t.z, 2);
          this.events.push({ e: 'fall', x: t.x, z: t.z });
        }
        return p.axe === 0 ? 'The axe binding gives way. It is broken' : '';
      }
      case 'shelter': {
        if (s.shelter) return 'You already have a shelter frame';
        if (!this.has(p, 'log', 2)) return 'Needs two logs for the frame';
        const x = p.x + Math.sin(p.ry) * 2.5, z = p.z + Math.cos(p.ry) * 2.5;
        if (w.depth(x, z) > 0 || w.slopeY(x, z) < 0.9) return 'Find flat dry ground';
        this.take(p, 'log', 2); s.shelter = { x, z, ry: p.ry, logs: 2, thatch: 0, done: false }; s.rev++;
        return 'The frame stands. Bring logs and fibre to finish it';
      }
      case 'build': {
        const sh = s.shelter;
        if (!sh || sh.done || dist(p.x, p.z, sh.x, sh.z) > 5) return '';
        if (sh.logs < SHELTER_LOGS && this.has(p, 'log')) { this.take(p, 'log'); sh.logs++; }
        else if (sh.thatch < SHELTER_THATCH && this.has(p, 'fibre')) { this.take(p, 'fibre'); sh.thatch++; }
        else return sh.logs < SHELTER_LOGS ? 'Bring a log' : 'Bring plant fibre for thatch';
        this.setAct(p, 'pick'); s.rev++; this.events.push({ e: 'build', x: sh.x, z: sh.z });
        if (sh.logs >= SHELTER_LOGS && sh.thatch >= SHELTER_THATCH) { sh.done = true; return 'The shelter is finished'; }
        return '';
      }
      case 'sleep': {
        const sh = s.shelter;
        if (p.asleep) { p.asleep = false; return ''; }
        if (!sh || !sh.done || dist(p.x, p.z, sh.x, sh.z) > 5) return '';
        if (!isNight(s.time)) return 'It is not dark yet';
        p.asleep = true;
        return 'You lie down';
      }
      case 'throw': case 'hit': {
        const an = s.animals.find((q) => q.id === a.id);
        if (!an || an.st === 'dead') return '';
        const d = dist(p.x, p.z, an.x, an.z);
        let dmg = 0;
        if (a.a === 'hit') {
          if (p.axe <= 0 || d > 2.8) return '';
          p.axe--; dmg = 2; this.setAct(p, 'chop');
        } else {
          if (!this.has(p, 'stone')) return 'No stone to throw';
          if (d > 18) return 'Too far to throw';
          this.take(p, 'stone'); this.setAct(p, 'throw'); this.drop('stone', an.x, an.z, 1.5);
          dmg = this.rnd() < Math.max(0.35, 1 - d / 22) ? 1 : 0;
          this.events.push({ e: 'throw', x: p.x, z: p.z });
          if (!dmg) { this.alarm(an, p.x, p.z); return 'Missed'; }
        }
        an.hp -= dmg; this.events.push({ e: 'hurt', x: an.x, z: an.z });
        if (an.hp <= 0) { an.st = 'dead'; an.t = 400; an.spd = 0; return ''; }
        this.alarm(an, p.x, p.z);
        return '';
      }
      case 'harvest': {
        const i = s.animals.findIndex((q) => q.id === a.id);
        const an = s.animals[i];
        if (!an || an.st !== 'dead' || dist(p.x, p.z, an.x, an.z) > 3.5) return '';
        if (!this.has(p, 'flake') && p.axe <= 0) return 'You need a sharp flake or an axe to butcher it';
        s.animals.splice(i, 1); this.give(p, 'meat', MEAT[an.k]); this.setAct(p, 'pick');
        return 'You take the meat';
      }
      case 'look': {
        const who = a.npc ? Object.values(s.players).find((q) => q.npc) : p;
        if (!who) return '';
        if (a.style !== undefined) who.style = Math.max(0, Math.min(who.ch === 0 ? 2 : 3, Math.floor(a.style)));
        if (a.dressed && s.story < 5) return 'No hides yet. Hunt, cook and eat first; then you can make clothes.';
        if (a.dressed !== undefined) who.dressed = !!a.dressed;
        if (a.hair !== undefined) who.hair = a.hair & 0xffffff;
        if (a.height !== undefined) who.height = Math.max(0.9, Math.min(1.1, a.height));
        return '';
      }
      case 'style': {
        const who = a.npc ? Object.values(s.players).find((q) => q.npc) : p;
        if (!who) return '';
        who.style = ((who.style ?? 0) + 1) % (who.ch === 0 ? 3 : 4);
        return '';
      }
      case 'dress': {
        const who = a.npc ? Object.values(s.players).find((q) => q.npc) : p;
        if (!who || dist(p.x, p.z, who.x, who.z) > 6) return a.npc ? 'She is too far away' : '';
        if (who.dressed === false && s.story < 5) return 'No hides yet. Hunt, cook and eat first; then you can make clothes.';
        who.dressed = who.dressed === false;
        return '';
      }
      case 'npcGive': {
        const n = Object.values(s.players).find((q) => q.npc);
        if (!n || dist(p.x, p.z, n.x, n.z) > 4.5) return '';
        let moved = 0;
        for (const k of Object.keys(n.inv)) while ((n.inv[k] ?? 0) > 0 && this.weight(p) + WEIGHT[k] <= CARRY_LIMIT) { this.take(n, k); this.give(p, k); moved++; }
        return moved ? n.name + ' hands you what she gathered' : 'She has nothing for you yet';
      }
      case 'drop': {
        if (!this.has(p, a.k)) return '';
        this.take(p, a.k); this.drop(a.k, p.x + Math.sin(p.ry), p.z + Math.cos(p.ry), 0.4);
        return '';
      }
    }
  }

  private alarm(an: Animal, fromX: number, fromZ: number) {
    const group = an.k === 'deer' ? this.state.animals.filter((q) => q.k === 'deer' && q.st !== 'dead') : [an];
    for (const q of group) {
      if (q.k === 'wolf') { q.st = q.hp <= 2 ? 'flee' : 'hunt'; if (q.st !== 'flee') continue; }
      const dx = q.x - fromX, dz = q.z - fromZ, l = Math.hypot(dx, dz) || 1, far = q.k === 'rabbit' ? 30 : 70;
      q.st = 'flee'; q.t = 6 + this.rnd() * 3;
      q.tx = q.x + (dx / l) * far + (this.rnd() - 0.5) * 20; q.tz = q.z + (dz / l) * far + (this.rnd() - 0.5) * 20;
    }
  }

  /** How close a player can get before an animal notices. Wind carries scent. */
  detectRange(an: Animal, p: Player): number {
    const base = an.k === 'deer' ? 26 : an.k === 'rabbit' ? 11 : 45;
    const wx = Math.sin(this.state.wind), wz = Math.cos(this.state.wind); // direction the wind blows toward
    const dx = an.x - p.x, dz = an.z - p.z, l = Math.hypot(dx, dz) || 1;
    const downwind = Math.max(0, (dx / l) * wx + (dz / l) * wz); // animal is downwind of the player
    return base * (p.crouch ? 0.5 : 1) * (p.mode === 1 ? 1.4 : 1) * (0.7 + 0.8 * downwind);
  }

  step(dt: number) {
    const s = this.state, w = this.world;
    s.time += dt / DAY_SECONDS;
    if (s.time >= 1) { s.time -= 1; s.day++; }
    s.wind += dt * 0.004 * Math.sin(s.day * 1.7 + s.time * 6.28);
    const online = Object.values(s.players).filter((p) => p.online && !p.npc);

    for (const p of online) {
      if (p.actT > 0) { p.actT += dt / (p.act === 'chop' ? 0.7 : 0.6); if (p.actT >= 1) { p.actT = 0; p.act = ''; } }
      const k = p.asleep ? 0.3 : 1;
      p.hunger = Math.max(0, p.hunger - (100 / 1500) * dt * k);
      p.thirst = Math.max(0, p.thirst - (100 / 900) * dt * k);
      const maxSt = p.hunger > 70 ? 120 : 100; // well fed: more stamina
      if (p.mode === 1 && p.spd > 4.5) p.stamina -= 7 * dt;
      else if (p.mode === 2) p.stamina -= 4 * dt;
      else p.stamina += (p.hunger > 20 ? 9 : 4) * dt;
      p.stamina = Math.max(0, Math.min(maxSt, p.stamina));
      if (p.hunger <= 0 || p.thirst <= 0) p.health -= 0.6 * dt;
      else if (p.mode === 2 && p.stamina <= 0) p.health -= 6 * dt; // drowning
      else if (p.hunger > 40 && p.thirst > 40) p.health = Math.min(100, p.health + (p.asleep ? 1.2 : 0.35) * dt);
      if (p.health <= 0) {
        for (const kind in p.inv) for (let i = 0; i < p.inv[kind]; i++) this.drop(kind as ItemKind, p.x, p.z, 1.5);
        p.inv = {}; p.health = 50; p.hunger = 50; p.thirst = 50; p.stamina = 60; p.asleep = false;
        p.x = w.spawn.x; p.z = w.spawn.z; p.y = w.height(p.x, p.z);
        this.events.push({ e: 'death', x: p.x, z: p.z, who: p.id });
      }
    }

    for (const f of s.fires) {
      if (!f.lit) continue;
      f.fuel -= dt;
      if (f.cookT > 0) { f.cookT -= dt; if (f.cookT <= 0) { f.cookT = 0; f.ready++; this.events.push({ e: 'cooked', x: f.x, z: f.z }); } }
      if (f.fuel <= 0) { f.fuel = 0; f.lit = false; f.cookT = 0; }
    }

    // Everyone asleep in the finished shelter: the night passes.
    if (online.length > 0 && online.every((p) => p.asleep)) {
      s.time = 0.25; s.day++;
      for (const p of online) { p.asleep = false; p.health = Math.min(100, p.health + 30); p.stamina = 100; }
      s.animals = s.animals.filter((a) => a.k !== 'wolf');
      this.events.push({ e: 'morning', x: 0, z: 0 });
    }

    this.stepAnimals(dt, online);
    this.stepNpc(dt, online);
    this.checkStory(online);
  }

  /** The companion: stays close, gathers what she finds, keeps the fire fed at night. */
  private stepNpc(dt: number, leaders: Player[]) {
    const s = this.state, w = this.world, n = Object.values(s.players).find((p) => p.npc);
    if (!n) return;
    n.online = true;
    if (n.actT > 0) { n.actT += dt / 0.6; if (n.actT >= 1) { n.actT = 0; n.act = ''; } }
    const L = leaders[0];
    n.spd = 0; n.mode = 0;
    if (!L) return;
    n.asleep = L.asleep;
    if (n.asleep) return;
    n.nt = (n.nt ?? 0) - dt;
    const dL = dist(n.x, n.z, L.x, L.z);
    let tx = L.x, tz = L.z, stop = 3.2;
    const fire = isNight(s.time) ? s.fires.find((f) => f.lit && dist(f.x, f.z, L.x, L.z) < 25) : undefined;
    if (fire) {
      tx = fire.x + 1.6; tz = fire.z + 0.9; stop = 0.5; n.goal = 'follow';
      if (fire.fuel < 40 && this.has(n, 'stick') && dist(n.x, n.z, fire.x, fire.z) < 3.2 && n.actT === 0) { this.take(n, 'stick'); fire.fuel += 60; this.setAct(n, 'pick'); }
    } else if (n.goal === 'gather') {
      const it = s.items.find((i) => i[0] === n.gid);
      if (!it || dL > 45) n.goal = 'follow';
      else {
        tx = it[2]; tz = it[3]; stop = 1.1;
        if (dist(n.x, n.z, tx, tz) < 1.3) {
          s.items.splice(s.items.indexOf(it), 1); s.rev++; this.give(n, it[1]); this.setAct(n, 'pick'); n.goal = 'follow'; n.nt = 2.5;
          if (this.weight(n) >= 5 && this.weight(n) < 6.2) this.events.push({ e: 'say', x: n.x, z: n.z, who: 'I have gathered what I could carry. Come and take it.' });
        }
      }
    } else if (n.nt <= 0 && dL < 22 && this.weight(n) < 8 && n.actT === 0) {
      n.nt = 4;
      let best: State['items'][number] | undefined, bd = 20;
      for (const it of s.items) {
        if (it[1] !== 'stick' && it[1] !== 'stone' && it[1] !== 'fibre' && it[1] !== 'berry') continue;
        const d = dist(n.x, n.z, it[2], it[3]), dl = dist(L.x, L.z, it[2], it[3]);
        if (d < bd && dl < 30 && dl > 3) { bd = d; best = it; }
      }
      if (best) { n.goal = 'gather'; n.gid = best[0]; }
    }
    const dx = tx - n.x, dz = tz - n.z, l = Math.hypot(dx, dz);
    if (l > stop && n.actT === 0) {
      const sp = dL > 14 && n.goal !== 'gather' ? 6.4 : 3.9, q = walkStep(w, n.x, n.z, dx / l, dz / l, sp * dt), nx = q.x, nz = q.z; // round logs and big bushes
      n.stuck = q.blocked ? (n.stuck ?? 0) + dt : 0;
      if (w.depth(nx, nz) > 0.9 || w.slopeY(nx, nz) < 0.5 || n.stuck > 2) {
        if (n.goal === 'gather') { n.goal = 'follow'; n.nt = 6; n.stuck = 0; }
        else if (dL > 40 || n.stuck > 2) { n.x = L.x - 1.5; n.z = L.z - 1.5; n.stuck = 0; } // cut off by water, cliff or a thicket: catch up
      } else { if (!q.blocked) n.ry = Math.atan2(nx - n.x, nz - n.z); n.x = nx; n.z = nz; n.spd = sp; n.mode = sp > 5 ? 1 : 0; }
    } else if (n.goal !== 'gather' && dL < 6) n.ry = Math.atan2(L.x - n.x, L.z - n.z);
    n.y = w.height(n.x, n.z);
  }

  private checkStory(online: Player[]) {
    const s = this.state, p = online[0];
    if (!p || s.story >= 7) return;
    const ev = (e: string) => this.events.some((q) => q.e === e), has = (k: string, n = 1) => (p.inv[k] ?? 0) >= n;
    const done = [
      () => ev('drink'),
      () => (has('stone', 2) && has('stick') && has('fibre')) || has('flake') || p.axe > 0,
      () => online.some((q) => q.axe > 0),
      () => s.fires.some((f) => f.lit),
      () => ev('feast'),
      () => !!s.shelter?.done,
      () => ev('morning'),
    ][s.story]();
    if (done) {
      s.story++; this.events.push({ e: 'story', x: p.x, z: p.z });
      if (s.story === 5) this.events.push({ e: 'say', x: p.x, z: p.z, who: 'We have hides now. We can make clothes: press Esc, then Characters.' });
    }
  }

  private stepAnimals(dt: number, players: Player[]) {
    const s = this.state, w = this.world, night = isNight(s.time);
    if (night && players.length && !s.animals.some((a) => a.k === 'wolf') && s.time > 0.82) {
      const p = players[0];
      for (let i = 0; i < 2; i++) {
        const a = this.rnd() * 6.28, x = p.x + Math.cos(a) * 90, z = p.z + Math.sin(a) * 90;
        if (w.depth(x, z) === 0 && w.slopeY(x, z) > 0.75) {
          s.animals.push({ id: s.nextId++, k: 'wolf', x, z, ry: 0, st: 'hunt', hp: HP.wolf, t: 0, tx: x, tz: z, spd: 0 });
          if (i === 0) this.events.push({ e: 'howl', x, z });
        }
      }
    }
    if (!night && s.animals.filter((a) => a.k === 'rabbit').length < 5 && this.rnd() < dt * 0.01) {
      const x = w.spawn.x + (this.rnd() - 0.5) * 300, z = w.spawn.z + (this.rnd() - 0.5) * 300;
      if (w.depth(x, z) === 0 && w.slopeY(x, z) > 0.85 && players.every((p) => dist(p.x, p.z, x, z) > 60))
        s.animals.push({ id: s.nextId++, k: 'rabbit', x, z, ry: 0, st: 'graze', hp: 1, t: 3, tx: x, tz: z, spd: 0 });
    }

    for (let i = s.animals.length - 1; i >= 0; i--) {
      const a = s.animals[i];
      a.t -= dt;
      if (a.st === 'dead') { if (a.t <= 0) s.animals.splice(i, 1); continue; }
      let near: Player | null = null, nd = 1e9;
      for (const p of players) { const d = dist(p.x, p.z, a.x, a.z); if (d < nd) { nd = d; near = p; } }

      if (a.k === 'wolf') {
        if (!night && a.st !== 'flee') { a.st = 'flee'; a.t = 20; a.tx = a.x + (a.x - (near?.x ?? 0)) * 3; a.tz = a.z + (a.z - (near?.z ?? 0)) * 3; }
        if (a.st === 'flee') { if (a.t <= 0 || nd > 130) { s.animals.splice(i, 1); continue; } }
        else if (near) {
          const fire = s.fires.find((f) => f.lit && dist(f.x, f.z, near!.x, near!.z) < 12);
          if (fire) { // fire keeps wolves circling at a distance
            a.st = 'wary';
            const ang = Math.atan2(a.z - fire.z, a.x - fire.x) + 0.6;
            a.tx = fire.x + Math.cos(ang) * 17; a.tz = fire.z + Math.sin(ang) * 17;
          } else {
            a.st = 'hunt'; a.tx = near.x; a.tz = near.z;
            if (nd < 1.9 && a.t <= 0) { near.health -= 9; a.t = 1.3; this.events.push({ e: 'bite', x: near.x, z: near.z, who: near.id }); }
          }
        }
      } else {
        if (near && a.st !== 'flee' && nd < this.detectRange(a, near)) { this.alarm(a, near.x, near.z); this.events.push({ e: 'alarm', x: a.x, z: a.z }); }
        else if (a.st === 'flee') { if (a.t <= 0 && nd > 35) { a.st = 'graze'; a.t = 4; } else if (a.t <= 0) this.alarm(a, near!.x, near!.z); }
        else if (a.t <= 0) {
          if (a.st === 'graze') {
            a.st = 'walk'; a.t = 8;
            const dawn = s.time > 0.22 && s.time < 0.33 && a.k === 'deer'; // deer drink at dawn
            const r = a.k === 'deer' ? 22 : 8;
            a.tx = dawn ? riverX(a.z) + 7 + this.rnd() * 6 : a.x + (this.rnd() - 0.5) * r * 2;
            a.tz = a.z + (this.rnd() - 0.5) * r * 2;
          } else { a.st = 'graze'; a.t = 4 + this.rnd() * 8; }
        }
      }

      const speed = a.st === 'flee' ? (a.k === 'deer' ? 9.5 : a.k === 'rabbit' ? 7.5 : 8) : a.st === 'hunt' ? 6.2 : a.st === 'wary' ? 2.6 : a.st === 'walk' ? 1.3 : 0;
      const dx = a.tx - a.x, dz = a.tz - a.z, l = Math.hypot(dx, dz);
      a.spd = 0;
      if (speed > 0 && l > 0.6) {
        const q = walkStep(w, a.x, a.z, dx / l, dz / l, speed * dt), nx = q.x, nz = q.z; // round logs and big bushes
        if (q.blocked || w.depth(nx, nz) > 0.4 || w.slopeY(nx, nz) < 0.6 || Math.abs(nx) > 500 || Math.abs(nz) > 500) {
          const ang = Math.atan2(dz, dx) + (this.rnd() < 0.5 ? 1.3 : -1.3); // blocked: turn aside
          a.tx = a.x + Math.cos(ang) * 30; a.tz = a.z + Math.sin(ang) * 30;
        } else { a.ry = Math.atan2(nx - a.x, nz - a.z); a.x = nx; a.z = nz; a.spd = speed; }
      } else if (a.st === 'walk') { a.st = 'graze'; a.t = 4 + this.rnd() * 8; }
    }
  }
}
