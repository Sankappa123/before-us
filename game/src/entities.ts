// Things that change during play: players, animals, loose items, fires, the shelter.
import * as THREE from 'three';
import { Beast, Human, Pose } from './actors';
import { Scene3D } from './scene';
import { State, SHELTER_LOGS, SHELTER_THATCH } from './sim';
import { World } from './worldgen';

const std = (c: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, ...extra });
const reeds = () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) { const g = new THREE.ConeGeometry(0.03, 0.8 + i * 0.08, 4); g.translate(Math.cos(i * 1.3) * 0.12, 0.4, Math.sin(i * 1.3) * 0.12); parts.push(g); }
  return parts;
};
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ITEM: Record<string, { g: THREE.BufferGeometry; m: THREE.Material; y: number }> = {
  stick: { g: new THREE.CylinderGeometry(0.022, 0.03, 0.75, 5).rotateZ(Math.PI / 2), m: std(0x6b4c2e), y: 0.04 },
  stone: { g: new THREE.DodecahedronGeometry(0.13, 0), m: std(0x8c8a84, { flatShading: true }), y: 0.07 },
  fibre: { g: mergeGeometries(reeds())!, m: std(0x9aa04a), y: 0 },
  berry: { g: new THREE.IcosahedronGeometry(0.3, 1), m: std(0x5a1f3a, { flatShading: true }), y: 0.22 },
  flake: { g: new THREE.TetrahedronGeometry(0.08, 0), m: std(0xb8b8b4, { flatShading: true }), y: 0.04 },
  log: { g: new THREE.CylinderGeometry(0.16, 0.17, 1.6, 8).rotateZ(Math.PI / 2), m: std(0x5a4330), y: 0.16 },
  meat: { g: new THREE.SphereGeometry(0.12, 8, 6), m: std(0x9a3030), y: 0.1 },
  cooked: { g: new THREE.SphereGeometry(0.12, 8, 6), m: std(0x6a4020), y: 0.1 },
};

interface FireView { g: THREE.Group; flame: THREE.Mesh; light: THREE.PointLight; food: THREE.Mesh }

export class Entities {
  humans = new Map<string, Human>();
  beasts = new Map<number, Beast>();
  private items = new Map<string, THREE.InstancedMesh>();
  private fires = new Map<number, FireView>();
  private shelter: THREE.Group | null = null;
  private shelterKey = '';
  private rev = -1;
  private t = 0;

  constructor(private view: Scene3D, private world: World) {
    for (const k in ITEM) {
      const m = new THREE.InstancedMesh(ITEM[k].g, ITEM[k].m, 1200);
      m.count = 0; m.castShadow = true; m.frustumCulled = false; view.scene.add(m); this.items.set(k, m);
    }
  }

  sync(s: State, me: string, mine: { x: number; y: number; z: number; ry: number; pose: Pose }, dt: number) {
    const sc = this.view.scene, w = this.world, k = 1 - Math.exp(-dt * 10);
    this.t += dt;

    // Players
    for (const p of Object.values(s.players)) {
      let h = this.humans.get(p.id);
      if (!p.online) { if (h) { sc.remove(h.group); this.humans.delete(p.id); } continue; }
      const dressed = p.dressed !== false;
      if (h && (h.dressed !== dressed || h.style !== (p.style ?? 0) || h.hair !== p.hair)) { const old = h.group; h = new Human(p.ch, dressed, p.style ?? 0, p.hair); h.group.position.copy(old.position); h.group.rotation.y = old.rotation.y; sc.remove(old); sc.add(h.group); this.humans.set(p.id, h); }
      if (!h) { h = new Human(p.ch, dressed, p.style ?? 0, p.hair); h.group.position.set(p.x, p.y, p.z); sc.add(h.group); this.humans.set(p.id, h); }
      const g = h.group; g.scale.setScalar(p.height ?? 1);
      if (p.id === me) { g.position.set(mine.x, mine.y, mine.z); g.rotation.y = mine.ry; h.update(dt, mine.pose); }
      else {
        g.position.x += (p.x - g.position.x) * k; g.position.y += (p.y - g.position.y) * k; g.position.z += (p.z - g.position.z) * k;
        let d = p.ry - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * k;
        h.update(dt, { speed: p.spd, crouch: p.crouch, act: p.act, actT: p.actT, swim: p.mode === 2, asleep: p.asleep, axe: p.axe > 0, logs: p.inv.log ?? 0 });
      }
    }
    for (const [id, h] of this.humans) if (!s.players[id]) { sc.remove(h.group); this.humans.delete(id); }

    // Animals
    const seen = new Set<number>();
    for (const a of s.animals) {
      seen.add(a.id);
      let b = this.beasts.get(a.id);
      if (!b) { b = new Beast(a.k, a.id); b.group.position.set(a.x, w.height(a.x, a.z), a.z); b.group.rotation.y = a.ry; sc.add(b.group); this.beasts.set(a.id, b); }
      const g = b.group;
      g.position.x += (a.x - g.position.x) * k; g.position.z += (a.z - g.position.z) * k; g.position.y = w.height(g.position.x, g.position.z);
      let d = a.ry - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * k;
      b.update(dt, a.spd, a.st);
    }
    for (const [id, b] of this.beasts) if (!seen.has(id)) { sc.remove(b.group); this.beasts.delete(id); }

    // Fires: flicker every frame
    const live = new Set<number>();
    for (const f of s.fires) {
      live.add(f.id);
      let v = this.fires.get(f.id);
      if (!v) {
        const g = new THREE.Group(); g.position.set(f.x, w.height(f.x, f.z), f.z);
        for (let i = 0; i < 6; i++) {
          const st = new THREE.Mesh(ITEM.stick.g, ITEM.stick.m); st.rotation.set(0, i * 1.05, 0.5); st.position.set(Math.cos(i * 1.05) * 0.12, 0.2, -Math.sin(i * 1.05) * 0.12); st.castShadow = true; g.add(st);
        }
        for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(ITEM.stone.g, ITEM.stone.m); r.position.set(Math.cos(i * 0.9) * 0.5, 0.05, Math.sin(i * 0.9) * 0.5); g.add(r); }
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.75, 7), new THREE.MeshBasicMaterial({ color: 0xffa23a, transparent: true, opacity: 0.9, fog: false })); flame.position.y = 0.5;
        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 6), new THREE.MeshBasicMaterial({ color: 0xfff0a0, fog: false })); inner.position.y = -0.1; flame.add(inner);
        const light = new THREE.PointLight(0xff8a3c, 0, 26, 1.5); light.position.y = 0.9;
        const food = new THREE.Mesh(ITEM.meat.g, ITEM.meat.m); food.position.set(0.25, 0.45, 0);
        g.add(flame, light, food); sc.add(g); this.fires.set(f.id, (v = { g, flame, light, food }));
      }
      v.flame.visible = f.lit;
      const fl = 0.8 + 0.2 * Math.sin(this.t * 17 + f.id) + 0.12 * Math.sin(this.t * 31);
      v.flame.scale.set(fl, 0.8 + fl * 0.5, fl);
      v.light.intensity = f.lit ? 28 * fl * Math.min(1, f.fuel / 20 + 0.4) : 0;
      v.food.visible = f.cookT > 0 || f.ready > 0;
      v.food.material = f.ready > 0 ? ITEM.cooked.m : ITEM.meat.m;
    }
    for (const [id, v] of this.fires) if (!live.has(id)) { sc.remove(v.g); this.fires.delete(id); }

    // Shelter: rebuilt only when its progress changes
    const sh = s.shelter, key = sh ? `${sh.logs}:${sh.thatch}` : '';
    if (key !== this.shelterKey) {
      this.shelterKey = key;
      if (this.shelter) sc.remove(this.shelter);
      this.shelter = null;
      if (sh) {
        const g = (this.shelter = new THREE.Group()); g.position.set(sh.x, w.height(sh.x, sh.z), sh.z); g.rotation.y = sh.ry;
        const pole = (len: number, x: number, y: number, z: number, rx: number, rz: number) => {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, len, 6), ITEM.log.m); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m);
        };
        pole(1.9, -1.3, 0.95, 0.9, 0, 0); pole(1.9, 1.3, 0.95, 0.9, 0, 0); pole(3, 0, 1.85, 0.9, 0, Math.PI / 2);
        const rafters = Math.max(0, sh.logs - 2);
        for (let i = 0; i < rafters; i++) pole(3.1, -1.2 + i * 0.8, 0.95, -0.35, -0.95, 0);
        if (sh.thatch > 0) {
          const wd = 2.9 * (sh.thatch / SHELTER_THATCH);
          const th = new THREE.Mesh(new THREE.BoxGeometry(wd, 0.12, 3.1), std(0x8a8242)); th.position.set(-1.45 + wd / 2, 1.03, -0.3); th.rotation.x = Math.PI / 2 - 0.95;
          th.castShadow = th.receiveShadow = true; g.add(th);
        }
        if (sh.logs >= SHELTER_LOGS && sh.thatch >= SHELTER_THATCH) {
          const bed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.5), std(0x6a6a34)); bed.position.set(0, 0.05, -0.2); g.add(bed);
        }
        sc.add(g);
      }
    }

    // Items and felled trees change only when the host says so
    if (s.rev !== this.rev) {
      this.rev = s.rev;
      const count: Record<string, number> = {}, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
      for (const [id, kind, x, z] of s.items) {
        const mesh = this.items.get(kind); if (!mesh) continue;
        const n = (count[kind] = (count[kind] ?? 0) + 1) - 1;
        if (n >= 1200) continue;
        q.setFromAxisAngle(up, id * 2.4);
        mesh.setMatrixAt(n, m4.compose(new THREE.Vector3(x, w.height(x, z) + ITEM[kind].y, z), q, one));
      }
      for (const [kind, mesh] of this.items) { mesh.count = Math.min(1200, count[kind] ?? 0); mesh.instanceMatrix.needsUpdate = true; }
      for (const id of s.cut) this.view.hideTree(id);
    }
  }
}
