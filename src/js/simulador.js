/* TechRevive · Simuladores del aula: armado de PC y mantenimiento de laptop.
   Se activa en las lecciones de tipo «Simulador» (<div class="sim" data-sim="pc|laptop">).
   Funciona con mouse (arrastrar o clic) y en celular (tocar la pieza y luego el lugar). */
(function () {
  "use strict";
  var root = document.querySelector(".sim[data-sim]");
  if (!root) return;
  var KIND = root.getAttribute("data-sim") === "laptop" ? "laptop" : "pc";
  var MIN = Number(root.getAttribute("data-min") || 70);
  var KEY = (document.querySelector("[data-lesson]") || root).getAttribute("data-lesson") || "sim-" + KIND;
  var NS = "http://www.w3.org/2000/svg";

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function $(s, el) { return (el || root).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem("tr-sim:" + k) || "null"); localStorage.setItem("tr-sim:" + k, JSON.stringify(v)); } catch (e) { return null; } }

  /* ───────────── Íconos de las piezas (miniaturas) ───────────── */
  var ICO = {
    standoffs: '<circle cx="14" cy="14" r="6" fill="#d4a017"/><circle cx="34" cy="14" r="6" fill="#d4a017"/><circle cx="14" cy="34" r="6" fill="#d4a017"/><circle cx="34" cy="34" r="6" fill="#d4a017"/><circle cx="14" cy="14" r="2.4" fill="#7a5c00"/><circle cx="34" cy="14" r="2.4" fill="#7a5c00"/><circle cx="14" cy="34" r="2.4" fill="#7a5c00"/><circle cx="34" cy="34" r="2.4" fill="#7a5c00"/>',
    board: '<rect x="4" y="4" width="40" height="40" rx="3" fill="#1b2b44"/><rect x="16" y="9" width="12" height="12" fill="#cbd5e1"/><rect x="33" y="8" width="3" height="20" fill="#64748b"/><rect x="38" y="8" width="3" height="20" fill="#64748b"/><rect x="8" y="30" width="30" height="3" fill="#475569"/>',
    cpu: '<rect x="8" y="8" width="32" height="32" rx="3" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/><rect x="15" y="15" width="18" height="18" rx="2" fill="#e2e8f0"/><path d="M10 40l3-3" stroke="#d4a017" stroke-width="3"/>',
    cooler: '<rect x="5" y="5" width="38" height="38" rx="6" fill="#1e293b"/><circle cx="24" cy="24" r="14" fill="#334155"/><path d="M24 24l8-9M24 24l9 8M24 24l-8 9M24 24l-9-8" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="24" r="4" fill="#60a5fa"/>',
    ram: '<rect x="4" y="16" width="40" height="14" rx="1.5" fill="#2563eb"/><rect x="8" y="19" width="6" height="7" fill="#0f172a"/><rect x="17" y="19" width="6" height="7" fill="#0f172a"/><rect x="26" y="19" width="6" height="7" fill="#0f172a"/><rect x="35" y="19" width="6" height="7" fill="#0f172a"/><path d="M5 30h38" stroke="#d4a017" stroke-width="3"/>',
    sodimm: '<rect x="8" y="14" width="32" height="18" rx="1.5" fill="#16a34a"/><rect x="11" y="17" width="7" height="8" fill="#0f172a"/><rect x="21" y="17" width="7" height="8" fill="#0f172a"/><rect x="31" y="17" width="6" height="8" fill="#0f172a"/><path d="M9 32h30" stroke="#d4a017" stroke-width="3"/>',
    m2: '<rect x="3" y="18" width="42" height="11" rx="2" fill="#0f172a"/><rect x="9" y="20" width="12" height="7" fill="#475569"/><rect x="24" y="20" width="10" height="7" fill="#334155"/><path d="M3 20v7" stroke="#d4a017" stroke-width="3"/><circle cx="42" cy="23.5" r="2" fill="#94a3b8"/>',
    gpu: '<rect x="2" y="12" width="44" height="22" rx="3" fill="#1e293b"/><circle cx="15" cy="23" r="7" fill="#334155" stroke="#94a3b8"/><circle cx="33" cy="23" r="7" fill="#334155" stroke="#94a3b8"/><path d="M6 34h22" stroke="#d4a017" stroke-width="3"/>',
    psu: '<rect x="4" y="10" width="40" height="28" rx="3" fill="#111827"/><circle cx="20" cy="24" r="10" fill="none" stroke="#64748b" stroke-width="2"/><path d="M12 24h16M20 16v16" stroke="#64748b"/><rect x="33" y="14" width="7" height="5" fill="#f59e0b"/>',
    cable: '<path d="M6 40C6 20 42 28 42 8" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><rect x="34" y="3" width="12" height="9" rx="2" fill="#0f172a"/>',
    screw: '<circle cx="24" cy="16" r="9" fill="#94a3b8" stroke="#475569" stroke-width="2"/><path d="M19 16h10M24 11v10" stroke="#334155" stroke-width="2.5"/><path d="M24 25v18" stroke="#94a3b8" stroke-width="4"/>',
    screwL: '<circle cx="24" cy="10" r="8" fill="#94a3b8" stroke="#475569" stroke-width="2"/><path d="M20 10h8M24 6v8" stroke="#334155" stroke-width="2.5"/><path d="M24 18v28" stroke="#94a3b8" stroke-width="4"/>',
    driver: '<rect x="20" y="3" width="9" height="20" rx="3" fill="#2563eb"/><path d="M24.5 23v18" stroke="#94a3b8" stroke-width="3"/><path d="M22 41l2.5 5 2.5-5" fill="#94a3b8"/>',
    flat: '<rect x="20" y="3" width="9" height="20" rx="3" fill="#dc2626"/><path d="M24.5 23v20" stroke="#94a3b8" stroke-width="3"/><path d="M21 43h7" stroke="#94a3b8" stroke-width="3"/>',
    pick: '<path d="M10 38L34 8c4-3 8 1 5 5L14 42z" fill="#f59e0b"/><path d="M10 38l4 4" stroke="#b45309" stroke-width="2"/>',
    air: '<rect x="14" y="14" width="18" height="30" rx="4" fill="#38bdf8"/><rect x="18" y="6" width="10" height="9" fill="#0f172a"/><path d="M28 9h12" stroke="#0f172a" stroke-width="3"/><path d="M42 5c3 2 3 6 0 8" stroke="#94a3b8" fill="none"/>',
    strap: '<circle cx="18" cy="20" r="11" fill="none" stroke="#2563eb" stroke-width="5"/><path d="M27 26c8 6 10 12 13 16" stroke="#111827" stroke-width="3" fill="none"/><circle cx="40" cy="42" r="3" fill="#d4a017"/>',
    cover: '<rect x="5" y="9" width="38" height="30" rx="6" fill="#334155"/><circle cx="10" cy="14" r="2" fill="#94a3b8"/><circle cx="38" cy="14" r="2" fill="#94a3b8"/><circle cx="10" cy="34" r="2" fill="#94a3b8"/><circle cx="38" cy="34" r="2" fill="#94a3b8"/>',
  };
  function ico(name, color) { return '<svg viewBox="0 0 48 48" aria-hidden="true"' + (color ? ' style="color:' + color + '"' : "") + ">" + (ICO[name] || "") + "</svg>"; }

  /* ───────────── Motor común ───────────── */
  var S, SC; // estado y escenario
  var ui = {};
  function shell() {
    root.innerHTML =
      '<div class="sim__top"><div class="sim__goal"><strong>' + esc(SC.title) + "</strong><span>" + esc(SC.goal) + "</span></div>" +
      '<div class="sim__stats"><span title="Puntos"><b data-s="pts">100</b> pts</span><span title="Errores"><b data-s="err">0</b> errores</span><span title="Tiempo"><b data-s="time">0:00</b></span></div></div>' +
      '<ol class="sim__steps" aria-label="Avance"></ol>' +
      '<div class="sim__body"><div class="sim__main"><div class="sim__stage"><svg class="sim__svg" viewBox="0 0 800 560" role="img" aria-label="' + esc(SC.title) + '"></svg>' +
      '<div class="sim__overlay" hidden></div></div>' +
      '<div class="sim__msg is-info" role="status" aria-live="polite"><strong>Listo para empezar</strong><span>' + esc(SC.intro) + "</span></div>" +
      '<div class="sim__result" hidden></div></div>' +
      '<aside class="sim__tray"><div class="sim__tabs" role="tablist"></div><p class="sim__hint-sel" aria-live="polite">Elige una pieza o herramienta y luego toca dónde va.</p><div class="sim__items"></div></aside></div>' +
      '<div class="sim__bar"><button type="button" class="btn btn--primary" data-a="power">⏻ ' + esc(SC.powerLabel) + '</button>' +
      '<button type="button" class="btn btn--outline" data-a="hint">💡 Pista (−2 pts)</button>' +
      '<button type="button" class="btn btn--outline" data-a="reset">↺ Empezar de nuevo</button>' +
      '<span class="sim__best" hidden></span></div>' +
      '<details class="sim__log"><summary>Bitácora del técnico</summary><ol></ol></details>';
    ui.svg = $(".sim__svg"); ui.items = $(".sim__items"); ui.tabs = $(".sim__tabs"); ui.msg = $(".sim__msg");
    ui.steps = $(".sim__steps"); ui.overlay = $(".sim__overlay"); ui.sel = $(".sim__hint-sel"); ui.log = $(".sim__log ol"); ui.result = $(".sim__result"); ui.stage = $(".sim__stage");
    $('[data-a="power"]').addEventListener("click", function () { if (!S.finished) { SC.power(); render(); } });
    $('[data-a="hint"]').addEventListener("click", hint);
    $('[data-a="reset"]').addEventListener("click", function () { start(); });
    ui.svg.addEventListener("click", function (ev) { var t = ev.target.closest("[data-t]"); if (t) target(t.getAttribute("data-t")); });
    ui.svg.addEventListener("keydown", function (ev) { if ((ev.key === "Enter" || ev.key === " ") && ev.target.getAttribute("data-t")) { ev.preventDefault(); target(ev.target.getAttribute("data-t")); } });
    ui.items.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-i]"); if (!b || b.disabled) return;
      if (S.justDragged) { S.justDragged = false; return; }
      pick(b.getAttribute("data-i"));
    });
    ui.tabs.addEventListener("click", function (ev) { var b = ev.target.closest("[data-tab]"); if (b) { S.tab = b.getAttribute("data-tab"); S.sel = null; render(); } });
    initDrag();
    var best = store(KEY + ":best"); if (best != null) showBest(best);
  }
  function showBest(n) { var b = $(".sim__best"); b.hidden = false; b.textContent = "Tu mejor nota: " + n + "%"; }
  function start() {
    S = SC.init();
    S.pts = 100; S.errors = []; S.sel = null; S.t0 = 0; S.finished = false; S.once = {}; S.tab = SC.tabs[0].id;
    ui.overlay.hidden = true; ui.result.hidden = true; ui.log.innerHTML = "";
    say("info", "Listo para empezar", SC.intro);
    render();
  }
  function tick() {
    if (!S || !S.t0 || S.finished) return;
    var s = Math.floor((Date.now() - S.t0) / 1000);
    $('[data-s="time"]').textContent = Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
  }
  setInterval(tick, 1000);
  function begin() { if (!S.t0) S.t0 = Date.now(); }
  function log(txt, type) { var li = document.createElement("li"); li.className = "is-" + type; li.textContent = txt; ui.log.appendChild(li); }
  function say(type, title, text) {
    ui.msg.className = "sim__msg is-" + type;
    ui.msg.innerHTML = "<strong>" + esc(title) + "</strong><span>" + text + "</span>";
  }
  function ok(title, text) { say("ok", "✔ " + title, text); log(title, "ok"); }
  function info(title, text) { say("info", title, text); }
  function warn(title, text) { say("warn", "⚠ " + title, text); log(title, "warn"); }
  function err(title, text, pts, onceKey) {
    if (onceKey && S.once[onceKey]) { say("err", "✖ " + title, text); return; }
    if (onceKey) S.once[onceKey] = 1;
    S.pts = Math.max(0, S.pts - pts); S.errors.push({ t: title, p: pts });
    say("err", "✖ " + title + " (−" + pts + " pts)", text); log(title + " (−" + pts + ")", "err");
    root.classList.remove("is-shake"); void root.offsetWidth; root.classList.add("is-shake");
    stats();
  }
  function stats() { $('[data-s="pts"]').textContent = S.pts; $('[data-s="err"]').textContent = S.errors.length; }
  function pick(id) {
    begin();
    var it = SC.item(id); if (!it) return;
    if (it.action) { S.sel = null; it.action(); render(); return; }
    S.sel = S.sel === id ? null : id;
    render();
    if (S.sel && window.innerWidth < 980) {
      var r = ui.stage.getBoundingClientRect();
      if (r.top < 60 || r.bottom > window.innerHeight) ui.stage.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  function target(t) {
    begin();
    if (S.finished) return;
    var id = S.sel;
    SC.drop(t, id);
    if (S.sel && !SC.item(S.sel)) S.sel = null;
    render();
  }
  function hint() {
    if (S.finished) return;
    var h = SC.hint();
    S.pts = Math.max(0, S.pts - 2); stats(); log("Pista usada (−2)", "warn");
    say("info", "💡 Pista", h);
  }
  function render() {
    stats();
    // pasos
    ui.steps.innerHTML = SC.steps().map(function (s) { return '<li class="' + (s[1] ? "is-done" : "") + '">' + esc(s[0]) + "</li>"; }).join("");
    // pestañas
    ui.tabs.innerHTML = SC.tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t.id + '" aria-selected="' + (S.tab === t.id) + '">' + esc(t.label) + "</button>"; }).join("");
    // piezas
    var list = SC.items(S.tab);
    ui.items.innerHTML = list.length ? list.map(function (it) {
      return '<button type="button" class="sim__item' + (S.sel === it.id ? " is-sel" : "") + (it.bad ? " is-bad" : "") + '" data-i="' + it.id + '"' + (it.bad ? " disabled" : "") + ">" +
        ico(it.ico, it.color) + '<span><strong>' + esc(it.name) + "</strong><small>" + esc(it.bad || it.sub || "") + "</small></span>" + (it.count > 1 ? '<em>×' + it.count + "</em>" : "") + "</button>";
    }).join("") : '<p class="sim__empty">' + esc(SC.emptyText(S.tab)) + "</p>";
    var sel = S.sel && SC.item(S.sel);
    ui.sel.textContent = sel ? "Seleccionaste: " + sel.name + ". Ahora toca o arrastra al lugar donde va." : "Elige una pieza o herramienta y luego toca dónde va. Toca una pieza instalada (sin nada seleccionado) para retirarla.";
    root.classList.toggle("is-armed", !!sel);
    // escena
    var spots = SC.spots();
    ui.svg.innerHTML = SC.draw() + spots.map(function (h) {
      return '<rect class="sim__spot' + (h.open ? " is-open" : "") + '" data-t="' + h.id + '" x="' + h.x + '" y="' + h.y + '" width="' + h.w + '" height="' + h.h + '" rx="' + (h.r || 6) + '" tabindex="0" role="button" aria-label="' + esc(h.label) + '"><title>' + esc(h.label) + "</title></rect>";
    }).join("");
  }
  /* arrastrar con mouse (en pantallas táctiles se usa tocar → tocar) */
  function initDrag() {
    var drag = null;
    ui.items.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType !== "mouse" || ev.button !== 0) return;
      var b = ev.target.closest("[data-i]"); if (!b || b.disabled) return;
      drag = { id: b.getAttribute("data-i"), x: ev.clientX, y: ev.clientY, el: null, src: b };
    });
    window.addEventListener("pointermove", function (ev) {
      if (!drag) return;
      if (!drag.el) {
        if (Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) < 8) return;
        var it = SC.item(drag.id); if (!it || it.action) { drag = null; return; }
        S.sel = drag.id; render();
        drag.el = document.createElement("div"); drag.el.className = "sim__ghost"; drag.el.innerHTML = ico(it.ico, it.color);
        document.body.appendChild(drag.el); document.body.classList.add("sim-dragging");
      }
      drag.el.style.transform = "translate(" + (ev.clientX - 28) + "px," + (ev.clientY - 28) + "px)";
      $$(".sim__spot.is-hover").forEach(function (s) { s.classList.remove("is-hover"); });
      var under = document.elementFromPoint(ev.clientX, ev.clientY), t = under && under.closest && under.closest("[data-t]");
      if (t) t.classList.add("is-hover");
    });
    window.addEventListener("pointerup", function (ev) {
      if (!drag) return;
      var d = drag; drag = null;
      if (!d.el) return;
      d.el.remove(); document.body.classList.remove("sim-dragging"); S.justDragged = true;
      setTimeout(function () { S.justDragged = false; }, 50);
      var under = document.elementFromPoint(ev.clientX, ev.clientY), t = under && under.closest && under.closest("[data-t]");
      if (t) target(t.getAttribute("data-t")); else { S.sel = null; render(); }
    });
  }
  function overlay(html) { ui.overlay.innerHTML = html; ui.overlay.hidden = false; }
  function ask(q, opts, cb) {
    var order = opts.map(function (_, i) { return i; }).sort(function () { return Math.random() - .5; }); // opciones en orden aleatorio
    overlay('<div class="sim__ask"><p>' + esc(q) + "</p>" + order.map(function (i) { return '<button type="button" class="btn btn--outline" data-o="' + i + '">' + esc(opts[i]) + "</button>"; }).join("") + "</div>");
    $$("[data-o]", ui.overlay).forEach(function (b) { b.addEventListener("click", function () { ui.overlay.hidden = true; cb(Number(b.getAttribute("data-o"))); render(); }); });
  }
  function finish(lines) {
    S.finished = true; tick();
    var nota = S.pts, pass = nota >= MIN;
    var best = Math.max(store(KEY + ":best") || 0, nota); store(KEY + ":best", best); showBest(best);
    var secs = Math.floor((Date.now() - (S.t0 || Date.now())) / 1000);
    var errs = S.errors.length ? "<ul>" + S.errors.map(function (e) { return "<li>" + esc(e.t) + " <b>−" + e.p + "</b></li>"; }).join("") + "</ul>" : "<p>¡Sin errores! Trabajo de técnico profesional. 🏆</p>";
    overlay('<div class="sim__bios-scr"><p class="sim__bios-h">TechRevive BIOS · POST</p>' + lines.map(function (l) { return "<p>" + l + "</p>"; }).join("") + '<p class="sim__bios-ok">' + esc(SC.successLine) + "</p></div>");
    ui.result.className = "sim__result " + (pass ? "is-pass" : "is-fail"); ui.result.hidden = false;
    ui.result.innerHTML = '<div class="sim__res-head"><p class="sim__res-n">' + nota + '%</p><div><p><strong>' + (pass ? "¡Aprobaste el simulador! La lección quedó completada." : "Necesitas " + MIN + "% para aprobar. Repasa los errores y vuelve a intentarlo.") +
      "</strong></p><p class=\"sim__res-t\">Tiempo: " + Math.floor(secs / 60) + " min " + (secs % 60) + " s · Errores: " + S.errors.length + "</p></div>" +
      '<button type="button" class="btn btn--primary" data-a="again">↺ Repetir para mejorar</button></div>' + errs;
    $('[data-a="again"]', ui.result).addEventListener("click", start);
    say(pass ? "ok" : "warn", pass ? "✔ ¡Equipo funcionando!" : "Equipo funcionando, pero con demasiados errores", pass ? "Terminaste el trabajo. Revisa tu nota abajo." : "Mira abajo qué errores restaron puntos y vuelve a intentarlo.");
    ui.result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    log("Simulador terminado con " + nota + "%", pass ? "ok" : "warn");
    if (pass) document.dispatchEvent(new CustomEvent("aula:sim-done", { detail: { nota: nota } }));
  }

  /* ═════════════ Escenario 1: ARMADO DE PC ═════════════ */
  var PC = {
    title: "Simulador: arma una PC de escritorio",
    goal: "Instala las piezas compatibles, conecta los cables de la fuente y enciéndela.",
    intro: "La placa madre es <b>AM5 con memoria DDR5</b>. Ojo: en la bandeja hay piezas que <b>no son compatibles</b>. Puedes encender cuando quieras para ver qué síntoma da.",
    powerLabel: "Encender",
    successLine: "✔ POST correcto · 1 pitido corto · Listo para instalar Windows",
    tabs: [{ id: "p", label: "Piezas" }, { id: "c", label: "Cables de la fuente" }],
    PARTS: {
      standoffs: { name: "Separadores (standoffs)", sub: "Juego de 9, para el gabinete", ico: "standoffs", to: "standoffs" },
      board: { name: "Placa madre B650", sub: "Socket AM5 · DDR5 · ATX", ico: "board", to: "board" },
      cpu: { name: "AMD Ryzen 5 7600", sub: "Socket AM5 · 65 W", ico: "cpu", to: "socket" },
      cpu_bad: { name: "Intel Core i5-14400", sub: "Socket LGA1700 · 65 W", ico: "cpu", to: "socket", wrong: ["Procesador incompatible", "La placa es <b>AM5</b> y este procesador es <b>LGA1700</b>: el socket debe coincidir. Revisa siempre el socket antes de comprar."] },
      cooler: { name: "Disipador de torre", sub: "Con pasta térmica preaplicada", ico: "cooler", to: "socket" },
      ram_a: { name: "Memoria DDR5 16 GB", sub: "5600 MHz · módulo 1", ico: "ram", to: "ram" },
      ram_b: { name: "Memoria DDR5 16 GB", sub: "5600 MHz · módulo 2", ico: "ram", to: "ram" },
      ram_bad: { name: "Memoria DDR4 16 GB", sub: "3200 MHz", ico: "ram", color: "#16a34a", to: "ram", wrong: ["Memoria incompatible", "La placa es <b>DDR5</b>: la muesca de un módulo DDR4 está en otro lugar y no entra. Nunca la fuerces."] },
      m2: { name: "SSD NVMe 1 TB", sub: "M.2 2280 · PCIe 4.0", ico: "m2", to: "m2" },
      gpu: { name: "Tarjeta de video", sub: "PCIe x16 · consume 220 W", ico: "gpu", to: "pcie" },
      psu: { name: "Fuente 650 W 80 PLUS Bronze", sub: "Modular, de marca reconocida", ico: "psu", to: "psu" },
      psu_bad: { name: "Fuente genérica «750 W»", sub: "Sin certificación, Q180", ico: "psu", color: "#ef4444", to: "psu", wrong: ["Fuente poco confiable", "Una fuente genérica sin certificación 80 PLUS suele entregar mucho menos de lo que dice y, al fallar, puede quemar la placa y la tarjeta de video. Este equipo (≈385 W) necesita una fuente de calidad de 550–650 W."] },
    },
    CABLES: {
      c24: { name: "Cable ATX 24 pines", sub: "Alimenta la placa madre", ico: "cable", color: "#f59e0b", to: "p24" },
      ceps: { name: "Cable EPS 4+4 pines (CPU)", sub: "Alimenta el procesador", ico: "cable", color: "#ef4444", to: "eps" },
      cpcie: { name: "Cable PCIe 6+2 pines", sub: "Alimenta la tarjeta de video", ico: "cable", color: "#22c55e", to: "gpupwr" },
      cpanel: { name: "Cables del panel frontal", sub: "Botón de encendido, reset y luces (del gabinete)", ico: "cable", color: "#a78bfa", to: "fpanel" },
    },
    NAMES: { standoffs: "los agujeros del gabinete", board: "el espacio de la placa madre", socket: "el socket del procesador", ram1: "la ranura de memoria A1", ram2: "la ranura de memoria A2", ram3: "la ranura de memoria B1", ram4: "la ranura de memoria B2", m2: "la ranura M.2", pcie: "la ranura PCIe x16", psu: "el espacio de la fuente", p24: "el conector ATX de 24 pines", eps: "el conector EPS del procesador (CPU 8 pines)", gpupwr: "el conector de energía de la tarjeta de video", fpanel: "los pines del panel frontal (F_PANEL)" },
    init: function () { return { used: {}, bad: {}, ram: [null, null, null, null], cab: {}, tries: 0 }; },
    item: function (id) { var p = PC.PARTS[id] || PC.CABLES[id]; return p && !S.used[id] ? Object.assign({ id: id }, p, { bad: S.bad[id] ? "Descartada: incompatible" : "" }) : null; },
    items: function (tab) {
      var src = tab === "c" ? PC.CABLES : PC.PARTS;
      return Object.keys(src).filter(function (k) { return !S.used[k]; }).map(PC.item).sort(function (a, b) { return (a.bad ? 1 : 0) - (b.bad ? 1 : 0); });
    },
    emptyText: function (tab) { return tab === "c" ? "Todos los cables están conectados." : "Todas las piezas están instaladas."; },
    has: function (k) { return !!S.used[k]; },
    spots: function () {
      var u = S.used, o = !!S.sel, h = [];
      if (!u.standoffs) h.push({ id: "standoffs", x: 80, y: 50, w: 400, h: 370, label: "Agujeros para los separadores", open: o });
      else if (!u.board) h.push({ id: "board", x: 80, y: 50, w: 400, h: 370, label: "Espacio de la placa madre", open: o });
      else {
        h.push({ id: "socket", x: 200, y: 85, w: 110, h: 110, label: u.cooler ? "Disipador instalado" : u.cpu ? "Procesador instalado (falta el disipador)" : "Socket AM5 del procesador", open: o && !u.cooler });
        ["A1", "A2", "B1", "B2"].forEach(function (n, i) { h.push({ id: "ram" + (i + 1), x: 334 + i * 18, y: 66, w: 16, h: 198, r: 3, label: "Ranura de memoria " + n + (S.ram[i] ? " (ocupada)" : ""), open: o && !S.ram[i] }); });
        h.push({ id: "m2", x: 176, y: 226, w: 140, h: 22, label: u.m2 ? "SSD M.2 instalado" : "Ranura M.2", open: o && !u.m2 });
        h.push({ id: "pcie", x: 96, y: u.gpu ? 300 : 284, w: 312, h: u.gpu ? 50 : 22, label: u.gpu ? "Tarjeta de video instalada" : "Ranura PCIe x16", open: o && !u.gpu });
        h.push({ id: "eps", x: 94, y: 52, w: 56, h: 28, label: "Conector EPS del procesador (CPU 8 pines)", open: o && !S.cab.ceps });
        h.push({ id: "p24", x: 446, y: 104, w: 30, h: 132, label: "Conector ATX de 24 pines", open: o && !S.cab.c24 });
        h.push({ id: "fpanel", x: 394, y: 388, w: 68, h: 28, label: "Pines del panel frontal (F_PANEL)", open: o && !S.cab.cpanel });
        if (u.gpu) h.push({ id: "gpupwr", x: 380, y: 280, w: 44, h: 22, label: "Conector de energía de la tarjeta de video", open: o && !S.cab.cpcie });
      }
      h.push({ id: "psu", x: 50, y: 446, w: 270, h: 80, label: u.psu ? "Fuente instalada" : "Espacio de la fuente de poder", open: o && !u.psu });
      return h;
    },
    drop: function (t, id) {
      var u = S.used;
      if (!id) return PC.remove(t);
      var it = PC.item(id); if (!it) return;
      var to = it.to, tgtGroup = /^ram\d$/.test(t) ? "ram" : t;
      // piezas incompatibles
      if (it.wrong && tgtGroup === to) { S.bad[id] = 1; S.sel = null; return err(it.wrong[0], it.wrong[1], 5); }
      if (PC.CABLES[id]) {
        if (!u.psu) return info("Primero la fuente", "Los cables salen de la fuente de poder: instálala antes de conectar.");
        if (id === "cpcie" && t === "eps" || id === "ceps" && t === "gpupwr") return err("Cable equivocado", "El conector <b>PCIe 6+2</b> (video) y el <b>EPS 4+4</b> (procesador) se parecen, pero <b>no son intercambiables</b>: forzarlo puede quemar la placa o la tarjeta.", 5);
        if (t !== to) return err("Ese cable no va ahí", "El " + esc(it.name) + " no se conecta en " + PC.NAMES[t] + ".", 2);
        S.cab[id] = 1; u[id] = 1; S.sel = null;
        return ok(it.name + " conectado", { c24: "Presiona hasta escuchar el clic de la traba.", ceps: "Sin este cable la placa no alimenta al procesador.", cpcie: "La tarjeta de video necesita energía extra además de la ranura.", cpanel: "Usa el manual: PWR SW, RESET SW, HDD LED y POWER LED (+/−)." }[id]);
      }
      if (to === "standoffs" && t === "standoffs") { u.standoffs = 1; S.sel = null; return ok("Separadores colocados", "Solo en los agujeros que coinciden con la placa: un separador de más puede causar un cortocircuito."); }
      if (id === "board" && t === "standoffs") return err("¡Faltan los separadores!", "Sin separadores la placa tocaría el metal del gabinete: <b>cortocircuito</b>. Coloca primero los standoffs.", 10);
      if (id === "board" && t === "board") { u.board = 1; S.sel = null; return ok("Placa madre instalada", "Atornillada sobre los separadores y con los puertos traseros alineados."); }
      if (id === "cooler" && t === "socket" && !u.cpu) return err("Orden incorrecto", "Primero va el <b>procesador</b> en el socket y luego el disipador encima.", 5);
      if (id === "cpu" && t === "socket") { if (u.cpu) return info("Ya hay un procesador", "Retíralo primero si quieres cambiarlo."); u.cpu = 1; S.sel = null; return ok("Procesador instalado", "Alineaste el triángulo dorado y bajaste la palanca sin forzar."); }
      if (id === "cooler" && t === "socket") { if (u.cooler) return info("Ya hay un disipador", ""); u.cooler = 1; S.sel = null; return ok("Disipador instalado", "La pasta preaplicada hace contacto con el procesador. Recuerda conectar su ventilador a CPU_FAN."); }
      if (to === "ram" && /^ram\d$/.test(t)) {
        var i = Number(t.slice(3)) - 1;
        if (S.ram[i]) return info("Ranura ocupada", "Retira primero el módulo que está ahí.");
        S.ram[i] = id; u[id] = 1; S.sel = null;
        var n = S.ram.filter(Boolean).length;
        if (n === 2 && !(S.ram[1] && S.ram[3])) return warn("Memoria instalada… pero revisa las ranuras", "Con 2 módulos en una placa de 4 ranuras, el manual indica <b>A2 y B2</b> para trabajar en <b>doble canal</b>. Puedes retirar un módulo tocándolo y moverlo.");
        return ok("Memoria instalada", "Las trabas laterales cerraron solas: está bien asentada.");
      }
      if (id === "m2" && t === "m2") { u.m2 = 1; S.sel = null; return ok("SSD M.2 instalado", "Entró en ángulo y lo fijaste con su tornillo o traba."); }
      if (id === "gpu" && t === "pcie") { u.gpu = 1; S.sel = null; return ok("Tarjeta de video instalada", "Escuchaste el clic de la ranura y la atornillaste al gabinete."); }
      if (id === "psu" && t === "psu") { u.psu = 1; S.sel = null; return ok("Fuente instalada", "Con el ventilador hacia la rejilla inferior para que tome aire fresco."); }
      if (!u.board && /^(socket|ram|m2|pcie)/.test(to)) return info("Primero la placa madre", "Esa pieza va sobre la placa madre.");
      return err("Esa pieza no va ahí", esc(it.name) + " no se instala en " + (PC.NAMES[t] || "ese lugar") + ".", 2);
    },
    remove: function (t) {
      var u = S.used;
      var back = function (k, msg) { delete u[k]; info("Pieza retirada", msg || "Volvió a la bandeja."); };
      if (/^ram\d$/.test(t)) { var i = Number(t.slice(3)) - 1; if (S.ram[i]) { var k = S.ram[i]; S.ram[i] = null; return back(k, "Abriste las trabas y retiraste el módulo."); } }
      if (t === "socket") { if (u.cooler) return back("cooler", "Retiraste el disipador (habría que limpiar y poner pasta nueva)."); if (u.cpu) return back("cpu"); }
      if (t === "m2" && u.m2) return back("m2");
      if (t === "pcie" && u.gpu) { if (S.cab.cpcie) { delete S.cab.cpcie; delete u.cpcie; } return back("gpu", "Desconectaste el cable PCIe y retiraste la tarjeta."); }
      var cab = { p24: "c24", eps: "ceps", gpupwr: "cpcie", fpanel: "cpanel" }[t];
      if (cab && S.cab[cab]) { delete S.cab[cab]; return back(cab, "Cable desconectado."); }
      if (t === "psu" && u.psu) { if (Object.keys(S.cab).length) return info("Primero los cables", "Desconecta los cables de la fuente antes de retirarla."); return back("psu"); }
      info("Selecciona algo primero", "Elige una pieza o un cable de la bandeja y luego toca dónde va.");
    },
    steps: function () {
      var u = S.used, c = S.cab;
      return [["Separadores", u.standoffs], ["Placa madre", u.board], ["Procesador", u.cpu], ["Disipador", u.cooler], ["2 memorias", S.ram.filter(Boolean).length === 2], ["SSD M.2", u.m2], ["Video", u.gpu], ["Fuente", u.psu], ["24 pines", c.c24], ["EPS CPU", c.ceps], ["PCIe video", c.cpcie], ["Panel frontal", c.cpanel], ["Encender", S.finished]];
    },
    hint: function () {
      var u = S.used, c = S.cab;
      if (!u.standoffs) return "Antes de la placa madre, el gabinete necesita sus <b>separadores (standoffs)</b>.";
      if (!u.board) return "Instala la <b>placa madre</b> sobre los separadores.";
      if (!u.cpu) return "Instala el procesador compatible con el socket <b>AM5</b>.";
      if (!u.cooler) return "El procesador necesita su <b>disipador</b> encima, o se sobrecalentará en segundos.";
      if (S.ram.filter(Boolean).length < 2) return "Instala los <b>dos módulos DDR5</b>. Para doble canal usa las ranuras <b>A2 y B2</b>.";
      if (!(S.ram[1] && S.ram[3])) return "Mueve la memoria a las ranuras <b>A2 y B2</b> para el doble canal.";
      if (!u.m2) return "Falta el almacenamiento: el <b>SSD NVMe</b> va en la ranura M.2.";
      if (!u.gpu) return "Instala la <b>tarjeta de video</b> en la ranura PCIe x16 (la larga).";
      if (!u.psu) return "Elige la <b>fuente de calidad</b> con certificación 80 PLUS.";
      if (!c.c24) return "Pestaña «Cables»: conecta el <b>ATX de 24 pines</b> al borde derecho de la placa.";
      if (!c.ceps) return "Conecta el <b>EPS 4+4</b> arriba a la izquierda, junto al procesador.";
      if (!c.cpcie) return "La tarjeta de video necesita su cable <b>PCIe 6+2</b>.";
      if (!c.cpanel) return "Conecta los cables del <b>panel frontal</b> abajo a la derecha (F_PANEL), o el botón no hará nada.";
      return "¡Todo listo! Presiona <b>Encender</b>.";
    },
    power: function () {
      var u = S.used, c = S.cab, fail = function (t, x) { S.tries++; err("Encendido fallido: " + t, x, 3); };
      begin();
      if (!u.psu || !u.board) return fail("no pasa nada", "Sin fuente o sin placa madre no hay nada que encender.");
      if (!c.c24) return fail("no pasa nada", "La placa no recibe energía: falta el <b>cable ATX de 24 pines</b>.");
      if (!c.cpanel) return fail("el botón no responde", "Presionas el botón del gabinete y no pasa nada: no está conectado a la placa (<b>F_PANEL</b>).");
      if (!u.cpu) return fail("ventiladores sin imagen", "Giran los ventiladores, pero sin procesador no hay POST. Luz <b>CPU</b> encendida.");
      if (!u.cooler) return err("¡Se apagó a los 3 segundos!", "Sin disipador, el procesador llegó a 95 °C y se apagó para protegerse. <b>Nunca enciendas sin disipador.</b>", 10);
      if (!c.ceps) return fail("ventiladores, sin imagen", "Luz de diagnóstico <b>CPU</b> encendida: falta el <b>conector EPS</b> del procesador.");
      if (!S.ram.some(Boolean)) return fail("pitidos largos", "Pitidos largos repetidos y luz <b>DRAM</b>: no hay memoria RAM instalada.");
      if (u.gpu && !c.cpcie) return fail("sin imagen", "Luz <b>VGA</b> encendida: la tarjeta de video no tiene su cable de energía <b>PCIe</b>.");
      var falta = [];
      if (!u.gpu) falta.push("la tarjeta de video");
      if (S.ram.filter(Boolean).length < 2) falta.push("el segundo módulo de memoria");
      if (!u.m2) falta.push("el SSD (el BIOS dice «No bootable device»)");
      if (falta.length) return info("¡Arrancó!… pero el trabajo no está completo", "Hay imagen y POST, pero aún falta: " + falta.join(", ") + ".");
      var dual = S.ram[1] && S.ram[3];
      if (!dual) err("Memoria en canal simple", "El equipo funciona, pero los módulos no están en A2/B2: el rendimiento baja. Revisa siempre el manual de la placa.", 5);
      finish([
        "CPU: AMD Ryzen 5 7600 @ 3.8 GHz <b>✔</b>",
        "Memoria: 32 GB DDR5 " + (dual ? "· doble canal <b>✔</b>" : "· canal simple <b class=\"w\">⚠</b>"),
        "Almacenamiento: SSD NVMe 1 TB <b>✔</b>",
        "Video: tarjeta PCIe x16 <b>✔</b>",
        "Temperatura CPU: 38 °C · Ventilador CPU_FAN: 1150 RPM <b>✔</b>",
      ]);
    },
    draw: function () {
      var u = S.used, c = S.cab, g = [];
      // gabinete
      g.push('<rect x="10" y="10" width="780" height="540" rx="18" fill="#0a1633" stroke="#2a3f73" stroke-width="3"/>');
      g.push('<rect x="28" y="28" width="744" height="504" rx="10" fill="#0f1f47"/>');
      for (var i = 0; i < 7; i++) g.push('<rect x="34" y="' + (276 + i * 22) + '" width="34" height="14" rx="2" fill="#1a2c5c"/>');
      [120, 250, 380].forEach(function (y) { g.push('<circle cx="712" cy="' + y + '" r="52" fill="#0b1738" stroke="#2a3f73" stroke-width="3"/><circle cx="712" cy="' + y + '" r="12" fill="#1e3a8a"/><path d="M712 ' + y + 'm0-40a40 40 0 0 1 0 80a40 40 0 0 1 0-80" fill="none" stroke="#1e3a8a" stroke-dasharray="14 10" stroke-width="10"/>'); });
      g.push('<text x="712" y="460" class="sim__lbl" text-anchor="middle">Frente</text>');
      g.push('<rect x="28" y="436" width="744" height="96" fill="#0b1738"/><rect x="540" y="452" width="150" height="66" rx="6" fill="#132555"/><text x="615" y="490" class="sim__lbl" text-anchor="middle">Bahía de discos</text>');
      // separadores / placa
      var holes = [[95, 65], [280, 65], [465, 65], [95, 240], [280, 240], [465, 240], [95, 405], [280, 405], [465, 405]];
      if (!u.board) {
        g.push('<rect x="80" y="50" width="400" height="370" rx="6" fill="none" stroke="#2a3f73" stroke-dasharray="8 8" stroke-width="2"/>');
        holes.forEach(function (p) { g.push(u.standoffs ? '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="8" fill="#d4a017"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="#7a5c00"/>' : '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#0a1633" stroke="#3b5998"/>'); });
        g.push('<text x="280" y="235" class="sim__lbl sim__lbl--big" text-anchor="middle">' + (u.standoffs ? "Coloca aquí la placa madre" : "Coloca primero los separadores") + "</text>");
      } else {
        g.push('<rect x="80" y="50" width="400" height="370" rx="6" fill="#1b2b44" stroke="#33476b" stroke-width="2"/>');
        g.push('<path d="M120 200h60v40M330 300v-30h-30M150 380h120l20-20" stroke="#26406a" stroke-width="3" fill="none"/>');
        holes.forEach(function (p) { g.push('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#cbd5e1"/>'); });
        g.push('<rect x="80" y="70" width="26" height="150" fill="#0f172a"/><text x="93" y="150" class="sim__lbl" transform="rotate(-90 93 150)" text-anchor="middle">Puertos</text>');
        // socket
        g.push('<rect x="210" y="95" width="90" height="90" rx="4" fill="#cfd6e4" stroke="#94a3b8" stroke-width="2"/><rect x="222" y="107" width="66" height="66" fill="#e2e8f0" stroke="#cbd5e1"/><text x="255" y="146" class="sim__lbl sim__lbl--dk" text-anchor="middle">AM5</text>');
        // ram
        ["A1", "A2", "B1", "B2"].forEach(function (n, i) { var x = 338 + i * 18; g.push('<rect x="' + x + '" y="70" width="10" height="190" rx="2" fill="#111827" stroke="#475569"/><text x="' + (x + 5) + '" y="64" class="sim__lbl sim__lbl--sm" text-anchor="middle">' + n + "</text>"); });
        // m2, pcie, chipset, headers
        g.push('<rect x="180" y="230" width="130" height="14" rx="2" fill="#0f172a" stroke="#475569"/><text x="245" y="258" class="sim__lbl sim__lbl--sm" text-anchor="middle">M.2</text>');
        g.push('<rect x="100" y="288" width="300" height="12" rx="2" fill="#0f172a" stroke="#64748b"/><text x="250" y="316" class="sim__lbl sim__lbl--sm" text-anchor="middle">PCIe x16</text>');
        g.push('<rect x="120" y="362" width="80" height="9" rx="2" fill="#0f172a" stroke="#475569"/>');
        g.push('<rect x="320" y="326" width="64" height="48" rx="4" fill="#334155"/><text x="352" y="354" class="sim__lbl sim__lbl--sm" text-anchor="middle">Chipset</text>');
        g.push('<rect x="100" y="58" width="44" height="16" rx="2" fill="#f8fafc"/><text x="122" y="70" class="sim__lbl sim__lbl--dk sim__lbl--sm" text-anchor="middle">CPU 8P</text>');
        g.push('<rect x="452" y="110" width="18" height="120" rx="2" fill="#f8fafc"/><text x="461" y="170" class="sim__lbl sim__lbl--dk sim__lbl--sm" transform="rotate(-90 461 170)" text-anchor="middle">ATX 24P</text>');
        g.push('<rect x="400" y="395" width="56" height="14" rx="2" fill="#0f172a" stroke="#94a3b8"/><text x="428" y="389" class="sim__lbl sim__lbl--sm" text-anchor="middle">F_PANEL</text>');
        if (u.cpu) g.push('<rect x="220" y="105" width="70" height="70" rx="4" fill="#d1d5db" stroke="#9ca3af" stroke-width="2"/><text x="255" y="138" class="sim__lbl sim__lbl--dk" text-anchor="middle">RYZEN 5</text><text x="255" y="152" class="sim__lbl sim__lbl--dk sim__lbl--sm" text-anchor="middle">7600</text>');
        if (u.cooler) g.push('<rect x="196" y="81" width="118" height="118" rx="10" fill="#1e293b" stroke="#475569" stroke-width="2"/><circle cx="255" cy="140" r="48" fill="#334155"/><g class="sim__fan"><path d="M255 140l30-30M255 140l30 30M255 140l-30 30M255 140l-30-30" stroke="#94a3b8" stroke-width="16" stroke-linecap="round"/></g><circle cx="255" cy="140" r="12" fill="#2563eb"/>');
        S.ram.forEach(function (r, i) { if (r) { var x = 336 + i * 18; g.push('<rect x="' + x + '" y="72" width="14" height="186" rx="2" fill="#2563eb" stroke="#93c5fd"/><text x="' + (x + 7) + '" y="165" class="sim__lbl sim__lbl--sm" transform="rotate(-90 ' + (x + 7) + ' 165)" text-anchor="middle">DDR5 16GB</text>'); } });
        if (u.m2) g.push('<rect x="178" y="228" width="134" height="18" rx="2" fill="#0b1020" stroke="#60a5fa"/><text x="245" y="241" class="sim__lbl sim__lbl--sm" text-anchor="middle">NVMe 1TB</text>');
        if (u.gpu) g.push('<rect x="96" y="290" width="330" height="58" rx="6" fill="#1e293b" stroke="#475569" stroke-width="2"/><circle cx="190" cy="319" r="24" fill="#334155" stroke="#64748b"/><circle cx="300" cy="319" r="24" fill="#334155" stroke="#64748b"/><rect x="386" y="284" width="32" height="12" rx="2" fill="#f8fafc"/><text x="402" y="294" class="sim__lbl sim__lbl--dk sim__lbl--sm" text-anchor="middle">8P</text>');
      }
      // fuente
      if (u.psu) g.push('<rect x="56" y="452" width="258" height="70" rx="6" fill="#111827" stroke="#475569" stroke-width="2"/><circle cx="130" cy="487" r="28" fill="none" stroke="#475569" stroke-width="3"/><path d="M102 487h56M130 459v56" stroke="#334155" stroke-width="3"/><text x="240" y="482" class="sim__lbl" text-anchor="middle">650 W</text><text x="240" y="500" class="sim__lbl sim__lbl--sm" text-anchor="middle">80 PLUS Bronze</text>');
      else g.push('<rect x="56" y="452" width="258" height="70" rx="6" fill="none" stroke="#2a3f73" stroke-dasharray="8 8" stroke-width="2"/><text x="185" y="492" class="sim__lbl" text-anchor="middle">Espacio de la fuente</text>');
      // cables
      if (c.c24) g.push('<path class="sim__cable" d="M300 458C520 460 530 250 470 236" stroke="#f59e0b"/>');
      if (c.ceps) g.push('<path class="sim__cable" d="M70 456C36 330 40 80 100 66" stroke="#ef4444"/>');
      if (c.cpcie) g.push('<path class="sim__cable" d="M270 452C300 400 460 340 404 296" stroke="#22c55e"/>');
      if (c.cpanel) g.push('<path class="sim__cable sim__cable--thin" d="M760 520C700 470 480 440 430 410" stroke="#a78bfa"/>');
      return g.join("");
    },
  };

  /* ═════════════ Escenario 2: MANTENIMIENTO DE LAPTOP ═════════════ */
  var SCREWS = [[160, 72, "L"], [640, 72, "L"], [400, 72, "S"], [112, 286, "S"], [688, 286, "S"], [150, 496, "S"], [400, 496, "S"], [650, 496, "S"], [400, 286, "S"]];
  var LAP = {
    title: "Simulador: mejora y mantenimiento de una laptop",
    goal: "Abre la laptop con seguridad, cambia la RAM a 2 × 8 GB, instala un SSD NVMe, limpia el ventilador y ciérrala.",
    intro: "Una laptop llegó lenta y caliente: tiene <b>4 GB de RAM</b> y el ventilador lleno de polvo. Usa las <b>herramientas</b> correctas en el orden correcto. Los tornillos de las bisagras son más largos.",
    powerLabel: "Encender la laptop",
    successLine: "✔ Arranque correcto · 16 GB en doble canal · temperatura normal",
    tabs: [{ id: "h", label: "Herramientas" }, { id: "p", label: "Piezas" }],
    TOOLS: {
      strap: { name: "Pulsera antiestática", sub: "Póntela antes de tocar componentes", ico: "strap", action: function () { if (S.strap) return info("Ya tienes la pulsera puesta", ""); S.strap = true; ok("Pulsera antiestática puesta", "Pinza conectada a tierra. Ahora puedes manipular componentes sin riesgo de descarga electrostática."); } },
      ph0: { name: "Destornillador Phillips PH0", sub: "Punta de cruz pequeña", ico: "driver" },
      flat: { name: "Destornillador plano metálico", sub: "Punta plana de acero", ico: "flat" },
      pick: { name: "Púa plástica", sub: "Para separar broches y conectores", ico: "pick" },
      air: { name: "Aire comprimido", sub: "Para quitar el polvo", ico: "air" },
    },
    PARTS: {
      sod_a: { name: "SODIMM DDR4 8 GB", sub: "3200 MHz · módulo 1", ico: "sodimm" },
      sod_b: { name: "SODIMM DDR4 8 GB", sub: "3200 MHz · módulo 2", ico: "sodimm" },
      dimm: { name: "DIMM DDR4 8 GB", sub: "3200 MHz (módulo largo)", ico: "ram", wrong: ["Módulo equivocado", "Ese es un módulo <b>DIMM de escritorio</b> (largo). Las laptops usan <b>SODIMM</b> (corto): no cabe."] },
      ssd: { name: "SSD NVMe 1 TB", sub: "M.2 2280", ico: "m2" },
      cover: { name: "Tapa inferior", sub: "Colócala sobre la laptop para cerrar", ico: "cover" },
      sL: { name: "Tornillo largo", sub: "Bisagras", ico: "screwL" },
      sS: { name: "Tornillo corto", sub: "Resto de la tapa", ico: "screw" },
    },
    init: function () { return { strap: false, screws: SCREWS.map(function () { return true; }), open: false, bat: true, ram: ["old", null], ssd: false, fan: false, used: {}, bad: {}, closed: false, out: { L: 0, S: 0 } }; },
    item: function (id) {
      var t = LAP.TOOLS[id]; if (t) return Object.assign({ id: id }, t, { sub: id === "strap" && S.strap ? "✔ Puesta" : t.sub });
      var p = LAP.PARTS[id]; if (!p || S.used[id]) return null;
      if (id === "cover" && !S.open) return null;
      if ((id === "sL" || id === "sS") && !S.out[id.slice(1)]) return null;
      return Object.assign({ id: id }, p, { bad: S.bad[id] ? "Descartada: no es compatible" : "", count: id === "sL" || id === "sS" ? S.out[id.slice(1)] : 0 });
    },
    items: function (tab) {
      if (tab === "h") return Object.keys(LAP.TOOLS).map(LAP.item);
      return Object.keys(LAP.PARTS).map(LAP.item).filter(Boolean);
    },
    emptyText: function () { return "No hay piezas pendientes."; },
    pending: function () {
      var p = [];
      if (S.ram[0] === "old") p.push("retirar la memoria vieja");
      if (!(S.ram[0] && S.ram[1] && S.ram[0] !== "old")) p.push("instalar los dos módulos de 8 GB");
      if (!S.ssd) p.push("instalar el SSD");
      if (!S.fan) p.push("limpiar el ventilador");
      if (!S.bat) p.push("reconectar la batería");
      return p;
    },
    spots: function () {
      var h = [], o = !!S.sel;
      if (!S.open) {
        h.push({ id: "cover", x: 90, y: 40, w: 620, h: 480, r: 28, label: S.closed ? "Tapa inferior" : "Borde de la tapa inferior", open: false });
        SCREWS.forEach(function (s, i) { h.push({ id: "s" + i, x: s[0] - 17, y: s[1] - 17, w: 34, h: 34, r: 17, label: (S.screws[i] ? "Tornillo" : "Orificio de tornillo") + (s[2] === "L" ? " de bisagra" : ""), open: o && !S.screws[i] }); });
        return h;
      }
      h.push({ id: "body", x: 90, y: 40, w: 620, h: 480, r: 28, label: "Laptop abierta", open: false });
      h.push({ id: "fan", x: 140, y: 90, w: 165, h: 165, r: 80, label: S.fan ? "Ventilador limpio" : "Ventilador con polvo", open: false });
      h.push({ id: "ram1", x: 462, y: 104, w: 236, h: 50, label: "Ranura de memoria 1" + (S.ram[0] ? " (ocupada)" : ""), open: o && !S.ram[0] });
      h.push({ id: "ram2", x: 462, y: 160, w: 236, h: 50, label: "Ranura de memoria 2" + (S.ram[1] ? " (ocupada)" : ""), open: o && !S.ram[1] });
      h.push({ id: "m2", x: 462, y: 230, w: 220, h: 40, label: S.ssd ? "SSD instalado" : "Ranura M.2", open: o && !S.ssd });
      h.push({ id: "bat", x: 368, y: 290, w: 64, h: 36, label: S.bat ? "Conector de la batería (conectado)" : "Conector de la batería (desconectado)", open: false });
      return h;
    },
    touch: function () { // antes de manipular componentes internos
      if (S.bat) { err("¡La batería sigue conectada!", "Manipular componentes con la batería conectada puede causar un corto y quemar la placa. <b>Desconecta primero la batería.</b>", 10, "bat"); return false; }
      if (!S.strap) err("Sin pulsera antiestática", "Una descarga electrostática puede dañar la memoria o el SSD sin que lo notes. Ponte la pulsera (pestaña Herramientas).", 5, "strap");
      return true;
    },
    drop: function (t, id) {
      var tool = id && LAP.TOOLS[id] ? id : null, part = id && LAP.PARTS[id] ? id : null;
      // tornillos
      if (/^s\d$/.test(t)) {
        var i = Number(t.slice(1)), sc = SCREWS[i];
        if (S.screws[i]) {
          if (tool === "ph0") { S.screws[i] = false; S.out[sc[2]]++; var left = S.screws.filter(Boolean).length; return ok("Tornillo retirado" + (sc[2] === "L" ? " (largo, de bisagra)" : ""), left ? "Quedan " + left + ". Guárdalos en orden: no todos miden lo mismo." : "¡Todos fuera! Ahora separa la tapa con la herramienta adecuada."); }
          if (tool === "flat") return err("Herramienta equivocada", "Con un destornillador plano <b>barres la cabeza</b> del tornillo Phillips y luego no hay forma de sacarlo.", 3);
          if (tool) return info("Esa herramienta no sirve para tornillos", "Usa el destornillador Phillips PH0.");
          return info("Elige una herramienta", "Selecciona el destornillador adecuado en la pestaña Herramientas.");
        }
        if (part === "sL" || part === "sS") {
          var kind = part.slice(1);
          if (kind !== sc[2]) return err("Tornillo equivocado", kind === "L" ? "Un tornillo <b>largo</b> en ese orificio puede atravesar la carcasa y <b>perforar la placa o el teclado</b>." : "Un tornillo <b>corto</b> en la bisagra no sujeta bien: la bisagra se aflojará y romperá la carcasa.", 5);
          S.screws[i] = true; S.out[kind]--; S.sel = S.out[kind] ? id : null;
          var falt = S.screws.filter(function (x) { return !x; }).length;
          return ok("Tornillo colocado", falt ? "Faltan " + falt + "." : "Tapa asegurada. Ya puedes encender la laptop.");
        }
        return info("Orificio vacío", "Aquí va un tornillo: elígelo en la pestaña Piezas.");
      }
      if (t === "cover" && !S.open) {
        if (S.closed) return info("La laptop está cerrada", "Coloca los tornillos y enciéndela.");
        if (!tool) return info("Elige una herramienta", "¿Con qué vas a separar la tapa?");
        if (S.screws.some(Boolean)) return err("¡Aún quedan tornillos!", "Si haces palanca con tornillos puestos <b>rompes los broches</b> o la carcasa. Revisa también bajo las gomas.", 5);
        if (tool === "flat") return err("Rayaste la carcasa", "Un destornillador metálico raya el plástico y rompe los broches. Usa una <b>púa plástica</b>.", 5);
        if (tool !== "pick") return info("No es la herramienta adecuada", "Para separar los broches de la tapa se usa una herramienta plástica.");
        S.open = true; S.sel = null;
        return ok("Tapa retirada", "Recorriste el borde con la púa soltando los broches. ¿Qué es lo primero que se hace al abrir una laptop?");
      }
      if (t === "body") {
        if (part !== "cover") return info("Toca un componente", "Elige una herramienta o pieza y toca el componente donde la usarás.");
        var p = LAP.pending();
        if (p.length) return info("Antes de cerrar", "Aún falta: " + p.join(", ") + ".");
        S.open = false; S.closed = true; S.used.cover = 1; S.sel = null;
        return ok("Tapa colocada", "Presionaste los broches en todo el borde. Ahora coloca los tornillos: largos en las bisagras.");
      }
      if (t === "bat") {
        if (tool === "flat" || tool === "ph0") return err("¡Herramienta metálica en la batería!", "Nunca uses metal en el conector de la batería: puedes provocar un cortocircuito. Usa la <b>púa plástica</b> o los dedos.", 5);
        if (tool && tool !== "pick") return info("No es la herramienta adecuada", "Usa la púa plástica o los dedos.");
        S.bat = !S.bat;
        return S.bat ? ok("Batería reconectada", "Conector alineado y presionado de forma pareja.") : ok("Batería desconectada", "¡Correcto! Es lo primero al abrir: ya puedes trabajar en la placa con seguridad.");
      }
      if (t === "fan") {
        if (S.fan) return info("El ventilador ya está limpio", "");
        if (tool !== "air") return info(tool ? "No es la herramienta adecuada" : "Elige una herramienta", "Para el polvo del ventilador usa el aire comprimido.");
        if (!LAP.touch()) return;
        return ask("¿Cómo soplas el ventilador?", ["Sostengo las aspas con un dedo y soplo en ráfagas cortas", "Soplo directo para que gire rápido y salga todo el polvo"], function (k) {
          if (k === 1) err("Ventilador en riesgo", "Si el ventilador gira libre a alta velocidad <b>genera corriente</b> que puede dañar la placa y desgasta su eje. Siempre sujeta las aspas.", 5);
          S.fan = true; ok("Ventilador limpio", "Salió una capa gruesa de polvo de las aletas del disipador. El aire volverá a circular.");
        });
      }
      if (t === "ram1" || t === "ram2") {
        var r = t === "ram1" ? 0 : 1;
        if (!id || tool) { // los módulos se retiran con los dedos (abriendo las pestañas laterales)
          if (!S.ram[r]) return info("Ranura vacía", "Elige un módulo en la pestaña Piezas.");
          if (!LAP.touch()) return;
          var was = S.ram[r]; S.ram[r] = null;
          if (was === "old") return ok("Memoria vieja retirada", "Abriste las pestañas laterales, el módulo de 4 GB subió en ángulo y lo sacaste.");
          delete S.used[was]; return info("Módulo retirado", "Volvió a la bandeja.");
        }
        if (part === "dimm") { S.bad.dimm = 1; S.sel = null; return err(LAP.PARTS.dimm.wrong[0], LAP.PARTS.dimm.wrong[1], 5); }
        if (part === "sod_a" || part === "sod_b") {
          if (S.ram[r]) return info("Ranura ocupada", S.ram[r] === "old" ? "Primero retira el módulo viejo de 4 GB (toca la ranura sin nada seleccionado)." : "Ya hay un módulo aquí.");
          if (!LAP.touch()) return;
          S.ram[r] = part; S.used[part] = 1; S.sel = null;
          return ok("Módulo de 8 GB instalado", "Entró a 30°, lo bajaste hasta que las pestañas hicieron clic.");
        }
        return info("Eso no va ahí", "En las ranuras de memoria van módulos SODIMM.");
      }
      if (t === "m2") {
        if (S.ssd && !id) return info("SSD instalado", "Ya está atornillado.");
        if (part === "ssd") { if (!LAP.touch()) return; S.ssd = true; S.used.ssd = 1; S.sel = null; return ok("SSD instalado", "Lo insertaste en ángulo y lo fijaste con su tornillo pequeño."); }
        if (part === "dimm") { S.bad.dimm = 1; S.sel = null; return err(LAP.PARTS.dimm.wrong[0], LAP.PARTS.dimm.wrong[1], 5); }
        return info(id ? "Eso no va ahí" : "Ranura M.2 libre", "En esta ranura va el SSD NVMe.");
      }
    },
    steps: function () {
      return [["Pulsera", S.strap], ["Quitar tornillos", !S.screws.some(Boolean) || S.open || S.closed], ["Abrir tapa", S.open || S.closed], ["Desconectar batería", !S.bat || S.closed], ["RAM vieja fuera", S.ram[0] !== "old"], ["2 × 8 GB", S.ram[0] && S.ram[1] && S.ram[0] !== "old"], ["SSD", S.ssd], ["Ventilador", S.fan], ["Reconectar batería", S.bat && S.fan && S.ssd], ["Cerrar tapa", S.closed], ["Tornillos", S.closed && S.screws.every(Boolean)], ["Encender", S.finished]];
    },
    hint: function () {
      if (!S.strap) return "Primero la seguridad: ponte la <b>pulsera antiestática</b> (pestaña Herramientas).";
      if (!S.open && !S.closed && S.screws.some(Boolean)) return "Retira los tornillos con el <b>destornillador Phillips PH0</b>.";
      if (!S.open && !S.closed) return "Separa la tapa recorriendo el borde con la <b>púa plástica</b>.";
      if (S.open && S.bat && !(S.fan && S.ssd && S.ram[0] && S.ram[1] && S.ram[0] !== "old")) return "Lo primero al abrir una laptop: <b>desconectar la batería</b> (con la púa o los dedos).";
      if (S.open && S.ram[0] === "old") return "Toca la ranura de la memoria vieja <b>sin nada seleccionado</b> para retirarla.";
      if (S.open && !(S.ram[0] && S.ram[1])) return "Instala los dos módulos <b>SODIMM</b> (los cortos) de 8 GB.";
      if (S.open && !S.ssd) return "Instala el <b>SSD NVMe</b> en la ranura M.2.";
      if (S.open && !S.fan) return "Limpia el ventilador con <b>aire comprimido</b>, sujetando las aspas.";
      if (S.open && !S.bat) return "Todo listo dentro: <b>reconecta la batería</b> antes de cerrar.";
      if (S.open) return "Coloca la <b>tapa inferior</b> (pestaña Piezas) sobre la laptop.";
      if (!S.screws.every(Boolean)) return "Coloca los tornillos: los <b>largos van en las bisagras</b> (arriba a los lados).";
      return "¡Listo! Presiona <b>Encender la laptop</b>.";
    },
    power: function () {
      begin();
      if (S.open) return err("Encendido con la laptop abierta", "Encender con la tapa abierta expone la placa a golpes y cortos. Cierra y atornilla primero.", 3);
      if (!S.closed) return info("La laptop aún no se ha intervenido", "Primero realiza el mantenimiento.");
      if (!S.screws.every(Boolean)) return info("Faltan tornillos", "Coloca todos los tornillos antes de encender: una tapa floja se rompe.");
      finish([
        "Memoria: 16 GB DDR4 3200 · doble canal <b>✔</b> (antes 4 GB)",
        "Almacenamiento: SSD NVMe 1 TB detectado <b>✔</b>",
        "Batería: conectada · 98 % <b>✔</b>",
        "Temperatura CPU en reposo: 41 °C <b>✔</b> (antes 78 °C)",
      ]);
    },
    draw: function () {
      var g = [];
      g.push('<rect x="90" y="40" width="620" height="480" rx="28" fill="#2b3443" stroke="#475569" stroke-width="3"/>');
      [[130, 60], [670, 60], [130, 500], [670, 500]].forEach(function (p) { g.push('<rect x="' + (p[0] - 28) + '" y="' + (p[1] - 6) + '" width="56" height="12" rx="6" fill="#111827" opacity=".8"/>'); });
      if (!S.open) {
        g.push('<rect x="104" y="54" width="592" height="452" rx="20" fill="#334155" stroke="#3f4b5e" stroke-width="2"/>');
        for (var i = 0; i < 9; i++) g.push('<rect x="' + (170 + i * 18) + '" y="130" width="8" height="90" rx="4" fill="#1f2937"/>');
        g.push('<text x="400" y="380" class="sim__lbl sim__lbl--big" text-anchor="middle">' + (S.closed ? "Tapa cerrada" : "Vista inferior de la laptop") + '</text><text x="400" y="404" class="sim__lbl" text-anchor="middle">Modelo TR-15 · 19.5 V ⎓ 3.33 A</text>');
        SCREWS.forEach(function (s, k) {
          if (S.screws[k]) g.push('<circle cx="' + s[0] + '" cy="' + s[1] + '" r="11" fill="#94a3b8" stroke="#1f2937" stroke-width="2"/><path d="M' + (s[0] - 6) + " " + s[1] + "h12M" + s[0] + " " + (s[1] - 6) + 'v12" stroke="#334155" stroke-width="2.5"/>' + (s[2] === "L" ? '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="15" fill="none" stroke="#64748b" stroke-dasharray="3 3"/>' : ""));
          else g.push('<circle cx="' + s[0] + '" cy="' + s[1] + '" r="8" fill="#0f172a" stroke="#64748b"/>');
        });
        return g.join("");
      }
      g.push('<rect x="104" y="54" width="592" height="452" rx="20" fill="#13283f"/>');
      g.push('<rect x="120" y="70" width="560" height="214" rx="10" fill="#14324a" stroke="#1f4a6b"/>');
      g.push('<path d="M240 260v20M420 210h40M300 250h140" stroke="#1f4a6b" stroke-width="3" fill="none"/>');
      // ventilador + heatpipe
      g.push('<path d="M300 150C340 150 360 165 400 165" stroke="#c2773a" stroke-width="14" fill="none" stroke-linecap="round"/>');
      g.push('<rect x="375" y="135" width="64" height="64" rx="6" fill="#9ca3af" stroke="#6b7280"/><text x="407" y="172" class="sim__lbl sim__lbl--dk sim__lbl--sm" text-anchor="middle">CPU</text>');
      g.push('<circle cx="222" cy="172" r="74" fill="#0f172a" stroke="#334155" stroke-width="4"/><g class="sim__fan' + (S.finished ? " is-spin" : "") + '" style="transform-origin:222px 172px"><path d="M222 172l40-40M222 172l40 40M222 172l-40 40M222 172l-40-40M222 172v-56M222 172h56" stroke="#475569" stroke-width="18" stroke-linecap="round"/></g><circle cx="222" cy="172" r="16" fill="#1e293b"/>');
      if (!S.fan) { var dots = ""; for (var d = 0; d < 46; d++) { var a = d * 2.4, rr = 18 + (d * 37 % 52); dots += '<circle cx="' + (222 + Math.cos(a) * rr).toFixed(1) + '" cy="' + (172 + Math.sin(a) * rr).toFixed(1) + '" r="' + (3 + d % 4) + '" fill="#8b6b4a" opacity=".75"/>'; } g.push(dots + '<text x="222" y="270" class="sim__lbl" text-anchor="middle">Polvo acumulado</text>'); }
      // ram
      [0, 1].forEach(function (r) {
        var y = 110 + r * 56;
        g.push('<rect x="468" y="' + y + '" width="224" height="38" rx="3" fill="#0f172a" stroke="#475569"/>');
        var m = S.ram[r];
        if (m) g.push('<rect x="474" y="' + (y + 4) + '" width="212" height="30" rx="2" fill="' + (m === "old" ? "#6b7280" : "#16a34a") + '"/><text x="580" y="' + (y + 24) + '" class="sim__lbl" text-anchor="middle">' + (m === "old" ? "4 GB DDR4 (original)" : "SODIMM 8 GB DDR4") + "</text>");
        else g.push('<text x="580" y="' + (y + 24) + '" class="sim__lbl sim__lbl--sm" text-anchor="middle">Ranura ' + (r + 1) + " vacía</text>");
      });
      g.push('<rect x="468" y="238" width="200" height="22" rx="2" fill="#0f172a" stroke="#475569"/><circle cx="676" cy="249" r="5" fill="#94a3b8"/>');
      g.push(S.ssd ? '<rect x="470" y="240" width="196" height="18" rx="2" fill="#0b1020" stroke="#60a5fa"/><text x="568" y="253" class="sim__lbl sim__lbl--sm" text-anchor="middle">NVMe 1 TB</text>' : '<text x="568" y="253" class="sim__lbl sim__lbl--sm" text-anchor="middle">M.2 libre</text>');
      // batería
      g.push('<rect x="130" y="318" width="540" height="170" rx="10" fill="#0b1324" stroke="#334155" stroke-width="2"/><text x="400" y="410" class="sim__lbl sim__lbl--big" text-anchor="middle">Batería 11.4 V · 41 Wh</text><text x="400" y="434" class="sim__lbl sim__lbl--sm" text-anchor="middle">No perforar · No presionar</text>');
      g.push('<rect x="380" y="296" width="40" height="16" rx="2" fill="#f8fafc"/>' + (S.bat ? '<path d="M400 312v8" stroke="#ef4444" stroke-width="8"/><rect x="384" y="298" width="32" height="12" rx="2" fill="#111827"/>' : '<rect x="384" y="326" width="32" height="12" rx="2" fill="#111827" transform="rotate(-12 400 332)"/><path d="M400 338v-6" stroke="#ef4444" stroke-width="6"/>'));
      g.push('<text x="450" y="306" class="sim__lbl sim__lbl--sm">' + (S.bat ? "Batería conectada" : "Desconectada ✔") + "</text>");
      return g.join("");
    },
  };

  SC = KIND === "laptop" ? LAP : PC;
  shell(); start();
})();
