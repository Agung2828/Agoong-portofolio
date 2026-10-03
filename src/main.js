import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { openPanel, closePanel } from './panel.js';
import { profile, skills, projects, contact } from './data.js';
import { AudioManager } from './Audiomanager.js';
import { initAudioUI } from './audio-ui.js';
import { createCodeScreen, MONITOR_PRESET, LAPTOP_PRESET } from './screens.js';

// =====================================================================
// 0. PENGECEKAN WEBGL (fallback jika browser tidak mendukung 3D)
// =====================================================================
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

if (!webglAvailable()) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const link = (label, url) => (url && url !== '#' ? `<a href="${esc(url)}">${label}</a>` : '');
  document.body.innerHTML = `
    <main id="fallback">
      <h1>${esc(profile.name)}</h1>
      <p><strong>${esc(profile.role)}</strong> · ${esc(profile.location)}</p>
      <p>${esc(profile.description)}</p>
      <p>Your browser does not support the 3D experience.</p>
      <h2>Skills</h2>
      <p>${skills.map((s) => `${esc(s.category)}: ${s.items.map(esc).join(', ')}`).join('<br>')}</p>
      <h2>Projects</h2>
      <p>${projects.map((p) => `${esc(p.title)} — ${esc(p.description)}`).join('<br>')}</p>
      <h2>Contact</h2>
      <p>${[link('Email', contact.email), link('WhatsApp', contact.whatsapp),
    link('LinkedIn', contact.linkedin), link('GitHub', contact.github)]
      .filter(Boolean).join(' · ')}</p>
    </main>`;
  throw new Error('WebGL tidak tersedia');
}

// Perangkat sentuh / layar kecil dianggap "low-end": detail dikurangi
const LOW_END = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
const Q = LOW_END ? 0.5 : 1; // pengali jumlah partikel / awan
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// =====================================================================
// 1. SCENE, CAMERA, RENDERER
// =====================================================================
const scene = new THREE.Scene();

const BASE_FOV = 35;
const camera = new THREE.PerspectiveCamera(BASE_FOV, innerWidth / innerHeight, 0.1, 300);
camera.position.set(11, 9, 11);

// Layar sempit (HP portrait): FOV dilebarkan supaya diorama tetap muat di lebar layar
function fitCamera() {
  const aspect = innerWidth / innerHeight;
  const REF = 1.5; // rasio layar yang dianggap "pas" dengan FOV dasar
  camera.aspect = aspect;
  camera.fov = aspect >= REF
    ? BASE_FOV
    : Math.min(
      75,
      THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) * (REF / aspect)))
    );
  camera.updateProjectionMatrix();
}

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#scene'),
  antialias: !LOW_END,
  powerPreference: 'high-performance',
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, LOW_END ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
fitCamera();

// Audio
const audio = new AudioManager();
initAudioUI(audio);

// =====================================================================
// 2. CONTROLS
// =====================================================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.8, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 8;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI / 2.2;        // tidak bisa masuk ke bawah lantai
controls.minAzimuthAngle = -0.2;               // batasi rotasi kiri
controls.maxAzimuthAngle = Math.PI / 2 + 0.2;  // batasi rotasi kanan

// =====================================================================
// 3. HELPER
// =====================================================================
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Geometri & material dipakai ulang (hemat memori & draw call)
const geoCache = new Map();
const matCache = new Map();

// Kotak membulat + otomatis membuat/menerima bayangan
function box(w, h, d, color, x = 0, y = 0, z = 0, parent = scene) {
  const radius = Math.min(0.07, Math.min(w, h, d) * 0.5);
  const gk = `${w}|${h}|${d}`;
  let geo = geoCache.get(gk);
  if (!geo) {
    geo = new RoundedBoxGeometry(w, h, d, LOW_END ? 3 : 5, radius);
    geoCache.set(gk, geo);
  }
  let mat = matCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
    matCache.set(color, mat);
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Layar yang "menyala" (emissive = memancarkan warna sendiri)
function glowScreen(w, h, color, x, y, z, parent) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      color: 0x06121f,
      emissive: color,
      emissiveIntensity: 1.2,
    })
  );
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// Angka acak yang hasilnya selalu sama (susunan buku tidak berubah tiap refresh)
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tekstur dari gambar yang digambar lewat <canvas> (tanpa file gambar eksternal)
function makeCanvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Titik cahaya lembut (dipakai kunang-kunang, bulan, halo layar, dll)
function makeGlowTexture() {
  return makeCanvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}
const glowTex = makeGlowTexture();

// Layar berisi tampilan VS Code (tekstur dari screens.js) yang juga memancarkan cahaya
function codeScreenMesh(cs, w, h, x, y, z, parent, intensity = 1.15) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.35,
    map: cs.texture,
    emissive: 0xffffff,
    emissiveMap: cs.texture,
    emissiveIntensity: intensity,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// Halo cahaya di belakang bingkai layar (terlihat menyembul di sekeliling layar)
function haloSprite(color, sx, sy, x, y, z, parent, opacity) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex, color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    })
  );
  s.scale.set(sx, sy, 1);
  s.position.set(x, y, z);
  parent.add(s);
  return s;
}

// Pantulan cahaya layar di permukaan meja
function deskSpill(color, sx, sz, x, z, parent, opacity) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({
      map: glowTex, color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 2.108, z);
  parent.add(m);
  return m;
}

// Tanaman dalam pot. Daunnya dimasukkan ke array `leaves` supaya bisa bergoyang.
const leaves = [];
const leafMatGreen = new THREE.MeshStandardMaterial({ color: 0x4f9d5d, roughness: 0.7 });
const leafGeoUnit = new THREE.SphereGeometry(1, 12, 10);

function makePlant(parent, x, y, z, s = 1, count = 5, potColor = 0xc66b3d) {
  const plant = new THREE.Group();
  plant.position.set(x, y, z);
  plant.scale.setScalar(s);
  parent.add(plant);

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.15, 0.28, 20),
    new THREE.MeshStandardMaterial({ color: potColor, roughness: 0.8 })
  );
  pot.position.y = 0.14;
  pot.castShadow = true;
  plant.add(pot);

  for (let i = 0; i < count; i++) {
    const pivot = new THREE.Group();
    pivot.position.y = 0.28;
    pivot.rotation.y = (i / count) * Math.PI * 2 + i * 0.3;
    const leaf = new THREE.Mesh(leafGeoUnit, leafMatGreen);
    leaf.scale.set(0.08, 0.288, 0.04);
    leaf.position.set(0.12, 0.3, 0);
    leaf.rotation.z = -0.35;
    leaf.castShadow = true;
    pivot.add(leaf);
    plant.add(pivot);
    leaves.push(pivot);
  }
  return plant;
}

// =====================================================================
// 4. DUNIA DI LUAR RUANGAN
//    Konsep: diorama melayang di atas lautan awan pada malam hari.
// =====================================================================

// Latar langit (gradien) + kabut jauh
scene.background = makeCanvasTexture(8, 512, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#060a18');
  g.addColorStop(0.55, '#0e1738');
  g.addColorStop(1, '#243468');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});
scene.fog = new THREE.Fog(0x0e1738, 28, 95);

// ---------- Bintang ----------
function makeStars(count, size, minY) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let x, y, z, l;
    do {
      x = Math.random() * 2 - 1;
      y = Math.random() * 2 - 1;
      z = Math.random() * 2 - 1;
      l = x * x + y * y + z * z;
    } while (l > 1 || l < 0.01 || y / Math.sqrt(l) < minY);
    const s = 150 / Math.sqrt(l);
    pos[i * 3] = x * s;
    pos[i * 3 + 1] = y * s;
    pos[i * 3 + 2] = z * s;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xcfe0ff, size, sizeAttenuation: false,
      transparent: true, opacity: 0.9, depthWrite: false, fog: false,
    })
  );
}
const starsA = makeStars(Math.round(600 * Q), 1.8, -0.2);
const starsB = makeStars(Math.round(300 * Q), 2.8, -0.2);
scene.add(starsA, starsB);

// ---------- Bulan terbit di cakrawala ----------
const moonTex = makeCanvasTexture(256, 128, (ctx, w, h) => {
  ctx.fillStyle = '#f3efdc';
  ctx.fillRect(0, 0, w, h);
  const r = mulberry32(5);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(165,158,138,${0.18 + r() * 0.2})`;
    ctx.beginPath();
    ctx.arc(r() * w, r() * h, 6 + r() * 16, 0, Math.PI * 2);
    ctx.fill();
  }
});
const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(6, 32, 32),
  new THREE.MeshBasicMaterial({ map: moonTex, fog: false })
);
moonMesh.position.set(-95, -18, -38.4);
scene.add(moonMesh);

const moonGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: glowTex, color: 0xaec4ff, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  })
);
moonGlow.scale.setScalar(46);
moonGlow.position.copy(moonMesh.position);
scene.add(moonGlow);

// ---------- Kota di bawah awan ----------
const cityDisc = new THREE.Mesh(
  new THREE.CircleGeometry(230, 48),
  new THREE.MeshBasicMaterial({ color: 0x080d1e, fog: false })
);
cityDisc.rotation.x = -Math.PI / 2;
cityDisc.position.y = -30;
scene.add(cityDisc);

{
  const n = Math.round(900 * Q);
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const r = mulberry32(99);
  const centers = Array.from({ length: 16 }, () => {
    const a = r() * Math.PI * 2;
    const d = 20 + r() * 110;
    return { x: Math.cos(a) * d, z: Math.sin(a) * d, spread: 6 + r() * 12 };
  });
  for (let i = 0; i < n; i++) {
    const c = centers[Math.floor(r() * centers.length)];
    const a = r() * Math.PI * 2;
    const rr = Math.pow(r(), 0.7) * c.spread * 2.2;
    pos[i * 3] = c.x + Math.cos(a) * rr;
    pos[i * 3 + 1] = -29.4;
    pos[i * 3 + 2] = c.z + Math.sin(a) * rr;
    const k = r();
    const rgb = k < 0.7 ? [1, 0.78, 0.45] : k < 0.93 ? [0.85, 0.92, 1] : [0.4, 0.9, 1];
    col.set(rgb, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 2.2, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0.95, depthWrite: false, fog: false,
    })
  ));
}

// ---------- Lautan awan (InstancedMesh: 1 draw call untuk semua awan) ----------
const cloudData = [];
{
  const r = mulberry32(21);
  const clusters = Math.round(40 * Q);
  for (let c = 0; c < clusters; c++) {
    const radius = 11 + r() * 37;
    const ang = r() * Math.PI * 2;
    const y = -2.5 - r() * 3.5;
    const s = 1.2 + r() * 2.2;
    const speed = 0.008 + r() * 0.018;
    for (let k = 0; k < 3; k++) {
      cloudData.push({
        r: radius + (k - 1) * s * 0.9,
        a: ang + ((k - 1) * s * 1.3) / radius,
        y: y + (k === 1 ? 0.3 : 0),
        sx: s * (1.4 + r() * 0.8),
        sy: s * (0.55 + r() * 0.3),
        sz: s * (1.1 + r() * 0.7),
        speed,
      });
    }
  }
}
const cloudMesh = new THREE.InstancedMesh(
  new THREE.IcosahedronGeometry(1, LOW_END ? 0 : 1),
  new THREE.MeshStandardMaterial({
    color: 0x4a5c92, roughness: 1, emissive: 0x1a2650, emissiveIntensity: 0.9,
  }),
  cloudData.length
);
cloudMesh.frustumCulled = false;
scene.add(cloudMesh);
const cloudDummy = new THREE.Object3D();

function updateClouds(dt) {
  for (let i = 0; i < cloudData.length; i++) {
    const c = cloudData[i];
    c.a += c.speed * dt;
    cloudDummy.position.set(Math.cos(c.a) * c.r, c.y, Math.sin(c.a) * c.r);
    cloudDummy.scale.set(c.sx, c.sy, c.sz);
    cloudDummy.updateMatrix();
    cloudMesh.setMatrixAt(i, cloudDummy.matrix);
  }
  cloudMesh.instanceMatrix.needsUpdate = true;
}
updateClouds(0);

// ---------- Pulau-pulau kecil melayang ----------
const islands = [];
function makeIsland(x, y, z, s) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  scene.add(g);

  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.1, 0.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x3f7a52, roughness: 1, flatShading: true })
  );
  g.add(grass);

  const rockI = new THREE.Mesh(
    new THREE.ConeGeometry(2.1, 3.4, 8, 1),
    new THREE.MeshStandardMaterial({ color: 0x1f2742, roughness: 1, flatShading: true })
  );
  rockI.rotation.x = Math.PI;
  rockI.position.y = -1.9;
  g.add(rockI);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4220, roughness: 1 })
  );
  trunk.position.set(0.6, 0.5, 0.2);
  g.add(trunk);
  const leafM = new THREE.MeshStandardMaterial({ color: 0x2f6b46, roughness: 1, flatShading: true });
  const crown1 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 8), leafM);
  crown1.position.set(0.6, 1.1, 0.2);
  const crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 8), leafM);
  crown2.position.set(0.6, 1.6, 0.2);
  g.add(crown1, crown2);

  // lentera kecil yang menyala
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a3f4d, roughness: 0.6 })
  );
  post.position.set(-0.8, 0.65, -0.3);
  const lampHeadI = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffc66b, fog: false })
  );
  lampHeadI.position.set(-0.8, 1.15, -0.3);
  g.add(post, lampHeadI);

  islands.push({ g, baseY: y, phase: Math.random() * Math.PI * 2 });
}
// Posisi dipilih agar terlihat dari kamera isometrik standar
makeIsland(-17.7, -0.9, -0.7, 1.2);
makeIsland(-0.4, -1.8, -17.4, 1.4);
makeIsland(-6.7, -6.7, 4.7, 0.8);
makeIsland(3.8, -6.6, -9.0, 0.9);
makeIsland(-3.3, -3.4, -25.9, 1.6);

// ---------- Balon udara yang mengorbit ----------
const balloon = new THREE.Group();
scene.add(balloon);
{
  const envTex = makeCanvasTexture(256, 128, (ctx, w, h) => {
    const cols = ['#e8622c', '#f4ecd8', '#3fa9f5', '#f4ecd8'];
    const n = 8;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect((i * w) / n, 0, w / n + 1, h);
    }
  });
  const env = new THREE.Mesh(
    new THREE.SphereGeometry(1.3, 24, 16),
    new THREE.MeshStandardMaterial({ map: envTex, roughness: 0.8 })
  );
  env.scale.y = 1.2;
  env.position.y = 2.2;
  balloon.add(env);

  const basket = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.45, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x7a4e2a, roughness: 1 })
  );
  basket.position.y = 0.2;
  balloon.add(basket);

  const ropeM = new THREE.MeshStandardMaterial({ color: 0x3a3f4d });
  for (const [rx, rz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
    const rope = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.2, 0.02), ropeM);
    rope.position.set(rx, 0.95, rz);
    balloon.add(rope);
  }
  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffa94d, fog: false })
  );
  flame.position.y = 1.0;
  balloon.add(flame);
  balloon.scale.setScalar(1.1);
}

// ---------- Kunang-kunang di sekitar diorama ----------
const FF_N = Math.round(60 * Q);
const ffGeo = new THREE.BufferGeometry();
const ffSpeed = new Float32Array(FF_N);
const ffPhase = new Float32Array(FF_N);
{
  const pos = new Float32Array(FF_N * 3);
  for (let i = 0; i < FF_N; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = 9 + Math.random() * 9;
    pos[i * 3] = Math.cos(a) * rr;
    pos[i * 3 + 1] = -1 + Math.random() * 11;
    pos[i * 3 + 2] = Math.sin(a) * rr;
    ffSpeed[i] = 0.15 + Math.random() * 0.25;
    ffPhase[i] = Math.random() * Math.PI * 2;
  }
  ffGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
}
const fireflies = new THREE.Points(
  ffGeo,
  new THREE.PointsMaterial({
    map: glowTex, color: 0xffd27a, size: 0.45, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  })
);
fireflies.frustumCulled = false;
scene.add(fireflies);

// =====================================================================
// 5. PLATFORM & RUANGAN
// =====================================================================
box(12, 0.8, 12, 0x252d4a, 0, -0.4, 0);          // dasar platform
box(12.04, 0.16, 12.04, 0x3f7a52, 0, -0.02, 0);  // rumput di tepi platform
box(11.2, 0.12, 11.2, 0xc8a07a, 0, 0.06, 0);     // lantai kayu
box(11.2, 5.5, 0.3, 0xe9dfcf, 0, 2.8, -5.45);    // dinding belakang
box(0.3, 5.5, 11.2, 0xded3c0, -5.45, 2.8, 0);    // dinding kiri

// Batuan di bawah platform => terlihat seperti pulau melayang
const rock = new THREE.Mesh(
  new THREE.ConeGeometry(8.5, 8, 4, 1),
  new THREE.MeshStandardMaterial({ color: 0x1d2440, roughness: 1, flatShading: true })
);
rock.rotation.set(Math.PI, Math.PI / 4, 0);
rock.position.y = -0.8 - 4;
scene.add(rock);

// Kristal bercahaya yang menempel di bawah pulau
const crystals = [];
for (let i = 0; i < 7; i++) {
  const col = i % 2 ? 0xff4fd8 : 0x4fe3ff;
  const h = 0.22 + (i % 3) * 0.14;
  const ang = i * 0.9 + 0.3;
  const rad = 6.2 * (1 - h) + 0.3;
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45),
    new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.4, roughness: 0.3 })
  );
  crystal.scale.set(0.6, 1.5, 0.6);
  crystal.position.set(Math.cos(ang) * rad, -0.8 - h * 8, Math.sin(ang) * rad);
  crystal.rotation.set(0.2, ang, 0.35);
  scene.add(crystal);
  crystals.push(crystal);
}
if (!LOW_END) {
  const underGlow = new THREE.PointLight(0x4fe3ff, 18, 16, 2);
  underGlow.position.set(0, -6, 0);
  scene.add(underGlow);
}

// Semak & lentera di tepi depan platform
for (const [bx, bz, bs] of [[5.8, 4.2, 0.42], [5.85, 2.9, 0.3], [4.1, 5.85, 0.36], [-3.0, 5.85, 0.4]]) {
  const bush = new THREE.Mesh(new THREE.SphereGeometry(bs, 14, 12), leafMatGreen);
  bush.scale.y = 0.8;
  bush.position.set(bx, 0.1 + bs * 0.6, bz);
  bush.castShadow = true;
  scene.add(bush);
}
for (const [px, pz] of [[5.8, 5.8], [-5.0, 5.8]]) {
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 1.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a3f4d, roughness: 0.5, metalness: 0.4 })
  );
  post.position.set(px, 0.85, pz);
  post.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0xffc66b })
  );
  head.position.set(px, 1.7, pz);
  scene.add(post, head);
}

// =====================================================================
// 6. MEJA
// =====================================================================
const desk = new THREE.Group();
desk.position.set(0, 0, -2.5);
scene.add(desk);

box(5.6, 0.2, 2.4, 0x8b5a2b, 0, 2.0, 0, desk); // papan meja
for (const [lx, lz] of [[-2.6, -1.0], [2.6, -1.0], [-2.6, 1.0], [2.6, 1.0]]) {
  box(0.2, 1.9, 0.2, 0x6b4220, lx, 1.0, lz, desk); // 4 kaki
}

// =====================================================================
// 7. MONITOR — layar VS Code yang sedang mengetik kode + cahaya
// =====================================================================
const monitor = new THREE.Group();
monitor.position.set(0, 2.1, -0.5);
desk.add(monitor);

box(0.9, 0.06, 0.5, 0x2b2f3a, 0, 0.03, 0, monitor);    // alas
box(0.14, 0.7, 0.14, 0x2b2f3a, 0, 0.4, 0, monitor);    // leher
box(2.6, 1.5, 0.12, 0x1c1f2a, 0, 1.4, 0, monitor);     // bingkai

const maxAniso = renderer.capabilities.getMaxAnisotropy();
const SCREEN_RES = LOW_END ? 0.7 : 1; // tekstur layar lebih kecil di HP

// Bidang layar 2.4 x 1.3  (rasio sama dengan kanvas 1180 x 640)
const monScreen = createCodeScreen(MONITOR_PRESET, { res: SCREEN_RES, reduceMotion, maxAniso, phase: 0 });
const monScreenMesh = codeScreenMesh(monScreen, 2.4, 1.3, 0, 1.4, 0.07, monitor);
const monHalo = haloSprite(0x4fa8ff, 4.8, 3.4, 0, 1.4, -0.14, monitor, 0.5);   // halo di belakang bingkai
const monSpill = deskSpill(0x4fa8ff, 3.8, 2.6, 0, 0.0, desk, 0.32);            // pantulan di meja

// =====================================================================
// 8. LAPTOP — layar VS Code + cahaya
// =====================================================================
const laptop = new THREE.Group();
laptop.position.set(1.7, 2.1, 0.3);
laptop.rotation.y = -0.45;
desk.add(laptop);

box(1.3, 0.06, 0.9, 0x9aa3b2, 0, 0.03, 0, laptop); // badan
const lid = new THREE.Group();                      // engsel layar
lid.position.set(0, 0.06, -0.45);
lid.rotation.x = -0.3;                              // miring ke belakang
laptop.add(lid);
box(1.3, 0.85, 0.05, 0x9aa3b2, 0, 0.43, 0, lid);

// Bidang layar 1.18 x 0.73  (rasio sama dengan kanvas 1034 x 640)
const lapScreen = createCodeScreen(LAPTOP_PRESET, { res: SCREEN_RES, reduceMotion, maxAniso, phase: 3.5 });
const lapScreenMesh = codeScreenMesh(lapScreen, 1.18, 0.73, 0, 0.43, 0.03, lid, 1.1);
const lapHalo = haloSprite(0x7be0c3, 2.7, 2.0, 0, 0.43, -0.1, lid, 0.45);
const lapSpill = deskSpill(0x7be0c3, 2.2, 1.7, 1.75, 0.95, desk, 0.28);

// =====================================================================
// 9. SMARTPHONE
// =====================================================================
const phone = new THREE.Group();
phone.position.set(-1.9, 2.1, 0.4);
phone.rotation.y = 0.5;
desk.add(phone);

box(0.38, 0.05, 0.75, 0x1c1f2a, 0, 0.025, 0, phone);
const phoneScreen = glowScreen(0.32, 0.66, 0xff9f5a, 0, 0.055, 0, phone);
phoneScreen.rotation.x = -Math.PI / 2;

// =====================================================================
// 10. MUG KOPI
// =====================================================================
const mug = new THREE.Group();
mug.position.set(-0.9, 2.1, 0.7);
desk.add(mug);

const mugBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.17, 0.15, 0.32, 24),
  new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.5 })
);
mugBody.position.y = 0.16;
mugBody.castShadow = true;
mug.add(mugBody);

const handle = new THREE.Mesh(
  new THREE.TorusGeometry(0.08, 0.025, 8, 16),
  new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.5 })
);
handle.position.set(0.19, 0.16, 0);
handle.castShadow = true;
mug.add(handle);

// Uap kopi: 3 gumpalan kecil yang naik dan memudar
const steam = [];
const steamGeo = new THREE.SphereGeometry(0.06, 10, 10);
for (let i = 0; i < 3; i++) {
  const puff = new THREE.Mesh(
    steamGeo,
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
  );
  mug.add(puff);
  steam.push(puff);
}

// =====================================================================
// 11. LAMPU MEJA
// =====================================================================
const lamp = new THREE.Group();
lamp.position.set(-2.3, 2.1, -0.6);
desk.add(lamp);

const metal = new THREE.MeshStandardMaterial({ color: 0x3a3f4d, roughness: 0.4, metalness: 0.5 });
const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.07, 24), metal);
lampBase.position.y = 0.035;
const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 12), metal);
lampPole.position.y = 0.65;
const lampHead = new THREE.Mesh(
  new THREE.ConeGeometry(0.32, 0.4, 24, 1, true),
  new THREE.MeshStandardMaterial({ color: 0xffb84d, side: THREE.DoubleSide, roughness: 0.5 })
);
lampHead.position.set(0.1, 1.3, 0.1);
lampHead.rotation.set(0.5, 0, -0.35);
[lampBase, lampPole, lampHead].forEach((m) => { m.castShadow = true; lamp.add(m); });

// =====================================================================
// 12. PENCAHAYAAN
// =====================================================================
// Cahaya langit lembut (biru atas, gelap bawah)
scene.add(new THREE.HemisphereLight(0x6f8fff, 0x1a1a2e, 0.7));

// "Bulan": cahaya utama pembuat bayangan
const moon = new THREE.DirectionalLight(0x9db4ff, 1.4);
moon.position.set(7, 12, 7);
moon.castShadow = true;
moon.shadow.mapSize.set(LOW_END ? 1024 : 2048, LOW_END ? 1024 : 2048);
moon.shadow.camera.left = -9;
moon.shadow.camera.right = 9;
moon.shadow.camera.top = 9;
moon.shadow.camera.bottom = -9;
moon.shadow.camera.near = 1;
moon.shadow.camera.far = 35;
moon.shadow.bias = -0.0004;
scene.add(moon);

// Lampu meja: HANGAT
const lampLight = new THREE.PointLight(0xffa94d, 35, 14, 2);
lampLight.position.set(-2.2, 3.5, -2.2);
scene.add(lampLight);

// Cahaya monitor: DINGIN (menerangi meja, keyboard, dan karakter)
const monitorLight = new THREE.PointLight(0x4fb3ff, 18, 10, 2);
monitorLight.position.set(0, 3.7, -1.8);
scene.add(monitorLight);

// Cahaya laptop: hijau kebiruan (dimatikan di perangkat low-end demi performa)
let laptopLight = null;
if (!LOW_END) {
  laptopLight = new THREE.PointLight(0x7be0c3, 7, 5, 2);
  laptopLight.position.set(1.9, 3.1, -1.7);
  scene.add(laptopLight);
}

// =====================================================================
// 13. KEYBOARD
// =====================================================================
box(1.5, 0.06, 0.5, 0x2b2f3a, 0, 2.13, 0.6, desk);
for (let r = 0; r < 3; r++) {
  box(1.36, 0.03, 0.1, 0x454b5c, 0, 2.18, 0.45 + r * 0.14, desk); // baris tombol
}

// =====================================================================
// 14. DEVELOPER (karakter + kursi)
// =====================================================================
const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2c7a0, roughness: 0.6 });
const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a1d17, roughness: 0.8 });
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 });

const HOODIE = 0x4a78c2;
const PANTS = 0x2d3447;
const CHAIR = 0x39405a;

const dev = new THREE.Group();
dev.position.set(0, 0, -0.6); // duduk tepat di depan meja
scene.add(dev);

// -- Kursi --
const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.1, 24), metal);
chairBase.position.y = 0.17;
const chairPole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 12), metal);
chairPole.position.y = 0.7;
[chairBase, chairPole].forEach((m) => { m.castShadow = true; dev.add(m); });
box(1.5, 0.2, 1.4, CHAIR, 0, 1.2, 0, dev);    // dudukan (permukaan atas y = 1.3)
box(1.4, 1.5, 0.2, CHAIR, 0, 2.0, 0.75, dev); // sandaran

// -- Kaki --
for (const sx of [-1, 1]) {
  box(0.4, 0.36, 1.1, PANTS, sx * 0.3, 1.48, -0.45, dev);   // paha
  box(0.36, 1.0, 0.36, PANTS, sx * 0.3, 0.8, -1.0, dev);    // betis
  box(0.4, 0.2, 0.6, 0xf2efe9, sx * 0.3, 0.22, -1.15, dev); // sepatu
}

// -- Badan (group terpisah supaya bisa "bernapas") --
const body = new THREE.Group();
body.position.y = 1.3; // tepat di atas dudukan
dev.add(body);
box(1.1, 1.2, 0.7, HOODIE, 0, 0.6, 0, body); // torso

// -- Kepala --
const head = new THREE.Group();
head.position.y = 1.75;
body.add(head);

const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), skinMat);
skull.castShadow = true;
head.add(skull);

// Rambut: setengah bola dimiringkan ke belakang (wajah menghadap -z)
const hair = new THREE.Mesh(
  new THREE.SphereGeometry(0.53, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55),
  hairMat
);
hair.rotation.x = 0.5;
hair.castShadow = true;
head.add(hair);

// Mata (disimpan di array agar bisa berkedip)
const eyes = [];
for (const sx of [-1, 1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), eyeMat);
  eye.position.set(sx * 0.18, 0.06, -0.45);
  head.add(eye);
  eyes.push(eye);
}

// Hidung & senyum
const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), skinMat);
nose.position.set(0, -0.04, -0.5);
head.add(nose);

const smile = new THREE.Mesh(
  new THREE.TorusGeometry(0.1, 0.015, 8, 16, Math.PI),
  eyeMat
);
smile.rotation.z = Math.PI; // busur menghadap ke atas = tersenyum
smile.position.set(0, -0.15, -0.47);
head.add(smile);

// -- Lengan (pivot di bahu) --
function makeArm(side) {
  const pivot = new THREE.Group();
  pivot.position.set(side * 0.7, 1.0, 0);
  pivot.rotation.y = side * -0.3; // menekuk ke tengah, ke arah keyboard
  pivot.rotation.x = -0.06;
  box(0.28, 0.28, 1.4, HOODIE, 0, 0, -0.7, pivot);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), skinMat);
  hand.position.z = -1.4;
  hand.castShadow = true;
  pivot.add(hand);
  body.add(pivot);
  return pivot;
}
const armL = makeArm(-1);
const armR = makeArm(1);

// Karpet bulat kecil di bawah kursi kerja
const rugTex = makeCanvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#6b3f2a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 16;
  ctx.strokeRect(22, 22, w - 44, h - 44);
  ctx.strokeStyle = '#3e7cb1';
  ctx.lineWidth = 6;
  ctx.strokeRect(50, 50, w - 100, h - 100);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#d9a441';
  ctx.fillRect(-70, -70, 140, 140);
  ctx.restore();
});
const rugRound = new THREE.Mesh(
  new THREE.CircleGeometry(2.0, 48),
  new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.92 })
);
rugRound.rotation.x = -Math.PI / 2;
rugRound.position.set(0, 0.13, -0.7);
rugRound.receiveShadow = true;
scene.add(rugRound);

// =====================================================================
// 15. RAK BUKU (Experience) + tanaman
//     Dinding belakang, sisi kanan (x 2.8 .. 5.0)
// =====================================================================
const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.8 });

const bookshelf = new THREE.Group();
bookshelf.position.set(3.9, 0.12, -4.9);
scene.add(bookshelf);

const WOOD = 0x7a4e2a;
box(2.2, 4.2, 0.08, 0x5e3b20, 0, 2.1, -0.36, bookshelf); // panel belakang
box(0.1, 4.2, 0.8, WOOD, -1.05, 2.1, 0, bookshelf);      // sisi kiri
box(0.1, 4.2, 0.8, WOOD, 1.05, 2.1, 0, bookshelf);       // sisi kanan
const shelfTops = [0.1, 1.15, 2.2, 3.25, 4.2];
shelfTops.forEach((top) => box(2.2, 0.1, 0.8, WOOD, 0, top - 0.05, 0, bookshelf));

const rand = mulberry32(7);
const BOOK_COLORS = [0xc0563a, 0x3e7cb1, 0xd9a441, 0x5b8c5a, 0x8a5fa8, 0xe8e0d0, 0x2f4858];
shelfTops.slice(0, 4).forEach((top, row) => {
  let x = -0.92;
  const maxX = row === 3 ? 0.1 : 0.92; // rak ke-4 setengah kosong (ada piala)
  while (x < maxX) {
    const w = 0.09 + rand() * 0.11;
    const h = 0.5 + rand() * 0.4;
    if (x + w > maxX) break;
    const color = BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)];
    const book = box(w, h, 0.5, color, x + w / 2, top + h / 2, 0.02, bookshelf);
    if (rand() < 0.08) book.rotation.z = 0.2; // sesekali ada buku miring
    x += w + 0.01;
  }
});

// Piala kecil
const trophy = new THREE.Group();
trophy.position.set(0.55, 3.25, 0);
bookshelf.add(trophy);
[
  [new THREE.CylinderGeometry(0.16, 0.18, 0.08, 16), 0.04],
  [new THREE.CylinderGeometry(0.03, 0.03, 0.2, 12), 0.18],
  [new THREE.CylinderGeometry(0.16, 0.07, 0.24, 20), 0.4],
].forEach(([geo, y]) => {
  const m = new THREE.Mesh(geo, gold);
  m.position.y = y;
  m.castShadow = true;
  trophy.add(m);
});

// Tanaman kecil di atas rak
makePlant(bookshelf, -0.6, 4.2, 0, 1, 5);

// Tanaman besar di lantai, di samping rak buku
makePlant(scene, 4.9, 0.12, -2.4, 2.2, 9, 0x3a3f4d);

// =====================================================================
// 16. EDUCATION: tumpukan buku + topi wisuda (pojok kanan-belakang meja)
// =====================================================================
const education = new THREE.Group();
education.position.set(2.2, 2.1, -0.8);
desk.add(education);

box(0.8, 0.14, 0.55, 0x3e7cb1, 0, 0.07, 0, education);
const bookB = box(0.7, 0.12, 0.5, 0xc0563a, 0.03, 0.2, 0, education);
bookB.rotation.y = 0.15;
const bookC = box(0.62, 0.1, 0.45, 0xd9a441, -0.02, 0.31, 0, education);
bookC.rotation.y = -0.1;

const capMat = new THREE.MeshStandardMaterial({ color: 0x1d2233, roughness: 0.7 });
const cap = new THREE.Group();
cap.position.y = 0.36;
cap.rotation.y = 0.3;
education.add(cap);
const capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.16, 20), capMat);
capBase.position.y = 0.08;
capBase.castShadow = true;
cap.add(capBase);
box(0.66, 0.035, 0.66, 0x1d2233, 0, 0.18, 0, cap); // papan datar topi
const tasselCord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), gold);
tasselCord.position.set(0.3, 0.1, 0.3);
cap.add(tasselCord);
const tasselEnd = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), gold);
tasselEnd.position.set(0.3, 0.01, 0.3);
cap.add(tasselEnd);

// =====================================================================
// 17. RESUME: map di kanan-depan meja
// =====================================================================
const resume = new THREE.Group();
resume.position.set(2.45, 2.1, 0.85);
resume.rotation.y = 0.15;
desk.add(resume);

box(0.55, 0.04, 0.62, 0xd9a441, 0, 0.02, 0, resume);          // map
box(0.5, 0.012, 0.56, 0xf4f0e6, 0, 0.046, -0.01, resume);     // kertas
box(0.2, 0.04, 0.07, 0xc48f2e, -0.12, 0.02, -0.33, resume);   // tab map
[0.12, 0.04, -0.04].forEach((z) => box(0.34, 0.006, 0.02, 0x9a958a, 0, 0.055, z, resume));

// =====================================================================
// 18. DINDING BELAKANG (z = -5.3), dari kiri ke kanan:
//     sertifikat -> dashboard stats -> papan ikon -> rak buku
// =====================================================================

// ---------- Sertifikat (3 bingkai) ----------
const certificates = new THREE.Group();
certificates.position.set(-3.2, 3.95, -5.25);
scene.add(certificates);

[-1.3, 0, 1.3].forEach((x, i) => {
  const y = i === 1 ? 0.2 : 0; // bingkai tengah sedikit lebih tinggi
  box(1.0, 0.75, 0.06, 0x5b3a1e, x, y, 0, certificates);           // bingkai
  box(0.84, 0.6, 0.02, 0xf4ecd8, x, y, 0.035, certificates);       // kertas
  box(0.5, 0.04, 0.01, 0x9a8f7a, x, y + 0.12, 0.05, certificates); // judul
  box(0.6, 0.025, 0.01, 0xb9b09c, x, y + 0.02, 0.05, certificates);
  box(0.4, 0.025, 0.01, 0xb9b09c, x, y - 0.06, 0.05, certificates);
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 20), gold);
  seal.rotation.x = Math.PI / 2;
  seal.position.set(x + 0.25, y - 0.2, 0.05);
  certificates.add(seal);
});

// ---------- Dashboard (Developer Stats) ----------
const dashboard = new THREE.Group();
dashboard.position.set(0, 4.1, -5.25);
scene.add(dashboard);

box(1.7, 1.05, 0.08, 0x1c1f2a, 0, 0, 0, dashboard);
const dashTex = makeCanvasTexture(544, 320, (ctx, w, h) => {
  ctx.fillStyle = '#0b1830';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#8fb3ff';
  ctx.font = '600 26px system-ui, sans-serif';
  ctx.fillText('DEV STATS', 28, 48);
  // Grafik batang hanya dekorasi, bukan data asli
  [0.4, 0.65, 0.5, 0.85, 0.7, 0.95].forEach((v, i) => {
    ctx.fillStyle = i % 2 ? '#ffb84d' : '#3fa9f5';
    const bh = v * 170;
    ctx.fillRect(44 + i * 78, h - 30 - bh, 50, bh);
  });
});
const dashScreen = new THREE.Mesh(
  new THREE.PlaneGeometry(1.58, 0.93),
  new THREE.MeshStandardMaterial({
    map: dashTex,
    emissive: 0xffffff,
    emissiveMap: dashTex,
    emissiveIntensity: 0.9,
  })
);
dashScreen.position.z = 0.045;
dashboard.add(dashScreen);

// ---------- Papan ikon programmer ----------
const iconBoard = new THREE.Group();
iconBoard.position.set(1.95, 4.0, -5.25);
scene.add(iconBoard);
box(1.4, 0.9, 0.05, 0x6b4a2e, 0, 0, 0, iconBoard);

const ICONS = [
  { label: '</>', color: '#3fa9f5' },
  { label: '{ }', color: '#f2c14e' },
  { label: 'git', color: '#e8622c' },
  { label: '01', color: '#5b8c5a' },
];
ICONS.forEach((ic, i) => {
  const tex = makeCanvasTexture(160, 160, (ctx, w, h) => {
    ctx.fillStyle = '#1c1f2a';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ic.color;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = ic.color;
    ctx.font = '700 46px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ic.label, w / 2, h / 2 + 4);
  });
  const chip = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 24),
    new THREE.MeshStandardMaterial({ map: tex })
  );
  chip.position.set(-0.45 + i * 0.3, 0, 0.03);
  iconBoard.add(chip);
});

// =====================================================================
// 19. DINDING KIRI (x = -5.3), dari belakang ke depan:
//     poster 404 + server rack -> area santai (sofa) dengan 2 poster & neon
// =====================================================================

// ---------- Server rack + poster 404 (pojok belakang-kiri) ----------
const rack = new THREE.Group();
rack.position.set(-4.8, 0.12, -4.1);
scene.add(rack);
box(0.8, 2.2, 0.9, 0x20242f, 0, 1.1, 0, rack);

const leds = []; // material LED, dikedipkan di render loop
const ledGeo = new THREE.BoxGeometry(0.02, 0.04, 0.04);
for (let r = 0; r < 6; r++) {
  const y = 0.35 + r * 0.33;
  box(0.04, 0.22, 0.7, 0x343a4a, 0.41, y, 0, rack); // laci server
  for (let k = 0; k < 2; k++) {
    const m = new THREE.MeshStandardMaterial({
      color: 0x07140c,
      emissive: k ? 0xffa94d : 0x3dff88,
      emissiveIntensity: 1,
    });
    const led = new THREE.Mesh(ledGeo, m);
    led.position.set(0.44, y + 0.05, 0.25 - k * 0.08);
    rack.add(led);
    leds.push(m);
  }
}

const poster404 = new THREE.Group();
poster404.position.set(-5.25, 3.4, -4.1);
scene.add(poster404);
box(0.05, 1.3, 1.0, 0x20242f, 0, 0, 0, poster404);
const posterTex = makeCanvasTexture(320, 420, (ctx, w, h) => {
  ctx.fillStyle = '#12182b';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb84d';
  ctx.font = '800 110px system-ui, sans-serif';
  ctx.fillText('404', w / 2, 210);
  ctx.fillStyle = '#8fb3ff';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText('PAGE NOT FOUND', w / 2, 260);
  ctx.fillStyle = '#cfd8f5';
  ctx.font = '20px monospace';
  ctx.fillText('git blame: not me', w / 2, 320);
});
const posterFace = new THREE.Mesh(
  new THREE.PlaneGeometry(0.9, 1.2),
  new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.9 })
);
posterFace.rotation.y = Math.PI / 2; // menghadap ke dalam ruangan (+x)
posterFace.position.x = 0.03;
poster404.add(posterFace);

// ---------- AREA SANTAI: sofa besar (Chill Zone) ----------
// Grup `lounge` diputar 90 derajat: bagian depan sofa menghadap +x (ke tengah ruangan).
// Koordinat LOKAL: +z = depan sofa, x = lebar sofa, y = tinggi dari lantai.
const lounge = new THREE.Group();
lounge.position.set(-4.35, 0.12, 2.2);
lounge.rotation.y = Math.PI / 2;
scene.add(lounge);

const SOFA = 0x46507f;
const SOFA_DARK = 0x39426b;
const SW = 3.8; // lebar sofa (cukup untuk 2 orang seukuran karakter)
const SD = 1.6; // kedalaman sofa

box(SW, 0.5, SD, SOFA_DARK, 0, 0.37, 0, lounge);                       // rangka
for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 10), metal);
  leg.position.set(sx * (SW / 2 - 0.2), 0.07, sz * (SD / 2 - 0.2));
  leg.castShadow = true;
  lounge.add(leg);
}
box(SW - 0.1, 1.5, 0.5, SOFA, 0, 1.37, -SD / 2 + 0.25, lounge);        // sandaran belakang
for (const sx of [-1, 1]) {
  box(0.5, 1.0, SD, SOFA, sx * (SW / 2 - 0.25), 1.12, 0, lounge);      // sandaran tangan
  box((SW - 1.0) / 2 - 0.02, 0.35, SD - 0.55, SOFA, sx * ((SW - 1.0) / 4), 0.795, 0.18, lounge); // bantal duduk
  const backCushion = box(1.3, 0.9, 0.32, SOFA, sx * ((SW - 1.0) / 4), 1.42, -0.12, lounge);
  backCushion.rotation.x = -0.15;                                      // bantal sandaran miring
}

// Bantal hias & selimut
const pillow1 = box(0.5, 0.5, 0.16, 0xe08a3c, -1.0, 1.25, 0.02, lounge);
pillow1.rotation.set(-0.1, 0.45, 0.15);
const pillow2 = box(0.46, 0.46, 0.16, 0x3fa9b5, 1.05, 1.24, 0.05, lounge);
pillow2.rotation.set(-0.1, -0.4, -0.12);
box(0.62, 0.07, 1.3, 0xc76a4a, SW / 2 - 0.25, 1.66, 0.1, lounge);       // selimut di sandaran tangan
box(0.07, 0.6, 1.1, 0xc76a4a, SW / 2 + 0.03, 1.35, 0.1, lounge);

// Kucing tidur di bantal duduk kanan
const cat = new THREE.Group();
cat.position.set(0.75, 0.97, 0.15);
lounge.add(cat);
const catMat = new THREE.MeshStandardMaterial({ color: 0xe8a05a, roughness: 0.9 });
const catBody = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), catMat);
catBody.scale.set(1.25, 0.7, 0.85);
catBody.position.y = 0.2;
catBody.castShadow = true;
cat.add(catBody);
const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), catMat);
catHead.position.set(-0.4, 0.22, 0.12);
catHead.castShadow = true;
cat.add(catHead);
for (const ex of [-1, 1]) {
  const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), catMat);
  ear.position.set(ex * 0.09, 0.16, 0);
  ear.rotation.z = -ex * 0.2;
  catHead.add(ear);
}
const catTail = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 16, Math.PI * 1.2), catMat);
catTail.position.set(0.35, 0.12, 0.2);
catTail.rotation.x = Math.PI / 2;
cat.add(catTail);

// Meja kopi di depan sofa
const table = new THREE.Group();
table.position.set(0, 0, 2.3);
lounge.add(table);
box(1.9, 0.1, 0.95, 0x8b5a2b, 0, 0.62, 0, table);                      // permukaan
box(1.7, 0.06, 0.75, 0x6b4220, 0, 0.2, 0, table);                      // rak bawah
for (const [tx, tz] of [[-0.8, -0.38], [0.8, -0.38], [-0.8, 0.38], [0.8, 0.38]]) {
  box(0.1, 0.57, 0.1, 0x6b4220, tx, 0.285, tz, table);
}
// Stik game di atas meja
const pad = new THREE.Group();
pad.position.set(0.3, 0.67, 0.05);
pad.rotation.y = 0.4;
table.add(pad);
box(0.36, 0.06, 0.2, 0x20242f, 0, 0.03, 0, pad);
box(0.1, 0.05, 0.14, 0x20242f, -0.16, 0.025, 0.06, pad);
box(0.1, 0.05, 0.14, 0x20242f, 0.16, 0.025, 0.06, pad);
const padLight = new THREE.Mesh(
  new THREE.BoxGeometry(0.1, 0.012, 0.02),
  new THREE.MeshStandardMaterial({ color: 0x06121f, emissive: 0x4fe3ff, emissiveIntensity: 1.6 })
);
padLight.position.set(0, 0.065, -0.05);
pad.add(padLight);
// Gelas minuman & sedotan
const cupM = new THREE.Mesh(
  new THREE.CylinderGeometry(0.09, 0.07, 0.18, 16),
  new THREE.MeshStandardMaterial({ color: 0xf4ecd8, roughness: 0.5 })
);
cupM.position.set(-0.55, 0.76, -0.1);
cupM.castShadow = true;
table.add(cupM);
const straw = new THREE.Mesh(
  new THREE.CylinderGeometry(0.01, 0.01, 0.28, 6),
  new THREE.MeshStandardMaterial({ color: 0xff4fd8 })
);
straw.position.set(-0.52, 0.9, -0.1);
straw.rotation.z = -0.15;
table.add(straw);
// Sukulen kecil
const succPot = new THREE.Mesh(
  new THREE.CylinderGeometry(0.1, 0.08, 0.12, 12),
  new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.8 })
);
succPot.position.set(-0.1, 0.73, 0.2);
const succ = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), leafMatGreen);
succ.position.set(-0.1, 0.83, 0.2);
succ.scale.y = 0.8;
table.add(succPot, succ);

// Karpet persegi di bawah area santai
const rugRectTex = makeCanvasTexture(592, 768, (ctx, w, h) => {
  ctx.fillStyle = '#7a4a3a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 18;
  ctx.strokeRect(24, 24, w - 48, h - 48);
  ctx.strokeStyle = '#2f4858';
  ctx.lineWidth = 8;
  ctx.strokeRect(58, 58, w - 116, h - 116);
  ctx.fillStyle = '#2f4858';
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(w / 2, h * (0.28 + i * 0.22));
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-48, -48, 96, 96);
    ctx.restore();
  }
});
const rugRect = new THREE.Mesh(
  new THREE.PlaneGeometry(3.7, 4.8),
  new THREE.MeshStandardMaterial({ map: rugRectTex, roughness: 0.92 })
);
rugRect.rotation.x = -Math.PI / 2;
rugRect.position.set(-3.15, 0.125, 2.2);
rugRect.receiveShadow = true;
scene.add(rugRect);

// ---------- 2 POSTER DINDING (isi dengan foto PNG milikmu) ----------
// Taruh file di folder  public/posters/  lalu sesuaikan nama file di bawah.
// Jika file belum ada, poster menampilkan gambar placeholder.
const POSTER_FILES = ['/posters/poster1.png', '/posters/poster2.png'];

function posterPlaceholder(n) {
  return makeCanvasTexture(600, 800, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, n === 1 ? '#2b1b5a' : '#0f3b4a');
    g.addColorStop(1, n === 1 ? '#c2417a' : '#2fa4a9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 64px system-ui, sans-serif';
    ctx.fillText('POSTER ' + n, w / 2, h / 2 - 20);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '26px monospace';
    ctx.fillText('public/posters/poster' + n + '.png', w / 2, h / 2 + 40);
  });
}

function makePosterFrame(z, file, n) {
  const FW = 1.25;
  const FH = 1.7;
  const g = new THREE.Group();
  g.position.set(-5.25, 3.3, z);
  g.rotation.y = Math.PI / 2; // menghadap ke dalam ruangan (+x)
  scene.add(g);

  box(FW, FH, 0.06, 0x1c1f2a, 0, 0, 0, g);              // bingkai
  box(FW - 0.1, FH - 0.1, 0.02, 0xf4ecd8, 0, 0, 0.035, g); // matte krem

  const placeholder = posterPlaceholder(n);
  const mat = new THREE.MeshStandardMaterial({ map: placeholder, roughness: 0.85 });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  art.position.z = 0.05;
  g.add(art);

  const fit = (aspect) => {
    const maxW = FW - 0.26;
    const maxH = FH - 0.26;
    let w = maxW;
    let h = maxW / aspect;
    if (h > maxH) { h = maxH; w = maxH * aspect; }
    art.scale.set(w, h, 1);
  };
  fit(600 / 800);

  new THREE.TextureLoader().load(
    file,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      mat.map = tex;
      mat.needsUpdate = true;
      fit(tex.image.width / tex.image.height);
      placeholder.dispose();
    },
    undefined,
    () => console.info(`Poster ${n}: file ${file} belum ada, memakai placeholder.`)
  );
  return g;
}
makePosterFrame(1.35, POSTER_FILES[0], 1);
makePosterFrame(3.05, POSTER_FILES[1], 2);

// ---------- SIGN NEON (siluet stik game + tulisan CHILL ZONE) ----------
const neon = new THREE.Group();
neon.position.set(-5.23, 4.85, 2.2);
neon.rotation.y = Math.PI / 2;
scene.add(neon);
box(2.7, 1.1, 0.05, 0x0c0f1e, 0, 0, 0, neon);

const neonTex = makeCanvasTexture(1024, 418, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // `draw` harus menggambar dan memanggil stroke() sendiri
  const tube = (color, draw) => {
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 36;
    ctx.lineWidth = 12;
    draw();
    ctx.shadowBlur = 16;
    ctx.lineWidth = 8;
    draw();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 3;
    draw();
    ctx.globalAlpha = 1;
  };

  // Siluet stik game (ruang gambar 400 x 200, diskalakan 1.2x)
  ctx.save();
  ctx.translate(50, 85);
  ctx.scale(1.2, 1.2);
  tube('#ff4fd8', () => {
    ctx.beginPath();
    ctx.moveTo(110, 40);
    ctx.bezierCurveTo(70, 40, 30, 120, 30, 150);
    ctx.bezierCurveTo(30, 185, 80, 192, 100, 160);
    ctx.lineTo(125, 125);
    ctx.lineTo(275, 125);
    ctx.lineTo(300, 160);
    ctx.bezierCurveTo(320, 192, 370, 185, 370, 150);
    ctx.bezierCurveTo(370, 120, 330, 40, 290, 40);
    ctx.closePath();
    ctx.stroke();
  });
  tube('#ff4fd8', () => {            // d-pad
    ctx.beginPath();
    ctx.moveTo(110, 68); ctx.lineTo(110, 98);
    ctx.moveTo(95, 83); ctx.lineTo(125, 83);
    ctx.stroke();
  });
  tube('#ff4fd8', () => {            // tombol aksi
    for (const [bx, by] of [[290, 70], [315, 85], [290, 100], [265, 85]]) {
      ctx.beginPath();
      ctx.arc(bx, by, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  ctx.restore();

  // Tulisan neon
  ctx.textAlign = 'center';
  ctx.font = '700 118px "Segoe UI", system-ui, sans-serif';
  tube('#4fe3ff', () => ctx.strokeText('CHILL', 780, 190));
  tube('#4fe3ff', () => ctx.strokeText('ZONE', 780, 320));
});
const neonMat = new THREE.MeshBasicMaterial({
  map: neonTex,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
neonMat.color.setScalar(1.5); // terang melebihi 1 supaya terasa menyala
const neonPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.06), neonMat);
neonPlane.position.z = 0.04;
neon.add(neonPlane);

// Cahaya magenta dari neon jatuh ke sofa & dinding
const neonLight = new THREE.PointLight(0xff4fd8, 9, 8, 2);
neonLight.position.set(-4.7, 4.6, 2.2);
scene.add(neonLight);

// =====================================================================
// 20. INTERAKSI (raycaster, hover, klik, kamera terbang)
// =====================================================================
const tooltip = document.querySelector('#tooltip');

const HOME = {
  pos: V(11, 9, 11),
  target: V(0, 1.8, 0),
};

// Daftar objek interaktif + posisi kamera saat objek dipilih.
// Tambah objek baru cukup dengan menambah satu baris di sini.
const interactives = [
  {
    id: 'about', label: 'About Me', object: dev,
    cam: { pos: V(-3.2, 4.3, -2.2), target: V(0, 2.9, -0.6) }
  },
  {
    id: 'skills', label: 'View Skills', object: monitor,
    cam: { pos: V(3.2, 5.2, 1.8), target: V(0, 3.5, -3.0) }
  },
  {
    id: 'projects', label: 'View Projects', object: laptop,
    cam: { pos: V(4.2, 4.3, 1.0), target: V(1.7, 2.6, -2.2) }
  },
  {
    id: 'contact', label: "Let's Connect", object: phone,
    cam: { pos: V(-3.0, 4.6, 0.9), target: V(-1.9, 2.2, -2.1) }
  },
  {
    id: 'experience', label: 'View Experience', object: bookshelf,
    cam: { pos: V(5.2, 4.2, 1.6), target: V(3.9, 2.5, -4.9) }
  },
  {
    id: 'education', label: 'View Education', object: education,
    cam: { pos: V(4.5, 4.4, -0.6), target: V(2.2, 2.5, -3.3) }
  },
  {
    id: 'certificates', label: 'View Certificates', object: certificates,
    cam: { pos: V(-2.2, 4.8, -1.2), target: V(-3.2, 3.9, -5.2) }
  },
  {
    id: 'stats', label: 'Developer Stats', object: dashboard,
    cam: { pos: V(0.9, 5.2, -0.8), target: V(0, 4.1, -5.25) }
  },
  {
    id: 'resume', label: 'View Resume', object: resume,
    cam: { pos: V(4.2, 4.2, 0.6), target: V(2.45, 2.2, -1.65) }
  },
  {
    id: 'rest', label: 'Chill Zone', object: lounge,
    cam: { pos: V(-0.2, 4.4, 5.8), target: V(-4.0, 1.7, 2.2) }
  },
];
interactives.forEach((i) => (i.s = 1)); // skala saat ini (animasi hover)

// Batas kontrol kamera (dilonggarkan saat fokus ke objek / intro)
function setLimits(free) {
  controls.minDistance = free ? 0.5 : 8;
  controls.maxDistance = free ? 60 : 20;
  controls.minAzimuthAngle = free ? -Infinity : -0.2;
  controls.maxAzimuthAngle = free ? Infinity : Math.PI / 2 + 0.2;
  controls.maxPolarAngle = free ? Math.PI : Math.PI / 2.2;
}

// Animasi kamera (tween buatan sendiri)
let tween = null;
const easeInOutCubic = (x) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

function flyTo(pos, target, seconds, onDone) {
  tween = {
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPos: pos,
    toTarget: target,
    start: performance.now(),
    duration: (reduceMotion ? 0.01 : seconds) * 1000,
    onDone,
  };
}

// Raycaster
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-10, -10);
let hovered = null;
let active = null;
let closing = false;
let pointerMoved = false;
let exposureTarget = 1.1;

function setPointer(e) {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
}

function pick() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(interactives.map((i) => i.object), true);
  if (!hits.length) return null;
  // Naik lewat parent sampai ketemu group yang terdaftar
  let o = hits[0].object;
  while (o) {
    const found = interactives.find((i) => i.object === o);
    if (found) return found;
    o = o.parent;
  }
  return null;
}

renderer.domElement.addEventListener('pointermove', (e) => {
  setPointer(e);
  pointerMoved = true;
  tooltip.style.left = e.clientX + 16 + 'px';
  tooltip.style.top = e.clientY + 16 + 'px';
});

// Bedakan KLIK/TAP dengan DRAG (drag dipakai untuk memutar kamera)
let downX = 0, downY = 0, downT = 0;
renderer.domElement.addEventListener('pointerdown', (e) => {
  downX = e.clientX; downY = e.clientY; downT = performance.now();
});
renderer.domElement.addEventListener('pointerup', (e) => {
  const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
  const limit = e.pointerType === 'touch' ? 12 : 6; // jari lebih "goyang" daripada mouse
  if (moved > limit || performance.now() - downT > 400) return; // drag, bukan klik
  setPointer(e);
  const item = pick();
  if (item) select(item);
});
document.addEventListener('pointerdown', () => audio.click?.());

function select(item) {
  if (active || phase !== 'explore') return;
  active = item;
  hovered = null;
  tooltip.classList.remove('show');
  renderer.domElement.style.cursor = 'default';
  controls.enabled = false;
  setLimits(true);
  exposureTarget = 0.8;
  audio.select();
  audio.whoosh(1.4);
  flyTo(item.cam.pos, item.cam.target, 1.4);
  openPanel(item.id, deselect);
  syncNav(item.id);
}

function deselect() {
  if (!active || closing) return;
  closing = true;
  audio.close();
  audio.whoosh(1.2);
  closePanel();
  syncNav(null);
  exposureTarget = 1.1;
  flyTo(HOME.pos, HOME.target, 1.2, () => {
    setLimits(false);
    controls.enabled = true;
    active = null;
    closing = false;
  });
}

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') deselect();
});

// =====================================================================
// 21. LOADING, INTRO, NAVIGASI
// =====================================================================
// phase: 'loading' -> 'intro' -> 'entering' -> 'explore'
let phase = 'loading';
let exposureSpeed = 0.06;

const loader = document.querySelector('#loader');
const loaderBar = document.querySelector('#loader-bar');
const loaderPct = document.querySelector('#loader-pct');
const intro = document.querySelector('#intro');
const enterBtn = document.querySelector('#enter-btn');
const nav = document.querySelector('#nav');
const navButtons = [...nav.querySelectorAll('button')];
const hint = document.querySelector('#hint');

// Isi teks intro dari data (bukan hardcode)
intro.querySelector('h1').textContent = profile.name.toUpperCase();
intro.querySelector('.intro-role').textContent = profile.role.toUpperCase();

// Kondisi awal: gelap, kamera jauh, kontrol mati
camera.position.set(24, 16, 24);
controls.target.copy(HOME.target);
controls.enabled = false;
setLimits(true); // izinkan kamera berada jauh selama intro
renderer.toneMappingExposure = 0;
exposureTarget = 0;

// Progress loading (simulasi, belum ada aset eksternal besar).
function runLoading(onDone) {
  const duration = 1400;
  const start = performance.now();
  (function step() {
    const k = Math.min((performance.now() - start) / duration, 1);
    loaderPct.textContent = Math.round(k * 100) + '%';
    loaderBar.style.transform = `scaleX(${k})`;
    if (k < 1) requestAnimationFrame(step);
    else onDone();
  })();
}

function startIntro() {
  loader.classList.add('hide');
  phase = 'intro';
  exposureSpeed = 0.015; // lampu menyala pelan-pelan
  exposureTarget = 1.1;
  flyTo(V(15, 11, 15), HOME.target, 6); // mendekat perlahan
  setTimeout(() => {
    intro.classList.add('show');
    enterBtn.focus({ preventScroll: true });
  }, reduceMotion ? 0 : 1800);
}

enterBtn.addEventListener('click', () => {
  if (phase !== 'intro') return;
  audio.start();
  phase = 'entering';
  intro.classList.remove('show');
  exposureSpeed = 0.06;
  flyTo(HOME.pos, HOME.target, 2.2, () => {
    setLimits(false); // kembalikan batas zoom/rotasi normal
    controls.enabled = true;
    phase = 'explore';
    nav.classList.add('show');
    hint.classList.add('show');
    setTimeout(() => hint.classList.remove('show'), 6000);
  });
});

// Navigasi: memicu animasi kamera yang sama seperti klik objek 3D
function syncNav(id) {
  navButtons.forEach((b) => {
    const on = b.dataset.target === id;
    b.classList.toggle('active', on);
    // Di HP menu bisa digeser: pastikan tombol aktif terlihat
    if (on) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  });
}

function goTo(id) {
  const item = interactives.find((i) => i.id === id);
  if (!item || phase !== 'explore' || closing) return;
  if (active) {
    active = item;
    audio.whoosh(1.2);
    flyTo(item.cam.pos, item.cam.target, 1.2);
    openPanel(item.id, deselect);
    syncNav(item.id);
  } else {
    select(item);
  }
}

navButtons.forEach((b) => b.addEventListener('click', () => goTo(b.dataset.target)));

// =====================================================================
// 22. RESIZE & GESER TAMPILAN (agar objek tidak tertutup panel)
// =====================================================================
addEventListener('resize', () => {
  fitCamera();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, LOW_END ? 1.5 : 2));
});

// Saat panel terbuka, gambar digeser: ke kiri di desktop (panel di kanan),
// ke atas di HP (panel di bawah) supaya objek yang dipilih tetap terlihat.
const viewOff = { x: 0, y: 0 };
function updateViewOffset() {
  const panelOpen = !!active && !closing;
  const mobile = innerWidth < 700;
  const tx = panelOpen && !mobile ? innerWidth * 0.12 : 0;
  const ty = panelOpen && mobile ? innerHeight * 0.2 : 0;
  viewOff.x += (tx - viewOff.x) * 0.08;
  viewOff.y += (ty - viewOff.y) * 0.08;
  if (Math.abs(viewOff.x) + Math.abs(viewOff.y) > 0.5) {
    camera.setViewOffset(innerWidth, innerHeight, viewOff.x, viewOff.y, innerWidth, innerHeight);
  } else if (camera.view && camera.view.enabled) {
    camera.clearViewOffset();
  }
}

// =====================================================================
// 23. RENDER LOOP
// =====================================================================
let lastT = performance.now() / 1000;
let lastKeyStep = 0;

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const t = now / 1000;
  const dt = Math.min(t - lastT, 0.1);
  lastT = t;

  // --- animasi karakter ---
  body.scale.y = 1 + Math.sin(t * 1.8) * 0.012;                  // bernapas
  head.rotation.y = Math.sin(t * 0.6) * 0.15;                    // menengok
  head.rotation.x = Math.sin(t * 0.9) * 0.03 - 0.04;
  const blink = (t % 3.5) > 3.38 ? 0.1 : 1;                      // berkedip
  eyes.forEach((e) => (e.scale.y = blink));
  const burst = THREE.MathUtils.smoothstep(Math.sin(t * 0.5), -0.1, 0.4);
  armL.rotation.x = -0.06 + Math.sin(t * 22) * 0.03 * burst;     // mengetik
  armR.rotation.x = -0.06 + Math.sin(t * 22 + 2) * 0.03 * burst;

  // Suara ketikan: satu ketukan tiap setengah siklus gerak tangan
  const keyStep = Math.floor((t * 22) / Math.PI);
  if (burst > 0.6 && keyStep !== lastKeyStep && Math.random() < 0.85) audio.typeKey?.();
  lastKeyStep = keyStep;

  // --- layar VS Code: kode diketik + cahaya berdenyut halus ---
  monScreen.update(t);
  lapScreen.update(t);
  const flick = reduceMotion ? 1 : 1 + Math.sin(t * 9) * 0.012 + Math.sin(t * 2.3) * 0.025;
  monScreenMesh.material.emissiveIntensity = 1.15 * flick;
  lapScreenMesh.material.emissiveIntensity = 1.1 * (2 - flick);
  monitorLight.intensity = 18 * flick;
  if (laptopLight) laptopLight.intensity = 7 * (2 - flick);
  monHalo.material.opacity = 0.5 * flick;
  lapHalo.material.opacity = 0.45 * (2 - flick);
  monSpill.material.opacity = 0.32 * flick;
  lapSpill.material.opacity = 0.28 * (2 - flick);

  // --- animasi kecil & dunia luar (dilewati jika reduced motion) ---
  if (!reduceMotion) {
    steam.forEach((puff, i) => {                                 // uap kopi
      const p = (t * 0.35 + i / 3) % 1;
      puff.position.set(Math.sin(p * 6 + i) * 0.05, 0.38 + p * 0.7, 0);
      puff.scale.setScalar(0.7 + p * 1.2);
      puff.material.opacity = Math.sin(p * Math.PI) * 0.28;
    });
    leaves.forEach((pv, i) => {                                  // daun bergoyang
      pv.rotation.z = Math.sin(t * 1.2 + i) * 0.05;
    });
    leds.forEach((m, i) => {                                     // LED server berkedip
      m.emissiveIntensity = Math.sin(t * 3 + i * 1.7) > 0.3 ? 1 : 0.15;
    });
    cat.scale.y = 1 + Math.sin(t * 1.6) * 0.035;                 // kucing bernapas

    // Neon: dengung halus + sesekali berkedip singkat
    const hum = 0.96 + 0.04 * Math.sin(t * 2.3);
    const glitch = Math.sin(t * 0.45 + 1.0) > 0.985
      ? 0.45 + 0.55 * Math.abs(Math.sin(t * 80))
      : 1;
    neonMat.opacity = hum * glitch;
    neonLight.intensity = 9 * hum * glitch;

    // Dunia luar
    updateClouds(dt);
    starsA.material.opacity = 0.65 + 0.3 * Math.sin(t * 1.3);
    starsB.material.opacity = 0.65 + 0.3 * Math.sin(t * 1.3 + Math.PI);
    islands.forEach((is) => {
      is.g.position.y = is.baseY + Math.sin(t * 0.5 + is.phase) * 0.4;
      is.g.rotation.y = t * 0.05 + is.phase;
    });
    crystals.forEach((c, i) => { c.rotation.y += dt * (0.3 + i * 0.05); });

    const ba = t * 0.05 + 1.0;                                   // balon mengorbit
    balloon.position.set(Math.cos(ba) * 24, 6 + Math.sin(t * 0.4) * 0.6, Math.sin(ba) * 24);
    balloon.rotation.y = -ba;

    const fp = ffGeo.attributes.position;                        // kunang-kunang
    for (let i = 0; i < FF_N; i++) {
      fp.array[i * 3 + 1] += ffSpeed[i] * dt;
      if (fp.array[i * 3 + 1] > 10) fp.array[i * 3 + 1] = -1;
      fp.array[i * 3] += Math.sin(t * 0.6 + ffPhase[i]) * 0.004;
      fp.array[i * 3 + 2] += Math.cos(t * 0.5 + ffPhase[i]) * 0.004;
    }
    fp.needsUpdate = true;
  }

  // --- animasi kamera ---
  if (tween) {
    const k = Math.min((now - tween.start) / tween.duration, 1);
    const e = easeInOutCubic(k);
    camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
    controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
    if (k === 1) {
      const done = tween.onDone;
      tween = null;
      done?.();
    }
  }

  // --- hover (raycast hanya saat mouse bergerak) ---
  if (pointerMoved) {
    pointerMoved = false;
    if (!active && phase === 'explore') {
      const prevHover = hovered;
      hovered = pick();
      if (hovered && hovered !== prevHover) audio.hover();
      renderer.domElement.style.cursor = hovered ? 'pointer' : 'default';
      tooltip.textContent = hovered ? hovered.label : '';
      tooltip.classList.toggle('show', !!hovered);
    }
  }

  // --- skala halus saat hover / terpilih ---
  for (const i of interactives) {
    const target = i === hovered || i === active ? 1.06 : 1;
    i.s += (target - i.s) * 0.15;
    i.object.scale.setScalar(i.s);
  }

  // --- redup / terang perlahan ---
  renderer.toneMappingExposure += (exposureTarget - renderer.toneMappingExposure) * exposureSpeed;

  updateViewOffset();
  controls.update();
  renderer.render(scene, camera);
}

// Mulai paling akhir: semua variabel di atas sudah terdefinisi
runLoading(startIntro);
animate();