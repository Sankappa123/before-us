// Everything static in the picture: terrain, water, sky, light, grass, trees, rocks.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { World, N, CELL, HALF, LAKE, floorH, riverX } from './worldgen';
import { fbm, mulberry32, smooth } from './noise';
import { Fx, SHADE } from './fx';

const GRASS_SPAN = 72, GRASS_COUNT = 115000;
const SHADE_N = 128; // canopy shade map: 128 m square at 1 m, re-centred on the player
// Crown of each tree shape as an ellipsoid: radius, half-height, height of its middle, how solid the shade is.
const CROWN = [[2.7, 2.1, 5.2, 1], [1.7, 3.1, 5.4, 1], [2.9, 1.8, 3.5, 1], [1.3, 1.7, 5.4, 0.75], [2.2, 1.1, 8.8, 0.95]];
// Which shape a tree takes is fixed by its id, so host and guest draw the same forest. Rules still see only types 0..2.
const kindOf = (t: { id: number; type: number }) => { const h = (Math.imul(t.id + 1, 2654435761) >>> 0) / 4294967296; return t.type === 0 ? (h < 0.27 ? 3 : 0) : t.type === 1 ? (h < 0.33 ? 4 : 1) : 2; };

export class Scene3D {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(58, 1, 0.2, 6000);
  sun = new THREE.DirectionalLight(0xffffff, 3);
  hemi = new THREE.HemisphereLight(0xbfd6ff, 0x9a9070, 0.8);
  sunDir = new THREE.Vector3(0, 1, 0);
  fill = new THREE.PointLight(0xffe8d6, 0, 9, 1.4); // soft light from the camera so faces never go flat or black
  daylight = 1;
  private sky!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private stars: THREE.Points;
  private uTime = { value: 0 };
  private grassMat!: THREE.ShaderMaterial;
  private waterMat!: THREE.ShaderMaterial;
  private mist!: THREE.Points;
  private treeRef: { trunk: THREE.InstancedMesh; leaf: THREE.InstancedMesh; i: number }[] = [];
  private hidden = new Set<number>();
  private grassGeo!: THREE.InstancedBufferGeometry;
  private hm!: THREE.DataTexture;
  // Canopy shade for the grass and flowers, which cannot read the real shadow map.
  private shadeData = new Uint8Array(SHADE_N * SHADE_N);
  private shadeTex = new THREE.DataTexture(this.shadeData, SHADE_N, SHADE_N, THREE.RedFormat, THREE.UnsignedByteType);
  private shadeAt = { x: 1e9, z: 1e9, ox: 0, oz: 0, dirty: true };
  fx!: Fx;
  setQuality(grass: number, shadows: boolean) {
    this.grassGeo.instanceCount = Math.floor(GRASS_COUNT * grass); this.fx.setDensity(grass);
    this.sun.castShadow = shadows; this.renderer.shadowMap.enabled = shadows;
    this.scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m) m.needsUpdate = true; });
  }
  // The player's own waypoint: a thin pale column, wider with distance so it can be picked out from afar.
  private beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 70, 6, 1, true).translate(0, 35, 0),
    new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
  setWaypoint(p: { x: number; z: number } | null) {
    this.beam.visible = !!p;
    if (p && (p.x !== this.beam.position.x || p.z !== this.beam.position.z)) this.beam.position.set(p.x, Math.max(this.world.height(p.x, p.z), this.world.waterAt(p.x, p.z)) - 0.5, p.z);
  }
  private stumpGeo = new THREE.CylinderGeometry(0.26, 0.32, 0.5, 7);
  private stumpMat = new THREE.MeshStandardMaterial({ color: 0x5a4330, roughness: 1 });

  constructor(canvas: HTMLCanvasElement, private world: World) {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.85;
    this.scene.fog = new THREE.FogExp2(0xa8c0d8, 0.0012);

    // Painted sky: a gradient from horizon haze to zenith, with a sun glow.
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3() }, uGlow: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uZen, uHor, uSun, uGlow; varying vec3 vD;
        void main(){ vec3 d = normalize(vD); float h = clamp(d.y, 0.0, 1.0);
          vec3 col = mix(uHor, uZen, pow(h, 0.5));
          float s = max(dot(d, uSun), 0.0);
          col += uGlow*(pow(s, 900.0)*3.0 + pow(s, 40.0)*0.35 + pow(s, 5.0)*0.18*(1.0 - h));
          gl_FragColor = vec4(col, 1.0); }`,
    }));
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    const sp = new Float32Array(1500 * 3), rnd = mulberry32(7);
    for (let i = 0; i < 1500; i++) {
      const a = rnd() * 6.283, e = Math.asin(rnd() * 0.95 + 0.03), R = 2300;
      sp.set([Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R], i * 3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.scene.add(this.stars);

    const s = this.sun;
    s.castShadow = true; s.shadow.mapSize.set(2048, 2048);
    const c = s.shadow.camera; c.left = -55; c.right = 55; c.top = 55; c.bottom = -55; c.near = 1; c.far = 500;
    s.shadow.bias = -0.0004; s.shadow.normalBias = 0.6;
    this.scene.add(s, s.target, this.hemi, this.fill);
    this.beam.visible = false; this.beam.renderOrder = 5; this.scene.add(this.beam);

    this.buildGround(); this.buildTerrain(); this.buildWater(); this.buildGrass(); this.buildTrees(); this.buildScenery(); this.buildRocks();
    this.fx = new Fx(this.scene, this.grassMat.uniforms);
  }

  private buildTerrain() {
    const w = this.world, pos = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3), idx: number[] = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      pos.set([i * CELL - HALF, w.h[k], j * CELL - HALF], k * 3);
      if (i < N - 1 && j < N - 1) idx.push(k, k + N, k + 1, k + 1, k + N, k + N + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const nrm = g.getAttribute('normal');
    const mix = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    for (let k = 0; k < N * N; k++) {
      const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2], ny = nrm.getY(k), wet = w.wet[k];
      const v = fbm(x * 0.02, z * 0.02, 3, 11), patch = fbm(x * 0.012, z * 0.012, 3, w.seed + 3);
      let c = mix([0.30, 0.44, 0.14], [0.17, 0.27, 0.09], smooth(0.42, 0.56, patch));      // meadow vs forest floor
      c = mix(c, [0.42, 0.42, 0.2], smooth(floorH(z) + 20, floorH(z) + 90, y) * 0.7);        // drier with height
      c = mix(c, [0.2, 0.42, 0.13], smooth(0.5, 0.85, wet));                                 // lush near water
      c = mix(c, [0.5, 0.47, 0.4], smooth(0.955, 1, wet));                                     // gravel bank
      if (w.waterY[k] > y) c = mix(c, [0.36, 0.34, 0.28], 0.8);                              // river and lake bed
      c = mix(c, [0.4, 0.38, 0.36], 1 - smooth(0.62, 0.8, ny));                              // bare rock on steep ground
      c = mix(c, [0.92, 0.94, 0.98], smooth(215, 250, y + v * 30) * smooth(0.5, 0.75, ny));  // snow
      const shade = 0.82 + v * 0.36;
      col.set([c[0] * shade, c[1] * shade, c[2] * shade], k * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // Fine grain so the ground is not flat colour up close.
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const cx = cv.getContext('2d')!, img = cx.createImageData(256, 256), rnd = mulberry32(3);
    for (let i = 0; i < 256 * 256; i++) { const q = 190 + rnd() * 65; img.data.set([q, q, q, 255], i * 4); }
    cx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(220, 220); tex.colorSpace = THREE.SRGBColorSpace;
    const uv = new Float32Array(N * N * 2);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) uv.set([i / (N - 1), j / (N - 1)], (j * N + i) * 2);
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, roughness: 1 }));
    m.receiveShadow = true;
    this.scene.add(m);
  }

  private buildWater() {
    const w = this.world;
    this.waterMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uTime: { value: 0 }, uHor: { value: new THREE.Color() }, uZen: { value: new THREE.Color() },
        uDeep: { value: new THREE.Color(0x1b6272) }, uShallow: { value: new THREE.Color(0x6a9080) }, uHM: { value: this.hm },
        uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uLevel: { value: 1 },
      }]),
      vertexShader: `attribute vec3 aFlow; varying vec3 vW; varying vec3 vF;
        #include <fog_pars_vertex>
        void main(){ vec4 wp = modelMatrix*vec4(position,1.0); vW = wp.xyz; vF = aFlow;
          vec4 mvPosition = viewMatrix*wp; gl_Position = projectionMatrix*mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform float uTime, uLevel; uniform vec3 uHor, uZen, uDeep, uShallow, uSunDir, uSunCol; uniform sampler2D uHM; varying vec3 vW; varying vec3 vF;
        #include <fog_pars_fragment>
        float hAt(ivec2 c){ return texelFetch(uHM, clamp(c, ivec2(0), ivec2(${N - 1})), 0).r; }
        float groundAt(vec2 wp){ vec2 f = (wp + ${HALF}.0)/${CELL}.0; ivec2 i = ivec2(floor(f)); vec2 u = fract(f);
          return mix(mix(hAt(i), hAt(i+ivec2(1,0)), u.x), mix(hAt(i+ivec2(0,1)), hAt(i+ivec2(1,1)), u.x), u.y); }
        void main(){
          float depth = max(vW.y - groundAt(vW.xz), 0.0), dk = smoothstep(0.0, 0.95, depth);
          vec2 q = vW.xz*0.9 - vF.xy*uTime*1.8;
          float a = q.x*1.3, b = q.y*1.3 + uTime*0.4, amp = 0.45 + 0.55*dk;
          // Three wave trains running in unrelated directions, so a wide lake does not show a regular grid.
          vec2 d1 = vec2(1.3, 0.4), d2 = vec2(-0.65, 1.95), d3 = vec2(2.07, -2.53);
          vec2 g = 0.05*cos(dot(q,d1) + uTime*0.9)*d1 + 0.034*cos(dot(q,d2) - uTime*0.7)*d2 + 0.016*cos(dot(q,d3) + uTime*1.3)*d3;
          vec3 n = normalize(vec3(amp*g.x, 1.0, amp*g.y));
          vec3 V = normalize(cameraPosition - vW);
          float fres = 0.05 + 0.9*pow(1.0 - max(dot(n,V),0.0), 4.0);
          // The mirror shows the same painted sky: horizon haze low down (so far water melts into the fog), zenith blue higher up.
          vec3 R = reflect(-V, n);
          vec3 sky = mix(uHor, uZen, pow(clamp(R.y, 0.0, 1.0), 0.5));
          vec3 col = mix(mix(uShallow, uDeep, dk)*uLevel, sky, fres);
          col += pow(max(dot(reflect(-uSunDir,n),V),0.0), 140.0)*uSunCol*0.5;
          float ripple = sin(a*2.0)*sin(b*2.0), wob = 0.5 + 0.5*sin(q.x*3.1 + sin(q.y*2.3 + uTime*0.7)*1.5);
          float shore = (1.0 - smoothstep(0.0, 0.1, depth + 0.03*sin(uTime*1.1 + vW.x*0.7 + vW.z*0.9)))*(0.3 + 0.35*wob);
          float rapid = smoothstep(0.3, 0.85, vF.z + 0.3*ripple)*(0.7 + 0.3*wob);
          float foam = clamp(max(shore, rapid), 0.0, 1.0);
          col = mix(col, vec3(0.9,0.94,0.96)*(0.02+0.8*uLevel), foam);
          gl_FragColor = vec4(col, max(mix(mix(0.38, 0.9, dk), 1.0, fres), foam));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    const lake = new THREE.CircleGeometry(150, 48); lake.rotateX(-Math.PI / 2);
    lake.setAttribute('aFlow', new THREE.BufferAttribute(new Float32Array(lake.getAttribute('position').count * 3), 3));
    const lm = new THREE.Mesh(lake, this.waterMat); lm.position.set(LAKE.x, LAKE.level + 0.03, LAKE.z); this.scene.add(lm);

    const rv = w.river, pos: number[] = [], fl: number[] = [], idx: number[] = [];
    rv.forEach((p, i) => {
      const f = w.flow(p.z), px = f.z, pz = -f.x, hw = p.w * 1.5;
      pos.push(p.x + px * hw, p.y, p.z + pz * hw, p.x - px * hw, p.y, p.z - pz * hw);
      const foam = Math.min(1, p.steep * 1.2 + (rv[Math.max(0, i - 6)].steep > 0.5 ? 0.5 : 0));
      fl.push(f.x, f.z, foam, f.x, f.z, foam);
      if (i < rv.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    });
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute('aFlow', new THREE.Float32BufferAttribute(fl, 3)); rg.setIndex(idx);
    const rm = new THREE.Mesh(rg, this.waterMat); rm.frustumCulled = false; this.scene.add(rm);

    // Spray at the foot of the waterfall.
    const mp = new Float32Array(260 * 3), rnd = mulberry32(9), bx = riverX(-306);
    for (let i = 0; i < 260; i++) mp.set([bx + (rnd() - 0.5) * 22, floorH(-300) + rnd() * 26, -310 + rnd() * 16], i * 3);
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    // Soft round puffs (a plain point is a hard square).
    const pc = document.createElement('canvas'); pc.width = pc.height = 64;
    const px = pc.getContext('2d')!, gr = px.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    px.fillStyle = gr; px.fillRect(0, 0, 64, 64);
    this.mist = new THREE.Points(mg, new THREE.PointsMaterial({ color: 0xffffff, size: 4.5, map: new THREE.CanvasTexture(pc), transparent: true, opacity: 0.1, depthWrite: false }));
    this.scene.add(this.mist);
  }

  /** One texture describing the ground for the shaders: r height, g grass, b open meadow (flowers), a leaf fall (forest). */
  private buildGround() {
    const w = this.world, data = new Float32Array(N * N * 4);
    for (let k = 0; k < N * N; k++) {
      const i = k % N, j = Math.floor(k / N), x = i * CELL - HALF, z = j * CELL - HALF;
      const sy = w.slopeY(x, z), y = w.h[k];
      const patch = fbm(x * 0.012, z * 0.012, 3, w.seed + 3), forest = smooth(0.44, 0.56, patch);
      let m = smooth(0.78, 0.92, sy) * (1 - smooth(120, 170, y)) * (1 - 0.55 * forest);
      if (w.waterY[k] > y - 0.15) m = 0;
      data[k * 4] = y; data[k * 4 + 1] = m;
      data[k * 4 + 2] = m * smooth(0.86, 0.95, sy) * (1 - smooth(0.38, 0.5, patch)) * (1 - smooth(0.88, 0.96, w.wet[k])) * (1 - smooth(floorH(z) + 25, floorH(z) + 60, y));
      data[k * 4 + 3] = (0.12 + 0.88 * forest) * (1 - smooth(120, 170, y));
    }
    const hm = (this.hm = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.FloatType));
    hm.minFilter = hm.magFilter = THREE.NearestFilter; hm.needsUpdate = true;
  }

  private buildGrass() {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.028, 0, 0, 0.028, 0, 0, -0.02, 0.5, 0, 0.02, 0.5, 0, 0, 1, 0], 3));
    g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
    const off = new Float32Array(GRASS_COUNT * 3), rnd = mulberry32(21);
    for (let i = 0; i < GRASS_COUNT; i++) off.set([rnd() * GRASS_SPAN, rnd() * GRASS_SPAN, rnd()], i * 3);
    g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3));
    g.instanceCount = GRASS_COUNT;
    this.grassMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uCam: { value: new THREE.Vector2() }, uTime: { value: 0 }, uWind: { value: new THREE.Vector2(1, 0) },
        uS: { value: GRASS_SPAN }, uLight: { value: new THREE.Color() }, uHM: { value: null }, uShade: { value: null }, uShadeO: { value: new THREE.Vector4(0, 0, 1 / SHADE_N, 0) },
      }]),
      vertexShader: `uniform sampler2D uHM; uniform vec2 uCam, uWind; uniform float uTime, uS; attribute vec3 aOff; varying float vY; varying float vR; varying float vG; varying float vP; varying float vS;
        #include <fog_pars_vertex>
        ${SHADE}
        float hAt(ivec2 c){ return texelFetch(uHM, clamp(c, ivec2(0), ivec2(${N - 1})), 0).r; }
        void main(){
          vec2 wp = aOff.xy + floor((uCam - aOff.xy)/uS + 0.5)*uS;
          vec2 f = (wp + ${HALF}.0)/${CELL}.0; ivec2 i = ivec2(floor(f)); vec2 u = fract(f);
          float h = mix(mix(hAt(i), hAt(i+ivec2(1,0)), u.x), mix(hAt(i+ivec2(0,1)), hAt(i+ivec2(1,1)), u.x), u.y);
          float mask = texelFetch(uHM, clamp(ivec2(floor(f+0.5)), ivec2(0), ivec2(${N - 1})), 0).g;
          float fade = 1.0 - smoothstep(uS*0.36, uS*0.48, distance(wp, uCam));
          float clump = 0.72 + 0.4*sin(wp.x*0.37)*sin(wp.y*0.29 + 1.3);
          float hgt = (0.26 + 0.5*aOff.z)*clump*mask*fade;
          float a = aOff.z*6.283; vec3 p = vec3(position.x*cos(a), position.y*hgt, position.x*sin(a));
          float gd = dot(wp, uWind);
          float gust = (sin(gd*0.11 - uTime*1.5)*0.5 + 0.5)*(0.6 + 0.4*sin(gd*0.031 - uTime*0.5 + wp.x*0.02));
          float sway = gust*0.55 + 0.1*sin(uTime*3.3 + aOff.z*40.0) + 0.08; vG = gust;
          vP = 0.5 + 0.5*sin(wp.x*0.05 + sin(wp.y*0.043)*2.0);
          vS = shadeAt(wp, fract(aOff.z*17.3));
          p.xz += uWind*sway*position.y*position.y*hgt;
          vec4 mvPosition = viewMatrix*vec4(wp.x + p.x, h + p.y, wp.y + p.z, 1.0);
          gl_Position = projectionMatrix*mvPosition; vY = position.y; vR = aOff.z;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform vec3 uLight; varying float vY; varying float vR; varying float vG; varying float vP; varying float vS;
        const vec3 SHADE_TINT = vec3(0.36, 0.45, 0.56);
        #include <fog_pars_fragment>
        void main(){
          vec3 tip = mix(mix(vec3(0.17,0.38,0.08), vec3(0.3,0.45,0.1), vR), vec3(0.5,0.47,0.17), vP*0.55);
          vec3 base = mix(vec3(0.035,0.1,0.025), tip, pow(vY, 0.8));
          base += vec3(0.1,0.12,0.04)*vG*vY*vY;
          gl_FragColor = vec4(base*uLight*mix(vec3(1.0), SHADE_TINT, vS), 1.0);   // darker and cooler under a tree
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    this.grassMat.uniforms.uHM.value = this.hm;
    this.shadeTex.minFilter = this.shadeTex.magFilter = THREE.LinearFilter; this.grassMat.uniforms.uShade.value = this.shadeTex;
    const m = new THREE.Mesh(g, this.grassMat); m.frustumCulled = false; this.scene.add(m); this.grassGeo = g;
  }

  private sway(mat: THREE.MeshStandardMaterial) {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec4 swp = instanceMatrix*vec4(position,1.0);
          float sw = sin(uTime*1.3 + swp.x*0.3 + swp.z*0.25)*0.05*position.y;
          transformed.x += sw; transformed.z += sw*0.6;
        #endif`);
    };
    return mat;
  }

  private buildTrees() {
    const ni = (g: THREE.BufferGeometry) => { const q = g.index ? g.toNonIndexed() : g; q.deleteAttribute('uv'); return q; };
    const ico = (r: number, x: number, y: number, z: number, sy = 1) => { const g = new THREE.IcosahedronGeometry(r, 1); g.scale(1, sy, 1); g.translate(x, y, z); return ni(g); };
    const cone = (r: number, h: number, y: number) => { const g = new THREE.ConeGeometry(r, h, 7); g.translate(0, y, 0); return ni(g); };
    const cyl = (a: number, b: number, h: number) => { const g = new THREE.CylinderGeometry(a, b, h, 6); g.translate(0, h / 2, 0); return g; };
    const kinds = [
      { trunk: cyl(0.18, 0.32, 4.2), leaf: mergeGeometries([ico(2.3, 0, 5.6, 0), ico(1.7, 1.3, 4.6, 0.5), ico(1.6, -1.1, 4.8, -0.7)])!, col: [0.2, 0.36, 0.1] },
      { trunk: cyl(0.12, 0.28, 5), leaf: mergeGeometries([cone(2.1, 3.4, 3.6), cone(1.6, 3, 5.6), cone(1.05, 2.6, 7.5)])!, col: [0.1, 0.24, 0.12] },
      { trunk: cyl(0.2, 0.34, 3), leaf: mergeGeometries([ico(2.6, 0, 3.7, 0, 0.7), ico(1.6, 1.4, 3.0, 0.4, 0.7)])!, col: [0.33, 0.45, 0.16] },
      // Birch: thin pale trunk, light airy crown.
      { trunk: cyl(0.08, 0.17, 5.6), leaf: mergeGeometries([ico(1.25, 0, 6.3, 0, 1.25), ico(1.0, 0.6, 5.0, 0.3, 1.1), ico(0.9, -0.55, 4.3, -0.4, 1.1)])!, col: [0.4, 0.5, 0.15], bark: 0xcfc8b8 },
      // Tall pine: long bare trunk, flat dark crown high up.
      { trunk: cyl(0.13, 0.3, 8.6), leaf: mergeGeometries([ico(2.1, 0, 9.2, 0, 0.5), ico(1.5, 0.9, 8.1, 0.4, 0.45), ico(1.3, -1.0, 7.5, -0.5, 0.45), cone(0.9, 1.6, 10.4)])!, col: [0.11, 0.25, 0.13], bark: 0x6b4a34 },
    ] as { trunk: THREE.BufferGeometry; leaf: THREE.BufferGeometry; col: number[]; bark?: number }[];
    const trunkMat = this.sway(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
    const leafMat = this.sway(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }));
    const groups = new Map<string, number[]>();
    for (const t of this.world.trees) {
      const key = `${kindOf(t)}:${Math.floor((t.x + HALF) / 128)}:${Math.floor((t.z + HALF) / 128)}`;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(t.id);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color(), rnd = mulberry32(4);
    for (const [key, ids] of groups) {
      const k = kinds[+key[0]];
      const trunk = new THREE.InstancedMesh(k.trunk, trunkMat, ids.length), leaf = new THREE.InstancedMesh(k.leaf, leafMat, ids.length);
      trunk.castShadow = leaf.castShadow = true; leaf.receiveShadow = true;
      ids.forEach((id, i) => {
        const t = this.world.trees[id];
        q.setFromAxisAngle(up, rnd() * 6.283);
        m4.compose(new THREE.Vector3(t.x, t.y - 0.15, t.z), q, new THREE.Vector3(t.s, t.s * (0.9 + rnd() * 0.25), t.s));
        trunk.setMatrixAt(i, m4); leaf.setMatrixAt(i, m4);
        trunk.setColorAt(i, c.set(k.bark ?? 0x4f3b2a));
        const v = 0.75 + rnd() * 0.5; leaf.setColorAt(i, c.setRGB(k.col[0] * v, k.col[1] * v, k.col[2] * (0.8 + rnd() * 0.4)));
        this.treeRef[id] = { trunk, leaf, i };
      });
      this.scene.add(trunk, leaf);
    }
  }

  /** Paint the shadows of the standing trees near (cx, cz) into the shade map, as the grass and flowers see them.
   *  Each crown is an ellipsoid; (ox, oz) is how far a shadow lands from the trunk per metre of height. A few hundred texels per tree. */
  private bakeShade(cx: number, cz: number, ox: number, oz: number) {
    const d = this.shadeData, w = this.world, sa = this.shadeAt, x0 = cx - SHADE_N / 2, z0 = cz - SHADE_N / 2;
    const cot = Math.hypot(ox, oz), ux = cot > 1e-4 ? ox / cot : 1, uz = cot > 1e-4 ? oz / cot : 0;
    d.fill(0);
    const c0 = Math.floor((x0 + HALF - 56) / 8), c1 = Math.floor((x0 + SHADE_N + HALF + 56) / 8), e0 = Math.floor((z0 + HALF - 56) / 8), e1 = Math.floor((z0 + SHADE_N + HALF + 56) / 8);
    for (let a = c0; a <= c1; a++) for (let b = e0; b <= e1; b++) for (const id of w.treeGrid.get(a * 1000 + b) ?? []) {
      if (this.hidden.has(id)) continue;
      const t = w.trees[id], k = CROWN[kindOf(t)], B = k[0] * t.s, A = Math.hypot(B, k[1] * t.s * cot), h = k[2] * t.s, dens = k[3] * 255;
      const mx = t.x + ox * h - x0, mz = t.z + oz * h - z0;
      const i0 = Math.max(1, Math.floor(mx - A)), i1 = Math.min(SHADE_N - 2, Math.ceil(mx + A)), j0 = Math.max(1, Math.floor(mz - A)), j1 = Math.min(SHADE_N - 2, Math.ceil(mz + A));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = i + 0.5 - mx, pz = j + 0.5 - mz, p = (px * ux + pz * uz) / A, q = (pz * ux - px * uz) / B, r = Math.sqrt(p * p + q * q);
        if (r >= 1.1) continue;
        const v = dens * (1 - smooth(0.7, 1.1, r)), n = j * SHADE_N + i;
        if (v > d[n]) d[n] = v;
      }
    }
    sa.x = cx; sa.z = cz; sa.ox = ox; sa.oz = oz; sa.dirty = false;
    this.shadeTex.needsUpdate = true;
    this.grassMat.uniforms.uShadeO.value.set(x0, z0, 1 / SHADE_N, this.grassMat.uniforms.uShadeO.value.w);
  }

  hideTree(id: number) {
    if (this.hidden.has(id)) return;
    this.hidden.add(id); this.shadeAt.dirty = true; // its shade goes with it
    const r = this.treeRef[id], t = this.world.trees[id], z = new THREE.Matrix4().makeScale(0, 0, 0);
    r.trunk.setMatrixAt(r.i, z); r.leaf.setMatrixAt(r.i, z);
    r.trunk.instanceMatrix.needsUpdate = r.leaf.instanceMatrix.needsUpdate = true;
    const s = new THREE.Mesh(this.stumpGeo, this.stumpMat); s.position.set(t.x, t.y + 0.15, t.z); s.scale.setScalar(t.s); s.castShadow = true;
    this.scene.add(s);
  }

  /** Undergrowth and dead wood, drawn from the world's own list (worldgen), which the rules also use for collision. */
  private buildScenery() {
    const w = this.world;
    type Spot = { x: number; z: number; m: THREE.Matrix4; c: THREE.Color };
    const bushes: Spot[] = [], logs: Spot[] = [], stumps: Spot[] = [];
    const q = new THREE.Quaternion(), e = new THREE.Euler(), up = new THREE.Vector3(0, 1, 0);
    for (const o of w.scenery) {
      const { x, z, y, yaw, a: r2, b: r3, s: sc } = o;
      if (o.kind === 0) {
        const v = 0.7 + r3 * 0.5;
        bushes.push({ x, z, m: new THREE.Matrix4().compose(new THREE.Vector3(x, y - 0.1, z), q.setFromAxisAngle(up, yaw), new THREE.Vector3(sc, sc * (0.8 + r3 * 0.4), sc)), c: new THREE.Color(0.17 * v, 0.31 * v, 0.1 * v) });
      } else if (o.kind === 1) {
        const gx = (w.height(x + Math.sin(yaw), z + Math.cos(yaw)) - w.height(x - Math.sin(yaw), z - Math.cos(yaw))) / 2;
        q.setFromEuler(e.set(Math.PI / 2 - Math.atan(gx), yaw, 0, 'YXZ'));
        logs.push({ x, z, m: new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.13, z), q, new THREE.Vector3(sc, o.hl / 2, sc)), c: new THREE.Color().setHSL(0.07 + r3 * 0.05, 0.25, 0.14 + r2 * 0.08) });
      } else {
        stumps.push({ x, z, m: new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.2 * sc, z), q.setFromAxisAngle(up, yaw), new THREE.Vector3(sc, sc * (0.7 + r3 * 0.8), sc)), c: new THREE.Color().setHSL(0.08, 0.2, 0.13 + r3 * 0.08) });
      }
    }
    const ico = (r: number, x: number, y: number, z: number) => { const g = new THREE.IcosahedronGeometry(r, 0); g.scale(1, 0.75, 1); g.translate(x, y, z); g.deleteAttribute('uv'); return g; };
    const bushGeo = mergeGeometries([ico(0.8, 0, 0.5, 0), ico(0.6, 0.6, 0.35, 0.2), ico(0.5, -0.5, 0.3, -0.35)])!;
    const logGeo = new THREE.CylinderGeometry(0.2, 0.26, 4, 7);
    const leafy = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
    const woody = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
    // One instanced mesh per 256 m square, so squares out of view are skipped.
    const place = (spots: Spot[], geo: THREE.BufferGeometry, mat: THREE.Material) => {
      const cells = new Map<number, Spot[]>();
      for (const sp of spots) { const k = Math.floor((sp.x + HALF) / 256) * 8 + Math.floor((sp.z + HALF) / 256); (cells.get(k) ?? cells.set(k, []).get(k)!).push(sp); }
      for (const list of cells.values()) {
        const m = new THREE.InstancedMesh(geo, mat, list.length);
        list.forEach((sp, i) => { m.setMatrixAt(i, sp.m); m.setColorAt(i, sp.c); });
        m.castShadow = m.receiveShadow = true; this.scene.add(m);
      }
    };
    place(bushes, bushGeo, leafy); place(logs, logGeo, woody); place(stumps, this.stumpGeo, woody);
    this.sceneryCount = [bushes.length, logs.length, stumps.length];
  }
  sceneryCount = [0, 0, 0];

  private buildRocks() {
    const w = this.world, rnd = mulberry32(w.seed + 8), g = new THREE.DodecahedronGeometry(1, 0), n = 500;
    const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0x77736c, roughness: 1, flatShading: true }), n);
    const m4 = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion();
    let k = 0;
    for (let tries = 0; k < n && tries < 20000; tries++) {
      const x = (rnd() - 0.5) * 900, z = (rnd() - 0.5) * 980, sy = w.slopeY(x, z), wet = w.wetAt(x, z);
      const bank = wet > 0.85 && w.depth(x, z) < 0.6, scree = sy < 0.8 && sy > 0.55;
      if (!bank && !scree) continue;
      if (Math.hypot(x - w.spawn.x, z - w.spawn.z) < 10) continue;
      const s = bank ? 0.25 + rnd() * 0.7 : 0.6 + rnd() * 2.4;
      q.setFromEuler(e.set(rnd() * 3, rnd() * 3, rnd() * 3));
      m4.compose(new THREE.Vector3(x, w.height(x, z) + s * 0.2, z), q, new THREE.Vector3(s, s * (0.5 + rnd() * 0.4), s * (0.7 + rnd() * 0.5)));
      m.setMatrixAt(k++, m4);
    }
    m.count = k; m.castShadow = m.receiveShadow = true; this.scene.add(m);
  }

  resize(wd: number, ht: number, scale: number) {
    this.renderer.setPixelRatio(scale); this.renderer.setSize(wd, ht, false);
    this.camera.aspect = wd / ht; this.camera.updateProjectionMatrix();
  }

  /** time: 0 midnight, 0.25 sunrise, 0.5 noon. */
  update(dt: number, time: number, px: number, py: number, pz: number, wind: number) {
    this.uTime.value += dt;
    const ang = (time - 0.25) * Math.PI * 2, el = Math.sin(ang);
    this.sunDir.set(Math.cos(ang) * 0.85, el, 0.4).normalize();
    const day = (this.daylight = smooth(-0.12, 0.22, el)), low = 1 - Math.min(1, Math.abs(el) / 0.4);
    this.sky.position.set(px, 0, pz); this.stars.position.set(px, 0, pz);
    (this.stars.material as THREE.PointsMaterial).opacity = (1 - day) * 0.9;

    const dir = new THREE.Vector3();
    if (el > -0.04) {
      dir.copy(this.sunDir);
      this.sun.intensity = 3.3 * smooth(-0.04, 0.3, el);
      this.sun.color.setRGB(1, 0.62 + 0.34 * smooth(0, 0.5, el), 0.36 + 0.54 * smooth(0, 0.5, el));
    } else {
      dir.set(-this.sunDir.x, Math.max(0.35, -el), -this.sunDir.z).normalize(); // moonlight
      this.sun.intensity = 0.32 * smooth(0.04, 0.3, -el);
      this.sun.color.setRGB(0.55, 0.66, 1);
    }
    // The shadow box moves in 4 m steps, not with every footstep, so shadow edges do not crawl as the player walks.
    const sx = Math.round(px / 4) * 4, sy = Math.round(py / 4) * 4, sz = Math.round(pz / 4) * 4;
    this.sun.position.set(sx + dir.x * 200, sy + dir.y * 200, sz + dir.z * 200); this.sun.target.position.set(sx, sy, sz);
    this.hemi.intensity = 0.14 + 1.05 * day;
    this.hemi.color.setRGB(0.55 + 0.3 * low * day, 0.68, 0.95 - 0.3 * low * day);

    const fog = this.scene.fog as THREE.FogExp2;
    const mistAmt = Math.exp(-Math.pow((time - 0.26) / 0.045, 2));
    fog.color.setRGB(0.03 + day * (0.6 + 0.26 * low), 0.04 + day * (0.7 - 0.05 * low), 0.08 + day * (0.82 - 0.3 * low));
    fog.density = 0.0011 + 0.003 * mistAmt + 0.0006 * (1 - day);

    const lightLevel = 0.035 + 0.965 * day * day;
    this.fill.position.copy(this.camera.position).add(new THREE.Vector3(0, 0.6, 0)); this.fill.intensity = 1.2 + 5 * day;
    const su = this.sky.material.uniforms;
    su.uHor.value.copy(fog.color); su.uZen.value.setRGB(0.01 + 0.13 * day, 0.015 + 0.33 * day, 0.05 + 0.68 * day);
    su.uSun.value.copy(dir); su.uGlow.value.copy(this.sun.color).multiplyScalar(el > -0.04 ? 0.35 + 0.65 * low : 0.5);
    const gu = this.grassMat.uniforms;
    gu.uCam.value.set(px, pz); gu.uTime.value = this.uTime.value; gu.uWind.value.set(Math.sin(wind), Math.cos(wind));
    gu.uLight.value.setRGB(lightLevel * (1 + 0.3 * low), lightLevel, lightLevel * (1 - 0.15 * low));
    // Canopy shade follows the light: strongest in full sun, faint under the moon, none while the light changes over or with shadows off.
    const shadeK = !this.sun.castShadow ? 0 : el > -0.04 ? 0.85 * smooth(-0.04, 0.3, el) : 0.3 * smooth(0.04, 0.3, -el);
    gu.uShadeO.value.w = shadeK;
    if (shadeK > 0) {
      const flat = Math.hypot(dir.x, dir.z), cot = Math.min(4, flat / Math.max(dir.y, 0.05)), ox = flat > 1e-4 ? (-dir.x / flat) * cot : 0, oz = flat > 1e-4 ? (-dir.z / flat) * cot : 0;
      const sa = this.shadeAt;
      if (sa.dirty || Math.abs(px - sa.x) > 16 || Math.abs(pz - sa.z) > 16 || Math.hypot(ox - sa.ox, oz - sa.oz) > 0.04) this.bakeShade(Math.round(px / 16) * 16, Math.round(pz / 16) * 16, ox, oz);
    }
    const wu = this.waterMat.uniforms;
    wu.uTime.value = this.uTime.value; wu.uHor.value.copy(fog.color); wu.uZen.value.copy(su.uZen.value); wu.uSunDir.value.copy(dir);
    wu.uSunCol.value.copy(this.sun.color).multiplyScalar(Math.min(1, this.sun.intensity)); wu.uLevel.value = lightLevel;

    if (this.beam.visible) {
      const d = Math.hypot(this.beam.position.x - px, this.beam.position.z - pz), wdt = Math.max(1, d / 45);
      this.beam.scale.set(wdt, 1 + d / 250, wdt);
      (this.beam.material as THREE.MeshBasicMaterial).opacity = (0.1 + 0.24 * day) * smooth(3, 12, d);
    }

    this.fx.update(this.camera, this.renderer.domElement.height, day);

    const mp = this.mist.geometry.getAttribute('position') as THREE.BufferAttribute, base = floorH(-300);
    for (let i = 0; i < mp.count; i++) { let y = mp.getY(i) + dt * (1.5 + (i % 5) * 0.4); if (y > base + 26) y = base; mp.setY(i, y); }
    mp.needsUpdate = true;
    const mm = this.mist.material as THREE.PointsMaterial;
    mm.opacity = 0.06 + 0.16 * day; mm.color.setScalar(0.08 + 0.92 * lightLevel); // spray is lit by the day, it does not shine at night
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
