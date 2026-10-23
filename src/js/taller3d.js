/* TechRevive · Taller 3D — armado libre de PC y laptops en 3D (Three.js r170).
   Se activa en lecciones de tipo «Simulador» con la opción «Taller 3D» (<section class="t3d" data-t3d>).
   Catálogo de piezas: js/taller3d-catalogo.js · Unidades de la escena: 1 = 1 cm. */
import * as THREE from "./vendor/three.module.min.js";
import { OrbitControls } from "./vendor/OrbitControls.js";

const root = document.querySelector(".t3d[data-t3d]");
const CAT = window.TALLER3D_CATALOGO;
const SAVE_KEY = "tr-t3d:v1";
const LESSON = (document.querySelector("[data-lesson]") || root || document.body).getAttribute("data-lesson") || "taller3d";

/* ───────────── utilidades ───────────── */
const $ = (s, el) => (el || root).querySelector(s);
const $$ = (s, el) => Array.prototype.slice.call((el || root).querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const range = (n) => Array.from({ length: Math.max(0, n | 0) }, (_, i) => i);
const q = (n) => "Q" + Math.round(n).toLocaleString("es-GT");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ───────────── índice de piezas ───────────── */
const BY = {};
const KINDS = { cases: "case", boards: "board", cpus: "cpu", coolers: "cooler", rams: "ram", gpus: "gpu", drives: "drive", psus: "psu", laptops: "laptop" };
if (CAT) Object.keys(KINDS).forEach((k) => (CAT[k] || []).forEach((p) => { p.kind = KINDS[k]; BY[p.id] = p; }));
const P = (id) => (id ? BY[id] || null : null);
const GEN = (CAT && CAT.GEN) || {};
const genName = (g) => (GEN[g] ? GEN[g][0] : g);

const KIND_LABEL = { case: "Gabinete", board: "Placa madre", cpu: "Procesador", cooler: "Disipador", ram: "Memoria RAM", gpu: "Tarjeta de video", drive: "Almacenamiento", psu: "Fuente de poder", laptop: "Laptop" };
const TABS = {
  pc: [["case", "Gabinetes"], ["board", "Placas madre"], ["cpu", "Procesadores"], ["cooler", "Disipadores"], ["ram", "Memoria RAM"], ["gpu", "Tarjetas de video"], ["drive", "Almacenamiento"], ["psu", "Fuentes"]],
  lap: [["laptop", "Laptops"], ["ram", "Memoria RAM"], ["drive", "Almacenamiento"]],
};

/* ───────────── estado ───────────── */
function emptyPC() { return { case: null, board: null, cpu: null, cooler: null, gpu: null, psu: null, ram: [], m2: [], bay: [], steps: {} }; }
function emptyLap() { return { laptop: null, ram: [], m2: [], b25: [], cover: true, batt: true }; }
const S = { mode: "pc", pc: emptyPC(), lap: emptyLap(), compat: true };
const UI = { tab: "case", armed: null, sel: null, powered: false, done: false, lastPost: null };

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!d) return;
    if (d.mode === "pc" || d.mode === "lap") S.mode = d.mode;
    S.compat = d.compat !== false;
    const okId = (id, kind) => (id && BY[id] && BY[id].kind === kind ? id : null);
    if (d.pc) {
      ["case", "board", "cpu", "cooler", "gpu", "psu"].forEach((k) => (S.pc[k] = okId(d.pc[k], k)));
      S.pc.ram = (d.pc.ram || []).map((id) => okId(id, "ram"));
      S.pc.m2 = (d.pc.m2 || []).map((id) => okId(id, "drive"));
      S.pc.bay = (d.pc.bay || []).map((id) => okId(id, "drive"));
      S.pc.steps = d.pc.steps || {};
      if (!S.pc.board) { S.pc.cpu = S.pc.cooler = S.pc.gpu = null; S.pc.ram = []; S.pc.m2 = []; }
      if (!S.pc.cpu) S.pc.cooler = null;
      if (!S.pc.case) { S.pc.gpu = S.pc.psu = null; S.pc.bay = []; }
    }
    if (d.lap) {
      S.lap.laptop = okId(d.lap.laptop, "laptop");
      S.lap.ram = (d.lap.ram || []).map((id) => okId(id, "ram"));
      S.lap.m2 = (d.lap.m2 || []).map((id) => okId(id, "drive"));
      S.lap.b25 = (d.lap.b25 || []).map((id) => okId(id, "drive"));
      S.lap.cover = d.lap.cover !== false; S.lap.batt = d.lap.batt !== false;
    }
    UI.done = localStorage.getItem("tr-t3d:done:" + LESSON) === "1";
  } catch (e) { /* estado dañado: se empieza de cero */ }
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

/* ───────────── acceso a ranuras ───────────── */
const ST = () => (S.mode === "pc" ? S.pc : S.lap);
function getAt(key) { const [k, i] = key.split(":"); const st = ST(); return i == null ? st[k] : (st[k] || [])[+i] || null; }
function setAt(key, id) { const [k, i] = key.split(":"); const st = ST(); if (i == null) st[k] = id; else { st[k] = st[k] || []; st[k][+i] = id; } }

/* ranuras de discos SATA de un gabinete: primero las de 3.5" y luego las de 2.5" */
function baysOf(c) { return c ? range(c.b35).map(() => "3.5").concat(range(c.b25).map(() => "2.5")) : []; }

function slotsFor(p) {
  if (S.mode === "pc") {
    const st = S.pc, b = P(st.board), c = P(st.case);
    switch (p.kind) {
      case "case": case "board": case "cpu": case "cooler": case "gpu": case "psu": return [p.kind];
      case "ram": return b ? range(b.slots).map((i) => "ram:" + i) : [];
      case "drive": return p.size === "m2" ? (b ? b.m2.map((_, i) => "m2:" + i) : []) : baysOf(c).map((_, i) => "bay:" + i);
      default: return [];
    }
  }
  const L = P(S.lap.laptop);
  switch (p.kind) {
    case "laptop": return ["laptop"];
    case "ram": return L ? range(L.ram).map((i) => "ram:" + i) : [];
    case "drive": return L ? (p.size === "m2" ? L.m2.map((_, i) => "m2:" + i) : range(L.b25).map((i) => "b25:" + i)) : [];
    default: return [];
  }
}

/* ───────────── consumo ───────────── */
function loadW() {
  const st = S.pc, cpu = P(st.cpu), g = P(st.gpu), cl = P(st.cooler);
  const drives = st.m2.filter(Boolean).length + st.bay.filter(Boolean).length;
  return Math.round((cpu ? cpu.w : 0) + (g ? g.w : 0) + (st.board ? 45 : 0) + st.ram.filter(Boolean).length * 4 + drives * 6 + (cl && cl.ct === "aio" ? 10 : 0));
}
const recPSU = (w) => Math.max(400, Math.ceil((w * 1.4) / 50) * 50);

function pcieCheck(g, ps) {
  if (!g || !ps) return [0, ""];
  if (!g.p8 && !g.p16) return [0, "Esta tarjeta no necesita cable de energía: se alimenta desde la ranura (75 W)."];
  if (g.p16) {
    if (ps.p16) return [0, "Cable nativo de 16 pines (12V-2x6) de la fuente a la tarjeta."];
    const need = g.w > 300 ? 4 : g.w > 225 ? 3 : 2;
    if (ps.p8 >= need) return [1, "La fuente no trae 16 pines: se usa el adaptador de " + need + "× 8 pines que viene con la tarjeta. Conéctalo hasta el fondo."];
    return [2, "La tarjeta necesita 16 pines (o " + need + "× 8 pines con adaptador) y la fuente solo tiene " + ps.p8 + " conector(es) PCIe de 8 pines."];
  }
  if (g.p8 > ps.p8) return [2, "La tarjeta pide " + g.p8 + "× 8 pines PCIe y la fuente solo tiene " + ps.p8 + "."];
  return [0, g.p8 + "× cable PCIe de 8 pines (6+2) de la fuente a la tarjeta."];
}

/* ───────────── motor de compatibilidad ─────────────
   Devuelve { lvl, msgs } · lvl: -1 falta algo antes · 0 compatible · 1 advertencia · 2 incompatible */
function check(p, key) {
  const msgs = [];
  const bad = (t) => msgs.push([2, t]), warn = (t) => msgs.push([1, t]), good = (t) => msgs.push([0, t]);
  const pre = (t) => ({ lvl: -1, msgs: [[-1, t]] });
  if (S.mode === "pc") {
    const st = S.pc, c = P(st.case), b = P(st.board), cpu = P(st.cpu), cl = P(st.cooler), g = P(st.gpu), ps = P(st.psu);
    switch (p.kind) {
      case "laptop": return { lvl: 2, msgs: [[2, "Es una laptop: cámbiate a la pestaña «Laptop»."]] };
      case "case":
        if (b && p.boards.indexOf(b.ff) < 0) bad("La placa " + b.ff + " no cabe: este gabinete acepta " + p.boards.join(", ") + ".");
        if (cl && cl.ct !== "aio" && cl.h > p.cooler) bad("El disipador mide " + cl.h + " cm y este gabinete solo admite " + p.cooler + " cm de alto.");
        break;
      case "board":
        if (c && c.boards.indexOf(p.ff) < 0) bad("Formato " + p.ff + ": no cabe en este gabinete (acepta " + c.boards.join(", ") + ").");
        break;
      case "cpu":
        if (!b) return pre("Primero instala la placa madre.");
        if (p.socket !== b.socket) bad("Socket " + p.socket + ": la placa usa " + b.socket + ". No entra.");
        else if (b.gens.indexOf(p.gen) < 0) bad("Mismo socket " + b.socket + ", pero el chipset de esta placa no admite " + genName(p.gen) + ". No encenderá.");
        else if (b.bios.indexOf(p.gen) >= 0) warn("La placa salió antes que este procesador: hay que actualizar el BIOS antes de encender (paso «Actualizar BIOS»).");
        if (!p.ig && b.socket === p.socket && !b.igpu) good("No tiene video integrado: necesitarás una tarjeta de video.");
        break;
      case "cooler":
        if (!cpu) return pre("Primero instala el procesador.");
        if (p.ct === "aio" && !c) return pre("Instala la placa dentro del gabinete: el radiador se atornilla al gabinete.");
        if (p.s.indexOf(b.socket) < 0) bad("No trae montaje para el socket " + b.socket + ".");
        if (c) {
          if (p.ct === "aio") { if (c.rads.indexOf(p.rad) < 0) bad("El gabinete no tiene espacio para un radiador de " + p.rad + " mm" + (c.rads.length ? " (admite " + c.rads.join("/") + " mm)." : ".")); }
          else if (p.h > c.cooler) bad("Mide " + p.h + " cm de alto y en el gabinete caben disipadores de hasta " + c.cooler + " cm: la tapa no cerraría.");
        }
        if (p.tdp < cpu.w * 0.75) warn("Disipa ~" + p.tdp + " W y el " + cpu.name + " llega a " + cpu.w + " W: se calentará y bajará su velocidad.");
        break;
      case "ram": {
        if (!b) return pre("Primero instala la placa madre.");
        if (p.form !== "DIMM") { bad("Es SODIMM (memoria de laptop). La PC de escritorio usa módulos DIMM, más largos."); break; }
        if (p.type !== b.mem) { bad("Es " + p.type + " y la placa usa " + b.mem + ". La muesca está en otro lugar: no entra."); break; }
        const others = st.ram.map(P).filter(Boolean).filter((r, i) => "ram:" + i !== key);
        const tot = others.reduce((a, r) => a + r.gb, 0) + p.gb;
        if (tot > b.maxRam) warn("La placa reconoce hasta " + b.maxRam + " GB en total.");
        if (others.some((r) => r.mhz !== p.mhz)) warn("Velocidades distintas: todas las memorias trabajarán a la del módulo más lento.");
        break;
      }
      case "gpu":
        if (!b || !c) return pre("Primero instala la placa madre dentro del gabinete.");
        if (p.L > c.gpu) bad("Mide " + p.L + " cm y en este gabinete caben tarjetas de hasta " + c.gpu + " cm.");
        if (ps) { const pc = pcieCheck(p, ps); if (pc[0]) msgs.push(pc); }
        if (ps && ps.w < loadW() - (g ? g.w : 0) + p.w) warn("Con esta tarjeta el equipo consumirá ~" + (loadW() - (g ? g.w : 0) + p.w) + " W y la fuente entrega " + ps.w + " W.");
        break;
      case "psu": {
        if (!c) return pre("Primero instala el gabinete.");
        if (c.psu.indexOf(p.ff) < 0) bad("Fuente " + p.ff + ": este gabinete solo admite fuentes " + c.psu.join("/") + ".");
        const w = loadW();
        if (w && p.w < w) warn("Entrega " + p.w + " W reales y el equipo consume ~" + w + " W: se apagará con carga.");
        else if (w && p.w < w * 1.2) warn("Quedará muy justa (consumo ~" + w + " W). Recomendado: " + recPSU(w) + " W.");
        if (p.generic) warn("Fuente genérica: dice «" + p.label + " W» pero entrega mucho menos y no tiene protecciones confiables.");
        if (g) { const pc = pcieCheck(g, p); if (pc[0]) msgs.push(pc); }
        if (p.ff === "SFX" && c.psu.indexOf("ATX") >= 0) good("Fuente SFX en gabinete ATX: necesita el soporte adaptador (bracket).");
        break;
      }
      case "drive": {
        const [k, i] = (key || "").split(":");
        if (p.size === "m2") {
          if (!b) return pre("Primero instala la placa madre (las M.2 van en la placa).");
          if (!b.m2.length) return { lvl: 2, msgs: [[2, "Esta placa (" + b.year + ") no tiene ranuras M.2. Usa un disco SATA."]] };
          if (k === "m2") {
            const sl = b.m2[+i];
            if (p.bus === "m2sata" && sl[1] >= 5) bad("Esta ranura M.2 es PCIe 5.0 y solo acepta NVMe.");
            if (p.bus === "nvme" && p.gen > sl[1]) warn("Ranura PCIe " + sl[1] + ".0: funcionará, pero más lento (máx. ~" + (sl[1] === 3 ? "3 500" : "7 000") + " MB/s).");
          }
        } else {
          if (!c) return pre("Primero instala el gabinete (los discos SATA van en sus bahías).");
          const bays = baysOf(c);
          if (!bays.length) return { lvl: 2, msgs: [[2, "Este gabinete no tiene bahías para discos."]] };
          if (k === "bay") { if (p.size === "3.5" && bays[+i] === "2.5") bad("Un disco de 3.5\" no entra en una bahía de 2.5\"."); }
          else if (p.size === "3.5" && bays.indexOf("3.5") < 0) bad("El gabinete no tiene bahías de 3.5\".");
          if (p.bus === "sata" && p.speed < 200) good("Disco duro mecánico: ideal para guardar archivos; para Windows es mejor un SSD.");
        }
        break;
      }
    }
  } else {
    const L = P(S.lap.laptop);
    switch (p.kind) {
      case "laptop": break;
      case "ram":
        if (!L) return pre("Primero elige una laptop.");
        if (!L.ram) { bad("Esta laptop tiene la RAM soldada (" + L.solder + " GB): no tiene ranuras para ampliar."); break; }
        if (p.form !== "SODIMM") { bad("Es DIMM (memoria de escritorio). Las laptops usan SODIMM, más cortas."); break; }
        if (p.type !== L.mem) bad("Es " + p.type + " y la laptop usa " + L.mem + ". No entra.");
        else {
          const tot = S.lap.ram.map(P).filter(Boolean).filter((r, i) => "ram:" + i !== key).reduce((a, r) => a + r.gb, 0) + p.gb;
          if (tot > L.maxRam) warn("La laptop reconoce hasta " + L.maxRam + " GB.");
        }
        break;
      case "drive": {
        if (!L) return pre("Primero elige una laptop.");
        const [k, i] = (key || "").split(":");
        if (p.size === "3.5") { bad("Un disco de 3.5\" es de escritorio: no cabe en una laptop."); break; }
        if (!p.lap) { bad("Su disipador es demasiado alto para una laptop."); break; }
        if (p.size === "m2") {
          if (!L.m2.length) { bad("Esta laptop no tiene ranura M.2: usa un SSD SATA de 2.5\"."); break; }
          if (k === "m2") {
            const sl = L.m2[+i];
            if (p.bus === "m2sata" && !sl[2]) bad("Esta ranura M.2 solo acepta NVMe.");
            if (p.bus === "nvme" && p.gen > sl[1]) warn("Ranura PCIe " + sl[1] + ".0: funcionará más lento.");
          }
        } else if (!L.b25) bad("Esta laptop no tiene bahía de 2.5\": solo M.2.");
        break;
      }
      default: return { lvl: 2, msgs: [[2, "Es una pieza de PC de escritorio."]] };
    }
  }
  const lvl = msgs.reduce((a, m) => Math.max(a, m[0]), 0);
  return { lvl, msgs };
}

/* evaluación global de una pieza (para las etiquetas del catálogo) */
function evalPart(p) {
  const slots = slotsFor(p);
  if (!slots.length) { const r = check(p, null); return r.lvl < 0 || r.lvl === 2 ? r : { lvl: -1, msgs: [[-1, "Primero instala la pieza donde va conectada."]] }; }
  const free = slots.filter((k) => !getAt(k));
  if (!free.length) {
    const r = check(p, slots[0]);
    if (r.lvl < 0) return r;
    return { lvl: -2, msgs: [[-2, slots.length > 1 ? "Todas las ranuras están ocupadas." : "Ya hay uno instalado: retíralo para cambiarlo."]].concat(r.msgs), base: r.lvl };
  }
  let best = null;
  free.forEach((k) => { const r = check(p, k); if (!best || r.lvl < best.lvl) { best = r; best.key = k; } });
  return best;
}

/* ranura sugerida para el botón «Instalar» */
function bestSlot(p) {
  let order = slotsFor(p).filter((k) => !getAt(k));
  if (p.kind === "ram" && S.mode === "pc") {
    const b = P(S.pc.board);
    if (b && b.slots === 4) order = ["ram:1", "ram:3", "ram:0", "ram:2"].filter((k) => order.indexOf(k) >= 0);
  }
  if (p.kind === "drive" && p.size === "2.5" && S.mode === "pc") {
    const bays = baysOf(P(S.pc.case));
    order.sort((a, b) => (bays[+a.split(":")[1]] === "2.5" ? 0 : 1) - (bays[+b.split(":")[1]] === "2.5" ? 0 : 1));
  }
  let best = null, bl = 9;
  order.forEach((k) => { const r = check(p, k); if (r.lvl >= 0 && r.lvl < bl) { bl = r.lvl; best = k; } });
  return bl <= 1 ? best : null;
}

/* ───────────── pasos (cables, pasta, BIOS) ───────────── */
function stepsPC() {
  const st = S.pc, s = st.steps, c = P(st.case), b = P(st.board), cpu = P(st.cpu), cl = P(st.cooler), g = P(st.gpu), ps = P(st.psu);
  const inCase = !!(b && c);
  const sataDrives = st.bay.filter(Boolean).length;
  const out = [];
  const add = (id, label, need, extra) => out.push(Object.assign({ id, label, need, en: !need, done: !!s[id] }, extra || {}));
  if (b && cpu && b.bios.indexOf(cpu.gen) >= 0) add("bios", "Actualizar BIOS (BIOS Flashback con USB)", "", { tip: "Se puede hacer sin procesador: copia el BIOS nuevo a una USB y presiona el botón Flashback de la placa." });
  if (cl) {
    if (cl.ct === "stock") out.push({ id: "paste", label: "Pasta térmica (el disipador original ya la trae)", en: false, done: true, auto: true });
    else add("paste", "Aplicar pasta térmica al procesador", "", { tip: "Un punto del tamaño de un grano de arroz en el centro del procesador." });
    add("fan", "Conectar el ventilador" + (cl.ct === "aio" ? " y la bomba" : "") + " a CPU_FAN", "");
  }
  add("c24", "Cable de 24 pines (ATX) a la placa", !inCase ? "Coloca la placa en el gabinete." : !ps ? "Instala la fuente." : "");
  add("eps", "Cable EPS de 8 pines (CPU) a la placa", !inCase ? "Coloca la placa en el gabinete." : !ps ? "Instala la fuente." : "");
  if (g && (g.p8 || g.p16)) add("pcie", "Cable PCIe de energía a la tarjeta de video", !ps ? "Instala la fuente." : "");
  if (sataDrives) add("sata", "Cables SATA (datos y energía) a los discos", !ps ? "Instala la fuente." : "");
  add("front", "Conectores del panel frontal (botón de encendido)", !inCase ? "Coloca la placa en el gabinete." : "");
  return out;
}

function toggleStep(id) {
  const st = S.pc, s = st.steps;
  const it = stepsPC().find((x) => x.id === id);
  if (!it || it.auto) return;
  if (!it.en && !s[id]) { say(it.need || "Todavía no se puede.", "warn"); return; }
  if (!s[id] && id === "pcie") {
    const r = pcieCheck(P(st.gpu), P(st.psu));
    if (r[0] === 2) { say(r[1] + " Cambia la fuente.", "bad"); return; }
    if (r[0] === 1) say(r[1], "warn");
  }
  if (!s[id] && id === "sata") {
    const n = st.bay.filter(Boolean).length, ps = P(st.psu);
    if (n > ps.sata) { say("La fuente solo tiene " + ps.sata + " conectores SATA y hay " + n + " discos.", "bad"); return; }
  }
  if (!s[id] && id === "paste" && !st.cooler) { say("Primero el disipador.", "warn"); return; }
  s[id] = !s[id];
  const names = { bios: "BIOS actualizado ✔", paste: "Pasta térmica aplicada ✔", fan: "Ventilador conectado a CPU_FAN ✔", c24: "24 pines conectado ✔", eps: "EPS de 8 pines conectado ✔", pcie: "Energía de la tarjeta conectada ✔", sata: "Discos SATA conectados ✔", front: "Panel frontal conectado ✔" };
  if (s[id] && names[id] && id !== "pcie") say(names[id], "ok");
  changed();
}

/* ───────────── instalar / retirar ───────────── */
function install(id, key) {
  const p = P(id);
  if (!p) return false;
  if (S.mode === "lap" && p.kind !== "laptop") {
    if (!S.lap.laptop) { say("Primero elige una laptop.", "warn"); return false; }
    if (S.lap.cover) { say("Primero quita los tornillos y la tapa inferior.", "warn"); return false; }
    if (S.lap.batt) { say("¡Alto! Desconecta la batería antes de tocar la placa. Así evitas cortocircuitos.", "bad"); return false; }
  }
  key = key || bestSlot(p);
  if (!key) {
    const r = evalPart(p);
    say((r.msgs.find((m) => m[0] === 2 || m[0] < 0) || r.msgs[0] || [0, "No hay una ranura disponible."])[1], r.lvl === 2 ? "bad" : "warn");
    return false;
  }
  if (getAt(key)) { say("Esa ranura ya está ocupada.", "warn"); return false; }
  const r = check(p, key);
  if (r.lvl < 0) { say(r.msgs[0][1], "warn"); return false; }
  if (r.lvl === 2) { say("No se puede: " + r.msgs.filter((m) => m[0] === 2).map((m) => m[1]).join(" "), "bad"); return false; }
  setAt(key, id);
  if (p.kind === "laptop") {
    S.lap.ram = range(p.ram).map((i) => (p.stock.ram || [])[i] || null);
    S.lap.m2 = p.m2.map((_, i) => (p.stock.m2 || [])[i] || null);
    S.lap.b25 = range(p.b25).map((i) => (p.stock.b25 || [])[i] || null);
    S.lap.cover = true; S.lap.batt = true;
  }
  if (p.kind === "case") { S.pc.bay = []; }
  if (p.kind === "board") { S.pc.ram = []; S.pc.m2 = []; S.pc.steps.bios = false; }
  if (p.kind === "cooler") { S.pc.steps.paste = false; S.pc.steps.fan = false; }
  const w = r.msgs.filter((m) => m[0] === 1).map((m) => m[1]);
  say(p.name + " instalado" + (w.length ? ". ⚠ " + w.join(" ") : " ✔"), w.length ? "warn" : "ok");
  UI.armed = null; UI.sel = key;
  structureMaybe(p.kind);
  changed();
  autoTab();
  return true;
}

function remove(key) {
  const id = getAt(key), p = P(id);
  if (!p) return;
  const st = ST(), extra = [];
  if (S.mode === "lap" && p.kind !== "laptop") {
    if (S.lap.cover) { say("Primero quita la tapa inferior.", "warn"); return; }
    if (S.lap.batt) { say("¡Alto! Desconecta la batería antes de retirar piezas.", "bad"); return; }
  }
  if (S.mode === "pc") {
    const s = st.steps;
    if (p.kind === "cpu" && st.cooler) { say("Primero retira el disipador que está encima del procesador.", "warn"); return; }
    if (p.kind === "cooler") { if (s.paste && p.ct !== "stock") extra.push("Limpia la pasta vieja con alcohol isopropílico antes de volver a montar."); s.paste = false; s.fan = false; }
    if (p.kind === "board") {
      ["cpu", "cooler", "gpu"].forEach((k) => { if (st[k]) { extra.push(P(st[k]).name); st[k] = null; } });
      st.ram.forEach((r) => r && extra.push(P(r).name)); st.m2.forEach((r) => r && extra.push(P(r).name));
      st.ram = []; st.m2 = [];
      ["bios", "paste", "fan", "c24", "eps", "pcie", "front"].forEach((k) => (s[k] = false));
      if (extra.length) extra.unshift("También se retiró:");
    }
    if (p.kind === "case") {
      ["gpu", "psu"].forEach((k) => { if (st[k]) { extra.push(P(st[k]).name); st[k] = null; } });
      st.bay.forEach((r) => r && extra.push(P(r).name)); st.bay = [];
      const cl = P(st.cooler);
      if (cl && cl.ct === "aio") { extra.push(cl.name); st.cooler = null; s.paste = false; s.fan = false; }
      ["c24", "eps", "pcie", "sata", "front"].forEach((k) => (s[k] = false));
      if (extra.length) extra.unshift("También se retiró:");
      if (st.board) extra.push("La placa quedó sobre la mesa.");
    }
    if (p.kind === "gpu") s.pcie = false;
    if (p.kind === "psu") ["c24", "eps", "pcie", "sata"].forEach((k) => (s[k] = false));
  } else if (p.kind === "laptop") { S.lap = emptyLap(); }
  setAt(key, null);
  if (S.mode === "pc" && !st.bay.some(Boolean)) st.steps.sata = false;
  say(p.name + " retirado. " + extra.join(" "), "info");
  UI.sel = null;
  structureMaybe(p.kind);
  changed();
}

/* ───────────── encender (POST) ───────────── */
function ramInfo(st, slots) {
  const mods = st.ram.map(P);
  const list = mods.filter(Boolean);
  const gb = list.reduce((a, r) => a + r.gb, 0);
  let dual = false, wrong = false;
  if (slots === 4) { dual = !!(mods[1] && mods[3]) || !!(mods[0] && mods[2]); wrong = list.length === 2 && !dual; }
  else if (slots === 2) dual = !!(mods[0] && mods[1]);
  return { list, gb, dual, wrong, mhz: list.length ? Math.min.apply(null, list.map((r) => r.mhz)) : 0, type: list[0] ? list[0].type : "" };
}

function estimates(cpu, gScore, ram, drives, gpuName) {
  const boot = drives[0];
  const ssd = boot && boot.speed >= 500;
  const office = cpu.st * (ssd ? 1 : 0.55) * (ram.gb >= 8 ? 1 : ram.gb >= 4 ? 0.7 : 0.4);
  const fps = Math.round(Math.min(gScore * 1.2, cpu.st * 1.7) * (ram.gb < 8 ? 0.6 : ram.gb < 16 ? 0.9 : 1) * (ram.dual ? 1 : 0.85));
  const edit = cpu.mt * (ram.gb >= 32 ? 1 : ram.gb >= 16 ? 0.85 : 0.6);
  const lab = (v, t) => t.find((x) => v >= x[0])[1];
  return [
    { k: "Oficina e internet", v: clamp(office / 0.9, 3, 100), t: lab(office, [[50, "Excelente"], [32, "Buena"], [18, "Aceptable"], [0, "Lenta"]]), d: ssd ? "Arranca con SSD" : "Windows en disco duro: arranque lento" },
    { k: "Juegos AAA (1080p, calidad media)", v: clamp(fps / 1.6, 2, 100), t: fps + " FPS · " + lab(fps, [[120, "Competitivo"], [60, "Fluido"], [30, "Jugable"], [0, "No jugable"]]), d: gpuName },
    { k: "Edición de video / render", v: clamp(edit / 1.8, 2, 100), t: lab(edit, [[120, "Profesional"], [60, "Buena"], [30, "Básica"], [0, "No recomendada"]]), d: cpu.c || "" },
  ];
}

function postPC() {
  const st = S.pc, s = st.steps, c = P(st.case), b = P(st.board), cpu = P(st.cpu), cl = P(st.cooler), g = P(st.gpu), ps = P(st.psu);
  const R = { ok: false, sympt: [], hints: [], warns: [], spin: false };
  const fail = (sym, hint) => { R.sympt.push(sym); if (hint) R.hints.push(hint); return R; };
  if (!c) return fail("No hay gabinete: arma el equipo dentro de uno.", "Elige un gabinete en el catálogo.");
  if (!b) return fail("No hay placa madre instalada.", "Instala una placa madre compatible con el gabinete.");
  if (!ps) return fail("No hay fuente de poder: nada recibe energía.", "Instala una fuente en el gabinete.");
  if (!s.c24 || !s.front) return fail("Presionas el botón de encendido y no pasa nada: ni luces ni ventiladores.", !s.c24 ? "¿Está conectado el cable de 24 pines a la placa?" : "El botón del gabinete llega a la placa por los conectores del panel frontal (F_PANEL). ¿Los conectaste?");
  const w = loadW();
  if (ps.w < w * 0.85 || (ps.generic && w > ps.w)) { R.spin = true; return fail("Los ventiladores giran un segundo y todo se apaga. Cada vez que lo intentas pasa lo mismo.", "La fuente se protege porque no da abasto: entrega " + ps.w + " W reales y el equipo pide ~" + w + " W. Usa una de " + recPSU(w) + " W."); }
  R.spin = true;
  if (!cpu) return fail("Los ventiladores giran, pero no hay imagen. En la placa se enciende el LED «CPU».", "Falta el procesador.");
  if (!s.eps) return fail("Los ventiladores giran, pero no hay imagen. LED «CPU» encendido en la placa.", "El procesador recibe energía por el cable EPS de 8 pines (arriba a la izquierda de la placa). ¿Está conectado?");
  if (b.bios.indexOf(cpu.gen) >= 0 && !s.bios) return fail("Ventiladores giran, no hay imagen, LED «CPU» encendido. Todo parece bien conectado…", "La placa es más antigua que el procesador: su BIOS no lo reconoce. Actualízalo con BIOS Flashback (no necesita procesador).");
  const ram = ramInfo(st, b.slots);
  if (!ram.list.length) return fail("Ventiladores giran, no hay imagen y se enciende el LED «DRAM»" + (b.year < 2015 ? " (o suenan pitidos largos repetidos)." : "."), "Falta la memoria RAM.");
  const hasIg = cpu.ig > 0 || b.igpu;
  if (!g && !hasIg) return fail("Ventiladores giran, la placa enciende el LED «VGA» y el monitor dice «Sin señal».", "El " + cpu.name + " no tiene video integrado: necesita una tarjeta de video.");
  if (g && (g.p8 || g.p16) && !s.pcie) return fail("Ventiladores del gabinete giran, pero los de la tarjeta de video no. LED «VGA» y monitor sin señal.", "La tarjeta de video necesita su propio cable de energía PCIe desde la fuente.");
  if (!cl) return fail("Aparece el logo de la placa y a los pocos segundos se apaga solo. Al tocar el procesador… ¡quema!", "No tiene disipador: el procesador pasa de 100 °C y se apaga para protegerse. ¡Nunca enciendas sin disipador!");
  /* POST correcto */
  R.ok = true;
  const ratio = cpu.w / cl.tdp, paste = s.paste || cl.ct === "stock";
  let temp = Math.round(32 + ratio * 26 + (paste ? 0 : 38));
  if (!paste) R.warns.push(["alta", "CPU a " + temp + " °C en el BIOS: le falta pasta térmica. Bajará su velocidad y se apagará al exigirle."]);
  if (!s.fan) R.warns.push(["alta", "Mensaje «CPU Fan Error! Press F1»: el ventilador del disipador no está conectado a CPU_FAN, así que no gira."]);
  if (ps.w < w) R.warns.push(["alta", "La fuente entrega " + ps.w + " W y el equipo pide ~" + w + " W a máxima carga: se apagará al jugar o renderizar."]);
  else if (ps.w < w * 1.2) R.warns.push(["media", "Fuente justa (" + ps.w + " W para ~" + w + " W). Recomendado: " + recPSU(w) + " W."]);
  if (ps.generic) R.warns.push(["media", "Fuente genérica: sin certificación ni protecciones confiables. Es la causa n.º 1 de placas quemadas."]);
  if (ratio > 1.33 && paste) R.warns.push(["media", "El disipador se queda corto (" + cl.tdp + " W para un procesador de " + cpu.w + " W): temperatura alta y menos rendimiento."]);
  if (ram.list.length === 1) R.warns.push(["baja", "Un solo módulo de RAM: trabaja en canal sencillo. Con dos iguales (dual channel) rinde más."]);
  if (ram.wrong) R.warns.push(["baja", "Dos módulos en ranuras del mismo canal. Ponlos en A2 y B2 (la 2.ª y 4.ª ranura) para activar dual channel."]);
  if (ram.gb > b.maxRam) R.warns.push(["baja", "Solo se reconocen " + b.maxRam + " GB de " + ram.gb + " GB."]);
  if (ram.gb < 8) R.warns.push(["baja", "Solo " + ram.gb + " GB de RAM: Windows 10/11 irá lento. Mínimo recomendado: 8 GB."]);
  const pr = g ? pcieCheck(g, ps) : [0];
  if (pr[0] === 1) R.warns.push(["baja", "Tarjeta conectada con adaptador. Verifica que el conector entre hasta el fondo: un 16 pines flojo se puede derretir."]);
  st.m2.forEach((id, i) => { const d = P(id); if (d && d.bus === "nvme" && d.gen > b.m2[i][1]) R.warns.push(["baja", d.name + " en ranura PCIe " + b.m2[i][1] + ".0: rinde a velocidad reducida."]); });
  const drives = st.m2.map(P).filter(Boolean).concat(st.bay.map(P).filter(Boolean)).sort((a, z) => z.speed - a.speed);
  if (!drives.length) R.noBoot = true;
  const gScore = g ? g.g : cpu.ig || (b.igpu ? 2 : 0);
  const gpuName = g ? g.name : cpu.ig ? "Video integrado del procesador" : "Video integrado de la placa";
  const win11 = GEN[cpu.gen] && GEN[cpu.gen][1];
  R.bios = {
    title: "TechRevive UEFI BIOS · " + b.name,
    rows: [
      ["Procesador", cpu.name + " · " + cpu.c],
      ["Temperatura CPU", temp + " °C" + (temp > 85 ? " ⚠" : "")],
      ["Memoria", ram.gb + " GB " + ram.type + " a " + ram.mhz + " MHz · " + (ram.dual ? "Dual channel" : "Canal sencillo")],
      ["Video", gpuName],
      ["Almacenamiento", drives.length ? drives.map((d) => d.name).join(" · ") : "Ninguno detectado"],
      ["Ventilador CPU", s.fan ? Math.round(900 + ratio * 600) + " RPM" : "0 RPM ⚠"],
      ["Fuente", ps.name + " · consumo estimado ~" + w + " W"],
    ],
  };
  R.est = drives.length ? estimates(cpu, gScore, ram, drives, gpuName) : null;
  R.win11 = win11 && ram.gb >= 4 && drives.length
    ? [true, "Compatible con Windows 11 (TPM 2.0 y Secure Boot disponibles)."]
    : [false, !win11 ? genName(cpu.gen) + " no está en la lista de Windows 11 (requiere Intel 8.ª gen / Ryzen 2000 o más nuevos). Puede usar Windows 10 o Linux." : ram.gb < 4 ? "Windows 11 pide al menos 4 GB de RAM." : "Falta un disco para instalar Windows."];
  R.price = totalPrice();
  R.watts = w;
  R.complete = !!drives.length && !R.warns.some((x) => x[0] === "alta");
  return R;
}

function postLap() {
  const L = P(S.lap.laptop);
  const R = { ok: false, sympt: [], hints: [], warns: [], spin: false };
  const fail = (sym, hint) => { R.sympt.push(sym); if (hint) R.hints.push(hint); return R; };
  if (!L) return fail("No hay laptop en la mesa.", "Elige una laptop en el catálogo.");
  if (!S.lap.batt) return fail("Presionas el botón y no enciende ni una luz.", "La batería está desconectada. Vuelve a conectarla (paso «Conectar batería») antes de probar.");
  R.spin = true;
  const mods = S.lap.ram.map(P).filter(Boolean);
  const gb = (L.solder || 0) + mods.reduce((a, r) => a + r.gb, 0);
  if (!gb) return fail("Enciende, el ventilador gira, pero la pantalla queda negra y la luz de Bloq Mayús parpadea.", "Falta la memoria RAM.");
  R.ok = true;
  if (!S.lap.cover) R.warns.push(["media", "Encendiste sin la tapa inferior: ciérrala y atorníllala antes de entregar (el flujo de aire del ventilador depende de ella)."]);
  if (mods.length === 1 && L.ram === 2) R.warns.push(["baja", "Un solo módulo: canal sencillo. Con dos iguales rinde más, sobre todo el video integrado."]);
  if (gb > L.maxRam) R.warns.push(["baja", "Solo se reconocen " + L.maxRam + " GB."]);
  if (gb < 8) R.warns.push(["baja", "Solo " + gb + " GB de RAM: Windows irá lento."]);
  const drives = S.lap.m2.map(P).filter(Boolean).concat(S.lap.b25.map(P).filter(Boolean)).sort((a, z) => z.speed - a.speed);
  if (!drives.length) R.noBoot = true;
  const ram = { gb, dual: L.solder ? true : mods.length >= 2, list: mods };
  const cpu = L.cpu;
  const gScore = L.gpu ? L.gpu.g : cpu.ig;
  const gpuName = L.gpu ? L.gpu.name : "Video integrado del procesador";
  R.bios = {
    title: "TechRevive UEFI BIOS · " + L.name,
    rows: [
      ["Procesador", cpu.name],
      ["Memoria", gb + " GB " + L.mem + (L.solder ? " (soldada)" : " · " + (ram.dual ? "Dual channel" : "Canal sencillo"))],
      ["Video", gpuName],
      ["Almacenamiento", drives.length ? drives.map((d) => d.name).join(" · ") : "Ninguno detectado"],
      ["Batería", "Conectada · 87 % · cargando"],
    ],
  };
  R.est = drives.length ? estimates(cpu, gScore, ram, drives, gpuName) : null;
  const w11 = GEN[cpu.gen] && GEN[cpu.gen][1];
  R.win11 = w11 && gb >= 4 && drives.length ? [true, "Compatible con Windows 11."] : [false, !w11 ? genName(cpu.gen) + " no es compatible con Windows 11: usa Windows 10 o Linux." : gb < 4 ? "Windows 11 pide al menos 4 GB de RAM." : "Falta un disco para instalar Windows."];
  R.price = totalPrice();
  R.complete = !!drives.length && !R.warns.some((x) => x[0] === "alta");
  return R;
}

function totalPrice() {
  if (S.mode === "pc") {
    const st = S.pc;
    return ["case", "board", "cpu", "cooler", "gpu", "psu"].map((k) => P(st[k])).concat(st.ram.map(P), st.m2.map(P), st.bay.map(P)).filter(Boolean).reduce((a, p) => a + (p.price || 0), 0);
  }
  const L = P(S.lap.laptop);
  if (!L) return 0;
  const stock = [].concat(L.stock.ram || [], L.stock.m2 || [], L.stock.b25 || []).filter(Boolean);
  const now = [].concat(S.lap.ram, S.lap.m2, S.lap.b25).filter(Boolean);
  const extra = now.slice();
  stock.forEach((id) => { const i = extra.indexOf(id); if (i >= 0) extra.splice(i, 1); });
  return L.price + extra.reduce((a, id) => a + (P(id).price || 0), 0);
}

/* ───────────── ejemplos ───────────── */
const PRESETS = [
  { id: "oficina", name: "Oficina 2024 (Intel)", pc: ["case-matx", "mb-b660", "cpu-12100", "cl-laminar", ["ram-ddr4-8", "ram-ddr4-8"], "nvme3-500", "psu-450b"] },
  { id: "gamer", name: "Gamer 1080p (AMD)", pc: ["case-mid", "mb-b650", "cpu-7600", "cl-t120", ["ram-ddr5-16", "ram-ddr5-16"], "nvme4-1", "psu-650b", "gpu-4060"] },
  { id: "itx", name: "Mini-ITX compacta", pc: ["case-itx", "mb-b650i", "cpu-7800x3d", "cl-lp", ["ram-ddr5-32", "ram-ddr5-32"], "nvme4-1", "psu-sfx600", "gpu-4060"] },
  { id: "tope", name: "Entusiasta 4K", pc: ["case-full", "mb-x870e", "cpu-9950x", "cl-aio360", ["ram-ddr5-32", "ram-ddr5-32"], "nvme5-2", "psu-1000p", "gpu-4090", "hdd35-4"] },
  { id: "retro", name: "Retro 2008 (Core 2 Duo)", pc: ["case-old", "mb-g41", "cpu-e8400", "cl-775", ["ram-ddr2-2", "ram-ddr2-2"], "hdd35-1", "psu-450b"] },
  { id: "reto", name: "🔧 Reto: PC con fallas ocultas", pc: ["case-mid", "mb-b450", "cpu-5600g", "cl-wraith", ["ram-ddr4-8"], "hdd35-1", "psu-gen500", "gpu-3060"] },
  { id: "lap-up", name: "💻 Laptop 2019 para mejorar", lap: "lap-2019" },
];
function applyPreset(id) {
  const pr = PRESETS.find((x) => x.id === id);
  if (!pr) return;
  if (pr.lap) { S.mode = "lap"; S.lap = emptyLap(); install(pr.lap, "laptop"); say("Laptop lista. Ábrela, desconecta la batería y mejórala: más RAM y un SSD.", "info"); renderAll(true); return; }
  S.mode = "pc"; S.pc = emptyPC(); UI.armed = null; UI.sel = null;
  const quiet = (id2, key) => { const p = P(id2); if (!p) return; const k = key || bestSlot(p); if (k && check(p, k).lvl <= 1) setAt(k, id2); };
  pr.pc.forEach((x) => (Array.isArray(x) ? x.forEach((r) => quiet(r)) : quiet(x)));
  say("Ejemplo «" + pr.name + "» cargado. Las piezas están puestas, pero faltan los pasos: pasta térmica y cables. Luego presiona Encender." + (id === "reto" ? " Este equipo tiene varios problemas: encuéntralos y corrígelos." : ""), "info");
  renderAll(true);
}

/* ───────────── escena 3D ───────────── */
let renderer, scene, camera, controls, world, markerGroup, selBox, dirty = true, visible = true;
const spinners = [], glowers = [];
let markers = [];
const PX = 22; // píxeles por cm en las texturas

const matCache = new Map();
function mat(color, rough, metal, extra) {
  const k = color + "|" + rough + "|" + metal + "|" + (extra ? JSON.stringify(extra) : "");
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough == null ? 0.6 : rough, metalness: metal || 0 }, extra || {})));
  return matCache.get(k);
}
const texCache = new Map();
function ctex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement("canvas");
  cv.width = Math.max(8, Math.round(w)); cv.height = Math.max(8, Math.round(h));
  const x = cv.getContext("2d");
  draw(x, cv.width, cv.height);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}
const tmat = (tex, rough, metal, extra) => {
  const k = "tex:" + tex.uuid + (rough || "") + (extra ? JSON.stringify(extra) : "");
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial(Object.assign({ map: tex, roughness: rough == null ? 0.65 : rough, metalness: metal || 0 }, extra || {})));
  return matCache.get(k);
};
function box(w, h, d, m, x, y, z, parent) {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  me.position.set(x || 0, y || 0, z || 0);
  if (parent) parent.add(me);
  return me;
}
/* caja con una cara texturizada: face 0 +x · 1 −x · 2 +y · 3 −y · 4 +z · 5 −z */
function boxT(w, h, d, base, face, fm, x, y, z, parent) {
  const arr = [base, base, base, base, base, base];
  (Array.isArray(face) ? face : [face]).forEach((f, i) => (arr[f] = Array.isArray(fm) ? fm[i] : fm));
  return box(w, h, d, arr, x, y, z, parent);
}
function cyl(r, h, m, x, y, z, parent, seg) {
  const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 28), m);
  me.position.set(x || 0, y || 0, z || 0);
  if (parent) parent.add(me);
  return me;
}
function label(ctx, txt, x, y, size, color, weight, align) {
  ctx.fillStyle = color || "#fff"; ctx.font = (weight || 700) + " " + size + "px system-ui, 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = align || "left"; ctx.textBaseline = "middle"; ctx.fillText(txt, x, y);
}

/* textura de ventilador */
function fanTex(color) {
  return ctex("fan" + color, 256, 256, (x, w) => {
    x.clearRect(0, 0, w, w);
    x.fillStyle = "#0b0d12"; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill();
    x.fillStyle = color || "#262b36";
    for (let i = 0; i < 7; i++) {
      x.save(); x.translate(128, 128); x.rotate((i * Math.PI * 2) / 7);
      x.beginPath(); x.moveTo(0, -18); x.quadraticCurveTo(70, -60, 112, -14); x.quadraticCurveTo(70, 8, 0, 18); x.fill(); x.restore();
    }
    x.fillStyle = "#11141b"; x.beginPath(); x.arc(128, 128, 30, 0, 7); x.fill();
    x.fillStyle = "#38bdf8"; x.font = "700 18px system-ui"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("TR", 128, 129);
  });
}
function fanDisc(r, color, parent, spin) {
  const m = new THREE.MeshStandardMaterial({ map: fanTex(color), transparent: true, roughness: 0.7, side: THREE.DoubleSide });
  const me = new THREE.Mesh(new THREE.CircleGeometry(r, 36), m);
  if (parent) parent.add(me);
  if (spin !== false) spinners.push(me);
  return me;
}

/* ── dimensiones y distribución de una placa (u: desde el borde trasero, v: desde arriba) ── */
function lay(b) {
  const ff = b.ff, itx = ff === "ITX";
  const W = ff === "E-ATX" ? 33 : itx ? 17 : 24.4;
  const H = itx ? 17 : ff === "mATX" ? 24.4 : 30.5;
  const sock = { u: itx ? 6.6 : 8.6, v: itx ? 6.4 : 8.4, s: b.socket.indexOf("AM") === 0 ? 4.0 : b.socket === "LGA775" ? 3.75 : b.socket === "LGA1700" || b.socket === "LGA1851" ? 3.75 : 3.75 };
  if (b.socket === "LGA1700" || b.socket === "LGA1851") sock.s = 4.5;
  const ru = itx ? 12.4 : 14.6;
  const ram = range(b.slots).map((i) => ({ u: ru + i * 0.95, v0: 1.6, v1: 14.9 }));
  const pv = itx ? 14.2 : 17.8;
  const pcie = range(b.pcie).map((i) => ({ u0: 2.6, v: pv + i * 6 })).filter((p) => p.v < H - 1);
  const mv = itx ? [10.8, 12.7] : [13.7, 22.3, 26.6, 29.0];
  const m2 = b.m2.map((s, i) => ({ u0: 3.6, v: mv[i] || 13.4, gen: s[1] }));
  return {
    W, H, itx, sock, ram, pcie, m2,
    c24: { u: W - 1.2, v: itx ? 9.6 : 10.5 }, eps: { u: 3.2, v: 1.1 }, fan: { u: sock.u + 5.4, v: 0.9 },
    sata: { u: W - 1.1, v: H - (itx ? 2.6 : 6.5) }, front: { u: W - 4.2, v: H - 0.9 }, chip: { u: W - (itx ? 4 : 6.2), v: H - (itx ? 3.2 : 7.4) },
  };
}

function boardTex(b, L) {
  return ctex("mb" + b.id, L.W * PX, L.H * PX, (x, w, h) => {
    x.fillStyle = b.pcb; x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(255,255,255,.05)"; x.lineWidth = 2;
    for (let i = 0; i < 40; i++) { const y0 = (i * 37) % h; x.beginPath(); x.moveTo(0, y0); x.lineTo(w * 0.3 + (i * 53) % (w * 0.6), y0); x.lineTo(w, y0 + 40); x.stroke(); }
    x.strokeStyle = "rgba(0,0,0,.35)"; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6);
    const s = L.sock;
    x.strokeStyle = "rgba(255,255,255,.25)"; x.lineWidth = 2; x.strokeRect((s.u - 3.9) * PX, (s.v - 3.9) * PX, 7.8 * PX, 7.8 * PX);
    label(x, b.socket, (s.u - 3.7) * PX, (s.v + 4.6) * PX, 18, "rgba(255,255,255,.8)", 700);
    if (L.ram.length) label(x, b.mem + " · máx " + b.maxRam + " GB", L.ram[0].u * PX - 6, (L.ram[0].v1 + 0.9) * PX, 15, "rgba(255,255,255,.75)", 700);
    L.ram.forEach((r, i) => label(x, (i % 2 ? "B" : "A") + (L.ram.length === 4 ? (i < 2 ? (i ? "1" : "1") : "2") : "1"), r.u * PX, 1.0 * PX, 12, "rgba(255,255,255,.7)", 700, "center"));
    L.m2.forEach((m, i) => { x.strokeStyle = "rgba(255,255,255,.28)"; x.setLineDash([6, 5]); x.strokeRect(m.u0 * PX, (m.v - 1.1) * PX, 8.2 * PX, 2.2 * PX); x.setLineDash([]); label(x, "M2_" + (i + 1) + " · PCIe " + m.gen + ".0", (m.u0 + 0.9) * PX, m.v * PX, 13, "rgba(255,255,255,.55)", 700); });
    L.pcie.forEach((p, i) => label(x, (i ? "PCIEX16_" + (i + 1) : "PCIEX16_1"), (p.u0 + 9.4) * PX, p.v * PX, 13, "rgba(255,255,255,.6)", 700));
    label(x, "CPU_FAN", (L.fan.u - 1) * PX, (L.fan.v + 0.9) * PX, 12, "rgba(255,255,255,.7)", 700);
    label(x, "ATX_PWR", (L.c24.u - 0.6) * PX, (L.c24.v + 3.3) * PX, 12, "rgba(255,255,255,.7)", 700, "right");
    label(x, "F_PANEL", L.front.u * PX, (L.front.v - 0.9) * PX, 12, "rgba(255,255,255,.7)", 700, "center");
    label(x, "SATA", (L.sata.u - 0.8) * PX, (L.sata.v - 1.6) * PX, 12, "rgba(255,255,255,.7)", 700, "right");
    label(x, "EPS 8 PIN", (L.eps.u + 1.2) * PX, (L.eps.v) * PX, 12, "rgba(255,255,255,.7)", 700);
    label(x, b.name.replace("Placa ", "").split(" (")[0], 1.2 * PX, h - 1.4 * PX, Math.min(34, w / 12), "rgba(255,255,255,.9)", 800);
    label(x, b.ff + " · " + b.year, 1.2 * PX, h - 2.8 * PX, 16, "rgba(56,189,248,.9)", 700);
  });
}

/* ── placa madre (grupo local: x = u, y = −v, z hacia afuera) ── */
function buildBoard(b, st, parent) {
  const L = lay(b), g = new THREE.Group();
  g.userData.lay = L;
  const base = mat(b.pcb, 0.8);
  const plate = boxT(L.W, L.H, 0.16, base, 4, tmat(boardTex(b, L), 0.75), L.W / 2, -L.H / 2, -0.08, g);
  plate.userData.slot = "board";
  const dark = mat("#1a1d24", 0.5, 0.3), metal = mat("#9aa3ad", 0.35, 0.8), black = mat("#0b0c0f", 0.7);
  // socket
  const s = L.sock, am = b.socket.indexOf("AM") === 0;
  box(s.s + 1.1, s.s + 1.1, 0.35, am ? mat("#eceae4", 0.6) : metal, s.u, -s.v, 0.17, g);
  if (!am) box(s.s + 0.2, s.s + 0.2, 0.1, mat("#c9a227", 0.4, 0.7), s.u, -s.v, 0.38, g);
  // rear I/O y VRM
  if (b.year >= 2015) {
    box(2.4, 13, 3.2, dark, 1.3, -8.4, 1.6, g);
    box(1.6, 7.5, 2.4, mat("#2c313b", 0.4, 0.6), s.u - 4.1, -s.v, 1.2, g);
    box(6.5, 1.5, 2.4, mat("#2c313b", 0.4, 0.6), s.u + 0.4, -(s.v - 4.2), 1.2, g);
  } else {
    box(1.8, 11, 2.6, mat("#b9bec6", 0.5, 0.5), 1.0, -7.5, 1.3, g);
    range(6).forEach((i) => cyl(0.35, 1, mat("#3b3f46", 0.4, 0.5), s.u - 4 + (i % 3) * 0.9, -(s.v - 3.5 - Math.floor(i / 3) * 1.1), 0.5, g).rotateX(Math.PI / 2));
  }
  // chipset
  box(L.itx ? 3 : 4.2, L.itx ? 3 : 4.2, 0.9, b.year >= 2015 ? mat("#2c313b", 0.35, 0.6) : mat("#3a6fb0", 0.4, 0.5), L.chip.u, -L.chip.v, 0.45, g);
  // ranuras de RAM
  L.ram.forEach((r, i) => box(0.6, r.v1 - r.v0, 0.8, i % 2 ? mat("#374151", 0.6) : black, r.u, -(r.v0 + r.v1) / 2, 0.4, g));
  // PCIe
  L.pcie.forEach((p, i) => box(8.9, 0.6, 0.9, i === 0 && b.year >= 2017 ? mat("#b8c0ca", 0.3, 0.8) : black, p.u0 + 4.45, -p.v, 0.45, g));
  // M.2 (conector + tornillo)
  L.m2.forEach((m) => { box(0.6, 2.2, 0.45, black, m.u0, -m.v, 0.22, g); cyl(0.25, 0.4, metal, m.u0 + 8.1, -m.v, 0.2, g).rotateX(Math.PI / 2); });
  // conectores
  box(1.0, 5.4, 1.1, black, L.c24.u, -(L.c24.v + 0.2), 0.55, g);
  box(1.7, 0.9, 1.0, black, L.eps.u + 0.2, -L.eps.v, 0.5, g);
  box(0.9, 0.4, 0.7, black, L.fan.u, -L.fan.v, 0.35, g);
  range(L.itx ? 2 : 4).forEach((i) => box(0.9, 0.7, 1.2, mat("#7f1d1d", 0.6), L.sata.u - 0.1, -(L.sata.v - 1 + i * 0.8), 0.6, g));
  box(2.3, 0.6, 0.7, black, L.front.u, -L.front.v, 0.35, g);
  // CMOS
  cyl(1.0, 0.3, metal, L.W - (L.itx ? 6.8 : 9), -(L.H - (L.itx ? 1.6 : 3)), 0.15, g).rotateX(Math.PI / 2);
  parent.add(g);
  return g;
}

function cpuTex(c) {
  return ctex("cpu" + c.id, 200, 200, (x, w) => {
    const grd = x.createLinearGradient(0, 0, w, w); grd.addColorStop(0, "#d7dbe0"); grd.addColorStop(1, "#9aa1aa");
    x.fillStyle = grd; x.fillRect(0, 0, w, w);
    const intel = c.name.indexOf("Intel") === 0;
    label(x, intel ? "intel" : "AMD", 18, 40, 30, intel ? "#0b5fb3" : "#111", 800);
    const nm = c.name.replace(/^(Intel|AMD)\s+/, "").replace("Core ", "");
    label(x, nm.length > 16 ? nm.slice(0, 16) : nm, 18, 100, 20, "#1f2937", 800);
    label(x, c.socket, 18, 140, 16, "#374151", 700);
    x.fillStyle = "#c9a227"; x.beginPath(); x.moveTo(6, w - 6); x.lineTo(26, w - 6); x.lineTo(6, w - 26); x.fill();
  });
}
function buildCPU(c, L, parent) {
  const g = new THREE.Group(), s = L.sock.s;
  box(s, s, 0.12, mat("#16653a", 0.6), 0, 0, 0.06, g);
  boxT(s - 0.6, s - 0.6, 0.3, mat("#b9bfc7", 0.35, 0.8), 4, tmat(cpuTex(c), 0.4, 0.5), 0, 0, 0.27, g);
  g.position.set(L.sock.u, -L.sock.v, 0.35);
  g.userData.slot = "cpu";
  parent.add(g);
  return g;
}

function aioTex() {
  return ctex("aio", 256, 256, (x, w) => {
    x.fillStyle = "#0b0f19"; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill();
    x.strokeStyle = "#38bdf8"; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 112, 0, 7); x.stroke();
    label(x, "TECH", 128, 112, 34, "#e2e8f0", 800, "center"); label(x, "REVIVE", 128, 148, 30, "#38bdf8", 800, "center");
  });
}
function buildCooler(cl, L, parent) {
  const g = new THREE.Group(), z0 = 0.66;
  g.position.set(L.sock.u, -L.sock.v, z0);
  const alu = mat("#b4bcc6", 0.35, 0.8), dark = mat("#1b1f27", 0.55, 0.3);
  const ct = cl.ct;
  if (ct === "stock" || ct === "lowprofile") {
    const sq = cl.id === "cl-am3" || ct === "lowprofile";
    const hh = cl.h - 0.8;
    if (sq) box(ct === "lowprofile" ? 9.4 : 8.2, ct === "lowprofile" ? 9.4 : 7.2, hh, alu, 0, 0, hh / 2, g);
    else cyl(cl.id === "cl-wraith" ? 4.9 : 4.4, hh, alu, 0, 0, hh / 2, g, 40).rotateX(Math.PI / 2);
    const ring = cl.id === "cl-wraith" || sq ? box(sq ? 9 : 9.4, sq ? 9 : 9.4, 0.8, dark, 0, 0, hh + 0.4, g) : cyl(4.3, 0.8, dark, 0, 0, hh + 0.4, g, 40).rotateX(Math.PI / 2);
    ring.userData.slot = "cooler";
    const f = fanDisc(sq ? 4.3 : 4.1, "#2f3542", g); f.position.set(0, 0, hh + 0.82);
  } else if (ct === "tower" || ct === "tower2") {
    box(4, 4, 1, mat("#b87333", 0.35, 0.8), 0, 0, 0.5, g);
    const hh = cl.h - 1.2, stacks = ct === "tower2" ? [-3.4, 3.4] : [0];
    const finTex = ctex("fins", 64, 256, (x, w, h) => { x.fillStyle = "#c7ced6"; x.fillRect(0, 0, w, h); x.fillStyle = "#8d96a1"; for (let i = 0; i < h; i += 6) x.fillRect(0, i, w, 2); });
    stacks.forEach((u) => {
      boxT(4.6, 12.5, hh, alu, [0, 1, 2, 3], tmat(finTex, 0.4, 0.7), u, 0, 1 + hh / 2, g);
      range(3).forEach((i) => cyl(0.3, hh - 1, mat("#b87333", 0.3, 0.9), u - 1.2 + i * 1.2, 0, 0.9 + (hh - 1) / 2, g).rotateX(Math.PI / 2));
    });
    const fx = ct === "tower2" ? 0 : 2.3 + 1.3;
    const fan = box(2.5, 12, 12, dark, fx, 0, 1 + hh / 2, g);
    fan.userData.slot = "cooler";
    const f = fanDisc(5.6, "#2c3340", g); f.rotation.y = Math.PI / 2; f.position.set(fx + 1.27, 0, 1 + hh / 2);
    if (ct === "tower") box(0.4, 12.5, 0.6, mat("#e2e8f0", 0.4, 0.5), 0, 0, 1 + hh + 0.3, g);
  } else if (ct === "aio") {
    const pump = cyl(3.6, 3.4, dark, 0, 0, 1.7, g, 40); pump.rotateX(Math.PI / 2); pump.userData.slot = "cooler";
    const cap = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40), new THREE.MeshStandardMaterial({ map: aioTex(), roughness: 0.4, emissive: new THREE.Color("#0ea5e9"), emissiveIntensity: 0, emissiveMap: aioTex() }));
    cap.position.z = 3.42; g.add(cap); glowers.push(cap);
  }
  g.traverse((o) => { if (o.isMesh && !o.userData.slot) o.userData.slot = "cooler"; });
  parent.add(g);
  return g;
}

function ramTex(r) {
  return ctex("ram" + r.id, 400, 80, (x, w, h) => {
    const old = r.type === "DDR2" || r.type === "DDR3" || r.type === "DDR3L";
    x.fillStyle = old ? r.color : r.color; x.fillRect(0, 0, w, h);
    if (old || r.form === "SODIMM") { x.fillStyle = "#111"; range(r.form === "SODIMM" ? 4 : 8).forEach((i) => x.fillRect(14 + i * (r.form === "SODIMM" ? 92 : 47), 14, r.form === "SODIMM" ? 70 : 36, 40)); x.fillStyle = "#d4af37"; x.fillRect(0, h - 10, w, 10); }
    else { x.fillStyle = "rgba(255,255,255,.08)"; x.fillRect(0, 0, w, h / 2); }
    label(x, r.type + " " + r.gb + "GB " + r.mhz, old ? 18 : 22, old ? 66 : h / 2, old ? 15 : 24, old ? "#e5e7eb" : r.color === "#e5e7eb" ? "#0f172a" : "#e5e7eb", 800);
  });
}
function buildDIMM(r, slot, parent, key) {
  const g = new THREE.Group();
  const hgt = r.type === "DDR4" || r.type === "DDR5" ? 3.4 : 3.0;
  const base = mat(r.color, 0.45, r.type === "DDR4" || r.type === "DDR5" ? 0.5 : 0.1);
  boxT(0.5, 13.3, hgt, base, [0, 1], tmat(ramTex(r), 0.5), 0, 0, hgt / 2, g);
  if (r.rgb) { const m = new THREE.MeshStandardMaterial({ color: "#1e293b", emissive: new THREE.Color("#8b5cf6"), emissiveIntensity: 0.25, roughness: 0.3 }); const strip = box(0.55, 13, 0.5, m, 0, 0, hgt + 0.25, g); glowers.push(strip); }
  g.position.set(slot.u, -(slot.v0 + slot.v1) / 2, 0.8);
  g.traverse((o) => { if (o.isMesh) o.userData.slot = key; });
  parent.add(g);
  return g;
}

function gpuTex(gp, gh) {
  return ctex("gpu" + gp.id, gp.L * PX * 0.7, gh * PX * 0.7, (x, w, h) => {
    x.fillStyle = gp.color; x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(255,255,255,.06)"; x.beginPath(); x.moveTo(0, 0); x.lineTo(w * 0.55, 0); x.lineTo(w * 0.35, h); x.lineTo(0, h); x.fill();
    const nv = gp.name.indexOf("NVIDIA") === 0;
    const short = gp.name.replace(/^(NVIDIA GeForce|AMD Radeon)\s+/, "");
    label(x, nv ? (gp.name.indexOf("RTX") > 0 ? "GEFORCE RTX" : "GEFORCE GTX") : "RADEON", 16, h * 0.32, Math.min(30, h * 0.2), nv ? "#76b900" : "#ef4444", 900);
    label(x, short.replace(/\s\d+\sGB$/, ""), 16, h * 0.62, Math.min(26, h * 0.17), "#e5e7eb", 800);
    label(x, (short.match(/\d+\sGB$/) || [""])[0], 16, h * 0.85, Math.min(18, h * 0.13), "#94a3b8", 700);
  });
}
function gpuFanTex(gp, n) {
  return ctex("gpuf" + gp.id, gp.L * 12, 120, (x, w, h) => {
    x.fillStyle = gp.color; x.fillRect(0, 0, w, h);
    if (!n) { x.fillStyle = "#9aa3ad"; for (let i = 6; i < w; i += 10) x.fillRect(i, 8, 5, h - 16); }
  });
}
function buildGPU(gp, L, parent) {
  const g = new THREE.Group();
  const p = L.pcie[0];
  const gh = gp.L >= 24 ? 12.2 : gp.L >= 19 ? 11 : 7.5;
  const th = gp.sl * 2 - 0.4;
  const len = gp.L;
  g.position.set(0, -p.v, 0);
  // soporte metálico trasero
  box(0.15, gp.sl * 2, gh + 0.8, mat("#c3c9d1", 0.3, 0.8), -2.3, -gp.sl + 0.4, (gh + 0.8) / 2, g);
  // PCB
  box(len - 0.6, 0.16, gh - 0.4, mat("#0f2a1c", 0.7), len / 2 - 2.0, 0, gh / 2 + 0.6, g);
  // cubierta con ventiladores
  const n = gp.w < 30 ? 0 : len >= 27 ? 3 : len >= 19 ? 2 : 1;
  const sh = boxT(len - 0.8, th, gh - 0.3, mat(gp.color, 0.45, 0.3), [4, 3], [tmat(gpuTex(gp, gh), 0.45, 0.2), tmat(gpuFanTex(gp, n), 0.6)], len / 2 - 2.0, -th / 2 - 0.1, gh / 2 + 0.55, g);
  sh.userData.slot = "gpu";
  range(n).forEach((i) => { const fr = Math.min(gh * 0.4, (len - 1.5) / n / 2 - 0.25); const f = fanDisc(fr, "#2a2f3a", g); f.rotation.x = Math.PI / 2; f.position.set(-1.6 + (len - 0.8) * ((i + 0.5) / n), -th - 0.13, gh / 2 + 0.55); });
  // placa trasera
  if (gp.g >= 45) box(len - 0.8, 0.12, gh - 0.3, mat("#1f2937", 0.4, 0.6), len / 2 - 2.0, 0.15, gh / 2 + 0.55, g);
  // conectores de energía
  if (gp.p16) box(1.8, 0.8, 0.8, mat("#0b0c0f"), len - 6.5, -0.6, gh + 0.7, g);
  range(gp.p8).forEach((i) => box(2.2, 0.8, 0.9, mat("#0b0c0f"), len - 6.5 - i * 2.6, -0.6, gh + 0.7, g));
  // luz
  if (gp.g >= 58) { const m = new THREE.MeshStandardMaterial({ color: "#111", emissive: new THREE.Color(gp.name.indexOf("AMD") >= 0 ? "#ef4444" : "#76b900"), emissiveIntensity: 0.2 }); const lb = box(len * 0.35, 0.3, 0.1, m, len * 0.55, -th * 0.5, gh + 0.72, g); glowers.push(lb); }
  g.userData.conn = new THREE.Vector3(len - 6.5, -0.6, gh + 1.1);
  g.traverse((o) => { if (o.isMesh) o.userData.slot = "gpu"; });
  parent.add(g);
  return g;
}

function driveTex(d) {
  return ctex("drv" + d.id, 300, 200, (x, w, h) => {
    if (d.size === "3.5" || (d.size === "2.5" && d.speed < 200)) {
      const grd = x.createLinearGradient(0, 0, w, h); grd.addColorStop(0, "#d9dde2"); grd.addColorStop(1, "#a4abb4"); x.fillStyle = grd; x.fillRect(0, 0, w, h);
      x.fillStyle = "#f8fafc"; x.fillRect(30, 30, w - 60, h - 60);
      label(x, "HDD " + (d.tb >= 1 ? d.tb + " TB" : d.tb * 1000 + " GB"), 46, 72, 26, "#111827", 800); label(x, d.size + "\" · SATA", 46, 110, 18, "#374151", 700); label(x, d.name.match(/\d+ rpm/) ? d.name.match(/\d+ rpm/)[0] : "", 46, 140, 16, "#6b7280", 700);
    } else if (d.size === "2.5") {
      x.fillStyle = "#111827"; x.fillRect(0, 0, w, h); x.fillStyle = "#2563eb"; x.fillRect(0, h - 40, w, 40);
      label(x, "SSD", 24, 60, 40, "#fff", 900); label(x, d.tb >= 1 ? d.tb + " TB" : Math.round(d.tb * 1000) + " GB", 24, 110, 26, "#cbd5e1", 800); label(x, "SATA · " + d.speed + " MB/s", 24, h - 20, 16, "#fff", 700);
    } else {
      x.fillStyle = "#0f1a14"; x.fillRect(0, 0, w, h); x.fillStyle = "#111"; x.fillRect(80, 40, 80, 120); x.fillRect(190, 40, 80, 120);
      x.fillStyle = "#d4af37"; x.fillRect(0, 0, 14, h);
      x.save(); x.translate(w / 2, h / 2); x.fillStyle = "#e5e7eb"; x.fillRect(-90, -30, 180, 60); x.restore();
      label(x, d.bus === "nvme" ? "NVMe Gen" + d.gen : "M.2 SATA", w / 2, h / 2 - 10, 22, "#111827", 900, "center");
      label(x, d.tb >= 1 ? d.tb + " TB" : Math.round(d.tb * 1000) + " GB", w / 2, h / 2 + 16, 18, "#374151", 800, "center");
    }
  });
}
function buildM2(d, m, parent, key, lapMode) {
  const g = new THREE.Group();
  const t = tmat(driveTex(d), 0.6);
  if (d.hs) { boxT(8.0, 2.4, 1.3, mat("#334155", 0.35, 0.7), 4, tmat(ctex("hs", 256, 80, (x, w, h) => { x.fillStyle = "#334155"; x.fillRect(0, 0, w, h); x.fillStyle = "#1e293b"; for (let i = 0; i < w; i += 14) x.fillRect(i, 0, 6, h); label(x, "GEN 5", 12, h / 2, 26, "#e2e8f0", 900); }), 0.4, 0.6), 0, 0, 0.7, g); }
  else boxT(8.0, 2.2, 0.25, mat("#0f1a14", 0.6), 4, t, 0, 0, 0.13, g);
  if (lapMode) { g.rotation.x = -Math.PI / 2; }
  g.position.set(lapMode ? m.x : m.u0 + 4.15, lapMode ? 0.95 : -m.v, lapMode ? m.z : 0.25);
  g.traverse((o) => { if (o.isMesh) o.userData.slot = key; });
  parent.add(g);
  return g;
}

/* ── gabinete (x: atrás→adelante, y: altura, z: hacia el alumno) ── */
function caseTex(c, kind, w, h) {
  return ctex("case" + kind + c.id, w * 10, h * 10, (x, W, H) => {
    x.fillStyle = c.beige ? "#d6d0bf" : c.color; x.fillRect(0, 0, W, H);
    if (kind === "tray") {
      x.fillStyle = "rgba(0,0,0,.35)";
      [[0.72, 0.18], [0.72, 0.45], [0.72, 0.72], [0.15, 0.06]].forEach(([u, v]) => { x.beginPath(); x.roundRect ? x.roundRect(u * W, v * H, W * 0.06, H * 0.12, 12) : x.rect(u * W, v * H, W * 0.06, H * 0.12); x.fill(); });
      x.fillStyle = "rgba(255,255,255,.05)"; x.fillRect(W * 0.05, H * 0.08, W * 0.62, H * 0.7);
    }
    if (kind === "rear") {
      x.fillStyle = "#0b0c0f"; x.fillRect(W * 0.1, H * 0.06, W * 0.6, H * 0.3);
      x.fillStyle = "rgba(0,0,0,.4)"; range(7).forEach((i) => x.fillRect(W * 0.08, H * (0.45 + i * 0.05), W * 0.75, H * 0.03));
    }
  });
}
function bayPos(c, i) {
  const bays = baysOf(c), sz = bays[i];
  const fx = c.D / 2 - 1.2, y0 = (c.psuTop || c.id === "case-old") ? 1.8 : 12.2;
  if (sz === "3.5") return { x: fx - 7.6, y: y0 + 1.5 + i * 3.4, z: c.id === "case-old" ? 0 : -c.W / 2 + 7, sz };
  const j = i - c.b35;
  return { x: fx - 5.4, y: y0 + 1.2 + c.b35 * 3.4 + j * 1.7, z: c.id === "case-old" ? 0 : -c.W / 2 + 7, sz };
}
function psuPos(c, ps) {
  const sfx = ps.ff === "SFX", w = sfx ? 10 : 15, h = sfx ? 6.4 : 8.6, d = sfx ? 12.5 : 15;
  if (c.id === "case-itx") return { x: c.D / 2 - 1.2 - w / 2, y: c.H - 1.0 - h / 2, z: -c.W / 2 + 1.6 + d / 2, w, h, d };
  if (c.psuTop) return { x: -c.D / 2 + 0.9 + w / 2, y: c.H - 0.9 - h / 2, z: 0, w, h, d };
  return { x: -c.D / 2 + 0.9 + w / 2, y: 0.9 + h / 2, z: 0, w, h, d };
}
function boardOrigin(c) {
  if (c.psuTop) return new THREE.Vector3(-c.D / 2 + 2.6, c.H - 11, -c.W / 2 + 1.6);
  const shroud = c.id === "case-old" ? 0 : 12.2;
  return new THREE.Vector3(-c.D / 2 + 2.6, shroud + 30.5 - 3, -c.W / 2 + 1.6);
}

function buildCase(c, parent) {
  const g = new THREE.Group(); g.userData.slot = "case";
  const col = c.beige ? "#d6d0bf" : c.color, m = mat(col, 0.55, 0.35), t = 0.8;
  box(c.D, t, c.W, m, 0, t / 2, 0, g);
  box(c.D, t, c.W, m, 0, c.H - t / 2, 0, g);
  box(t, c.H, c.W, m, c.D / 2 - t / 2, c.H / 2, 0, g);
  boxT(t, c.H, c.W, m, 0, tmat(caseTex(c, "rear", c.W, c.H), 0.6, 0.3), -c.D / 2 + t / 2, c.H / 2, 0, g);
  boxT(c.D, c.H, 0.5, m, 4, tmat(caseTex(c, "tray", c.D, c.H), 0.6, 0.3), 0, c.H / 2, -c.W / 2 + 0.25, g);
  // marco del lado abierto
  const fr = mat(c.beige ? "#c9c2ae" : "#0b0f19", 0.5, 0.4);
  box(c.D, 1.0, 0.6, fr, 0, c.H - 0.5, c.W / 2 - 0.3, g); box(c.D, 1.0, 0.6, fr, 0, 0.5, c.W / 2 - 0.3, g);
  box(1.0, c.H, 0.6, fr, c.D / 2 - 0.5, c.H / 2, c.W / 2 - 0.3, g); box(1.0, c.H, 0.6, fr, -c.D / 2 + 0.5, c.H / 2, c.W / 2 - 0.3, g);
  // patas
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b2]) => box(3, 0.8, 2, mat("#0b0c0f", 0.9), a * (c.D / 2 - 3), -0.4, b2 * (c.W / 2 - 2), g));
  // botón de encendido
  const btn = cyl(0.8, 0.4, new THREE.MeshStandardMaterial({ color: "#111", emissive: new THREE.Color("#38bdf8"), emissiveIntensity: 0 }), c.D / 2 - 3, c.H + 0.2, c.W / 4, g);
  glowers.push(btn);
  // ventiladores del gabinete
  const fanY = c.psuTop ? c.H - 13 : c.H - 10.5;
  const rf = fanDisc(c.id === "case-old" ? 3.8 : 5.4, "#1f2530", g); rf.rotation.y = Math.PI / 2; rf.position.set(-c.D / 2 + t + 0.05, fanY, 0);
  const nf = c.id === "case-full" ? 3 : c.id === "case-mid" ? 2 : c.id === "case-old" ? 0 : 1;
  range(nf).forEach((i) => { const f = fanDisc(c.id === "case-full" ? 6.5 : 5.6, "#1f2530", g); f.rotation.y = -Math.PI / 2; f.position.set(c.D / 2 - t - 0.05, c.H - 8 - i * 13, 0); });
  // jaula de discos
  const bays = baysOf(c);
  bays.forEach((sz, i) => { const p = bayPos(c, i); box(sz === "3.5" ? 15.4 : 10.6, 0.2, sz === "3.5" ? 10.8 : 7.6, mat("#4b5563", 0.5, 0.6), p.x, p.y - (sz === "3.5" ? 1.45 : 0.55), p.z, g);
    if (sz === "3.5" && c.id !== "case-old") box(0.4, 3.2, 0.6, mat("#4b5563", 0.5, 0.6), c.D / 2 - 0.4, p.y, p.z, g); });
  // tapa de la fuente («shroud») en gabinetes modernos
  if (c.id !== "case-old" && !c.psuTop) box(c.D - 2, 10.8, c.W - 3, mat(c.beige ? "#c9c2ae" : "#181c24", 0.6, 0.3), 0, 5.4, -0.6, g);
  g.traverse((o) => { if (o.isMesh && o.userData.slot === undefined) o.userData.slot = "case"; });
  parent.add(g);
  return g;
}

function psuTex(ps) {
  return ctex("psu" + ps.id, 300, 180, (x, w, h) => {
    x.fillStyle = ps.generic ? "#9ca3af" : "#111318"; x.fillRect(0, 0, w, h);
    x.fillStyle = ps.generic ? "#f1f5f9" : "#1f2937"; x.fillRect(16, 16, w - 32, h - 32);
    label(x, ps.generic ? "POWER SUPPLY" : ps.ff + " " + ps.w + "W", 34, 54, 30, ps.generic ? "#111" : "#fff", 900);
    label(x, ps.generic ? "500W MAX" : ps.name.indexOf("Platinum") > 0 ? "80 PLUS PLATINUM" : ps.name.indexOf("Gold") > 0 ? "80 PLUS GOLD" : "80 PLUS BRONZE", 34, 98, 20, ps.generic ? "#b91c1c" : ps.name.indexOf("Gold") > 0 ? "#eab308" : ps.name.indexOf("Platinum") > 0 ? "#cbd5e1" : "#c2410c", 800);
    if (ps.p16) label(x, "ATX 3.x · 12V-2x6", 34, 134, 16, "#38bdf8", 700);
  });
}
function buildPSU(ps, c, parent) {
  const p = psuPos(c, ps), g = new THREE.Group();
  const body = boxT(p.w, p.h, p.d, mat(ps.generic ? "#9ca3af" : "#16181d", 0.6, 0.4), [4], [tmat(psuTex(ps), 0.6, 0.2)], 0, 0, 0, g);
  const f = fanDisc(Math.min(p.w, p.d) * 0.4, "#2b2f37", g, true); f.rotation.x = c.psuTop ? Math.PI / 2 : -Math.PI / 2; f.position.y = c.psuTop ? -p.h / 2 - 0.05 : p.h / 2 + 0.05;
  if (c.psuTop) f.position.y = -p.h / 2 - 0.05;
  g.position.set(p.x, p.y, p.z);
  g.userData.out = new THREE.Vector3(p.x + p.w / 2, p.y + (c.psuTop ? -p.h / 4 : p.h / 4), p.z + p.d / 4);
  g.traverse((o) => { if (o.isMesh) o.userData.slot = "psu"; });
  body.userData.slot = "psu";
  parent.add(g);
  return g;
}
function buildBayDrive(d, c, i, parent) {
  const p = bayPos(c, i), g = new THREE.Group();
  const big = d.size === "3.5";
  const w = big ? 14.7 : 10, h = big ? 2.6 : 0.8, dd = big ? 10.2 : 7;
  boxT(w, h, dd, mat(big || d.speed < 200 ? "#aab1ba" : "#111827", 0.45, 0.6), [2], [tmat(driveTex(d), 0.5, 0.3)], 0, 0, 0, g);
  g.position.set(p.x, p.y, p.z);
  g.userData.port = new THREE.Vector3(p.x - w / 2, p.y, p.z + dd / 2 - 1);
  g.traverse((o) => { if (o.isMesh) o.userData.slot = "bay:" + i; });
  parent.add(g);
  return g;
}

/* radiador de líquida (en el techo del gabinete) */
function buildRadiator(cl, c, parent) {
  const g = new THREE.Group(), len = cl.rad / 10 + 3;
  box(len, 2.7, 12.4, mat("#1b1f27", 0.5, 0.4), 0, 0, 0, g);
  range(cl.rad / 120).forEach((i) => { const f = fanDisc(5.6, "#2c3340", g); f.rotation.x = Math.PI / 2; f.position.set(-len / 2 + 1.5 + 6 + i * 12, -1.45, 0); });
  g.position.set(c.D / 2 - 2.4 - len / 2, c.H - 3.0, 3.2);
  g.userData.slot = "cooler";
  g.traverse((o) => { if (o.isMesh) o.userData.slot = "cooler"; });
  parent.add(g);
  return g;
}

/* cables */
function cable(points, r, color, parent) {
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.3);
  const me = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r, 8, false), mat(color, 0.7));
  parent.add(me);
  return me;
}

/* ── laptop (se muestra boca abajo, con la tapa inferior) ── */
function lapLayout(L) {
  const w = L.w, d = L.d;
  return {
    fans: (L.fans === 2 ? [w / 2 - 5.5, -w / 2 + 5.5] : [w / 2 - 5.5]).map((x) => ({ x, z: -d / 2 + 5 })),
    cpu: { x: L.fans === 2 ? 3.5 : w * 0.08, z: -d / 2 + 6.5 },
    gpu: L.gpu ? { x: -4, z: -d / 2 + 6.5 } : null,
    ram: range(L.ram).map((i) => ({ x: -1.5, z: -d / 2 + 10.5 + i * 3.6 })),
    m2: L.m2.map((s, i) => ({ x: w / 2 - 6.5, z: -d / 2 + 11.5 + i * 3.2 })),
    b25: range(L.b25).map(() => ({ x: -w / 2 + 7, z: -d / 2 + 12.5 })),
    batt: { x: 0, z: d / 2 - 4, w: w - 10, d: 6 },
  };
}
function lapBoardTex(L) {
  return ctex("lapmb" + L.id, (L.w - 3) * 14, L.d * 0.62 * 14, (x, w, h) => {
    x.fillStyle = "#123326"; x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(255,255,255,.06)"; x.lineWidth = 2;
    for (let i = 0; i < 30; i++) { x.beginPath(); x.moveTo((i * 41) % w, 0); x.lineTo((i * 67) % w, h); x.stroke(); }
    label(x, L.name.split(" (")[0], 14, h - 18, 18, "rgba(255,255,255,.65)", 800);
    if (L.solder) label(x, "RAM soldada " + L.solder + " GB " + L.mem, w * 0.5, h - 18, 16, "#fbbf24", 800, "center");
  });
}
function battTex(L) {
  return ctex("batt" + L.id, 400, 80, (x, w, h) => {
    x.fillStyle = "#1f2937"; x.fillRect(0, 0, w, h);
    label(x, "Li-ion 11.4 V · 48 Wh", 20, 28, 22, "#e5e7eb", 800);
    label(x, "⚠ No perforar · desconectar antes de reparar", 20, 58, 15, "#fbbf24", 700);
  });
}
function buildSODIMM(r, s, parent, key) {
  const g = new THREE.Group();
  boxT(6.8, 0.25, 3, mat(r.color, 0.6), [2], [tmat(ramTex(r), 0.6)], 0, 0, 0, g);
  g.position.set(s.x, 1.0, s.z);
  g.traverse((o) => { if (o.isMesh) o.userData.slot = key; });
  parent.add(g);
  return g;
}
function buildLaptop(L, parent) {
  const g = new THREE.Group(), lay2 = lapLayout(L), w = L.w, d = L.d;
  g.userData.lay = lay2;
  const shell = mat(L.color, 0.5, 0.45), inner = mat("#1a1e26", 0.8);
  box(w, 0.3, d, inner, 0, 0.15, 0, g).userData.slot = "laptop";
  [[w, 2, 0.4, 0, 1, d / 2 - 0.2], [w, 2, 0.4, 0, 1, -d / 2 + 0.2], [0.4, 2, d, w / 2 - 0.2, 1, 0], [0.4, 2, d, -w / 2 + 0.2, 1, 0]].forEach((a) => (box(a[0], a[1], a[2], shell, a[3], a[4], a[5], g).userData.slot = "laptop"));
  // placa
  const bd = d * 0.62;
  boxT(w - 3, 0.12, bd, mat("#123326", 0.8), [2], [tmat(lapBoardTex(L), 0.8)], 0, 0.36, -d / 2 + bd / 2 + 0.8, g).userData.slot = "laptop";
  // batería
  const b = lay2.batt;
  boxT(b.w, 0.9, b.d, mat("#1f2937", 0.6), [2], [tmat(battTex(L), 0.6)], b.x, 0.75, b.z, g).userData.slot = "laptop";
  const plugZ = b.z - b.d / 2 - (S.lap.batt ? 0.7 : -0.1);
  const plug = box(1.6, 0.5, 0.9, mat(S.lap.batt ? "#f8fafc" : "#ef4444", 0.5), b.x + 3, 0.7, plugZ, g); plug.userData.pick = "batt";
  box(1.8, 0.4, 0.5, mat("#0b0c0f"), b.x + 3, 0.6, b.z - b.d / 2 - 1.6, g);
  box(0.5, 0.45, 1.2, mat("#111318", 0.6), b.x + 2.1, 0.75, plugZ, g);
  if (!S.lap.batt) cable([new THREE.Vector3(b.x + 3, 0.9, b.z - b.d / 2 + 0.2), new THREE.Vector3(b.x + 3.3, 1.3, plugZ + 0.2), new THREE.Vector3(b.x + 3, 0.9, plugZ)], 0.18, "#ef4444", g);
  // procesador, video y disipación
  const copper = mat("#b87333", 0.3, 0.9);
  box(2.4, 0.3, 1.8, mat("#0b0c0f", 0.4), lay2.cpu.x, 0.55, lay2.cpu.z, g);
  box(3.2, 0.2, 3, copper, lay2.cpu.x, 0.8, lay2.cpu.z, g);
  if (lay2.gpu) { box(2.6, 0.3, 2.2, mat("#0b0c0f", 0.4), lay2.gpu.x, 0.55, lay2.gpu.z, g); box(3.4, 0.2, 3.2, copper, lay2.gpu.x, 0.8, lay2.gpu.z, g); }
  lay2.fans.forEach((f) => {
    cyl(3.6, 1.2, mat("#111318", 0.6), f.x, 0.9, f.z, g, 36);
    const fd = fanDisc(3.2, "#2c3340", g); fd.rotation.x = -Math.PI / 2; fd.position.set(f.x, 1.52, f.z);
    const from = lay2.gpu && f.x < 0 ? lay2.gpu : lay2.cpu, len = Math.hypot(f.x - from.x, f.z - from.z);
    const hp = box(len, 0.25, 0.8, copper, (f.x + from.x) / 2, 1.0, (f.z + from.z) / 2, g);
    hp.rotation.y = -Math.atan2(f.z - from.z, f.x - from.x);
  });
  if (L.solder) range(4).forEach((i) => box(1.3, 0.2, 1.5, mat("#0b0c0f", 0.4), lay2.cpu.x - 4.2 + (i % 2) * 8.4, 0.5, lay2.cpu.z - 0.9 + Math.floor(i / 2) * 2.4, g));
  // ranuras
  lay2.ram.forEach((r) => box(7, 0.6, 0.7, mat("#0b0c0f", 0.6), r.x, 0.7, r.z - 1.6, g));
  lay2.m2.forEach((m) => { box(0.6, 0.45, 2.2, mat("#0b0c0f", 0.6), m.x - 4.3, 0.6, m.z, g); cyl(0.25, 0.4, mat("#9aa3ad", 0.3, 0.8), m.x + 4.0, 0.6, m.z, g); });
  lay2.b25.forEach((p) => { const fm = mat("#4b5563", 0.5, 0.6); box(10.6, 1.2, 0.2, fm, p.x, 0.9, p.z - 3.7, g); box(10.6, 1.2, 0.2, fm, p.x, 0.9, p.z + 3.7, g); box(0.2, 1.2, 7.6, fm, p.x + 5.3, 0.9, p.z, g); });
  // tapa inferior
  const coverTex = ctex("cover" + L.id, w * 10, d * 10, (x, W, H) => {
    x.fillStyle = L.color; x.fillRect(0, 0, W, H);
    x.fillStyle = "rgba(0,0,0,.35)"; for (let i = 0; i < 14; i++) x.fillRect(W * 0.55 + i * 9, H * 0.12, 4, H * 0.22);
    x.fillStyle = "#0b0c0f"; [[0.06, 0.08], [0.94, 0.08], [0.06, 0.92], [0.94, 0.92]].forEach(([u, v]) => { x.beginPath(); x.ellipse(u * W, v * H, 22, 10, 0, 0, 7); x.fill(); });
    x.fillStyle = "#cbd5e1"; [[0.03, 0.04], [0.5, 0.03], [0.97, 0.04], [0.03, 0.96], [0.35, 0.97], [0.65, 0.97], [0.97, 0.96], [0.5, 0.5]].forEach(([u, v]) => { x.beginPath(); x.arc(u * W, v * H, 6, 0, 7); x.fill(); });
    label(x, "TechRevive · " + L.name.split(" (")[0], W / 2, H * 0.72, 22, "rgba(255,255,255,.35)", 700, "center");
  });
  const cover = boxT(w - 0.2, 0.25, d - 0.2, shell, [2], [tmat(coverTex, 0.5, 0.4)], S.lap.cover ? 0 : w + 6, S.lap.cover ? 2.12 : 0.13, 0, g);
  cover.userData.pick = "cover";
  parent.add(g);
  return g;
}

/* ───────────── construcción de la escena ───────────── */
let R = {};
function disposeWorld() {
  const keep = new Set(matCache.values());
  world.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    ms.forEach((m) => { if (!keep.has(m)) m.dispose(); });
  });
  world.clear();
  spinners.length = 0; glowers.length = 0; markers = [];
}

function buildPCWorld() {
  const st = S.pc, s = st.steps, c = P(st.case), b = P(st.board), ps = P(st.psu), cl = P(st.cooler), gp = P(st.gpu);
  if (c) R.case = buildCase(c, world);
  if (b) {
    const bg = new THREE.Group(); world.add(bg); R.bg = bg;
    if (c) bg.position.copy(boardOrigin(c));
    else {
      const L0 = lay(b);
      box(L0.W + 3, 4, L0.H + 3, mat("#8b6b4a", 0.9), 0, 1.2, 0, world).userData.slot = "board";
      bg.rotation.x = -Math.PI / 2; bg.position.set(-L0.W / 2, 3.4, -L0.H / 2);
    }
    const g = buildBoard(b, st, bg), L = g.userData.lay; R.L = L;
    if (st.cpu) buildCPU(P(st.cpu), L, bg);
    if (cl) R.cooler = buildCooler(cl, L, bg);
    st.ram.forEach((id, i) => { if (id && L.ram[i]) buildDIMM(P(id), L.ram[i], bg, "ram:" + i); });
    st.m2.forEach((id, i) => { if (id && L.m2[i]) buildM2(P(id), L.m2[i], bg, "m2:" + i); });
    if (gp && c && L.pcie[0]) R.gpu = buildGPU(gp, L, bg);
  }
  if (c && ps) R.psu = buildPSU(ps, c, world);
  if (c) st.bay.forEach((id, i) => { if (id) (R.bays = R.bays || [])[i] = buildBayDrive(P(id), c, i, world); });
  if (c && b && cl && cl.ct === "aio") {
    const rad = buildRadiator(cl, c, world);
    R.bg.updateMatrixWorld(true);
    const pump = R.bg.localToWorld(new THREE.Vector3(R.L.sock.u, -R.L.sock.v, 3.2));
    const len = cl.rad / 10 + 3, end = new THREE.Vector3(rad.position.x - len / 2 + 1.2, rad.position.y - 1.4, 0);
    [-1, 1].forEach((k) => cable([pump.clone().add(new THREE.Vector3(1.5, 0, k * 1)), pump.clone().add(new THREE.Vector3(6, 4, 3 + k)), end.clone().add(new THREE.Vector3(0, -3, 3 + k)), end.clone().add(new THREE.Vector3(0, 0, k * 2.5))], 0.55, "#111318", world));
  }
  /* cables */
  if (c && b && R.bg) {
    R.bg.updateMatrixWorld(true);
    const L = R.L, V = (x, y, z) => new THREE.Vector3(x, y, z), toW = (u, v, z) => R.bg.localToWorld(V(u, -v, z));
    const zt = -c.W / 2 + 3.5;
    if (ps && R.psu) {
      const out = R.psu.userData.out;
      if (s.c24) { const e = toW(L.c24.u + 0.5, L.c24.v + 0.2, 0.9); cable([out, V(c.D / 2 - 3, out.y + (c.psuTop ? -3 : 3), out.z), V(c.D / 2 - 3, e.y - 4, zt), V(e.x + 1.8, e.y, e.z + 0.3), e], 0.75, "#15171c", world); }
      if (s.eps) { const e = toW(L.eps.u + 0.2, L.eps.v - 0.5, 0.9); cable([out, V(-c.D / 2 + 3, out.y + (c.psuTop ? -2 : 6), zt - 1), V(-c.D / 2 + 3, c.H - 2.2, zt - 1), V(e.x, c.H - 2, e.z), e], 0.45, "#15171c", world); }
      if (s.pcie && R.gpu) { R.gpu.updateMatrixWorld(true); const e = R.gpu.localToWorld(R.gpu.userData.conn.clone()); cable([out, V(out.x + 4, out.y + (c.psuTop ? -4 : 4), out.z + 4), V(e.x + 2, e.y - 2, e.z + 2), e], 0.5, "#15171c", world); }
      if (s.sata && R.bays) {
        const sp = toW(L.sata.u + 0.5, L.sata.v, 0.6);
        R.bays.forEach((dg) => { if (!dg) return; const pt = dg.userData.port; cable([out, V(out.x + 6, out.y, out.z + 3), V(pt.x - 2, pt.y + 1, pt.z + 1), pt], 0.32, "#15171c", world); cable([sp, V(sp.x + 2, sp.y - 2, sp.z + 2), V(pt.x - 1, pt.y - 0.6, pt.z), pt.clone().add(V(0, -0.5, -1))], 0.22, "#b91c1c", world); });
      }
    }
    if (s.front) { const e = toW(L.front.u, L.front.v - 0.2, 0.6); cable([V(c.D / 2 - 2, c.H - 1.5, c.W / 4 - 2), V(c.D / 2 - 2.5, c.H * 0.5, zt + 1), V(e.x + 2, e.y - 1.5, e.z + 1), e], 0.22, "#64748b", world); }
    if (s.fan && R.cooler) { const st2 = toW(L.sock.u + 3.2, L.sock.v - 3.2, 2.5), e = toW(L.fan.u, L.fan.v, 0.7); cable([st2, toW((L.sock.u + L.fan.u) / 2 + 1, L.fan.v + 1.2, 2), e], 0.13, "#0b0c0f", world); }
  }
}

function buildLapWorld() {
  const L = P(S.lap.laptop);
  if (!L) return;
  const g = buildLaptop(L, world); R.lg = g;
  g.position.y = -0.8;
  const lay2 = g.userData.lay;
  S.lap.ram.forEach((id, i) => { if (id && lay2.ram[i]) buildSODIMM(P(id), lay2.ram[i], g, "ram:" + i); });
  S.lap.m2.forEach((id, i) => { if (id && lay2.m2[i]) buildM2(P(id), lay2.m2[i], g, "m2:" + i, true); });
  S.lap.b25.forEach((id, i) => {
    if (!id || !lay2.b25[i]) return;
    const d = P(id), p = lay2.b25[i], dg = new THREE.Group();
    boxT(10, 0.8, 7, mat(d.speed < 200 ? "#aab1ba" : "#111827", 0.45, 0.6), [2], [tmat(driveTex(d), 0.5, 0.3)], 0, 0, 0, dg);
    dg.position.set(p.x, 0.75, p.z); dg.traverse((o) => { if (o.isMesh) o.userData.slot = "b25:" + i; }); g.add(dg);
  });
}

function markerSpec(k, p) {
  const [kk, ii] = k.split(":"), i = +ii;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  if (S.mode === "lap") {
    if (kk === "laptop") return { parent: world, pos: V(0, 0.2, 0), size: V(p.w, 2, p.d) };
    if (!R.lg) return null;
    const l2 = R.lg.userData.lay;
    if (kk === "ram" && l2.ram[i]) return { parent: R.lg, pos: V(l2.ram[i].x, 1.1, l2.ram[i].z), size: V(7.2, 0.8, 3.4) };
    if (kk === "m2" && l2.m2[i]) return { parent: R.lg, pos: V(l2.m2[i].x, 1.0, l2.m2[i].z), size: V(8.6, 0.7, 2.6) };
    if (kk === "b25" && l2.b25[i]) return { parent: R.lg, pos: V(l2.b25[i].x, 1.0, l2.b25[i].z), size: V(10.4, 1.1, 7.4) };
    return null;
  }
  const c = P(S.pc.case);
  if (kk === "case") return { parent: world, pos: V(0, p.H / 2 - 0.8, 0), size: V(p.D, p.H, p.W) };
  if (kk === "board") {
    const Lp = lay(p);
    if (c) { const o = boardOrigin(c); return { parent: world, pos: V(o.x + Lp.W / 2, o.y - Lp.H / 2, o.z + 0.4), size: V(Lp.W, Lp.H, 0.8) }; }
    return { parent: world, pos: V(0, 3.8, 0), size: V(Lp.W, 0.8, Lp.H) };
  }
  if (kk === "psu" && c) { const pp = psuPos(c, p); return { parent: world, pos: V(pp.x, pp.y, pp.z), size: V(pp.w, pp.h, pp.d) }; }
  if (kk === "bay" && c) { const bp = bayPos(c, i), big = bp.sz === "3.5"; return { parent: world, pos: V(bp.x, bp.y, bp.z), size: V(big ? 14.9 : 10.2, big ? 2.8 : 1.0, big ? 10.4 : 7.2) }; }
  if (!R.bg || !R.L) return null;
  const L = R.L, s = L.sock;
  if (kk === "cpu") return { parent: R.bg, pos: V(s.u, -s.v, 0.7), size: V(s.s + 1, s.s + 1, 1.2) };
  if (kk === "cooler") { const h = p.ct === "aio" ? 3.6 : p.h; return { parent: R.bg, pos: V(s.u, -s.v, 0.7 + h / 2), size: V(p.ct === "tower2" ? 13 : 9.6, p.ct.indexOf("tower") === 0 ? 12.6 : 9.6, h) }; }
  if (kk === "ram" && L.ram[i]) { const r = L.ram[i]; return { parent: R.bg, pos: V(r.u, -(r.v0 + r.v1) / 2, 2.4), size: V(0.85, 13.6, 3.8) }; }
  if (kk === "m2" && L.m2[i]) { const m = L.m2[i]; return { parent: R.bg, pos: V(m.u0 + 4.15, -m.v, 0.5), size: V(8.6, 2.6, 1) }; }
  if (kk === "gpu" && L.pcie[0]) { const gh = p.L >= 24 ? 12.2 : p.L >= 19 ? 11 : 7.5; return { parent: R.bg, pos: V(p.L / 2 - 2, -(L.pcie[0].v + p.sl), gh / 2 + 0.6), size: V(p.L, p.sl * 2, gh) }; }
  return null;
}

const LVL_COLOR = { 0: "#22c55e", 1: "#f59e0b", 2: "#ef4444" };
function addMarkers() {
  if (!UI.armed) return;
  const p = P(UI.armed);
  if (S.mode === "lap" && p.kind !== "laptop" && (S.lap.cover || S.lap.batt)) return;
  slotsFor(p).filter((k) => !getAt(k)).forEach((k) => {
    const r = check(p, k);
    if (r.lvl < 0) return;
    const sp = markerSpec(k, p);
    if (!sp) return;
    const col = S.compat ? LVL_COLOR[r.lvl] : "#38bdf8";
    const m = new THREE.Mesh(new THREE.BoxGeometry(sp.size.x, sp.size.y, sp.size.z), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, depthTest: false, depthWrite: false }));
    m.position.copy(sp.pos); m.renderOrder = 998; m.userData.marker = k; m.userData.lvl = r.lvl;
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.95, depthTest: false }));
    e.renderOrder = 999; m.add(e);
    sp.parent.add(m); markers.push(m);
  });
}

function addSelection() {
  if (!UI.sel || !getAt(UI.sel)) return;
  const bx = new THREE.Box3(); let any = false;
  world.updateMatrixWorld(true);
  world.traverse((o) => { if (o.isMesh && o.userData.slot === UI.sel && !o.userData.marker) { bx.expandByObject(o); any = true; } });
  if (!any) return;
  const h = new THREE.Box3Helper(bx.expandByScalar(0.3), 0xfacc15);
  h.material.depthTest = false; h.renderOrder = 997;
  world.add(h);
}

function applyPower() {
  const on = UI.powered;
  glowers.forEach((m) => { if (m.material && m.material.emissive) m.material.emissiveIntensity = on >= 1 ? (on === 2 ? 1.4 : 0.8) : 0.15; });
}

function rebuild3D() {
  if (!renderer) return;
  disposeWorld(); R = {};
  if (S.mode === "pc") buildPCWorld(); else buildLapWorld();
  addMarkers(); addSelection(); applyPower();
  dirty = true;
}

function frame() {
  if (!renderer) return;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let t, d, dir;
  if (S.mode === "pc") {
    const c = P(S.pc.case);
    if (c) { t = V(0, c.H * 0.47, 0); d = Math.max(c.H, c.D) * 1.85; dir = V(0.38, 0.3, 1); }
    else if (S.pc.board) { t = V(0, 3, 2); d = 52; dir = V(0.1, 1, 0.75); }
    else { t = V(0, 18, 0); d = 105; dir = V(0.35, 0.35, 1); }
  } else {
    const L = P(S.lap.laptop);
    t = V(L && !S.lap.cover ? 4 : 0, 0, 0); d = L ? 46 + (S.lap.cover ? 0 : 6) : 60; dir = V(0, 1.15, 0.75);
  }
  const aspect = camera.aspect || 1.5;
  if (aspect < 1) d *= 1.15 / aspect;
  dir.normalize();
  camera.position.copy(t).addScaledVector(dir, d);
  controls.target.copy(t);
  controls.update();
  dirty = true;
}

function initScene(canvas, stage) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  if (!renderer.getContext()) throw new Error("sin WebGL");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#0b1220");
  camera = new THREE.PerspectiveCamera(38, 1.5, 1, 3000);
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.12;
  controls.minDistance = 12; controls.maxDistance = 260; controls.maxPolarAngle = Math.PI * 0.49;
  controls.screenSpacePanning = true;
  controls.addEventListener("change", () => (dirty = true));
  scene.add(new THREE.HemisphereLight(0xe0ecff, 0x1e293b, 1.6));
  const d1 = new THREE.DirectionalLight(0xffffff, 2.2); d1.position.set(60, 130, 110); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0x93c5fd, 0.8); d2.position.set(-90, 50, -60); scene.add(d2);
  const d3 = new THREE.DirectionalLight(0xffffff, 0.6); d3.position.set(10, 20, 140); scene.add(d3);
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat("#141b2b", 0.95));
  desk.rotation.x = -Math.PI / 2; desk.position.y = -0.82; scene.add(desk);
  const matTex = ctex("esd", 1024, 640, (x, w, h) => {
    x.fillStyle = "#1e3a5f"; x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(255,255,255,.08)"; x.lineWidth = 2;
    for (let i = 0; i < w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
    for (let j = 0; j < h; j += 32) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); }
    label(x, "TECHREVIVE · ALFOMBRA ANTIESTÁTICA (ESD)", 24, h - 24, 22, "rgba(255,255,255,.35)", 800);
  });
  const esd = new THREE.Mesh(new THREE.PlaneGeometry(130, 82), tmat(matTex, 0.9));
  esd.rotation.x = -Math.PI / 2; esd.position.set(4, -0.81, 4); scene.add(esd);
  world = new THREE.Group(); scene.add(world);
  const fit = () => {
    const w = Math.max(10, stage.clientWidth), h = Math.max(10, stage.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true;
  };
  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage); else window.addEventListener("resize", fit);
  fit();
  if (window.IntersectionObserver) new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) dirty = true; }).observe(stage);
  // clic (sin arrastre) para elegir
  let down = null;
  canvas.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
  canvas.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const r = canvas.getBoundingClientRect();
    pick(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  });
  let last = performance.now();
  const loop = (t) => {
    requestAnimationFrame(loop);
    if (!visible) return;
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    let anim = false;
    if (UI.powered) { spinners.forEach((s) => (s.rotation.z += dt * 16)); anim = true; }
    if (markers.length) { const o = 0.22 + 0.13 * Math.sin(t / 240); markers.forEach((m) => (m.material.opacity = o)); anim = true; }
    if (controls.update()) dirty = true;
    if (anim || dirty) { renderer.render(scene, camera); dirty = false; }
  };
  requestAnimationFrame(loop);
}

const ray = new THREE.Raycaster();
function pick(x, y) {
  ray.setFromCamera(new THREE.Vector2(x, y), camera);
  if (markers.length) {
    const h = ray.intersectObjects(markers, false)[0];
    if (h) { const k = h.object.userData.marker; if (h.object.userData.lvl === 2) { const r = check(P(UI.armed), k); say("No se puede: " + r.msgs.filter((m) => m[0] === 2).map((m) => m[1]).join(" "), "bad"); return; } install(UI.armed, k); return; }
  }
  const hits = ray.intersectObjects(world.children, true);
  for (const hh of hits) {
    let o = hh.object;
    if (o.type === "Box3Helper" || o.userData.marker) continue;
    while (o && !o.userData.slot && !o.userData.pick && o !== world) o = o.parent;
    if (!o || o === world) continue;
    if (o.userData.pick === "cover") { toggleLap("cover"); return; }
    if (o.userData.pick === "batt") { toggleLap("batt"); return; }
    if (UI.armed) { say("Haz clic en una zona verde (o usa el botón «Instalar»).", "info"); return; }
    UI.sel = o.userData.slot; UI.armed = null;
    rebuild3D(); renderUI();
    return;
  }
  if (UI.sel) { UI.sel = null; rebuild3D(); renderUI(); }
}

/* ───────────── interfaz ───────────── */
function say(t, type) {
  const m = $(".t3d__msg");
  if (!m) return;
  m.className = "t3d__msg t3d__msg--" + (type || "info");
  m.textContent = t;
}

function short(p) {
  switch (p.kind) {
    case "case": return "Placas " + p.boards.join("/") + " · GPU ≤ " + p.gpu + " cm · disipador ≤ " + p.cooler + " cm";
    case "board": return p.socket + " · " + p.mem + " · " + p.ff + " · " + p.year;
    case "cpu": return p.socket + " · " + genName(p.gen) + (p.ig ? "" : " · sin video");
    case "cooler": return ({ stock: "Original", lowprofile: "Perfil bajo", tower: "Torre", tower2: "Torre doble", aio: "Líquida" })[p.ct] + " · " + p.tdp + " W · " + (p.ct === "aio" ? "radiador " + p.rad + " mm" : p.h + " cm alto");
    case "ram": return (p.form === "SODIMM" ? "Laptop (SODIMM)" : "Escritorio (DIMM)") + " · " + p.type;
    case "gpu": return p.L + " cm · " + p.sl + " ranuras · " + p.w + " W";
    case "drive": return (p.bus === "nvme" ? "NVMe PCIe " + p.gen + ".0" : p.bus === "m2sata" ? "M.2 SATA" : "SATA " + p.size + "\"") + " · " + p.speed + " MB/s";
    case "psu": return p.w + " W reales · " + p.ff + (p.p16 ? " · 16 pines" : "");
    case "laptop": return p.sub;
  }
  return "";
}
function specs(p) {
  const yes = (v) => (v ? "Sí" : "No");
  switch (p.kind) {
    case "case": return [["Placas que acepta", p.boards.join(", ")], ["Tarjeta de video", "hasta " + p.gpu + " cm de largo"], ["Disipador", "hasta " + p.cooler + " cm de alto"], ["Radiadores", p.rads.length ? p.rads.join(" / ") + " mm" : "No admite"], ["Fuente", p.psu.join(" o ")], ["Bahías", p.b35 + "× 3.5\" · " + p.b25 + "× 2.5\""], ["Medidas", p.H + " × " + p.D + " × " + p.W + " cm"]];
    case "board": return [["Socket", p.socket], ["Formato", p.ff + " (" + p.year + ")"], ["Memoria", p.slots + "× " + p.mem + " · máx " + p.maxRam + " GB"], ["Procesadores", p.gens.map(genName).join(" · ")], ["Necesitan BIOS nuevo", p.bios.length ? p.bios.map(genName).join(" · ") : "—"], ["Ranuras M.2", p.m2.length ? p.m2.map((s) => "PCIe " + s[1] + ".0").join(", ") : "Ninguna"], ["Puertos SATA", p.sata], ["Video en la placa", p.igpu ? "Sí (chipset)" : "Usa el del procesador"]];
    case "cpu": return [["Socket", p.socket], ["Generación", genName(p.gen)], ["Núcleos", p.c], ["Consumo", "TDP " + p.tdp + " W · máximo " + p.w + " W"], ["Video integrado", yes(p.ig)], ["Windows 11", GEN[p.gen] && GEN[p.gen][1] ? "Compatible" : "No compatible"]];
    case "cooler": return [["Tipo", short(p).split(" · ")[0]], ["Sockets", p.s.join(", ")], ["Capacidad", "~" + p.tdp + " W de calor"], [p.ct === "aio" ? "Radiador" : "Altura", p.ct === "aio" ? p.rad + " mm (va en el gabinete)" : p.h + " cm"], ["Pasta térmica", p.ct === "stock" ? "Preaplicada" : "Se aplica al instalar"]];
    case "ram": return [["Tipo", p.type + " " + p.form], ["Capacidad", p.gb + " GB"], ["Velocidad", p.mhz + " MHz"], ["Para", p.form === "SODIMM" ? "Laptops y mini PC" : "PC de escritorio"]];
    case "gpu": return [["Largo", p.L + " cm"], ["Grosor", p.sl + " ranuras"], ["Consumo", p.w + " W"], ["Energía", p.p16 ? "1× 16 pines (12V-2x6)" : p.p8 ? p.p8 + "× 8 pines PCIe" : "Solo de la ranura"], ["Año", p.year]];
    case "drive": return [["Tipo", p.speed < 200 ? "Disco duro mecánico (HDD)" : "Unidad de estado sólido (SSD)"], ["Formato", p.size === "m2" ? "M.2 2280" : p.size + "\""], ["Interfaz", p.bus === "nvme" ? "NVMe PCIe " + p.gen + ".0" : "SATA"], ["Capacidad", p.tb >= 1 ? p.tb + " TB" : Math.round(p.tb * 1000) + " GB"], ["Velocidad", "hasta " + p.speed.toLocaleString("es-GT") + " MB/s"]];
    case "psu": return [["Potencia real", p.w + " W" + (p.generic ? " (la etiqueta dice " + p.label + " W)" : "")], ["Formato", p.ff], ["PCIe 8 pines", p.p8], ["16 pines nativo", yes(p.p16)], ["Conectores SATA", p.sata]];
    case "laptop": return [["Procesador", p.cpu.name], ["Memoria", p.ram ? p.ram + " ranuras SODIMM " + p.mem + " · máx " + p.maxRam + " GB" : "Soldada: " + p.solder + " GB " + p.mem], ["M.2", p.m2.length ? p.m2.map((s) => "PCIe " + s[1] + ".0" + (s[2] ? " (acepta SATA)" : "")).join(", ") : "No tiene"], ["Bahía 2.5\"", p.b25 ? "Sí" : "No"], ["Video", p.gpu ? p.gpu.name : "Integrado"]];
  }
  return [];
}
const TAG = { 0: ["ok", "✓ Compatible"], 1: ["warn", "⚠ Advertencia"], 2: ["bad", "✕ Incompatible"], "-1": ["pre", "• Falta otra pieza"], "-2": ["full", "● Ocupado"] };

function renderTabs() {
  $(".t3d__tabs").innerHTML = TABS[S.mode].map(([k, t]) => '<button type="button" class="t3d__tab' + (UI.tab === k ? " is-on" : "") + '" data-tab="' + k + '">' + esc(t) + "</button>").join("");
  $$(".t3d__mode").forEach((b) => b.classList.toggle("is-on", b.getAttribute("data-mode") === S.mode));
}
function renderList() {
  const list = Object.values(BY).filter((p) => p.kind === UI.tab);
  $(".t3d__list").innerHTML = list.map((p) => {
    const r = S.compat ? evalPart(p) : null;
    const tg = r ? TAG[r.lvl] : null;
    return '<button type="button" class="t3d__item' + (UI.armed === p.id ? " is-armed" : "") + (r && r.lvl === 2 ? " is-bad" : "") + '" data-id="' + p.id + '">' +
      '<span class="t3d__item-name">' + esc(p.name) + "</span>" +
      '<span class="t3d__item-sub">' + esc(short(p)) + "</span>" +
      '<span class="t3d__item-foot"><b>' + q(p.price || 0) + "</b>" + (tg ? '<em class="t3d__tag t3d__tag--' + tg[0] + '">' + tg[1] + "</em>" : "") + "</span></button>";
  }).join("");
}

function partCard(p, mode, key) {
  const rows = specs(p).map((r) => "<tr><th>" + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td></tr>").join("");
  let compat = "";
  if (mode === "armed" && S.compat) {
    const r = evalPart(p);
    compat = r.msgs.length ? '<ul class="t3d__why">' + r.msgs.map((m) => '<li class="t3d__why--' + (TAG[m[0]] || TAG[0])[0] + '">' + esc(m[1]) + "</li>").join("") + "</ul>" : '<p class="t3d__why-ok">✓ Compatible con lo que ya tienes instalado.</p>';
  }
  const btns = mode === "armed"
    ? '<div class="t3d__btns"><button type="button" class="t3d__btn t3d__btn--pri" data-act="install">Instalar</button><button type="button" class="t3d__btn" data-act="cancel">Cancelar</button></div><p class="t3d__mini">O haz clic en una zona resaltada del modelo 3D.</p>'
    : '<div class="t3d__btns"><button type="button" class="t3d__btn t3d__btn--bad" data-act="remove" data-key="' + esc(key) + '">Retirar</button><button type="button" class="t3d__btn" data-act="unsel">Cerrar</button></div>';
  return '<p class="t3d__kicker">' + (mode === "armed" ? "Pieza elegida · " : "Instalado · ") + esc(KIND_LABEL[p.kind]) + "</p><h4>" + esc(p.name) + "</h4>" + (p.sub ? '<p class="t3d__mini">' + esc(p.sub) + "</p>" : "") + compat + '<table class="t3d__specs">' + rows + '<tr><th>Precio ref.</th><td>' + q(p.price || 0) + "</td></tr></table>" + btns;
}

function renderSel() {
  const el = $(".t3d__sel");
  if (UI.armed && P(UI.armed)) el.innerHTML = partCard(P(UI.armed), "armed");
  else if (UI.sel && getAt(UI.sel)) el.innerHTML = partCard(P(getAt(UI.sel)), "sel", UI.sel);
  else el.innerHTML = S.mode === "pc"
    ? '<p class="t3d__kicker">Cómo se usa</p><h4>Arma tu PC</h4><ol class="t3d__help"><li>Elige una pieza del catálogo.</li><li>Las zonas <b class="g">verdes</b> muestran dónde va; <b class="y">amarillo</b> = funciona con advertencias; <b class="r">rojo</b> = no es compatible.</li><li>Haz los pasos (pasta térmica y cables).</li><li>Presiona <b>Encender</b> y lee lo que pasa.</li></ol><p class="t3d__mini">Arrastra para girar · rueda o pellizco para acercar · clic derecho o dos dedos para mover. Haz clic en una pieza instalada para verla o retirarla.</p>'
    : '<p class="t3d__kicker">Cómo se usa</p><h4>Repara y mejora una laptop</h4><ol class="t3d__help"><li>Elige una laptop.</li><li>Quita la tapa inferior.</li><li><b>Desconecta la batería</b> antes de tocar cualquier pieza.</li><li>Cambia RAM o discos, vuelve a conectar la batería y enciende.</li></ol>';
}

function renderSteps() {
  const el = $(".t3d__steps");
  if (S.mode === "lap") {
    const L = P(S.lap.laptop);
    el.innerHTML = '<h4>Pasos</h4>' + (L ? '<ul class="t3d__chk">' +
      chk("cover", "Tapa inferior retirada", !S.lap.cover, true) + chk("batt", "Batería desconectada", !S.lap.batt, !S.lap.cover, S.lap.cover ? "Primero quita la tapa." : "") + "</ul>" : '<p class="t3d__mini">Elige una laptop del catálogo.</p>');
    return;
  }
  const list = stepsPC();
  el.innerHTML = '<h4>Pasos y cables</h4><ul class="t3d__chk">' + list.map((s) => chk(s.id, s.label, s.done, s.en || s.done, s.need, s.tip, s.auto)).join("") + "</ul>";
}
function chk(id, label2, done, en, need, tip, auto) {
  return '<li><button type="button" class="t3d__step' + (done ? " is-done" : "") + (en ? "" : " is-off") + '" data-step="' + id + '"' + (auto ? " disabled" : "") + ' aria-pressed="' + (done ? "true" : "false") + '"><span class="t3d__box">' + (done ? "✓" : "") + "</span><span>" + esc(label2) + (need && !done ? '<small>' + esc(need) + "</small>" : tip && !done ? "<small>" + esc(tip) + "</small>" : "") + "</span></button></li>";
}

function liveWarns() {
  const out = [];
  if (S.mode === "lap") return out;
  const st = S.pc, b = P(st.board), cpu = P(st.cpu), cl = P(st.cooler), g = P(st.gpu), ps = P(st.psu);
  if (b && cpu && b.bios.indexOf(cpu.gen) >= 0 && !st.steps.bios) out.push("Falta actualizar el BIOS para este procesador.");
  if (cpu && b && !cpu.ig && !b.igpu && !g) out.push("El procesador no tiene video integrado: falta tarjeta de video.");
  if (cpu && cl && cl.tdp < cpu.w * 0.75) out.push("El disipador se queda corto para el procesador.");
  const w = loadW();
  if (ps && w > ps.w) out.push("La fuente no alcanza (" + ps.w + " W para ~" + w + " W).");
  if (ps && ps.generic) out.push("Fuente genérica: poco confiable.");
  if (b) { const ri = ramInfo(st, b.slots); if (ri.list.length === 1) out.push("Un solo módulo de RAM (canal sencillo)."); if (ri.wrong) out.push("RAM en ranuras del mismo canal: usa A2 y B2."); }
  if (g && ps && pcieCheck(g, ps)[0] === 2) out.push("La fuente no tiene los conectores que pide la tarjeta.");
  return out;
}

function renderSum() {
  const el = $(".t3d__sum");
  let rows = "";
  if (S.mode === "pc") {
    const st = S.pc, b = P(st.board);
    const one = (k) => { const p = P(st[k]); return "<tr><th>" + KIND_LABEL[k] + "</th><td>" + (p ? '<button type="button" class="t3d__link" data-selkey="' + k + '">' + esc(p.name) + "</button>" : "<span>—</span>") + "</td></tr>"; };
    const ri = b ? ramInfo(st, b.slots) : { list: [] };
    const drives = st.m2.map((id, i) => [id, "m2:" + i]).concat(st.bay.map((id, i) => [id, "bay:" + i])).filter((x) => x[0]);
    rows = one("case") + one("board") + one("cpu") + one("cooler") +
      "<tr><th>Memoria RAM</th><td>" + (ri.list.length ? ri.gb + " GB " + ri.type + " (" + ri.list.length + " módulo" + (ri.list.length > 1 ? "s" : "") + (ri.dual ? ", dual channel" : "") + ")" : "—") + "</td></tr>" +
      "<tr><th>Almacenamiento</th><td>" + (drives.length ? drives.map((x) => '<button type="button" class="t3d__link" data-selkey="' + x[1] + '">' + esc(P(x[0]).name) + "</button>").join("<br>") : "—") + "</td></tr>" +
      one("gpu") + one("psu");
    const w = loadW();
    rows += '<tr class="t3d__tot"><th>Consumo estimado</th><td>~' + w + " W · fuente recomendada " + recPSU(w) + " W</td></tr>";
  } else {
    const L = P(S.lap.laptop);
    if (L) {
      const gb = (L.solder || 0) + S.lap.ram.map(P).filter(Boolean).reduce((a, r) => a + r.gb, 0);
      const drives = S.lap.m2.map(P).concat(S.lap.b25.map(P)).filter(Boolean);
      rows = "<tr><th>Laptop</th><td>" + esc(L.name) + "</td></tr><tr><th>Procesador</th><td>" + esc(L.cpu.name) + "</td></tr><tr><th>Memoria RAM</th><td>" + gb + " GB " + L.mem + "</td></tr><tr><th>Almacenamiento</th><td>" + (drives.length ? drives.map((d) => esc(d.name)).join("<br>") : "—") + "</td></tr>";
    }
  }
  rows += '<tr class="t3d__tot"><th>Precio de referencia</th><td><b>' + q(totalPrice()) + "</b></td></tr>";
  const ws = S.compat ? liveWarns() : [];
  el.innerHTML = "<h4>Resumen del equipo</h4><table class=\"t3d__specs\">" + rows + "</table>" + (ws.length ? '<ul class="t3d__why">' + ws.map((t) => '<li class="t3d__why--warn">' + esc(t) + "</li>").join("") + "</ul>" : "") + (UI.done ? '<p class="t3d__done">✓ Ya completaste esta lección. Puedes seguir armando todo lo que quieras.</p>' : "");
}

function renderUI() { renderTabs(); renderList(); renderSel(); renderSteps(); renderSum(); }

function refresh() {
  rebuild3D();
  if (UI.reframe) { frame(); UI.reframe = false; }
  renderUI();
}
function changed() { save(); UI.powered = 0; hideScreen(); refresh(); }
function renderAll(reframe) { UI.reframe = !!reframe; save(); UI.powered = 0; hideScreen(); refresh(); }
function structureMaybe(kind) { if (kind === "case" || kind === "board" || kind === "laptop") UI.reframe = true; }

function autoTab() {
  if (S.mode !== "pc") { if (UI.tab === "laptop" && S.lap.laptop) UI.tab = "ram"; return; }
  const st = S.pc, single = ["case", "board", "cpu", "cooler", "gpu", "psu"];
  const full = single.indexOf(UI.tab) >= 0 ? !!st[UI.tab] : UI.tab === "ram" ? st.ram.filter(Boolean).length >= Math.min(2, (P(st.board) || { slots: 2 }).slots) : false;
  if (!full) return;
  const cpu = P(st.cpu), b = P(st.board);
  const needGpu = cpu && !cpu.ig && !(b && b.igpu);
  const order = ["case", "board", "cpu", "cooler", "ram", "drive"].concat(needGpu ? ["gpu"] : []).concat(["psu"]);
  const ok = (k) => (single.indexOf(k) >= 0 ? !!st[k] : k === "ram" ? st.ram.some(Boolean) : st.m2.some(Boolean) || st.bay.some(Boolean));
  const nx = order.find((k) => !ok(k));
  if (nx) UI.tab = nx;
}

function toggleLap(what) {
  const L = P(S.lap.laptop);
  if (!L) return;
  if (what === "cover") {
    if (!S.lap.cover && !S.lap.batt) say("Tapa colocada. ⚠ Recuerda: la batería quedó desconectada; conéctala antes de cerrar si vas a encender.", "warn");
    else say(S.lap.cover ? "Quitaste los tornillos y la tapa inferior. Usa una púa plástica para no rayar los broches." : "Tapa colocada y atornillada ✔", "ok");
    S.lap.cover = !S.lap.cover;
  } else {
    if (S.lap.cover) { say("Primero quita la tapa inferior.", "warn"); return; }
    S.lap.batt = !S.lap.batt;
    say(S.lap.batt ? "Batería conectada ✔" : "Batería desconectada ✔ Ahora sí puedes cambiar piezas con seguridad.", "ok");
  }
  UI.reframe = what === "cover";
  changed();
}

/* ───────────── pantalla de encendido ───────────── */
function hideScreen() { const s = $(".t3d__screen"); if (s) s.hidden = true; }
function power() {
  UI.armed = null;
  const Rr = S.mode === "pc" ? postPC() : postLap();
  UI.lastPost = Rr;
  UI.powered = Rr.ok ? 2 : Rr.spin ? 1 : 0;
  rebuild3D(); renderUI();
  const sc = $(".t3d__screen");
  let h = '<button type="button" class="t3d__x" data-act="close" aria-label="Cerrar">×</button>';
  if (!Rr.ok) {
    h += '<div class="t3d__nosig"><span>' + (Rr.spin ? "Sin señal" : "") + "</span></div>" +
      '<div class="t3d__report"><h4>⏻ Lo que observas</h4><ul>' + Rr.sympt.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul>" +
      (Rr.hints.length ? '<details class="t3d__hint2"><summary>Ver pista</summary><p>' + Rr.hints.map(esc).join("<br>") + "</p></details>" : "") +
      '<p class="t3d__mini">Diagnostica, corrige y vuelve a encender.</p></div>';
    say("No arrancó. Lee los síntomas y diagnostica.", "bad");
  } else {
    h += '<div class="t3d__bios"><p class="t3d__bios-t">' + esc(Rr.bios.title) + "</p><table>" + Rr.bios.rows.map((r) => "<tr><th>" + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td></tr>").join("") + "</table>" +
      (Rr.noBoot ? '<p class="t3d__bios-err">Reboot and Select proper Boot device<br>or Insert Boot Media in selected Boot device and press a key_</p>' : '<p class="t3d__bios-ok">Arrancando Windows…</p>') + "</div>";
    h += '<div class="t3d__report">';
    if (Rr.warns.length) h += "<h4>Advertencias</h4><ul class=\"t3d__why\">" + Rr.warns.map((w) => '<li class="t3d__why--' + (w[0] === "alta" ? "bad" : "warn") + '">' + esc(w[1]) + "</li>").join("") + "</ul>";
    if (Rr.est) h += "<h4>Rendimiento estimado</h4>" + Rr.est.map((e) => '<div class="t3d__bar"><div class="t3d__bar-h"><span>' + esc(e.k) + "</span><b>" + esc(e.t) + '</b></div><div class="t3d__bar-t"><i style="width:' + Math.round(e.v) + '%"></i></div><small>' + esc(e.d) + "</small></div>").join("");
    if (Rr.noBoot) h += '<p class="t3d__why--bad">No hay disco: el equipo enciende pero no tiene dónde estar Windows. Instala un SSD o disco duro.</p>';
    h += '<p class="t3d__w11 ' + (Rr.win11[0] ? "is-ok" : "is-no") + '">' + (Rr.win11[0] ? "✓ " : "✕ ") + esc(Rr.win11[1]) + "</p>";
    h += '<p class="t3d__mini">Precio de referencia: <b>' + q(Rr.price) + "</b>" + (Rr.watts ? " · consumo ~" + Rr.watts + " W" : "") + "</p>";
    if (Rr.complete) {
      h += '<p class="t3d__done">🎉 ¡Equipo funcionando! ' + (UI.done ? "Esta lección ya estaba completada." : "Lección completada.") + "</p>";
      if (!UI.sent) { UI.sent = true; UI.done = true; try { localStorage.setItem("tr-t3d:done:" + LESSON, "1"); } catch (e) {} document.dispatchEvent(new CustomEvent("aula:sim-done", { detail: { nota: 100 } })); }
    } else if (!Rr.noBoot) h += '<p class="t3d__mini">Corrige las advertencias en rojo para dar el equipo por terminado.</p>';
    h += "</div>";
    say(Rr.complete ? "¡Encendió y arrancó! Revisa el informe." : "Encendió, pero hay cosas por corregir.", Rr.complete ? "ok" : "warn");
  }
  sc.innerHTML = h; sc.hidden = false;
  sc.scrollTop = 0;
}

/* ───────────── arranque ───────────── */
function shell() {
  root.innerHTML =
    '<div class="t3d__top">' +
      '<div class="t3d__modes" role="group" aria-label="Tipo de equipo"><button type="button" class="t3d__mode" data-mode="pc">🖥️ PC de escritorio</button><button type="button" class="t3d__mode" data-mode="lap">💻 Laptop</button></div>' +
      '<div class="t3d__tools">' +
        '<select class="t3d__preset" aria-label="Cargar un ejemplo"><option value="">Cargar ejemplo…</option>' + PRESETS.map((p) => '<option value="' + p.id + '">' + esc(p.name) + "</option>").join("") + "</select>" +
        '<label class="t3d__sw"><input type="checkbox" class="t3d__compat"' + (S.compat ? " checked" : "") + "> Mostrar compatibilidad</label>" +
        '<button type="button" class="t3d__btn" data-act="new">Nuevo</button>' +
        '<button type="button" class="t3d__btn" data-act="full" title="Pantalla completa">⛶</button>' +
      "</div></div>" +
    '<p class="t3d__msg" role="status" aria-live="polite"></p>' +
    '<div class="t3d__grid">' +
      '<aside class="t3d__cat" aria-label="Catálogo de piezas"><div class="t3d__tabs"></div><div class="t3d__list"></div></aside>' +
      '<div class="t3d__stage"><canvas class="t3d__canvas" aria-label="Vista 3D del equipo"></canvas>' +
        '<button type="button" class="t3d__view" data-act="frame" title="Centrar vista">⟲ Centrar</button>' +
        '<div class="t3d__screen" hidden></div></div>' +
      '<aside class="t3d__side"><div class="t3d__card t3d__sel"></div><div class="t3d__card t3d__steps"></div>' +
        '<button type="button" class="t3d__power" data-act="power">⏻ Encender</button>' +
        '<div class="t3d__card t3d__sum"></div></aside>' +
    "</div>";
}

function events() {
  root.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t || !root.contains(t)) return;
    if (t.hasAttribute("data-mode")) { const m = t.getAttribute("data-mode"); if (m !== S.mode) { S.mode = m; UI.tab = TABS[m][0][0]; UI.armed = UI.sel = null; if (m === "lap" && S.lap.laptop) UI.tab = "ram"; renderAll(true); say(m === "pc" ? "Modo PC de escritorio." : "Modo laptop.", "info"); } return; }
    if (t.hasAttribute("data-tab")) { UI.tab = t.getAttribute("data-tab"); renderTabs(); renderList(); return; }
    if (t.hasAttribute("data-id")) {
      const id = t.getAttribute("data-id");
      UI.armed = UI.armed === id ? null : id; UI.sel = null;
      rebuild3D(); renderUI();
      if (UI.armed) {
        const p = P(id);
        if (S.mode === "lap" && p.kind !== "laptop" && S.lap.laptop && (S.lap.cover || S.lap.batt)) say(S.lap.cover ? "Para instalar piezas primero quita la tapa inferior." : "Desconecta la batería antes de instalar.", "warn");
        else if (!markers.length && renderer) { const r = evalPart(p); say((r.msgs[0] || [0, "No hay dónde instalarla."])[1], r.lvl === 2 ? "bad" : "warn"); }
        if (window.innerWidth < 980 && renderer) $(".t3d__stage").scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    if (t.hasAttribute("data-step")) { const id = t.getAttribute("data-step"); if (S.mode === "lap") toggleLap(id); else toggleStep(id); return; }
    if (t.hasAttribute("data-selkey")) { UI.sel = t.getAttribute("data-selkey"); UI.armed = null; rebuild3D(); renderUI(); return; }
    const act = t.getAttribute("data-act");
    if (act === "install" && UI.armed) install(UI.armed);
    else if (act === "cancel") { UI.armed = null; rebuild3D(); renderUI(); }
    else if (act === "remove") remove(t.getAttribute("data-key"));
    else if (act === "unsel") { UI.sel = null; rebuild3D(); renderUI(); }
    else if (act === "power") power();
    else if (act === "close") { hideScreen(); }
    else if (act === "frame") frame();
    else if (act === "new") {
      if (!window.confirm("¿Empezar de cero? Se quitarán todas las piezas de " + (S.mode === "pc" ? "la PC." : "la laptop."))) return;
      if (S.mode === "pc") S.pc = emptyPC(); else S.lap = emptyLap();
      UI.armed = UI.sel = null; UI.tab = TABS[S.mode][0][0];
      renderAll(true); say("Mesa limpia. Empieza por el " + (S.mode === "pc" ? "gabinete o la placa madre." : "modelo de laptop."), "info");
    } else if (act === "full") {
      const fs = document.fullscreenElement || document.webkitFullscreenElement;
      if (fs) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else if (root.requestFullscreen) root.requestFullscreen().catch(() => root.classList.toggle("is-max"));
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
      else root.classList.toggle("is-max");
    }
  });
  $(".t3d__preset").addEventListener("change", (e) => { const v = e.target.value; e.target.value = ""; if (v) { UI.tab = TABS[PRESETS.find((p) => p.id === v).lap ? "lap" : "pc"][0][0]; applyPreset(v); autoTab(); renderUI(); } });
  $(".t3d__compat").addEventListener("change", (e) => { S.compat = e.target.checked; save(); rebuild3D(); renderUI(); say(S.compat ? "Compatibilidad visible: verás ✓ ⚠ ✕ en cada pieza." : "Compatibilidad oculta: ahora depende de ti revisar sockets, memorias y medidas.", "info"); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!$(".t3d__screen").hidden) hideScreen(); else if (UI.armed) { UI.armed = null; rebuild3D(); renderUI(); } } });
}

function init() {
  load();
  shell();
  root.classList.add("is-ready");
  UI.tab = TABS[S.mode][0][0];
  if (S.mode === "pc") autoTab(); else if (S.lap.laptop) UI.tab = "ram";
  events();
  try { initScene($(".t3d__canvas"), $(".t3d__stage")); }
  catch (err) {
    renderer = null;
    $(".t3d__stage").innerHTML = '<div class="t3d__nogl"><p><b>Tu navegador o equipo no puede mostrar 3D (WebGL).</b></p><p>Puedes seguir armando con el catálogo y el botón Encender; para ver el modelo 3D usa Chrome, Edge o Firefox actualizados y activa la «aceleración por hardware».</p><div class="t3d__screen" hidden></div></div>';
  }
  UI.reframe = true;
  refresh();
  say(UI.done ? "Bienvenido de vuelta. Tu armado anterior se guardó en este navegador." : "Elige una pieza del catálogo para empezar. Consejo: empieza por el gabinete o la placa madre.", "info");
}

if (root && CAT) init();
else if (root) root.innerHTML = '<p class="t3d__nogl">No se pudo cargar el catálogo de piezas. Recarga la página.</p>';
