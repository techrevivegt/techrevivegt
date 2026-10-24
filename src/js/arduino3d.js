/* TechRevive · Laboratorio 3D de Arduino y robótica (Three.js r170).
   Se activa en lecciones de tipo «Simulador» con la opción «Arduino 3D» (<section class="a3d" data-a3d>).
   Incluye: placa UNO en 3D con marcadores, editor de código «Pruébalo tú» con mini-intérprete
   (pinMode, digitalWrite/Read, analogWrite/Read, delay, Serial, if/else, for) y 7 prácticas guiadas.
   Unidades de la escena: 1 = 1 cm. */
import * as THREE from "./vendor/three.module.min.js";
import { OrbitControls } from "./vendor/OrbitControls.js";

const root = document.querySelector(".a3d[data-a3d]");
const SAVE_KEY = "tr-a3d:v1";
const LESSON = (document.querySelector("[data-lesson]") || root || document.body).getAttribute("data-lesson") || "arduino3d";
const $ = (s, el) => (el || root).querySelector(s);
const $$ = (s, el) => Array.prototype.slice.call((el || root).querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ───────────── estado persistente ───────────── */
let SAVE = { done: {}, code: {} };
try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) {}
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };
let SENT = false;

/* ───────────── estilos inyectados (todo en este archivo) ───────────── */
const CSS = `
.a3d{font-family:inherit;--a3d-teal:#00979d;--a3d-cream:#f6f2ea;--a3d-ink:#2b2b2b;--a3d-line:#d9d2c4;color:var(--a3d-ink)}
.a3d__wrap{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,1fr);grid-template-rows:auto auto;gap:14px;margin:18px 0}
.a3d__stage{position:relative;min-height:440px;border-radius:14px;overflow:hidden;background:radial-gradient(120% 90% at 30% 18%,#fdfcf8 0%,var(--a3d-cream) 55%,#ece5d6 100%);border:1px solid var(--a3d-line);box-shadow:0 10px 26px rgba(60,50,30,.10)}
.a3d__stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.a3d__markers{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.a3d__dot{position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:#fff;border:2px solid var(--a3d-teal);color:var(--a3d-teal);font:700 11px/18px inherit;text-align:center;cursor:pointer;pointer-events:auto;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:transform .15s}
.a3d__dot:hover{transform:scale(1.2)}
.a3d__dot.is-open{background:var(--a3d-teal);color:#fff}
.a3d__card{position:absolute;max-width:230px;background:#fff;border:1px solid var(--a3d-line);border-radius:10px;padding:10px 12px;box-shadow:0 10px 24px rgba(0,0,0,.16);pointer-events:auto;font-size:13px}
.a3d__card h5{margin:0 0 4px;font-size:13px;color:var(--a3d-teal)}
.a3d__card p{margin:0;line-height:1.45;color:#555}
.a3d__card::before{content:"";position:absolute;top:-6px;left:18px;width:10px;height:10px;background:#fff;border-left:1px solid var(--a3d-line);border-top:1px solid var(--a3d-line);transform:rotate(45deg)}
.a3d__toast{position:absolute;left:50%;bottom:12px;transform:translateX(-50%) translateY(6px);background:#26221c;color:#fff;padding:9px 16px;border-radius:999px;font-size:13px;opacity:0;transition:.25s;pointer-events:none;max-width:88%;text-align:center}
.a3d__toast.is-on{opacity:1;transform:translateX(-50%)}
.a3d__toast--ok{background:#166534}.a3d__toast--warn{background:#b45309}.a3d__toast--err{background:#b91c1c}
.a3d__hud{position:absolute;top:10px;left:10px;display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.9);border:1px solid var(--a3d-line);border-radius:999px;padding:6px 12px;font-size:12.5px}
.a3d__hud b{color:var(--a3d-teal)}
.a3d__panel{display:flex;flex-direction:column;background:#fffdf8;border:1px solid var(--a3d-line);border-radius:14px;overflow:hidden;min-height:440px}
.a3d__tabs{display:flex;border-bottom:1px solid var(--a3d-line);background:#efe9dc}
.a3d__tabs button{flex:1;padding:9px 4px;background:none;border:0;font:700 11.5px inherit;letter-spacing:.06em;color:#8a8071;cursor:pointer;border-bottom:2px solid transparent}
.a3d__tabs button.is-on{color:var(--a3d-ink);border-bottom-color:var(--a3d-teal)}
.a3d__tabbody{padding:14px 16px;font-size:13.5px;line-height:1.55;overflow:auto;max-height:220px}
.a3d__tabbody h3{margin:0 0 6px;font-size:17px;letter-spacing:.04em}
.a3d__tabbody ul{margin:8px 0 0;padding:0;list-style:none}
.a3d__tabbody li{display:flex;gap:8px;margin:5px 0;color:#4d4639}
.a3d__tabbody li b{color:var(--a3d-teal)}
.a3d__pins{width:100%;border-collapse:collapse;font-size:12.5px}
.a3d__pins td,.a3d__pins th{border-bottom:1px solid #eee5d5;padding:5px 8px;text-align:left}
.a3d__pins td:first-child{font-weight:700;color:var(--a3d-teal);white-space:nowrap}
.a3d__try{border-top:1px solid var(--a3d-line);display:flex;flex-direction:column;flex:1;min-height:230px;background:#fbf8f1}
.a3d__tryhead{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--a3d-line)}
.a3d__tryhead strong{font:700 11.5px inherit;letter-spacing:.06em;color:#6b6353;flex:1}
.a3d__btn{border:1px solid var(--a3d-line);background:#fff;border-radius:8px;padding:5px 10px;font:600 12px inherit;cursor:pointer;color:#444}
.a3d__btn:hover{background:#f3eee3}
.a3d__btn--run{background:var(--a3d-teal);border-color:var(--a3d-teal);color:#fff}
.a3d__btn[data-a3d-stop]{background:#b91c1c;border-color:#b91c1c;color:#fff}
.a3d__btn--run:hover{filter:brightness(1.08)}
.a3d__code{font:13px/1.55 "Cascadia Code",Consolas,monospace;background:#1c2027;color:#e6e6e6;border:0;border-radius:0;padding:12px;flex:1;resize:none;min-height:130px;outline:none;white-space:pre;tab-size:2}
.a3d__status{padding:6px 12px;font-size:12px;color:#6b6353;border-top:1px solid var(--a3d-line)}
.a3d__status.is-run{color:#166534}.a3d__status.is-err{color:#b91c1c;font-weight:600}
.a3d__console{background:#101319;color:#9fd7a5;font:11.5px/1.5 Consolas,monospace;padding:8px 12px;max-height:110px;overflow:auto;border-top:1px solid var(--a3d-line)}
.a3d__console:empty{display:none}
.a3d__console div{white-space:pre-wrap}
.a3d__console .is-err{color:#ff8a80}
.a3d__ctl{display:flex;align-items:center;gap:10px;padding:8px 12px;border-top:1px solid var(--a3d-line);font-size:12px;flex-wrap:wrap}
.a3d__ctl[hidden]{display:none}
.a3d__ctl label{display:flex;align-items:center;gap:6px;font-weight:600;color:#6b6353}
.a3d__ctl input[type=range]{accent-color:var(--a3d-teal)}
.a3d__strip{grid-column:1/-1;display:flex;gap:10px;overflow-x:auto;padding:4px 2px}
.a3d__cardles{min-width:150px;flex:1;background:#fffdf8;border:1px solid var(--a3d-line);border-radius:12px;padding:10px 12px;cursor:pointer;display:flex;gap:10px;align-items:center;transition:.15s;text-align:left}
.a3d__cardles:hover{border-color:var(--a3d-teal)}
.a3d__cardles.is-on{border-color:var(--a3d-teal);box-shadow:0 0 0 2px rgba(0,151,157,.2)}
.a3d__ic{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;font-size:20px;background:linear-gradient(145deg,#e8f6f6,#cfeeee);flex:none}
.a3d__cardles small{display:block;color:#9a9077;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase}
.a3d__cardles span{font:600 12.5px inherit;color:#3d372c}
.a3d__cardles .a3d__tick{margin-left:auto;color:#166534;font-weight:800}
.a3d__fs{position:absolute;top:10px;right:10px;z-index:5}
@media(max-width:900px){.a3d__wrap{grid-template-columns:1fr}.a3d__stage{min-height:340px}.a3d__tabbody{max-height:180px}}
`;
const styleEl = document.createElement("style");
styleEl.textContent = CSS;
document.head.appendChild(styleEl);

/* ───────────── esqueleto HTML ───────────── */
root.innerHTML = `
<div class="a3d__wrap">
  <div class="a3d__stage">
    <canvas data-a3d-canvas></canvas>
    <div class="a3d__markers" data-a3d-markers></div>
    <div class="a3d__hud">🧪 <b data-a3d-hud>Práctica 1 de 7</b><span data-a3d-prog>0/7 completadas</span><button class="a3d__btn" data-a3d-reset title="Reiniciar el progreso">Reiniciar progreso</button></div>
    <button class="a3d__btn a3d__fs" data-a3d-fs title="Pantalla completa">⛶</button>
    <div class="a3d__toast" data-a3d-toast></div>
  </div>
  <aside class="a3d__panel">
    <div class="a3d__tabs" data-a3d-tabs></div>
    <div class="a3d__tabbody" data-a3d-tabbody></div>
    <div class="a3d__try">
      <div class="a3d__tryhead"><strong>🔧 PRUÉBALO TÚ (código Arduino)</strong>
        <button class="a3d__btn a3d__btn--run" data-a3d-run>▶ Ejecutar</button>
        <button class="a3d__btn" data-a3d-stop hidden>■ Detener</button>
        <button class="a3d__btn" data-a3d-restore title="Volver al código original">↺</button>
      </div>
      <textarea class="a3d__code" data-a3d-code spellcheck="false"></textarea>
      <div class="a3d__status" data-a3d-status>■ Detenido. Escribí tu código y pulsá Ejecutar.</div>
      <div class="a3d__ctl" data-a3d-ctl hidden></div>
      <div class="a3d__console" data-a3d-console></div>
    </div>
  </aside>
  <nav class="a3d__strip" data-a3d-strip aria-label="Prácticas"></nav>
</div>`;

/* ───────────── boot Three.js ───────────── */
const canvas = $("[data-a3d-canvas]");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

let scene = null, camera = null, controls = null, world = null;

function bootScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  camera.position.set(10, 11, 13);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd8c9a8, 0.95);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff6e5, 1.9);
  key.position.set(8, 14, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -14; key.shadow.camera.right = 14;
  key.shadow.camera.top = 14; key.shadow.camera.bottom = -14;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfe3ff, 0.5);
  fill.position.set(-9, 6, -6);
  scene.add(fill);
  world = new THREE.Group();
  scene.add(world);
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 45;
  controls.maxPolarAngle = 1.45;
  controls.target.set(2.5, 0.5, 0);
}
bootScene();

function sizeStage() {
  const stage = $(".a3d__stage");
  const w = stage.clientWidth || 600, h = stage.clientHeight || 440;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(sizeStage).observe($(".a3d__stage"));

/* ───────────── utilidades 3D ───────────── */
function mat(c, o) {
  o = o || {};
  return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0.08 }, o));
}
function mesh(geo, m, x, y, z, shadow) {
  const ms = new THREE.Mesh(geo, m);
  ms.position.set(x || 0, y || 0, z || 0);
  if (shadow !== false) { ms.castShadow = true; ms.receiveShadow = true; }
  return ms;
}
function box(w, h, d, m, x, y, z) { return mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z); }
function cyl(rt, rb, h, m, x, y, z, seg) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), m, x, y, z); }

function canvasTex(w, h, fn) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  fn(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function ground(size, big) {
  const g = new THREE.Group();
  const plane = mesh(new THREE.PlaneGeometry(size * 2, size * 2), mat(0xf3eee2, { roughness: 1 }), 0, 0, 0, false);
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  g.add(plane);
  const grid = new THREE.GridHelper(size * 2, big ? size : size * 2, 0xd9d0bd, 0xe6dfce);
  grid.position.y = 0.01;
  grid.material.opacity = 0.6; grid.material.transparent = true;
  g.add(grid);
  return { g, plane };
}

function wire(from, to, color, lift) {
  lift = lift == null ? 1.2 : lift;
  const mid1 = new THREE.Vector3(from.x, from.y + lift, from.z);
  const mid2 = new THREE.Vector3(to.x, to.y + lift, to.z);
  const curve = new THREE.CatmullRomCurve3([from, mid1, mid2, to]);
  const m = mesh(new THREE.TubeGeometry(curve, 24, 0.045, 6), mat(color, { roughness: 0.35 }));
  m.castShadow = false;
  return m;
}

/* ───────────── componentes 3D ───────────── */
const MATS = {
  pcb: mat(0x0b5da8, { roughness: 0.35 }),
  pcbDark: mat(0x0a4f8f, { roughness: 0.4 }),
  metal: mat(0xb9c0c8, { roughness: 0.25, metalness: 0.8 }),
  black: mat(0x26282b, { roughness: 0.5 }),
  pinBlack: mat(0x1c1e20, { roughness: 0.6 }),
  white: mat(0xffffff, { roughness: 0.5 }),
  cream: mat(0xf1ede2, { roughness: 0.8 }),
};

function boardSilk() {
  return canvasTex(512, 400, (x) => {
    x.fillStyle = "#0b5da8"; x.fillRect(0, 0, 512, 400);
    x.fillStyle = "#ffffff"; x.font = "900 46px Arial";
    x.fillText("ARDUINO", 26, 70);
    x.fillStyle = "#8ec9ee"; x.font = "900 44px Arial"; x.fillText("UNO", 250, 70);
    x.strokeStyle = "#ffffff"; x.lineWidth = 5;
    x.beginPath(); x.ellipse(70, 130, 42, 20, 0, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.moveTo(52, 130); x.lineTo(88, 130); x.moveTo(70, 112); x.lineTo(70, 148); x.stroke();
    x.fillStyle = "#ffffff"; x.font = "700 15px Arial";
    [["DIGITAL (PWM~)", 20, 210], ["0 1 2 3 4 5 6 7  8 9 10 11 12 13", 20, 235],
     ["ANALOG IN   A0 A1 A2 A3 A4 A5", 20, 300], ["POWER  5V 3V3 GND VIN RST", 20, 350]].forEach(r => x.fillText(r[0], r[1], r[2]));
    x.fillStyle = "#ffffff"; x.font = "400 12px Arial";
    x.fillText("Simulador educativo · TechRevive", 20, 382);
  });
}

function pinStrip(n, x0, z0, dx) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const p = new THREE.Group();
    p.add(box(0.22, 0.42, 0.22, MATS.pinBlack, 0, 0.21, 0));
    p.add(box(0.1, 0.34, 0.1, MATS.metal, 0, 0.55, 0));
    p.position.set(x0 + i * dx, 0, z0);
    g.add(p);
  }
  return g;
}

function buildUNO() {
  const g = new THREE.Group();
  /* PCB con serigrafía */
  const pcb = box(6.86, 0.16, 5.34, MATS.pcb, 0, 0.08, 0);
  g.add(pcb);
  const silk = mesh(new THREE.PlaneGeometry(6.7, 5.2), new THREE.MeshStandardMaterial({ map: boardSilk(), roughness: 0.5 }), 0, 0.165, 0, false);
  silk.rotation.x = -Math.PI / 2;
  g.add(silk);
  /* USB-B y jack de poder */
  g.add(box(1.7, 1.15, 1.55, MATS.metal, -2.9, 0.75, -1.7));
  g.add(box(0.7, 0.55, 0.6, MATS.black, -2.9, 1.5, -1.7));
  const jack = cyl(0.62, 0.62, 1.5, MATS.black, -2.5, 0.78, 1.9);
  jack.rotation.z = Math.PI / 2;
  g.add(jack);
  g.add(cyl(0.18, 0.18, 0.14, MATS.metal, -3.3, 0.78, 1.9));
  /* Tiras de pines: digital (fondo) y analógica/poder (frente) */
  const mkStrip = (n, x0, z) => pinStrip(n, x0, z, 0.42);
  g.add(mkStrip(8, -2.2, -2.45));
  g.add(mkStrip(10, 0.4, -2.45));
  g.add(mkStrip(6, 0.4, 2.45));
  g.add(mkStrip(8, -2.2, 2.45));
  /* Microcontrolador ATmega328P */
  const mcu = box(0.9, 0.22, 3.1, MATS.black, -0.9, 0.27, 0.15);
  g.add(mcu);
  const mcuTag = mesh(new THREE.PlaneGeometry(0.75, 2.7), new THREE.MeshStandardMaterial({ map: canvasTex(128, 400, (x) => { x.fillStyle = "#26282b"; x.fillRect(0, 0, 128, 400); x.save(); x.translate(64, 200); x.rotate(-Math.PI / 2); x.fillStyle = "#e8e8e8"; x.font = "700 26px Arial"; x.textAlign = "center"; x.fillText("ATmega328P", 0, 8); x.restore(); }), roughness: 0.6 }), -0.9, 0.385, 0.15, false);
  mcuTag.rotation.x = -Math.PI / 2;
  g.add(mcuTag);
  /* Cristal, reset, capacitores, LEDs de placa */
  g.add(box(0.85, 0.18, 0.32, MATS.metal, 0.35, 0.25, -0.9));
  g.add(box(0.55, 0.3, 0.55, mat(0x2f6fb3), -1.7, 0.32, -2.0));
  g.add(cyl(0.08, 0.08, 0.1, MATS.white, -1.7, 0.5, -2.0));
  g.add(cyl(0.3, 0.3, 0.6, MATS.metal, 1.15, 0.46, 1.2));
  g.add(cyl(0.3, 0.3, 0.6, MATS.metal, 1.15, 0.46, 2.0));
  const ledOn = box(0.28, 0.06, 0.18, mat(0x2f7d32, { emissive: 0x2f7d32, emissiveIntensity: 1.2 }), 2.3, 0.2, 0.4);
  const ledL = box(0.28, 0.06, 0.18, mat(0xb98500, { emissive: 0xffb400, emissiveIntensity: 0.05 }), 1.9, 0.2, 0.4);
  g.add(ledOn); g.add(ledL);
  const tagOn = mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshBasicMaterial({ map: canvasTex(64, 32, (x) => { x.fillStyle = "rgba(0,0,0,0)"; x.clearRect(0, 0, 64, 32); x.fillStyle = "#fff"; x.font = "700 22px Arial"; x.fillText("ON", 2, 24); }), transparent: true }), 2.3, 0.17, 0.75, false);
  tagOn.rotation.x = -Math.PI / 2; g.add(tagOn);
  /* agujeros de montaje */
  [[-3.05, -2.3], [3.05, -2.3], [3.05, 2.3], [-3.05, 2.3]].forEach((h) => g.add(cyl(0.16, 0.16, 0.02, MATS.black, h[0], 0.17, h[1])));
  return { g, ledOn, ledL, pins: { 13: new THREE.Vector3(3.32, 0.42, -2.45), 9: new THREE.Vector3(1.13, 0.42, -2.45), 10: new THREE.Vector3(1.55, 0.42, -2.45), 11: new THREE.Vector3(1.97, 0.42, -2.45), 6: new THREE.Vector3(-0.47, 0.42, -2.45), 2: new THREE.Vector3(-1.35, 0.42, -2.45), A0: new THREE.Vector3(0.4, 0.42, 2.45), A1: new THREE.Vector3(0.82, 0.42, 2.45), A2: new THREE.Vector3(1.24, 0.42, 2.45), A3: new THREE.Vector3(1.66, 0.42, 2.45), "5V": new THREE.Vector3(-1.35, 0.42, 2.45), GND: new THREE.Vector3(-0.93, 0.42, 2.45) } };
}

function buildBreadboard(x0, z0) {
  const g = new THREE.Group();
  g.position.set(x0, 0, z0);
  const tex = canvasTex(512, 360, (x) => {
    x.fillStyle = "#f5f3ed"; x.fillRect(0, 0, 512, 360);
    x.fillStyle = "#d9534f"; x.fillRect(0, 12, 512, 7); x.fillRect(0, 341, 512, 7);
    x.fillStyle = "#428bca"; x.fillRect(0, 26, 512, 7); x.fillRect(0, 327, 512, 7);
    x.fillStyle = "#b8b2a2";
    for (let r = 0; r < 10; r++) for (let c = 0; c < 30; c++) x.fillRect(10 + c * 16.6, 52 + r * 27, 7, 7);
    x.fillStyle = "#a39d8d"; x.fillRect(0, 176, 512, 8);
  });
  g.add(box(5.6, 0.85, 4.0, mat(0xf5f3ed, { roughness: 0.9 }), 0, 0.43, 0));
  const top = mesh(new THREE.PlaneGeometry(5.5, 3.9), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 0, 0.865, 0, false);
  top.rotation.x = -Math.PI / 2;
  g.add(top);
  return g;
}

const bbHole = (bx, col, row) => new THREE.Vector3(bx.x - 2.75 + col * 0.31, 0.9, bx.z - 1.75 + row * 0.5);

function buildLED(color, glowMat) {
  const g = new THREE.Group();
  const dome = mesh(new THREE.SphereGeometry(0.3, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2), glowMat, 0, 0.42, 0);
  const rim = cyl(0.32, 0.34, 0.18, glowMat, 0, 0.35, 0);
  const leg1 = box(0.05, 0.55, 0.05, MATS.metal, -0.12, 0.05, 0);
  const leg2 = box(0.05, 0.42, 0.05, MATS.metal, 0.12, -0.02, 0);
  g.add(dome, rim, leg1, leg2);
  return { g, dome, rim };
}
function ledMat(color, intensity) { return mat(color, { roughness: 0.25, emissive: color, emissiveIntensity: intensity }); }

function buildResistor() {
  const g = new THREE.Group();
  const body = cyl(0.11, 0.11, 0.6, mat(0xd9bd7f, { roughness: 0.7 }), 0, 0.35, 0);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  [[-0.15, 0x8a4b0f], [-0.05, 0xc0392b], [0.05, 0x8a4b0f], [0.15, 0xd4af37]].forEach((b) => {
    const ring = mesh(new THREE.TorusGeometry(0.115, 0.025, 8, 18), mat(b[1]), b[0], 0.35, 0);
    ring.rotation.y = Math.PI / 2;
    g.add(ring);
  });
  const leg1 = box(0.04, 0.5, 0.04, MATS.metal, -0.42, 0.16, 0);
  const leg2 = box(0.04, 0.5, 0.04, MATS.metal, 0.42, 0.16, 0);
  g.add(leg1, leg2);
  return g;
}

function buildButton() {
  const g = new THREE.Group();
  g.add(box(0.62, 0.24, 0.62, MATS.black, 0, 0.32, 0));
  g.add(box(0.68, 0.06, 0.2, MATS.metal, 0, 0.45, 0));
  g.add(box(0.2, 0.06, 0.68, MATS.metal, 0, 0.45, 0));
  const plunger = cyl(0.16, 0.16, 0.16, mat(0xe8e8e8, { roughness: 0.4 }), 0, 0.52, 0);
  g.add(plunger);
  return { g, plunger };
}

function buildPot() {
  const g = new THREE.Group();
  g.add(box(0.78, 0.5, 0.78, mat(0x2657a8, { roughness: 0.4 }), 0, 0.25, 0));
  g.add(cyl(0.24, 0.24, 0.1, MATS.metal, 0, 0.55, 0));
  const knob = new THREE.Group();
  knob.add(cyl(0.2, 0.2, 0.34, MATS.white, 0, 0, 0));
  const mark = box(0.28, 0.05, 0.07, MATS.black, 0.06, 0.18, 0);
  knob.add(mark);
  knob.position.y = 0.78;
  g.add(knob);
  return { g, knob };
}

function buildRGB() {
  const g = new THREE.Group();
  const domeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, transparent: true, opacity: 0.65, emissive: 0xffffff, emissiveIntensity: 0.06 });
  const dome = mesh(new THREE.SphereGeometry(0.34, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2), domeMat, 0, 0.44, 0);
  const rim = cyl(0.36, 0.38, 0.16, domeMat, 0, 0.36, 0);
  g.add(dome, rim);
  [-0.24, -0.08, 0.08, 0.24].forEach((x) => g.add(box(0.045, 0.5, 0.045, MATS.metal, x, 0.03, 0)));
  return { g, domeMat };
}

function buildTIP120() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.42, 0.3, MATS.black, 0, 0.42, 0));
  g.add(box(0.56, 0.3, 0.05, MATS.metal, 0, 0.79, 0.1));
  g.add(cyl(0.08, 0.08, 0.02, MATS.black, 0, 0.8, 0.13));
  [-0.16, 0, 0.16].forEach((x) => g.add(box(0.05, 0.42, 0.03, MATS.metal, x, 0.02, 0.02)));
  return g;
}

function buildMotor() {
  const g = new THREE.Group();
  const body = cyl(0.5, 0.5, 0.9, mat(0x8d949c, { roughness: 0.3, metalness: 0.7 }), 0, 0.62, 0);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  const back = cyl(0.5, 0.5, 0.16, MATS.black, -0.5, 0.62, 0);
  back.rotation.z = Math.PI / 2;
  g.add(back);
  const shaft = cyl(0.07, 0.07, 0.5, MATS.metal, 0.62, 0.62, 0);
  shaft.rotation.z = Math.PI / 2;
  g.add(shaft);
  const prop = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const blade = box(0.1, 1.15, 0.28, mat(0xe67e22, { roughness: 0.5 }), 0, 0.5, 0);
    blade.rotation.x = 0.5;
    const holder = new THREE.Group();
    holder.add(blade);
    holder.rotation.z = (i / 3) * Math.PI * 2;
    prop.add(holder);
  }
  prop.position.set(0.9, 0.62, 0);
  prop.rotation.z = Math.PI / 2;
  g.add(prop);
  return { g, prop };
}

function buildRobot() {
  const g = new THREE.Group();
  /* chasis + placa */
  g.add(box(2.6, 0.5, 3.2, mat(0xc0392b, { roughness: 0.5 }), 0, 0.55, 0));
  g.add(box(2.2, 0.14, 2.6, MATS.pcbDark, 0, 0.87, 0));
  /* ruedas */
  const mkWheel = (x, z) => {
    const w = cyl(0.55, 0.55, 0.35, MATS.black, x, 0.55, z, 22);
    w.rotation.z = Math.PI / 2;
    return w;
  };
  const wl = mkWheel(-1.35, 0.4), wr = mkWheel(1.35, 0.4);
  g.add(wl, wr);
  g.add(mesh(new THREE.SphereGeometry(0.28, 14, 10), MATS.metal, 0, 0.3, -1.35));
  /* ojos ultrasónicos HC-SR04 */
  const sensor = new THREE.Group();
  sensor.add(box(1.4, 0.7, 0.22, MATS.pcb, 0, 0, 0));
  sensor.add(cyl(0.28, 0.28, 0.3, MATS.metal, -0.38, 0.05, -0.2).rotateX(Math.PI / 2));
  sensor.add(cyl(0.28, 0.28, 0.3, MATS.metal, 0.38, 0.05, -0.2).rotateX(Math.PI / 2));
  sensor.position.set(0, 1.15, 1.55);
  g.add(sensor);
  /* batería y un pequeño «UNO» */
  g.add(box(1.2, 0.55, 1.6, MATS.black, 0, 1.2, -0.75));
  const dome = cyl(0.12, 0.12, 0.3, ledMat(0x2196f3, 0.4), 0.7, 1.1, 1.0);
  g.add(dome);
  return { g, wheels: [wl, wr], sensor };
}

/* ═══════════════ mini-intérprete de Arduino ═══════════════
   Soporta: int/const int, asignaciones, if/else, for (int i=0; i<N; i++),
   pinMode, digitalWrite/Read, analogWrite/Read, delay, Serial.print(ln),
   y API extra por escena (distancia, avanzar, girar). */
function tok(src) {
  const T = [];
  let i = 0, line = 1;
  while (i < src.length) {
    const c = src[i];
    if (c === "\n") { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { const j = src.indexOf("*/", i + 2); i = j < 0 ? src.length : j + 2; continue; }
    if (/[0-9]/.test(c)) { const m = /^\d+(?:\.\d+)?/.exec(src.slice(i))[0]; T.push({ t: "num", v: parseFloat(m), line }); i += m.length; continue; }
    if (c === '"') { let j = i + 1, s = ""; while (j < src.length && src[j] !== '"') { s += src[j]; j++; } if (j >= src.length) throw "Falta cerrar comillas (línea " + line + ")"; T.push({ t: "str", v: s, line }); i = j + 1; continue; }
    if (/[A-Za-z_]/.test(c)) { const m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i))[0]; T.push({ t: "id", v: m, line }); i += m.length; continue; }
    const two = src.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-="].indexOf(two) > -1) { T.push({ t: "op", v: two, line }); i += 2; continue; }
    if ("+-*/%<>=!(){};,".indexOf(c) > -1) { T.push({ t: "op", v: c, line }); i++; continue; }
    throw "Carácter extraño «" + c + "» (línea " + line + ")";
  }
  return T;
}

function parseProgram(T) {
  let p = 0;
  const peek = () => T[p], at = (v) => T[p] && T[p].v === v, eat = (v) => { if (!at(v)) throw "Esperaba «" + v + "» (línea " + (T[p] || {}).line + ")"; return T[p++]; };

  function primary() {
    const t = T[p];
    if (!t) throw "Expresión incompleta";
    if (t.t === "num") { p++; return { k: "num", v: t.v }; }
    if (t.t === "str") { p++; return { k: "str", v: t.v }; }
    if (t.t === "id") {
      p++;
      if (at("(")) { p++; const args = []; if (!at(")")) { args.push(expr()); while (at(",")) { p++; args.push(expr()); } } eat(")"); return { k: "call", name: t.v, args }; }
      return { k: "var", name: t.v };
    }
    if (at("(")) { p++; const e = expr(); eat(")"); return e; }
    if (at("!")) { p++; return { k: "un", op: "!", e: primary() }; }
    if (at("-")) { p++; return { k: "un", op: "-", e: primary() }; }
    throw "No entiendo «" + t.v + "» (línea " + t.line + ")";
  }
  function bin(next, ops) {
    let l = next();
    while (T[p] && ops.indexOf(T[p].v) > -1) { const op = T[p].v; p++; l = { k: "bin", op, l, r: next() }; }
    return l;
  }
  const mul = () => bin(primary, ["*", "/", "%"]);
  const add = () => bin(mul, ["+", "-"]);
  const rel = () => bin(add, ["<", ">", "<=", ">="]);
  const eq = () => bin(rel, ["==", "!="]);
  const and = () => bin(eq, ["&&"]);
  const or = () => bin(and, ["||"]);
  const expr = or;

  function block() {
    eat("{");
    const out = [];
    while (T[p] && !at("}")) out.push(stmt());
    eat("}");
    return out;
  }
  function stmt() {
    const t = T[p], line = t ? t.line : 0;
    if (!t) throw "Fin inesperado del código";
    if (t.v === "int" || t.v === "const" || t.v === "float") {
      if (t.v === "const") { p++; eat("int"); } else p++;
      const idTok = T[p];
      if (!idTok || idTok.t !== "id") throw "Nombre de variable inválido (línea " + line + ")";
      p++;
      const vname = idTok.v;
      let init = { k: "num", v: 0 };
      if (at("=")) { p++; init = expr(); }
      eat(";");
      return { k: "decl", name: vname, init, line };
    }
    if (t.v === "if") {
      p++; eat("("); const cond = expr(); eat(")");
      const then = block();
      let els = null;
      if (T[p] && T[p].v === "else") { p++; els = T[p] && T[p].v === "if" ? [stmt()] : block(); }
      return { k: "if", cond, then, els, line };
    }
    if (t.v === "for") {
      p++; eat("(");
      const init = stmt(); /* decl o asignación con ; */
      const cond = expr(); eat(";");
      const post = T[p].v; p++;
      let postN = { k: "noop" };
      if (at("++")) { p++; postN = { k: "post", name: post, d: 1 }; }
      else if (at("--")) { p++; postN = { k: "post", name: post, d: -1 }; }
      else if (post && (T[p].v === "=" || T[p].v === "+=" || T[p].v === "-=")) { const op = T[p].v; p++; postN = { k: "assign", name: post, op, e: expr() }; }
      else throw "En el for solo se admite i++ o i = i + n (línea " + line + ")";
      eat(")");
      return { k: "for", init, cond, post: postN, body: block(), line };
    }
    if (t.v === "while") throw "El while no se usa en el simulador: usá el loop() o un for.";
    if (t.t === "id" && T[p + 1] && (T[p + 1].v === "=" || T[p + 1].v === "+=" || T[p + 1].v === "-=")) {
      p++; const op = T[p].v; p++; const e = expr(); eat(";");
      return { k: "assign", name: t.v, op, e, line };
    }
    if (t.t === "id" && T[p + 1] && T[p + 1].v === "(") {
      const call = primary(); eat(";");
      return { k: "expr", e: call, line };
    }
    if (t.v === "return") { p++; if (!at(";")) expr(); eat(";"); return { k: "noop", line }; }
    if (t.v === ";") { p++; return { k: "noop", line }; }
    throw "No entiendo la instrucción «" + t.v + "» (línea " + t.line + ")";
  }

  const top = [];
  while (p < T.length) {
    const t = T[p];
    if (t.v === "void" && T[p + 1] && (T[p + 1].v === "setup" || T[p + 1].v === "loop")) {
      const which = T[p + 1].v;
      p += 2; eat("("); eat(")");
      top.push({ k: "fn", name: which, body: block(), line: t.line });
    } else if (t.v === "const" || t.v === "int" || t.v === "float") {
      top.push(stmt());
    } else {
      throw "Afuera de setup()/loop() solo van variables globales (línea " + t.line + ")";
    }
  }
  return top;
}

const CONSTS = { HIGH: 1, LOW: 0, OUTPUT: "out", INPUT: "in", INPUT_PULLUP: "up", LED_BUILTIN: 13, true: 1, false: 0 };
function evalExpr(n, env, api) {
  switch (n.k) {
    case "num": return n.v;
    case "str": return n.v;
    case "var": {
      if (n.name in env.vars) return env.vars[n.name];
      if (n.name in CONSTS) return CONSTS[n.name];
      if (/^A\d$/.test(n.name)) return n.name; /* A0..A5 como texto */
      if (/^\d+$/.test(n.name)) return +n.name;
      throw "Variable no definida: " + n.name;
    }
    case "call": {
      const f = api[n.name];
      if (!f) throw "Función desconocida: " + n.name + "()";
      return f.apply(null, n.args.map((a) => evalExpr(a, env, api)));
    }
    case "un": { const v = evalExpr(n.e, env, api); return n.op === "!" ? (v ? 0 : 1) : -v; }
    case "bin": {
      if (n.op === "&&") return (evalExpr(n.l, env, api) && evalExpr(n.r, env, api)) ? 1 : 0;
      if (n.op === "||") return (evalExpr(n.l, env, api) || evalExpr(n.r, env, api)) ? 1 : 0;
      const l = evalExpr(n.l, env, api), r = evalExpr(n.r, env, api);
      switch (n.op) {
        case "+": return (typeof l === "string" || typeof r === "string") ? String(l) + String(r) : l + r;
        case "-": return l - r; case "*": return l * r; case "/": return r === 0 ? 0 : l / r; case "%": return r === 0 ? 0 : l % r;
        case "<": return l < r ? 1 : 0; case ">": return l > r ? 1 : 0; case "<=": return l <= r ? 1 : 0; case ">=": return l >= r ? 1 : 0;
        case "==": return l === r ? 1 : 0; case "!=": return l !== r ? 1 : 0;
      }
    }
  }
  throw "Expresión rara";
}

async function execBlock(body, env, api, ctx) {
  for (const s of body) {
    if (ctx.stop) throw { stopped: true };
    ctx.steps++;
    if (ctx.steps > 4000) throw "El programa hizo demasiadas iteraciones (¿un ciclo sin delay?). Agregá delay() o revisá las condiciones.";
    ctx.line = s.line;
    switch (s.k) {
      case "decl": env.vars[s.name] = evalExpr(s.init, env, api); break;
      case "assign": {
        const cur = s.name in env.vars ? env.vars[s.name] : 0;
        const v = evalExpr(s.e, env, api);
        env.vars[s.name] = s.op === "+=" ? cur + v : s.op === "-=" ? cur - v : v;
        break;
      }
      case "post": env.vars[s.name] = (env.vars[s.name] || 0) + s.d; break;
      case "expr": {
        const c = s.e;
        const f = api[c.name];
        if (!f) throw "Función desconocida: " + c.name + "()";
        const args = c.args.map((a) => evalExpr(a, env, api));
        const r = f.apply(null, args);
        if (r && typeof r.then === "function") await r; /* delay() es async */
        break;
      }
      case "if": {
        if (evalExpr(s.cond, env, api)) await execBlock(s.then, env, api, ctx);
        else if (s.els) await execBlock(s.els, env, api, ctx);
        break;
      }
      case "for": {
        const envFor = { vars: Object.create(env.vars) };
        await execBlock([s.init], envFor, api, ctx);
        let guard = 0;
        while (evalExpr(s.cond, envFor, api)) {
          if (ctx.stop) throw { stopped: true };
          if (++guard > 400) throw "El for se repitió demasiadas veces (>400). Revisá la condición de salida.";
          await execBlock(s.body, envFor, api, ctx);
          await execBlock([s.post], envFor, api, ctx);
        }
        break;
      }
    }
  }
}

async function runSketch(src, api, ctx) {
  const prog = parseProgram(tok(src));
  const env = { vars: {} };
  for (const node of prog) if (node.k !== "fn") await execBlock([node], env, api, ctx);
  const setup = prog.find((n) => n.name === "setup");
  const loop = prog.find((n) => n.name === "loop");
  if (!setup && !loop) throw "Falta void setup() o void loop(). Todo sketch Arduino los necesita.";
  if (setup) await execBlock(setup.body, env, api, ctx);
  if (loop) {
    while (!ctx.stop) {
      ctx.steps = 0;
      await execBlock(loop.body, env, api, ctx);
      await new Promise((r) => setTimeout(r, 30));
    }
  }
  return ctx;
}

/* ═══════════════ prácticas (escenas) ═══════════════ */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SPEED = 1.6; /* 1 = tiempo real; >1 acelera los delay() para practicar */

function makeBaseApi(K) {
  const id = (pin) => (typeof pin === "string" && /^A\d$/.test(pin) ? pin : (parseInt(pin, 10) || 0));
  return {
    pinMode(pin, mode) { K.log.push({ fn: "pinMode", args: [id(pin), mode] }); K.modes[id(pin)] = mode; },
    digitalWrite(pin, v) { const p = id(pin); K.dig[p] = v ? 1 : 0; K.log.push({ fn: "digitalWrite", args: [p, K.dig[p]] }); K.applyDigital(p); K.check(); },
    digitalRead(pin) { const p = id(pin); const v = K.readers.d[p] ? K.readers.d[p]() : 0; K.log.push({ fn: "digitalRead", args: [p], result: v }); K.check(); return v; },
    analogWrite(pin, v) { const p = id(pin); K.pwm[p] = clamp(Math.round(v || 0), 0, 255); K.log.push({ fn: "analogWrite", args: [p, K.pwm[p]] }); K.applyPwm(p); K.check(); },
    analogRead(pin) { const p = typeof pin === "string" ? pin : "A" + (id(pin)); const v = K.readers.a[p] ? Math.round(K.readers.a[p]()) : 0; K.log.push({ fn: "analogRead", args: [p], result: v }); K.check(); return v; },
    delay(ms) {
      K.log.push({ fn: "delay", args: [Math.round(ms || 0)] });
      const total = clamp(ms || 0, 0, 5000) / SPEED;
      if (total <= 0) return sleep(5);
      let t = 0;
      return (async () => {
        while (t < total) {
          if (K.ctx && K.ctx.stop) throw { stopped: true };
          const step = Math.min(28, total - t);
          await sleep(step);
          t += step;
        }
      })();
    },
    "Serial.print"(x) { K.serial(String(x)); K.log.push({ fn: "Serial.print", args: [x] }); },
    "Serial.println"(x) { K.serial(String(x == null ? "" : x)); K.log.push({ fn: "Serial.println", args: [x] }); },
  };
}

const BLINK13 = `// Apagar y prender un LED un segundo cada vez
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);   // pin 13 como salida
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH); // encendido
  delay(1000);                     // esperá 1 segundo
  digitalWrite(LED_BUILTIN, LOW);  // apagado
  delay(1000);                     // esperá otro segundo
}
`;

const SCENES = [
  {
    id: "meet", num: 1, nombre: "Conocé la placa", icono: "🔌",
    titulo: "ARDUINO UNO",
    desc: "La Arduino UNO es la placa más popular para aprender electrónica y programación: es barata, aguanta errores de las y los principiantes y tiene miles de proyectos de ejemplo en español.",
    puntos: [["🧠", "El cerebro es el ATmega328P: ejecuta tu código 16 millones de veces por segundo."], ["🔓", "Hardware abierto: cualquiera puede fabricarla y estudiarla."], ["🎓", "Perfecta para el colegio, la universidad o tu emprendimiento."]],
    pines: [["0–13", "Pines digitales: entrada o salida (ON/OFF). Los que tienen ~ (3, 5, 6, 9, 10, 11) también hacen PWM."], ["A0–A5", "Pines analógicos: leen voltajes entre 0 y 5V (valores 0–1023)."], ["5V / 3V3", "Salidas de alimentación para tus componentes."], ["GND", "Tierra: el punto común de todos los circuitos."], ["USB", "Se conecta a la compu para programarla y darle energía."]],
    ejemplo: "El código de ejemplo es el «Hola, mundo» de Arduino: prender y apagar el LED integrado del pin 13. Probá cambiar los delay() a 200 y mirá qué pasa.",
    code: BLINK13,
    markers: [
      { id: "usb", n: "1", pos: [-2.9, 1.7, -1.7], t: "PUERTO USB", d: "Se conecta a tu computadora para cargar el código y darle energía." },
      { id: "pwr", n: "2", pos: [-2.5, 1.7, 1.9], t: "JACK DE PODER", d: "Para alimentarla sin compu: adaptador de 7 a 12V (o una batería de 9V)." },
      { id: "mcu", n: "3", pos: [-0.9, 0.7, 0.15], t: "MICROCONTROLADOR", d: "El ATmega328P: aquí corre tu sketch. ¡Cuidado con doblarle las patitas al sacarla!" },
      { id: "dig", n: "4", pos: [1.9, 1.0, -2.45], t: "PINES DIGITALES (0–13)", d: "Entradas o salidas ON/OFF. Los marcados con ~ también hacen PWM («falso analógico»)." },
      { id: "analog", n: "5", pos: [1.24, 1.0, 2.45], t: "PINES ANALÓGICOS (A0–A5)", d: "Leen sensores con valores de 0 a 1023: perillas, luz, temperatura…" },
      { id: "power", n: "6", pos: [-1.3, 1.0, 2.45], t: "PINES DE PODER", d: "5V, 3.3V, GND y VIN. El GND es la «tierra» común de todo lo que armés." },
      { id: "ledon", n: "7", pos: [2.3, 0.45, 0.4], t: "LED DE ENCENDIDO", d: "Si este LED verde no prende al conectar, revisá el cable USB o la fuente." }],
    validate(log) { return log.some((x) => x.fn === "digitalWrite"); },
    build(K) {
      const uno = buildUNO();
      world.add(uno.g);
      K.parts.ledL = uno.ledL;
      K.applyDigital = (p) => { if (+p === 13) uno.ledL.material.emissiveIntensity = K.dig[13] ? 2.2 : 0.05; };
    },
    frame() {},
  },
  {
    id: "led", num: 2, nombre: "Prendé un LED", icono: "🔴",
    titulo: "PARPADEO DE UN LED",
    desc: "El circuito más famoso del mundo: un LED en el protoboard con su resistencia de 220Ω. La resistencia limita la corriente para que el LED no se queme al instante.",
    puntos: [["➕", "La pata LARGA del LED (+) va hacia el pin 13."], ["🛡️", "La resistencia de 220Ω protege al LED: nunca lo conectes directo."], ["⏱️", "delay() pausa el programa en milisegundos: 1000 = 1 segundo."]],
    pines: [["13", "Salida digital hacia el LED (con resistencia)."], ["GND", "Cierra el circuito por la pata corta."]],
    ejemplo: "Este es el mismo blink pero con el LED externo. Probá un patrón SOS: tres destellos cortos (200 ms), tres largos (600 ms), tres cortos… usando for y delay.",
    code: `// LED externo en el pin 13 con resistencia de 220Ω
const int LED = 13;

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  digitalWrite(LED, HIGH);
  delay(500);               // encendido medio segundo
  digitalWrite(LED, LOW);
  delay(500);               // apagado medio segundo
}
`,
    markers: [
      { id: "led", n: "1", pos: [7.2, 1.7, -1.2], t: "LED", d: "Diodo emisor de luz. La pata larga es la positiva (+)." },
      { id: "res", n: "2", pos: [7.2, 1.3, 0.2], t: "RESISTENCIA 220Ω", d: "Limita la corriente. Franjas cafe-roja-cafe-dorada: 220 ohms, 5% de tolerancia." },
      { id: "wire", n: "3", pos: [5.2, 1.2, -1.7], t: "CABLES DUPONT", d: "Conectan el pin 13 con el protoboard sin soldar nada." }],
    validate(log, K) {
      const w = log.filter((x) => x.fn === "digitalWrite");
      const d = log.filter((x) => x.fn === "delay");
      return w.length >= 4 && d.length >= 2 && w.some((x) => x.args[1] === 1) && w.some((x) => x.args[1] === 0);
    },
    build(K) {
      const uno = buildUNO(); world.add(uno.g);
      const bb = buildBreadboard(7.2, 0.4); world.add(bb);
      const led = buildLED(0xd32f2f, ledMat(0xd32f2f, 0.06)); led.g.position.set(7.2, 0.9, -1.2); world.add(led.g);
      const res = buildResistor(); res.position.set(7.2, 0.95, 0.2); world.add(res);
      world.add(wire(new THREE.Vector3(3.32, 0.5, -2.45), new THREE.Vector3(7.2, 1.0, -1.05), 0xe8940a, 1.5));
      world.add(wire(new THREE.Vector3(-0.93, 0.5, 2.45), new THREE.Vector3(7.55, 1.0, 0.35), 0x333333, 1.3));
      K.parts.led = led;
      K.applyDigital = (p) => { if (+p === 13) { const on = K.dig[13]; led.dome.material.emissiveIntensity = on ? 3 : 0.06; led.rim.material.emissiveIntensity = on ? 1.5 : 0.06; uno.ledL.material.emissiveIntensity = on ? 2.2 : 0.05; } };
    },
    frame() {},
  },
  {
    id: "boton", num: 3, nombre: "Pulsá el botón", icono: "🔘",
    titulo: "LEER UN BOTÓN (ENTRADA DIGITAL)",
    desc: "Hasta ahora solo enviábamos señales. Ahora la placa ESCUCHA: el botón en el pin 2 cambia la lectura y el LED del pin 13 reacciona. Pulsá el botón físico en el 3D mientras corre tu código.",
    puntos: [["📥", "INPUT_PULLUP: el pin vale HIGH en reposo y LOW al pulsar."], ["👆", "Pulsá el botón blanco del protoboard en la vista 3D."], ["🔁", "digitalRead() se vuelve a leer en cada vuelta del loop(): por eso responde al instante."]],
    pines: [["2", "Entrada digital con resistencia interna (INPUT_PULLUP)."], ["13", "LED integrado «L» de la placa."]],
    ejemplo: "Con INPUT_PULLUP la lógica va «al revés»: LOW significa pulsado. También probá contar pulsaciones con una variable y mostrarlas con Serial.println().",
    code: `// Botón en el pin 2 (INPUT_PULLUP: LOW = pulsado)
const int BOTON = 2;
const int LED = LED_BUILTIN;

void setup() {
  pinMode(BOTON, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
}

void loop() {
  int estado = digitalRead(BOTON);
  if (estado == LOW) {
    digitalWrite(LED, HIGH);   // ¡pulsado!
  } else {
    digitalWrite(LED, LOW);
  }
}
`,
    markers: [
      { id: "btn", n: "1", pos: [7.2, 1.6, 0.2], t: "PULSADOR", d: "Hace contacto mientras lo presionás. Hacé clic encima para pulsarlo." },
      { id: "pullup", n: "2", pos: [-1.35, 1.0, -2.45], t: "PIN 2 · INPUT_PULLUP", d: "La resistencia interna mantiene el pin en HIGH hasta que el botón lo baja a GND." }],
    validate(log) {
      for (let i = 0; i < log.length; i++) {
        if (log[i].fn === "digitalRead" && log[i].args[0] === 2 && log[i].result === 0) {
          for (let j = i + 1; j < Math.min(log.length, i + 4); j++) if (log[j].fn === "digitalWrite" && log[j].args[0] === 13 && log[j].args[1] === 1) return true;
        }
      }
      return false;
    },
    build(K) {
      const uno = buildUNO(); world.add(uno.g);
      const bb = buildBreadboard(7.2, 0.4); world.add(bb);
      const btn = buildButton(); btn.g.position.set(7.2, 1.06, 0.2); world.add(btn.g);
      world.add(wire(new THREE.Vector3(-1.35, 0.5, -2.45), new THREE.Vector3(6.85, 1.1, 0.2), 0x2e86de, 1.6));
      world.add(wire(new THREE.Vector3(-0.93, 0.5, 2.45), new THREE.Vector3(7.55, 1.1, 0.35), 0x333333, 1.2));
      K.sensors.btn = 0;
      K.readers.d[2] = () => (K.sensors.btn ? 0 : 1);
      K.parts.btn = btn;
      K.applyDigital = (p) => { if (+p === 13) uno.ledL.material.emissiveIntensity = K.dig[13] ? 2.2 : 0.05; };
      K.click = [{ obj: btn.g, down: () => { K.sensors.btn = 1; btn.plunger.position.y = 0.47; }, up: () => { K.sensors.btn = 0; btn.plunger.position.y = 0.52; } }];
    },
    frame() {},
  },
  {
    id: "perilla", num: 4, nombre: "Girá la perilla", icono: "🎛️",
    titulo: "LEER UNA PERILLA (ENTRADA ANALÓGICA)",
    desc: "Una perilla (potenciómetro) no es solo prendido/apagado: entrega todos los valores intermedios. analogRead() los convierte en números de 0 a 1023 y con analogWrite() los pasamos al brillo del LED (PWM).",
    puntos: [["🎚️", "Girá la perilla en el 3D (o usá el control de abajo) mientras corre el código."], ["🔢", "analogRead(A0): 0–1023 · analogWrite(9): 0–255. Por eso dividimos entre 4."], ["🌊", "PWM «parpadea» rapidísimo: tu ojo lo ve como brillo suave."]],
    pines: [["A0", "Lectura analógica de la perilla."], ["9 (~)", "Salida PWM hacia el LED con resistencia."]],
    ejemplo: "El código divide la lectura entre 4 para pasar de 0–1023 a 0–255. Probá hacer que el LED parpadee más rápido cuanto más gira la perilla (usá el valor en el delay, ¡cuidado con delay(0) infinito!).",
    code: `// Perilla en A0 controla el brillo del LED en el pin 9
const int PERILLA = A0;
const int LED = 9;

void setup() {
  pinMode(LED, OUTPUT);
  Serial.println("Arrancó el dimmer");
}

void loop() {
  int lectura = analogRead(PERILLA);     // 0 a 1023
  int brillo = lectura / 4;              // 0 a 255
  analogWrite(LED, brillo);
  Serial.println(brillo);
  delay(80);
}
`,
    markers: [
      { id: "pot", n: "1", pos: [7.2, 1.9, 0.3], t: "POTENCIÓMETRO", d: "Una resistencia variable: del centro sale el voltaje que lee A0. Arrastralo para girarlo." },
      { id: "led", n: "2", pos: [7.2, 1.7, -1.2], t: "LED CON PWM", d: "Su brillo cambia suave porque el pin 9 «parpadea» 490 veces por segundo." }],
    validate(log, K) { return log.some((x) => x.fn === "analogRead") && K.knobMoved; },
    controls: [{ id: "knob", label: "🎛️ Perilla", min: 0, max: 1023, val: 0 }],
    build(K) {
      const uno = buildUNO(); world.add(uno.g);
      const bb = buildBreadboard(7.2, 0.4); world.add(bb);
      const pot = buildPot(); pot.g.position.set(7.2, 0.95, 0.3); world.add(pot.g);
      const led = buildLED(0xffc400, ledMat(0xffc400, 0.0)); led.g.position.set(7.2, 0.9, -1.2); world.add(led.g);
      const res = buildResistor(); res.position.set(8.0, 0.95, -1.0); world.add(res);
      world.add(wire(new THREE.Vector3(1.13, 0.5, -2.45), new THREE.Vector3(7.2, 1.0, -1.05), 0xe8940a, 1.6));
      world.add(wire(new THREE.Vector3(0.4, 0.5, 2.45), new THREE.Vector3(6.9, 1.05, 0.3), 0x7c3aed, 1.4));
      world.add(wire(new THREE.Vector3(-1.35, 0.5, 2.45), new THREE.Vector3(7.5, 1.0, 0.55), 0xc0392b, 1.2));
      K.sensors.knob = 0; K.knobMoved = false; K.knobStart = null;
      K.readers.a.A0 = () => K.sensors.knob;
      K.parts.pot = pot; K.parts.led = led;
      K.applyPwm = (p) => { if (+p === 9) { const b = (K.pwm[9] || 0) / 255; led.dome.material.emissiveIntensity = 0.06 + b * 3; led.rim.material.emissiveIntensity = 0.06 + b * 1.4; } };
      K.setKnob = (v) => {
        if (K.knobStart == null && RUN) K.knobStart = v;
        K.sensors.knob = clamp(Math.round(v), 0, 1023);
        pot.knob.rotation.y = -2.3 + (K.sensors.knob / 1023) * 4.6;
        if (RUN && K.knobStart != null && Math.abs(K.sensors.knob - K.knobStart) > 60) { K.knobMoved = true; K.check(); }
      };
      K.setKnob(SAVE.knobMeet || 0);
    },
    frame(dt, K) {},
  },
  {
    id: "rgb", num: 5, nombre: "Mezclá colores", icono: "🌈",
    titulo: "LED RGB: MEZCLADOR DE COLORES",
    desc: "Un LED RGB es en realidad tres LEDs (rojo, verde y azul) en una sola cápsula. Mezclando las intensidades de cada uno con PWM se pueden crear millones de colores. Usá los controles deslizantes como si fueran tres perillas.",
    puntos: [["🎨", "Rojo + verde = amarillo · rojo + azul = violeta · los tres = blanco."], ["🎚️", "Cada control simula una perilla en A1, A2 y A3."], ["💡", "Los pines 9, 10 y 11 tienen ~ (PWM): perfectos para los tres canales."]],
    pines: [["A1 A2 A3", "Tres lecturas analógicas (los controles)."], ["9 10 11 (~)", "Salidas PWM hacia R, G y B del LED."], ["GND", "La pata larga del RGB va a tierra."]],
    ejemplo: "Después de mezclar a mano, probá que el color cambie solo en ciclo: una variable «tono» que sube en el loop y tres analogWrite() calculados con if. O inventá el «modo chapín»: azul y blanco.",
    code: `// Tres perillas (A1, A2, A3) mezclan el color del LED RGB
const int PIN_R = 9;
const int PIN_G = 10;
const int PIN_B = 11;

void setup() {
  pinMode(PIN_R, OUTPUT);
  pinMode(PIN_G, OUTPUT);
  pinMode(PIN_B, OUTPUT);
}

void loop() {
  int r = analogRead(A1) / 4;   // rojo:   0 a 255
  int g = analogRead(A2) / 4;   // verde:  0 a 255
  int b = analogRead(A3) / 4;   // azul:   0 a 255
  analogWrite(PIN_R, r);
  analogWrite(PIN_G, g);
  analogWrite(PIN_B, b);
  delay(60);
}
`,
    markers: [
      { id: "rgb", n: "1", pos: [7.2, 1.8, -0.4], t: "LED RGB", d: "Tiene 4 patas: la más larga es la común (a GND) y las otras tres son R, G y B." },
      { id: "pwm", n: "2", pos: [1.55, 1.0, -2.45], t: "PINES 9·10·11", d: "Los tres tienen ~ : PWM. Cada uno controla un canal de color." }],
    validate(log) { const ps = new Set(log.filter((x) => x.fn === "analogWrite").map((x) => x.args[0])); return ps.has(9) && ps.has(10) && ps.has(11); },
    controls: [
      { id: "r", label: "🔴 Rojo", min: 0, max: 1023, val: 60 },
      { id: "g", label: "🟢 Verde", min: 0, max: 1023, val: 0 },
      { id: "b", label: "🔵 Azul", min: 0, max: 1023, val: 120 }],
    build(K) {
      const uno = buildUNO(); world.add(uno.g);
      const bb = buildBreadboard(7.2, 0.4); world.add(bb);
      const rgb = buildRGB(); rgb.g.position.set(7.2, 0.9, -0.4); world.add(rgb.g);
      [[1.13, 0xe8940a], [1.55, 0x2e86de], [1.97, 0xc0392b]].forEach((w, i) => world.add(wire(new THREE.Vector3(w[0], 0.5, -2.45), new THREE.Vector3(6.8 + i * 0.3, 1.0, -0.55 - i * 0.12), w[1], 1.7)));
      world.add(wire(new THREE.Vector3(-0.93, 0.5, 2.45), new THREE.Vector3(7.2, 1.0, -0.1), 0x333333, 1.2));
      K.sensors.r = 60; K.sensors.g = 0; K.sensors.b = 120;
      K.readers.a.A1 = () => K.sensors.r; K.readers.a.A2 = () => K.sensors.g; K.readers.a.A3 = () => K.sensors.b;
      K.parts.rgb = rgb;
      K.applyPwm = () => {
        const r = (K.pwm[9] || 0), g = (K.pwm[10] || 0), b = (K.pwm[11] || 0);
        const c = new THREE.Color(r / 255, g / 255, b / 255);
        const bright = Math.max(r, g, b) / 255;
        rgb.domeMat.emissive = c;
        rgb.domeMat.emissiveIntensity = 0.1 + bright * 2.4;
        rgb.domeMat.color = c.clone().lerp(new THREE.Color(1, 1, 1), 0.55);
      };
      K.setCtl = (id, v) => { K.sensors[id] = v; };
    },
    frame() {},
  },
  {
    id: "motor", num: 6, nombre: "Controlá un motor", icono: "🌀",
    titulo: "MOTOR DC CON TRANSISTOR",
    desc: "Un pin de Arduino solo entrega 20 mA: no puede con un motor. Por eso el transistor TIP120 hace el trabajo pesado y la placa solo le manda la orden con PWM. Así controlamos la VELOCIDAD del motor.",
    puntos: [["⚡", "Regla de oro: cargas grandes (motores, tiras LED) van con transistor o relé, nunca directas al pin."], ["🌀", "analogWrite(6, 0–255) cambia la velocidad: 0 quieto, 255 a tope."], ["🔄", "El ejemplo hace una rampa: sube la velocidad y baja, como un ventilador con eco."]],
    pines: [["6 (~)", "PWM hacia la base del TIP120 (a través de resistencia de 1kΩ)."], ["9V externo", "El motor toma su energía de una fuente aparte (los GND se unen)."]],
    ejemplo: "Probá cambiar la rampa: que suba de a 25 en pasos de 0 lógico, o que reaccione a una perilla como en la práctica anterior. En un proyecto real agregá diodo de protección y nunca lo alimentes del pin 5V.",
    code: `// Motor DC en el pin 6 a través del transistor TIP120
const int MOTOR = 6;    // pin con PWM

void setup() {
  pinMode(MOTOR, OUTPUT);
}

void loop() {
  for (int v = 0; v <= 255; v += 5) {  // subir velocidad
    analogWrite(MOTOR, v);
    delay(40);
  }
  delay(1000);                          // a tope un segundo
  for (int v = 255; v >= 0; v -= 5) {  // bajar velocidad
    analogWrite(MOTOR, v);
    delay(40);
  }
  delay(1000);                          // quieto un segundo
}
`,
    markers: [
      { id: "motor", n: "1", pos: [8.6, 1.9, -0.6], t: "MOTOR DC", d: "Convierte electricidad en movimiento. Gira más rápido con más voltaje promedio (PWM)." },
      { id: "tip", n: "2", pos: [7.2, 1.7, 0.5], t: "TRANSISTOR TIP120", d: "Puerta de paso: el pin 6 solo «abre la llave» y el motor toma la energía de la fuente externa." },
      { id: "procaution", n: "3", pos: [-0.47, 1.0, -2.45], t: "PIN 6 · PWM", d: "Uno de los 6 pines con ~. analogWrite() «promedia» el voltaje encendiendo y apagando rapidísimo." }],
    validate(log) { const vals = new Set(log.filter((x) => x.fn === "analogWrite" && x.args[0] === 6).map((x) => x.args[1])); return vals.size >= 8; },
    build(K) {
      const uno = buildUNO(); world.add(uno.g);
      const bb = buildBreadboard(7.2, 0.4); world.add(bb);
      const tip = buildTIP120(); tip.position.set(7.2, 1.0, 0.5); world.add(tip);
      const mot = buildMotor(); mot.g.position.set(8.8, 0.35, -1.1); mot.g.rotation.y = -0.5; world.add(mot.g);
      world.add(wire(new THREE.Vector3(-0.47, 0.5, -2.45), new THREE.Vector3(7.04, 1.15, 0.5), 0xe8940a, 1.7));
      world.add(wire(new THREE.Vector3(7.36, 1.1, 0.5), new THREE.Vector3(8.4, 0.6, -0.75), 0xc0392b, 0.9));
      world.add(wire(new THREE.Vector3(-0.93, 0.5, 2.45), new THREE.Vector3(7.0, 1.0, 0.75), 0x333333, 1.1));
      K.parts.mot = mot;
      K.applyPwm = () => {};
      K.motorV = 0;
    },
    frame(dt, K) {
      const target = (K.pwm[6] || 0) / 255 * 22;
      K.motorV += (target - K.motorV) * Math.min(1, dt * 3);
      K.parts.mot.prop.rotation.x += K.motorV * dt;
    },
  },
  {
    id: "robot", num: 7, nombre: "Mini-robot evita obstáculos", icono: "🤖",
    titulo: "ROBOT QUE ESQUIVA OBSTÁCULOS",
    desc: "¡El proyecto estrella! El sensor ultrasónico mide la distancia (como los murciélagos) y el robot decide: si el camino está libre AVANZA, y si hay algo cerca GIRA. Es la misma lógica de los aspiradoras-robot y de los carros autónomos, en miniatura.",
    puntos: [["📡", "El HC-SR04 (los «ojitos») mide de 2 a 400 cm con ultrasonido."], ["🧭", "La lógica es un if gigante: ¿libre? → avanzar · ¿cerca? → girar."], ["🚀", "Con esta base hacés seguidores de línea, carros controlados por Bluetooth y más."]],
    pines: [["distancia()", "Devuelve los cm que hay frente al robot (sensor ultrasónico)."], ["avanzar()", "Enciende los dos motores hacia adelante un momento."], ["girar()", "El robot gira sobre su eje para buscar otro camino."]],
    ejemplo: "Después de que esquive la caja, agregá un Serial.println() para ver las distancias, o cambiá el 25 por un 10 para que se acerque más antes de girar (¡con cuidado de estamparlo!).",
    code: `// Robot evitador: sensor al frente, dos motores en las ruedas
int distanciaSegura = 25;   // cm

void setup() {
  Serial.println("Robot listo 🚀");
}

void loop() {
  int d = distancia();         // medir frente al robot
  Serial.println(d);
  if (d > distanciaSegura) {
    avanzar();                 // camino libre
  } else {
    girar();                   // ¡obstáculo! buscar otro rumbo
  }
}
`,
    markers: [
      { id: "sr04", n: "1", track: "sensor", lift: 1.1, t: "SENSOR ULTRASÓNICO", d: "Manda un «pitido» inaudible y mide cuánto tarda en regresar el eco. Así calcula la distancia." },
      { id: "wheels", n: "2", track: "robot", lift: 1.6, t: "RUEDAS Y MOTORES", d: "Dos motores DC con reductora. Si giran distinto, el robot gira o avanza." },
      { id: "caja", n: "3", track: "caja", lift: 1.4, t: "OBSTÁCULO", d: "¡Arrastralo por la mesa para cambiar el camino del robot!" }],
    validate(log) {
      const med = log.filter((x) => x.fn === "distancia").length;
      const av = log.some((x) => x.fn === "avanzar");
      const gi = log.some((x) => x.fn === "girar");
      return med >= 3 && av && gi;
    },
    build(K) {
      const gr = ground(14, true); world.add(gr.g);
      const rb = buildRobot(); world.add(rb.g);
      const caja = box(1.8, 1.8, 1.8, mat(0xd35400, { roughness: 0.7 }), 4.5, 0.9, -3.4);
      world.add(caja);
      K.parts.robot = rb; K.parts.caja = caja;
      K.robot = { angle: 0, mode: "idle", until: 0, speed: 3.2 };
      K.clickDrag = caja;
      /* API especial del robot */
      K.extraApi = {
        distancia() {
          const r = K.robot, g = rb.g;
          const dir = new THREE.Vector3(Math.sin(r.angle), 0, Math.cos(r.angle));
          const origin = new THREE.Vector3().copy(g.position).add(new THREE.Vector3(dir.x * 1.8, 1.15, dir.z * 1.8));
          const rc = new THREE.Raycaster(origin, dir.clone().normalize(), 0, 12);
          const hits = rc.intersectObject(caja, false);
          let d = hits.length ? hits[0].distance * 10 : 400;   // cm
          const roomD = (10.5 - Math.max(Math.abs(g.position.x + dir.x * 2), Math.abs(g.position.z + dir.z * 2))) * 10;
          d = Math.min(d, Math.max(5, roomD));
          d = clamp(Math.round(d), 2, 400);
          K.log.push({ fn: "distancia", args: [], result: d });
          K.check();
          return d;
        },
        avanzar() { K.log.push({ fn: "avanzar", args: [] }); K.robot.mode = "fwd"; K.robot.until = performance.now() + 380; K.check(); return sleep(90); },
        girar() { K.log.push({ fn: "girar", args: [] }); K.robot.mode = "turn"; K.robot.until = performance.now() + 650 + Math.random() * 500; K.check(); return sleep(120); },
      };
    },
    frame(dt, K) {
      const r = K.robot, g = K.parts.robot.g, now = performance.now();
      if (now > r.until) r.mode = "idle";
      if (r.mode === "fwd") {
        g.position.x += Math.sin(r.angle) * r.speed * dt;
        g.position.z += Math.cos(r.angle) * r.speed * dt;
        g.position.x = clamp(g.position.x, -9.5, 9.5);
        g.position.z = clamp(g.position.z, -9.5, 9.5);
        g.rotation.y = r.angle;
        K.parts.robot.wheels.forEach((w) => { w.rotation.x += 6 * dt; });
      } else if (r.mode === "turn") {
        r.angle += 2.4 * dt;
        g.rotation.y = r.angle;
        K.parts.robot.wheels[0].rotation.x += 5 * dt;
        K.parts.robot.wheels[1].rotation.x -= 5 * dt;
      }
      /* la caja se resetea si el robot la arrastra muy lejos al empujarla */
    },
    robotGround: true,
  },
];

/* ═══════════════ lógica de interfaz ═══════════════ */
const elTabs = $("[data-a3d-tabs]"), elBody = $("[data-a3d-tabbody]"), elStrip = $("[data-a3d-strip]");
const elCode = $("[data-a3d-code]"), elStatus = $("[data-a3d-status]"), elConsole = $("[data-a3d-console]");
const elCtl = $("[data-a3d-ctl]"), elMarkers = $("[data-a3d-markers]"), elToast = $("[data-a3d-toast]");
const elHud = $("[data-a3d-hud]"), elProg = $("[data-a3d-prog]");
const btnRun = $("[data-a3d-run]"), btnStop = $("[data-a3d-stop]");

let IDX = 0, K = null, RUN = false, RUNID = 0, runnerCtx = null, openCard = null;
let compileTags = [];

function toast(msg, kind) {
  elToast.textContent = msg;
  elToast.className = "a3d__toast is-on" + (kind ? " a3d__toast--" + kind : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => elToast.classList.remove("is-on"), 3200);
}

function doneCount() { return SCENES.filter((s) => SAVE.done[s.id]).length; }
function refreshProgress() {
  const n = doneCount();
  elProg.textContent = n + "/7 completadas";
  if (n === 7 && !SENT) {
    SENT = true;
    try { localStorage.setItem("tr-a3d:done:" + LESSON, "1"); } catch (e) {}
    document.dispatchEvent(new CustomEvent("aula:sim-done", { detail: { nota: 100 } }));
    toast("🎉 ¡Laboratorio completo! Las 7 prácticas dominadas. Lección completada.", "ok");
  }
}

function buildStrip() {
  elStrip.innerHTML = SCENES.map((s, i) => `
    <button class="a3d__cardles ${i === IDX ? "is-on" : ""}" data-sc="${i}">
      <span class="a3d__ic">${s.icono}</span>
      <span><small>Práctica ${s.num}</small><span>${esc(s.nombre)}</span></span>
      ${SAVE.done[s.id] ? '<span class="a3d__tick">✓</span>' : ""}
    </button>`).join("");
  $$("[data-sc]", elStrip).forEach((b) => b.addEventListener("click", () => loadScene(+b.dataset.sc)));
}

const TABS = [["resumen", "RESUMEN"], ["pines", "PINES"], ["ejemplo", "EJEMPLO"]];
let TAB = "resumen";
function buildTabs() {
  elTabs.innerHTML = TABS.map((t) => `<button class="${TAB === t[0] ? "is-on" : ""}" data-tab="${t[0]}">${t[1]}</button>`).join("");
  $$("[data-tab]", elTabs).forEach((b) => b.addEventListener("click", () => { TAB = b.dataset.tab; buildTabs(); }));
  const s = SCENES[IDX];
  if (TAB === "resumen") {
    elBody.innerHTML = `<h3>${esc(s.titulo)}</h3><p>${esc(s.desc)}</p><ul>${s.puntos.map((p) => `<li><b>${p[0]}</b><span>${esc(p[1])}</span></li>`).join("")}</ul>`;
  } else if (TAB === "pines") {
    elBody.innerHTML = `<table class="a3d__pins"><tbody>${s.pines.map((p) => `<tr><td>${esc(p[0])}</td><td>${esc(p[1])}</td></tr>`).join("")}</tbody></table>`;
  } else {
    elBody.innerHTML = `<h3>SOBRE EL EJEMPLO</h3><p>${esc(s.ejemplo)}</p>`;
  }
}

function clearWorld() {
  while (world.children.length) {
    const ch = world.children.pop();
    world.remove(ch);
    ch.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
  }
}

function loadScene(i) {
  stopRun(true);
  IDX = i;
  const s = SCENES[i];
  clearWorld();
  if (!s.robotGround) { const gr = ground(11, false); world.add(gr.g); }
  K = {
    dig: {}, pwm: {}, modes: {}, log: [], sensors: {}, readers: { d: {}, a: {} }, parts: {},
    serial(msg) {
      const d = document.createElement("div");
      d.textContent = msg;
      elConsole.appendChild(d);
      while (elConsole.children.length > 80) elConsole.removeChild(elConsole.firstChild);
      elConsole.scrollTop = elConsole.scrollHeight;
    },
    check() {
      if (SAVE.done[s.id] || K._validated) return;
      try {
        if (s.validate(K.log, K)) {
          K._validated = true;
          SAVE.done[s.id] = 1;
          persist();
          buildStrip();
          refreshProgress();
          toast("✓ ¡Práctica «" + s.nombre + "» completada! (" + doneCount() + "/7)", "ok");
        }
      } catch (e) {}
    },
  };
  s.build(K);
  controls.target.set(s.robotGround ? 0 : 2.5, s.robotGround ? 0.6 : 0.6, 0);
  camera.position.set(s.robotGround ? 8 : 10, s.robotGround ? 9 : 11, s.robotGround ? 11 : 13);
  elConsole.innerHTML = "";
  elStatus.textContent = "■ Detenido. Escribí tu código y pulsá Ejecutar.";
  elStatus.className = "a3d__status";
  elCode.value = SAVE.code[s.id] != null ? SAVE.code[s.id] : s.code;
  /* controles (sliders) */
  if (s.controls) {
    elCtl.hidden = false;
    elCtl.innerHTML = s.controls.map((c) => `<label>${c.label} <input type="range" min="${c.min}" max="${c.max}" value="${c.val}" data-ctl="${c.id}"> <span data-ctlv="${c.id}">${c.val}</span></label>`).join("");
    $$("input[type=range]", elCtl).forEach((inp) => inp.addEventListener("input", () => {
      const v = +inp.value, idc = inp.dataset.ctl;
      $("[data-ctlv='" + idc + "']").textContent = v;
      if (idc === "knob" && K.setKnob) K.setKnob(v);
      else if (K.setCtl) K.setCtl(idc, v);
    }));
  } else elCtl.hidden = true;
  buildMarkers();
  buildTabs();
  buildStrip();
  elHud.textContent = "Práctica " + s.num + " de 7";
}

/* ── marcadores 3D → DOM ── */
function buildMarkers() {
  const s = SCENES[IDX];
  elMarkers.innerHTML = "";
  openCard = null;
  s.markers.forEach((m) => {
    const d = document.createElement("button");
    d.className = "a3d__dot";
    d.textContent = m.n;
    d.dataset.m = m.id;
    d.addEventListener("click", () => toggleCard(m, d));
    elMarkers.appendChild(d);
  });
}
function toggleCard(m, dot) {
  $$(".a3d__card", elMarkers).forEach((c) => c.remove());
  $$(".a3d__dot", elMarkers).forEach((d) => d.classList.remove("is-open"));
  if (openCard === m.id) { openCard = null; return; }
  openCard = m.id;
  dot.classList.add("is-open");
  const c = document.createElement("div");
  c.className = "a3d__card";
  c.dataset.card = m.id;
  c.innerHTML = "<h5>" + esc(m.t) + "</h5><p>" + esc(m.d) + "</p>";
  elMarkers.appendChild(c);
}
function projectMarkers() {
  const s = SCENES[IDX];
  const stage = $(".a3d__stage");
  const w = stage.clientWidth, h = stage.clientHeight;
  const v = new THREE.Vector3();
  s.markers.forEach((m) => {
    const dot = elMarkers.querySelector("[data-m='" + m.id + "']");
    if (!dot) return;
    let px = m.pos ? m.pos[0] : 0, py = m.pos ? m.pos[1] : 0, pz = m.pos ? m.pos[2] : 0;
    if (m.track && K) {
      const src = m.track === "caja" ? K.parts.caja : (m.track === "sensor" && K.parts.robot ? K.parts.robot.sensor : (K.parts.robot ? K.parts.robot.g : null));
      if (src) { const wp = new THREE.Vector3(); src.getWorldPosition(wp); px = wp.x; py = wp.y + (m.lift || 0.6); pz = wp.z; }
    }
    v.set(px, py, pz).project(camera);
    const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
    const vis = v.z < 1 && x > 0 && x < w && y > 0 && y < h;
    dot.style.display = vis ? "" : "none";
    dot.style.left = x + "px"; dot.style.top = y + "px";
    const card = elMarkers.querySelector("[data-card='" + m.id + "']");
    if (card) { card.style.left = Math.min(x + 16, w - 245) + "px"; card.style.top = Math.max(y - 20, 8) + "px"; card.style.display = vis ? "" : "none"; }
  });
}

/* ── ejecución del sketch ── */
async function startRun() {
  if (RUN) return;
  elConsole.innerHTML = "";
  const src = elCode.value;
  SAVE.code[SCENES[IDX].id] = src;
  persist();
  const s = SCENES[IDX];
  const api = Object.assign(makeBaseApi(K), K.extraApi || {});
  const ctx = { stop: false, steps: 0, line: 1 };
  runnerCtx = ctx;
  K.ctx = ctx;
  RUN = false;
  RUNID++;
  const myRun = ++RUNID;
  RUN = true;
  K.log.length = 0; K._validated = false;
  Object.keys(K.dig).forEach((p) => delete K.dig[p]);
  Object.keys(K.pwm).forEach((p) => delete K.pwm[p]);
  if (K.applyDigital) [2, 6, 9, 10, 11, 13].forEach((p) => K.applyDigital(p));
  if (K.applyPwm) [6, 9, 10, 11].forEach((p) => K.applyPwm(p));
  RUN = true;
  btnRun.hidden = true; btnStop.hidden = false;
  elStatus.textContent = "⏺ Ejecutando… pulsá ■ Detener para parar.";
  elStatus.className = "a3d__status is-run";
  K.serial("— sketch iniciado (práctica " + s.num + ") —");
  try {
    await runSketch(src, api, ctx);
  } catch (err) {
    if (err && err.stopped) { /* detenido por usuario */ }
    else {
      elStatus.textContent = "⚠ " + String(err.message || err);
      elStatus.className = "a3d__status is-err";
      const d = document.createElement("div");
      d.className = "is-err";
      d.textContent = "⚠ " + String(err.message || err);
      elConsole.appendChild(d);
      toast("Revisá el código: " + String(err.message || err), "err");
    }
  }
  if (myRun === RUNID) {
    RUN = false;
    btnRun.hidden = false; btnStop.hidden = true;
    if (elStatus.className.indexOf("is-err") === -1) {
      elStatus.textContent = "■ Detenido.";
      elStatus.className = "a3d__status";
    }
    if (K && K.ctx === ctx) K.serial("— sketch detenido —");
  }
}
function stopRun(silent) {
  if (runnerCtx) runnerCtx.stop = true;
  RUNID++;
  RUN = false;
  if (K) ["13", 2, 6, 9, 10, 11].forEach((p) => { K.dig[p] = 0; K.pwm[p] = 0; });
  if (K && K.applyDigital && !silent) [2, 6, 9, 10, 11, 13].forEach((p) => K.applyDigital(p));
  btnRun.hidden = false; btnStop.hidden = true;
}
btnRun.addEventListener("click", startRun);
btnStop.addEventListener("click", () => stopRun());
$("[data-a3d-restore]").addEventListener("click", () => { elCode.value = SCENES[IDX].code; delete SAVE.code[SCENES[IDX].id]; persist(); toast("Código original restaurado."); });
$("[data-a3d-reset]").addEventListener("click", () => { SAVE.done = {}; persist(); buildStrip(); refreshProgress(); toast("Progreso reiniciado. ¡A darle de nuevo!"); });
$("[data-a3d-fs]").addEventListener("click", () => {
  const st = $(".a3d__stage");
  if (document.fullscreenElement) document.exitFullscreen();
  else if (st.requestFullscreen) st.requestFullscreen();
});

/* ── interacción con componentes (botón, perilla, obstáculo) ── */
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let dragInfo = null;
function setPtr(ev) {
  const r = canvas.getBoundingClientRect();
  ptr.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  ptr.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
}
canvas.addEventListener("pointerdown", (ev) => {
  setPtr(ev);
  ray.setFromCamera(ptr, camera);
  if (K && K.clickDrag) {
    const hit = ray.intersectObject(K.clickDrag, false);
    if (hit.length) {
      dragInfo = { type: "drag", obj: K.clickDrag, plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) };
      controls.enabled = false;
      return;
    }
  }
  if (K && K.click) {
    for (const c of K.click) {
      const hit = ray.intersectObject(c.obj, true);
      if (hit.length) { dragInfo = { type: "press", c }; c.down(); return; }
    }
  }
  /* arrastrar la perilla */
  if (SCENES[IDX].id === "perilla" && K.parts.pot) {
    const hit = ray.intersectObject(K.parts.pot.g, true);
    if (hit.length) { dragInfo = { type: "knob", lastX: ev.clientX, v: K.sensors.knob }; controls.enabled = false; }
  }
});
window.addEventListener("pointermove", (ev) => {
  if (!dragInfo) return;
  if (dragInfo.type === "knob") {
    const dx = ev.clientX - dragInfo.lastX;
    dragInfo.lastX = ev.clientX;
    dragInfo.v = clamp(dragInfo.v + dx * 6, 0, 1023);
    K.setKnob(dragInfo.v);
    const slider = elCtl.querySelector("[data-ctl='knob']");
    if (slider) { slider.value = Math.round(dragInfo.v); $("[data-ctlv='knob']").textContent = Math.round(dragInfo.v); }
    try { localStorage.setItem("tr-a3d:v1", JSON.stringify(Object.assign(SAVE, { knobMeet: K.sensors.knob }))); } catch (e) {}
  } else if (dragInfo.type === "drag") {
    setPtr(ev);
    ray.setFromCamera(ptr, camera);
    const pt = new THREE.Vector3();
    if (ray.ray.intersectPlane(dragInfo.plane, pt)) {
      dragInfo.obj.position.x = clamp(pt.x, -9, 9);
      dragInfo.obj.position.z = clamp(pt.z, -9, 9);
    }
  }
});
window.addEventListener("pointerup", () => {
  if (dragInfo && dragInfo.type === "press") dragInfo.c.up();
  dragInfo = null;
  controls.enabled = true;
});

/* ── bucle de render ── */
const clock = new THREE.Clock();
function frameLoop() {
  requestAnimationFrame(frameLoop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (K && SCENES[IDX] && SCENES[IDX].robotGround && K.parts.robot) {
    const rp = K.parts.robot.g.position;
    const dx = rp.x - controls.target.x, dz = rp.z - controls.target.z;
    controls.target.x += dx * 0.06; controls.target.z += dz * 0.06;
    camera.position.x += dx * 0.06; camera.position.z += dz * 0.06;
  }
  controls.update();
  if (K && SCENES[IDX]) SCENES[IDX].frame(dt, K);
  projectMarkers();
  renderer.render(scene, camera);
}

loadScene(0);
refreshProgress();
sizeStage();
frameLoop();

/* hook mínimo para pruebas automatizadas y depuración */
window.A3D = {
  scene(i) { loadScene(i); },
  kit() { return K; },
  scenes: SCENES,
  run() { startRun(); },
  stop() { stopRun(); },
};
