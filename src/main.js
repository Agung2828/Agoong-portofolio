import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { openPanel, closePanel } from './panel.js';
import { profile } from './data.js';
import { AudioManager } from './Audiomanager.js'; // sesuaikan nama file: audiomanager.js
import { initAudioUI } from './audio-ui.js';
import { hasWebGL, getQuality, createAutoScaler } from './quality.js';
import { showFallback } from './fallback.js';
const audio = new AudioManager();
initAudioUI(audio);

// =====================================================================
// 1. SCENE, CAMERA, RENDERER
// =====================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
scene.fog = new THREE.Fog(0x0b1020, 18, 40);

const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
camera.position.set(11, 9, 11);

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#scene'),
  antialias: true,
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

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

// Kotak membulat + otomatis membuat/menerima bayangan
function box(w, h, d, color, x = 0, y = 0, z = 0, parent = scene) {
  const radius = Math.min(0.05, Math.min(w, h, d) * 0.45);
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, d, 3, radius),
    new THREE.MeshStandardMaterial({ color, roughness: 0.75 })
  );
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

// Angka acak yang hasilnya selalu sama (supaya susunan buku tidak berubah tiap refresh)
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

// =====================================================================
// 4. PLATFORM & RUANGAN
// =====================================================================
box(12, 0.8, 12, 0x252d4a, 0, -0.4, 0);        // dasar platform
box(11.2, 0.12, 11.2, 0xc8a07a, 0, 0.06, 0);   // lantai kayu
box(11.2, 5.5, 0.3, 0xe9dfcf, 0, 2.8, -5.45);  // dinding belakang
box(0.3, 5.5, 11.2, 0xded3c0, -5.45, 2.8, 0);  // dinding kiri

// =====================================================================
// 5. MEJA
// =====================================================================
const desk = new THREE.Group();
desk.position.set(0, 0, -2.5);
scene.add(desk);

box(5.6, 0.2, 2.4, 0x8b5a2b, 0, 2.0, 0, desk); // papan meja
for (const [lx, lz] of [[-2.6, -1.0], [2.6, -1.0], [-2.6, 1.0], [2.6, 1.0]]) {
  box(0.2, 1.9, 0.2, 0x6b4220, lx, 1.0, lz, desk); // 4 kaki
}

// =====================================================================
// 6. MONITOR
// =====================================================================
const monitor = new THREE.Group();
monitor.position.set(0, 2.1, -0.5);
desk.add(monitor);

box(0.9, 0.06, 0.5, 0x2b2f3a, 0, 0.03, 0, monitor);    // alas
box(0.14, 0.7, 0.14, 0x2b2f3a, 0, 0.4, 0, monitor);    // leher
box(2.6, 1.5, 0.12, 0x1c1f2a, 0, 1.4, 0, monitor);     // bingkai
glowScreen(2.4, 1.3, 0x3fa9f5, 0, 1.4, 0.07, monitor); // layar

// =====================================================================
// 7. LAPTOP
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
glowScreen(1.18, 0.73, 0x7be0c3, 0, 0.43, 0.03, lid);

// =====================================================================
// 8. SMARTPHONE
// =====================================================================
const phone = new THREE.Group();
phone.position.set(-1.9, 2.1, 0.4);
phone.rotation.y = 0.5;
desk.add(phone);

box(0.38, 0.05, 0.75, 0x1c1f2a, 0, 0.025, 0, phone);
const phoneScreen = glowScreen(0.32, 0.66, 0xff9f5a, 0, 0.055, 0, phone);
phoneScreen.rotation.x = -Math.PI / 2;

// =====================================================================
// 9. MUG KOPI
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
// 10. LAMPU MEJA
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
// 11. PENCAHAYAAN
// =====================================================================
// Cahaya langit lembut (biru atas, gelap bawah)
scene.add(new THREE.HemisphereLight(0x6f8fff, 0x1a1a2e, 0.7));

// "Bulan": cahaya utama pembuat bayangan
const moon = new THREE.DirectionalLight(0x9db4ff, 1.4);
moon.position.set(7, 12, 7);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
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

// Cahaya monitor: DINGIN
const monitorLight = new THREE.PointLight(0x4fb3ff, 14, 9, 2);
monitorLight.position.set(0, 3.7, -2.0);
scene.add(monitorLight);

// =====================================================================
// 12. KEYBOARD
// =====================================================================
box(1.5, 0.06, 0.5, 0x2b2f3a, 0, 2.13, 0.6, desk);
for (let r = 0; r < 3; r++) {
  box(1.36, 0.03, 0.1, 0x454b5c, 0, 2.18, 0.45 + r * 0.14, desk); // baris tombol
}

// =====================================================================
// 13. DEVELOPER (karakter + kursi)
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

// =====================================================================
// 14. OBJEK TAMBAHAN (tahap 6)
// =====================================================================
const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.8 });

// ---------- RAK BUKU (Experience) ----------
const bookshelf = new THREE.Group();
bookshelf.position.set(3.9, 0.12, -4.9); // menempel di dinding belakang, sisi kanan
scene.add(bookshelf);

const WOOD = 0x7a4e2a;
box(2.2, 4.2, 0.08, 0x5e3b20, 0, 2.1, -0.36, bookshelf); // panel belakang
box(0.1, 4.2, 0.8, WOOD, -1.05, 2.1, 0, bookshelf);      // sisi kiri
box(0.1, 4.2, 0.8, WOOD, 1.05, 2.1, 0, bookshelf);       // sisi kanan
const shelfTops = [0.1, 1.15, 2.2, 3.25, 4.2];
shelfTops.forEach((top) => box(2.2, 0.1, 0.8, WOOD, 0, top - 0.05, 0, bookshelf));

// Buku-buku (susunan acak tapi selalu sama)
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

// Tanaman di atas rak (daunnya bergoyang pelan)
const plant = new THREE.Group();
plant.position.set(-0.6, 4.2, 0);
bookshelf.add(plant);
const pot = new THREE.Mesh(
  new THREE.CylinderGeometry(0.2, 0.15, 0.28, 20),
  new THREE.MeshStandardMaterial({ color: 0xc66b3d, roughness: 0.8 })
);
pot.position.y = 0.14;
pot.castShadow = true;
plant.add(pot);

const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f9d5d, roughness: 0.7 });
const leafGeo = new THREE.SphereGeometry(0.16, 12, 12);
const leaves = [];
for (let i = 0; i < 5; i++) {
  const pivot = new THREE.Group();
  pivot.position.y = 0.28;
  pivot.rotation.y = (i / 5) * Math.PI * 2;
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.scale.set(0.5, 1.8, 0.25);
  leaf.position.set(0.12, 0.3, 0);
  leaf.rotation.z = -0.35;
  leaf.castShadow = true;
  pivot.add(leaf);
  plant.add(pivot);
  leaves.push(pivot);
}

// ---------- TUMPUKAN BUKU + TOPI WISUDA (Education) ----------
const education = new THREE.Group();
education.position.set(2.2, 2.1, -0.8); // pojok kanan-belakang meja
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

// ---------- SERTIFIKAT DI DINDING (Certificates) ----------
const certificates = new THREE.Group();
certificates.position.set(-2.4, 3.95, -5.25);
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

// ---------- DASHBOARD DI DINDING (Developer Stats) ----------
const dashboard = new THREE.Group();
dashboard.position.set(0.9, 4.1, -5.25);
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

// ---------- MAP RESUME (Resume) ----------
const resume = new THREE.Group();
resume.position.set(2.45, 2.1, 0.85); // kanan-depan meja, di samping laptop
resume.rotation.y = 0.15;
desk.add(resume);

box(0.55, 0.04, 0.62, 0xd9a441, 0, 0.02, 0, resume);          // map
box(0.5, 0.012, 0.56, 0xf4f0e6, 0, 0.046, -0.01, resume);     // kertas
box(0.2, 0.04, 0.07, 0xc48f2e, -0.12, 0.02, -0.33, resume);   // tab map
[0.12, 0.04, -0.04].forEach((z) => box(0.34, 0.006, 0.02, 0x9a958a, 0, 0.055, z, resume));

// ---------- EASTER EGG: SERVER RACK ----------
const rack = new THREE.Group();
rack.position.set(-4.8, 0.12, 0.8);
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

// ---------- EASTER EGG: POSTER 404 ----------
const poster = new THREE.Group();
poster.position.set(-5.25, 3.5, -1.5);
scene.add(poster);
box(0.05, 1.3, 1.0, 0x20242f, 0, 0, 0, poster);
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
poster.add(posterFace);

// =====================================================================
// 15. INTERAKSI (raycaster, hover, klik, kamera terbang)
// =====================================================================
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    cam: { pos: V(-1.5, 4.8, -1.2), target: V(-2.4, 3.9, -5.2) }
  },
  {
    id: 'stats', label: 'Developer Stats', object: dashboard,
    cam: { pos: V(1.8, 5.2, -0.8), target: V(0.9, 4.1, -5.25) }
  },
  {
    id: 'resume', label: 'View Resume', object: resume,
    cam: { pos: V(4.2, 4.2, 0.6), target: V(2.45, 2.2, -1.65) }
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

// Bedakan KLIK dengan DRAG (drag dipakai untuk memutar kamera)
let downX = 0, downY = 0, downT = 0;
renderer.domElement.addEventListener('pointerdown', (e) => {
  downX = e.clientX; downY = e.clientY; downT = performance.now();
});
renderer.domElement.addEventListener('pointerup', (e) => {
  const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
  if (moved > 6 || performance.now() - downT > 400) return; // drag, bukan klik
  setPointer(e);
  const item = pick();
  if (item) select(item);
});

function select(item) {
  if (active || phase !== 'explore') return;
  active = item;
  hovered = null;
  tooltip.classList.remove('show');
  renderer.domElement.style.cursor = 'default';
  controls.enabled = false;
  setLimits(true);
  exposureTarget = 0.8; // redupkan scene
  flyTo(item.cam.pos, item.cam.target, 1.4);
  openPanel(item.id, deselect);
  syncNav(item.id);
}

function deselect() {
  if (!active || closing) return;
  closing = true;
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
// 16. LOADING, INTRO, NAVIGASI
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

// Progress loading (simulasi, belum ada aset eksternal).
// Saat nanti memuat model/audio, ganti dengan THREE.LoadingManager.onProgress.
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
  navButtons.forEach((b) => b.classList.toggle('active', b.dataset.target === id));
}

function goTo(id) {
  const item = interactives.find((i) => i.id === id);
  if (!item || phase !== 'explore' || closing) return;
  if (active) { // panel sudah terbuka: pindah langsung
    active = item;
    flyTo(item.cam.pos, item.cam.target, 1.2);
    openPanel(item.id, deselect);
    syncNav(item.id);
  } else {
    select(item);
  }
}

navButtons.forEach((b) => b.addEventListener('click', () => goTo(b.dataset.target)));

// =====================================================================
// 17. RESIZE
// =====================================================================
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// =====================================================================
// 18. RENDER LOOP
// =====================================================================
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const t = now / 1000;

  // --- animasi karakter ---
  body.scale.y = 1 + Math.sin(t * 1.8) * 0.012;                  // bernapas
  head.rotation.y = Math.sin(t * 0.6) * 0.15;                    // menengok
  head.rotation.x = Math.sin(t * 0.9) * 0.03 - 0.04;
  const blink = (t % 3.5) > 3.38 ? 0.1 : 1;                      // berkedip
  eyes.forEach((e) => (e.scale.y = blink));
  const burst = THREE.MathUtils.smoothstep(Math.sin(t * 0.5), -0.1, 0.4);
  armL.rotation.x = -0.06 + Math.sin(t * 22) * 0.03 * burst;     // mengetik
  armR.rotation.x = -0.06 + Math.sin(t * 22 + 2) * 0.03 * burst;

  // --- animasi kecil (dilewati jika reduced motion) ---
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
      hovered = pick();
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

  controls.update();
  renderer.render(scene, camera);
}
function boot() {
  const q = getQuality();

  // ... kode lama kamu, dengan 3 perubahan ini:
  const renderer = new THREE.WebGLRenderer({ antialias: q.antialias, powerPreference: 'high-performance' });
  renderer.setPixelRatio(q.pixelRatio);
  renderer.shadowMap.enabled = q.shadows;

  // di setiap lampu yang punya bayangan:
  // light.castShadow = q.shadows;
  // light.shadow.mapSize.set(q.shadowSize, q.shadowSize);

  const autoScale = createAutoScaler(renderer);
  // di dalam loop animate(), tambahkan satu baris:
  // autoScale();

  // tangani context hilang (sering terjadi di HP saat memori penuh)
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    showFallback('Tampilan 3D terhenti karena memori grafis habis. Muat ulang halaman.');
  });
}

if (hasWebGL()) boot();
else showFallback();
// Mulai paling akhir: semua variabel di atas sudah terdefinisi
runLoading(startIntro);
animate();