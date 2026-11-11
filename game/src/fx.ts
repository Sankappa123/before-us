// Small living things near the player: meadow flowers, and leaves and pollen on the wind.
// Both wrap around the player like the grass does, and read the same ground texture
// (r = height, g = grass, b = open meadow, a = leaf fall), so they cost almost nothing on the processor.
import * as THREE from 'three';
import { N, CELL, HALF } from './worldgen';
import { mulberry32 } from './noise';

const FLOWER_SPAN = 56, FLOWER_COUNT = 7000, SPECK_COUNT = 420;
type U = { value: any };

const GROUND = `uniform sampler2D uHM;
  float hAt(ivec2 c){ return texelFetch(uHM, clamp(c, ivec2(0), ivec2(${N - 1})), 0).r; }
  float groundAt(vec2 wp){ vec2 f = (wp + ${HALF}.0)/${CELL}.0; ivec2 i = ivec2(floor(f)); vec2 u = fract(f);
    return mix(mix(hAt(i), hAt(i+ivec2(1,0)), u.x), mix(hAt(i+ivec2(0,1)), hAt(i+ivec2(1,1)), u.x), u.y); }
  vec4 landAt(vec2 wp){ return texelFetch(uHM, clamp(ivec2(floor((wp + ${HALF}.0)/${CELL}.0 + 0.5)), ivec2(0), ivec2(${N - 1})), 0); }`;

/** Canopy shade: a small map of tree shadows around the player (see Scene3D.bakeShade). xy = its corner in the world, z = 1/size, w = strength. */
export const SHADE = `uniform sampler2D uShade; uniform vec4 uShadeO;
  float shadeAt(vec2 wp, float rnd){ float s = texture2D(uShade, (wp - uShadeO.xy)*uShadeO.z).r;
    return smoothstep(0.2, 0.8, s + (rnd - 0.5)*0.4)*uShadeO.w; }
  const vec3 SHADE_TINT = vec3(0.36, 0.45, 0.56);`;

export class Fx {
  flowers: THREE.Mesh; specks: THREE.Points;
  private flowerGeo = new THREE.InstancedBufferGeometry();
  private speckGeo = new THREE.BufferGeometry();
  private speckMat: THREE.ShaderMaterial;

  /** `shared` are the grass shader's own uniforms (uCam, uTime, uWind, uLight, uHM, uShade, uShadeO), so everything moves and darkens together. */
  constructor(scene: THREE.Scene, shared: Record<string, U>) {
    // ---- flowers: a thin stem and a six-sided head turned a little towards the viewer ----
    const pos: number[] = [-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0], part: number[] = [0, 0, 0, 0], idx = [0, 1, 2, 1, 3, 2];
    pos.push(0, 1, 0); part.push(2);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; pos.push(Math.cos(a), 1, Math.sin(a)); part.push(1); idx.push(4, 5 + i, 5 + ((i + 1) % 6)); }
    const g = this.flowerGeo;
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aK', new THREE.Float32BufferAttribute(part, 1)); g.setIndex(idx);
    const off = new Float32Array(FLOWER_COUNT * 3), rnd = mulberry32(57);
    for (let i = 0; i < FLOWER_COUNT; i++) off.set([rnd() * FLOWER_SPAN, rnd() * FLOWER_SPAN, rnd()], i * 3);
    g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3)); g.instanceCount = FLOWER_COUNT;
    const flowerMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, fog: true,
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uCam: shared.uCam, uTime: shared.uTime, uWind: shared.uWind, uLight: shared.uLight, uHM: shared.uHM, uShade: shared.uShade, uShadeO: shared.uShadeO, uS: { value: FLOWER_SPAN } },
      vertexShader: `uniform vec2 uCam, uWind; uniform float uTime, uS; attribute vec3 aOff; attribute float aK; varying vec3 vCol;
        ${GROUND}
        ${SHADE}
        #include <fog_pars_vertex>
        void main(){
          vec2 wp = aOff.xy + floor((uCam - aOff.xy)/uS + 0.5)*uS;
          float h = groundAt(wp), meadow = landAt(wp).b, r1 = fract(aOff.z*7.13), r2 = fract(aOff.z*13.7), r3 = fract(aOff.z*5.3);
          // Flowers grow in drifts, not evenly.
          float drift = smoothstep(0.1, 0.55, sin(wp.x*0.09 + sin(wp.y*0.07)*1.7)*sin(wp.y*0.083 + 1.1 + sin(wp.x*0.05)*1.3));
          float sc = step(r1, meadow*(0.06 + 0.94*drift))*(1.0 - smoothstep(uS*0.36, uS*0.47, distance(wp, uCam)));
          float hgt = (0.2 + 0.2*r2)*sc, rad = (0.036 + 0.03*r3)*sc;
          float gd = dot(wp, uWind);
          float gust = (sin(gd*0.11 - uTime*1.5)*0.5 + 0.5)*(0.6 + 0.4*sin(gd*0.031 - uTime*0.5 + wp.x*0.02));
          vec2 lean = uWind*(gust*0.4 + 0.08*sin(uTime*2.7 + aOff.z*40.0))*hgt;
          vec2 toCam = normalize(cameraPosition.xz - wp + 1e-3);
          vec3 p;
          if (aK < 0.5) { p = vec3(-toCam.y*position.x*0.006*sc, hgt*position.y, toCam.x*position.x*0.006*sc); p.xz += lean*position.y*position.y; }
          else { vec3 n = normalize(vec3(toCam.x*0.55, 0.85, toCam.y*0.55)), u = normalize(cross(n, vec3(0.0,1.0,0.0))), v = cross(n, u);
            p = vec3(lean.x, hgt, lean.y) + (u*position.x + v*position.z)*rad; }
          float kind = r3*0.45 + 0.55*(0.5 + 0.5*sin(wp.x*0.06 + wp.y*0.045 + 2.0*sin(wp.y*0.021)));
          vec3 petal = kind < 0.42 ? vec3(0.86,0.84,0.76) : kind < 0.7 ? vec3(0.9,0.66,0.1) : vec3(0.55,0.4,0.78);
          vCol = aK < 0.5 ? vec3(0.16,0.34,0.08) : aK > 1.5 ? (kind < 0.42 || kind >= 0.7 ? vec3(0.85,0.6,0.1) : vec3(0.6,0.36,0.05)) : petal*(0.85 + 0.3*r2);
          vCol *= mix(vec3(1.0), SHADE_TINT, shadeAt(wp, r1));   // under a tree
          vec4 mvPosition = viewMatrix*vec4(wp.x + p.x, h + p.y, wp.y + p.z, 1.0);
          gl_Position = projectionMatrix*mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform vec3 uLight; varying vec3 vCol;
        #include <fog_pars_fragment>
        void main(){
          gl_FragColor = vec4(vCol*uLight, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    this.flowers = new THREE.Mesh(g, flowerMat); this.flowers.frustumCulled = false; scene.add(this.flowers);

    // ---- leaves and pollen: points in a box that follows the camera and drifts down the wind ----
    const seed = new Float32Array(SPECK_COUNT * 4), r2 = mulberry32(58);
    for (let i = 0; i < SPECK_COUNT * 4; i++) seed[i] = r2();
    this.speckGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPECK_COUNT * 3), 3));
    this.speckGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    this.speckMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true,
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: shared.uTime, uWind: shared.uWind, uLight: shared.uLight, uHM: shared.uHM, uPx: { value: 500 }, uDay: { value: 1 } },
      vertexShader: `uniform vec2 uWind; uniform float uTime, uPx, uDay; attribute vec4 aSeed; varying float vA; varying float vKind; varying float vR;
        ${GROUND}
        #include <fog_pars_vertex>
        const vec3 BOX = vec3(44.0, 9.0, 44.0);
        void main(){
          float kind = step(0.5, aSeed.w), r = fract(aSeed.w*9.1);
          vec3 q = aSeed.xyz*BOX;
          q.xz += uWind*uTime*mix(0.8, 2.4, kind)*(0.7 + 0.6*r);
          q.x += sin(uTime*1.3 + aSeed.w*50.0)*0.5; q.z += cos(uTime*1.1 + aSeed.w*31.0)*0.5;
          float fall = mod(q.y - uTime*mix(0.04, 0.5, kind)*(0.6 + 0.8*r), BOX.y);
          vec2 rel = mod(q.xz - cameraPosition.xz + BOX.xz*0.5, BOX.xz) - BOX.xz*0.5, wp = cameraPosition.xz + rel;
          vec4 land = landAt(wp);
          float dens = mix(0.22 + 0.4*land.b, land.a, kind);           // pollen over meadow, leaves under trees
          vA = smoothstep(0.0, 0.12, dens - fract(aSeed.w*23.7))*(1.0 - smoothstep(BOX.x*0.36, BOX.x*0.49, length(rel)))
             * sin(3.1416*fall/BOX.y)*(0.12 + 0.88*uDay);
          vec4 mvPosition = viewMatrix*vec4(wp.x, groundAt(wp) + 0.2 + fall + 0.2*kind*sin(uTime*2.1 + aSeed.w*17.0), wp.y, 1.0);
          gl_Position = projectionMatrix*mvPosition;
          float px = mix(0.035, 0.13, kind)*(0.7 + 0.6*r)*uPx/max(0.6, -mvPosition.z);
          vA *= min(1.0, px/1.5)*smoothstep(0.6, 1.6, -mvPosition.z); gl_PointSize = max(px, 1.5);
          vKind = kind; vR = r;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform vec3 uLight; uniform float uTime; varying float vA; varying float vKind; varying float vR;
        #include <fog_pars_fragment>
        void main(){
          vec2 pc = gl_PointCoord - 0.5; float a;
          vec3 col;
          if (vKind > 0.5) { // a leaf: a thin oval that turns over as it falls
            float t = vR*6.283 + uTime*(1.2 + 2.0*vR), c = cos(t), s = sin(t);
            vec2 e = vec2(pc.x*c - pc.y*s, (pc.x*s + pc.y*c)*(2.0 + 1.4*sin(uTime*3.0 + vR*20.0)));
            a = 1.0 - smoothstep(0.38, 0.48, length(e));
            col = mix(vec3(0.3,0.36,0.1), vec3(0.5,0.34,0.1), fract(vR*7.0));
          } else { a = (1.0 - smoothstep(0.1, 0.5, length(pc)))*0.7; col = vec3(0.86,0.83,0.66); }
          if (a*vA < 0.02) discard;
          gl_FragColor = vec4(col*uLight, a*vA);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    this.specks = new THREE.Points(this.speckGeo, this.speckMat); this.specks.frustumCulled = false; this.specks.renderOrder = 2; scene.add(this.specks);
  }

  /** 0..1, tied to the grass setting. */
  setDensity(k: number) {
    this.flowerGeo.instanceCount = Math.floor(FLOWER_COUNT * k); this.flowers.visible = k > 0;
    this.speckGeo.setDrawRange(0, Math.floor(SPECK_COUNT * Math.min(1, k * 1.5))); this.specks.visible = k > 0;
  }

  update(camera: THREE.PerspectiveCamera, pixelsHigh: number, day: number) {
    this.speckMat.uniforms.uPx.value = pixelsHigh / (2 * Math.tan((camera.fov * Math.PI) / 360));
    this.speckMat.uniforms.uDay.value = day;
  }
}
