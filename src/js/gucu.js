/* ==========================================================================
   TECHREVIVE · Gucu — el guía del sitio 🐍🪶 (v2 «con vida»)
   Mascota asistente estilo guía animada:
   · VUELA por la pantalla: cada rato cambia de lugar solo (esquinas y
     bordes), con inclinación mientras vuela y mirando hacia donde va.
   · HABLA: bocadillos de texto y voz real (voz del navegador, gratis),
     activada tras la primera interacción del visitante con la página.
   · Libre: cualquiera puede AGARRARLO y arrastrarlo a donde quiera.
   · Modales: se puede silenciar hoy o quitar; respeta «reducir animación»;
     no aparece al imprimir ni dentro del aula virtual.
   ========================================================================== */
(function () {
  "use strict";
  var REDUCIDO = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try { if (localStorage.getItem("tr-gucu:adios") === "1") return; } catch (e) {}
  try { if (sessionStorage.getItem("tr-gucu:hoy") === "1") return; } catch (e) {}

  var IMG = "/img/gucu-mascota.webp", IMG_FB = "/img/gucu-mascota.png";

  /* ---------- Mensajitos según la página ---------- */
  var RUTA = location.pathname.toLowerCase();
  var SALUDO = "¡Hola! Soy Gucu, tu guía. ¡Dame clic y te cuento cosas! O si querés, arrastrame de paseo por la página 😄";
  var TIPS;
  if (RUTA === "/" || RUTA === "/index.html") {
    TIPS = [
      "Te muestro todo: servicios, cursos gratis y el cotizador. ¿Por dónde empezamos?",
      "¿Tu compu anda lenta o no enciende? En «Servicios» ves todo lo que arreglamos 🔧",
      "Tenemos aula virtual con cursos gratis: desde prender una PC hasta Arduino 🤖",
      "¿Querés saber cuánto cuesta? El cotizador te arma el presupuesto en un minuto 💲",
    ];
  } else if (RUTA.indexOf("servicio") > -1) {
    TIPS = [
      "Cada servicio tiene explicación sencilla: elegí el que suene a tu problema 😊",
      "Si no sabés qué tiene tu equipo, el «Doctor TechRevive» te ayuda a diagnosticarlo 🩺",
      "Tip de técnico sabio: una limpieza cada 6 meses alarga la vida de tu compu 🧼",
    ];
  } else if (RUTA.indexOf("cotiz") > -1 || RUTA.indexOf("tarifa") > -1) {
    TIPS = [
      "Armemos tu presupuesto: marcá los servicios y te lo envío a tu WhatsApp 📲",
      "Los precios «desde» pueden variar según tu equipo — siempre te avisamos antes ✅",
      "Podés imprimir tu cotización o guardarla en PDF 🖨️",
    ];
  } else if (RUTA.indexOf("contacto") > -1) {
    TIPS = [
      "Por WhatsApp respondemos rapidito en horario de taller 🕐",
      "Contanos marca, modelo y qué le pasa a tu equipo para ayudarte más rápido 📋",
    ];
  } else if (RUTA.indexOf("seguimiento") > -1) {
    TIPS = [
      "Pegá tu código de orden y tu número de teléfono para ver en qué va tu equipo 🔎",
      "¿Perdiste el código? Nos escribís por WhatsApp y te lo buscamos 💬",
    ];
  } else if (RUTA.indexOf("diagnostico") > -1 || RUTA.indexOf("doctor") > -1) {
    TIPS = [
      "Contestá las preguntas como puedas; con eso el Doctor te da causas probables 🩺",
      "Tranquilo: el diagnóstico es una guía, en el taller confirmamos todo gratis ✅",
    ];
  } else {
    TIPS = [
      "Soy Gucu, tu guía maya-tecnológica 🐍 Si te perdés, yo te oriento.",
      "Todo lo que ves podés preguntarlo por WhatsApp sin compromiso 💬",
    ];
  }
  /* Frases sueltas mientras pasea (estilo guía animada) */
  var PASEOS = [
    "¡Qué bonito día para aprender algo nuevo!",
    "¿Sabías que también reparamos laptops gamer? 🎮",
    "Por aquí huele a tecnología recién arreglada…",
    "¡Seguíme! Que por algo soy guía 🐍",
    "El conocimiento es poder… y la limpieza de ventiladores también 💨",
  ];

  /* ---------- Estilos ---------- */
  var st = document.createElement("style");
  st.textContent = [
    ".gucu{position:fixed;right:18px;bottom:100px;z-index:900;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:Inter,system-ui,sans-serif;transition:left 2.4s cubic-bezier(.45,.05,.35,1),top 2.4s cubic-bezier(.45,.05,.35,1),right 2.4s cubic-bezier(.45,.05,.35,1),bottom 2.4s cubic-bezier(.45,.05,.35,1)}",
    "@media print{.gucu{display:none!important}}",
    ".gucu--arrastrando{transition:none!important}",
    ".gucu__btn{border:0;background:transparent;cursor:grab;padding:0;line-height:0;position:relative;filter:drop-shadow(0 8px 18px rgba(4,18,50,.45));transition:transform .25s;touch-action:none;user-select:none}",
    ".gucu__btn:active{cursor:grabbing}",
    (REDUCIDO ? "" : ".gucu--quieto .gucu__btn{animation:gucu-flota 4.5s ease-in-out infinite}"),
    "@keyframes gucu-flota{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}",
    ".gucu--volando .gucu__btn{animation:none;transform:rotate(7deg) scale(1.05)}",
    ".gucu__btn img{width:104px;height:auto;display:block;transition:transform .4s;pointer-events:none}",
    ".gucu--izq .gucu__btn img{transform:scaleX(-1)}",
    ".gucu__btn:hover img{transform:scale(1.06)} .gucu--izq .gucu__btn:hover img{transform:scaleX(-1) scale(1.06)}",
    ".gucu__btn:focus-visible{outline:3px solid #22d3ee;outline-offset:4px;border-radius:14px}",
    ".gucu__btn::after{content:'Gucu';position:absolute;left:50%;bottom:-4px;transform:translateX(-50%);background:#0b1f4e;color:#fff;font:700 10px/1 Inter,sans-serif;padding:3px 8px;border-radius:999px;box-shadow:0 3px 8px rgba(0,0,0,.25)}",
    ".gucu__burbuja{position:relative;max-width:250px;background:#fff;border:1px solid #dbe3ee;border-radius:16px;padding:12px 14px;box-shadow:0 14px 34px rgba(10,20,60,.22);color:#152238;font-size:13.5px;line-height:1.45}",
    ".gucu__burbuja::after{content:'';position:absolute;right:34px;bottom:-9px;width:16px;height:16px;background:#fff;border-right:1px solid #dbe3ee;border-bottom:1px solid #dbe3ee;transform:rotate(45deg)}",
    ".gucu--izq .gucu__burbuja{align-self:flex-start} .gucu--izq .gucu__burbuja::after{right:auto;left:34px}",
    ".gucu__burbuja small{display:block;margin-top:8px;font-size:11px;color:#64748b}",
    ".gucu__acciones{display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap}",
    ".gucu__acciones button{border:1px solid #dbe3ee;background:#f8fafc;border-radius:8px;padding:4px 8px;font:600 11px Inter,sans-serif;color:#334155;cursor:pointer}",
    ".gucu__acciones button:hover{border-color:#22d3ee;color:#0e7490}",
    "@media(max-width:520px){.gucu__btn img{width:82px}.gucu{right:12px;bottom:92px}.gucu__burbuja{max-width:210px}}",
  ].join("\n");
  document.head.appendChild(st);

  /* ---------- Widget ---------- */
  var wrap = document.createElement("div");
  wrap.className = "gucu gucu--quieto";
  wrap.innerHTML =
    '<div class="gucu__burbuja" hidden role="status">' +
    '<span data-gucu-text></span>' +
    '<small>Gucu · tu guía (tradición maya + tecnología) · podés arrastrarme 🐾</small>' +
    '<div class="gucu__acciones">' +
    '<button type="button" data-gucu-voz>🔊 Voz: <span data-gucu-voz-estado>encendida</span></button>' +
    '<button type="button" data-gucu-hoy>Silenciar hoy</button>' +
    '<button type="button" data-gucu-adios title="No mostrar más en este navegador">✕</button>' +
    "</div></div>" +
    '<button type="button" class="gucu__btn" aria-label="Gucu, tu guía TechRevive: arrastramé o dame clic">' +
    '<img alt="" width="130" height="195" draggable="false" /></button>';
  document.body.appendChild(wrap);

  var btn = wrap.querySelector(".gucu__btn");
  var img = wrap.querySelector("img");
  var burbuja = wrap.querySelector(".gucu__burbuja");
  var txtEl = wrap.querySelector("[data-gucu-text]");
  var vozBtn = wrap.querySelector("[data-gucu-voz]");
  var vozEstado = wrap.querySelector("[data-gucu-voz-estado]");
  img.src = IMG;
  img.onerror = function () { if (img.src.indexOf("webp") > -1) img.src = IMG_FB; };

  /* ---------- Voz (voz española del navegador, gratis) ---------- */
  var voz = true;
  try { if (localStorage.getItem("tr-gucu:voz") === "0") voz = false; } catch (e) {}
  var gesto = false;
  function pintaVoz() { vozEstado.textContent = voz ? "encendida" : "apagada"; }
  pintaVoz();
  function limpia(t) { return t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu, "").trim(); }
  function habla(t) {
    if (!voz || !gesto || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(limpia(t));
      u.lang = "es-GT"; u.rate = 1.05; u.pitch = 1.25; /* vocecilla de guía animada */
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  /* El navegador exige un gesto del usuario antes de permitir audio */
  function primerGesto() { gesto = true; document.removeEventListener("pointerdown", primerGesto); document.removeEventListener("keydown", primerGesto); }
  document.addEventListener("pointerdown", primerGesto);
  document.addEventListener("keydown", primerGesto);
  vozBtn.addEventListener("click", function () {
    if (!("speechSynthesis" in window)) { vozEstado.textContent = "no disponible"; voz = false; return; }
    voz = !voz;
    try { localStorage.setItem("tr-gucu:voz", voz ? "1" : "0"); } catch (e) {}
    pintaVoz();
    if (voz) habla(txtEl.textContent || "¡Hola! Soy Gucu."); else window.speechSynthesis.cancel();
  });

  /* ---------- Hablar con bocadillo ---------- */
  var ix = 0, ocultar = null;
  function di(t) {
    txtEl.textContent = t;
    burbuja.hidden = false;
    habla(t);
    clearTimeout(ocultar);
    ocultar = setTimeout(function () { burbuja.hidden = true; }, 9000);
  }

  /* ---------- Movimiento libre: volar de paseo ---------- */
  function tamaño() { return { w: wrap.offsetWidth || 120, h: wrap.offsetHeight || 210 }; }
  function casas() {
    var m = 14, vw = window.innerWidth, vh = window.innerHeight, t = tamaño();
    var safe = { top: 90, bottom: 96 }; /* no tapar la barra ni el WhatsApp */
    return [
      { x: vw - t.w - m, y: vh - t.h - safe.bottom },              /* esquina inf. derecha (hogar) */
      { x: m, y: vh - t.h - safe.bottom },                          /* esquina inf. izquierda */
      { x: vw * 0.5 - t.w / 2, y: vh - t.h - safe.bottom - 10 },    /* centro abajo */
      { x: vw - t.w - m - 30, y: Math.min(vh - t.h - safe.bottom, vh * 0.6) },   /* lado derecho, bajo */
      { x: m + 20, y: Math.min(vh - t.h - safe.bottom, vh * 0.62) },             /* lado izquierdo, bajo */
    ];
  }
  var volando = null, rondin = null, casaIx = 0, enMovimiento = false;
  function volverAlHogar() { moverA(0, true); }
  function moverA(i, silencioso) {
    if (REDUCIDO || document.hidden) return;
    var lista = casas();
    if (i == null) {
      /* elegir otra posición distinta a la actual */
      var opciones = [];
      for (var k = 0; k < lista.length; k++) if (k !== casaIx) opciones.push(k);
      i = opciones[Math.floor(Math.random() * opciones.length)];
    }
    var dest = lista[i], anterior = casaIx;
    casaIx = i;
    var listaUsada = lista[anterior];
    enMovimiento = true;
    wrap.classList.add("gucu--volando");
    wrap.classList.remove("gucu--quieto");
    /* mirar hacia donde va */
    wrap.classList.toggle("gucu--izq", dest.x < listaUsada.x);
    wrap.style.right = "auto"; wrap.style.bottom = "auto";
    wrap.style.left = (listaUsada.x) + "px"; wrap.style.top = (listaUsada.y) + "px";
    /* primer frame para fijar origen antes de transicionar */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrap.style.left = dest.x + "px";
        wrap.style.top = dest.y + "px";
      });
    });
    clearTimeout(volando);
    volando = setTimeout(function () {
      wrap.classList.remove("gucu--volando");
      wrap.classList.add("gucu--quieto");
      enMovimiento = false;
      if (!silencioso && Math.random() < 0.65) di(PASEOS[Math.floor(Math.random() * PASEOS.length)]);
      volverAlHogarEn(12000); /* a los 12 s regresa a su esquina */
    }, 2500);
  }
  function volverAlHogarEn(ms) {
    clearTimeout(rondin);
    rondin = setTimeout(function () { moverA(0, true); }, ms);
  }
  /* Cada ~35 s, si no hay bocadillo abierto, sale de paseo */
  setInterval(function () {
    if (!REDUCIDO && burbuja.hidden && !arrastrando && !enMovimiento) moverA();
  }, 35000);

  /* ---------- Arrastrar con mouse o dedo ---------- */
  var arrastrando = false, dx = 0, dy = 0, movio = 0;
  btn.addEventListener("pointerdown", function (e) {
    arrastrando = true; movio = 0;
    var r = wrap.getBoundingClientRect();
    dx = e.clientX - r.left; dy = e.clientY - r.top;
    wrap.classList.add("gucu--arrastrando");
    clearTimeout(volando); clearTimeout(rondin);
    wrap.style.left = r.left + "px"; wrap.style.top = r.top + "px";
    wrap.style.right = "auto"; wrap.style.bottom = "auto";
    btn.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  btn.addEventListener("pointermove", function (e) {
    if (!arrastrando) return;
    movio += Math.abs(e.movementX) + Math.abs(e.movementY);
    wrap.style.left = (e.clientX - dx) + "px";
    wrap.style.top = (e.clientY - dy) + "px";
  });
  btn.addEventListener("pointerup", function (e) {
    arrastrando = false;
    wrap.classList.remove("gucu--arrastrando");
    if (movio < 6) { /* fue un clic, no un arrastre */
      if (burbuja.hidden) { di(TIPS[ix % TIPS.length]); ix++; } else burbuja.hidden = true;
      volverAlHogarEn(60000);
    } else {
      volverAlHogarEn(30000); /* tras soltarlo, a los 30 s vuelve a su esquina */
    }
  });
  btn.addEventListener("pointercancel", function () { arrastrando = false; wrap.classList.remove("gucu--arrastrando"); volverAlHogarEn(30000); });

  /* ---------- Botones de silenciar ---------- */
  wrap.querySelector("[data-gucu-hoy]").addEventListener("click", function () {
    try { sessionStorage.setItem("tr-gucu:hoy", "1"); } catch (e) {}
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    wrap.remove();
  });
  wrap.querySelector("[data-gucu-adios]").addEventListener("click", function () {
    if (confirm("¿Querés que Gucu ya no aparezca en este navegador? (podés reactivarlo borrando los datos del sitio)")) {
      try { localStorage.setItem("tr-gucu:adios", "1"); } catch (e) {}
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      wrap.remove();
    }
  });

  /* ---------- Saludo inicial ---------- */
  var yaSalude = false;
  try { yaSalude = !!sessionStorage.getItem("tr-gucu:saludo"); } catch (e) {}
  setTimeout(function () {
    if (!yaSalude) { di(SALUDO); ix = 1; try { sessionStorage.setItem("tr-gucu:saludo", "1"); } catch (e) {} }
  }, 2600);
})();
