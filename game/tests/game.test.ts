import { describe, expect, it, beforeAll } from 'vitest';
import { generateWorld, LAKE, World, floorH, pushOut, walkStep, segDist, sceneryNear, SPAWN_CLEAR } from '../src/worldgen';
import { findPlaces, near, miniProject, zoomAt, clampView, viewToWorld, worldToView, fallsTop } from '../src/places';
import { Sim, State, AXE_USES, TREE_HP, SHELTER_LOGS, SHELTER_THATCH, DAY_SECONDS } from '../src/sim';

let world: World;
beforeAll(() => { world = generateWorld(1234, 8000); });

const fresh = () => {
  const sim = new Sim(world);
  const p = sim.join('a', 'A', 0);
  sim.state.animals = [];
  delete sim.state.players['npc:asha'];
  return { sim, p };
};

describe('geography', () => {
  it('is deterministic for a seed', () => {
    const w2 = generateWorld(1234, 8000);
    expect(Array.from(w2.h.slice(5000, 5050))).toEqual(Array.from(world.h.slice(5000, 5050)));
    expect(w2.trees.length).toBe(world.trees.length);
  });
  it('river never flows uphill and ends at lake level', () => {
    for (let i = 1; i < world.river.length; i++) expect(world.river[i].y).toBeLessThanOrEqual(world.river[i - 1].y);
    expect(world.river[world.river.length - 1].y).toBeCloseTo(LAKE.level, 1);
    expect(world.river[0].y).toBeGreaterThan(50);
  });
  it('has a waterfall drop at the cliff', () => {
    const top = world.river.find((p) => p.z >= -326)!, bottom = world.river.find((p) => p.z >= -304)!;
    expect(top.y - bottom.y).toBeGreaterThan(25);
  });
  it('river and lake actually hold water', () => {
    const mid = world.river[Math.floor(world.river.length * 0.6)];
    expect(world.depth(mid.x, mid.z)).toBeGreaterThan(0.2);
    expect(world.depth(LAKE.x, LAKE.z)).toBeGreaterThan(2);
  });
  it('no tree stands in water or on a cliff', () => {
    expect(world.trees.length).toBeGreaterThan(500);
    for (const t of world.trees) {
      expect(world.depth(t.x, t.z)).toBe(0);
      if (t.type !== 2) expect(world.slopeY(t.x, t.z)).toBeGreaterThan(0.6);
    }
  });
  it('start point is dry, fairly flat, and on the valley floor', () => {
    const { x, z } = world.spawn;
    expect(world.depth(x, z)).toBe(0);
    expect(world.slopeY(x, z)).toBeGreaterThan(0.9);
    expect(world.height(x, z)).toBeLessThan(floorH(z) + 12);
  });
});

describe('survival rules', () => {
  it('crafts flake then axe', () => {
    const { sim, p } = fresh();
    expect(sim.act('a', { a: 'craft', r: 'flake' })).toMatch(/two stones/);
    p.inv = { stone: 2, stick: 1, fibre: 1 };
    sim.act('a', { a: 'craft', r: 'flake' });
    expect(p.inv.flake).toBe(1); expect(p.inv.stone).toBe(1);
    sim.act('a', { a: 'craft', r: 'axe' });
    expect(p.axe).toBe(AXE_USES); expect(p.inv.flake).toBeUndefined();
  });
  it('fells a tree only with an axe, and it drops logs', () => {
    const { sim, p } = fresh();
    const t = world.trees[10];
    p.x = t.x + 1; p.z = t.z;
    expect(sim.act('a', { a: 'chop', id: 10 })).toMatch(/axe/);
    p.axe = AXE_USES;
    for (let i = 0; i < TREE_HP; i++) { p.stamina = 100; sim.act('a', { a: 'chop', id: 10 }); }
    expect(sim.state.cut).toContain(10);
    const logs = sim.state.items.filter((it) => it[1] === 'log' && Math.hypot(it[2] - t.x, it[3] - t.z) < 5);
    expect(logs.length).toBe(3);
    expect(p.axe).toBe(AXE_USES - TREE_HP);
    expect(sim.act('a', { a: 'chop', id: 10 })).toBe('');
  });
  it('builds, lights and cooks on a fire', () => {
    const { sim, p } = fresh();
    p.inv = { stick: 3, stone: 2, fibre: 1, meat: 1 };
    sim.act('a', { a: 'fire' });
    const f = sim.state.fires[0];
    expect(f.lit).toBe(false);
    sim.act('a', { a: 'useFire', id: f.id });
    expect(f.lit).toBe(true);
    sim.act('a', { a: 'useFire', id: f.id });
    expect(p.inv.meat).toBeUndefined();
    for (let i = 0; i < 25; i++) sim.step(1);
    expect(f.ready).toBe(1);
    sim.act('a', { a: 'useFire', id: f.id });
    expect(p.inv.cooked).toBe(1);
    p.hunger = 20;
    const before = p.hunger;
    sim.act('a', { a: 'eat' });
    expect(p.hunger).toBeGreaterThan(before + 30);
  });
  it('fire burns out without fuel', () => {
    const { sim, p } = fresh();
    p.inv = { stick: 3, stone: 2, fibre: 1 };
    sim.act('a', { a: 'fire' }); sim.act('a', { a: 'useFire', id: sim.state.fires[0].id });
    for (let i = 0; i < 100; i++) sim.step(1);
    expect(sim.state.fires[0].lit).toBe(false);
  });
  it('needs drain, starvation hurts, being fed raises stamina', () => {
    const { sim, p } = fresh();
    const h0 = p.hunger, t0 = p.thirst;
    for (let i = 0; i < 60; i++) sim.step(1);
    expect(p.hunger).toBeLessThan(h0); expect(p.thirst).toBeLessThan(t0);
    p.hunger = 0; p.health = 100; sim.step(10);
    expect(p.health).toBeLessThan(100);
    p.hunger = 90; p.thirst = 90; for (let i = 0; i < 30; i++) sim.step(1);
    expect(p.stamina).toBeGreaterThan(100);
  });
  it('drinking needs water nearby', () => {
    const { sim, p } = fresh();
    p.thirst = 10;
    expect(sim.act('a', { a: 'drink' })).toMatch(/No water/);
    const r = world.river[Math.floor(world.river.length * 0.6)];
    p.x = r.x; p.z = r.z;
    sim.act('a', { a: 'drink' });
    expect(p.thirst).toBe(45);
  });
  it('carry limit and two-log limit apply', () => {
    const { sim, p } = fresh();
    p.inv = { log: 2 };
    sim.state.items.push([9001, 'log', p.x, p.z]);
    expect(sim.act('a', { a: 'pickup', id: 9001 })).toMatch(/two logs/);
  });
  it('shelter is built from carried materials and sleeping passes the night', () => {
    const { sim, p } = fresh();
    p.inv = { log: 2 };
    expect(sim.act('a', { a: 'shelter' })).toMatch(/frame stands/);
    const sh = sim.state.shelter!;
    for (let i = sh.logs; i < SHELTER_LOGS; i++) { p.inv.log = 1; sim.act('a', { a: 'build' }); }
    p.inv = { fibre: SHELTER_THATCH };
    for (let i = 0; i < SHELTER_THATCH; i++) sim.act('a', { a: 'build' });
    expect(sh.done).toBe(true);
    sim.state.time = 0.5;
    expect(sim.act('a', { a: 'sleep' })).toMatch(/not dark/);
    sim.state.time = 0.9; const day = sim.state.day;
    sim.act('a', { a: 'sleep' }); sim.step(0.1);
    expect(sim.state.day).toBe(day + 1);
    expect(sim.state.time).toBeCloseTo(0.25, 2);
    expect(sim.events.some((e) => e.e === 'morning')).toBe(true);
  });
  it('death drops belongings and returns the player to the start', () => {
    const { sim, p } = fresh();
    p.inv = { stone: 3 }; p.x += 40; p.health = 0.1; p.hunger = 0;
    const n = sim.state.items.length;
    sim.step(1);
    expect(sim.state.items.length).toBe(n + 3);
    expect(p.x).toBe(world.spawn.x); expect(p.health).toBe(50);
  });
});

describe('wildlife', () => {
  it('deer notice an upwind player from further than a downwind, crouched one', () => {
    const { sim, p } = fresh();
    const deer = { id: 1, k: 'deer' as const, x: 0, z: 0, ry: 0, st: 'graze' as const, hp: 3, t: 5, tx: 0, tz: 0, spd: 0 };
    sim.state.wind = 0; // wind blows toward +z
    p.x = 0; p.z = -20; // player is upwind: scent carries to the deer
    const upwind = sim.detectRange(deer, p);
    p.z = 20; p.crouch = true; // downwind and crouched
    const stalk = sim.detectRange(deer, p);
    expect(upwind).toBeGreaterThan(stalk * 3);
  });
  it('the whole herd flees when one deer is alarmed', () => {
    const { sim, p } = fresh();
    const { x, z } = world.spawn;
    for (let i = 0; i < 4; i++) sim.state.animals.push({ id: 100 + i, k: 'deer', x: x + 15 + i * 3, z, ry: 0, st: 'graze', hp: 3, t: 5, tx: x, tz: z, spd: 0 });
    p.x = x; p.z = z; p.mode = 1; sim.state.wind = Math.PI / 2;
    sim.step(0.1);
    expect(sim.state.animals.every((a) => a.st === 'flee')).toBe(true);
    const d0 = Math.hypot(sim.state.animals[0].x - x, sim.state.animals[0].z - z);
    for (let i = 0; i < 30; i++) sim.step(0.1);
    expect(Math.hypot(sim.state.animals[0].x - x, sim.state.animals[0].z - z)).toBeGreaterThan(d0 + 10);
  });
  it('a hunted rabbit can be butchered only with a sharp edge', () => {
    const { sim, p } = fresh();
    sim.state.animals.push({ id: 7, k: 'rabbit', x: p.x + 1, z: p.z, ry: 0, st: 'graze', hp: 1, t: 5, tx: 0, tz: 0, spd: 0 });
    p.axe = 5; sim.act('a', { a: 'hit', id: 7 });
    expect(sim.state.animals[0].st).toBe('dead');
    p.axe = 0;
    expect(sim.act('a', { a: 'harvest', id: 7 })).toMatch(/sharp/);
    p.inv.flake = 1; sim.act('a', { a: 'harvest', id: 7 });
    expect(p.inv.meat).toBe(1); expect(sim.state.animals.length).toBe(0);
  });
  it('wolves come at night, bite an unprotected player, and hold back from a lit fire', () => {
    const { sim, p } = fresh();
    sim.state.time = 0.9;
    sim.state.animals.push({ id: 50, k: 'wolf', x: p.x + 25, z: p.z, ry: 0, st: 'hunt', hp: 4, t: 0, tx: 0, tz: 0, spd: 0 });
    for (let i = 0; i < 100; i++) sim.step(0.1);
    expect(p.health).toBeLessThan(100);
    const { sim: s2, p: p2 } = fresh();
    s2.state.time = 0.9;
    s2.state.fires.push({ id: 1, x: p2.x + 1, z: p2.z, fuel: 999, lit: true, cookT: 0, ready: 0 });
    s2.state.animals.push({ id: 50, k: 'wolf', x: p2.x + 25, z: p2.z, ry: 0, st: 'hunt', hp: 4, t: 0, tx: 0, tz: 0, spd: 0 });
    for (let i = 0; i < 200; i++) s2.step(0.1);
    expect(p2.health).toBeGreaterThanOrEqual(99);
    const wolf = s2.state.animals.find((a) => a.k === 'wolf')!;
    expect(Math.hypot(wolf.x - p2.x, wolf.z - p2.z)).toBeGreaterThan(8);
  });
});

describe('saving', () => {
  it('a saved world reloads identically and keeps working', () => {
    const { sim, p } = fresh();
    p.inv = { stick: 3, stone: 2 }; sim.act('a', { a: 'fire' });
    p.axe = 9; const t = world.trees[20]; p.x = t.x; p.z = t.z;
    for (let i = 0; i < TREE_HP; i++) { p.stamina = 100; sim.act('a', { a: 'chop', id: 20 }); }
    for (let i = 0; i < 50; i++) sim.step(0.5);
    const json = JSON.stringify(sim.state);
    const sim2 = new Sim(world, JSON.parse(json) as State);
    expect(sim2.state.cut).toEqual([20]);
    expect(sim2.state.fires.length).toBe(1);
    expect(sim2.state.items.length).toBe(sim.state.items.length);
    const p2 = sim2.join('a', 'A', 0);
    expect(p2.axe).toBe(p.axe); expect(p2.inv).toEqual(p.inv); expect(p2.x).toBe(p.x);
    sim2.step(1);
    expect(sim2.state.time).toBeGreaterThan(sim.state.time);
  });
  it('a full day advances the day counter', () => {
    const { sim } = fresh();
    const d = sim.state.day;
    for (let i = 0; i < DAY_SECONDS; i++) sim.step(1);
    expect(sim.state.day).toBe(d + 1);
  });
});

describe('companion and story', () => {
  it('the companion follows the player', () => {
    const sim = new Sim(world); const p = sim.join('a', 'A', 1); sim.state.animals = []; sim.state.items = [];
    const n = sim.state.players['npc:asha'];
    p.x += 30; p.z += 5; p.y = world.height(p.x, p.z);
    for (let i = 0; i < 200; i++) sim.step(0.1);
    expect(Math.hypot(n.x - p.x, n.z - p.z)).toBeLessThan(5);
  });
  it('the companion gathers nearby things and hands them over', () => {
    const sim = new Sim(world); const p = sim.join('a', 'A', 1); sim.state.animals = [];
    sim.state.time = 0.4;
    const n = sim.state.players['npc:asha'];
    sim.state.items = [[900, 'stick', p.x + 8, p.z + 2], [901, 'stone', p.x + 10, p.z - 3]];
    for (let i = 0; i < 400; i++) sim.step(0.1);
    expect((n.inv.stick ?? 0) + (n.inv.stone ?? 0)).toBe(2);
    expect(sim.act('a', { a: 'npcGive' })).toMatch(/hands you/);
    expect(p.inv.stick).toBe(1); expect(p.inv.stone).toBe(1);
  });
  it('wolves ignore the companion and she is not needed for sleep', () => {
    const sim = new Sim(world); sim.join('a', 'A', 1);
    expect(Object.values(sim.state.players).filter((q) => q.npc).length).toBe(1);
  });
  it('clothing can be taken off and put on for both, and is saved', () => {
    const sim = new Sim(world); const p = sim.join('a', 'A', 1); const n = sim.state.players['npc:asha'];
    expect(p.dressed).toBe(false); expect(n.dressed).toBe(false); // everyone starts without clothes
    expect(sim.act('a', { a: 'dress' })).toMatch(/No hides/); expect(p.dressed).toBe(false); // locked until the first hunt
    sim.state.story = 5; sim.act('a', { a: 'dress' }); sim.act('a', { a: 'dress', npc: true });
    expect(p.dressed).toBe(true); expect(n.dressed).toBe(true);
    sim.act('a', { a: 'dress' }); sim.act('a', { a: 'dress', npc: true });
    const again = new Sim(world, JSON.parse(JSON.stringify(sim.state)));
    expect(again.state.players['npc:asha'].dressed).toBe(false);
    sim.act('a', { a: 'dress' }); expect(p.dressed).toBe(true);
  });
  it('character look changes are applied within limits', () => {
    const sim = new Sim(world); const p = sim.join('a', 'A', 1); const n = sim.state.players['npc:asha'];
    sim.act('a', { a: 'look', style: 9, hair: 0x112233, height: 5 });
    expect(p.style).toBe(3); expect(p.hair).toBe(0x112233); expect(p.height).toBe(1.1);
    sim.act('a', { a: 'look', npc: true, style: 1, dressed: false, height: 0.5 });
    expect(n.style).toBe(1); expect(n.dressed).toBe(false); expect(n.height).toBe(0.9);
  });
  it('story chapters advance in order', () => {
    const sim = new Sim(world); const p = sim.join('a', 'A', 1); sim.state.animals = []; sim.state.items = [];
    expect(sim.state.story).toBe(0);
    const r = world.river[Math.floor(world.river.length * 0.6)];
    const hx = p.x, hz = p.z; p.x = r.x; p.z = r.z; sim.act('a', { a: 'drink' }); sim.step(0.05);
    expect(sim.state.story).toBe(1);
    p.x = hx; p.z = hz; p.inv = { stone: 3, stick: 4, fibre: 2 }; sim.step(0.05);
    expect(sim.state.story).toBe(2);
    sim.act('a', { a: 'craft', r: 'flake' }); sim.act('a', { a: 'craft', r: 'axe' }); sim.step(0.05);
    expect(sim.state.story).toBe(3);
    sim.act('a', { a: 'fire' }); sim.act('a', { a: 'useFire', id: sim.state.fires[0].id }); sim.step(0.05);
    expect(sim.state.story).toBe(4);
    p.inv.cooked = 1; sim.act('a', { a: 'eat' }); sim.step(0.05);
    expect(sim.state.story).toBe(5);
    expect(sim.events.filter((e) => e.e === 'story').length).toBe(5);
  });
});

describe('map: places, waypoint and minimap maths', () => {
  it('finds four named places on dry, walkable ground inside the map', () => {
    const ps = findPlaces(world);
    expect(ps.map((p) => p.id).sort()).toEqual(['falls', 'ford', 'lake', 'shelf']);
    for (const p of ps) {
      expect(Math.abs(p.x)).toBeLessThan(500); expect(Math.abs(p.z)).toBeLessThan(500);
      expect(world.depth(p.x, p.z)).toBe(0);
      expect(world.slopeY(p.x, p.z)).toBeGreaterThan(0.6);
    }
  });
  it('puts the places where the land says they are', () => {
    const by = Object.fromEntries(findPlaces(world).map((p) => [p.id, p]));
    const top = world.river[fallsTop(world)];
    expect(by.shelf.z).toBeLessThan(top.z);                       // the shelf is upstream of the lip
    expect(by.falls.z).toBeGreaterThan(top.z);                    // the foot is downstream of it
    expect(world.height(by.shelf.x, by.shelf.z) - world.height(by.falls.x, by.falls.z)).toBeGreaterThan(15);
    expect(Math.hypot(by.lake.x - LAKE.x, by.lake.z - LAKE.z)).toBeLessThan(LAKE.r * 2);
    expect(Math.abs(by.ford.z - world.spawn.z)).toBeLessThan(60); // the crossing nearest the start
    expect(Math.sign(by.ford.x - world.river.find((r) => r.z >= by.ford.z)!.x)).toBe(Math.sign(world.spawn.x - world.river.find((r) => r.z >= world.spawn.z)!.x));
    expect(near(by.ford, world.spawn.x, world.spawn.z)).toBe(false); // nothing is given at the start
    expect(near(by.lake, LAKE.x + LAKE.r, LAKE.z)).toBe(true);       // any shore of the lake counts
  });
  it('minimap: what is ahead is up, and far marks are held on the rim', () => {
    for (const yaw of [0, 1, 2.5, -2]) {
      const a = miniProject(Math.sin(yaw) * 10, Math.cos(yaw) * 10, yaw, 1.3, 75);
      expect(a.x).toBeCloseTo(75, 5); expect(a.y).toBeCloseTo(75 - 13, 5); expect(a.out).toBe(false);
      const far = miniProject(Math.sin(yaw) * 900, Math.cos(yaw) * 900, yaw, 1.3, 75, 10);
      expect(far.out).toBe(true); expect(far.y).toBeCloseTo(10, 5); expect(far.ang).toBeCloseTo(-Math.PI / 2, 5);
    }
    const right = miniProject(-Math.cos(0.7) * 10, Math.sin(0.7) * 10, 0.7, 1, 75); // to the player's right
    expect(right.x).toBeGreaterThan(75); expect(right.y).toBeCloseTo(75, 5);
  });
  it('full map: zoom keeps the point under the cursor, stays within 1x..4x and inside the sheet', () => {
    let v = { zoom: 1, ox: 0, oy: 0 };
    const before = viewToWorld(v, 300, 200, 520);
    v = zoomAt(v, 300, 200, 2, 520);
    const after = viewToWorld(v, 300, 200, 520);
    expect(after.x).toBeCloseTo(before.x, 6); expect(after.z).toBeCloseTo(before.z, 6);
    const back = worldToView(v, before.x, before.z, 520);
    expect(back.x).toBeCloseTo(300, 6); expect(back.y).toBeCloseTo(200, 6);
    for (let i = 0; i < 10; i++) v = zoomAt(v, 500, 500, 1.25, 520);
    expect(v.zoom).toBe(4); expect(v.ox).toBeLessThanOrEqual(520 - 130); expect(v.oy).toBeLessThanOrEqual(520 - 130);
    for (let i = 0; i < 20; i++) v = zoomAt(v, 10, 10, 0.8, 520);
    expect(v).toEqual({ zoom: 1, ox: 0, oy: 0 });
    expect(clampView({ zoom: 2, ox: -50, oy: 9999 }, 520)).toEqual({ zoom: 2, ox: 0, oy: 260 });
  });
});

describe('undergrowth and dead wood: placement and collision', () => {
  const ends = (o: World['scenery'][number]) => { const ex = Math.sin(o.yaw) * o.hl, ez = Math.cos(o.yaw) * o.hl; return [o.x - ex, o.z - ez, o.x + ex, o.z + ez] as const; };
  const gap = (o: World['scenery'][number], x: number, z: number) => segDist(x, z, ...ends(o)).d;
  const openLog = () => world.scenery.find((o) => o.kind === 1 && sceneryNear(world, o.x, o.z).every((id) => id === o.id || world.scenery[id].r === 0 || Math.hypot(world.scenery[id].x - o.x, world.scenery[id].z - o.z) > 9))!;

  it('is the same for the same seed, and has all three kinds', () => {
    const w2 = generateWorld(1234, 8000);
    expect(w2.scenery).toEqual(world.scenery);
    for (const k of [0, 1, 2]) expect(world.scenery.filter((o) => o.kind === k).length).toBeGreaterThan(20);
    expect(world.scenery.some((o) => o.kind === 0 && o.r === 0)).toBe(true);  // small bushes can be walked through
    expect(world.scenery.some((o) => o.kind === 0 && o.r > 0)).toBe(true);    // big ones cannot
    expect(world.scenery.every((o) => o.kind === 0 || o.r > 0)).toBe(true);   // logs and stumps always block
  });
  it('none is in water, inside a tree trunk or in the clearing at the start', () => {
    for (const o of world.scenery) {
      const [ax, az, bx, bz] = ends(o);
      for (const k of [0, 0.25, 0.5, 0.75, 1]) expect(world.depth(ax + (bx - ax) * k, az + (bz - az) * k)).toBe(0);
      expect(gap(o, world.spawn.x, world.spawn.z)).toBeGreaterThanOrEqual(SPAWN_CLEAR);
      for (const t of world.trees) {
        if (Math.abs(t.x - o.x) > 6 || Math.abs(t.z - o.z) > 6) continue;
        expect(gap(o, t.x, t.z)).toBeGreaterThan(0.32 * t.s + Math.max(o.r - 0.3, 0.2));
      }
    }
  });
  it('a walker heading straight at a log is stopped at its side, and one coming at a slant slides along and past it', () => {
    const o = openLog(), px = Math.cos(o.yaw), pz = -Math.sin(o.yaw), ax = Math.sin(o.yaw), az = Math.cos(o.yaw);
    let x = o.x + px * 4, z = o.z + pz * 4;
    for (let i = 0; i < 200; i++) { const q = pushOut(world, x - px * 0.07, z - pz * 0.07, null, false); x = q.x; z = q.z; expect(gap(o, x, z)).toBeGreaterThanOrEqual(o.r - 1e-6); }
    expect((x - o.x) * px + (z - o.z) * pz).toBeGreaterThan(0);           // still on the side it came from
    expect(gap(o, x, z)).toBeCloseTo(o.r, 3);
    x = o.x + px * 3 - ax * (o.hl - 0.5); z = o.z + pz * 3 - az * (o.hl - 0.5);
    const hx = (-px + ax) * Math.SQRT1_2, hz = (-pz + az) * Math.SQRT1_2;
    for (let i = 0; i < 300; i++) { const q = pushOut(world, x + hx * 0.07, z + hz * 0.07, null, false); x = q.x; z = q.z; expect(gap(o, x, z)).toBeGreaterThanOrEqual(o.r - 1e-6); }
    expect((x - o.x) * ax + (z - o.z) * az).toBeGreaterThan(o.hl + 2);     // went on past the far end
  });
  it('a big bush blocks, a small one does not, and a standing tree still does', () => {
    const big = world.scenery.find((o) => o.kind === 0 && o.r > 0)!, small = world.scenery.find((o) => o.kind === 0 && o.r === 0 && sceneryNear(world, o.x, o.z).every((id) => world.scenery[id].r === 0))!;
    const q = pushOut(world, big.x + 0.1, big.z, null, false);
    expect(Math.hypot(q.x - big.x, q.z - big.z)).toBeGreaterThanOrEqual(big.r - 1e-6);
    expect(pushOut(world, small.x + 0.1, small.z, null, false)).toMatchObject({ x: small.x + 0.1, z: small.z, hit: null });
    const t = world.trees[100], inTree = pushOut(world, t.x + 0.05, t.z, []);
    expect(Math.hypot(inTree.x - t.x, inTree.z - t.z)).toBeGreaterThan(0.3 * t.s);
    expect(pushOut(world, t.x + 0.05, t.z, [100], false).hit === t).toBe(false); // felled: no longer in the way
  });
  it('a self-steering walker gets round a log it meets head-on', () => {
    const o = openLog(), px = Math.cos(o.yaw), pz = -Math.sin(o.yaw);
    let x = o.x + px * 4, z = o.z + pz * 4;
    const tx = o.x - px * 5, tz = o.z - pz * 5;
    for (let i = 0; i < 600 && Math.hypot(tx - x, tz - z) > 0.5; i++) {
      const l = Math.hypot(tx - x, tz - z), q = walkStep(world, x, z, (tx - x) / l, (tz - z) / l, 0.1);
      x = q.x; z = q.z; expect(gap(o, x, z)).toBeGreaterThanOrEqual(o.r - 1e-6);
    }
    expect(Math.hypot(tx - x, tz - z)).toBeLessThanOrEqual(0.5);
  });
  it('the companion and a deer cross to the far side of a log without passing through it', () => {
    const { sim, p } = fresh(), o = openLog(), px = Math.cos(o.yaw), pz = -Math.sin(o.yaw);
    sim.state.time = 0.45; sim.state.items = [];
    p.x = o.x + px * 6; p.z = o.z + pz * 6;
    const n = sim.join('npc:asha', 'Asha', 0); Object.assign(n, { npc: true, goal: 'follow', nt: 99, x: o.x - px * 7, z: o.z - pz * 7 });
    const deer = { id: 9001, k: 'deer' as const, x: o.x - px * 5 + 60, z: o.z - pz * 5, ry: 0, st: 'walk' as const, hp: 3, t: 99, tx: 0, tz: 0, spd: 0 };
    const o2 = world.scenery.find((q) => q.kind === 1 && q.id !== o.id && Math.hypot(q.x - p.x, q.z - p.z) > 80 && world.slopeY(q.x, q.z) > 0.9)!, qx = Math.cos(o2.yaw), qz = -Math.sin(o2.yaw);
    Object.assign(deer, { x: o2.x - qx * 5, z: o2.z - qz * 5, tx: o2.x + qx * 6, tz: o2.z + qz * 6 });
    sim.state.animals = [deer];
    let crossed = false;
    for (let i = 0; i < 400; i++) {
      sim.step(0.05);
      expect(gap(o, n.x, n.z)).toBeGreaterThanOrEqual(o.r - 1e-6);
      if (deer.st === 'walk') { expect(gap(o2, deer.x, deer.z)).toBeGreaterThanOrEqual(o2.r - 1e-6); if ((deer.x - o2.x) * qx + (deer.z - o2.z) * qz > 1.5) crossed = true; }
    }
    expect(Math.hypot(n.x - p.x, n.z - p.z)).toBeLessThan(4);
    expect(crossed).toBe(true);
  });
});
