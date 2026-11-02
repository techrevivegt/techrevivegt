/* ==========================================================================
   TECHREVIVE · Gucu — el guía del sitio 🐍🪶
   Mascota flotante estilo «asistente»: flota suavemente en la esquina,
   saluda y da consejos con bocadillos de texto (y voz opcional del
   navegador). Se puede silenciar; no molesta si el visitante lo cierra.
   ========================================================================== */
(function () {
  "use strict";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) var REDUCIDO = true;
  try { if (localStorage.getItem("tr-gucu:adios") === "1") return; } catch (e) {}
  try { if (sessionStorage.getItem("tr-gucu:hoy") === "1") return; } catch (e) {}

  var IMG = "/img/gucu-mascota.webp";
  var IMG_FB = "/img/gucu-mascota.png";

  /* ---------- Mensajitos de Gucu según la página ---------- */
  var RUTA = location.pathname.toLowerCase();
  var TIPS = [];
  if (RUTA === "/" || RUTA === "/index.html") {
    TIPS = [
      "¡Hola! Soy Gucu 🐍 tu guía de TechRevive. Te muestro servicios, cursos y el cotizador.",
      "¿Tu compu anda lenta o no enciende? En «Servicios» ves todo lo que arreglamos 🔧",
      "Tenemos cursos gratis en el aula virtual: desde prender una PC hasta Arduino 🤖",
      "¿Querés saber cuánto cuesta? El cotizador te arma el presupuesto en un minuto 💲",
    ];
  } else if (RUTA.indexOf("servicio") > -1) {
    TIPS = [
      "Cada servicio tiene explicación sencilla: elegí el que suene a tu problema 😊",
      "Si no sabés qué tiene tu equipo, el «Doctor TechRevive» te ayuda a diagnosticarlo 🩺",
      "Tip de técnico: una limpieza cada 6 meses alarga la vida de tu compu 🧼",
    ];
  } else if (RUTA.indexOf("cotiz") > -1 || RUTA.indexOf("tarifa") > -1) {
    TIPS = [
      "Armemos tu presupuesto: marcá los servicios y te lo envío listo a tu WhatsApp 📲",
      "Los precios marcados «desde» pueden variar según tu equipo — siempre te aviso antes ✅",
      "Podés imprimir la cotización o guardarla en PDF 🖨️",
    ];
  } else if (RUTA.indexOf("contacto") > -1) {
    TIPS = [
      "Escribinos por WhatsApp: respondemos rapidito en horario de taller 🕐",
      "Contanos marca, modelo y qué le pasa a tu equipo para ayudarte más rápido 📋",
    ];
  } else if (RUTA.indexOf("seguimiento") > -1) {
    TIPS = [
      "Pegá tu código de orden y el número de teléfono para ver en qué va tu equipo 🔎",
      "¿Perdiste el código? Escríbenos por WhatsApp y te lo buscamos 💬",
    ];
  } else if (RUTA.indexOf("diagnostico") > -1 || RUTA.indexOf("doctor") > -1) {
    TIPS = [
      "Contestá las preguntas como puedas; con eso el Doctor te da causas probables 🩺",
      "Tranquilidad: el diagnóstico es una guía, en el taller confirmamos todo gratis ✅",
    ];
  } else {
    TIPS = [
      "Soy Gucu, tu guía maya-tecnológica 🐍✨ Si te perdés, yo te oriento.",
      "Todo lo que ves aquí lo puedes preguntar por WhatsApp sin compromiso 💬",
    ];
  }

  /* ---------- Estilos ---------- */
  var st = document.createElement("style");
  st.textContent = [
    ".gucu{position:fixed;right:18px;bottom:18px;z-index:900;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:Inter,system-ui,sans-serif}",
    "@media print{.gucu{display:none!important}}",
    ".gucu__btn{border:0;background:transparent;cursor:pointer;padding:0;line-height:0;filter:drop-shadow(0 8px 18px rgba(4,18,50,.45));transition:transform .25s;" + (window.REDUCIDO || REDUCIDO ? "" : "animation:gucu-flota 4.5s ease-in-out infinite") + "}",
    "@keyframes gucu-flota{0%,100%{transform:translateY(0) rotate(-1.2deg)}50%{transform:translateY(-9px) rotate(1.4deg)}}",
    ".gucu__btn:hover{transform:scale(1.06)} .gucu__btn:focus-visible{outline:3px solid #22d3ee;outline-offset:4px;border-radius:14px}",
    ".gucu__btn img{width:104px;height:auto;display:block}",
    ".gucu__btn::after{content:'Gucu';position:absolute;left:50%;bottom:-4px;transform:translateX(-50%);background:#0b1f4e;color:#fff;font:700 10px/1 Inter,sans-serif;padding:3px 8px;border-radius:999px;box-shadow:0 3px 8px rgba(0,0,0,.25)}",
    ".gucu__btn{position:relative}",
    ".gucu__burbuja{position:relative;max-width:248px;background:#fff;border:1px solid #dbe3ee;border-radius:16px;padding:12px 14px;box-shadow:0 14px 34px rgba(10,20,60,.22);color:#152238;font-size:13.5px;line-height:1.45}",
    ".gucu__burbuja::after{content:'';position:absolute;right:34px;bottom:-9px;width:16px;height:16px;background:#fff;border-right:1px solid #dbe3ee;border-bottom:1px solid #dbe3ee;transform:rotate(45deg)}",
    ".gucu__burbuja small{display:block;margin-top:8px;font-size:11px;color:#64748b}",
    ".gucu__acciones{display:flex;gap:8px;margin-top:8px;align-items:center}",
    ".gucu__acciones button{border:1px solid #dbe3ee;background:#f8fafc;border-radius:8px;padding:4px 8px;font:600 11px Inter,sans-serif;color:#334155;cursor:pointer}",
    ".gucu__acciones button:hover{border-color:#22d3ee;color:#0e7490}",
    "@media(max-width:520px){.gucu__btn img{width:82px}.gucu{right:12px;bottom:12px}}",
  ].join("\n");
  document.head.appendChild(st);

  /* ---------- Widget ---------- */
  var wrap = document.createElement("div");
  wrap.className = "gucu";
  wrap.innerHTML =
    '<div class="gucu__burbuja" hidden role="status">' +
    '<span data-gucu-text></span>' +
    '<small>Gucu · tu guía (tradición maya + tecnología)</small>' +
    '<div class="gucu__acciones">' +
    '<button type="button" data-gucu-voz>🔊 Voz: <span data-gucu-voz-estado>apagada</span></button>' +
    '<button type="button" data-gucu-hoy>Silenciar hoy</button>' +
    '<button type="button" data-gucu-adios title="No mostrar más en este navegador">✕</button>' +
    "</div></div>" +
    '<button type="button" class="gucu__btn" aria-label="Gucu, tu guía TechRevive">' +
    '<img alt="" width="130" height="195" /></button>';
  document.body.appendChild(wrap);

  var btn = wrap.querySelector(".gucu__btn");
  var img = wrap.querySelector("img");
  var burbuja = wrap.querySelector(".gucu__burbuja");
  var txtEl = wrap.querySelector("[data-gucu-text]");
  var vozBtn = wrap.querySelector("[data-gucu-voz]");
  var vozEstado = wrap.querySelector("[data-gucu-voz-estado]");
  img.src = IMG;
  img.onerror = function () { if (img.src.indexOf("webp") > -1) img.src = IMG_FB; };

  /* ---------- Voz (Web Speech del navegador, sin costo) ---------- */
  var voz = false;
  try { voz = localStorage.getItem("tr-gucu:voz") === "1"; } catch (e) {}
  function pintaVoz() { vozEstado.textContent = voz ? "encendida" : "apagada"; }
  pintaVoz();
  function habla(t) {
    if (!voz || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ""));
      u.lang = "es-GT"; u.rate = 1.02; u.pitch = 1.15;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  vozBtn.addEventListener("click", function () {
    voz = !voz;
    try { localStorage.setItem("tr-gucu:voz", voz ? "1" : "0"); } catch (e) {}
    pintaVoz();
    if (voz && !window.speechSynthesis) { vozEstado.textContent = "no disponible"; voz = false; }
    else if (voz) habla(txtEl.textContent || "¡Hola! Soy Gucu.");
  });

  /* ---------- Mostrar mensajes ---------- */
  var ix = 0, timer = null, ocultar = null;
  function di(t) {
    txtEl.textContent = t;
    burbuja.hidden = false;
    habla(t);
    clearTimeout(ocultar);
    ocultar = setTimeout(function () { burbuja.hidden = true; }, 9000);
  }
  function rota() { if (burbuja.hidden) { di(TIPS[ix % TIPS.length]); ix++; } }
  btn.addEventListener("click", function () {
    if (burbuja.hidden) { di(TIPS[ix % TIPS.length]); ix++; }
    else burbuja.hidden = true;
  });
  wrap.querySelector("[data-gucu-hoy]").addEventListener("click", function () {
    try { sessionStorage.setItem("tr-gucu:hoy", "1"); } catch (e) {}
    wrap.remove(); if (window.speechSynthesis) window.speechSynthesis.cancel();
  });
  wrap.querySelector("[data-gucu-adios]").addEventListener("click", function () {
    if (confirm("¿Querés que Gucu ya no aparezca en este navegador? (podés reactivarlo borrando los datos del sitio)")) {
      try { localStorage.setItem("tr-gucu:adios", "1"); } catch (e) {}
      wrap.remove(); if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  });

  /* Saludo inicial (una vez por sesión) + rotación suave de consejos */
  try { var ya = sessionStorage.getItem("tr-gucu:saludo"); } catch (e) { var ya = null; }
  setTimeout(function () {
    if (!ya) { di(TIPS[0]); ix = 1; try { sessionStorage.setItem("tr-gucu:saludo", "1"); } catch (e) {} }
  }, 2600);
  timer = setInterval(rota, 40000);
})();
