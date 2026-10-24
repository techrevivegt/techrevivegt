/* TechRevive · Mini-simuladores del aula (sin WebGL, puro DOM/canvas).
   Se activan en lecciones de tipo «Simulador» (<section class="msim" data-msim="CLAVE">).
   Cada simulador tiene retos; al lograrlos avisa «aula:sim-done» con la nota (la lección se completa sola). */
(function () {
  const host = document.querySelector(".msim[data-msim]");
  if (!host) return;
  const CLAVE = host.getAttribute("data-msim");
  const LESSON = (document.querySelector("[data-lesson]") || document.body).getAttribute("data-lesson") || CLAVE;
  const $ = (s, el) => (el || host).querySelector(s);
  const $$ = (s, el) => Array.prototype.slice.call((el || host).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SAVE_KEY = "tr-msim:v1";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")[LESSON] || {}; } catch (e) {}
  function save(patch) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}"); } catch (e) {}
    all[LESSON] = Object.assign(saved, patch || {});
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(all)); } catch (e) {}
  }
  let enviado = false;
  function finish(nota) {
    if (enviado) return;
    enviado = true;
    document.dispatchEvent(new CustomEvent("aula:sim-done", { detail: { nota: nota } }));
    msg("🎉 ¡Todos los retos superados! Lección completada (" + nota + "%).", "ok");
  }
  function msg(t, kind) {
    let m = $(".msim__msg", host);
    if (!m) { m = document.createElement("p"); m.className = "msim__msg"; host.appendChild(m); }
    m.textContent = t;
    m.style.background = kind === "ok" ? "#166534" : kind === "err" ? "#b91c1c" : "#334155";
  }

  const CSS = `
.msim{font-family:inherit;background:#fffdf8;border:1px solid #e3dbc9;border-radius:14px;padding:18px;margin:18px 0;--ms:#00756f}
.msim h3{margin:0 0 4px;font-size:16px}
.msim__lay{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start}
@media(max-width:760px){.msim__lay{grid-template-columns:1fr}}
.msim label{font-size:12.5px;font-weight:700;color:#57503f;display:block;margin:10px 0 2px}
.msim input[type=range]{width:100%;accent-color:var(--ms)}
.msim select,.msim input[type=text]{width:100%;padding:8px 10px;border:1px solid #d8d0bd;border-radius:8px;font:inherit;font-size:14px;background:#fff}
.msim canvas{display:block;border-radius:10px;max-width:100%;box-shadow:0 6px 18px rgba(40,35,20,.18)}
.msim .btn{display:inline-block;background:var(--ms);color:#fff;border:0;border-radius:9px;padding:9px 16px;font:700 13.5px inherit;cursor:pointer;margin-top:10px}
.msim .btn--ghost{background:#f3efe4;color:#4a4436;border:1px solid #d8d0bd}
.msim__retos{list-style:none;padding:0;margin:12px 0 0;display:grid;gap:8px}
.msim__retos li{background:#f7f3e8;border:1px solid #e3dbc9;border-radius:10px;padding:9px 12px;font-size:13.5px}
.msim__retos li.ok{background:#e9f8ee;border-color:#8fd3a8}
.msim__retos li.ok::after{content:" ✔";color:#16a34a;font-weight:800}
.msim__msg{margin-top:12px;color:#fff;padding:9px 14px;border-radius:9px;font-size:13.5px}
.msim__kpi{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0}
.msim__kpi span{background:#f0ece0;border-radius:8px;padding:6px 10px;font-size:12.5px;font-weight:600;color:#57503f}
.msim__kpi b{color:#1e3a5f}
.msim table.grid{border-collapse:collapse;font-size:13px;width:100%}
.msim table.grid input{width:100%;border:0;border-bottom:1px solid #e0d9c8;padding:6px 8px;font:inherit;font-size:13px;background:transparent;text-align:right}
.msim table.grid input.txt{text-align:left}
.msim table.grid th{background:#efe9da;color:#57503f;padding:4px 8px;font-size:11.5px}
.msim table.grid td{border-left:1px solid #eee}
.msim .chat{display:flex;flex-direction:column;gap:8px;max-height:380px;overflow:auto;padding:6px 2px}
.msim .bub{max-width:85%;padding:10px 13px;border-radius:14px;font-size:13.5px;line-height:1.5}
.msim .bub--r{background:#eef2f7;border:1px solid #dbe3ee;align-self:flex-start;border-bottom-left-radius:4px}
.msim .bub--y{background:#dbeafe;border:1px solid #bcd3f5;align-self:flex-end;border-bottom-right-radius:4px}
.msim .bub--fb{background:#fffbeb;border:1px solid #f5e3b3;align-self:flex-start;font-size:12.5px;color:#6b5a17}
.msim .opts{display:grid;gap:7px;margin:6px 0}
.msim .opts button{text-align:left;background:#fff;border:1.5px solid #cbd5e1;border-radius:10px;padding:9px 12px;font:600 13px inherit;cursor:pointer;color:#334155}
.msim .opts button:hover{border-color:#2563eb;background:#eff6ff}
.msim .fchip{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1.5px solid #cfc8b8;border-radius:9px;padding:7px 10px;font-size:12.5px;cursor:grab;user-select:none}
.msim .fchip.ok{background:#e9f8ee;border-color:#8fd3a8;cursor:default}
.msim .fzone{min-height:86px;border:2px dashed #cfc8b8;border-radius:12px;padding:8px;display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start}
.msim .fzone.over{border-color:var(--ms);background:#eef6f5}
.msim .fzone h5{width:100%;margin:0 0 2px;font-size:12px;color:#57503f}
.msim .tabs{display:flex;gap:6px;margin-bottom:8px}
.msim .tabs button{padding:6px 14px;border-radius:8px 8px 0 0;border:1px solid #d8d0bd;border-bottom:0;background:#f0ece0;font:700 12px inherit;cursor:pointer;color:#57503f}
.msim .tabs button.on{background:#1c2027;color:#fff}
.msim textarea.code{width:100%;min-height:150px;font:13px/1.5 Consolas,monospace;background:#1c2027;color:#e6e6e6;border:1px solid #111;border-radius:10px;padding:10px;white-space:pre;tab-size:2}
.msim .sw{width:44px;height:44px;border-radius:10px;border:2px solid transparent;cursor:pointer}
.msim .sw.sel{border-color:#1c2027;box-shadow:0 0 0 2px #fff inset}
.msim .role{display:flex;align-items:center;gap:10px;margin:6px 0;background:#f7f3e8;border-radius:9px;padding:7px 10px;font-size:13px}
.msim .role .dot{width:26px;height:26px;border-radius:50%;border:2px solid #cfc8b8}`;
  const st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);

  const bar = document.createElement("div");
  bar.innerHTML = '<div style="display:flex;gap:10px;align-items:center;margin-bottom:4px"><span style="font-size:22px">🧪</span><div><strong style="font-size:14.5px">Simulador interactivo</strong><div class="muted" style="font-size:12px;color:#8a8067">Tu avance se guarda en este navegador · completalo con los retos</div></div></div>';
  host.prepend(bar.firstElementChild);

  const SIMS = {};
  /* Las funciones SIMS.* se definen abajo; el arranque ocurre al final del archivo. */

  /* ═══════════ 1. FOTO: triángulo de exposición ═══════════ */
  SIMS.foto = function () {
    host.innerHTML = `<h3>📷 Cámara virtual (triángulo de exposición)</h3>
    <div class="msim__lay"><div><canvas data-cv width="520" height="330"></canvas>
    <div class="msim__kpi"><span>Exposición: <b data-ev>—</b></span><span>Ruido: <b data-rn>—</b></span><span>Movimiento: <b data-mb>—</b></span></div></div>
    <div><label>ISO (sensibilidad) <span data-iso-v></span></label><input type="range" min="0" max="5" step="1" value="0" data-iso>
    <small style="color:#8a8067">100 → 3200 · cuanto más alto, más grano</small>
    <label>Velocidad (obturador) <span data-vel-v></span></label><input type="range" min="0" max="5" step="1" value="2" data-vel>
    <small style="color:#8a8067">1/1000 (rápido, congela) → 1/30 (lento, barrido)</small>
    <label>Apertura (diafragma) <span data-ap-v></span></label><input type="range" min="0" max="5" step="1" value="2" data-ap>
    <small style="color:#8a8067">f/16 (cerrado) → f/1.8 (abierto, fondo difuso)</small>
    <ul class="msim__retos" data-retos></ul>
    <p><em style="font-size:12px;color:#8a8067">El corredor 🏃 se mueve: mirá si sale congelado o barrido. El fondo se difumina según tu apertura.</em></p></div></div>`;
    const cv = $("[data-cv]"), ctx = cv.getContext("2d");
    const ISO = [100, 200, 400, 800, 1600, 3200], VEL = [1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30], VTX = ["1/1000", "1/500", "1/250", "1/125", "1/60", "1/30"], AP = [16, 11, 8, 5.6, 4, 2.8, 1.8].slice(0, 6);
    const S = { iso: saved.iso ?? 0, vel: saved.vel ?? 2, ap: saved.ap ?? 2, retos: saved.retos || [false, false, false] };
    const RETOS = [
      { t: "🏃 RETO 1 · Deporte: congelá al corredor (1/500 o más rápido) y que la foto NO quede ni oscura ni muy granulada (ISO ≤ 800)", ok: (s) => S.vel <= 1 && S.iso <= 2 && exp() === "bien" },
      { t: "🙂 RETO 2 · Retrato suave: fondo difuso (f/2.8 o más abierto) con exposición correcta", ok: (s) => S.ap >= 4 && exp() === "bien" },
      { t: "🌙 RETO 3 · De noche: ISO entre 800 y 1600, velocidad 1/60–1/250 y apertura bien abierta (f/2.8–f/4)", ok: (s) => S.iso >= 3 && S.iso <= 4 && S.vel >= 3 && S.vel <= 4 && S.ap >= 4 },
    ];
    function exp() { /* exposición vs referencia ISO100 · 1/250 · f/8 */
      const e = (ISO[S.iso] / 100) * (VEL[S.vel] / (1 / 250)) * Math.pow(8 / AP[S.ap], 2);
      return e < 0.5 ? "oscura" : e > 2 ? "quemada" : "bien";
    }
    function stops() { const e = (ISO[S.iso] / 100) * (VEL[S.vel] / (1 / 250)) * Math.pow(8 / AP[S.ap], 2); return Math.log2(e); }
    function draw(t) {
      const W = cv.width, H = cv.height, ex = exp(), eStops = clamp(stops(), -3, 3);
      const night = document.body && host.contains(cv) && RETOS[2].ok() ? false : false;
      /* cielo */
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      const tone = clamp(Math.pow(2, eStops), 0.06, 3.2);
      const n = S.iso >= 3 ? 0.55 : 1; /* si ISO alto simulamos ambiente oscuro base */
      grad.addColorStop(0, shade([125, 178, 226], tone * 0.85)); grad.addColorStop(0.62, shade([196, 222, 240], tone * n)); grad.addColorStop(0.63, shade([94, 160, 96], tone * n)); grad.addColorStop(1, shade([58, 110, 60], tone));
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      /* sol */
      ctx.fillStyle = shade([255, 236, 160], tone); ctx.beginPath(); ctx.arc(440, 60, 26, 0, 7); ctx.fill();
      /* cerro */
      ctx.fillStyle = shade([70, 120, 110], tone); ctx.beginPath(); ctx.moveTo(0, 210); ctx.quadraticCurveTo(160, 120, 300, 200); ctx.quadraticCurveTo(420, 250, 520, 205); ctx.lineTo(520, 208); ctx.lineTo(0, 208); ctx.fill();
      /* camino */
      ctx.fillStyle = shade([196, 170, 120], tone * 0.95); ctx.beginPath(); ctx.moveTo(180, H); ctx.quadraticCurveTo(260, 260, 320, 210); ctx.lineTo(370, 210); ctx.quadraticCurveTo(320, 270, 300, H); ctx.fill();
      /* corredor (movimiento) */
      const rx = 260 + Math.sin(t / 900) * 90, ry = 235;
      const ghosts = S.vel >= 3 ? Math.min(4, S.vel - 1) : 0; /* el lento deja estelas */
      for (let i = ghosts; i >= 0; i--) {
        ctx.globalAlpha = i === 0 ? 1 : 0.18;
        const gx = rx - i * (26 + S.vel * 6);
        corredor(gx, ry, i === 0 ? shade([40, 48, 60], 1) : shade([40, 48, 60], 1));
      }
      ctx.globalAlpha = 1;
      /* ruido ISO */
      if (S.iso >= 3) {
        ctx.globalAlpha = 0.14 + S.iso * 0.02;
        for (let i = 0; i < 140 + S.iso * 90; i++) { ctx.fillStyle = `rgb(${160 + rnd() * 95 | 0},${140 + rnd() * 95 | 0},${150 + rnd() * 95 | 0})`; ctx.fillRect(Math.random() * W, Math.random() * H, 1.6, 1.6); }
        ctx.globalAlpha = 1;
      }
      /* viñeta básica cuando f abierto (estética) */
      if (S.ap >= 4) { const r = ctx.createRadialGradient(260, 165, 120, 260, 165, 330); r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(0,0,0,.28)"); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H); }
      if (ex === "oscura") { ctx.fillStyle = "rgba(2,8,16,.55)"; ctx.fillRect(0, 0, W, H); }
      if (ex === "quemada") { ctx.fillStyle = "rgba(255,252,240,.5)"; ctx.fillRect(0, 0, W, H); }
    }
    let seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed / 2147483647); }
    function corredor(x, y, col) {
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y - 34, 9, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x, y - 2); ctx.moveTo(x, y - 20); ctx.lineTo(x - 16, y - 28); ctx.moveTo(x, y - 20); ctx.lineTo(x + 14, y - 10); ctx.moveTo(x, y - 2); ctx.lineTo(x - 12, y + 22); ctx.moveTo(x, y - 2); ctx.lineTo(x + 14, y + 18); ctx.stroke();
    }
    function shade(rgb, k) { k = clamp(k, 0.05, 2.6); return `rgb(${clamp(rgb[0] * k, 0, 255) | 0},${clamp(rgb[1] * k, 0, 255) | 0},${clamp(rgb[2] * k, 0, 255) | 0})`; }
    function ui() {
      $("[data-iso-v]").textContent = ISO[S.iso]; $("[data-vel-v]").textContent = VTX[S.vel]; $("[data-ap-v]").textContent = "f/" + AP[S.ap];
      $("[data-ev]").textContent = exp() === "bien" ? "✅ correcto" : exp() === "oscura" ? "⬛ muy oscura" : "⬜ quemada";
      $("[data-rn]").textContent = ["limpia", "limpia", "apenas nota", "grano visible", "muy granulada", "horrible"][S.iso];
      $("[data-mb]").textContent = S.vel <= 1 ? "congelado ✅" : S.vel <= 3 ? "con algo de barrido" : "todo barrido ❌";
      S.retos = RETOS.map((r, i) => S.retos[i] || !!r.ok());
      $("[data-retos]").innerHTML = RETOS.map((r, i) => `<li class="${S.retos[i] ? "ok" : ""}">${esc(r.t)}</li>`).join("");
      save(S);
      if (S.retos.every(Boolean)) finish(100);
    }
    [["iso", "[data-iso]"], ["vel", "[data-vel]"], ["ap", "[data-ap]"]].forEach(([k, sel]) => { $(sel).value = S[k]; $(sel).addEventListener("input", (e) => { S[k] = +e.target.value; ui(); }); });
    host._frame = (t) => draw(t);
    ui();
  };

  /* ═══════════ 2. EMPRENDE: punto de equilibrio ═══════════ */
  SIMS.emprende = function () {
    const SCN = [
      { n: "🍱 Carrito de almuerzos", costo: 18, fijos: 1500, meta: 4, pista: "Tenés que vender como máximo unos 4 almuerzos al día para cubrir gastos." },
      { n: "🖥️ Técnico a domicilio", costo: 30, fijos: 2000, meta: 3, pista: "Un técnico no puede hacer más de 3 servicios al día: tu punto de equilibrio debe quedar por debajo." },
      { n: "👕 Boutique en línea", costo: 90, fijos: 3500, meta: 5, pista: "Prendas con costo alto: ¿qué precio deja sano el negocio sin espantar clientes (máx. ~5 prendas al día)?" },
    ];
    host.innerHTML = `<h3>💰 ¿Daría plata tu negocio?</h3>
    <div class="msim__lay"><div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">${SCN.map((s, i) => `<button class="btn--ghost btn" data-esc="${i}">${s.n}</button>`).join("")}</div>
    <label>Precio de venta: <b data-pv>Q0</b></label><input type="range" min="10" max="500" step="5" value="40" data-pr>
    <label>Costo por unidad (materiales): <b data-cv>Q0</b></label><input type="range" min="0" max="300" step="5" value="18" data-co>
    <label>Gastos fijos al mes (renta, internet…): <b data-fv>Q0</b></label><input type="range" min="500" max="8000" step="100" value="1500" data-fi>
    <button class="btn" data-comp>Comprobar mi escenario</button></div>
    <div><div class="msim__kpi"><span>Margen/unidad: <b data-km>—</b></span><span>Equilibrio: <b data-ke>—</b></span><span>Ventas al día necesarias: <b data-kd>—</b></span><span>Ganancia a 100 uds/mes: <b data-kg>—</b></span></div>
    <canvas data-ch width="400" height="170"></canvas>
    <ul class="msim__retos" data-retos></ul></div></div>`;
    const S = { esc: saved.esc || 0, pr: saved.pr || 40, co: saved.co || 18, fi: saved.fi || 1500, retos: saved.retos || [false, false, false] };
    const ctx = $("[data-ch]").getContext("2d");
    function nums() { return { p: S.pr, c: S.co, f: S.fi, m: S.pr - S.co, eq: S.pr > S.co ? Math.ceil(S.fi / (S.pr - S.co)) : Infinity }; }
    function ui() {
      const { p, c, f, m, eq } = nums();
      $("[data-pv]").textContent = "Q" + p.toLocaleString("es-GT");
      $("[data-cv]").textContent = "Q" + c.toLocaleString("es-GT");
      $("[data-fv]").textContent = "Q" + f.toLocaleString("es-GT");
      $("[data-km]").textContent = m > 0 ? "Q" + m : "¡negativo! ❌";
      $("[data-ke]").textContent = eq === Infinity ? "imposible" : eq + " unids/mes";
      $("[data-kd]").textContent = eq === Infinity ? "—" : (eq / 26).toFixed(1) + " /día";
      $("[data-kg]").textContent = eq === Infinity ? "—" : "Q" + (m * 100 - f).toLocaleString("es-GT");
      /* gráfica ingresos vs costos */
      const W = 400, H = 170, mx = Math.max(eq * 1.8, 60); ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#f7f3e8"; ctx.fillRect(0, 0, W, H);
      const line = (fn, col, dash) => { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.setLineDash(dash || []); ctx.beginPath(); for (let x = 0; x <= mx; x += 2) { const px = 30 + x * (W - 45) / mx, py = H - 22 - fn(x) * (H - 45) / (m * mx + 40); x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke(); };
      if (isFinite(eq)) {
        line((x) => m * x, "#15803d"); line((x) => f, "#b45309", [5, 4]);
        const bx = 30 + eq * (W - 45) / mx;
        ctx.fillStyle = "rgba(0,117,111,.15)"; ctx.fillRect(bx - 2, 8, 4, H - 30);
        ctx.fillStyle = "#00756f"; ctx.font = "700 11px Arial"; ctx.fillText("equilibrio: " + eq, clamp(bx + 6, 36, W - 90), 20);
      }
      ctx.fillStyle = "#57503f"; ctx.font = "11px Arial"; ctx.fillText("unidades vendidas al mes →", 30, H - 5);
      if (!isFinite(eq)) { ctx.fillStyle = "#b91c1c"; ctx.font = "700 13px Arial"; ctx.fillText("El margen es 0 o negativo: subí el precio o bajá el costo.", 36, H / 2); }
      $("[data-retos]").innerHTML = SCN.map((s, i) => `<li class="${S.retos[i] ? "ok" : ""}">${s.n} · meta: ≤ ${s.meta} ventas/día</li>`).join("");
      $$("[data-esc]").forEach((b) => { b.style.outline = +b.dataset.esc === S.esc ? "2px solid #00756f" : "none"; });
      save(S);
      if (S.retos.every(Boolean)) finish(100);
    }
    $$("[data-esc]").forEach((b) => b.addEventListener("click", () => { S.esc = +b.dataset.esc; S.co = SCN[S.esc].costo; S.fi = SCN[S.esc].fijos; $("[data-co]").value = S.co; $("[data-fi]").value = S.fi; msg("Escenario: " + SCN[S.esc].n + ". " + SCN[S.esc].pista); ui(); }));
    [["pr", "[data-pr]"], ["co", "[data-co]"], ["fi", "[data-fi]"]].forEach(([k, sel]) => { $(sel).value = S[k]; $(sel).addEventListener("input", (e) => { S[k] = +e.target.value; ui(); }); });
    $("[data-comp]").addEventListener("click", () => {
      const { m, eq } = nums(), sc = SCN[S.esc];
      if (m <= 0) return msg("❌ Margen negativo: vendés más barato de lo que te cuesta. Subí el precio.", "err");
      const diaria = eq / 26;
      if (diaria <= sc.meta) { S.retos[S.esc] = true; msg("✅ ¡Viable! Con " + eq + " al mes (" + diaria.toFixed(1) + "/día) cubrís todo. Escenario superado.", "ok"); }
      else msg(`Casi: necesitarías ${diaria.toFixed(1)} ventas/día y la meta es ${sc.meta}. Subí el precio o revisá los gastos.`, "");
      ui();
    });
    ui();
  };

  /* ═══════════ 3. ENTREVISTA: chat con la reclutadora ═══════════ */
  SIMS.entrevista = function () {
    const QS = [
      { q: "Hola, soy Andrea de Recursos Humanos 👋 Gracias por venir. Para empezar: ¿hablame un poco de vos?", a: [
        ["Bueno, nací en la aldea, mi mamá es cocinera, tengo dos perros…", 0, "Interesante, pero la pregunta va a tu perfil profesional. Menos es más."],
        ["Soy técnica en sistemas, llevo 1 año atendiendo ~35 clientes a la semana y estoy buscando crecer en soporte. Puedo aportar orden y paciencia con la gente.", 10, "¡Perfecto! Eso es una presentación de 60-90 segundos enfocada en el puesto."],
        ["Pues no sé, qué quiere saber.", 0, "La inseguridad también se escucha. Preparate tu presentación antes de entrar."]] },
      { q: "Contame de un reto que hayas superado en el trabajo o estudio.", a: [
        ["En mi trabajo anterior todo era problema porque mi jefe era bien exigente…", 0, "Regla de oro: nunca hables mal de tu jefe anterior. Mejor: la situación, tu acción y el resultado (STAR)."],
        ["Una vez se cayó el sistema en hora pico (S); yo tenía que dar soporte (T); organicé una fila con tickets y prioricé al de ventas (A); en 40 minutos estaba todo arriba y quedó un manual (R).", 10, "¡Textbook STAR! Situación, tarea, acción y resultado con número. Aplausos."],
        ["No me acuerdo de nada en este momento.", 0, "Sin ejemplos no hay evidencia. Tené 2 historias STAR siempre listas."]] },
      { q: "¿Cuál es tu mayor debilidad?", a: [
        ["Soy demasiado perfeccionista y trabajador.", 5, "La clásica trillada; los reclutadores la escuchan diario. Buscá algo real en mejora."],
        ["Me cuesta decir que no y a veces cargo con mucho: ya estoy aprendiendo a priorizar con listas y límites claros.", 10, "Bien: debilidad real + lo que ya hacés para mejorarla. Eso denota madurez."],
        ["La verdad tengo muchas pero ninguna afecta el trabajo.", 0, "Si suena a evasión, genera desconfianza. Mejor una debilidad pequeña con plan de mejora."]] },
      { q: "¿Y cuánto pretendés ganar?", a: [
        ["Lo que ustedes digan, me conformo.", 5, "Responder así te puede ir mal: o te bajan or te damos el piso del rango."],
        ["Investigué el mercado: para este puesto en Guatemala el rango va de Q4,500 a Q6,000; según mi experiencia estoy abierto a conversar cerca de la parte media.", 10, "¡Así se negocia! Con datos del mercado, flexible pero informado."],
        ["Q10,000 mínimo, tengo muchas deudas.", 0, "Un número sin investigar y con drama personal = descarte silencioso."]] },
      { q: "Última: ¿alguna pregunta para nosotros?", a: [
        ["No, todo claro, gracias.", 5, "Perdiste la chance de mostrar interés. Siempre llevá 1-2 preguntas preparadas."],
        ["¿Cómo se mide el éxito en este puesto a los 3 meses?", 10, "Pregunta estratégica que denota profesionalismo. Cerrá siempre así."],
        ["¿Cuántos días de vacaciones hay y cuánto pagan horas extra?", 0, "Legítimo pero prematuro: eso se conversa con la oferta, no en la primera entrevista."]] },
    ];
    let st = saved.e || { i: 0, pts: 0, hecho: false };
    host.innerHTML = `<h3>💼 Entrevista con Andrea (RRHH)</h3><div class="chat" data-chat></div><div class="opts" data-opts></div>
      <div class="msim__kpi"><span>Puntaje: <b data-pts>0</b></span><span>Meta: <b>70+ para quedar contratado/a</b></span></div>
      <button class="btn btn--ghost" data-restart>↺ Repetir entrevista</button>`;
    const chat = $("[data-chat]"), opts = $("[data-opts]");
    const bub = (html10, cls) => { const d = document.createElement("div"); d.className = "bub " + cls; d.innerHTML = html10; chat.appendChild(d); chat.scrollTop = 1e9; return d; };
    function reiniciar() { st = { i: 0, pts: 0, hecho: false }; chat.innerHTML = ""; opts.innerHTML = ""; save({ e: st }); preguntar(); }
    function preguntar() {
      if (st.i >= QS.length) return final();
      const q = QS[st.i];
      setTimeout(() => bub("👩‍💼 <strong>Andrea:</strong> " + esc(q.q), "bub--r"), 350);
      const orden = q.a.map((a, i) => i).sort(() => Math.random() - 0.5);
      opts.innerHTML = "";
      orden.forEach((ix) => {
        const b = document.createElement("button");
        b.textContent = q.a[ix][0];
        b.onclick = () => {
          const [txt, pts, fb] = q.a[ix];
          bub("🧑 <strong>Vos:</strong> " + esc(txt), "bub--y");
          bub((pts >= 10 ? "✅ " : pts ? "🟡 " : "⚠️ ") + esc(fb), "bub--fb");
          st.pts += pts; st.i++;
          $("[data-pts]").textContent = st.pts;
          save({ e: st });
          opts.innerHTML = "";
          preguntar();
        };
        opts.appendChild(b);
      });
    }
    function final() {
      const nota = st.pts * 2;
      if (nota >= 70) { bub(`👩‍💼 <strong>Andrea:</strong> Me encantó tu preparación. Bienvenido/a al equipo: <strong>quedaste contratado/a</strong> 🎉 (${nota} pts)`, "bub--r"); st.hecho = true; save({ e: st }); finish(nota); }
      else bub(`👩‍💼 <strong>Andrea:</strong> Gracias por participar; por ahora no (${nota} pts). Repasá las respuestas que te marqué y volvé a intentar — cada intento te entrena de verdad.`, "bub--r");
      opts.innerHTML = "";
    }
    $("[data-restart]").onclick = reiniciar;
    if (st.i > 0 && !st.hecho) reiniciar(); else { $("[data-pts]").textContent = st.pts; if (st.hecho) { bub("Ya completaste esta entrevista 🎉. Podés repetirla para seguir practicando.", "bub--r"); } else preguntar(); }
  };

  /* ═══════════ 4. ARCHIVOS: ordenar el escritorio ═══════════ */
  SIMS.archivos = function () {
    const FOLDER = { doc: "📁 Documentos", img: "🖼️ Imágenes", vid: "🎬 Videos", app: "⚙️ Programas (instaladores)" };
    const FILES = [
      ["factura-agosto.pdf", "📄", "doc"], ["facturas", "📋", "doc"], ["logo-del-negocio.png", "🖼️", "img"],
      ["foto-familia.jpg", "📷", "img"], ["tutorial-arduino.mp4", "🎬", "vid"], ["video-pedido.mp4", "📹", "vid"],
      ["setup-antivirus.exe", "⚙️", "app"], ["instalador-chrome.exe", "💾", "app"],
      ["boleta.xlsx", "📊", "doc"], ["presentacion-final.pptx", "📽️", "doc"]];
    let ok = saved.a || [];
    host.innerHTML = `<h3>🗂️ El escritorio bombardeado</h3>
      <p style="font-size:13.5px;color:#57503f">Arrastrá (o tocá y luego tocá la carpeta) cada archivo a donde pertenece. Mal puesto = se te explica.</p>
      <div style="display:flex;flex-wrap:wrap;gap:7px;padding:10px;background:#eef0f4;border-radius:12px" data-band></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:12px">${Object.entries(FOLDER).map(([k, n]) => `<div class="fzone" data-f="${k}"><h5>${n}</h5></div>`).join("")}</div>
      <div class="msim__kpi"><span>Archivos ordenados: <b data-n>0/10</b></span></div>`;
    const band = $("[data-band]");
    let dragId = null, sel = null;
    FILES.forEach((f, i) => {
      if (ok.includes(i)) return;
      const c = document.createElement("span");
      c.className = "fchip"; c.draggable = true; c.dataset.i = i; c.id = "fc" + i;
      c.innerHTML = f[1] + " " + esc(f[0]);
      c.addEventListener("dragstart", () => (dragId = i));
      c.addEventListener("click", () => { sel = i; msg("Archivo «" + f[0] + "» seleccionado: ahora tocá la carpeta donde va."); });
      band.appendChild(c);
    });
    $$("[data-f]").forEach((z) => {
      z.addEventListener("dragover", (e) => { e.preventDefault(); z.classList.add("over"); });
      z.addEventListener("dragleave", () => z.classList.remove("over"));
      const soltar = (i) => {
        if (i == null) return;
        const f = FILES[i], debe = z.dataset.f;
        if (f[2] === debe) {
          if (!ok.includes(i)) ok.push(i);
          const chip = document.getElementById("fc" + i) || $("[data-f='" + debe + "']").querySelector("[data-i='" + i + "']");
          if (chip) { chip.classList.add("ok"); chip.draggable = false; chip.style.cursor = "default"; }
          z.appendChild(chip || Object.assign(document.createElement("span"), { className: "fchip ok", innerHTML: f[1] + " " + esc(f[0]) }));
          msg("✅ «" + f[0] + "» bien ubicado.", "ok");
          $("[data-n]").textContent = ok.length + "/10";
          save({ a: ok });
          if (ok.length === 10) finish(100);
        } else {
          msg("❌ «" + f[0] + "» no va ahí. " + (f[0].endsWith(".pdf") || f[0].endsWith(".xlsx") || f[0].endsWith(".pptx") ? "Es un documento de trabajo." : f[2] === "img" ? "Es una foto/imagen." : f[2] === "vid" ? "Es un video." : "Es un instalador de programa."), "err");
        }
        sel = null; z.classList.remove("over");
      };
      z.addEventListener("drop", (e) => { e.preventDefault(); soltar(dragId); dragId = null; });
      z.addEventListener("click", () => { if (sel != null) soltar(sel); });
    });
    /* restaurar ya ordenados */
    ok.forEach((i) => { const f = FILES[i]; const s = document.createElement("span"); s.className = "fchip ok"; s.innerHTML = f[1] + " " + esc(f[0]); s.style.cursor = "default"; $("[data-f='" + f[2] + "']").appendChild(s); });
    $("[data-n]").textContent = ok.length + "/10";
  };

  /* ═══════════ 5. EXCEL: fórmulas en una mini-hoja ═══════════ */
  SIMS.excel = function () {
    const COLS = "ABCD", ROWS = 7;
    /* datos base: productos de la tienda */
    const base = { A1: "Producto", B1: "Precio", C1: "Unidades", D1: "Total", A2: "Tortillas (docena)", B2: 12, C2: 40, A3: "Frijol (libra)", B3: 9, C3: 25, A4: "Café (libra)", B4: 60, C4: 6, A6: "TOTAL DEL DÍA", A7: "IVA (12%)" };
    let cells = Object.assign({}, saved.x || {});
    host.innerHTML = `<h3>📊 La tienda del barrio (fórmulas reales)</h3>
      <div class="msim__lay"><div style="overflow-x:auto"><table class="grid"><thead><tr><th></th>${COLS.split("").map((c) => "<th>" + c + "</th>").join("")}</tr></thead><tbody data-tb></tbody></table></div>
      <div><ul class="msim__retos" data-retos></ul>
      <p style="font-size:12.5px;color:#8a8067">Podés escribir fórmulas con <code>=</code>: sumas de rango <code>=SUMA(D2:D5)</code>, promedios, multiplicaciones de celdas <code>=B2*C2</code> y números. Enter para probar.</p>
      <div class="msim__kpi"><span>Celda activa: <b data-cel>—</b></span></div></div></div>`;
    const RETOS = [
      { t: "Reto 1 · en D2 escribí el total de la fila 2 (¡precio × unidades!)", celda: "D2", quiere: 12 * 40 },
      { t: "Reto 2 · en D3 y D4 hacé lo mismo con sus filas", celda: "D3:D4", quiere: [9 * 25, 60 * 6] },
      { t: "Reto 3 · en D6 sumá la columna del total (SUMA)", celda: "D6", quiere: 12 * 40 + 9 * 25 + 60 * 6 },
      { t: "Reto 4 · en D7 calculá el IVA del 12 % sobre el total", celda: "D7", quiere: (12 * 40 + 9 * 25 + 60 * 6) * 0.12 },
    ];
    let resueltos = saved.xr || [false, false, false, false];
    /* resolver referencias y rangos (si la celda guarda una fórmula, la evalúa) */
    function refVal(ref, seen) {
      const v = cells[ref] ?? base[ref];
      if (typeof v === "string" && v.startsWith("=")) {
        const cad = seen || "";
        if (cad.split("|").includes(ref)) return 0; /* ciclo (A1=A1) */
        const r = evalF(v.slice(1), cad + "|" + ref);
        return r == null ? 0 : r;
      }
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    }
    function evalF(f, seen) {
      f = f.replace(/\s+/g, "").toUpperCase();
      f = f.replace(/SUMA\(([A-D])(\d):([A-D])(\d)\)/g, (m, c1, r1, c2, r2) => { let s = 0; for (let c = c1.charCodeAt(0); c <= c2.charCodeAt(0); c++) for (let r = +r1; r <= +r2; r++) s += refVal(String.fromCharCode(c) + r, seen); return s; });
      f = f.replace(/PROMEDIO\(([A-D])(\d):([A-D])(\d)\)/g, (m, c1, r1, c2, r2) => { let s = 0, n = 0; for (let c = c1.charCodeAt(0); c <= c2.charCodeAt(0); c++) for (let r = +r1; r <= +r2; r++) { s += refVal(String.fromCharCode(c) + r, seen); n++; } return n ? s / n : 0; });
      f = f.replace(/\b([A-D][1-9])\b/g, (m) => refVal(m, seen));
      if (!/^[\d+\-*/().]+$/.test(f)) return null;
      try { const v = Function("return (" + f + ")")(); return isFinite(v) ? v : null; } catch (e) { return null; }
    }
    const tb = $("[data-tb]");
    for (let r = 1; r <= ROWS; r++) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<th>${r}</th>`;
      COLS.split("").forEach((c) => {
        const key = c + r, td = document.createElement("td");
        const readonly = r === 1 || c === "A";
        const show = cells[key] != null ? cells[key] : (base[key] != null ? base[key] : "");
        td.innerHTML = `<input data-k="${key}" ${readonly ? "disabled" : ""} class="${typeof show === "number" ? "" : "txt"}" value="${esc(show)}" placeholder="">`;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    }
    function marcarRetos() {
      resueltos[0] = Math.abs(refVal("D2") - 12 * 40) < 0.01 && String(cells.D2 || "").startsWith("=");
      resueltos[1] = Math.abs(refVal("D3") - 9 * 25) < 0.01 && Math.abs(refVal("D4") - 60 * 6) < 0.01 && String(cells.D3 || "").startsWith("=") && String(cells.D4 || "").startsWith("=");
      resueltos[2] = Math.abs(refVal("D6") - (480 + 225 + 360)) < 0.01 && /SUMA/i.test(String(cells.D6 || ""));
      const tot = 480 + 225 + 360;
      resueltos[3] = Math.abs(refVal("D7") - tot * 0.12) < 0.01 && String(cells.D7 || "").startsWith("=");
      $("[data-retos]").innerHTML = RETOS.map((r, i) => `<li class="${resueltos[i] ? "ok" : ""}">${esc(r.t)}</li>`).join("");
      if (resueltos.every(Boolean)) finish(100);
    }
    $$("input", tb).forEach((inp) => {
      inp.addEventListener("focus", () => { $("[data-cel]").textContent = inp.dataset.k; });
      inp.addEventListener("change", () => {
        const v = inp.value.trim(), k = inp.dataset.k;
        if (v.startsWith("=")) {
          const r = evalF(v.slice(1));
          if (r == null) { msg("⚠️ Esa fórmula no la entiendo. Revisá: refs como A1, rangos A1:B2, SUMA(), y operadores + − * /.", "err"); inp.value = cells[k] ?? ""; return; }
          cells[k] = v;
          inp.value = (+r.toFixed(4)).toLocaleString("es-GT");
          msg("✅ Fórmula calculada: " + (+r.toFixed(2)).toLocaleString("es-GT"), "ok");
        } else if (v === "") { delete cells[k]; inp.value = ""; }
        else cells[k] = v;
        save({ x: cells });
        marcarRetos();
      });
    });
    marcarRetos();
  };

  /* ═══════════ 6. CODIGO: editor en vivo (HTML/CSS/JS) ═══════════ */
  SIMS.codigo = function () {
    const DEF = {
      html: '<h1>Cambiale mi nombre</h1>\n<p>Aquí va la descripción de tu negocio.</p>\n<button>Contacto</button>',
      css: 'body { font-family: Arial; padding: 16px; background: #faf5ea; }\n/* h1 { color: ... } */',
      js: '// seleccioná el botón y asignale un mensaje al hacer clic\n',
    };
    const S = saved.c || { tab: "html", sel: { html: DEF.html, css: DEF.css, js: DEF.js }, retos: [false, false, false] };
    host.innerHTML = `<h3>🧑‍💻 Editor en vivo (como el de los pros)</h3>
      <div class="msim__lay"><div><div class="tabs" data-tabs></div><textarea class="code" data-code spellcheck="false"></textarea>
      <button class="btn" data-ver>▶ Probar código</button></div>
      <div><iframe data-pv sandbox="allow-scripts" style="width:100%;height:230px;border:1.5px solid #d8d0bd;border-radius:10px;background:#fff"></iframe>
      <ul class="msim__retos" data-retos></ul></div></div>`;
    const tabsEl = $("[data-tabs]"), code = $("[data-code]"), pv = $("[data-pv]");
    const TABS = [["html", "index.html"], ["css", "estilos.css"], ["js", "script.js"]];
    function pintarTabs() {
      tabsEl.innerHTML = TABS.map(([k, n]) => `<button class="${S.tab === k ? "on" : ""}" data-t="${k}">${n}</button>`).join("");
      $$("[data-t]", tabsEl).forEach((b) => (b.onclick = () => { S.sel[S.tab] = code.value; S.tab = b.dataset.t; save({ c: S }); pintarTabs(); code.value = S.sel[S.tab]; }));
    }
    function render() {
      pv.srcdoc = "<!DOCTYPE html><html><head><style>" + S.sel.css + "</style></head><body>" + S.sel.html + "<script>" + S.sel.js + "<\/script></body></html>";
    }
    function test() {
      S.sel[S.tab] = code.value;
      render();
      save({ c: S });
      setTimeout(() => {
        /* Nota: el iframe va en sandbox estricto, así que validamos el código escrito, no su DOM. */
        const mh1 = S.sel.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        S.retos[0] = !!(mh1 && mh1[1].replace(/<[^>]+>/g, "").trim().length >= 4 && mh1[1].replace(/<[^>]+>/g, "").trim() !== "Cambiale mi nombre");
        const mc = S.sel.css.match(/h1[^{}]*\{[^}]*\bcolor\s*:\s*([^;}]+)/i);
        const col = mc ? mc[1].trim().toLowerCase().replace(/\s+/g, "") : "";
        S.retos[1] = !!col && !(col === "black" || col === "#000" || col === "#000000" || col === "rgb(0,0,0)");
        const hayBtn = /<button[\s>]/i.test(S.sel.html);
        S.retos[2] = hayBtn && /(addEventListener|on\w*\s*=)/.test(S.sel.js) && /(alert\s*\(|textContent|innerText|innerHTML)/.test(S.sel.js);
        $("[data-retos]").innerHTML = [
          ["El <h1> tiene el nombre de tu negocio o proyecto", 0],
          ["El <h1> tiene color propio desde CSS (no negro por defecto)", 1],
          ["Hay un botón con una acción (alert o cambio de texto al hacer clic)", 2],
        ].map(([t, i]) => `<li class="${S.retos[i] ? "ok" : ""}">${t}</li>`).join("");
        if (S.retos.every(Boolean)) finish(100);
        else msg("Mirá los retos: el que falte ajustalo en la pestaña que corresponde y volvé a pulsar «Probar código».");
      }, 250);
    }
    $("[data-ver]").onclick = test;
    code.value = S.sel[S.tab];
    pintarTabs();
    render();
  };

  /* ═══════════ 7. DISENO: la regla 60-30-10 con paleta real ═══════════ */
  SIMS.diseno = function () {
    const COLORES = [
      ["Marfil", "#f2ead8"], ["Blanco", "#ffffff"], ["Gris perla", "#e5e7eb"], ["Durazno", "#ffd8b5"],
      ["Azul marino", "#1e3a5f"], ["Azul acero", "#3b82f6"], ["Teal", "#0d9488"], ["Verde bosque", "#166534"],
      ["Rojo profundo", "#b91c1c"], ["Rosa coral", "#f472b6"], ["Naranja", "#ea8600"], ["Amarillo sol", "#facc15"],
      ["Morado", "#7c3aed"], ["Café", "#6d4c2f"], ["Negro tinta", "#1f2937"]];
    let S = saved.d || { fondo: null, secundario: null, acento: null, rol: "fondo", hecho: false };
    host.innerHTML = `<h3>🎨 Tu afiche paso a paso (60-30-10)</h3>
      <div class="msim__lay"><div><div data-flyer></div></div>
      <div><p style="font-size:13px;color:#57503f">1) Elegí el rol y 2) tocá un color. La regla 60-30-10: la mayoría de fondo, una parte de color medio y solo un toque de acento fuerte.</p>
      <div class="role" data-rol="fondo"><span class="dot" data-dot="fondo"></span> 60 % · Fondo del afiche</div>
      <div class="role" data-rol="secundario"><span class="dot" data-dot="secundario"></span> 30 % · Bloques, banners</div>
      <div class="role" data-rol="acento"><span class="dot" data-dot="acento"></span> 10 % · Precio y botón (¡lo más llamativo!)</div>
      <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:10px" data-sws></div>
      <ul class="msim__retos" data-retos></ul></div></div>`;
    const FL = $("[data-flyer]");
    function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    function lum(hex) { const [r, g, b] = hex2rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
    function contraste(a, b) { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
    function sat(h) { const [r, g, b] = hex2rgb(h); return Math.max(r, g, b) - Math.min(r, g, b); }
    function draw() {
      const { fondo, secundario, acento } = S;
      FL.innerHTML = `<div style="background:${fondo || "#efe9da"};border:1.5px solid #d8d0bd;border-radius:12px;padding:16px;min-height:300px;display:flex;flex-direction:column">
        <div style="background:${secundario || "#ddd4c0"};border-radius:9px;padding:12px;margin-bottom:10px;flex:1">
          <h4 style="margin:0 0 6px;font-size:16px;color:${contraste(fondo || "#efe9da", acento || "#1f2937") >= 4.5 ? (acento || "#1f2937") : "#000"}">🛒 Venta de fin de mes</h4>
          <p style="margin:0;font-size:12.5px;color:${fondo && contraste(fondo, "#1f2937") < 4.5 ? "#7a7a7a" : "#1f2937"};opacity:.85">Todo con descuento de la tienda de tu barrio.</p>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:22px;font-weight:800;color:${acento || "#00756f"}">Q49.00</span>
          <span style="background:${acento || "#00756f"};color:${contraste(acento || "#00756f", "#ffffff") >= 3 ? "#fff" : "#1f2937"};padding:7px 16px;border-radius:999px;font-size:13px;font-weight:700">Comprar ahora</span>
        </div></div>`;
      /* checks */
      const falta = !fondo || !secundario || !acento;
      const difs = !falta && fondo !== secundario && secundario !== acento && fondo !== acento;
      const ctxOk = !falta && contraste(fondo, acento) >= 4.5;
      const acFuerte = !falta && sat(acento) >= 90;
      const retos = [
        "Elegiste 3 colores distintos (fondo, medio, acento)",
        "El precio y el botón contrastan con el fondo (se leen de lejos)",
        "El ACENTO es el color más fuerte/llamativo de los 3",
      ];
      const oks = [difs, ctxOk, acFuerte];
      $("[data-retos]").innerHTML = retos.map((t, i) => `<li class="${oks[i] ? "ok" : ""}">${t}</li>`).join("");
      ["fondo", "secundario", "acento"].forEach((r) => { $("[data-dot='" + r + "']").style.background = S[r] || "#fff"; });
      save({ d: S });
      if (!falta && oks.every(Boolean)) finish(100);
    }
    $$("[data-rol]").forEach((r) => r.addEventListener("click", () => { S.rol = r.dataset.rol; draw(); msg("Ahora tocá un color para: " + S.rol); }));
    const sws = $("[data-sws]");
    COLORES.forEach(([n, h]) => {
      const b = document.createElement("button");
      b.className = "sw"; b.style.background = h; b.title = n;
      b.onclick = () => { S[S.rol] = h; draw(); };
      sws.appendChild(b);
    });
    draw();
  };

  /* ═══════════ 8. BUSQUEDA: googleá como pro ═══════════ */
  SIMS.busqueda = function () {
    const MISIONES = [
      { t: "Encontrá el reglamento de tránsito DE GUATEMALA en PDF oficial", must: [["filetype:", ["filetype:pdf"], 2], ["site:", ["site:"], 2], ["palabra clave", ["reglamento", "transito"], 1]] },
      { t: "Buscá ideas de «fotografía con celular» pero SIN resultados de Pinterest ni TikTok", must: [["exclusiones", ["-pinterest"], 2], ["frase exacta", ['"'], 2], ["palabra clave", ["fotografia"], 1]] },
      { t: "Precio de una «arduino uno» SOLO en tiendas de Guatemala (.gt)", must: [["frase exacta", ['"'], 2], ["sitio/país", ["site:.gt", ".gt"], 2], ["palabra clave", ["arduino"], 1]] },
      { t: "El Código de Trabajo oficial en PDF del MINTRAB", must: [["site:", ["site:mintrab.gob.gt", "site:gob.gt"], 2], ["filetype", ["filetype:pdf"], 2], ["palabra clave", ["codigo"], 1]] },
      { t: "Una plantilla de presupuesto GRATIS en Excel (xlsx)", must: [["filetype", ["filetype:xlsx", "filetype:xls"], 2], ["palabra clave", ["presupuesto"], 1], ["gratis", ["gratis"], 1]] },
    ];
    let res = saved.b || [false, false, false, false, false];
    let mi = 0;
    host.innerHTML = `<h3>🔎 El buscador «como pro»</h3>
      <p style="font-size:13px;color:#57503f" data-mis></p>
      <input type="text" data-q placeholder="Escribí acá tu búsqueda de Google…">
      <button class="btn" data-go>Buscar</button>
      <div class="msim__kpi" style="margin-top:10px"><span>Misiones: <b data-n>0/5</b></span></div>
      <ul class="msim__retos" data-retos></ul>
      <p style="font-size:12px;color:#8a8067;margin-top:10px">Operadores disponibles: comillas «para frase exacta», guion -excluir, site:para buscar en un sitio, filetype:pdf/xlsx para formato.</p>`;
    function pintar() {
      $("[data-mis]").innerHTML = "<strong>Misión " + (mi + 1) + " de 5:</strong> " + esc(MISIONES[mi].t);
      $("[data-n]").textContent = res.filter(Boolean).length + "/5";
      $("[data-retos]").innerHTML = MISIONES.map((m, i) => `<li class="${res[i] ? "ok" : ""}">${i + 1}. ${esc(m.t)}</li>`).join("");
      $("[data-q]").value = "";
    }
    $("[data-go]").onclick = () => {
      const q = $("[data-q]").value.toLowerCase().trim();
      if (!q) return;
      let pts = 0, falta = [];
      MISIONES[mi].must.forEach(([label, keys, p]) => {
        if (keys.some((k) => q.includes(k))) pts += p; else falta.push(label);
      });
      const listo = pts >= MISIONES[mi].must.reduce((a, m) => a + m[2], 0) - 1;
      if (listo) { res[mi] = true; save({ b: res }); msg("✅ ¡Misión lograda con " + pts + " puntos! Esa búsqueda llegaría justo a la respuesta.", "ok"); } 
      else msg("Todavía no: te falta usar " + falta.join(", ") + ". Mirá la ayuda de abajo.", "");
      if (res.filter(Boolean).length >= 5) { pintar(); return finish(100); }
      mi = res.indexOf(false);
      if (listo) setTimeout(pintar, 1200); else pintar();
    };
    if (res.filter(Boolean).length >= 5) { finish(100); return; }
    mi = res.indexOf(false);
    pintar();
  };

  /* arranque del simulador pedido */
  if (SIMS[CLAVE]) SIMS[CLAVE]();
  else { const p = document.createElement("p"); p.textContent = "Este simulador no está disponible."; host.appendChild(p); host.style.opacity = ".6"; }

  /* animación de la cámara */
  const clockEl = document.createElement("div");
  clockEl.style.display = "none";
  host.appendChild(clockEl);
  (function loop() {
    if (host._frame) host._frame(performance.now());
    requestAnimationFrame(loop);
  })();
})();
