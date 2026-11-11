// People and animals. Humans, deer and wolves are animated glTF models; the rabbit is built from simple shapes.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';

const mat = (c: number, r = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
function limb(len: number, r: number, m: THREE.Material) {
  const g = new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 3, 8);
  g.translate(0, -len / 2, 0);
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; return mesh;
}
function joint(parent: THREE.Object3D, x: number, y: number, z: number) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g;
}
function part(parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
}
const ease = (o: THREE.Object3D, ax: 'x' | 'y' | 'z', target: number, k: number) => { o.rotation[ax] += (target - o.rotation[ax]) * k; };

export interface Pose { speed: number; crouch: boolean; act: string; actT: number; swim: boolean; asleep: boolean; axe: boolean; logs: number; air?: boolean; talk?: boolean }

// Human models and animations: Quaternius Universal Base Characters and
// Universal Animation Library (CC0). Both share one 65-bone skeleton.
const lib: { outfit: THREE.Object3D[]; body: THREE.Object3D[]; clips: Map<string, THREE.AnimationClip>; hair: Map<string, THREE.Object3D> } = { outfit: [], body: [], clips: new Map(), hair: new Map() };
// Hair and beard styles per character; the player cycles through them in the game.
export const STYLES: string[][][] = [
  [['Hair_Long'], ['Hair_Buns'], ['Hair_BuzzedFemale']],
  [['Hair_SimpleParted', 'Hair_Beard'], ['Hair_SimpleParted'], ['Hair_Buzzed', 'Hair_Beard'], ['Hair_Buzzed']],
];

export async function loadActors() {
  const L = new GLTFLoader(), base = import.meta.env.BASE_URL + 'models/';
  const get = (f: string) => L.loadAsync(base + f);
  const animalsReady = loadAnimals(get);
  const names = [...new Set(STYLES.flat(2))];
  const [f, m, a, r, mr, ...hairs] = await Promise.all([get('Superhero_Female_FullBody.gltf'), get('Superhero_Male_FullBody.gltf'), get('UAL1_Standard.glb'), get('Female_Ranger.gltf'), get('Male_Ranger.gltf'), ...names.map((n) => get(n + '.gltf'))]);
  lib.body = [f.scene, m.scene]; lib.outfit = [r.scene, mr.scene];
  // The bodies' built-in eyebrows ship untinted (white); give them the hair colour. Eyes get a wet highlight.
  lib.body.forEach((sc, i) => sc.traverse((o) => {
    const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!mm || !mm.name) return;
    if (/Hair/i.test(mm.name)) { mm.color.set(i === 0 ? 0x3a2618 : 0x241710); mm.roughness = 0.8; mm.metalness = 0; mm.normalMap = null; }
    else if (/Eye/i.test(mm.name)) { mm.roughness = 0.15; mm.metalness = 0; }
  }));
  names.forEach((n, i) => lib.hair.set(n, hairs[i].scene));
  for (const c of a.animations) {
    // Keep rotations and the hip height only, so one clip fits both body shapes.
    c.tracks = c.tracks.filter((t) => t.name.endsWith('.quaternion') || t.name === 'pelvis.position');
    lib.clips.set(c.name, c);
  }
  await animalsReady;
}

// Animal models: Quaternius Ultimate Animated Animals (CC0). Flat-coloured, no textures, facing +Z.
// `h` is the standing height to the top of the head in metres (measured on `ref`, so antlers do not shrink the stag).
const ANIMAL: Record<string, { files: string[]; ref: string; h: number; walk: number; run: number }> = {
  deer: { files: ['Stag', 'Deer'], ref: 'Deer', h: 1.6, walk: 1.3, run: 8.5 },
  wolf: { files: ['Wolf'], ref: 'Wolf', h: 0.98, walk: 1.5, run: 7 },
};
const KEEP = ['Idle', 'Eating', 'Walk', 'Gallop', 'Death'];
interface AnimalModel { scene: THREE.Object3D; clips: Map<string, THREE.AnimationClip>; scale: number; lift: number }
const animals = new Map<string, AnimalModel[]>();

async function loadAnimals(get: (f: string) => Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }>) {
  await Promise.all(Object.entries(ANIMAL).map(async ([kind, spec]) => {
    const loaded = await Promise.all(spec.files.map((f) => get('animals/' + f + '.gltf')));
    const boxes = loaded.map((g) => {
      const box = new THREE.Box3(), b = new THREE.Box3();
      g.scene.updateMatrixWorld(true);
      g.scene.traverse((o) => {
        const sm = o as THREE.SkinnedMesh;
        if (!sm.isMesh) return;
        const m = sm.material as THREE.MeshStandardMaterial; m.roughness = 1; m.metalness = 0;
        if (sm.isSkinnedMesh) { sm.computeBoundingBox(); b.copy(sm.boundingBox!); } else { sm.geometry.computeBoundingBox(); b.copy(sm.geometry.boundingBox!); }
        box.union(b.applyMatrix4(sm.matrixWorld));
      });
      return box;
    });
    const ref = boxes[spec.files.indexOf(spec.ref)], scale = spec.h / (ref.max.y - ref.min.y);
    animals.set(kind, loaded.map((g) => ({ scene: g.scene, scale, lift: -ref.min.y * scale, clips: new Map(g.animations.filter((c) => KEEP.includes(c.name)).map((c) => [c.name, c])) })));
  }));
}

const ONE_SHOT: Record<string, string> = { chop: 'Sword_Attack', pick: 'Interact', craft: 'Fixing_Kneeling', throw: 'Punch_Cross' };

export class Human {
  group = new THREE.Group();
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private loop = ''; private shot = '';
  private axe = new THREE.Group(); private log: THREE.Mesh;
  bones: Record<string, THREE.Object3D> = {};

  constructor(public ch: number, public dressed = true, public style = 0, public hair?: number) {
    const model = skClone(dressed ? lib.outfit[ch] : lib.body[ch]);
    this.group.add(model);
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) this.bones[o.name] = o;
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) { mesh.castShadow = true; mesh.frustumCulled = false; const sm = mesh.material as THREE.MeshStandardMaterial; if (sm.map && !/Hair|Eye/.test(sm.name)) { sm.roughness = 0.62; sm.normalScale?.setScalar(0.7); } }
    });
    if (dressed) this.addHead(model);
    for (const n of STYLES[ch][style % STYLES[ch].length]) {
      const h = lib.hair.get(n)!.clone(true);
      h.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh) { me.castShadow = true; me.material = (me.material as THREE.MeshStandardMaterial).clone(); const mm = me.material as THREE.MeshStandardMaterial; mm.color.set(hair ?? (ch === 0 ? 0x7a4e30 : 0x46301f)); mm.roughness = 0.55; mm.side = THREE.DoubleSide; mm.alphaTest = 0.4; } });
      model.add(h); if (dressed) h.position.add(this.headShift); h.updateMatrixWorld(true); this.bones.Head.attach(h);
    }
    this.mixer = new THREE.AnimationMixer(model);
    // Stone axe, held in the right hand.
    const handle = part(this.axe, new THREE.CylinderGeometry(0.014, 0.018, 0.55, 6), mat(0x6b4c2e), 0, 0.17, 0);
    void handle;
    part(this.axe, new THREE.BoxGeometry(0.13, 0.1, 0.035), mat(0x8a8a86, 0.6), 0.04, 0.4, 0);
    this.bones.hand_r.add(this.axe); this.axe.position.set(0, 0.09, 0.03); this.axe.rotation.set(Math.PI / 2, 0, 0);
    this.log = part(this.bones.spine_03, new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8), mat(0x5a4330, 1), 0, 0.2, 0);
    this.log.rotation.z = Math.PI / 2; // carried across the shoulders, not standing on the head
    this.log.visible = false;
    this.setLoop('Idle_Loop', 0);
  }

  private headShift = new THREE.Vector3();
  /** Asha wears a complete outfit model. Her head and face come from the base character and ride on the outfit's skeleton. */
  private addHead(model: THREE.Object3D) {
    model.traverse((o) => { if (/Hood|Pauldron/i.test(o.name)) o.visible = false; });
    const src = lib.body[this.ch]; src.updateMatrixWorld(true);
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    src.traverse((o) => { if ((o as THREE.Bone).isBone && o.name === 'Head') o.getWorldPosition(a); });
    this.bones.Head.getWorldPosition(b); this.headShift.subVectors(b, a);
    const found: THREE.SkinnedMesh[] = [];
    src.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) found.push(o as THREE.SkinnedMesh); });
    for (const sm of found) {
      const names = sm.skeleton.bones.map((q) => q.name), si = sm.geometry.getAttribute('skinIndex'), sw = sm.geometry.getAttribute('skinWeight'), idx = sm.geometry.index!;
      const head = (v: number) => {
        let best = 0, bi = 0;
        for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > best) { best = w; bi = si.getComponent(v, k); } }
        return names[bi] === 'Head' || names[bi] === 'neck_01';
      };
      const keep: number[] = [];
      for (let i = 0; i < idx.count; i += 3) { const x = idx.getX(i), y = idx.getX(i + 1), z = idx.getX(i + 2); if (head(x) && head(y) && head(z)) keep.push(x, y, z); }
      if (!keep.length) continue;
      const geo = sm.geometry.clone(); geo.setIndex(keep);
      const mesh = new THREE.SkinnedMesh(geo, sm.material); mesh.castShadow = true; mesh.frustumCulled = false;
      model.add(mesh);
      mesh.bind(new THREE.Skeleton(sm.skeleton.bones.map((q) => this.bones[q.name] as THREE.Bone), sm.skeleton.boneInverses), sm.bindMatrix);
    }
  }

  private action(name: string) {
    let a = this.actions.get(name);
    if (!a) { const c = lib.clips.get(name); if (!c) return null; a = this.mixer.clipAction(c); this.actions.set(name, a); }
    return a;
  }
  private setLoop(name: string, fade = 0.22) {
    if (name === this.loop) return;
    const next = this.action(name); if (!next) return;
    const prev = this.action(this.loop);
    next.reset().setEffectiveWeight(1).play();
    if (prev && fade > 0) prev.crossFadeTo(next, fade, false); else prev?.stop();
    this.loop = name;
  }

  update(dt: number, p: Pose) {
    const s = p.speed;
    let name = 'Idle_Loop', rate = 1;
    if (p.swim) { name = s > 0.3 ? 'Swim_Fwd_Loop' : 'Swim_Idle_Loop'; }
    else if (p.air) name = 'Jump_Loop';
    else if (p.crouch) { name = s > 0.3 ? 'Crouch_Fwd_Loop' : 'Crouch_Idle_Loop'; rate = s > 0.3 ? s / 1.7 : 1; }
    else if (s > 5.4) { name = 'Sprint_Loop'; rate = s / 6.6; }
    else if (s > 2.6) { name = 'Jog_Fwd_Loop'; rate = s / 4.2; }
    else if (s > 0.3) { name = 'Walk_Loop'; rate = Math.max(0.6, s / 1.5); }
    else if (p.talk) name = 'Idle_Talking_Loop';
    this.setLoop(name);
    this.action(this.loop)?.setEffectiveTimeScale(rate);

    // Timed actions are scrubbed from the host's progress value so both players see the same frame.
    const want = p.asleep ? 'Death01' : p.actT > 0 ? ONE_SHOT[p.act] ?? '' : '';
    if (want !== this.shot) {
      this.action(this.shot)?.stop();
      this.shot = want;
      const a = this.action(want);
      if (a) { a.reset().play(); a.paused = true; a.setEffectiveWeight(1); }
    }
    const a = this.action(this.shot), l = this.action(this.loop);
    if (a) { const d = a.getClip().duration; a.time = p.asleep ? d - 0.02 : Math.min(d - 0.02, p.actT * d); l?.setEffectiveWeight(0.001); }
    else l?.setEffectiveWeight(1);
    this.mixer.update(dt);
    this.axe.visible = p.axe && p.logs === 0; this.log.visible = p.logs > 0;
  }
}

const SPEC = {
  deer: { len: 1.25, r: 0.25, h: 0.92, col: 0x8f6c48, belly: 0xc9b190, neck: 0.5, head: 0.12, ear: 0.13, tail: 0.1 },
  wolf: { len: 1.05, r: 0.2, h: 0.6, col: 0x66666a, belly: 0x8c8c8c, neck: 0.3, head: 0.12, ear: 0.08, tail: 0.4 },
  rabbit: { len: 0.32, r: 0.1, h: 0.14, col: 0x93826c, belly: 0xb9a892, neck: 0.08, head: 0.065, ear: 0.11, tail: 0.04 },
};

export class Beast {
  group = new THREE.Group();
  private body!: THREE.Group; private neck!: THREE.Group; private legs: THREE.Group[] = []; private shins: THREE.Group[] = [];
  private phase = Math.random() * 6; private s!: (typeof SPEC)['deer'];
  private mixer?: THREE.AnimationMixer; private acts = new Map<string, THREE.AnimationAction>(); private cur = ''; private spec?: (typeof ANIMAL)[string];

  constructor(public kind: 'deer' | 'wolf' | 'rabbit', id: number) {
    const set = animals.get(kind);
    if (set) { // animated model
      const a = set[id % set.length], model = skClone(a.scene);
      model.scale.setScalar(a.scale); model.position.y = a.lift;
      model.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh) { me.castShadow = true; me.frustumCulled = false; } });
      this.group.add(model);
      this.spec = ANIMAL[kind];
      this.mixer = new THREE.AnimationMixer(model);
      for (const [n, c] of a.clips) this.acts.set(n, this.mixer.clipAction(c));
      const d = this.acts.get('Death');
      if (d) { d.setLoop(THREE.LoopOnce, 1); d.clampWhenFinished = true; }
      return;
    }
    this.shapes(kind, id);
  }

  /** Shape-built fallback (the rabbit: no free animated model was found). */
  private shapes(kind: 'deer' | 'wolf' | 'rabbit', id: number) {
    const s = (this.s = SPEC[kind]), m = mat(s.col, 1), light = mat(s.belly, 1), dark = mat(0x1a1410, 0.6);
    this.body = joint(this.group, 0, s.h + s.r * 0.8, 0);
    const bg = new THREE.CapsuleGeometry(s.r, s.len - 2 * s.r, 4, 10); bg.rotateX(Math.PI / 2);
    part(this.body, bg, m);
    part(this.body, new THREE.SphereGeometry(s.r * 0.9, 8, 6), light, 0, -s.r * 0.25, 0).scale.set(0.9, 0.7, s.len / (2.2 * s.r));
    this.neck = joint(this.body, 0, s.r * 0.4, s.len / 2 - s.r * 0.5); this.neck.rotation.x = -2.35;
    this.neck.add(limb(s.neck, s.r * 0.5, m));
    const head = joint(this.neck, 0, -s.neck, 0); head.rotation.x = 2.35 - 0.3;
    part(head, new THREE.SphereGeometry(s.head, 10, 8), m, 0, 0, s.head * 0.5).scale.set(0.85, 0.85, kind === 'rabbit' ? 1.1 : 1.6);
    part(head, new THREE.SphereGeometry(s.head * 0.3, 6, 6), dark, 0, -s.head * 0.1, s.head * 2);
    for (const sx of [-1, 1]) {
      const ear = part(head, new THREE.ConeGeometry(s.ear * 0.3, s.ear, 5), m, sx * s.head * 0.55, s.head * 0.9 + s.ear * 0.3, -s.head * 0.1);
      ear.rotation.z = -sx * 0.35;
      part(head, new THREE.SphereGeometry(s.head * 0.13, 5, 5), dark, sx * s.head * 0.62, s.head * 0.25, s.head * 1.0);
      if (kind === 'deer' && id % 2 === 0) for (let j = 0; j < 2; j++) {
        const an = part(head, new THREE.CylinderGeometry(0.012, 0.02, 0.36 - j * 0.14, 5), mat(0xd8cbb0), sx * (0.07 + j * 0.07), 0.3 - j * 0.04, -0.03 + j * 0.06);
        an.rotation.z = -sx * (0.35 + j * 0.5); an.rotation.x = j * 0.5;
      }
    }
    const tail = limb(s.tail, s.r * 0.22, kind === 'wolf' ? m : light); tail.position.set(0, s.r * 0.5, -s.len / 2); tail.rotation.x = kind === 'wolf' ? 0.9 : 2.4; this.body.add(tail);
    for (const z of [1, -1]) for (const x of [-1, 1]) {
      const l = joint(this.body, x * s.r * 0.55, -s.r * 0.6, z * s.len * 0.36); l.add(limb(s.h * 0.55, s.r * 0.28, m));
      const k = joint(l, 0, -s.h * 0.55, 0); k.add(limb(s.h * 0.55, s.r * 0.19, m));
      this.legs.push(l); this.shins.push(k);
    }
  }

  private play(name: string, rate: number) {
    const next = this.acts.get(name); if (!next) return;
    if (name !== this.cur) {
      const prev = this.acts.get(this.cur);
      next.reset().setEffectiveWeight(1).play();
      if (name === 'Death' && !this.cur) next.time = next.getClip().duration; // already dead when first seen
      if (prev) prev.crossFadeTo(next, name === 'Death' ? 0.1 : 0.25, false);
      this.cur = name;
    }
    next.setEffectiveTimeScale(rate);
  }

  update(dt: number, speed: number, state: string) {
    if (this.mixer) {
      const sp = this.spec!;
      if (state === 'dead') this.play('Death', 1);
      else if (speed > 4) this.play('Gallop', Math.min(1.5, Math.max(0.7, speed / sp.run)));
      else if (speed > 0.1) this.play('Walk', Math.min(2, Math.max(0.6, speed / sp.walk)));
      else this.play(state === 'graze' && this.kind !== 'wolf' ? 'Eating' : 'Idle', 1);
      this.mixer.update(dt);
      return;
    }
    const k = 1 - Math.exp(-dt * 10), s = this.s;
    if (state === 'dead') { this.group.rotation.z += (Math.PI / 2 - this.group.rotation.z) * k; this.body.position.y = s.h * 0.35 + s.r; return; }
    const amp = Math.min(1, speed / 3), fast = speed > 5;
    this.phase += dt * (2 + speed * (this.kind === 'rabbit' ? 2.6 : 1.3)) * (speed > 0.1 ? 1 : 0);
    for (let i = 0; i < 4; i++) {
      const off = fast ? (i < 2 ? 0 : 2.2) + (i % 2) * 0.4 : (i === 0 || i === 3 ? 0 : Math.PI); // gallop vs walk
      const q = Math.sin(this.phase + off);
      ease(this.legs[i], 'x', -q * (fast ? 0.95 : 0.5) * amp, k);
      ease(this.shins[i], 'x', Math.max(0, Math.cos(this.phase + off)) * (fast ? 1.2 : 0.7) * amp, k);
    }
    const hop = fast || this.kind === 'rabbit' ? Math.abs(Math.sin(this.phase)) * s.h * 0.22 * amp : 0;
    this.body.position.y = s.h + s.r * 0.8 + hop;
    ease(this.body, 'x', fast ? -Math.sin(this.phase) * 0.12 : 0, k);
    ease(this.neck, 'x', state === 'graze' && speed < 0.1 && this.kind !== 'wolf' ? -1.05 : fast ? -2.0 : -2.35, 1 - Math.exp(-dt * 3));
  }
}
