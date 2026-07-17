/**
 * Coastline Condos — unified 3D engine (exterior + first-person walkthrough)
 *
 * One embeddable module powering BOTH the in-page explorer stage and the
 * fullscreen viewer (same instance is portaled between the two, so what you
 * see small is exactly what you see enlarged), plus the standalone
 * /3d-model/ page.
 *
 * Exterior: photo-matched facade (v3) on the TRUE Planta Baja site plan —
 * pool 3.55 × 5.6 m with chamfered corner at x 4.37–7.92 / z 2.77–8.37,
 * pump room on the left lot line, 5-stall row facing the building,
 * perpendicular stalls 6–10 along the right wall, side-street ramp,
 * front gate ramp at x ≈ 11.6–17, and the guard station (garita) just
 * inside the gate at the left corner (per the client).
 *
 * Walkthrough: real unit interiors generated from CC_INVENTORY meter-space
 * room layouts, furnished, with palette/flooring finishes from the Design
 * Studio. WASD/arrows + drag to look on desktop; virtual joystick + drag on
 * touch. Wall collision via per-wall AABBs with door gaps.
 *
 * Usage:
 *   import { createCoastline3D } from './coastline3d.js';
 *   const app = createCoastline3D(container, { hud: true, inventory: window.CC_INVENTORY });
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ---------------------------------------------------------------------- */
/* Shared constants                                                       */
/* ---------------------------------------------------------------------- */

const FLOOR_H = 3.0;
const BUILD_H = 9.0;
const DEPTH = 12.2;
const ROW_LEN = 30.0;
const PEAK_X = 11.1;
const SLOT_W = 0.36;
const EYE = 1.62;

const SEGS = [
  { x0: 0.0, w: 7.5, type: 'white' },
  { x0: 7.5, w: 3.6, type: 'tower' },
  { x0: 11.1, w: 7.5, type: 'white' },
  { x0: 18.6, w: 3.6, type: 'tower' },
  { x0: 22.2, w: 2.8, type: 'terrace' },
  { x0: 25.0, w: 5.0, type: 'end' },
];

/* Site plan (meters, x along facade 0–30, z toward the street) */
const SITE = {
  courtyard: { z0: 1.8, z1: 14.6 },       // terrace edge → front wall
  wallZ: 14.7,                             // perimeter wall centerline
  pool: { x0: 4.37, x1: 7.92, z0: 2.77, z1: 8.37, chamfer: { zA: 4.77, zB: 5.27, xIn: 7.42 } },
  pump: { x0: 0.05, x1: 1.25, z0: 5.1, z1: 6.8 },
  stallRow: { xs: [11.43, 13.98, 16.53, 19.08, 21.63], w: 2.55, z0: 2.7, z1: 7.7 },
  stallCol: { x0: 25.4, x1: 29.9, zs: [1.8, 4.4, 7.0, 9.53, 12.06], ends: 14.59 },
  gate: { x0: 11.6, x1: 17.0 },            // sliding gate opening in the front wall
  garita: { x0: 9.4, x1: 11.2, z0: 12.7, z1: 14.4 }, // guard station: inside gate, left corner
  sideRamp: { z0: 2.4, z1: 8.2 },          // opening in right lot wall onto the side street
};

/* Design Studio finishes */
const PALETTES = {
  p1: { name: 'Sand & Linen', wall: 0xf2ebdd, accent: 0xc9a86c, sofa: 0xd9cdb4, textile: 0xcbb89a },
  p2: { name: 'Ocean Breeze', wall: 0xe9f2f3, accent: 0x2678a8, sofa: 0xb9d2da, textile: 0x7ea8b8 },
  p3: { name: 'Midnight Luxe', wall: 0xddd8d0, accent: 0xa88b4a, sofa: 0x37475a, textile: 0x50617a },
};
const FLOORINGS = {
  fl1: { name: 'Light Oak', base: 0xd9b98a, kind: 'wood' },
  fl2: { name: 'Coastal Stone', base: 0xcfc8bc, kind: 'stone' },
};

const STATUS_COL = { available: 0x2f8f8a, conditional: 0xc9714f, sold: 0x9a948a };

/* ---------------------------------------------------------------------- */

export function createCoastline3D(container, opts = {}) {
  const O = Object.assign({ hud: true, autoLight: 'midday', view: 'orbit', unitsOverlay: false, lang: 'en' }, opts);
  const INV = O.inventory || (typeof window !== 'undefined' ? window.CC_INVENTORY : null) || null;
  const listeners = {};
  const on = (ev, cb) => ((listeners[ev] = listeners[ev] || []).push(cb));
  const emit = (ev, data) => (listeners[ev] || []).forEach((cb) => { try { cb(data); } catch (_) {} });
  const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------ renderer ----------------------------- */
  container.classList.add('cc3d-host');
  const bootW = Math.max(container.clientWidth || 0, 320);
  const bootH = Math.max(container.clientHeight || 0, 240);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(bootW, bootH);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.classList.add('cc3d-canvas');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, bootW / bootH, 0.08, 1500);
  camera.position.set(40, 16, 44);
  camera.rotation.order = 'YXZ';

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(15, 5, 4);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2;
  controls.maxDistance = 180;
  controls.maxPolarAngle = Math.PI / 2 - 0.01;
  controls.update();

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  /* ------------------------------ sky / fog ---------------------------- */
  function makeSky(topColor, bottomColor) {
    const geo = new THREE.SphereGeometry(650, 24, 16);
    const mat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color(topColor) }, bottom: { value: new THREE.Color(bottomColor) } },
      vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vPos; uniform vec3 top; uniform vec3 bottom; void main(){ float h = clamp(normalize(vPos).y*0.62+0.32,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(h,0.5)),1.0); }',
      side: THREE.BackSide,
      depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = -10;
    return m;
  }
  let sky = makeSky(0x7fb2dc, 0xdcedf5);
  scene.add(sky);
  scene.fog = new THREE.Fog(0xdfeaf2, 130, 560);

  /* ------------------------------ lights ------------------------------- */
  const hemi = new THREE.HemisphereLight(0xdfeeff, 0x9a8b74, 0.65);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3df, 1.6);
  sun.position.set(38, 52, 34);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55;
  sun.shadow.camera.bottom = -35;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.00035;
  scene.add(sun, sun.target);
  scene.add(new THREE.AmbientLight(0xffffff, 0.14));

  const poolLight = new THREE.PointLight(0x54d8f0, 0, 14, 2);
  poolLight.position.set(6.1, 0.5, 5.5);
  scene.add(poolLight);
  const porchLight1 = new THREE.PointLight(0xffc87d, 0, 12, 2);
  porchLight1.position.set(9.3, 3.2, 1.4);
  scene.add(porchLight1);
  const porchLight2 = new THREE.PointLight(0xffc87d, 0, 12, 2);
  porchLight2.position.set(20.4, 3.2, 1.4);
  scene.add(porchLight2);
  const garitaLight = new THREE.PointLight(0xffe2a8, 0, 8, 2);
  garitaLight.position.set(10.3, 2.4, 13.5);
  scene.add(garitaLight);

  /* -------------------------- canvas textures -------------------------- */
  function canvasTex(w, h, draw, repX = 1, repY = 1) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repX, repY);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  const stuccoTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = 240 + Math.floor(Math.random() * 16);
      g.fillStyle = `rgba(${v},${v},${v - 3},0.5)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
  }, 2, 2);

  const concreteTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#cbc6ba'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = 175 + Math.floor(Math.random() * 45);
      g.fillStyle = `rgba(${v},${v - 3},${v - 10},0.35)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    for (let i = 0; i < 8; i++) {
      g.fillStyle = `rgba(155,150,138,${0.03 + Math.random() * 0.04})`;
      g.beginPath();
      g.ellipse(Math.random() * w, Math.random() * h, 18 + Math.random() * 34, 12 + Math.random() * 26, Math.random() * 3, 0, 7);
      g.fill();
    }
    g.strokeStyle = 'rgba(120,115,104,0.8)'; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, h / 2); g.lineTo(w, h / 2);
    g.moveTo(w / 2, 0); g.lineTo(w / 2, h);
    g.stroke();
  }, 6, 4);

  const paverTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#dcd5c4'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(160,152,134,0.7)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(0, (h / 4) * i); g.lineTo(w, (h / 4) * i); g.stroke();
      g.beginPath(); g.moveTo((w / 4) * i, 0); g.lineTo((w / 4) * i, h); g.stroke();
    }
    for (let i = 0; i < 1500; i++) {
      const v = 205 + Math.floor(Math.random() * 25);
      g.fillStyle = `rgba(${v},${v - 5},${v - 20},0.4)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }, 8, 2);

  const travTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e6dfcd'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2000; i++) {
      const v = 215 + Math.floor(Math.random() * 25);
      g.fillStyle = `rgba(${v},${v - 6},${v - 22},0.45)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    g.strokeStyle = 'rgba(178,168,144,0.8)'; g.lineWidth = 2;
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo(0, (h / 2) * i); g.lineTo(w, (h / 2) * i); g.stroke();
      g.beginPath(); g.moveTo((w / 2) * i, 0); g.lineTo((w / 2) * i, h); g.stroke();
    }
  }, 6, 6);

  const plankTex = canvasTex(256, 256, (g, w, h) => {
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      const base = 188 + Math.floor(Math.random() * 22);
      g.fillStyle = `rgb(${base},${base - 6},${base - 16})`;
      g.fillRect(0, (h / rows) * r, w, h / rows);
      g.strokeStyle = 'rgba(120,112,98,0.9)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, (h / rows) * r); g.lineTo(w, (h / rows) * r); g.stroke();
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = `rgba(150,140,122,${0.1 + Math.random() * 0.15})`;
        const y = (h / rows) * r + Math.random() * (h / rows);
        g.beginPath(); g.moveTo(Math.random() * w * 0.5, y); g.lineTo(Math.random() * w * 0.5 + w * 0.5, y + (Math.random() - 0.5) * 2); g.stroke();
      }
    }
  }, 2, 2);

  const corrugTex = canvasTex(128, 128, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const s = Math.sin((x / w) * Math.PI * 16);
      const v = 148 + Math.floor(s * 26);
      g.fillStyle = `rgb(${v},${v + 3},${v + 6})`;
      g.fillRect(x, 0, 1, h);
    }
  }, 6, 1);

  const curtainTex = canvasTex(256, 256, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const s = Math.sin((x / w) * Math.PI * 22) * 0.5 + Math.sin((x / w) * Math.PI * 7) * 0.5;
      const v = 235 + Math.floor(s * 14);
      g.fillStyle = `rgb(${v},${v - 3},${v - 9})`;
      g.fillRect(x, 0, 1, h);
    }
  }, 1, 1);

  const waterTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#49b4d2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.1})`;
      g.lineWidth = 1 + Math.random() * 2;
      g.beginPath();
      const y = Math.random() * h;
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.08 + i) * 5);
      g.stroke();
    }
  }, 3, 2);

  const grassTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#74904f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = Math.random();
      g.fillStyle = v > 0.6 ? 'rgba(96,124,62,0.5)' : v > 0.3 ? 'rgba(130,150,88,0.5)' : 'rgba(148,142,90,0.35)';
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }, 10, 10);

  const surfTex = canvasTex(512, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.5})`;
      const x = Math.random() * w;
      const y = h * 0.5 + (Math.random() - 0.5) * h * 0.7;
      g.fillRect(x, y, 3 + Math.random() * 10, 1.5 + Math.random() * 2);
    }
  }, 4, 1);

  const frondTex = canvasTex(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#6d8a48';
    g.fillRect(w / 2 - 3, 0, 6, h);
    for (let y = 0; y < h; y += 6) {
      const green = 118 + Math.floor(Math.random() * 46);
      g.fillStyle = `rgb(${Math.floor(green * 0.62)},${green},${Math.floor(green * 0.5)})`;
      g.fillRect(0, y, w / 2 - 2, 4.6);
      g.fillRect(w / 2 + 2, y + 2.5, w / 2 - 2, 4.6);
    }
  }, 1, 1);

  const ringTex = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#b8b0a0'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) {
      g.fillStyle = 'rgba(125,118,104,0.55)';
      g.fillRect(0, y, w, 3);
    }
  }, 1, 3);

  // interior floor textures (finishes)
  const oakTex = canvasTex(256, 256, (g, w, h) => {
    const rows = 6;
    for (let r = 0; r < rows; r++) {
      const base = 205 + Math.floor(Math.random() * 18);
      g.fillStyle = `rgb(${base},${base - 22},${base - 52})`;
      g.fillRect(0, (h / rows) * r, w, h / rows);
      g.strokeStyle = 'rgba(150,120,86,0.85)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(0, (h / rows) * r); g.lineTo(w, (h / rows) * r); g.stroke();
      for (let i = 0; i < 26; i++) {
        g.strokeStyle = `rgba(165,132,94,${0.12 + Math.random() * 0.14})`;
        const y = (h / rows) * r + Math.random() * (h / rows);
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (Math.random() - 0.5) * 3); g.stroke();
      }
      // butt joints
      g.strokeStyle = 'rgba(140,112,80,0.8)';
      g.beginPath();
      const jx = Math.random() * w;
      g.moveTo(jx, (h / rows) * r); g.lineTo(jx, (h / rows) * (r + 1));
      g.stroke();
    }
  }, 3, 3);

  const stoneTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d3ccc0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = 195 + Math.floor(Math.random() * 26);
      g.fillStyle = `rgba(${v},${v - 5},${v - 14},0.4)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2.4, 2.4);
    }
    g.strokeStyle = 'rgba(160,152,138,0.9)'; g.lineWidth = 2.4;
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo(0, (h / 2) * i); g.lineTo(w, (h / 2) * i); g.stroke();
      g.beginPath(); g.moveTo((w / 2) * i, 0); g.lineTo((w / 2) * i, h); g.stroke();
    }
  }, 4, 4);

  /* ------------------------------ materials ---------------------------- */
  const COL = {
    white: 0xf4f1ea, whiteDim: 0xe6e2d8, tan: 0xb08c6c, tanDark: 0x8a6b52, tanDeep: 0x6b5240,
    rail: 0x1a1b1d, bronze: 0x2b2724, glass: 0x181f24, curtain: 0xf3efe8, interior: 0x30291f,
    concrete: 0xc9c4b8, paver: 0xd9d2c2, travertine: 0xe4dccb, curb: 0xa93526,
    poolWater: 0x3fb0d0, poolShell: 0x7fd2e4, asphalt: 0x565a5c, soil: 0xa5947a,
    ocean: 0x2c6d8d, wallWhite: 0xeceade, doorBrown: 0x7a5738,
    hedge: 0x3f6d35, hedgeDark: 0x2e5426, flower: 0xc0392b,
    trunk: 0xb6ad9a, crownshaft: 0x7f9b5e,
  };

  const mat = {
    white: new THREE.MeshStandardMaterial({ color: COL.white, map: stuccoTex, roughness: 0.88 }),
    whiteDim: new THREE.MeshStandardMaterial({ color: COL.whiteDim, roughness: 0.92 }),
    tan: new THREE.MeshStandardMaterial({ color: COL.tan, map: stuccoTex, roughness: 0.88 }),
    tanDark: new THREE.MeshStandardMaterial({ color: COL.tanDark, roughness: 0.9 }),
    tanDeep: new THREE.MeshStandardMaterial({ color: COL.tanDeep, roughness: 0.95 }),
    interior: new THREE.MeshStandardMaterial({ color: COL.interior, roughness: 1.0 }),
    rail: new THREE.MeshStandardMaterial({ color: COL.rail, roughness: 0.38, metalness: 0.7 }),
    bronze: new THREE.MeshStandardMaterial({ color: COL.bronze, roughness: 0.45, metalness: 0.65 }),
    glass: new THREE.MeshPhysicalMaterial({ color: COL.glass, roughness: 0.1, metalness: 0.25, envMap: envTex, envMapIntensity: 1.7, reflectivity: 0.9 }),
    glassClear: new THREE.MeshPhysicalMaterial({ color: 0x9fc8d8, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.28, envMap: envTex, envMapIntensity: 1.2, side: THREE.DoubleSide }),
    curtain: new THREE.MeshStandardMaterial({ color: COL.curtain, map: curtainTex, roughness: 0.95, side: THREE.DoubleSide }),
    glow: new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0 }),
    glowDim: new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0 }),
    concrete: new THREE.MeshStandardMaterial({ color: COL.concrete, map: concreteTex, roughness: 0.95 }),
    paver: new THREE.MeshStandardMaterial({ color: COL.paver, map: paverTex, roughness: 0.92 }),
    travertine: new THREE.MeshStandardMaterial({ color: COL.travertine, map: travTex, roughness: 0.9 }),
    plank: new THREE.MeshStandardMaterial({ color: 0xd9d2c4, map: plankTex, roughness: 0.85 }),
    curb: new THREE.MeshStandardMaterial({ color: COL.curb, roughness: 0.75 }),
    poolWater: new THREE.MeshPhysicalMaterial({ color: COL.poolWater, map: waterTex, roughness: 0.08, transparent: true, opacity: 0.88, envMap: envTex, envMapIntensity: 1.1 }),
    poolShell: new THREE.MeshStandardMaterial({ color: COL.poolShell, roughness: 0.6 }),
    asphalt: new THREE.MeshStandardMaterial({ color: COL.asphalt, roughness: 0.98 }),
    soil: new THREE.MeshStandardMaterial({ color: COL.soil, roughness: 1.0 }),
    soilDark: new THREE.MeshStandardMaterial({ color: 0x5c4c38, roughness: 1.0 }),
    grass: new THREE.MeshStandardMaterial({ color: 0xffffff, map: grassTex, roughness: 1.0 }),
    ocean: new THREE.MeshStandardMaterial({ color: COL.ocean, roughness: 0.35, metalness: 0.1 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xd8c9a4, roughness: 1.0 }),
    wall: new THREE.MeshStandardMaterial({ color: COL.wallWhite, map: stuccoTex, roughness: 0.92 }),
    corrug: new THREE.MeshStandardMaterial({ color: 0xaab0b4, map: corrugTex, roughness: 0.7, metalness: 0.25 }),
    doorBrown: new THREE.MeshStandardMaterial({ color: COL.doorBrown, roughness: 0.7 }),
    doorDark: new THREE.MeshStandardMaterial({ color: 0x241f1b, roughness: 0.6, metalness: 0.2 }),
    hedge: new THREE.MeshStandardMaterial({ color: COL.hedge, roughness: 1.0 }),
    hedgeDark: new THREE.MeshStandardMaterial({ color: COL.hedgeDark, roughness: 1.0 }),
    flower: new THREE.MeshStandardMaterial({ color: COL.flower, roughness: 0.9 }),
    trunk: new THREE.MeshStandardMaterial({ color: COL.trunk, map: ringTex, roughness: 0.85 }),
    crownshaft: new THREE.MeshStandardMaterial({ color: COL.crownshaft, roughness: 0.7 }),
    frond: new THREE.MeshStandardMaterial({ map: frondTex, roughness: 0.8, side: THREE.DoubleSide, transparent: true, alphaTest: 0.35 }),
    houseA: new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.95 }),
    houseB: new THREE.MeshStandardMaterial({ color: 0xb9b4a6, roughness: 0.95 }),
    houseRoof: new THREE.MeshStandardMaterial({ color: 0x8c4a3c, roughness: 0.9 }),
    pole: new THREE.MeshStandardMaterial({ color: 0x8b857a, roughness: 0.95 }),
    stairs: new THREE.MeshStandardMaterial({ color: 0x9a8d7c, roughness: 1.0 }),
  };

  function tagShadow(obj) {
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return obj;
  }
  function box(w, h, d, material) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  }
  function pushQuad(pos, p0, p1, p2, p3, dir) {
    const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1), c = new THREE.Vector3(...p2);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, b));
    if (n.dot(new THREE.Vector3(...dir)) < 0) { const t = p1; p1 = p3; p3 = t; }
    pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
  }
  function wedgeX(x0, x1, yBase, yT0, yT1, z0, z1) {
    const A0 = [x0, yT0, z0], A1 = [x1, yT1, z0], A2 = [x1, yT1, z1], A3 = [x0, yT0, z1];
    const B0 = [x0, yBase, z0], B1 = [x1, yBase, z0], B2 = [x1, yBase, z1], B3 = [x0, yBase, z1];
    const pos = [];
    pushQuad(pos, A0, A1, A2, A3, [0, 1, 0]);
    pushQuad(pos, B0, B1, B2, B3, [0, -1, 0]);
    pushQuad(pos, A0, B0, B1, A1, [0, 0, -1]);
    pushQuad(pos, A3, B3, B2, A2, [0, 0, 1]);
    pushQuad(pos, A1, B1, B2, A2, [1, 0, 0]);
    pushQuad(pos, A0, B0, B3, A3, [-1, 0, 0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    return geo;
  }
  function wedgeZ(z0, z1, yBase, yT0, yT1, x0, x1) {
    const A0 = [x0, yT0, z0], A1 = [x1, yT0, z0], A2 = [x1, yT1, z1], A3 = [x0, yT1, z1];
    const B0 = [x0, yBase, z0], B1 = [x1, yBase, z0], B2 = [x1, yBase, z1], B3 = [x0, yBase, z1];
    const pos = [];
    pushQuad(pos, A0, A1, A2, A3, [0, 1, 0]);
    pushQuad(pos, B0, B1, B2, B3, [0, -1, 0]);
    pushQuad(pos, A0, A1, B1, B0, [0, 0, -1]);
    pushQuad(pos, A3, A2, B2, B3, [0, 0, 1]);
    pushQuad(pos, A1, A2, B2, B1, [1, 0, 0]);
    pushQuad(pos, A0, A3, B3, B0, [-1, 0, 0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    return geo;
  }

  const glowPlanes = [];
  function barRail(width, height = 1.0, bars = 5) {
    const g = new THREE.Group();
    const barT = 0.035;
    for (let i = 0; i < bars; i++) {
      const y = 0.18 + ((height - 0.22) / (bars - 1)) * i;
      const bar = box(width, i === bars - 1 ? 0.055 : barT, barT, mat.rail);
      bar.position.y = y;
      g.add(bar);
    }
    const nPosts = Math.max(2, Math.round(width / 1.6) + 1);
    for (let p = 0; p < nPosts; p++) {
      const x = -width / 2 + (width / (nPosts - 1)) * p;
      const post = box(0.05, height, 0.05, mat.rail);
      post.position.set(x, height / 2, 0);
      g.add(post);
    }
    return g;
  }
  function glassSlider(w, h, panels = 3, curtainChance = 0.75, glassMat = null) {
    const g = new THREE.Group();
    const glass = box(w, h, 0.05, glassMat || mat.glass);
    g.add(glass);
    const fw = 0.07;
    const top = box(w + fw, fw, 0.09, mat.bronze); top.position.y = h / 2; g.add(top);
    const bot = top.clone(); bot.position.y = -h / 2; g.add(bot);
    const left = box(fw, h, 0.09, mat.bronze); left.position.x = -w / 2; g.add(left);
    const right = left.clone(); right.position.x = w / 2; g.add(right);
    for (let i = 1; i < panels; i++) {
      const m = box(0.045, h, 0.07, mat.bronze);
      m.position.x = -w / 2 + (w / panels) * i;
      g.add(m);
    }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, h * 0.92), Math.random() < 0.62 ? mat.glow : mat.glowDim);
    glow.position.z = 0.032;
    g.add(glow);
    glowPlanes.push(glow);
    if (Math.random() < curtainChance) {
      const cw = w * (0.45 + Math.random() * 0.5);
      const curtain = new THREE.Mesh(new THREE.PlaneGeometry(cw, h * 0.94), mat.curtain);
      curtain.position.set((Math.random() > 0.5 ? 1 : -1) * (w / 2 - cw / 2) * 0.9, 0, -0.09);
      g.add(curtain);
    }
    return g;
  }

  /* ------------------------------ building ----------------------------- */
  const building = new THREE.Group();
  scene.add(building);

  function buildWhiteBay(x0, w, terraceTop) {
    const g = new THREE.Group();
    const cx = x0 + w / 2;
    const shell = box(w, BUILD_H, DEPTH, mat.tan);
    shell.position.set(cx, BUILD_H / 2, -DEPTH / 2);
    g.add(shell);
    [x0 + 0.22, x0 + w - 0.22].forEach((px) => {
      const pier = box(0.44, BUILD_H, 0.5, mat.white);
      pier.position.set(px, BUILD_H / 2, 0.05);
      g.add(pier);
    });
    const topBalconyFloor = terraceTop ? 1 : 2;
    for (let f = 1; f <= topBalconyFloor; f++) {
      const fy = f * FLOOR_H;
      const bw = w - 1.15;
      const slab = box(bw, 0.38, 1.55, mat.white);
      slab.position.set(cx, fy - 0.19 + 0.05, 1.55 / 2);
      g.add(slab);
      [-1, 1].forEach((s) => {
        const cheek = box(0.16, 1.12, 1.5, mat.white);
        cheek.position.set(cx + s * (bw / 2 - 0.08), fy + 0.05 + 0.56, 1.5 / 2);
        g.add(cheek);
      });
      const rail = barRail(bw - 0.4, 1.02, 5);
      rail.position.set(cx, fy + 0.05, 1.55 - 0.1);
      g.add(rail);
      const slider = glassSlider(w * 0.66, 2.42, 3);
      slider.position.set(cx, fy + 1.21 + 0.08, 0.04);
      g.add(slider);
    }
    {
      const plinth = box(w - 1.0, 0.28, 1.9, mat.white);
      plinth.position.set(cx, 0.14, 0.95);
      g.add(plinth);
      const rail = barRail(w - 1.3, 0.95, 4);
      rail.position.set(cx, 0.28, 1.78);
      g.add(rail);
      const slider = glassSlider(w * 0.62, 2.35, 3);
      slider.position.set(cx, 0.28 + 1.18, 0.04);
      g.add(slider);
      [-1, 1].forEach((s) => {
        const planter = box(0.62, 0.5, 0.62, mat.white);
        planter.position.set(cx + s * (w / 2 - 0.75), 0.25, 1.45);
        g.add(planter);
        const bush = box(0.5, 0.35, 0.5, mat.hedge);
        bush.position.set(cx + s * (w / 2 - 0.75), 0.62, 1.45);
        g.add(bush);
      });
      for (let s = 0; s < 2; s++) {
        const step = box(1.4, 0.14, 0.34, mat.whiteDim);
        step.position.set(cx, 0.07 + s * 0.14, 2.1 - s * 0.3);
        g.add(step);
      }
    }
    if (terraceTop) {
      const fy = 2 * FLOOR_H;
      const deck = box(w - 0.2, 0.12, 2.9, mat.plank);
      deck.position.set(cx, fy + 0.06, -2.9 / 2 + 0.35);
      g.add(deck);
      const upstand = box(w - 0.2, 0.32, 0.18, mat.white);
      upstand.position.set(cx, fy + 0.16, 0.28);
      g.add(upstand);
      const rail = barRail(w - 0.5, 0.95, 4);
      rail.position.set(cx, fy + 0.32, 0.24);
      g.add(rail);
      [-1, 1].forEach((s) => {
        const pier = box(0.42, BUILD_H - fy, 0.42, mat.tan);
        pier.position.set(cx + s * (w / 2 - 0.32), fy + (BUILD_H - fy) / 2, 0.15);
        g.add(pier);
      });
      const glassWall = glassSlider(w * 0.72, 2.55, 4, 0.9);
      glassWall.position.set(cx, fy + 1.28 + 0.12, -2.45);
      g.add(glassWall);
      [-1, 1].forEach((s) => {
        const side = box(0.16, FLOOR_H, 2.6, mat.tan);
        side.position.set(cx + s * (w / 2 - 0.1), fy + FLOOR_H / 2, -1.3);
        g.add(side);
      });
      const roofStrip = box(w, 0.3, 6.6, mat.white);
      roofStrip.position.set(cx, BUILD_H + 0.15, -DEPTH / 2 - 1.2);
      g.add(roofStrip);
    }
    building.add(g);
    return g;
  }

  function buildTower(x0, w) {
    const g = new THREE.Group();
    const cx = x0 + w / 2;
    const TOW_H = BUILD_H + 1.35;
    const proj = 0.9;
    const voidW = 1.7;
    const pw = (w - voidW) / 2;
    const body = box(w, TOW_H, DEPTH - 1.1, mat.tan);
    body.position.set(cx, TOW_H / 2, -(DEPTH - 1.1) / 2 - 1.1);
    g.add(body);
    [x0 + pw / 2, x0 + w - pw / 2].forEach((px) => {
      const pier = box(pw, TOW_H, 2.0, mat.tan);
      pier.position.set(px, TOW_H / 2, proj - 1.0);
      g.add(pier);
    });
    const head = box(voidW, 1.0, 2.0, mat.tan);
    head.position.set(cx, TOW_H - 0.5, proj - 1.0);
    g.add(head);
    const backW = box(voidW, TOW_H - 1.0, 0.12, mat.tanDeep);
    backW.position.set(cx, (TOW_H - 1.0) / 2, -1.05);
    g.add(backW);
    [-1, 1].forEach((s) => {
      const sideW = box(0.1, TOW_H - 1.0, 1.9, mat.tanDeep);
      sideW.position.set(cx + s * (voidW / 2 - 0.05), (TOW_H - 1.0) / 2, proj - 1.0);
      g.add(sideW);
    });
    for (let f = 0; f < 3; f++) {
      const midY = f * FLOOR_H + 1.5;
      const landing = box(voidW - 0.15, 0.16, 1.1, mat.stairs);
      landing.position.set(cx, midY, -0.45);
      g.add(landing);
      const flight = box(voidW * 0.42, 0.14, 1.8, mat.stairs);
      flight.position.set(cx - voidW * 0.22, midY - 0.75, -0.15);
      flight.rotation.x = THREE.MathUtils.degToRad(-33);
      g.add(flight);
      const flight2 = flight.clone();
      flight2.position.set(cx + voidW * 0.22, midY + 0.75, -0.15);
      g.add(flight2);
      const rail = barRail(voidW - 0.25, 0.92, 4);
      rail.position.set(cx, midY + 0.08, 0.62);
      g.add(rail);
      const railFloor = barRail(voidW - 0.25, 0.92, 4);
      railFloor.position.set(cx, f * FLOOR_H + 0.05, 0.62);
      g.add(railFloor);
    }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(voidW - 0.2, TOW_H - 1.4), mat.glow);
    glow.position.set(cx, TOW_H / 2 - 0.4, -0.98);
    g.add(glow);
    glowPlanes.push(glow);
    const cap = box(w + 0.55, 0.55, 2.6, mat.white);
    cap.position.set(cx, TOW_H + 0.275, proj - 1.15);
    g.add(cap);
    building.add(g);
    return g;
  }

  function buildEndUnit(x0, w) {
    const g = new THREE.Group();
    const cx = x0 + w / 2;
    const x1 = x0 + w;
    const body = box(w, BUILD_H, DEPTH, mat.tan);
    body.position.set(cx, BUILD_H / 2, -DEPTH / 2);
    g.add(body);
    const door = box(1.1, 2.3, 0.08, mat.doorDark);
    door.position.set(x0 + 1.0, 1.15, 0.05);
    g.add(door);
    const gWin = glassSlider(2.4, 2.3, 2);
    gWin.position.set(x0 + 3.6, 1.43, 0.05);
    g.add(gWin);
    const patio = box(w - 1.2, 0.24, 1.6, mat.white);
    patio.position.set(cx, 0.12, 0.8);
    g.add(patio);
    const patioRail = barRail(w - 1.5, 0.95, 4);
    patioRail.position.set(cx, 0.24, 1.5);
    g.add(patioRail);
    function mullionWall(width, height) {
      const grp = new THREE.Group();
      const glass = box(width, height, 0.07, mat.glass);
      grp.add(glass);
      const f = 0.09;
      [[0, height / 2, width + f, f], [0, -height / 2, width + f, f], [-width / 2, 0, f, height], [width / 2, 0, f, height]].forEach(([fx, fy, fw2, fh2]) => {
        const b = box(fw2, fh2, 0.12, mat.rail);
        b.position.set(fx, fy, 0);
        grp.add(b);
      });
      const nV = Math.round(width / 1.05);
      for (let i = 1; i < nV; i++) {
        const m = box(0.06, height, 0.1, mat.rail);
        m.position.x = -width / 2 + (width / nV) * i;
        grp.add(m);
      }
      for (let i = 1; i < 4; i++) {
        const m = box(width, 0.06, 0.1, mat.rail);
        m.position.y = -height / 2 + (height / 4) * i;
        grp.add(m);
      }
      const curtain = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.96, height * 0.96), mat.curtain);
      curtain.position.z = -0.12;
      grp.add(curtain);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.9, height * 0.9), mat.glowDim);
      glow.position.z = 0.045;
      grp.add(glow);
      glowPlanes.push(glow);
      return grp;
    }
    const frontGlass = mullionWall(w - 1.5, 6.0);
    frontGlass.position.set(x0 + 1.5 + (w - 1.5) / 2, FLOOR_H + 3.0, 0.32);
    g.add(frontGlass);
    const sideGlass = mullionWall(3.2, 6.0);
    sideGlass.rotation.y = Math.PI / 2;
    sideGlass.position.set(x1 + 0.05, FLOOR_H + 3.0, -1.75);
    g.add(sideGlass);
    for (let f = 1; f <= 2; f++) {
      const win = glassSlider(0.9, 1.5, 1, 0.4);
      win.position.set(x0 + 0.75, f * FLOOR_H + 1.6, 0.04);
      g.add(win);
    }
    const spandrel = box(w - 1.3, 0.42, 0.2, mat.white);
    spandrel.position.set(x0 + 1.5 + (w - 1.5) / 2, FLOOR_H * 2, 0.42);
    g.add(spandrel);
    const miniSlab = box(1.7, 0.34, 1.1, mat.white);
    miniSlab.position.set(x0 + 2.3, FLOOR_H * 2 - 0.05, 1.1);
    g.add(miniSlab);
    const miniRail = barRail(1.5, 0.98, 4);
    miniRail.position.set(x0 + 2.3, FLOOR_H * 2 + 0.12, 1.55);
    g.add(miniRail);
    // top of the end unit is a plain parapet slab — no roof terrace here
    // (the photos show a clean roofline on the right end)
    const plate = box(w + 1.1, 0.42, 6.4, mat.white);
    plate.position.set(cx + 0.15, BUILD_H + 0.33, -6.4 / 2 + 1.15);
    g.add(plate);
    const rear = box(w, 0.5, DEPTH - 5.4, mat.tan);
    rear.position.set(cx, BUILD_H + 0.25, -(DEPTH - 5.4) / 2 - 5.4);
    g.add(rear);
    building.add(g);
    return g;
  }

  SEGS.forEach((s) => {
    if (s.type === 'white') buildWhiteBay(s.x0, s.w, false);
    else if (s.type === 'terrace') buildWhiteBay(s.x0, s.w, true);
    else if (s.type === 'tower') buildTower(s.x0, s.w);
    else if (s.type === 'end') buildEndUnit(s.x0, s.w);
  });

  /* roof */
  {
    const roofG = new THREE.Group();
    const roofSlab = box(22.4, 0.26, DEPTH + 0.2, mat.white);
    roofSlab.position.set(11.1, BUILD_H + 0.13, -DEPTH / 2);
    roofG.add(roofSlab);
    const cornice = box(22.8, 0.34, 0.62, mat.white);
    cornice.position.set(11.1, BUILD_H - 0.02, 0.24);
    roofG.add(cornice);
    const corniceL = box(0.34, 0.34, DEPTH, mat.white);
    corniceL.position.set(-0.12, BUILD_H - 0.02, -DEPTH / 2);
    roofG.add(corniceL);
    const parY = BUILD_H + 0.15;
    roofG.add(new THREE.Mesh(wedgeX(-0.35, PEAK_X - SLOT_W / 2, parY, parY + 0.9, parY + 2.0, 0.0, 0.32), mat.white));
    roofG.add(new THREE.Mesh(wedgeX(PEAK_X + SLOT_W / 2, 22.25, parY, parY + 2.0, parY + 0.5, 0.0, 0.32), mat.white));
    roofG.add(new THREE.Mesh(wedgeZ(0.0, -DEPTH, parY, parY + 0.9, parY + 0.4, -0.35, -0.03), mat.white));
    const backBand = box(22.4, 0.6, 0.3, mat.white);
    backBand.position.set(11.1, parY + 0.3, -DEPTH + 0.15);
    roofG.add(backBand);
    building.add(roofG);
  }

  /* back facade + left end */
  {
    const backG = new THREE.Group();
    SEGS.forEach((s) => {
      if (s.type === 'tower') return;
      const cx = s.x0 + s.w / 2;
      for (let f = 0; f < 3; f++) {
        const win = glassSlider(1.7, 1.45, 2, 0.5);
        win.rotation.y = Math.PI;
        win.position.set(cx, f * FLOOR_H + 1.75, -DEPTH - 0.04);
        backG.add(win);
      }
    });
    building.add(backG);
    const endPanel = box(1.5, BUILD_H, 0.62, mat.white);
    endPanel.position.set(0.55, BUILD_H / 2, 0.08);
    building.add(endPanel);
    const sideSkin = box(0.12, BUILD_H, DEPTH, mat.white);
    sideSkin.position.set(-0.05, BUILD_H / 2, -DEPTH / 2);
    building.add(sideSkin);
    for (let f = 1; f < 3; f++) {
      const win = glassSlider(1.4, 1.4, 2, 0.5);
      win.rotation.y = Math.PI / 2;
      win.position.set(-0.04, f * FLOOR_H + 1.7, -3.0);
      building.add(win);
    }
  }
  tagShadow(building);

  /* ------------------------------ site --------------------------------- */
  const site = new THREE.Group();
  scene.add(site);

  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), mat.soil);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.02;
  terrain.receiveShadow = true;
  site.add(terrain);

  // courtyard concrete: full lot width, terrace edge → front wall
  {
    const cz = (SITE.courtyard.z0 + SITE.courtyard.z1) / 2;
    const court = box(ROW_LEN + 0.4, 0.12, SITE.courtyard.z1 - SITE.courtyard.z0 + 0.6, mat.concrete);
    court.position.set(15, 0.06, cz);
    court.receiveShadow = true;
    site.add(court);
  }

  // paver walkway + red curb + planting bed along facade
  {
    const walkway = box(ROW_LEN, 0.16, 1.0, mat.paver);
    walkway.position.set(15, 0.08, 2.2);
    site.add(walkway);
    const curb = box(ROW_LEN, 0.18, 0.22, mat.curb);
    curb.position.set(15, 0.09, 2.78);
    site.add(curb);
    const bed = box(ROW_LEN - 1.5, 0.2, 0.6, mat.soilDark);
    bed.position.set(15, 0.1, 1.55);
    site.add(bed);
  }

  /* pool courtyard — TRUE Planta Baja position: left third, in front of the building */
  const poolCourt = new THREE.Group();
  site.add(poolCourt);
  {
    const P = SITE.pool;
    // travertine deck around the pool
    const deck = box(9.6, 0.16, 8.4, mat.travertine);
    deck.position.set(5.4, 0.1, (P.z0 + P.z1) / 2 + 0.2);
    deck.receiveShadow = true;
    poolCourt.add(deck);

    // pool shape per plan: 3.5 wide at top, chamfer on the right, 3.0 wide below
    // Shape space: x → world x (offset P.x0), y → world z (offset P.z0)
    const L = P.z1 - P.z0;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(P.x1 - P.x0, 0);
    shape.lineTo(P.x1 - P.x0, P.chamfer.zA - P.z0);
    shape.lineTo(P.chamfer.xIn - P.x0, P.chamfer.zB - P.z0);
    shape.lineTo(P.chamfer.xIn - P.x0, L);
    shape.lineTo(0, L);
    shape.lineTo(0, 0);

    const shellGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false });
    const shell = new THREE.Mesh(shellGeo, mat.poolShell);
    shell.rotation.x = Math.PI / 2;
    shell.position.set(P.x0, 0.14, P.z1);
    // extrude +z then rotated puts local y → world -z; position at z1 so it spans z0..z1
    shell.scale.z = 1;
    poolCourt.add(shell);

    const water = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat.poolWater);
    water.rotation.x = -Math.PI / 2;
    water.position.set(P.x0, 0.19, P.z1);
    poolCourt.add(water);

    // steps in the top-left corner
    for (let s = 0; s < 3; s++) {
      const st = box(1.1 - s * 0.3, 0.1, 1.1 - s * 0.3, mat.travertine);
      st.position.set(P.x0 + 0.7, 0.17 - s * 0.06, P.z0 + 0.7);
      poolCourt.add(st);
    }
    // white coping ring
    const cop = new THREE.Shape();
    cop.moveTo(-0.3, -0.3);
    cop.lineTo(P.x1 - P.x0 + 0.3, -0.3);
    cop.lineTo(P.x1 - P.x0 + 0.3, P.chamfer.zA - P.z0 + 0.12);
    cop.lineTo(P.chamfer.xIn - P.x0 + 0.3, P.chamfer.zB - P.z0 + 0.12);
    cop.lineTo(P.chamfer.xIn - P.x0 + 0.3, L + 0.3);
    cop.lineTo(-0.3, L + 0.3);
    cop.lineTo(-0.3, -0.3);
    cop.holes.push(new THREE.Path([
      new THREE.Vector2(0, 0), new THREE.Vector2(P.x1 - P.x0, 0),
      new THREE.Vector2(P.x1 - P.x0, P.chamfer.zA - P.z0), new THREE.Vector2(P.chamfer.xIn - P.x0, P.chamfer.zB - P.z0),
      new THREE.Vector2(P.chamfer.xIn - P.x0, L), new THREE.Vector2(0, L),
    ]));
    const copM = new THREE.Mesh(new THREE.ShapeGeometry(cop), mat.white);
    copM.rotation.x = -Math.PI / 2;
    copM.position.set(P.x0, 0.2, P.z1);
    poolCourt.add(copM);

    // pump room (cuarto de bomba) on the left lot line
    const B = SITE.pump;
    const pump = box(B.x1 - B.x0, 2.1, B.z1 - B.z0, mat.wall);
    pump.position.set((B.x0 + B.x1) / 2, 1.05, (B.z0 + B.z1) / 2);
    poolCourt.add(pump);
    const pumpRoof = box(B.x1 - B.x0 + 0.3, 0.12, B.z1 - B.z0 + 0.3, mat.white);
    pumpRoof.position.set((B.x0 + B.x1) / 2, 2.16, (B.z0 + B.z1) / 2);
    poolCourt.add(pumpRoof);
    const pumpDoor = box(0.08, 1.7, 0.75, mat.doorBrown);
    pumpDoor.position.set(B.x1 + 0.02, 0.85, (B.z0 + B.z1) / 2);
    poolCourt.add(pumpDoor);

    // two shade trees between pool and left wall (per plan)
    // (crowns via hedge blobs below; trunks here)
    [2.6, 4.3].forEach((tz) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 2.6, 8), mat.trunk);
      trunk.position.set(1.4, 1.3, tz);
      trunk.castShadow = true;
      poolCourt.add(trunk);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), mat.hedge);
      crown.position.set(1.4, 3.1, tz);
      crown.castShadow = true;
      poolCourt.add(crown);
    });

    // loungers on the deck (simple, elegant)
    [[8.6, 4.2], [8.6, 5.6], [8.6, 7.0]].forEach(([lx, lz]) => {
      const lounger = new THREE.Group();
      const base = box(0.62, 0.1, 1.7, mat.white);
      base.position.y = 0.32;
      lounger.add(base);
      const back = box(0.62, 0.1, 0.62, mat.white);
      back.position.set(0, 0.48, -0.72);
      back.rotation.x = THREE.MathUtils.degToRad(-38);
      lounger.add(back);
      [[-0.24, -0.7], [0.24, -0.7], [-0.24, 0.7], [0.24, 0.7]].forEach(([px, pz]) => {
        const leg = box(0.06, 0.28, 0.06, mat.rail);
        leg.position.set(px, 0.14, pz);
        lounger.add(leg);
      });
      lounger.position.set(lx, 0.1, lz);
      lounger.rotation.y = Math.PI / 2;
      poolCourt.add(lounger);
    });
  }

  /* parking per plan */
  {
    const stripe = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.9 });
    const R = SITE.stallRow;
    // 5-stall row facing the building (stalls 1–5)
    R.xs.forEach((x0) => {
      const sL = box(0.1, 0.03, R.z1 - R.z0, stripe);
      sL.position.set(x0, 0.13, (R.z0 + R.z1) / 2);
      site.add(sL);
    });
    const lastX = R.xs[R.xs.length - 1] + R.w;
    const sEnd = box(0.1, 0.03, R.z1 - R.z0, stripe);
    sEnd.position.set(lastX, 0.13, (R.z0 + R.z1) / 2);
    site.add(sEnd);
    const stop = box(lastX - R.xs[0], 0.03, 0.1, stripe);
    stop.position.set((R.xs[0] + lastX) / 2, 0.13, R.z1);
    site.add(stop);
    // wheel stops
    R.xs.forEach((x0) => {
      const ws = box(1.6, 0.12, 0.18, mat.whiteDim);
      ws.position.set(x0 + R.w / 2, 0.12, R.z0 + 0.5);
      site.add(ws);
    });

    // perpendicular column along the right wall (stalls 6–10)
    const C = SITE.stallCol;
    C.zs.concat([C.ends]).forEach((z) => {
      const s = box(C.x1 - C.x0, 0.03, 0.1, stripe);
      s.position.set((C.x0 + C.x1) / 2, 0.13, z);
      site.add(s);
    });
    const sSide = box(0.1, 0.03, C.ends - C.zs[0], stripe);
    sSide.position.set(C.x0, 0.13, (C.zs[0] + C.ends) / 2);
    site.add(sSide);
  }

  /* perimeter walls, gates, garita */
  {
    const WZ = SITE.wallZ;
    const G = SITE.gate;
    function wallRun(x0, x1, h = 2.5, z = WZ, thick = 0.25) {
      if (x1 - x0 < 0.05) return;
      const wl = box(x1 - x0, h, thick, mat.wall);
      wl.position.set((x0 + x1) / 2, h / 2, z);
      site.add(wl);
      return wl;
    }
    // front wall: solid behind the pool zone, bar fence to the gate, wall to the right corner
    wallRun(0, 8.2, 2.6);
    {
      const lowWall = box(G.x0 - 8.2, 0.7, 0.25, mat.wall);
      lowWall.position.set((8.2 + G.x0) / 2, 0.35, WZ);
      site.add(lowWall);
      const fence = new THREE.Group();
      for (let x = 8.35; x <= G.x0 - 0.1; x += 0.34) {
        const b = box(0.05, 1.8, 0.05, mat.rail);
        b.position.set(x, 1.6, WZ);
        fence.add(b);
      }
      const railTop = box(G.x0 - 8.2, 0.08, 0.08, mat.rail);
      railTop.position.set((8.2 + G.x0) / 2, 2.5, WZ);
      fence.add(railTop);
      const railMid = railTop.clone();
      railMid.position.y = 0.78;
      fence.add(railMid);
      site.add(fence);
    }
    wallRun(G.x1, 30.0, 2.5);

    // main corrugated sliding gate + header over the ramp opening
    {
      [G.x0 - 0.25, G.x1 + 0.25].forEach((px) => {
        const post = box(0.55, 3.4, 0.55, mat.wall);
        post.position.set(px, 1.7, WZ);
        site.add(post);
      });
      const header = box(G.x1 - G.x0 + 2.1, 0.95, 0.6, mat.wall);
      header.position.set((G.x0 + G.x1) / 2, 3.35, WZ);
      site.add(header);
      const panel = box(G.x1 - G.x0 - 0.3, 2.45, 0.1, mat.corrug);
      panel.position.set((G.x0 + G.x1) / 2, 1.32, WZ);
      site.add(panel);
      const pf = box(G.x1 - G.x0 - 0.2, 0.1, 0.14, mat.rail);
      pf.position.set((G.x0 + G.x1) / 2, 2.5, WZ);
      site.add(pf);
      const pfB = pf.clone(); pfB.position.y = 0.12; site.add(pfB);
      for (let i = 0; i < 3; i++) {
        const v = box(0.09, 2.45, 0.13, mat.rail);
        v.position.set(G.x0 + 1.4 + i * 1.9, 1.32, WZ);
        site.add(v);
      }
    }

    // GUARD STATION (garita) — just inside the gate, left corner (client-confirmed)
    {
      const GA = SITE.garita;
      const gw = GA.x1 - GA.x0, gd = GA.z1 - GA.z0;
      const cx = (GA.x0 + GA.x1) / 2, cz = (GA.z0 + GA.z1) / 2;
      const bodyH = 2.5;
      // walls
      const gBody = box(gw, bodyH, gd, mat.wall);
      gBody.position.set(cx, bodyH / 2, cz);
      site.add(gBody);
      // wrap-around observation glass (three sides) under a white cap roof
      const gGlassF = box(gw - 0.3, 0.85, 0.06, mat.glass);
      gGlassF.position.set(cx, 1.72, GA.z1 + 0.01);
      site.add(gGlassF);
      const gGlassR = box(0.06, 0.85, gd - 0.3, mat.glass);
      gGlassR.position.set(GA.x1 + 0.01, 1.72, cz);
      site.add(gGlassR);
      const gGlassL = box(0.06, 0.85, gd - 0.3, mat.glass);
      gGlassL.position.set(GA.x0 - 0.01, 1.72, cz);
      site.add(gGlassL);
      // glow for night
      const gGlow = new THREE.Mesh(new THREE.PlaneGeometry(gw - 0.35, 0.8), mat.glow);
      gGlow.position.set(cx, 1.72, GA.z1 + 0.045);
      site.add(gGlow);
      glowPlanes.push(gGlow);
      // door on the courtyard side
      const gDoor = box(0.75, 2.05, 0.07, mat.doorDark);
      gDoor.position.set(cx, 1.02, GA.z0 - 0.02);
      site.add(gDoor);
      // floating cap roof, coastal white
      const gRoof = box(gw + 0.5, 0.14, gd + 0.5, mat.white);
      gRoof.position.set(cx, bodyH + 0.12, cz);
      site.add(gRoof);
      // white base band
      const gBase = box(gw + 0.12, 0.25, gd + 0.12, mat.white);
      gBase.position.set(cx, 0.125, cz);
      site.add(gBase);
      // boom barrier arm across the ramp (raised at 40°)
      const boomBase = box(0.3, 1.0, 0.3, mat.rail);
      boomBase.position.set(GA.x1 + 0.35, 0.5, SITE.wallZ - 0.55);
      site.add(boomBase);
      const arm = box(4.6, 0.09, 0.09, new THREE.MeshStandardMaterial({ color: 0xd8dade, roughness: 0.55 }));
      arm.position.set(GA.x1 + 0.35 + 1.8, 1.6, SITE.wallZ - 0.55);
      arm.rotation.z = THREE.MathUtils.degToRad(28);
      site.add(arm);
      for (let i = 0; i < 3; i++) {
        const stripeM = box(0.5, 0.1, 0.1, mat.curb);
        stripeM.position.set(GA.x1 + 0.9 + i * 1.35, 1.6, SITE.wallZ - 0.55);
        stripeM.rotation.z = THREE.MathUtils.degToRad(28);
        stripeM.position.y = 1.18 + Math.sin(THREE.MathUtils.degToRad(28)) * (0.55 + i * 1.35);
        site.add(stripeM);
      }
    }

    // gate ramp down to the street
    {
      const rampGeo = wedgeZ(WZ + 0.15, WZ + 2.2, -0.45, 0.12, -0.42, G.x0 + 0.1, G.x1 - 0.1);
      const ramp = new THREE.Mesh(rampGeo, mat.concrete);
      site.add(ramp);
    }

    // side + back walls; right wall opens for the side-street ramp
    {
      const SR = SITE.sideRamp;
      const wallL = box(0.25, 2.8, WZ + 13.6, mat.wall);
      wallL.position.set(-0.12, 1.4, (WZ - 13.6) / 2);
      site.add(wallL);
      // right wall in two runs around the ramp opening
      const segA = box(0.25, 2.5, SR.z0 - (-13.6), mat.wall);
      segA.position.set(30.05, 1.25, (SR.z0 + -13.6) / 2);
      site.add(segA);
      const segB = box(0.25, 2.5, WZ - SR.z1, mat.wall);
      segB.position.set(30.05, 1.25, (SR.z1 + WZ) / 2);
      site.add(segB);
      const back = box(31, 2.5, 0.25, mat.wall);
      back.position.set(14.9, 1.25, -13.6);
      site.add(back);
      // side ramp surface descending to the side street
      const rampGeo = wedgeX(30.1, 31.9, -0.4, 0.1, -0.38, 0, 1);
      const ramp = new THREE.Mesh(rampGeo, mat.concrete);
      ramp.scale.z = SR.z1 - SR.z0;
      ramp.position.z = SR.z0;
      site.add(ramp);
    }
  }
  tagShadow(site);

  /* ------------------------- streets / context ------------------------- */
  const context = new THREE.Group();
  scene.add(context);
  {
    // front street (Calle Vehicular) with sidewalks
    const acera = box(110, 0.09, 1.9, mat.paver);
    acera.position.set(10, 0.045, SITE.wallZ + 1.15);
    context.add(acera);
    const road = box(110, 0.06, 5.4, mat.asphalt);
    road.position.set(10, 0.03, SITE.wallZ + 4.9);
    road.receiveShadow = true;
    context.add(road);
    for (let x = -40; x < 60; x += 4) {
      const dash = box(1.6, 0.07, 0.14, new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.9 }));
      dash.position.set(x, 0.035, SITE.wallZ + 4.9);
      context.add(dash);
    }
    // side street (corner lot) with its sidewalk
    const acera2 = box(1.9, 0.09, 46, mat.paver);
    acera2.position.set(31.1, 0.045, 0);
    context.add(acera2);
    const road2 = box(5.2, 0.06, 46, mat.asphalt);
    road2.position.set(34.8, 0.03, 0);
    road2.receiveShadow = true;
    context.add(road2);

    // grass field between road and beach
    const field = new THREE.Mesh(new THREE.PlaneGeometry(200, 58), mat.grass);
    field.rotation.x = -Math.PI / 2;
    field.position.set(10, 0.0, SITE.wallZ + 36);
    field.receiveShadow = true;
    context.add(field);
    const track = box(3.2, 0.02, 56, mat.soil);
    track.position.set(2, 0.02, SITE.wallZ + 35);
    context.add(track);
    const sand = box(220, 0.03, 6, mat.sand);
    sand.position.set(10, 0.015, SITE.wallZ + 66);
    context.add(sand);
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(500, 320), mat.ocean);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(10, 0.0, SITE.wallZ + 70 + 158);
    context.add(ocean);
    var surfMats = [];
    for (let i = 0; i < 3; i++) {
      const sm = new THREE.MeshBasicMaterial({ map: surfTex.clone(), transparent: true, opacity: 0.75 - i * 0.2, depthWrite: false });
      sm.map.repeat.set(6 + i, 1);
      sm.map.needsUpdate = true;
      surfMats.push(sm);
      const stripeS = new THREE.Mesh(new THREE.PlaneGeometry(240, 1.6 + i * 1.2), sm);
      stripeS.rotation.x = -Math.PI / 2;
      stripeS.position.set(10, 0.05, SITE.wallZ + 70.5 + i * 2.6);
      context.add(stripeS);
    }
    // distant houses
    [[-18, 32, 5, 3.2, 4, 'A'], [4, 37, 4, 2.8, 3.6, 'B'], [26, 33, 6, 3.0, 4.5, 'A'], [46, 40, 4.5, 2.6, 4, 'B'], [-38, 38, 5, 3.0, 4, 'B']].forEach(([hx, hz, hw, hh, hd, kind]) => {
      const hM = box(hw, hh, hd, kind === 'A' ? mat.houseA : mat.houseB);
      hM.position.set(hx, hh / 2, SITE.wallZ + hz - 14);
      context.add(hM);
      const r = box(hw + 0.5, 0.25, hd + 0.5, mat.houseRoof);
      r.position.set(hx, hh + 0.12, SITE.wallZ + hz - 14);
      context.add(r);
    });
    // power poles + sagging wires
    const polesX = [-32, -12, 8, 28, 48];
    polesX.forEach((px) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 9.5, 8), mat.pole);
      pole.position.set(px, 4.75, SITE.wallZ + 7.9);
      pole.castShadow = true;
      context.add(pole);
      const cross = box(1.6, 0.09, 0.09, mat.pole);
      cross.position.set(px, 8.6, SITE.wallZ + 7.9);
      context.add(cross);
    });
    const wireMat = new THREE.LineBasicMaterial({ color: 0x222222 });
    for (let i = 0; i < polesX.length - 1; i++) {
      for (let k = -1; k <= 1; k++) {
        const a = new THREE.Vector3(polesX[i] + k * 0.7, 8.55, SITE.wallZ + 7.9);
        const b = new THREE.Vector3(polesX[i + 1] + k * 0.7, 8.55, SITE.wallZ + 7.9);
        const mid = a.clone().lerp(b, 0.5); mid.y -= 0.55;
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(16));
        context.add(new THREE.Line(geo, wireMat));
      }
    }
  }
  tagShadow(context);

  /* ---------------------------- vegetation ----------------------------- */
  function buildFrond(len) {
    const segs = 10;
    const pos = [];
    const uv = [];
    const idx = [];
    const halfW = 0.34;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = t * len;
      const y = Math.sin(t * 2.1) * len * 0.2 - t * t * len * 0.52;
      const wHere = halfW * (0.35 + 1.3 * t * (1 - t));
      const fold = 0.12 * (1 - t * 0.5);
      pos.push(x, y - fold, -wHere, x, y, 0, x, y - fold, wHere);
      uv.push(0, t, 0.5, t, 1, t);
    }
    for (let i = 0; i < segs; i++) {
      const r = i * 3;
      idx.push(r, r + 3, r + 4, r, r + 4, r + 1);
      idx.push(r + 1, r + 4, r + 5, r + 1, r + 5, r + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat.frond);
  }
  function buildPalm(height = 7, royal = true) {
    const g = new THREE.Group();
    const bend = (Math.random() - 0.5) * 0.5;
    const segs = 6;
    let y = 0;
    let r = royal ? 0.2 : 0.13;
    for (let i = 0; i < segs; i++) {
      const segH = (height - (royal ? 1.1 : 0.6)) / segs;
      const r1 = Math.max(0.07, r - (royal ? 0.02 : 0.008));
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r1, r, segH, 9), mat.trunk);
      cyl.position.set(Math.sin((i / segs) * 1.2) * bend, y + segH / 2, 0);
      cyl.castShadow = true;
      g.add(cyl);
      r = r1;
      y += segH;
    }
    const csH = royal ? 1.1 : 0.6;
    const cs = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 1.05, csH, 9), mat.crownshaft);
    cs.position.set(Math.sin(1.2) * bend, y + csH / 2, 0);
    cs.castShadow = true;
    g.add(cs);
    y += csH;
    const crown = new THREE.Group();
    crown.position.set(Math.sin(1.2) * bend, y - 0.1, 0);
    const n = 15 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const frond = buildFrond(2.6 + Math.random() * 1.0 + (royal ? 0.9 : 0.3));
      frond.rotation.y = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      frond.rotation.z = (i % 3 === 0 ? 0.28 : 0.05) - Math.random() * 0.5;
      frond.castShadow = true;
      crown.add(frond);
    }
    for (let i = 0; i < 3; i++) {
      const spear = buildFrond(1.5 + Math.random() * 0.6);
      spear.rotation.y = Math.random() * Math.PI * 2;
      spear.rotation.z = 0.9 + Math.random() * 0.3;
      crown.add(spear);
    }
    g.add(crown);
    return g;
  }
  [
    { p: [9.6, 0, 3.2], h: 6.2, royal: false },
    { p: [13.4, 0, 3.3], h: 6.8, royal: false },
    { p: [19.9, 0, 3.5], h: 6.4, royal: false },
    { p: [27.2, 0, 3.4], h: 6.9, royal: false },
    { p: [0.8, 0, 3.7], h: 6.4, royal: false },
    // pool court royal palms (between pool and wall, per plan planting)
    { p: [2.2, 0, 9.6], h: 7.6, royal: true },
    { p: [4.0, 0, 10.4], h: 6.7, royal: true },
    // along the inside of the front wall, left of the gate (plan hedge band)
    { p: [6.4, 0, 13.6], h: 5.8, royal: false },
    { p: [3.4, 0, 13.7], h: 6.3, royal: false },
    { p: [0.9, 0, 13.5], h: 5.6, royal: false },
    // field / distant
    { p: [-20, 0, SITE.wallZ + 12], h: 6.5, royal: false },
    { p: [30, 0, SITE.wallZ + 11], h: 7.2, royal: false },
    { p: [-2, 0, SITE.wallZ + 20], h: 5.4, royal: false },
  ].forEach(({ p, h, royal }) => {
    const palm = buildPalm(h, royal);
    palm.position.set(...p);
    palm.rotation.y = Math.random() * Math.PI * 2;
    scene.add(palm);
  });

  {
    const blobGeo = new THREE.IcosahedronGeometry(0.32, 1);
    const greens = new THREE.InstancedMesh(blobGeo, mat.hedge, 170);
    const darks = new THREE.InstancedMesh(blobGeo, mat.hedgeDark, 90);
    const reds = new THREE.InstancedMesh(blobGeo, mat.flower, 60);
    const dummy = new THREE.Object3D();
    let gi = 0, di = 0, ri = 0;
    function placeBlob(x, y, z, s) {
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(s);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      const pick = Math.random();
      if (pick < 0.18 && ri < 60) {
        dummy.scale.setScalar(s * 0.55);
        dummy.updateMatrix();
        reds.setMatrixAt(ri++, dummy.matrix);
        return;
      } else if (pick < 0.5 && di < 90) darks.setMatrixAt(di++, dummy.matrix);
      else if (gi < 170) greens.setMatrixAt(gi++, dummy.matrix);
    }
    // facade hedge strip
    for (let i = 0; i < 80; i++) placeBlob(0.5 + Math.random() * 29, 0.32 + Math.random() * 0.15, 1.2 + Math.random() * 0.6, 0.7 + Math.random() * 0.5);
    // planting inside the front wall, left of the gate (per plan)
    for (let i = 0; i < 45; i++) placeBlob(0.4 + Math.random() * 10.4, 0.35, 13.3 + Math.random() * 1.0, 0.55 + Math.random() * 0.5);
    // pool court planting
    for (let i = 0; i < 20; i++) placeBlob(1.2 + Math.random() * 2.6, 0.4, 8.9 + Math.random() * 2.4, 0.5 + Math.random() * 0.45);
    // sidewalk planting outside the wall
    for (let i = 0; i < 25; i++) placeBlob(-6 + Math.random() * 16, 0.3, SITE.wallZ + 0.7 + Math.random() * 0.7, 0.5 + Math.random() * 0.4);
    greens.count = gi; darks.count = di; reds.count = ri;
    greens.castShadow = darks.castShadow = reds.castShadow = true;
    scene.add(greens, darks, reds);
  }

  /* --------------------------- camera views ---------------------------- */
  const VIEWS = {
    street: { pos: [-2, 1.8, SITE.wallZ + 6], target: [14, 4.5, 0] },
    front: { pos: [15.6, 4.6, SITE.wallZ + 12.5], target: [15.6, 4.6, 0] },
    corner: { pos: [40, 3.2, 15], target: [27, 5.5, 0] },
    pool: { pos: [10.6, 1.9, 11.6], target: [3.4, 1.6, 2.2] },
    terrace: { pos: [23.0, 7.9, -1.4], target: [21, 4.2, 30] },
    aerial: { pos: [17, 42, 34], target: [12, 0, 10] },
    orbit: { pos: [40, 16, 44], target: [15, 5, 4] },
  };
  let animT = null;
  function flyTo(name) {
    const v = VIEWS[name];
    if (!v) return;
    if (walk.on) exitWalk();
    animT = {
      t: 0, dur: reducedMotion ? 0.001 : 1.2,
      fromPos: camera.position.clone(), toPos: new THREE.Vector3(...v.pos),
      fromTarget: controls.target.clone(), toTarget: new THREE.Vector3(...v.target),
    };
    hud.setActive('view', name);
    emit('view', name);
  }

  /* --------------------------- light presets --------------------------- */
  const LIGHT_PRESETS = {
    overcast: { sunPos: [10, 55, 20], sunColor: 0xeef2f5, sunI: 0.8, hemiI: 0.95, exposure: 1.0, sky: [0xb4c3ce, 0xe7edf0], fog: 0xdbe3e8, glow: 0, night: 0 },
    midday: { sunPos: [38, 52, 34], sunColor: 0xfff3df, sunI: 1.6, hemiI: 0.65, exposure: 1.05, sky: [0x7fb2dc, 0xdcedf5], fog: 0xdfeaf2, glow: 0, night: 0 },
    sunset: { sunPos: [-38, 13, 55], sunColor: 0xffa552, sunI: 1.35, hemiI: 0.4, exposure: 1.12, sky: [0xff9d5c, 0xffe3c2], fog: 0xffcfa0, glow: 0.35, night: 0 },
    night: { sunPos: [-25, 35, -15], sunColor: 0x9db8dd, sunI: 0.14, hemiI: 0.12, exposure: 0.95, sky: [0x0c1a2c, 0x1d3147], fog: 0x121f2d, glow: 0.9, night: 1 },
  };
  let currentLight = 'midday';
  function applyLight(name) {
    const p = LIGHT_PRESETS[name];
    if (!p) return;
    currentLight = name;
    sun.position.set(...p.sunPos);
    sun.color.setHex(p.sunColor);
    sun.intensity = p.sunI;
    hemi.intensity = p.hemiI;
    renderer.toneMappingExposure = p.exposure;
    scene.remove(sky);
    sky = makeSky(p.sky[0], p.sky[1]);
    scene.add(sky);
    scene.fog.color.setHex(p.fog);
    mat.glow.opacity = p.glow;
    mat.glowDim.opacity = p.glow * 0.14;
    poolLight.intensity = p.night * 22;
    porchLight1.intensity = p.night * 10;
    porchLight2.intensity = p.night * 10;
    garitaLight.intensity = p.night * 6;
    interior.applyLight(p);
    hud.setActive('light', name);
    emit('light', name);
  }

  /* --------------------------- units overlay --------------------------- */
  const unitVols = [];
  const unitGroup = new THREE.Group();
  unitGroup.visible = false;
  scene.add(unitGroup);
  let unitsOn = false;
  let hoveredVol = null;
  let selectedUnitId = null;

  if (INV && INV.building) {
    INV.units.forEach((u) => {
      const span = INV.building.unitSpans[u.id];
      if (!span) return;
      const w = span[1] - span[0] - 0.3;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, FLOOR_H - 0.45, DEPTH - 0.6),
        new THREE.MeshStandardMaterial({
          color: STATUS_COL[u.status] || STATUS_COL.available,
          emissive: STATUS_COL[u.status] || STATUS_COL.available,
          emissiveIntensity: 0.55,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
          depthTest: false,
        })
      );
      m.renderOrder = 20;
      m.position.set((span[0] + span[1]) / 2, (u.floor - 1) * FLOOR_H + FLOOR_H / 2 + 0.1, -DEPTH / 2);
      m.userData.unit = u;
      unitGroup.add(m);
      unitVols.push(m);
    });
  }

  function setUnitsOverlay(onState) {
    unitsOn = !!onState && unitVols.length > 0;
    unitGroup.visible = unitsOn;
    hud.setToggle('units', unitsOn);
    if (!unitsOn) {
      hud.hideUnitCard();
      if (hoveredVol) { hoveredVol.material.opacity = 0.3; hoveredVol = null; }
    }
  }

  function selectUnit(id) {
    selectedUnitId = id ? String(id) : null;
    unitVols.forEach((v) => {
      const isSel = selectedUnitId && v.userData.unit.id === selectedUnitId;
      v.material.opacity = isSel ? 0.62 : 0.3;
      v.material.emissiveIntensity = isSel ? 0.9 : 0.55;
    });
    if (selectedUnitId) {
      const u = INV && INV.getUnit(selectedUnitId);
      if (u) hud.showUnitCard(u);
    }
  }

  const uRay = new THREE.Raycaster();
  const uPtr = new THREE.Vector2();
  function pickUnit(e) {
    if (!unitsOn || walk.on) return null;
    const r = renderer.domElement.getBoundingClientRect();
    uPtr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    uPtr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    uRay.setFromCamera(uPtr, camera);
    const hit = uRay.intersectObjects(unitVols)[0];
    return hit ? hit.object : null;
  }
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!unitsOn || walk.on) return;
    const m = pickUnit(e);
    if (m === hoveredVol) return;
    if (hoveredVol && hoveredVol.userData.unit.id !== selectedUnitId) hoveredVol.material.opacity = 0.3;
    hoveredVol = m;
    if (m) {
      m.material.opacity = 0.55;
      hud.showUnitCard(m.userData.unit);
      renderer.domElement.style.cursor = 'pointer';
    } else {
      renderer.domElement.style.cursor = '';
      if (selectedUnitId && INV) {
        const su = INV.getUnit(selectedUnitId);
        if (su) hud.showUnitCard(su);
      }
    }
  });
  let downXY = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { downXY = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downXY) return;
    const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
    downXY = null;
    if (moved > 7 || walk.on) return;
    const m = pickUnit(e);
    if (m) {
      selectUnit(m.userData.unit.id);
      emit('unitpick', m.userData.unit);
    }
  });

  /* =====================================================================
     INTERIOR WALKTHROUGH
     ===================================================================== */
  const interior = (() => {
    const group = new THREE.Group();
    group.visible = false;
    scene.add(group);

    let colliders = [];       // {x0,z0,x1,z1} in world space
    let bounds = null;        // walkable envelope
    let currentUnit = null;
    let lamps = [];
    // soft fill so furnished rooms never go murky (only active while group visible)
    const ambient = new THREE.AmbientLight(0xfff4e4, 0.34);
    group.add(ambient);

    const finishes = { palette: 'p1', flooring: 'fl1' };

    const fmats = {
      wall: new THREE.MeshStandardMaterial({ color: 0xf2ebdd, roughness: 0.93 }),
      accentWall: new THREE.MeshStandardMaterial({ color: 0xc9a86c, roughness: 0.9 }),
      floorWood: new THREE.MeshStandardMaterial({ color: 0xd9b98a, map: oakTex, roughness: 0.55 }),
      floorStone: new THREE.MeshStandardMaterial({ color: 0xcfc8bc, map: stoneTex, roughness: 0.7 }),
      ceil: new THREE.MeshStandardMaterial({ color: 0xf7f4ec, roughness: 1 }),
      sofa: new THREE.MeshStandardMaterial({ color: 0xd9cdb4, roughness: 0.95 }),
      textile: new THREE.MeshStandardMaterial({ color: 0xcbb89a, roughness: 1 }),
      accent: new THREE.MeshStandardMaterial({ color: 0xc9a86c, roughness: 0.6, metalness: 0.25 }),
      woodDark: new THREE.MeshStandardMaterial({ color: 0x7a5c40, roughness: 0.7 }),
      counter: new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.25, metalness: 0.05, envMap: envTex, envMapIntensity: 0.6 }),
      chrome: new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.25, metalness: 0.85, envMap: envTex, envMapIntensity: 1.2 }),
      ceramic: new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.35 }),
      mattress: new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.98 }),
      tvScreen: new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.15, metalness: 0.4 }),
      plant: new THREE.MeshStandardMaterial({ color: 0x2e7d54, roughness: 0.9 }),
      rug: new THREE.MeshStandardMaterial({ color: 0xd9d0bd, roughness: 1 }),
      art: new THREE.MeshStandardMaterial({ color: 0x8aa8b0, roughness: 0.8 }),
    };
    let floorMat = fmats.floorWood;

    function applyFinishes(paletteId, flooringId) {
      if (paletteId && PALETTES[paletteId]) finishes.palette = paletteId;
      if (flooringId && FLOORINGS[flooringId]) finishes.flooring = flooringId;
      const P = PALETTES[finishes.palette];
      fmats.wall.color.setHex(P.wall);
      fmats.accentWall.color.setHex(P.accent);
      fmats.sofa.color.setHex(P.sofa);
      fmats.textile.color.setHex(P.textile || P.accent);
      fmats.accent.color.setHex(P.accent);
      fmats.rug.color.setHex(P.wall).lerp(new THREE.Color(P.accent), 0.25);
      const F = FLOORINGS[finishes.flooring];
      floorMat = F.kind === 'wood' ? fmats.floorWood : fmats.floorStone;
      if (currentUnit) rebuild(currentUnit); // live re-skin while inside
      emit('finishes', { ...finishes });
    }

    function applyLight(preset) {
      // interiors stay warmly lit at any time of day; night pushes them up
      lamps.forEach((l) => { l.intensity = l.userData.base * (0.95 + preset.night * 0.75 + (preset.glow || 0) * 0.3); });
      ambient.intensity = 0.34 + preset.night * 0.1;
    }

    /* --- furniture builders (all sized in meters, origin on the floor) --- */
    function grp(...meshes) { const g = new THREE.Group(); meshes.forEach((m) => g.add(m)); return g; }
    function fBed(w, d) {
      const g = new THREE.Group();
      const frame = box(w, 0.25, d, fmats.woodDark); frame.position.y = 0.18; g.add(frame);
      const mattress = box(w - 0.1, 0.22, d - 0.1, fmats.mattress); mattress.position.y = 0.42; g.add(mattress);
      const duvet = box(w - 0.08, 0.1, d * 0.62, fmats.textile); duvet.position.set(0, 0.55, d * 0.16); g.add(duvet);
      const head = box(w, 0.9, 0.08, fmats.woodDark); head.position.set(0, 0.65, -d / 2 + 0.04); g.add(head);
      [[-1, 0], [1, 0]].forEach(([s]) => {
        const nt = box(0.45, 0.45, 0.4, fmats.woodDark); nt.position.set(s * (w / 2 + 0.32), 0.32, -d / 2 + 0.25); g.add(nt);
        const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.2, 8), fmats.accent);
        lampBase.position.set(s * (w / 2 + 0.32), 0.64, -d / 2 + 0.25); g.add(lampBase);
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.14, 10), fmats.textile);
        shade.position.set(s * (w / 2 + 0.32), 0.79, -d / 2 + 0.25); g.add(shade);
      });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const leg = box(0.07, 0.14, 0.07, fmats.woodDark);
        leg.position.set(sx * (w / 2 - 0.06), 0.07, sz * (d / 2 - 0.06));
        g.add(leg);
      });
      return g;
    }
    function fWardrobe(w) {
      const g = new THREE.Group();
      const bodyW = box(w, 2.2, 0.6, fmats.woodDark); bodyW.position.y = 1.1; g.add(bodyW);
      for (let i = 1; i < Math.round(w / 0.55); i++) {
        const seam = box(0.012, 2.1, 0.02, fmats.accent);
        seam.position.set(-w / 2 + (w / Math.round(w / 0.55)) * i, 1.1, 0.31);
        g.add(seam);
      }
      return g;
    }
    function fSofa(w) {
      const g = new THREE.Group();
      const base = box(w, 0.42, 0.95, fmats.sofa); base.position.y = 0.3; g.add(base);
      const back = box(w, 0.5, 0.24, fmats.sofa); back.position.set(0, 0.75, -0.36); g.add(back);
      [[-1], [1]].forEach(([s]) => {
        const arm = box(0.22, 0.32, 0.95, fmats.sofa); arm.position.set(s * (w / 2 - 0.11), 0.66, 0); g.add(arm);
      });
      const c1 = box(0.5, 0.14, 0.4, fmats.textile); c1.position.set(-w / 4, 0.58, -0.2); c1.rotation.x = 0.28; g.add(c1);
      const c2 = c1.clone(); c2.position.x = w / 4; g.add(c2);
      return g;
    }
    function fCoffeeTable() {
      const g = new THREE.Group();
      const top = box(1.0, 0.05, 0.55, fmats.woodDark); top.position.y = 0.4; g.add(top);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const leg = box(0.05, 0.4, 0.05, fmats.accent);
        leg.position.set(sx * 0.44, 0.2, sz * 0.22);
        g.add(leg);
      });
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), fmats.accent);
      bowl.position.y = 0.44;
      g.add(bowl);
      return g;
    }
    function fTV(w) {
      const g = new THREE.Group();
      const cred = box(w, 0.45, 0.4, fmats.woodDark); cred.position.y = 0.25; g.add(cred);
      const tv = box(w * 0.72, w * 0.72 * 0.56, 0.05, fmats.tvScreen); tv.position.y = 0.5 + w * 0.72 * 0.28 + 0.12; g.add(tv);
      return g;
    }
    function fDining(w, d, seats) {
      const g = new THREE.Group();
      const top = box(w, 0.05, d, fmats.woodDark); top.position.y = 0.74; g.add(top);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const leg = box(0.06, 0.74, 0.06, fmats.woodDark);
        leg.position.set(sx * (w / 2 - 0.08), 0.37, sz * (d / 2 - 0.08));
        g.add(leg);
      });
      const perSide = Math.ceil(seats / 2);
      for (let i = 0; i < perSide; i++) {
        for (const sz of [-1, 1]) {
          const cx = -w / 2 + (w / (perSide + 1)) * (i + 1);
          const seat = box(0.42, 0.05, 0.42, fmats.textile); seat.position.set(cx, 0.46, sz * (d / 2 + 0.28)); g.add(seat);
          const backR = box(0.42, 0.5, 0.05, fmats.woodDark); backR.position.set(cx, 0.73, sz * (d / 2 + 0.48)); g.add(backR);
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([qx, qz]) => {
            const leg = box(0.04, 0.46, 0.04, fmats.woodDark);
            leg.position.set(cx + qx * 0.17, 0.23, sz * (d / 2 + 0.28) + qz * 0.17);
            g.add(leg);
          });
        }
      }
      const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 10), fmats.accent);
      vase.position.y = 0.88;
      g.add(vase);
      return g;
    }
    function fKitchen(w, d) {
      // L-counter along the back + right, sized to the room
      const g = new THREE.Group();
      const runW = w - 0.1;
      const lower = box(runW, 0.9, 0.62, fmats.woodDark); lower.position.set(0, 0.45, -d / 2 + 0.31); g.add(lower);
      const top = box(runW + 0.04, 0.05, 0.66, fmats.counter); top.position.set(0, 0.93, -d / 2 + 0.31); g.add(top);
      const upper = box(runW, 0.7, 0.35, fmats.woodDark); upper.position.set(0, 2.0, -d / 2 + 0.18); g.add(upper);
      // side run
      const sideL = Math.max(1.2, d - 1.4);
      const lower2 = box(0.62, 0.9, sideL, fmats.woodDark); lower2.position.set(w / 2 - 0.36, 0.45, -d / 2 + 0.62 + sideL / 2 - 0.31); g.add(lower2);
      const top2 = box(0.66, 0.05, sideL, fmats.counter); top2.position.set(w / 2 - 0.36, 0.93, -d / 2 + 0.62 + sideL / 2 - 0.31); g.add(top2);
      // fridge
      const fridge = box(0.65, 1.85, 0.65, fmats.chrome); fridge.position.set(-w / 2 + 0.38, 0.93, -d / 2 + 0.36); g.add(fridge);
      // cooktop + hood
      const hob = box(0.6, 0.02, 0.5, fmats.tvScreen); hob.position.set(0.2, 0.96, -d / 2 + 0.31); g.add(hob);
      const hood = box(0.6, 0.5, 0.5, fmats.chrome); hood.position.set(0.2, 2.0, -d / 2 + 0.3); g.add(hood);
      // sink
      const sink = box(0.5, 0.02, 0.4, fmats.chrome); sink.position.set(w / 2 - 0.36, 0.955, -d / 2 + 1.3); g.add(sink);
      const tap = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 8, 16, Math.PI), fmats.chrome);
      tap.position.set(w / 2 - 0.5, 1.02, -d / 2 + 1.3); tap.rotation.z = Math.PI / 2; g.add(tap);
      return g;
    }
    function fBath(w, d) {
      const g = new THREE.Group();
      const vanity = box(Math.min(1.2, w - 0.5), 0.82, 0.5, fmats.woodDark); vanity.position.set(-w / 2 + Math.min(1.2, w - 0.5) / 2 + 0.05, 0.41, -d / 2 + 0.3); g.add(vanity);
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.14, 14), fmats.ceramic);
      basin.position.set(-w / 2 + 0.5, 0.9, -d / 2 + 0.3); g.add(basin);
      const mirror = box(Math.min(1.0, w - 0.6), 0.7, 0.02, fmats.chrome); mirror.position.set(-w / 2 + 0.55, 1.65, -d / 2 + 0.06); g.add(mirror);
      // toilet
      const wc = grp(
        (() => { const b = box(0.38, 0.4, 0.55, fmats.ceramic); b.position.y = 0.2; return b; })(),
        (() => { const t = box(0.38, 0.35, 0.14, fmats.ceramic); t.position.set(0, 0.55, -0.2); return t; })()
      );
      wc.position.set(w / 2 - 0.32, 0, -d / 2 + 0.4);
      g.add(wc);
      // shower box in the far corner
      const tray = box(0.85, 0.06, 0.85, fmats.ceramic); tray.position.set(w / 2 - 0.46, 0.03, d / 2 - 0.46); g.add(tray);
      const glass1 = box(0.02, 1.9, 0.85, mat.glassClear); glass1.position.set(w / 2 - 0.88, 0.98, d / 2 - 0.46); g.add(glass1);
      const glass2 = box(0.85, 1.9, 0.02, mat.glassClear); glass2.position.set(w / 2 - 0.46, 0.98, d / 2 - 0.88); g.add(glass2);
      const head = box(0.16, 0.02, 0.16, fmats.chrome); head.position.set(w / 2 - 0.46, 2.05, d / 2 - 0.46); g.add(head);
      return g;
    }
    function fLaundry(w, d) {
      const g = new THREE.Group();
      const washer = box(0.6, 0.85, 0.6, fmats.chrome); washer.position.set(0, 0.43, -d / 2 + 0.34); g.add(washer);
      const door = new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), fmats.tvScreen);
      door.position.set(0, 0.5, -d / 2 + 0.645); g.add(door);
      const shelf = box(Math.min(1.1, w - 0.2), 0.04, 0.35, fmats.woodDark); shelf.position.set(0, 1.5, -d / 2 + 0.22); g.add(shelf);
      return g;
    }
    function fPlant() {
      const g = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.32, 12), fmats.accent);
      pot.position.y = 0.16; g.add(pot);
      for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.75, 6), fmats.plant);
        const a = (i / 6) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.12, 0.68, Math.sin(a) * 0.12);
        leaf.rotation.z = Math.cos(a) * 0.5;
        leaf.rotation.x = -Math.sin(a) * 0.5;
        g.add(leaf);
      }
      return g;
    }
    function fArt(w) {
      const g = new THREE.Group();
      const frame = box(w, w * 0.68, 0.04, fmats.woodDark); g.add(frame);
      const canvasM = box(w - 0.08, w * 0.68 - 0.08, 0.05, fmats.art); g.add(canvasM);
      return g;
    }
    function fLounger() {
      const g = new THREE.Group();
      const base = box(0.62, 0.1, 1.7, mat.white); base.position.y = 0.32; g.add(base);
      const back = box(0.62, 0.1, 0.62, mat.white); back.position.set(0, 0.48, -0.72); back.rotation.x = -0.66; g.add(back);
      const cushion = box(0.56, 0.06, 1.6, fmats.textile); cushion.position.y = 0.39; g.add(cushion);
      return g;
    }

    /* --- interior generation from CC_INVENTORY layout --- */
    const WALL_T = 0.12;
    const WALL_H = 2.62;

    function rebuild(unitId) {
      clear();
      currentUnit = unitId;
      if (!INV) return;
      const u = INV.getUnit(unitId);
      const layout = u && INV.getLayout(u.layout);
      const span = INV.building.unitSpans[u.id];
      if (!u || !layout || !span) return;

      const ppm = layout.pxPerM || 30;
      const [mw, mh] = layout.meters;
      const floorY = (u.floor - 1) * FLOOR_H;
      // world mapping: layout x → world x (from span left), layout y (rear→front) → world z from unit rear
      const rearZ = 1.8 - mh; // terrace front edge sits at z=1.8
      const X = (lx) => span[0] + lx;
      const Z = (ly) => rearZ + ly;

      const rooms = layout.rooms.map((r) => ({
        id: r.id, kind: r.kind, label: r.label,
        x0: X(r.x / ppm), z0: Z(r.y / ppm),
        x1: X(r.x / ppm + r.w / ppm), z1: Z(r.y / ppm + r.h / ppm),
        mw: r.mw, mh: r.mh,
      }));
      const inner = rooms.filter((r) => r.kind !== 'terrace');
      const terraces = rooms.filter((r) => r.kind === 'terrace');
      const ix0 = Math.min(...inner.map((r) => r.x0)), ix1 = Math.max(...inner.map((r) => r.x1));
      const iz0 = Math.min(...inner.map((r) => r.z0)), iz1 = Math.max(...inner.map((r) => r.z1));

      // floor + ceiling
      const floorM = new THREE.Mesh(new THREE.PlaneGeometry(ix1 - ix0, iz1 - iz0), floorMat);
      floorM.rotation.x = -Math.PI / 2;
      floorM.position.set((ix0 + ix1) / 2, floorY + 0.001 + 0.12, (iz0 + iz1) / 2);
      floorM.receiveShadow = true;
      group.add(floorM);
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ix1 - ix0, iz1 - iz0), fmats.ceil);
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set((ix0 + ix1) / 2, floorY + WALL_H + 0.12, (iz0 + iz1) / 2);
      ceil.castShadow = true; // blocks direct sun so lamps + window light shape the rooms
      group.add(ceil);

      colliders = [];
      bounds = {
        x0: ix0 + 0.25, x1: ix1 - 0.25, z0: iz0 + 0.25,
        z1: terraces.length ? Math.max(...terraces.map((t) => t.z1)) - 0.3 : iz1 - 0.25,
        // past the front glass you may only stand where a terrace deck exists
        frontZ: iz1,
        tx0: terraces.length ? Math.min(...terraces.map((t) => t.x0)) + 0.25 : null,
        tx1: terraces.length ? Math.max(...terraces.map((t) => t.x1)) - 0.25 : null,
      };

      const yBase = floorY + 0.12;

      function addWall(x0, z0, x1, z1, opts2 = {}) {
        const horizontal = Math.abs(z1 - z0) < Math.abs(x1 - x0);
        const len = horizontal ? x1 - x0 : z1 - z0;
        if (len < 0.05) return;
        const matW = opts2.accent ? fmats.accentWall : fmats.wall;
        const h = opts2.h || WALL_H;
        const wallMesh = box(horizontal ? len : WALL_T, h, horizontal ? WALL_T : len, matW);
        wallMesh.position.set(horizontal ? (x0 + x1) / 2 : x0, yBase + h / 2, horizontal ? z0 : (z0 + z1) / 2);
        wallMesh.castShadow = wallMesh.receiveShadow = true;
        group.add(wallMesh);
        const t = WALL_T / 2 + 0.06;
        colliders.push(horizontal
          ? { x0: x0, z0: z0 - t, x1: x1, z1: z0 + t }
          : { x0: x0 - t, z0: z0, x1: x0 + t, z1: z1 });
      }
      // wall with a centered door gap
      function addWallWithDoor(x0, z0, x1, z1, doorW = 0.85) {
        const horizontal = Math.abs(z1 - z0) < Math.abs(x1 - x0);
        const len = horizontal ? x1 - x0 : z1 - z0;
        if (len < doorW + 0.5) { addWall(x0, z0, x1, z1); return; }
        const mid = len / 2;
        if (horizontal) {
          addWall(x0, z0, x0 + mid - doorW / 2, z0);
          addWall(x0 + mid + doorW / 2, z0, x1, z0);
          const lintel = box(doorW, WALL_H - 2.05, WALL_T, fmats.wall);
          lintel.position.set(x0 + mid, yBase + 2.05 + (WALL_H - 2.05) / 2, z0);
          group.add(lintel);
        } else {
          addWall(x0, z0, x0, z0 + mid - doorW / 2);
          addWall(x0, z0 + mid + doorW / 2, x0, z1);
          const lintel = box(WALL_T, WALL_H - 2.05, doorW, fmats.wall);
          lintel.position.set(x0, yBase + 2.05 + (WALL_H - 2.05) / 2, z0 + mid);
          group.add(lintel);
        }
      }

      // Envelope walls: front wall becomes glass slider bays; others solid with windows
      // rear wall
      addWall(ix0, iz0, ix1, iz0);
      // side walls
      addWall(ix0, iz0, ix0, iz1);
      addWall(ix1, iz0, ix1, iz1);
      // front wall assembly: CLEAR sliding glass with a real open leaf you walk
      // through — panes get colliders, the open gap does not
      const t2 = WALL_T / 2 + 0.06;
      function frontGlassAssembly(x0, x1) {
        const span = x1 - x0;
        if (span < 0.9) { addWall(x0, iz1, x1, iz1); return; }
        const jamb = 0.28;
        addWall(x0, iz1, x0 + jamb, iz1);
        addWall(x1 - jamb, iz1, x1, iz1);
        const gapW = Math.min(1.15, Math.max(0.85, span * 0.3));
        const gx0 = (x0 + x1) / 2 - gapW / 2;
        const gx1 = gx0 + gapW;
        const h = WALL_H - 0.32;
        [[x0 + jamb, gx0], [gx1, x1 - jamb]].forEach(([px0, px1]) => {
          if (px1 - px0 < 0.12) return;
          const pane = glassSlider(px1 - px0 - 0.04, h, Math.max(1, Math.round((px1 - px0) / 1.0)), 0, mat.glassClear);
          pane.position.set((px0 + px1) / 2, yBase + h / 2 + 0.05, iz1);
          group.add(pane);
          colliders.push({ x0: px0, z0: iz1 - t2, x1: px1, z1: iz1 + t2 });
        });
        // slim track header above the opening
        const header = box(span - jamb * 2, WALL_H - h, WALL_T * 0.8, fmats.wall);
        header.position.set((x0 + x1) / 2, yBase + h + (WALL_H - h) / 2, iz1);
        group.add(header);
      }
      {
        const frontRooms = inner
          .filter((r) => Math.abs(r.z1 - iz1) < 0.05)
          .sort((a, b) => a.x0 - b.x0);
        const covered = [];
        frontRooms.forEach((r) => {
          if (r.kind === 'living' || r.kind === 'bed' || r.kind === 'hall') {
            frontGlassAssembly(r.x0, r.x1);
          } else {
            addWall(r.x0, iz1, r.x1, iz1);
          }
          covered.push([r.x0, r.x1]);
        });
        // fill spans no room owns (e.g. the sala→terrace strip) with sliders
        let cursor = ix0;
        covered.sort((a, b) => a[0] - b[0]).forEach(([cx0, cx1]) => {
          if (cx0 - cursor > 0.4) frontGlassAssembly(cursor, cx0);
          cursor = Math.max(cursor, cx1);
        });
        if (ix1 - cursor > 0.4) frontGlassAssembly(cursor, ix1);
      }

      // interior partitions from room adjacency (right + bottom edge of each room)
      inner.forEach((r) => {
        // right edge
        if (Math.abs(r.x1 - ix1) > 0.05) {
          addWallWithDoor(r.x1, Math.max(r.z0, iz0), r.x1, Math.min(r.z1, iz1), r.kind === 'hall' || r.kind === 'living' ? 1.5 : 1.0);
        }
        // bottom edge (toward front): build wall only where another room lies
        // beyond it — sala/dormitorios flow straight to the terrace glass
        // instead of facing a blank partition (plan-true open plan)
        if (Math.abs(r.z1 - iz1) > 0.05) {
          const ex0 = Math.max(r.x0, ix0), ex1 = Math.min(r.x1, ix1);
          const openFlow = r.kind === 'living' || r.kind === 'bed' || r.kind === 'hall';
          if (!openFlow) {
            addWallWithDoor(ex0, r.z1, ex1, r.z1, 1.0);
          } else {
            inner
              .filter((o) => o !== r && Math.abs(o.z0 - r.z1) < 0.05 && o.x1 > ex0 + 0.05 && o.x0 < ex1 - 0.05)
              .forEach((o) => {
                const sx0 = Math.max(o.x0, ex0), sx1 = Math.min(o.x1, ex1);
                if (sx1 - sx0 < 0.2) return;
                addWallWithDoor(sx0, r.z1, sx1, r.z1, r.kind === 'bed' ? 1.0 : 1.5);
              });
          }
        }
      });

      // terrace deck + railing + view
      terraces.forEach((t) => {
        const deck = box(t.x1 - t.x0, 0.1, t.z1 - t.z0, mat.plank);
        deck.position.set((t.x0 + t.x1) / 2, floorY + 0.07, (t.z0 + t.z1) / 2);
        deck.receiveShadow = true;
        group.add(deck);
        const rail = barRail(t.x1 - t.x0 - 0.1, 1.02, 5);
        rail.position.set((t.x0 + t.x1) / 2, floorY + 0.12, t.z1 - 0.08);
        group.add(rail);
        const tt = 0.3;
        colliders.push({ x0: t.x0 - tt, z0: t.z1 - 0.12, x1: t.x1 + tt, z1: t.z1 + tt }); // front rail
        colliders.push({ x0: t.x0 - tt, z0: t.z0 - tt, x1: t.x0 + 0.12, z1: t.z1 + tt }); // sides
        colliders.push({ x0: t.x1 - 0.12, z0: t.z0 - tt, x1: t.x1 + tt, z1: t.z1 + tt });
        // side rails
        [['l', t.x0], ['r', t.x1]].forEach(([, rx]) => {
          const sRail = barRail(t.z1 - t.z0 - 0.1, 1.02, 5);
          sRail.rotation.y = Math.PI / 2;
          sRail.position.set(rx, floorY + 0.12, (t.z0 + t.z1) / 2);
          group.add(sRail);
        });
        // pair of loungers or bistro set
        if (t.x1 - t.x0 > 3) {
          const l1 = fLounger(); l1.position.set(t.x0 + 0.7, floorY + 0.1, (t.z0 + t.z1) / 2); l1.rotation.y = Math.PI; group.add(l1);
          const pl = fPlant(); pl.position.set(t.x1 - 0.4, floorY + 0.12, t.z0 + 0.4); group.add(pl);
        }
      });

      // furnish rooms
      inner.forEach((r) => {
        const w = r.x1 - r.x0, d = r.z1 - r.z0;
        const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
        const place = (obj, px, pz, rotY = 0, coll = null) => {
          obj.position.set(px, yBase, pz);
          obj.rotation.y = rotY;
          obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
          group.add(obj);
          if (coll) colliders.push(coll);
        };
        if (r.kind === 'bed') {
          const bw = Math.min(1.6, w - 1.3);
          place(fBed(bw, 2.0), cx, r.z0 + 1.1, 0, { x0: cx - bw / 2 - 0.45, z0: r.z0 + 0.05, x1: cx + bw / 2 + 0.45, z1: r.z0 + 2.15 });
          // wardrobe on a SIDE wall — never in front of the glass
          if (d > 2.9) {
            const ww = Math.min(1.6, d - 2.4);
            place(fWardrobe(ww), r.x1 - 0.34, r.z0 + 2.3 + ww / 2, -Math.PI / 2, { x0: r.x1 - 0.68, z0: r.z0 + 2.25, x1: r.x1 - 0.02, z1: r.z0 + 2.35 + ww });
          }
          const pl = fPlant(); place(pl, r.x0 + 0.35, r.z1 - 0.4);
          const art = fArt(0.9); art.position.set(cx, yBase + 1.55, r.z0 + 0.08); group.add(art);
        } else if (r.kind === 'living') {
          const sw = Math.min(2.4, w - 1.2);
          place(fSofa(sw), cx, r.z0 + 0.62, 0, { x0: cx - sw / 2 - 0.1, z0: r.z0 + 0.1, x1: cx + sw / 2 + 0.1, z1: r.z0 + 1.15 });
          place(fCoffeeTable(), cx, r.z0 + 1.75);
          const rug = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(3, w - 0.8), 2.1), fmats.rug);
          rug.rotation.x = -Math.PI / 2;
          rug.position.set(cx, yBase + 0.01, r.z0 + 1.5);
          group.add(rug);
          // media wall on the side wall AWAY from the open sightline to the
          // glass, so the spawn view never starts nose-to-screen
          if (w > 3.1 && d > 2.6) {
            const tvw = Math.min(1.7, d - 1.2);
            if (frontOpenX(r, inner) < cx) {
              place(fTV(tvw), r.x1 - 0.34, cz, -Math.PI / 2, { x0: r.x1 - 0.7, z0: cz - tvw / 2 - 0.1, x1: r.x1 - 0.02, z1: cz + tvw / 2 + 0.1 });
            } else {
              place(fTV(tvw), r.x0 + 0.34, cz, Math.PI / 2, { x0: r.x0 + 0.02, z0: cz - tvw / 2 - 0.1, x1: r.x0 + 0.7, z1: cz + tvw / 2 + 0.1 });
            }
          }
          const pl = fPlant(); place(pl, r.x1 - 0.4, r.z0 + 0.4);
        } else if (r.kind === 'kitchen') {
          const k = fKitchen(w, d);
          place(k, cx, cz, 0, { x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z0 + 0.75 });
          colliders.push({ x0: r.x1 - 0.75, z0: r.z0, x1: r.x1, z1: r.z1 - 0.6 });
        } else if (r.kind === 'bath') {
          const b = fBath(w, d);
          place(b, cx, cz, 0, { x0: r.x0, z0: r.z0, x1: r.x0 + 0.6, z1: r.z0 + 0.6 });
        } else if (r.kind === 'service') {
          place(fLaundry(w, d), cx, cz, 0, { x0: cx - 0.35, z0: r.z0, x1: cx + 0.35, z1: r.z0 + 0.7 });
        } else if (r.id === 'dining' || (r.kind === 'living' && r.id === 'dining')) {
          /* handled below via id check */
        }
        if (r.id === 'dining') {
          const dw = Math.min(1.7, w - 1.5), dd = Math.min(0.95, d - 1.6);
          place(fDining(dw, dd, 6), cx, cz, 0, { x0: cx - dw / 2 - 0.35, z0: cz - dd / 2 - 0.35, x1: cx + dw / 2 + 0.35, z1: cz + dd / 2 + 0.35 });
        }
        if (r.id === 'entry') {
          const console = box(Math.min(1.1, w - 0.4), 0.8, 0.3, fmats.woodDark);
          console.position.set(cx, yBase + 0.4, r.z0 + 0.2);
          group.add(console);
          const art = fArt(0.7); art.position.set(cx, yBase + 1.6, r.z0 + 0.08); group.add(art);
        }
        // ceiling lamp per room
        const lamp = new THREE.PointLight(0xffe6c4, 0, Math.max(w, d) * 1.6, 2);
        lamp.position.set(cx, yBase + WALL_H - 0.25, cz);
        lamp.userData.base = 1.35;
        lamps.push(lamp);
        group.add(lamp);
        const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.06, 12), fmats.accent);
        fixture.position.set(cx, yBase + WALL_H - 0.06, cz);
        group.add(fixture);
      });

      applyLight(LIGHT_PRESETS[currentLight]);
      group.visible = true;
      return { spawn: resolveSpawn(spawnPoint(rooms)), floorY: yBase, unit: u };
    }

    // x of the widest opening in a room's front edge — an open-plan span to
    // the glass if one exists, else its widest doorway, else room center
    function frontOpenX(room, innerRooms) {
      const covered = innerRooms
        .filter((o) => o !== room && Math.abs(o.z0 - room.z1) < 0.05 && o.x1 > room.x0 + 0.05 && o.x0 < room.x1 - 0.05)
        .map((o) => [Math.max(o.x0, room.x0), Math.min(o.x1, room.x1)])
        .sort((a, b) => a[0] - b[0]);
      let x = (room.x0 + room.x1) / 2;
      let best = 0;
      let cursor = room.x0;
      for (const [c0, c1] of covered) {
        if (c0 - cursor > best) { best = c0 - cursor; x = (cursor + c0) / 2; }
        cursor = Math.max(cursor, c1);
      }
      if (room.x1 - cursor > best) { best = room.x1 - cursor; x = (cursor + room.x1) / 2; }
      if (best < 0.8) {
        let bw = 0;
        covered.forEach(([c0, c1]) => { if (c1 - c0 > bw) { bw = c1 - c0; x = (c0 + c1) / 2; } });
      }
      return x;
    }

    function spawnPoint(rooms) {
      // spawn in the living room aimed at the widest opening in its front
      // edge, so the first view reads as depth, never a wall in the face
      const inner2 = rooms.filter((r) => r.kind !== 'terrace');
      const living = rooms.find((r) => r.id === 'living') || rooms.find((r) => r.kind === 'living') || rooms.find((r) => r.id === 'entry') || rooms[0];
      const depth = living.z1 - living.z0;
      return { x: frontOpenX(living, inner2), z: living.z0 + Math.min(1.55, depth * 0.45) };
    }

    function resolveSpawn(p) {
      // nudge the spawn out of any furniture/wall collision envelope
      const R2 = 0.32;
      for (let i = 0; i < 3; i++) {
        const c = colliders.find((cc) => p.x > cc.x0 - R2 && p.x < cc.x1 + R2 && p.z > cc.z0 - R2 && p.z < cc.z1 + R2);
        if (!c) break;
        const dxL = p.x - (c.x0 - R2), dxR = (c.x1 + R2) - p.x;
        const dzL = p.z - (c.z0 - R2), dzR = (c.z1 + R2) - p.z;
        const m = Math.min(dxL, dxR, dzL, dzR);
        if (m === dxL) p.x = c.x0 - R2; else if (m === dxR) p.x = c.x1 + R2;
        else if (m === dzL) p.z = c.z0 - R2; else p.z = c.z1 + R2;
      }
      return p;
    }

    function clear() {
      lamps = [];
      colliders = [];
      for (let i = group.children.length - 1; i >= 0; i--) {
        const c = group.children[i];
        if (c === ambient) continue; // keep the persistent fill light
        group.remove(c);
        c.traverse((o) => {
          if (o.isMesh) {
            o.geometry && o.geometry.dispose();
          }
        });
      }
      group.visible = false;
      currentUnit = null;
    }

    return {
      group,
      rebuild,
      clear,
      applyFinishes,
      applyLight,
      get colliders() { return colliders; },
      get bounds() { return bounds; },
      get finishes() { return { ...finishes }; },
      get unit() { return currentUnit; },
    };
  })();

  /* --------------------------- walk / joystick -------------------------- */
  const walk = {
    on: false, mode: 'site', yaw: 0, pitch: 0, keys: {},
    dragging: false, lastX: 0, lastY: 0, dragId: null,
    savedPos: null, savedTarget: null,
    floorY: 0,
    joy: { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0 },
  };

  function collideMove(px, pz, nx, nz) {
    // slide along colliders (walkthrough mode only)
    if (walk.mode !== 'unit') return [nx, nz];
    const R = 0.22;
    const inside = (x, z, c) => x > c.x0 - R && x < c.x1 + R && z > c.z0 - R && z < c.z1 + R;
    let ox = nx, oz = nz;
    for (const c of interior.colliders) {
      if (inside(ox, oz, c)) {
        if (inside(px, pz, c)) continue; // already overlapping — let them walk out
        // try axis-separated slide
        if (!inside(ox, pz, c)) { oz = pz; }
        else if (!inside(px, oz, c)) { ox = px; }
        else { ox = px; oz = pz; }
      }
    }
    const b = interior.bounds;
    if (b) {
      ox = THREE.MathUtils.clamp(ox, b.x0, b.x1);
      oz = THREE.MathUtils.clamp(oz, b.z0, b.z1);
      // don't step past the front glass line where there's no terrace deck
      if (b.tx0 != null && oz > b.frontZ && (ox < b.tx0 || ox > b.tx1)) {
        if (pz <= b.frontZ) oz = pz;
        else ox = THREE.MathUtils.clamp(ox, b.tx0, b.tx1);
      }
    } else {
      ox = THREE.MathUtils.clamp(ox, -13, 37);
      oz = THREE.MathUtils.clamp(oz, -13, SITE.wallZ + 9);
    }
    return [ox, oz];
  }

  function startWalk(mode, spawn, floorY) {
    walk.on = true;
    walk.mode = mode;
    controls.autoRotate = false;
    hud.setToggle('auto', false);
    walk.savedPos = walk.savedPos || camera.position.clone();
    walk.savedTarget = walk.savedTarget || controls.target.clone();
    controls.enabled = false;
    walk.floorY = floorY || 0;
    if (spawn) camera.position.set(spawn.x, walk.floorY + EYE, spawn.z);
    else camera.position.set(14, EYE, 11);
    walk.yaw = mode === 'unit' ? Math.PI : 0; // units: face the ocean/terrace (+z → yaw π)
    walk.pitch = 0.0;
    camera.fov = mode === 'unit' ? 64 : 56; // roomier first-person view
    camera.updateProjectionMatrix();
    animT = null;
    hud.setWalkUI(true, mode);
    emit('walk', { on: true, mode });
  }
  function exitWalk() {
    if (!walk.on) return;
    walk.on = false;
    controls.enabled = true;
    camera.fov = 46;
    camera.updateProjectionMatrix();
    if (walk.savedPos) {
      camera.position.copy(walk.savedPos);
      controls.target.copy(walk.savedTarget);
      walk.savedPos = null;
      walk.savedTarget = null;
    }
    if (walk.mode === 'unit') {
      interior.clear();
      building.visible = true;
      unitGroup.visible = unitsOn;
    }
    walk.mode = 'site';
    hud.setWalkUI(false);
    emit('walk', { on: false });
  }

  function enterWalkthrough(unitId, fin) {
    if (!INV) return false;
    if (fin) interior.applyFinishes(fin.palette, fin.flooring);
    const res = interior.rebuild(unitId);
    if (!res) return false;
    building.visible = false;
    unitGroup.visible = false;
    hud.hideUnitCard();
    startWalk('unit', res.spawn, res.floorY - 0.12);
    // face the terrace/ocean initially: +z direction → yaw = π
    walk.yaw = Math.PI;
    emit('walkthrough', { unit: unitId });
    return true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  function onKeyDown(e) {
    if (e.key === 'Escape' && walk.on) exitWalk();
    walk.keys[e.key.toLowerCase()] = true;
  }
  function onKeyUp(e) { walk.keys[e.key.toLowerCase()] = false; }

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (!walk.on) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const isTouch = e.pointerType === 'touch';
    if (isTouch && e.clientX - rect.left < rect.width * 0.45 && e.clientY - rect.top > rect.height * 0.4) {
      // left-bottom zone → joystick
      walk.joy.active = true;
      walk.joy.id = e.pointerId;
      walk.joy.cx = e.clientX;
      walk.joy.cy = e.clientY;
      walk.joy.dx = walk.joy.dy = 0;
      hud.showJoystick(e.clientX - rect.left, e.clientY - rect.top);
      return;
    }
    walk.dragging = true;
    walk.dragId = e.pointerId;
    walk.lastX = e.clientX;
    walk.lastY = e.clientY;
  });
  window.addEventListener('pointermove', (e) => {
    if (!walk.on) return;
    if (walk.joy.active && e.pointerId === walk.joy.id) {
      const dx = e.clientX - walk.joy.cx;
      const dy = e.clientY - walk.joy.cy;
      const cap = 46;
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, cap / len);
      walk.joy.dx = (dx * k) / cap;
      walk.joy.dy = (dy * k) / cap;
      hud.moveJoystick(walk.joy.dx * cap, walk.joy.dy * cap);
      return;
    }
    if (!walk.dragging || e.pointerId !== walk.dragId) return;
    walk.yaw -= (e.clientX - walk.lastX) * 0.0032;
    walk.pitch -= (e.clientY - walk.lastY) * 0.0028;
    walk.pitch = THREE.MathUtils.clamp(walk.pitch, -1.2, 1.2);
    walk.lastX = e.clientX;
    walk.lastY = e.clientY;
  });
  window.addEventListener('pointerup', (e) => {
    if (walk.joy.active && e.pointerId === walk.joy.id) {
      walk.joy.active = false;
      walk.joy.dx = walk.joy.dy = 0;
      hud.hideJoystick();
    }
    if (e.pointerId === walk.dragId) walk.dragging = false;
  });

  function updateWalk(dt) {
    camera.rotation.set(walk.pitch, walk.yaw, 0);
    const speed = (walk.mode === 'unit' ? 3.4 : 5.2) * dt;
    const fwd = new THREE.Vector3(-Math.sin(walk.yaw), 0, -Math.cos(walk.yaw));
    const rightV = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const k = walk.keys;
    const px = camera.position.x, pz = camera.position.z;
    let mx = 0, mz = 0;
    if (k['w'] || k['arrowup']) { mx += fwd.x * speed; mz += fwd.z * speed; }
    if (k['s'] || k['arrowdown']) { mx -= fwd.x * speed; mz -= fwd.z * speed; }
    if (k['a'] || k['arrowleft']) { mx -= rightV.x * speed; mz -= rightV.z * speed; }
    if (k['d'] || k['arrowright']) { mx += rightV.x * speed; mz += rightV.z * speed; }
    if (walk.joy.active) {
      mx += (fwd.x * -walk.joy.dy + rightV.x * walk.joy.dx) * speed;
      mz += (fwd.z * -walk.joy.dy + rightV.z * walk.joy.dx) * speed;
    }
    const [nx, nz] = collideMove(px, pz, px + mx, pz + mz);
    camera.position.x = nx;
    camera.position.z = nz;
    camera.position.y = walk.floorY + EYE;
  }

  /* ------------------------------- HUD ---------------------------------- */
  const hud = (() => {
    if (!O.hud) {
      return {
        setActive() {}, setToggle() {}, showUnitCard() {}, hideUnitCard() {},
        setWalkUI() {}, showJoystick() {}, moveJoystick() {}, hideJoystick() {}, el: null,
        refresh() {},
      };
    }
    const el = document.createElement('div');
    el.className = 'cc3d-hud';
    el.innerHTML = `
      <div class="cc3d-toolbar cc3d-toolbar-views" data-role="views"></div>
      <div class="cc3d-toolbar cc3d-toolbar-lights" data-role="lights"></div>
      <div class="cc3d-toolbar cc3d-toolbar-extras" data-role="extras"></div>
      <div class="cc3d-unitcard" data-role="unitcard" hidden>
        <h3 data-role="uc-id"></h3>
        <p data-role="uc-type"></p>
        <p data-role="uc-areas"></p>
        <p data-role="uc-price"></p>
        <div class="cc3d-uc-foot">
          <span class="cc3d-status" data-role="uc-status"></span>
          <button type="button" class="cc3d-walkbtn" data-role="uc-walk"></button>
        </div>
      </div>
      <div class="cc3d-walkhint" data-role="walkhint" hidden></div>
      <button type="button" class="cc3d-exitwalk" data-role="exitwalk" hidden></button>
      <div class="cc3d-joystick" data-role="joy" hidden><div class="cc3d-joyknob" data-role="joyknob"></div></div>
      <div class="cc3d-compass" data-role="compass">N</div>
    `;
    container.appendChild(el);
    const q = (r) => el.querySelector(`[data-role="${r}"]`);

    const STR = {
      en: {
        views: { street: 'Street', front: 'Front', corner: 'Corner', pool: 'Pool', terrace: '302 Terrace', aerial: 'Aerial', orbit: 'Orbit' },
        lights: { overcast: 'Overcast', midday: 'Midday', sunset: 'Sunset', night: 'Night' },
        extras: { auto: 'Auto-Orbit', walk: 'Walk', units: 'Units' },
        walkIn: 'Walk inside',
        exit: '✕ Exit walkthrough',
        exitSite: '✕ Exit walk',
        hintUnit: 'WASD / drag to look · walk out to the terrace · Esc to exit',
        hintUnitTouch: 'Left thumb: move · right: look around',
        hintSite: 'WASD / arrows to move · drag to look · Esc to exit',
        from: 'From',
        status: { available: 'Available', conditional: 'Reserved', sold: 'Sold' },
        bed: 'BR', bath: 'BA', floor: 'Floor', terrace: 'terrace',
      },
      es: {
        views: { street: 'Calle', front: 'Frente', corner: 'Esquina', pool: 'Piscina', terrace: 'Terraza 302', aerial: 'Aérea', orbit: 'Órbita' },
        lights: { overcast: 'Nublado', midday: 'Mediodía', sunset: 'Atardecer', night: 'Noche' },
        extras: { auto: 'Auto-órbita', walk: 'Caminar', units: 'Unidades' },
        walkIn: 'Recorrer',
        exit: '✕ Salir del recorrido',
        exitSite: '✕ Salir',
        hintUnit: 'WASD / arrastra para mirar · sal a la terraza · Esc para salir',
        hintUnitTouch: 'Pulgar izq.: moverse · der.: mirar',
        hintSite: 'WASD / flechas para moverse · arrastra para mirar · Esc',
        from: 'Desde',
        status: { available: 'Disponible', conditional: 'Reservado', sold: 'Vendido' },
        bed: 'Dorm', bath: 'Baños', floor: 'Piso', terrace: 'terraza',
      },
    };
    let lang = O.lang === 'es' ? 'es' : 'en';
    const T = () => STR[lang];

    function chip(label, cls = '') {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cc3d-chip' + (cls ? ' ' + cls : '');
      b.textContent = label;
      return b;
    }
    function renderBars() {
      const vBar = q('views');
      vBar.innerHTML = '';
      Object.keys(VIEWS).forEach((v) => {
        const b = chip(T().views[v] || v);
        b.dataset.view = v;
        b.addEventListener('click', () => flyTo(v));
        vBar.appendChild(b);
      });
      const lBar = q('lights');
      lBar.innerHTML = '';
      Object.keys(LIGHT_PRESETS).forEach((lk) => {
        const b = chip(T().lights[lk] || lk);
        b.dataset.light = lk;
        b.addEventListener('click', () => applyLight(lk));
        lBar.appendChild(b);
      });
      const eBar = q('extras');
      eBar.innerHTML = '';
      const autoB = chip(T().extras.auto);
      autoB.dataset.toggle = 'auto';
      autoB.addEventListener('click', () => {
        controls.autoRotate = !controls.autoRotate;
        controls.autoRotateSpeed = 0.9;
        setToggle('auto', controls.autoRotate);
        if (controls.autoRotate && walk.on) exitWalk();
      });
      eBar.appendChild(autoB);
      const walkB = chip(T().extras.walk);
      walkB.dataset.toggle = 'walk';
      walkB.addEventListener('click', () => {
        if (walk.on) exitWalk();
        else startWalk('site', { x: 14, z: 11 }, 0);
      });
      eBar.appendChild(walkB);
      if (unitVols.length) {
        const unitsB = chip(T().extras.units);
        unitsB.dataset.toggle = 'units';
        unitsB.addEventListener('click', () => setUnitsOverlay(!unitsOn));
        eBar.appendChild(unitsB);
      }
      setActive('view', 'orbit');
      setActive('light', currentLight);
      setToggle('units', unitsOn);
    }

    function setActive(kind, name) {
      const attr = kind === 'view' ? 'view' : 'light';
      el.querySelectorAll(`[data-${attr}]`).forEach((b) => b.classList.toggle('is-active', b.dataset[attr] === name));
    }
    function setToggle(name, onState) {
      el.querySelectorAll(`[data-toggle="${name}"]`).forEach((b) => b.classList.toggle('is-active', !!onState));
    }
    function showUnitCard(u) {
      const card = q('unitcard');
      q('uc-id').textContent = (lang === 'es' ? 'Unidad ' : 'Unit ') + u.id;
      q('uc-type').textContent = `${u.beds} ${T().bed} · ${u.baths} ${T().bath} · ${T().floor} ${u.floor}`;
      q('uc-areas').textContent = `${u.areaM2.toFixed(2)} m² + ${u.terraceM2.toFixed(2)} m² ${T().terrace}`;
      const priceEl = q('uc-price');
      priceEl.textContent = u.status === 'available' ? `${T().from} $${u.price.toLocaleString('en-US')}` : '';
      priceEl.hidden = u.status !== 'available';
      const st = q('uc-status');
      st.textContent = T().status[u.status] || u.status;
      st.className = 'cc3d-status is-' + u.status;
      const wb = q('uc-walk');
      wb.textContent = T().walkIn;
      wb.onclick = () => enterWalkthrough(u.id);
      card.hidden = false;
    }
    function hideUnitCard() { q('unitcard').hidden = true; }
    function setWalkUI(onState, mode) {
      const isTouch = matchMedia('(pointer: coarse)').matches;
      const hint = q('walkhint');
      const exitB = q('exitwalk');
      if (onState) {
        hint.textContent = mode === 'unit' ? (isTouch ? T().hintUnitTouch : T().hintUnit) : T().hintSite;
        hint.hidden = false;
        exitB.textContent = mode === 'unit' ? T().exit : T().exitSite;
        exitB.hidden = false;
        exitB.onclick = () => exitWalk();
        setTimeout(() => { hint.classList.add('is-faded'); }, 5200);
        hint.classList.remove('is-faded');
      } else {
        hint.hidden = true;
        exitB.hidden = true;
      }
      setToggle('walk', onState);
      el.classList.toggle('is-walking', !!onState);
    }
    const joyEl = q('joy');
    const joyKnob = q('joyknob');
    function showJoystick(x, y) {
      joyEl.style.left = x + 'px';
      joyEl.style.top = y + 'px';
      joyEl.hidden = false;
      joyKnob.style.transform = 'translate(-50%,-50%)';
    }
    function moveJoystick(dx, dy) {
      joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
    function hideJoystick() { joyEl.hidden = true; }

    renderBars();
    return {
      el,
      setActive, setToggle, showUnitCard, hideUnitCard, setWalkUI, showJoystick, moveJoystick, hideJoystick,
      refresh(newLang) { if (newLang) lang = newLang === 'es' ? 'es' : 'en'; renderBars(); },
      get compass() { return q('compass'); },
    };
  })();

  /* ------------------------------ sizing -------------------------------- */
  function resize() {
    const w = Math.max(container.clientWidth, 2);
    const h = Math.max(container.clientHeight, 2);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  /* ------------------------------ loop ---------------------------------- */
  let running = true;
  let disposed = false;
  const clock = new THREE.Clock();
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  const io = new IntersectionObserver((entries) => {
    const vis = entries[0].isIntersecting;
    if (vis && !running) { running = true; clock.getDelta(); requestAnimationFrame(animate); }
    else if (!vis) running = false;
  }, { threshold: 0.01 });
  io.observe(container);

  function animate() {
    if (!running || disposed) return;
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (animT) {
      animT.t += dt / animT.dur;
      const k = easeInOutCubic(Math.min(animT.t, 1));
      camera.position.lerpVectors(animT.fromPos, animT.toPos, k);
      controls.target.lerpVectors(animT.fromTarget, animT.toTarget, k);
      if (animT.t >= 1) animT = null;
    }
    waterTex.offset.x += dt * 0.015;
    waterTex.offset.y += dt * 0.008;
    if (typeof surfMats !== 'undefined') surfMats.forEach((sm, i) => { sm.map.offset.x += dt * (0.004 + i * 0.003); });
    if (walk.on) updateWalk(dt);
    else controls.update();
    renderer.render(scene, camera);
  }
  animate();
  requestAnimationFrame(() => {
    renderer.render(scene, camera);
    emit('ready');
  });

  applyLight(O.autoLight);
  if (O.view && O.view !== 'orbit') flyTo(O.view);
  if (O.unitsOverlay) setUnitsOverlay(true);

  /* ------------------------------ API ----------------------------------- */
  return {
    domElement: renderer.domElement,
    container,
    on,
    flyTo,
    applyLight,
    setUnitsOverlay,
    selectUnit,
    enterWalkthrough,
    exitWalk,
    setFinishes: (p, f) => interior.applyFinishes(p, f),
    getFinishes: () => interior.finishes,
    setLang: (l) => hud.refresh(l),
    resize,
    isWalking: () => walk.on,
    walkMode: () => walk.mode,
    scene, camera, renderer, controls, VIEWS,
    snap(name) {
      const v = VIEWS[name];
      if (!v) return 'no view';
      animT = null;
      camera.position.set(...v.pos);
      controls.target.set(...v.target);
      controls.update();
      renderer.render(scene, camera);
      return 'snapped ' + name;
    },
    dispose() {
      disposed = true;
      running = false;
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.dispose();
      pmrem.dispose();
      if (hud.el) hud.el.remove();
      renderer.domElement.remove();
    },
  };
}

export { PALETTES as CC3D_PALETTES, FLOORINGS as CC3D_FLOORINGS };
