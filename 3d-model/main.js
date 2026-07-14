import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function signalReady() {
  try {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
    window.dispatchEvent(new CustomEvent('cc:model-ready'));
  } catch (_) { /* ignore */ }
}
function signalError(err) {
  console.error('[Coastline 3D model]', err);
  const msg = err && (err.message || String(err));
  window.dispatchEvent(new CustomEvent('cc:model-error', { detail: msg }));
}

/* =========================================================================
   COASTLINE CONDOS — procedural 3D reconstruction  (v3, plan-dimensioned)
   Playas, Ecuador. Photo-matched facade language (v2) now sized from the
   architectural plans in "layout diagram/" (30.00 m facade × 12.20 m deep,
   stair halls at 7.5–11.1 and 18.6–22.2, level 3 set back to 27 m):

   - 3-story row, 30 m long: tan (camel) base walls carrying white
     projecting balcony boxes with black horizontal-bar railings.
   - Two OPEN tan stair towers rising past the parapet, white header caps,
     stairs and landings visible in the void.
   - Peaked white parapet: two straight planes meeting at an off-center
     peak split by a narrow vertical slot.
   - Right-end unit: 2-story black-mullion glass wall wrapping the corner,
     white curtains, floating white roof plate with rooftop rail.
   - Terrace bay with set-back penthouse, plank-tile floor, bar railings.
   - Site: concrete parking court, red curb + flower hedge, perimeter wall,
     corrugated sliding gate under a white header beam, pool courtyard with
     travertine deck + royal-palm island, street, scrub field, power lines,
     ocean with surf on the horizon.
========================================================================= */

/* ---------------------------------------------------------------------- */
/* Constants                                                              */
/* ---------------------------------------------------------------------- */

const FLOOR_H = 3.0;
const BUILD_H = 9.0;
const DEPTH = 12.2;         // main slab depth per the plans (was 9.0 guessed)

// segment layout along X, from the architectural plans:
// 30.00 m facade = unit bay 7.5 | stair 3.6 | unit bay 7.5 | stair 3.6 | 7.8
// (right 7.8 m = set-back plank terrace edge + 2-story corner glass unit)
const SEGS = [
  { x0: 0.0,  w: 7.5, type: 'white' },    // 101 / 201 / 301 stack
  { x0: 7.5,  w: 3.6, type: 'tower' },
  { x0: 11.1, w: 7.5, type: 'white' },    // 102 / 202 stack
  { x0: 18.6, w: 3.6, type: 'tower' },
  { x0: 22.2, w: 2.8, type: 'terrace' },  // set-back plank bay (302 terrace)
  { x0: 25.0, w: 5.0, type: 'end' },      // corner glass unit
];
const ROW_LEN = 30.0;
const PEAK_X = 11.1;        // roof peak (slot centered here)
const SLOT_W = 0.36;

const COL = {
  white: 0xf4f1ea,
  whiteDim: 0xe6e2d8,
  tan: 0xb08c6c,
  tanDark: 0x8a6b52,
  tanDeep: 0x6b5240,
  rail: 0x1a1b1d,
  bronze: 0x2b2724,
  glass: 0x181f24,
  curtain: 0xf3efe8,
  interior: 0x30291f,
  concrete: 0xc9c4b8,
  paver: 0xd9d2c2,
  travertine: 0xe4dccb,
  curb: 0xa93526,
  poolWater: 0x3fb0d0,
  poolShell: 0x7fd2e4,
  asphalt: 0x565a5c,
  soil: 0xa5947a,
  grass: 0x6f8b4e,
  ocean: 0x2c6d8d,
  wallWhite: 0xeceade,
  corrug: 0x9aa0a4,
  doorBrown: 0x7a5738,
  hedge: 0x3f6d35,
  hedgeDark: 0x2e5426,
  flower: 0xc0392b,
  trunk: 0xb6ad9a,
  crownshaft: 0x7f9b5e,
  frond: 0x4f7d3f,
};

/* ---------------------------------------------------------------------- */
/* Renderer / Scene / Camera                                              */
/* ---------------------------------------------------------------------- */

const container = document.getElementById('app');
if (!container) {
  signalError(new Error('Missing #app container'));
  throw new Error('Missing #app container');
}

// Iframe can report 0×0 for a frame — never init WebGL at zero size
const bootW = Math.max(window.innerWidth || 0, container.clientWidth || 0, 640);
const bootH = Math.max(window.innerHeight || 0, container.clientHeight || 0, 480);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch (err) {
  signalError(err);
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(bootW, bootH);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, bootW / bootH, 0.1, 1500);
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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------------------------------------------------------------------- */
/* Sky / fog                                                              */
/* ---------------------------------------------------------------------- */

function makeSky(topColor, bottomColor) {
  const geo = new THREE.SphereGeometry(650, 24, 16);
  const mat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color(topColor) }, bottom: { value: new THREE.Color(bottomColor) } },
    vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vPos; uniform vec3 top; uniform vec3 bottom;
      void main(){ float h = clamp(normalize(vPos).y*0.62+0.32,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(h,0.5)),1.0); }`,
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

/* ---------------------------------------------------------------------- */
/* Lights                                                                 */
/* ---------------------------------------------------------------------- */

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

const fillLight = new THREE.AmbientLight(0xffffff, 0.14);
scene.add(fillLight);

// night-only lights (off by day)
const poolLight = new THREE.PointLight(0x54d8f0, 0, 14, 2);
poolLight.position.set(-7, 0.5, 17);
scene.add(poolLight);
const porchLight1 = new THREE.PointLight(0xffc87d, 0, 12, 2);
porchLight1.position.set(9.3, 3.2, 1.4);
scene.add(porchLight1);
const porchLight2 = new THREE.PointLight(0xffc87d, 0, 12, 2);
porchLight2.position.set(20.4, 3.2, 1.4);
scene.add(porchLight2);

/* ---------------------------------------------------------------------- */
/* Procedural canvas textures                                             */
/* ---------------------------------------------------------------------- */

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
  // stains
  for (let i = 0; i < 8; i++) {
    g.fillStyle = `rgba(155,150,138,${0.03 + Math.random() * 0.04})`;
    g.beginPath();
    g.ellipse(Math.random() * w, Math.random() * h, 18 + Math.random() * 34, 12 + Math.random() * 26, Math.random() * 3, 0, 7);
    g.fill();
  }
  // expansion joints
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
    // grain
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
  // center rib
  g.fillStyle = '#6d8a48';
  g.fillRect(w / 2 - 3, 0, 6, h);
  // leaflets: dense stripes with slim gaps
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

/* ---------------------------------------------------------------------- */
/* Materials                                                              */
/* ---------------------------------------------------------------------- */

const mat = {
  white: new THREE.MeshStandardMaterial({ color: COL.white, map: stuccoTex, roughness: 0.88, metalness: 0.0 }),
  whiteDim: new THREE.MeshStandardMaterial({ color: COL.whiteDim, roughness: 0.92 }),
  tan: new THREE.MeshStandardMaterial({ color: COL.tan, map: stuccoTex, roughness: 0.88, metalness: 0.0 }),
  tanDark: new THREE.MeshStandardMaterial({ color: COL.tanDark, roughness: 0.9 }),
  tanDeep: new THREE.MeshStandardMaterial({ color: COL.tanDeep, roughness: 0.95 }),
  interior: new THREE.MeshStandardMaterial({ color: COL.interior, roughness: 1.0 }),
  rail: new THREE.MeshStandardMaterial({ color: COL.rail, roughness: 0.38, metalness: 0.7 }),
  bronze: new THREE.MeshStandardMaterial({ color: COL.bronze, roughness: 0.45, metalness: 0.65 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: COL.glass, roughness: 0.1, metalness: 0.25,
    envMap: envTex, envMapIntensity: 1.7, reflectivity: 0.9,
  }),
  curtain: new THREE.MeshStandardMaterial({ color: COL.curtain, map: curtainTex, roughness: 0.95, side: THREE.DoubleSide }),
  glow: new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0 }),
  glowDim: new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0 }),
  concrete: new THREE.MeshStandardMaterial({ color: COL.concrete, map: concreteTex, roughness: 0.95 }),
  paver: new THREE.MeshStandardMaterial({ color: COL.paver, map: paverTex, roughness: 0.92 }),
  travertine: new THREE.MeshStandardMaterial({ color: COL.travertine, map: travTex, roughness: 0.9 }),
  plank: new THREE.MeshStandardMaterial({ color: 0xd9d2c4, map: plankTex, roughness: 0.85 }),
  curb: new THREE.MeshStandardMaterial({ color: COL.curb, roughness: 0.75 }),
  poolWater: new THREE.MeshPhysicalMaterial({
    color: COL.poolWater, map: waterTex, roughness: 0.08, metalness: 0.0,
    transparent: true, opacity: 0.88, envMap: envTex, envMapIntensity: 1.1,
  }),
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
  obj.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return obj;
}

/* ---------------------------------------------------------------------- */
/* Geometry helpers                                                       */
/* ---------------------------------------------------------------------- */

function box(w, h, d, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}

function pushQuad(pos, p0, p1, p2, p3, dir) {
  const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1), c = new THREE.Vector3(...p2);
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, b));
  if (n.dot(new THREE.Vector3(...dir)) < 0) { const t = p1; p1 = p3; p3 = t; }
  pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
}

// wedge whose top edge slopes along X, flat bottom
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

// wedge whose top edge slopes along Z, flat bottom
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

// black horizontal-bar railing (front plane only), centered on X
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

// dark glass slider with bronze frame, optional curtain + night glow
const glowPlanes = [];
function glassSlider(w, h, panels = 3, curtainChance = 0.75) {
  const g = new THREE.Group();
  const glass = box(w, h, 0.05, mat.glass);
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
  // glow plane for night (in front of the dark glass, behind frame faces;
  // ~60% of windows read "lit", the rest stay dim)
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

/* ---------------------------------------------------------------------- */
/* Building                                                               */
/* ---------------------------------------------------------------------- */

const building = new THREE.Group();
scene.add(building);

// ---- white balcony bay (tan back wall + white boxes) --------------------
function buildWhiteBay(x0, w, terraceTop) {
  const g = new THREE.Group();
  const cx = x0 + w / 2;

  // tan shell
  const shell = box(w, BUILD_H, DEPTH, mat.tan);
  shell.position.set(cx, BUILD_H / 2, -DEPTH / 2);
  g.add(shell);

  // white edge piers
  [x0 + 0.22, x0 + w - 0.22].forEach((px) => {
    const pier = box(0.44, BUILD_H, 0.5, mat.white);
    pier.position.set(px, BUILD_H / 2, 0.05);
    g.add(pier);
  });

  const topBalconyFloor = terraceTop ? 1 : 2;

  // balconies floors 1..topBalconyFloor
  for (let f = 1; f <= topBalconyFloor; f++) {
    const fy = f * FLOOR_H;
    const bw = w - 1.15;
    // slab with deep white fascia
    const slab = box(bw, 0.38, 1.55, mat.white);
    slab.position.set(cx, fy - 0.19 + 0.05, 1.55 / 2);
    g.add(slab);
    // side cheeks
    [-1, 1].forEach((s) => {
      const cheek = box(0.16, 1.12, 1.5, mat.white);
      cheek.position.set(cx + s * (bw / 2 - 0.08), fy + 0.05 + 0.56, 1.5 / 2);
      g.add(cheek);
    });
    // railing between cheeks
    const rail = barRail(bw - 0.4, 1.02, 5);
    rail.position.set(cx, fy + 0.05, 1.55 - 0.1);
    g.add(rail);
    // slider door recessed in tan wall
    const slider = glassSlider(w * 0.66, 2.42, 3);
    slider.position.set(cx, fy + 1.21 + 0.08, 0.04);
    g.add(slider);
  }

  // ground floor patio
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
    // white planter boxes flanking
    [-1, 1].forEach((s) => {
      const planter = box(0.62, 0.5, 0.62, mat.white);
      planter.position.set(cx + s * (w / 2 - 0.75), 0.25, 1.45);
      g.add(planter);
      const bush = box(0.5, 0.35, 0.5, mat.hedge);
      bush.position.set(cx + s * (w / 2 - 0.75), 0.62, 1.45);
      g.add(bush);
    });
    // steps
    for (let s = 0; s < 2; s++) {
      const step = box(1.4, 0.14, 0.34, mat.whiteDim);
      step.position.set(cx, 0.07 + s * 0.14, 2.1 - s * 0.3);
      g.add(step);
    }
  }

  // penthouse terrace on top floor
  if (terraceTop) {
    const fy = 2 * FLOOR_H;
    // plank terrace floor over front half
    const deck = box(w - 0.2, 0.12, 2.9, mat.plank);
    deck.position.set(cx, fy + 0.06, -2.9 / 2 + 0.35);
    g.add(deck);
    // white upstand + rail at front edge
    const upstand = box(w - 0.2, 0.32, 0.18, mat.white);
    upstand.position.set(cx, fy + 0.16, 0.28);
    g.add(upstand);
    const rail = barRail(w - 0.5, 0.95, 4);
    rail.position.set(cx, fy + 0.32, 0.24);
    g.add(rail);
    // tan corner piers holding the roof band
    [-1, 1].forEach((s) => {
      const pier = box(0.42, BUILD_H - fy, 0.42, mat.tan);
      pier.position.set(cx + s * (w / 2 - 0.32), fy + (BUILD_H - fy) / 2, 0.15);
      g.add(pier);
    });
    // set-back penthouse glass wall
    const glassWall = glassSlider(w * 0.72, 2.55, 4, 0.9);
    glassWall.position.set(cx, fy + 1.28 + 0.12, -2.45);
    g.add(glassWall);
    // penthouse side walls
    [-1, 1].forEach((s) => {
      const side = box(0.16, FLOOR_H, 2.6, mat.tan);
      side.position.set(cx + s * (w / 2 - 0.1), fy + FLOOR_H / 2, -1.3);
      g.add(side);
    });
    // flat roof strip over penthouse (rear half)
    const roofStrip = box(w, 0.3, 6.6, mat.white);
    roofStrip.position.set(cx, BUILD_H + 0.15, -DEPTH / 2 - 1.2 + 0.0);
    g.add(roofStrip);
  }

  building.add(g);
  return g;
}

// ---- open stair tower ----------------------------------------------------
function buildTower(x0, w) {
  const g = new THREE.Group();
  const cx = x0 + w / 2;
  const TOW_H = BUILD_H + 1.35;
  const proj = 0.9;         // forward projection
  const voidW = 1.7;
  const pw = (w - voidW) / 2;

  // rear body (stair enclosure)
  const body = box(w, TOW_H, DEPTH - 1.1, mat.tan);
  body.position.set(cx, TOW_H / 2, -(DEPTH - 1.1) / 2 - 1.1);
  g.add(body);

  // front side piers around the void
  [x0 + pw / 2, x0 + w - pw / 2].forEach((px) => {
    const pier = box(pw, TOW_H, 2.0, mat.tan);
    pier.position.set(px, TOW_H / 2, proj - 1.0);
    g.add(pier);
  });
  // header band above void
  const head = box(voidW, 1.0, 2.0, mat.tan);
  head.position.set(cx, TOW_H - 0.5, proj - 1.0);
  g.add(head);

  // void interior — dark back + sides
  const backW = box(voidW, TOW_H - 1.0, 0.12, mat.tanDeep);
  backW.position.set(cx, (TOW_H - 1.0) / 2, -1.05);
  g.add(backW);
  [-1, 1].forEach((s) => {
    const sideW = box(0.1, TOW_H - 1.0, 1.9, mat.tanDeep);
    sideW.position.set(cx + s * (voidW / 2 - 0.05), (TOW_H - 1.0) / 2, proj - 1.0);
    g.add(sideW);
  });

  // stair landings + flights + railings visible in the void
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

  // glow plane for night
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(voidW - 0.2, TOW_H - 1.4), mat.glow);
  glow.position.set(cx, TOW_H / 2 - 0.4, -0.98);
  g.add(glow);
  glowPlanes.push(glow);

  // white header cap
  const cap = box(w + 0.55, 0.55, 2.6, mat.white);
  cap.position.set(cx, TOW_H + 0.275, proj - 1.15);
  g.add(cap);

  building.add(g);
  return g;
}

// ---- end unit with wrapping glass corner ---------------------------------
function buildEndUnit(x0, w) {
  const g = new THREE.Group();
  const cx = x0 + w / 2;
  const x1 = x0 + w;

  // main tan body
  const body = box(w, BUILD_H, DEPTH, mat.tan);
  body.position.set(cx, BUILD_H / 2, -DEPTH / 2);
  g.add(body);

  // ground floor: entry + patio
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

  // 2-story glass wall — front face
  function mullionWall(width, height, isFront) {
    const grp = new THREE.Group();
    const glass = box(width, height, 0.07, mat.glass);
    grp.add(glass);
    const f = 0.09;
    const frame = [
      [0, height / 2, width + f, f],
      [0, -height / 2, width + f, f],
      [-width / 2, 0, f, height],
      [width / 2, 0, f, height],
    ];
    frame.forEach(([fx, fy, fw2, fh2]) => {
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
    // white curtains behind (mostly drawn, like the photos)
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.96, height * 0.96), mat.curtain);
    curtain.position.z = -0.12;
    if (!isFront) curtain.rotation.y = 0;
    grp.add(curtain);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.9, height * 0.9), mat.glowDim);
    glow.position.z = 0.045;
    grp.add(glow);
    glowPlanes.push(glow);
    return grp;
  }

  const frontGlass = mullionWall(w - 1.5, 6.0, true);
  frontGlass.position.set(x0 + 1.5 + (w - 1.5) / 2, FLOOR_H + 3.0, 0.32);
  g.add(frontGlass);

  // wrap: right side face glass
  const sideGlass = mullionWall(3.2, 6.0, false);
  sideGlass.rotation.y = Math.PI / 2;
  sideGlass.position.set(x1 + 0.05, FLOOR_H + 3.0, -1.75);
  g.add(sideGlass);

  // left front strip: tan wall with small windows
  for (let f = 1; f <= 2; f++) {
    const win = glassSlider(0.9, 1.5, 1, 0.4);
    win.position.set(x0 + 0.75, f * FLOOR_H + 1.6, 0.04);
    g.add(win);
  }

  // white spandrel band crossing the glass box at floor level
  const spandrel = box(w - 1.3, 0.42, 0.2, mat.white);
  spandrel.position.set(x0 + 1.5 + (w - 1.5) / 2, FLOOR_H * 2, 0.42);
  g.add(spandrel);

  // small white balcony overlapping the left edge of the glass box (photo 1.36.46)
  const miniSlab = box(1.7, 0.34, 1.1, mat.white);
  miniSlab.position.set(x0 + 2.3, FLOOR_H * 2 - 0.05, 0.55 + 0.55);
  g.add(miniSlab);
  const miniRail = barRail(1.5, 0.98, 4);
  miniRail.position.set(x0 + 2.3, FLOOR_H * 2 + 0.12, 1.55);
  g.add(miniRail);

  // floating white roof plate with rooftop rail
  const plate = box(w + 1.1, 0.42, 6.4, mat.white);
  plate.position.set(cx + 0.15, BUILD_H + 0.21 + 0.12, -6.4 / 2 + 1.15);
  g.add(plate);
  // plank roof deck + railing on the plate
  const roofDeck = box(w + 0.7, 0.06, 6.0, mat.plank);
  roofDeck.position.set(cx + 0.15, BUILD_H + 0.45 + 0.03, -6.0 / 2 + 1.0);
  g.add(roofDeck);
  const roofRailF = barRail(w + 0.9, 0.95, 4);
  roofRailF.position.set(cx + 0.15, BUILD_H + 0.48, 1.05);
  g.add(roofRailF);
  const roofRailR = barRail(6.2, 0.95, 4);
  roofRailR.rotation.y = -Math.PI / 2;
  roofRailR.position.set(x1 + 0.68, BUILD_H + 0.48, -6.4 / 2 + 1.15);
  g.add(roofRailR);

  // rear parapet
  const rear = box(w, 0.5, DEPTH - 5.4, mat.tan);
  rear.position.set(cx, BUILD_H + 0.25, -(DEPTH - 5.4) / 2 - 5.4);
  g.add(rear);

  building.add(g);
  return g;
}

// assemble segments
SEGS.forEach((s) => {
  if (s.type === 'white') buildWhiteBay(s.x0, s.w, false);
  else if (s.type === 'terrace') buildWhiteBay(s.x0, s.w, true);
  else if (s.type === 'tower') buildTower(s.x0, s.w);
  else if (s.type === 'end') buildEndUnit(s.x0, s.w);
});

/* ---- roof: flat slab + cornice + peaked split parapet ------------------ */

const roofG = new THREE.Group();

// flat roof slab (up to terrace bay; end unit has its own plate)
const roofSlab = box(22.4, 0.26, DEPTH + 0.2, mat.white);
roofSlab.position.set(11.1, BUILD_H + 0.13, -DEPTH / 2);
roofG.add(roofSlab);

// projecting cornice band along the front (stops before terrace bay)
const cornice = box(22.8, 0.34, 0.62, mat.white);
cornice.position.set(11.1, BUILD_H - 0.02, 0.24);
roofG.add(cornice);

// left return cornice
const corniceL = box(0.34, 0.34, DEPTH, mat.white);
corniceL.position.set(-0.12, BUILD_H - 0.02, -DEPTH / 2);
roofG.add(corniceL);

// peaked parapet — two wedges with a slot at the peak
const parY = BUILD_H + 0.15;
const leftWedge = new THREE.Mesh(wedgeX(-0.35, PEAK_X - SLOT_W / 2, parY, parY + 0.9, parY + 2.0, 0.0, 0.32), mat.white);
roofG.add(leftWedge);
const rightWedge = new THREE.Mesh(wedgeX(PEAK_X + SLOT_W / 2, 22.25, parY, parY + 2.0, parY + 0.5, 0.0, 0.32), mat.white);
roofG.add(rightWedge);

// left side return parapet, sloping down toward the back
const sideWedge = new THREE.Mesh(wedgeZ(0.0, -DEPTH, parY, parY + 0.9, parY + 0.4, -0.35, -0.03), mat.white);
roofG.add(sideWedge);

// back parapet band
const backBand = box(22.4, 0.6, 0.3, mat.white);
backBand.position.set(11.1, parY + 0.3, -DEPTH + 0.15);
roofG.add(backBand);

building.add(roofG);

/* ---- back facade simple treatment -------------------------------------- */

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

/* ---- white left-end return (as in photo 1.34.33) ------------------------ */
{
  const endPanel = box(1.5, BUILD_H, 0.62, mat.white);
  endPanel.position.set(0.55, BUILD_H / 2, 0.08);
  building.add(endPanel);
  const sideSkin = box(0.12, BUILD_H, DEPTH, mat.white);
  sideSkin.position.set(-0.05, BUILD_H / 2, -DEPTH / 2);
  building.add(sideSkin);
}

/* ---- left end wall windows --------------------------------------------- */
for (let f = 1; f < 3; f++) {
  const win = glassSlider(1.4, 1.4, 2, 0.5);
  win.rotation.y = Math.PI / 2;
  win.position.set(-0.04, f * FLOOR_H + 1.7, -3.0);
  building.add(win);
}

tagShadow(building);

/* ---------------------------------------------------------------------- */
/* Site — ground, court, walls, gates                                     */
/* ---------------------------------------------------------------------- */

const site = new THREE.Group();
scene.add(site);

// base terrain (dirt/scrub everywhere outside)
const terrain = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), mat.soil);
terrain.rotation.x = -Math.PI / 2;
terrain.position.y = -0.02;
terrain.receiveShadow = true;
site.add(terrain);

// concrete parking court
const court = box(51.5, 0.12, 22.6, mat.concrete);
court.position.set(11.75, 0.06, 13.9);
court.receiveShadow = true;
site.add(court);

// paver walkway along facade
const walkway = box(34, 0.16, 2.0, mat.paver);
walkway.position.set(15.2, 0.08, 1.75);
site.add(walkway);

// red curb
const curb = box(34, 0.18, 0.22, mat.curb);
curb.position.set(15.2, 0.09, 2.86);
site.add(curb);

// planting soil strip
const bed = box(32.6, 0.2, 0.8, mat.soilDark);
bed.position.set(15.2, 0.1, 1.15);
site.add(bed);

/* ---- perimeter walls + gates ---- */

const WALL_Z = 25.2;
function wallRun(x0, x1, h = 2.5, z = WALL_Z, thick = 0.25) {
  const wl = box(x1 - x0, h, thick, mat.wall);
  wl.position.set((x0 + x1) / 2, h / 2, z);
  site.add(wl);
  return wl;
}

// street wall: left solid (pool court backdrop), bar-fence section, gate, right solid
wallRun(-14, -4.5, 2.8);
// bar fence on low wall
{
  const lowWall = box(22, 0.7, 0.25, mat.wall);
  lowWall.position.set(6.5, 0.35, WALL_Z);
  site.add(lowWall);
  const fence = new THREE.Group();
  for (let x = -4.4; x <= 17.4; x += 0.34) {
    if (fence.children.length > 200) break;
    const b = box(0.05, 1.8, 0.05, mat.rail);
    b.position.set(x, 1.6, WALL_Z);
    fence.add(b);
  }
  const railTop = box(22, 0.08, 0.08, mat.rail);
  railTop.position.set(6.5, 2.5, WALL_Z);
  fence.add(railTop);
  const railMid = box(22, 0.07, 0.07, mat.rail);
  railMid.position.set(6.5, 0.78, WALL_Z);
  fence.add(railMid);
  site.add(fence);
}
wallRun(25.9, 38, 2.5);

// main corrugated sliding gate + white header
{
  const gx0 = 17.6, gx1 = 25.9;
  [gx0 - 0.25, gx1 + 0.25].forEach((px) => {
    const post = box(0.55, 3.4, 0.55, mat.wall);
    post.position.set(px, 1.7, WALL_Z);
    site.add(post);
  });
  const header = box(gx1 - gx0 + 2.1, 0.95, 0.6, mat.wall);
  header.position.set((gx0 + gx1) / 2, 3.35, WALL_Z);
  site.add(header);
  const panel = box(gx1 - gx0 - 0.3, 2.45, 0.1, mat.corrug);
  panel.position.set((gx0 + gx1) / 2, 1.32, WALL_Z);
  site.add(panel);
  const pf = box(gx1 - gx0 - 0.2, 0.1, 0.14, mat.rail);
  pf.position.set((gx0 + gx1) / 2, 2.5, WALL_Z);
  site.add(pf);
  const pfB = pf.clone(); pfB.position.y = 0.12; site.add(pfB);
  for (let i = 0; i < 3; i++) {
    const v = box(0.09, 2.45, 0.13, mat.rail);
    v.position.set(gx0 + 1.9 + i * 2.7, 1.32, WALL_Z);
    site.add(v);
  }
}

// side + back walls (back wall sits behind the 12.2 m deep slab)
{
  const sideR = box(0.25, 2.5, 39, mat.wall);
  sideR.position.set(38, 1.25, WALL_Z - 19.5);
  site.add(sideR);
  const sideL = box(0.25, 2.8, 39, mat.wall);
  sideL.position.set(-14, 1.4, WALL_Z - 19.5);
  site.add(sideL);
  const back = box(52, 2.5, 0.25, mat.wall);
  back.position.set(12, 1.25, -13.6);
  site.add(back);
}

/* ---- pool courtyard ---- */

const poolCourt = new THREE.Group();
site.add(poolCourt);

// travertine deck
const deck = box(12.6, 0.16, 11.6, mat.travertine);
deck.position.set(-7.2, 0.1, 19.3);
deck.receiveShadow = true;
poolCourt.add(deck);

// low planter walls edging the pool court (open view to the building, like the photos)
{
  const wA = box(0.22, 0.65, 8.2, mat.wall);
  wA.position.set(-0.9, 0.33, 21.0);
  poolCourt.add(wA);
  const wB = box(9.0, 0.65, 0.22, mat.wall);
  wB.position.set(-9.4, 0.33, 13.55);
  poolCourt.add(wB);
}

// cabana/storage row along street side of pool court: brown doors
{
  const back = box(11.5, 2.9, 0.3, mat.wall);
  back.position.set(-7.5, 1.45, 24.85);
  poolCourt.add(back);
  for (let i = 0; i < 4; i++) {
    const d = box(1.5, 2.2, 0.1, mat.doorBrown);
    d.position.set(-11.2 + i * 2.4, 1.1, 24.62);
    poolCourt.add(d);
  }
  const canopy = box(11.5, 0.22, 1.3, mat.wall);
  canopy.position.set(-7.5, 2.85, 24.2);
  poolCourt.add(canopy);
}

// garage block on the far left (gray roller door)
{
  const gar = box(3.2, 3.0, 7.5, mat.wall);
  gar.position.set(-12.3, 1.5, 17.5);
  poolCourt.add(gar);
  const roller = box(0.1, 2.3, 4.6, mat.corrug);
  roller.position.set(-10.65, 1.15, 17.5);
  poolCourt.add(roller);
}

// pool with angled corner + steps — sized per Planta Baja (~5.0 × 3.5 m)
{
  const px = -9.8, pz = 15.1; // pool origin (min x, min z)
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(5.0, 0);
  shape.lineTo(5.0, 3.5);
  shape.lineTo(1.2, 3.5);
  shape.lineTo(0, 2.3);
  shape.lineTo(0, 0);

  // shell (light blue walls illusion): extruded rim slightly below deck
  const shellGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false });
  const shell = new THREE.Mesh(shellGeo, mat.poolShell);
  shell.rotation.x = Math.PI / 2;
  shell.position.set(px, 0.14, pz);
  poolCourt.add(shell);

  // water surface (sits just above the deck slab so it reads from all angles)
  const waterGeo = new THREE.ShapeGeometry(shape);
  const water = new THREE.Mesh(waterGeo, mat.poolWater);
  water.rotation.x = -Math.PI / 2;
  water.position.set(px, 0.19, pz + 3.5);
  poolCourt.add(water);

  // steps at the angled corner
  for (let s = 0; s < 3; s++) {
    const st = box(1.1 - s * 0.3, 0.1, 1.1 - s * 0.3, mat.travertine);
    st.position.set(px + 0.75, 0.17 - s * 0.06, pz + 2.7);
    poolCourt.add(st);
  }
  // coping ring (thin white border via slightly larger outline)
  const copShape = new THREE.Shape();
  copShape.moveTo(-0.3, -0.3);
  copShape.lineTo(5.3, -0.3);
  copShape.lineTo(5.3, 3.8);
  copShape.lineTo(1.32, 3.8);
  copShape.lineTo(-0.3, 2.42);
  copShape.lineTo(-0.3, -0.3);
  copShape.holes.push(new THREE.Path([
    new THREE.Vector2(0, 0), new THREE.Vector2(5.0, 0), new THREE.Vector2(5.0, 3.5),
    new THREE.Vector2(1.2, 3.5), new THREE.Vector2(0, 2.3),
  ]));
  const cop = new THREE.Mesh(new THREE.ShapeGeometry(copShape), mat.white);
  cop.rotation.x = -Math.PI / 2;
  cop.position.set(px, 0.2, pz + 3.5);
  poolCourt.add(cop);
}

// 10 painted parking stalls per Planta Baja: 5 center row + 5 along the right wall
{
  const stripe = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.9 });
  // center row (stalls 1–5), noses toward the facade walkway
  for (let i = 0; i <= 5; i++) {
    const s = box(0.1, 0.025, 5.0, stripe);
    s.position.set(5.2 + i * 2.55, 0.13, 8.6);
    site.add(s);
  }
  const stop1 = box(5 * 2.55, 0.025, 0.1, stripe);
  stop1.position.set(5.2 + 2.5 * 2.55, 0.13, 6.1);
  site.add(stop1);
  // right column (stalls 6–10) along the east wall
  for (let i = 0; i <= 5; i++) {
    const s = box(4.6, 0.025, 0.1, stripe);
    s.position.set(35.4, 0.13, 5.4 + i * 2.55);
    site.add(s);
  }
}

// planter island with royal palms
{
  const island = box(4.2, 0.42, 2.4, mat.white);
  island.position.set(-5.2, 0.21, 21.6);
  poolCourt.add(island);
  const soil = box(3.9, 0.1, 2.1, mat.soilDark);
  soil.position.set(-5.2, 0.44, 21.6);
  poolCourt.add(soil);
}

tagShadow(site);

/* ---------------------------------------------------------------------- */
/* Street, field, houses, power lines, ocean                              */
/* ---------------------------------------------------------------------- */

const context = new THREE.Group();
scene.add(context);

// asphalt road
const road = box(110, 0.06, 5.4, mat.asphalt);
road.position.set(10, 0.03, 28.6);
road.receiveShadow = true;
context.add(road);
// center dashes
for (let x = -40; x < 60; x += 4) {
  const dash = box(1.6, 0.07, 0.14, new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.9 }));
  dash.position.set(x, 0.035, 28.6);
  context.add(dash);
}

// grass field between road and beach
const field = new THREE.Mesh(new THREE.PlaneGeometry(200, 58), mat.grass);
field.rotation.x = -Math.PI / 2;
field.position.set(10, 0.0, 60.5);
field.receiveShadow = true;
context.add(field);

// dirt track through the field to the beach
const track = box(3.2, 0.02, 56, mat.soil);
track.position.set(2, 0.02, 59);
context.add(track);

// beach sand strip
const sand = box(220, 0.03, 6, mat.sand);
sand.position.set(10, 0.015, 91);
context.add(sand);

// ocean
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(500, 320), mat.ocean);
ocean.rotation.x = -Math.PI / 2;
ocean.position.set(10, 0.0, 94 + 160);
context.add(ocean);

// surf stripes
const surfMats = [];
for (let i = 0; i < 3; i++) {
  const sm = new THREE.MeshBasicMaterial({ map: surfTex.clone(), transparent: true, opacity: 0.75 - i * 0.2, depthWrite: false });
  sm.map.repeat.set(6 + i, 1);
  sm.map.needsUpdate = true;
  surfMats.push(sm);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(240, 1.6 + i * 1.2), sm);
  stripe.rotation.x = -Math.PI / 2;
  stripe.position.set(10, 0.05, 94.5 + i * 2.6);
  context.add(stripe);
}

// small distant houses
const housesData = [
  [-18, 42, 5, 3.2, 4, 'A'], [4, 47, 4, 2.8, 3.6, 'B'], [26, 43, 6, 3.0, 4.5, 'A'],
  [46, 50, 4.5, 2.6, 4, 'B'], [-38, 48, 5, 3.0, 4, 'B'],
];
housesData.forEach(([hx, hz, hw, hh, hd, kind]) => {
  const h = box(hw, hh, hd, kind === 'A' ? mat.houseA : mat.houseB);
  h.position.set(hx, hh / 2, hz);
  context.add(h);
  const r = box(hw + 0.5, 0.25, hd + 0.5, mat.houseRoof);
  r.position.set(hx, hh + 0.12, hz);
  context.add(r);
});

// power poles + sagging wires along the road
const polesX = [-32, -12, 8, 28, 48];
polesX.forEach((px) => {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 9.5, 8), mat.pole);
  pole.position.set(px, 4.75, 31.6);
  pole.castShadow = true;
  context.add(pole);
  const cross = box(1.6, 0.09, 0.09, mat.pole);
  cross.position.set(px, 8.6, 31.6);
  context.add(cross);
});
const wireMat = new THREE.LineBasicMaterial({ color: 0x222222 });
for (let i = 0; i < polesX.length - 1; i++) {
  for (let k = -1; k <= 1; k++) {
    const a = new THREE.Vector3(polesX[i] + k * 0.7, 8.55, 31.6);
    const b = new THREE.Vector3(polesX[i + 1] + k * 0.7, 8.55, 31.6);
    const mid = a.clone().lerp(b, 0.5); mid.y -= 0.55;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(16));
    context.add(new THREE.Line(geo, wireMat));
  }
}
tagShadow(context);

/* ---------------------------------------------------------------------- */
/* Vegetation                                                             */
/* ---------------------------------------------------------------------- */

// arching frond built as a folded ribbon: rises from the crown, arcs over,
// droops at the tip (like a real coconut/royal palm frond)
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
  // crownshaft (smooth green sleeve — signature of royal palms)
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
    // vary elevation: some fronds near-horizontal, lower ring droops more
    frond.rotation.z = (i % 3 === 0 ? 0.28 : 0.05) - Math.random() * 0.5;
    frond.castShadow = true;
    crown.add(frond);
  }
  // young upright spears at the very top
  for (let i = 0; i < 3; i++) {
    const spear = buildFrond(1.5 + Math.random() * 0.6);
    spear.rotation.y = Math.random() * Math.PI * 2;
    spear.rotation.z = 0.9 + Math.random() * 0.3;
    crown.add(spear);
  }
  g.add(crown);
  return g;
}

const palms = [
  // facade palms (areca/coconut pairs near the building)
  { p: [5.3, 0, 3.6], h: 6.2, royal: false },
  { p: [6.5, 0, 4.3], h: 5.4, royal: false },
  { p: [13.4, 0, 3.5], h: 6.8, royal: false },
  { p: [19.9, 0, 3.9], h: 6.4, royal: false },
  { p: [21.2, 0, 4.4], h: 5.6, royal: false },
  { p: [27.2, 0, 3.5], h: 6.9, royal: false },
  { p: [28.4, 0, 4.2], h: 5.8, royal: false },
  { p: [0.6, 0, 4.1], h: 6.4, royal: false },
  // pool island royal palms
  { p: [-6.1, 0.5, 21.4], h: 7.6, royal: true },
  { p: [-4.4, 0.5, 21.8], h: 6.7, royal: true },
  // field / distant
  { p: [-20, 0, 36], h: 6.5, royal: false },
  { p: [30, 0, 35], h: 7.2, royal: false },
  { p: [-2, 0, 44], h: 5.4, royal: false },
];
palms.forEach(({ p, h, royal }) => {
  const palm = buildPalm(h, royal);
  palm.position.set(...p);
  palm.rotation.y = Math.random() * Math.PI * 2;
  scene.add(palm);
});

// shrubs: instanced green + red-flower blobs
{
  const blobGeo = new THREE.IcosahedronGeometry(0.32, 1);
  const greens = new THREE.InstancedMesh(blobGeo, mat.hedge, 160);
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
    }
    else if (pick < 0.5 && di < 90) darks.setMatrixAt(di++, dummy.matrix);
    else if (gi < 160) greens.setMatrixAt(gi++, dummy.matrix);
  }

  // facade hedge strip
  for (let i = 0; i < 90; i++) {
    placeBlob(-0.5 + Math.random() * 32, 0.32 + Math.random() * 0.15, 1.0 + Math.random() * 0.7, 0.7 + Math.random() * 0.5);
  }
  // pool court planting
  for (let i = 0; i < 40; i++) {
    placeBlob(-5.2 + (Math.random() - 0.5) * 3.6, 0.6, 21.6 + (Math.random() - 0.5) * 1.6, 0.6 + Math.random() * 0.4);
  }
  for (let i = 0; i < 30; i++) {
    placeBlob(-10.5 + Math.random() * 8, 0.3, 13.9 + Math.random() * 0.7, 0.5 + Math.random() * 0.5);
  }
  // field scrub
  for (let i = 0; i < 60; i++) {
    placeBlob(-60 + Math.random() * 140, 0.25, 34 + Math.random() * 52, 0.8 + Math.random() * 1.4);
  }
  greens.count = gi; darks.count = di; reds.count = ri;
  greens.castShadow = darks.castShadow = reds.castShadow = true;
  scene.add(greens, darks, reds);
}

/* ---------------------------------------------------------------------- */
/* Camera views                                                            */
/* ---------------------------------------------------------------------- */

const VIEWS = {
  street: { pos: [-2, 1.8, 21], target: [14, 4.5, 0] },
  front: { pos: [15.6, 4.6, 27], target: [15.6, 4.6, 0] },
  corner: { pos: [40, 3.2, 15], target: [27, 5.5, 0] },
  pool: { pos: [-12.4, 1.8, 22.3], target: [6, 3.2, 3] },
  terrace: { pos: [23.0, 7.9, -1.4], target: [21, 4.2, 30] },
  aerial: { pos: [17, 42, 34], target: [12, 0, 10] },
  orbit: { pos: [40, 16, 44], target: [15, 5, 4] },
};

let animT = null;
function flyTo(name) {
  const v = VIEWS[name];
  if (!v) return;
  if (walk.on) toggleWalk(false);
  animT = {
    t: 0, dur: 1.2,
    fromPos: camera.position.clone(), toPos: new THREE.Vector3(...v.pos),
    fromTarget: controls.target.clone(), toTarget: new THREE.Vector3(...v.target),
  };
  document.querySelectorAll('#views .viewbtn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}
document.querySelectorAll('#views .viewbtn').forEach((btn) => {
  btn.addEventListener('click', () => flyTo(btn.dataset.view));
});

/* ---------------------------------------------------------------------- */
/* Lighting presets                                                        */
/* ---------------------------------------------------------------------- */

const LIGHT_PRESETS = {
  overcast: { sunPos: [10, 55, 20], sunColor: 0xeef2f5, sunI: 0.8, hemiI: 0.95, exposure: 1.0, sky: [0xb4c3ce, 0xe7edf0], fog: 0xdbe3e8, glow: 0, night: 0 },
  midday: { sunPos: [38, 52, 34], sunColor: 0xfff3df, sunI: 1.6, hemiI: 0.65, exposure: 1.05, sky: [0x7fb2dc, 0xdcedf5], fog: 0xdfeaf2, glow: 0, night: 0 },
  sunset: { sunPos: [-38, 13, 55], sunColor: 0xffa552, sunI: 1.35, hemiI: 0.4, exposure: 1.12, sky: [0xff9d5c, 0xffe3c2], fog: 0xffcfa0, glow: 0.35, night: 0 },
  night: { sunPos: [-25, 35, -15], sunColor: 0x9db8dd, sunI: 0.14, hemiI: 0.12, exposure: 0.95, sky: [0x0c1a2c, 0x1d3147], fog: 0x121f2d, glow: 0.9, night: 1 },
};

function applyLight(name) {
  const p = LIGHT_PRESETS[name];
  if (!p) return;
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
  document.querySelectorAll('#lighting .viewbtn').forEach((b) => b.classList.toggle('active', b.dataset.light === name));
}
document.querySelectorAll('#lighting .viewbtn').forEach((btn) => {
  btn.addEventListener('click', () => applyLight(btn.dataset.light));
});
applyLight('midday');
document.querySelector('[data-view="orbit"]').classList.add('active');

/* ---------------------------------------------------------------------- */
/* Extras: auto-orbit, walk mode, labels                                   */
/* ---------------------------------------------------------------------- */

const btnAuto = document.getElementById('btn-autorbit');
const btnWalk = document.getElementById('btn-walk');
const btnLabels = document.getElementById('btn-labels');
const hint = document.getElementById('hint');
const HINT_ORBIT = 'Drag to orbit · Scroll to zoom · Right-drag to pan';
const HINT_WALK = 'WALK MODE — WASD / arrows to move · drag to look · Esc to exit';

btnAuto.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  controls.autoRotateSpeed = 0.9;
  btnAuto.classList.toggle('active', controls.autoRotate);
  if (controls.autoRotate && walk.on) toggleWalk(false);
});

/* ---- walk mode ---- */
const walk = {
  on: false, yaw: 0, pitch: 0,
  keys: {}, dragging: false, lastX: 0, lastY: 0,
  savedPos: null, savedTarget: null,
};

function toggleWalk(state) {
  walk.on = state === undefined ? !walk.on : state;
  btnWalk.classList.toggle('active', walk.on);
  if (walk.on) {
    controls.autoRotate = false;
    btnAuto.classList.remove('active');
    walk.savedPos = camera.position.clone();
    walk.savedTarget = controls.target.clone();
    controls.enabled = false;
    camera.position.set(14, 1.7, 15);
    walk.yaw = 0;   // face the building (-z)
    walk.pitch = 0.02;
    hint.textContent = HINT_WALK;
    animT = null;
  } else {
    controls.enabled = true;
    if (walk.savedPos) {
      camera.position.copy(walk.savedPos);
      controls.target.copy(walk.savedTarget);
    }
    hint.textContent = HINT_ORBIT;
  }
}
btnWalk.addEventListener('click', () => toggleWalk());

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && walk.on) toggleWalk(false);
  walk.keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => { walk.keys[e.key.toLowerCase()] = false; });

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!walk.on) return;
  walk.dragging = true; walk.lastX = e.clientX; walk.lastY = e.clientY;
});
window.addEventListener('pointermove', (e) => {
  if (!walk.on || !walk.dragging) return;
  walk.yaw -= (e.clientX - walk.lastX) * 0.0032;
  walk.pitch -= (e.clientY - walk.lastY) * 0.0028;
  walk.pitch = THREE.MathUtils.clamp(walk.pitch, -1.2, 1.2);
  walk.lastX = e.clientX; walk.lastY = e.clientY;
});
window.addEventListener('pointerup', () => { walk.dragging = false; });

function updateWalk(dt) {
  camera.rotation.set(walk.pitch, walk.yaw, 0);
  const speed = 5.2 * dt;
  const fwd = new THREE.Vector3(-Math.sin(walk.yaw), 0, -Math.cos(walk.yaw));
  const rightV = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const k = walk.keys;
  if (k['w'] || k['arrowup']) camera.position.addScaledVector(fwd, speed);
  if (k['s'] || k['arrowdown']) camera.position.addScaledVector(fwd, -speed);
  if (k['a'] || k['arrowleft']) camera.position.addScaledVector(rightV, -speed);
  if (k['d'] || k['arrowright']) camera.position.addScaledVector(rightV, speed);
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -13, 37);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -13, 24.5);
  camera.position.y = 1.7;
}

/* ---- labels ---- */
const LABELS = [
  { name: 'Stair Tower', pos: new THREE.Vector3(9.3, 11.4, 0.6) },
  { name: '302 Private Terrace', pos: new THREE.Vector3(23.6, 8.0, 0.6) },
  { name: 'Corner Glass Unit', pos: new THREE.Vector3(27.6, 8.2, 1.0) },
  { name: 'Pool Courtyard', pos: new THREE.Vector3(-7.2, 2.2, 17.0) },
  { name: 'Main Gate', pos: new THREE.Vector3(21.7, 4.4, 25.2) },
];
const labelLayer = document.getElementById('labels');
let labelsOn = false;
const labelEls = LABELS.map((l) => {
  const el = document.createElement('div');
  el.className = 'label3d';
  el.textContent = l.name;
  labelLayer.appendChild(el);
  return el;
});
btnLabels.addEventListener('click', () => {
  labelsOn = !labelsOn;
  btnLabels.classList.toggle('active', labelsOn);
  labelLayer.style.display = labelsOn ? 'block' : 'none';
});

const projV = new THREE.Vector3();
function updateLabels() {
  if (!labelsOn) return;
  LABELS.forEach((l, i) => {
    projV.copy(l.pos).project(camera);
    const el = labelEls[i];
    if (projV.z > 1 || projV.z < -1) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.style.left = `${(projV.x * 0.5 + 0.5) * window.innerWidth}px`;
    el.style.top = `${(-projV.y * 0.5 + 0.5) * window.innerHeight}px`;
  });
}

/* ---------------------------------------------------------------------- */
/* Render loop                                                             */
/* ---------------------------------------------------------------------- */

const clock = new THREE.Clock();
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (animT) {
    animT.t += dt / animT.dur;
    const k = easeInOutCubic(Math.min(animT.t, 1));
    camera.position.lerpVectors(animT.fromPos, animT.toPos, k);
    controls.target.lerpVectors(animT.fromTarget, animT.toTarget, k);
    if (animT.t >= 1) animT = null;
  }

  // animated water + surf
  waterTex.offset.x += dt * 0.015;
  waterTex.offset.y += dt * 0.008;
  surfMats.forEach((sm, i) => { sm.map.offset.x += dt * (0.004 + i * 0.003); });

  if (walk.on) updateWalk(dt);
  else controls.update();

  updateLabels();
  renderer.render(scene, camera);
}
animate();

// Hide spinner once first frame is on screen (and notify failsafe)
requestAnimationFrame(() => {
  renderer.render(scene, camera);
  setTimeout(signalReady, 200);
});

/* ---------------------------------------------------------------------- */
/* Units mode — real inventory volumes (data from ../js/inventory.js,      */
/* available when served from the repo root via start-3d.bat)              */
/* ---------------------------------------------------------------------- */

const INV = window.CC_INVENTORY || null;
const unitsBtn = document.getElementById('btn-units');
const unitCard = document.getElementById('unit-card');
let unitsOn = true; // on by default so unit size/status are visible without hunting for the toggle
if (INV && INV.building && unitsBtn && unitCard) {
  unitsBtn.hidden = false;
  unitsBtn.classList.add('active');
  const BINFO = INV.building;
  const STATUS_COL = { available: 0x2f8f8a, conditional: 0xc9714f, sold: 0x9a948a };
  const STATUS_TXT = { available: 'Available', conditional: 'Conditionally sold', sold: 'Sold' };
  const unitVols = [];
  const unitGroup = new THREE.Group();
  unitGroup.visible = true;
  scene.add(unitGroup);

  INV.units.forEach((u) => {
    const span = BINFO.unitSpans[u.id];
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
        depthTest: false, // read through the facade
      })
    );
    m.renderOrder = 20;
    m.position.set((span[0] + span[1]) / 2, (u.floor - 1) * FLOOR_H + FLOOR_H / 2 + 0.1, -DEPTH / 2);
    m.userData.unit = u;
    unitGroup.add(m);
    unitVols.push(m);
  });

  const uRay = new THREE.Raycaster();
  const uPtr = new THREE.Vector2();
  let hovered = null;

  function pickUnit(e) {
    const r = renderer.domElement.getBoundingClientRect();
    uPtr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    uPtr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    uRay.setFromCamera(uPtr, camera);
    const hit = uRay.intersectObjects(unitVols)[0];
    return hit ? hit.object : null;
  }

  function showCard(u) {
    document.getElementById('uc-id').textContent = 'Unit ' + u.id;
    document.getElementById('uc-type').textContent = `${u.beds} bedroom · ${u.baths} bath · Floor ${u.floor}`;
    document.getElementById('uc-areas').textContent =
      `${u.areaM2.toFixed(2)} m² interior + ${u.terraceM2.toFixed(2)} m² terrace`;
    const priceEl = document.getElementById('uc-price');
    priceEl.textContent = u.status === 'available' ? `From $${u.price.toLocaleString('en-US')}` : '';
    priceEl.hidden = u.status !== 'available';
    const st = document.getElementById('uc-status');
    st.textContent = STATUS_TXT[u.status] || u.status;
    st.className = u.status;
    unitCard.hidden = false;
  }

  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!unitsOn) return;
    const m = pickUnit(e);
    if (m === hovered) return;
    if (hovered) hovered.material.opacity = 0.3;
    hovered = m;
    if (m) {
      m.material.opacity = 0.55;
      showCard(m.userData.unit);
      renderer.domElement.style.cursor = 'pointer';
    } else {
      renderer.domElement.style.cursor = '';
    }
  });
  renderer.domElement.addEventListener('click', (e) => {
    if (!unitsOn) return;
    const m = pickUnit(e);
    if (m) showCard(m.userData.unit);
  });

  unitsBtn.addEventListener('click', () => {
    unitsOn = !unitsOn;
    unitGroup.visible = unitsOn;
    unitsBtn.classList.toggle('active', unitsOn);
    if (!unitsOn) {
      unitCard.hidden = true;
      renderer.domElement.style.cursor = '';
      if (hovered) { hovered.material.opacity = 0.3; hovered = null; }
    }
  });
}

// debug / automation handles
window.__app = { camera, controls, flyTo, applyLight, toggleWalk, scene, VIEWS, renderer };
// jump instantly to a view and render one frame (used for automated verification)
window.__snap = (name) => {
  const v = VIEWS[name];
  if (!v) return 'no view';
  animT = null;
  camera.position.set(...v.pos);
  controls.target.set(...v.target);
  controls.update();
  renderer.render(scene, camera);
  return 'snapped ' + name;
};
window.addEventListener('error', (e) => console.error('[app-error]', e.message, e.filename, e.lineno));
