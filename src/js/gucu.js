/* ==========================================================================
   TECHREVIVE · Gucu — asistente virtual con IA 🐍🤖 (v7)
   · Siempre quieto en su esquina: no se mueve ni habla por su cuenta.
   · Sin cuadros automáticos: el chat SOLO abre cuando el visitante da clic.
   · Chat real con IA del propio Worker (/api/gucu/chat): conoce servicios,
     cotizador, cursos del aula y el diagnóstico; responde corto y en voz alta.
   · Voz: los mensajes pregrabados usan /audio/gucu/*.mp3 (voz de deidad);
     las respuestas libres de la IA las lee la voz del navegador (con mute 🤐).
   · Arrastrable; se queda donde lo dejaron.
   ========================================================================== */
(function () {
  "use strict";
  var REDUCIDO = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var BASE = "/img/", AU = "/audio/gucu/";
  var POSES = { normal: "gucu-mascota", hablando: "gucu-hablando", volando: "gucu-volando",
    saludando: "gucu-saludando", senalando: "gucu-senalando", pensando: "gucu-pensando", riendo: "gucu-riendo",
    sorprendido: "gucu-sorprendido", enojado: "gucu-enojado", durmiendo: "gucu-durmiendo", guino: "gucu-guino",
    llorando: "gucu-llorando", soldador: "gucu-soldador", graduado: "gucu-graduado", calculadora: "gucu-calculadora",
    telefono: "gucu-telefono", doctor: "gucu-doctor", laptop: "gucu-laptop", lupa: "gucu-lupa", zen: "gucu-zen", celebrando: "gucu-celebrando" };

  /* sugerencia inicial por página (se manda como primer mensaje "contexto") */
  var RUTA = location.pathname.toLowerCase();
  var CONTEXTO = (RUTA === "/" || RUTA.endsWith("index.html")) ? "El visitante está en la portada del sitio."
    : RUTA.indexOf("servicio") > -1 ? "El visitante está en la página de servicios."
    : RUTA.indexOf("cotiz") > -1 || RUTA.indexOf("tarifa") > -1 ? "El visitante está en el cotizador."
    : RUTA.indexOf("contacto") > -1 ? "El visitante está en la página de contacto."
    : RUTA.indexOf("seguimiento") > -1 ? "El visitante está siguiendo una orden de reparación."
    : RUTA.indexOf("diagnostico") > -1 ? "El visitante está usando el diagnóstico."
    : "";

  /* ---------- Estilos ---------- */
  var st = document.createElement("style");
  st.textContent = [
    ".gucu{position:fixed;right:18px;bottom:96px;z-index:901;line-height:0;touch-action:none;user-select:none;border:0;background:transparent;cursor:grab;padding:0;filter:drop-shadow(0 8px 18px rgba(4,18,50,.45))}",
    ".gucu:active{cursor:grabbing}",
    "@media print{.gucu,.gucu-chat{display:none!important}}",
    (REDUCIDO ? "" : ".gucu img{animation:gucu-latido 4.5s ease-in-out infinite}"),
    "@keyframes gucu-latido{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.015)}}",
    ".gucu img{width:104px;height:auto;display:block;pointer-events:none}",
    ".gucu::after{content:'Gucu';position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);background:#0b1f4e;color:#fff;font:700 10px/1.6 Inter,system-ui,sans-serif;padding:3px 8px;border-radius:999px;pointer-events:none}",
    ".gucu:focus-visible{outline:3px solid #22d3ee;outline-offset:4px;border-radius:14px}",
    ".gucu-chat{position:fixed;right:18px;bottom:210px;z-index:900;width:min(330px,calc(100vw - 24px));height:min(62vh,460px);display:flex;flex-direction:column;background:#fff;border:1px solid #dbe3ee;border-radius:18px;box-shadow:0 24px 60px rgba(10,20,60,.30);font-family:Inter,system-ui,sans-serif;overflow:hidden}",
    ".gucu-chat[hidden]{display:none}",
    ".gucu-chat__head{display:flex;align-items:center;gap:10px;padding:10px 12px;background:linear-gradient(120deg,#0b1f4e,#12307a);color:#fff}",
    ".gucu-chat__head img{width:34px;height:auto;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3))}",
    ".gucu-chat__tit{flex:1;line-height:1.15}",
    ".gucu-chat__tit strong{display:block;font-size:13.5px}",
    ".gucu-chat__tit small{font-size:10.5px;color:#9db8f5}",
    ".gucu-chat__head button{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:12px;line-height:1}",
    ".gucu-chat__msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f6f9ff}",
    ".gucu-chat__m{max-width:86%;padding:9px 12px;border-radius:14px;font-size:13px;line-height:1.45;white-space:pre-wrap;word-break:break-word}",
    ".gucu-chat__m--g{align-self:flex-start;background:#fff;border:1px solid #dbe3ee;color:#152238;border-bottom-left-radius:4px;box-shadow:0 2px 6px rgba(10,20,60,.06)}",
    ".gucu-chat__m--u{align-self:flex-end;background:#1d4ed8;color:#fff;border-bottom-right-radius:4px}",
    ".gucu-chat__m--pensando{color:#64748b;font-style:italic}",
    ".gucu-chat__typing{display:inline-flex;gap:4px;padding:4px 0}",
    ".gucu-chat__typing i{width:6px;height:6px;border-radius:50%;background:#94a3b8;animation:gucu-punto 1s infinite}",
    ".gucu-chat__typing i:nth-child(2){animation-delay:.15s}.gucu-chat__typing i:nth-child(3){animation-delay:.3s}",
    "@keyframes gucu-punto{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}",
    ".gucu-chat__sug{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px 0}",
    ".gucu-chat__sug button{font:600 11px Inter,sans-serif;color:#0e7490;background:#ecfeff;border:1px solid #a5f3fc;border-radius:999px;padding:5px 10px;cursor:pointer}",
    ".gucu-chat__sug button:hover{background:#cffafe}",
    ".gucu-chat__form{display:flex;gap:8px;padding:10px;border-top:1px solid #e2e8f0;background:#fff}",
    ".gucu-chat__form input{flex:1;min-width:0;border:1px solid #dbe3ee;border-radius:10px;padding:9px 11px;font:400 13px Inter,sans-serif;color:#152238}",
    ".gucu-chat__form input:focus{outline:2px solid #22d3ee;border-color:transparent}",
    ".gucu-chat__form button{border:0;background:#1d4ed8;color:#fff;border-radius:10px;width:40px;cursor:pointer;font-size:15px}",
    ".gucu-chat__form button:disabled{opacity:.5;cursor:default}",
    "@media(max-width:520px){.gucu img{width:82px}.gucu{right:12px;bottom:88px}.gucu-chat{right:8px;bottom:176px;height:min(58vh,430px)}}"
  ].join("\n");
  document.head.appendChild(st);

  /* ---------- Mascota ---------- */
  var b = document.createElement("button");
  b.type = "button"; b.className = "gucu";
  b.setAttribute("aria-label", "Gucu, el asistente virtual: dame clic y chateá conmigo; también podés arrastrarme");
  var img = document.createElement("img");
  img.width = 130; img.height = 195; img.alt = ""; img.draggable = false;
  b.appendChild(img);
  document.body.appendChild(b);

  function sprite(p) {
    var cads = [BASE + POSES[p] + ".webp", BASE + POSES[p] + ".png", BASE + POSES.normal + ".webp", BASE + POSES.normal + ".png"];
    var n = 0;
    (function pon() { img.onerror = function () { n++; if (n < cads.length) pon(); }; img.src = cads[n]; })();
  }
  sprite("normal");

  /* ---------- Ventana de chat ---------- */
  var chat = document.createElement("section");
  chat.className = "gucu-chat"; chat.hidden = true;
  chat.setAttribute("role", "dialog");
  chat.setAttribute("aria-label", "Chat con Gucu, asistente virtual");
  chat.innerHTML =
    '<div class="gucu-chat__head"><img alt="" /><div class="gucu-chat__tit"><strong>Gucu</strong><small>Deidad maya de la tecnología · asistente con IA</small></div>' +
    '<button type="button" data-voz title="Voz en voz alta">🔊</button><button type="button" data-cierra title="Cerrar">✕</button></div>' +
    '<div class="gucu-chat__msgs"></div>' +
    '<div class="gucu-chat__sug"></div>' +
    '<form class="gucu-chat__form"><input type="text" maxlength="300" autocomplete="off" placeholder="Escribile a Gucu…" aria-label="Mensaje para Gucu" /><button type="submit" aria-label="Enviar">➤</button></form>';
  document.body.appendChild(chat);
  chat.querySelector(".gucu-chat__head img").src = BASE + POSES.normal + ".webp";
  var msgs = chat.querySelector(".gucu-chat__msgs");
  var form = chat.querySelector("form"), campo = form.querySelector("input"), enviarBtn = form.querySelector("button[type=submit]");
  var sugs = chat.querySelector(".gucu-chat__sug");

  /* ---------- Voz ---------- */
  var voz = true, audio = null, hablandoTTS = false;
  try { if (localStorage.getItem("tr-gucu:voz") === "0") voz = false; } catch (e) {}
  var vozBtn = chat.querySelector("[data-voz]");
  function pintaVoz() { vozBtn.textContent = voz ? "🔊" : "🤐"; }
  pintaVoz();
  vozBtn.addEventListener("click", function () {
    voz = !voz;
    try { localStorage.setItem("tr-gucu:voz", voz ? "1" : "0"); } catch (e) {}
    pintaVoz();
    if (!voz) calla();
  });
  function calla() {
    try { if (audio) { audio.pause(); audio.currentTime = 0; } if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    hablandoTTS = false;
  }
  function hablaAudio(clave, pose, alFinal) { /* línea pregrabada de deidad */
    if (!voz) return;
    calla();
    audio = new Audio(AU + clave + ".mp3");
    audio.onplay = function () { sprite(pose || "hablando"); };
    audio.onended = function () { sprite("normal"); if (alFinal) alFinal(); };
    audio.onerror = function () { sprite("normal"); };
    var pr = audio.play(); if (pr && pr.catch) pr.catch(function () {});
  }
  function hablaLibre(t) { /* respuesta de IA leída con la voz del navegador */
    if (!voz || !("speechSynthesis" in window)) return;
    calla();
    var limpio = t.replace(/[🐍💲🎓🩺📱🔎😅🪶🎮🧼✨⚡🖐️🤖]/g, "").replace(/\s*→\s*\/\S+/g, "").replace(/\/(servicios|cotizador|aula|contacto|seguimiento|diagnostico)\b/g, "$1").slice(0, 400);
    var u = new SpeechSynthesisUtterance(limpio);
    u.lang = "es-GT"; u.rate = 1.02; u.pitch = 0.95;
    u.onstart = function () { hablandoTTS = true; sprite("hablando"); };
    u.onend = u.onerror = function () { hablandoTTS = false; sprite("normal"); };
    speechSynthesis.speak(u);
  }

  /* ---------- Hilo del chat ---------- */
  var hilo = [];
  try { hilo = JSON.parse(sessionStorage.getItem("tr-gucu-chat") || "[]") || []; } catch (e) {}
  function guarda() { try { sessionStorage.setItem("tr-gucu-chat", JSON.stringify(hilo.slice(-30))); } catch (e) {} }
  function agrega(quien, texto, clase) {
    var d = document.createElement("div");
    d.className = "gucu-chat__m gucu-chat__m--" + quien + (clase ? " " + clase : "");
    d.textContent = texto;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  function pintaHilo() { msgs.innerHTML = ""; hilo.forEach(function (m) { agrega(m.r, m.t); }); }

  var SUGERENCIAS = ["🖥️ Mi laptop no enciende", "💲 ¿Cuánto cuesta…?", "🎓 Cursos gratis", "🩺 Diagnóstico"];
  sugs.innerHTML = "";
  SUGERENCIAS.forEach(function (s) {
    var sb = document.createElement("button");
    sb.type = "button"; sb.textContent = s;
    sb.addEventListener("click", function () { campo.value = s.replace(/^\S+\s/, ""); form.requestSubmit(); });
    sugs.appendChild(sb);
  });

  var abierto = false, saludeEnChat = false;
  function abreChat() {
    abierto = true; chat.hidden = false; acomodaChat();
    despierta();
    if (!hilo.length) {
      var bien = "¡Hola, viajero! 🐍 Soy Gucu, serpiente emplumada de la tecnología y asistente de TechRevive. Escribime lo que querás: reparaciones, precios, cursos gratis… yo guío.";
      hilo.push({ r: "g", t: bien }); agrega("g", bien); guarda();
      if (!saludeEnChat) { saludeEnChat = true; hablaAudio("saludo", "saludando"); }
      sprite("saludando");
      setTimeout(function () { if (!hablandoTTS) sprite("normal"); }, 3400);
    } else { pintaHilo(); }
    setTimeout(function () { campo.focus(); }, 60);
  }
  function cierraChat() { abierto = false; chat.hidden = true; calla(); sprite("normal"); }
  chat.querySelector("[data-cierra]").addEventListener("click", cierraChat);

  /* ---------- IA ---------- */
  var pensando = null;
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var t = campo.value.trim().replace(/\s+/g, " ");
    if (!t || t.length < 2) return;
    campo.value = "";
    hilo.push({ r: "u", t: t }); agrega("u", t); guarda();
    enviarBtn.disabled = true;
    sprite("pensando");
    if (pensando) pensando.remove();
    pensando = agrega("g", "", "gucu-chat__m--pensando");
    pensando.innerHTML = '<span class="gucu-chat__typing"><i></i><i></i><i></i></span>';
    var historial = [];
    if (CONTEXTO) historial.push({ r: "u", t: "[Contexto] " + CONTEXTO });
    hilo.slice(-6, -1).forEach(function (m) { historial.push({ r: m.r, t: m.t }); });
    fetch("/api/gucu/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: t, historial: historial })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (pensando) { pensando.remove(); pensando = null; }
        enviarBtn.disabled = false;
        var resp = res.ok && res.d.respuesta ? res.d.respuesta
          : (res.d.error || "Se me enredaron las plumas 😅 Reintentá en un ratito.");
        hilo.push({ r: "g", t: resp }); agrega("g", resp); guarda();
        sprite("hablando");
        hablaLibre(resp);
      })
      .catch(function () {
        if (pensando) { pensando.remove(); pensando = null; }
        enviarBtn.disabled = false;
        sprite("normal");
        agrega("g", "Sin conexión con el templo digital 😅 Revisá tu internet e intentá otra vez.");
      });
  });

  /* ---------- Siesta (pose, sin texto) ---------- */
  var siesta = false, vigilant = null;
  function despierta() {
    if (siesta) { siesta = false; sprite("normal"); }
    clearTimeout(vigilant);
    vigilant = setTimeout(function () {
      if (!abierto && !hablandoTTS && !REDUCIDO) { siesta = true; sprite("durmiendo"); }
    }, 90000);
  }
  despierta();

  /* ---------- Arrastre + clic ---------- */
  var arrastrando = false, ddx = 0, ddy = 0, movio = 0;
  b.addEventListener("pointerdown", function (e) {
    arrastrando = true; movio = 0; despierta();
    var r = b.getBoundingClientRect();
    ddx = e.clientX - r.left; ddy = e.clientY - r.top;
    b.style.left = r.left + "px"; b.style.top = r.top + "px";
    b.style.right = "auto"; b.style.bottom = "auto";
    try { b.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  b.addEventListener("pointermove", function (e) {
    if (!arrastrando) return;
    movio += Math.abs(e.movementX) + Math.abs(e.movementY);
    var mx = window.innerWidth - 60, my = window.innerHeight - 60;
    b.style.left = Math.min(Math.max(e.clientX - ddx, -20), mx) + "px";
    b.style.top = Math.min(Math.max(e.clientY - ddy, -20), my) + "px";
  });
  b.addEventListener("pointerup", function () {
    arrastrando = false;
    if (movio < 6) { abierto ? cierraChat() : abreChat(); }
    else { sprite(movio > 400 ? "enojado" : "zen"); setTimeout(function () { if (!hablandoTTS && !siesta) sprite("normal"); }, 3500); }
  });
  b.addEventListener("pointercancel", function () { arrastrando = false; });

  /* el chat se abre justo encima de Gucu, dondequiera que esté */
  function acomodaChat() {
    var r = b.getBoundingClientRect();
    chat.style.right = Math.min(Math.max(8, window.innerWidth - r.right), window.innerWidth - 344) + "px";
    chat.style.left = "auto";
    chat.style.bottom = (window.innerHeight - r.top + 6) + "px";
  }
  if ("ResizeObserver" in window) new ResizeObserver(acomodaChat).observe(b);
})();
