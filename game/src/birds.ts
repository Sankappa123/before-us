// A flock that wheels over the valley by day. Purely visual, so it runs on each player's machine.
import * as THREE from 'three';

export class Birds {
  private birds: { g: THREE.Group; wl: THREE.Mesh; wr: THREE.Mesh; r: number; ph: number; h: number; sp: number }[] = [];
  private cx = 0; private cz = 0; private t = 0; private drift = 0;

  constructor(scene: THREE.Scene, x: number, z: number) {
    this.cx = x + 30; this.cz = z - 40;
    const wing = new THREE.BufferGeometry();
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0.55, 0, 0.02, 0, 0, -0.1], 3));
    wing.computeVertexNormals();
    const m = new THREE.MeshBasicMaterial({ color: 0x15171a, side: THREE.DoubleSide });
    const body = new THREE.ConeGeometry(0.05, 0.34, 5).rotateX(Math.PI / 2);
    for (let i = 0; i < 18; i++) {
      const g = new THREE.Group(), wl = new THREE.Mesh(wing, m), wr = new THREE.Mesh(wing, m);
      wr.scale.x = -1; g.add(new THREE.Mesh(body, m), wl, wr); scene.add(g);
      this.birds.push({ g, wl, wr, r: 14 + Math.random() * 38, ph: Math.random() * 6.28, h: 26 + Math.random() * 30, sp: (0.16 + Math.random() * 0.12) * (i % 5 === 0 ? -1 : 1) });
    }
  }

  update(dt: number, px: number, pz: number, ground: number, day: number) {
    this.t += dt; this.drift += dt * 0.05;
    // The flock drifts around the player's part of the valley.
    const tx = px + Math.cos(this.drift) * 70, tz = pz + Math.sin(this.drift * 1.3) * 70;
    this.cx += (tx - this.cx) * dt * 0.15; this.cz += (tz - this.cz) * dt * 0.15;
    for (const b of this.birds) {
      const a = b.ph + this.t * b.sp, g = b.g;
      g.visible = day > 0.25;
      g.position.set(this.cx + Math.cos(a) * b.r, ground + b.h + Math.sin(this.t * 0.4 + b.ph) * 4, this.cz + Math.sin(a) * b.r * 0.75);
      g.rotation.y = -a + (b.sp > 0 ? 0 : Math.PI); g.rotation.z = (b.sp > 0 ? -1 : 1) * 0.25;
      const glide = Math.sin(this.t * 0.7 + b.ph * 3) > 0.55, flap = glide ? 0.1 : Math.sin(this.t * 9 + b.ph * 7) * 0.75;
      b.wl.rotation.z = flap; b.wr.rotation.z = -flap;
    }
  }
}
