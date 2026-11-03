/* ==========================================================================
   TECHREVIVE · Gucu — el guía del sitio 🐍⚡ (v3 «deidad con vida»)
   · HABLA con voz grabada (audios en /audio/gucu/), no robotizada.
   · DIALOGÁ con el visitante: el bocadillo trae botones de conversación
     (reparar / aprender / cotizar / saludar) y Gucu responde y lo lleva.
   · AUTONOMÍA: saluda solo, sale de paseo volando y comenta solo.
   · Posiciones de acción: normal, hablando, volando (sprites distintos).
   · Libre: se puede arrastrar con mouse o dedo. Silenciable.
   El navegador exige un primer clic en la página antes de sonar (regla de
   Chrome/Firefox); desde ese gesto, Gucu habla con autonomía.
   ========================================================================== */
(function () {
  "use strict";
  var REDUCIDO = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try { if (localStorage.getItem("tr-gucu:adios") === "1") return; } catch (e) {}
  try { if (sessionStorage.getItem("tr-gucu:hoy") === "1") return; } catch (e) {}

  var BASE = "/img/", AU = "/audio/gucu/";
  /* Vestidor de Gucu: 21 poses. Se usa una según lo que está haciendo/sintiendo. */
  var POSES = ["normal", "hablando", "volando", "saludando", "senalando", "pensando", "riendo",
    "sorprendido", "enojado", "durmiendo", "guino", "llorando", "soldador", "graduado",
    "calculadora", "telefono", "doctor", "laptop", "lupa", "zen", "celebrando"];
  function archivo(p, ext) { return (p === "normal" ? "gucu-mascota" : "gucu-" + p) + ext; }

  /* ---------- Guion de Gucu (texto + audio por clave) ---------- */
  var GUION = {
    saludo: "¡Te doy la bienvenida, visitante! Soy Gucu, serpiente emplumada de la tecnología. Dame clic si necesitás guía… o arrastrame de paseo 🐾",
    inicio: "Ante ti, mi templo digital. Servicios, cursos gratis y un cotizador veloz. ¿Arreglar, aprender, o cotizar?",
    servicios: "Estos son mis oficios ancestrales: reparación, mantenimiento, rescate de datos… Elegí el que suene a tu problema 🔧",
    cotizador: "Has hallado el oráculo de los precios 💲 Marcá lo que necesita tu equipo y tu presupuesto volará a tu WhatsApp.",
    contacto: "Canal directo con mis sacerdotes… digo, con el taller 😄 Escribinos por WhatsApp, respondemos rapidito.",
    seguimiento: "Pegá tu código de orden y tu teléfono, y te revelo el destino de tu equipo al instante 🔎",
    diagnostico: "El doctor digital te hará sus preguntas. Contestá con sinceridad y hallarás la verdad sobre tu máquina 🩺",
    generico: "Soy Gucu, tu guía maya-tecnológica 🐍 Si te perdés, dame clic y yo te oriento.",
    opciones: "Decidí tu camino, viajero. Tocá un botón y yo te llevo:",
    vamos: "¡Ajá! Excelente elección. Por aquí, sígueme… Que los circuitos te acompañen ⚡",
    saludada: "Saludo recibido con honores, viajero. Aquí andaré flotando por si me necesitás. ¡Que Gucumatz bendiga tu WiFi! ✨",
    paseo1: "Por los circuitos sagrados… qué bonito sitio hemos construido.",
    paseo2: "En mis tiempos enseñaba astronomía; hoy enseño a formatear laptops. Los tiempos cambian, visitante.",
    paseo3: "Dato ancestral: una limpieza cada seis meses evita que tu compu muera joven. Anotalo 🧼",
    paseo4: "¿Sabías que también reparamos laptops gamer? Las deidades… también juegan 🎮",
    paseo5: "Flotar todo el día es agotador, te lo confieso. Menos mal que soy una deidad ⚡",
  };
  var PASEOS = ["paseo1", "paseo2", "paseo3", "paseo4", "paseo5"];

  var RUTA = location.pathname.toLowerCase();
  var PAGINA = (RUTA === "/" || RUTA.endsWith("index.html")) ? "inicio"
    : RUTA.indexOf("servicio") > -1 ? "servicios"
    : RUTA.indexOf("cotiz") > -1 || RUTA.indexOf("tarifa") > -1 ? "cotizador"
    : RUTA.indexOf("contacto") > -1 ? "contacto"
    : RUTA.indexOf("seguimiento") > -1 ? "seguimiento"
    : RUTA.indexOf("diagnostico") > -1 ? "diagnostico"
    : "generico";

  /* Botones de diálogo: [texto, clave-destino] */
  var DESTINOS = {
    reparar: ["servicios.html", "🔧 Reparar mi equipo"],
    aprender: ["/aula/", "🎓 Quiero aprender"],
    cotizar: ["cotizador.html", "💲 Cotizar algo"],
  };

  /* ---------- Estilos ---------- */
  var st = document.createElement("style");
  st.textContent = [
    ".gucu{position:fixed;right:18px;bottom:100px;z-index:900;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:Inter,system-ui,sans-serif;transition:left 2.4s cubic-bezier(.45,.05,.35,1),top 2.4s cubic-bezier(.45,.05,.35,1),right 2.4s cubic-bezier(.45,.05,.35,1),bottom 2.4s cubic-bezier(.45,.05,.35,1)}",
    "@media print{.gucu{display:none!important}}",
    ".gucu--arrastrando{transition:none!important}",
    ".gucu__btn{border:0;background:transparent;cursor:grab;padding:0;line-height:0;position:relative;filter:drop-shadow(0 8px 18px rgba(4,18,50,.45));touch-action:none;user-select:none}",
    ".gucu__btn:active{cursor:grabbing}",
    (REDUCIDO ? "" : ".gucu--quieto .gucu__btn img{animation:gucu-latido 4.5s ease-in-out infinite}"),
    "@keyframes gucu-latido{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.015)}}",
    ".gucu__btn img{width:104px;height:auto;display:block;transition:transform .3s;pointer-events:none}",
    ".gucu--volando .gucu__btn img{animation:none}",
    ".gucu--izq .gucu__btn img{transform:scaleX(-1)}",
    ".gucu--izq .gucu__btn::after{transform:translateX(-50%) scaleX(1)}",
    ".gucu__btn::after{content:'Gucu';position:absolute;left:50%;bottom:-4px;transform:translateX(-50%);background:#0b1f4e;color:#fff;font:700 10px/1 Inter,sans-serif;padding:3px 8px;border-radius:999px;box-shadow:0 3px 8px rgba(0,0,0,.25)}",
    ".gucu__btn:focus-visible{outline:3px solid #22d3ee;outline-offset:4px;border-radius:14px}",
    ".gucu__burbuja{position:relative;max-width:265px;background:#fff;border:1px solid #dbe3ee;border-radius:16px;padding:12px 14px;box-shadow:0 14px 34px rgba(10,20,60,.22);color:#152238;font-size:13.5px;line-height:1.45}",
    ".gucu__burbuja::after{content:'';position:absolute;right:34px;bottom:-9px;width:16px;height:16px;background:#fff;border-right:1px solid #dbe3ee;border-bottom:1px solid #dbe3ee;transform:rotate(45deg)}",
    ".gucu--izq .gucu__burbuja{align-self:flex-start} .gucu--izq .gucu__burbuja::after{right:auto;left:34px}",
    ".gucu__burbuja small{display:block;margin-top:8px;font-size:11px;color:#64748b}",
    ".gucu__ops{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap}",
    ".gucu__ops button{border:1.5px solid #1d4ed8;background:#eff6ff;border-radius:999px;padding:5px 11px;font:700 12px Inter,sans-serif;color:#1d4ed8;cursor:pointer}",
    ".gucu__ops button:hover{background:#1d4ed8;color:#fff}",
    ".gucu__acciones{display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap}",
    ".gucu__acciones button{border:1px solid #dbe3ee;background:#f8fafc;border-radius:8px;padding:4px 8px;font:600 11px Inter,sans-serif;color:#334155;cursor:pointer}",
    ".gucu__acciones button:hover{border-color:#22d3ee;color:#0e7490}",
    "@media(max-width:520px){.gucu__btn img{width:82px}.gucu{right:12px;bottom:92px}.gucu__burbuja{max-width:215px}}",
  ].join("\n");
  document.head.appendChild(st);

  /* ---------- Widget ---------- */
  var wrap = document.createElement("div");
  wrap.className = "gucu gucu--quieto";
  wrap.innerHTML =
    '<div class="gucu__burbuja" hidden role="status">' +
    '<span data-gucu-text></span>' +
    '<div class="gucu__ops" data-gucu-ops hidden></div>' +
    '<small>Gucu · deidad maya de la tecnología · podés arrastrarme 🐾</small>' +
    '<div class="gucu__acciones">' +
    '<button type="button" data-gucu-voz>🔊 Voz: <span data-gucu-voz-estado>encendida</span></button>' +
    '<button type="button" data-gucu-hoy>Silenciar hoy</button>' +
    '<button type="button" data-gucu-adios title="No mostrar más en este navegador">✕</button>' +
    "</div></div>" +
    '<button type="button" class="gucu__btn" aria-label="Gucu, tu guía: dame clic o arrastramé">' +
    '<img alt="" width="130" height="195" draggable="false" /></button>';
  document.body.appendChild(wrap);

  var btn = wrap.querySelector(".gucu__btn");
  var img = wrap.querySelector("img");
  var burbuja = wrap.querySelector(".gucu__burbuja");
  var txtEl = wrap.querySelector("[data-gucu-text]");
  var opsEl = wrap.querySelector("[data-gucu-ops]");
  var vozBtn = wrap.querySelector("[data-gucu-voz]");
  var vozEstado = wrap.querySelector("[data-gucu-voz-estado]");

  /* ---------- Sprites (webp → png → normal) ---------- */
  function sprite(cual) {
    var cadenas = [archivo(cual, ".webp"), archivo(cual, ".png"), archivo("normal", ".webp"), archivo("normal", ".png")];
    var n = 0;
    function pon() { img.onerror = function () { n++; if (n < cadenas.length - 1) pon(); }; img.src = BASE + cadenas[n]; }
    pon();
  }
  sprite("normal");

  /* poses que acompañan a cada frase */
  var POSE_LINEA = {
    saludo: "saludando", inicio: "saludando", opciones: "senalando", vamos: "guino",
    saludada: "llorando", servicios: "soldador", cotizador: "calculadora",
    contacto: "telefono", seguimiento: "lupa", diagnostico: "doctor",
    paseo1: "sorprendido", paseo2: "graduado", paseo3: "pensando",
    paseo4: "riendo", paseo5: "durmiendo", generico: "normal"
  };

  /* ---------- Voz: audios grabados + plan B del navegador ---------- */
  var voz = true, gesto = false, audio = null;
  try { if (localStorage.getItem("tr-gucu:voz") === "0") voz = false; } catch (e) {}
  function pintaVoz() { vozEstado.textContent = voz ? "encendida" : "apagada"; }
  pintaVoz();
  function limpia(t) { return t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{26A0}\u{2690}]/gu, "").trim(); }
  function calla() {
    try { if (audio) { audio.pause(); audio.currentTime = 0; } if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
    if (!enVuelo) sprite("normal");
  }
  function habla(clave) {
    var texto = GUION[clave] || "";
    var pose = POSE_LINEA[clave] || "hablando";
    if (!voz || !gesto) { if (clave) sprite(pose); setTimeout(function () { if (!enVuelo && !siesta) sprite("normal"); }, 3000); return; }
    calla();
    audio = new Audio(AU + clave + ".mp3");
    audio.onplay = function () { sprite(pose); };
    audio.onended = function () { if (!enVuelo && !siesta) sprite("normal"); };
    audio.onerror = function () { /* plan B: voz del navegador */
      if (!("speechSynthesis" in window)) return;
      try {
        var u = new SpeechSynthesisUtterance(limpia(texto));
        u.lang = "es-GT"; u.rate = 1.05; u.pitch = 1.1;
        window.speechSynthesis.speak(u);
        sprite(pose);
        setTimeout(function () { if (!enVuelo && !siesta) sprite("normal"); }, 3500);
      } catch (e) {}
    };
    var pr = audio.play();
    if (pr && pr.catch) pr.catch(function () {});
  }
  function primerGesto() {
    gesto = true;
    document.removeEventListener("pointerdown", primerGesto);
    document.removeEventListener("keydown", primerGesto);
    /* si hay bocadillo visible al primer gesto, lo lee en voz alta */
    if (!burbuja.hidden && ultimaClave) habla(ultimaClave);
  }
  document.addEventListener("pointerdown", primerGesto);
  document.addEventListener("keydown", primerGesto);
  vozBtn.addEventListener("click", function () {
    voz = !voz;
    try { localStorage.setItem("tr-gucu:voz", voz ? "1" : "0"); } catch (e) {}
    pintaVoz();
    if (!voz) calla(); else if (ultimaClave) habla(ultimaClave);
  });

  /* ---------- Bocadillo + diálogos ---------- */
  var ultimaClave = null, ocultar = null;
  function di(clave, conOpciones) {
    ultimaClave = clave;
    despierta();
    txtEl.textContent = GUION[clave] || clave;
    opsEl.hidden = !conOpciones;
    opsEl.innerHTML = "";
    if (conOpciones) {
      Object.keys(DESTINOS).forEach(function (k) {
        var o = document.createElement("button");
        o.type = "button"; o.textContent = DESTINOS[k][1];
        o.addEventListener("click", function () {
          di("vamos");
          setTimeout(function () { location.href = DESTINOS[k][0]; }, 1600);
        });
        opsEl.appendChild(o);
      });
      var solo = document.createElement("button");
      solo.type = "button"; solo.textContent = "👋 Solo saludaba";
      solo.addEventListener("click", function () {
        di("saludada");
        setTimeout(function () { burbuja.hidden = true; }, 5000);
      });
      opsEl.appendChild(solo);
    } else {
      txtEl.textContent = GUION[clave] || clave;
    }
    burbuja.hidden = false;
    habla(clave);
    clearTimeout(ocultar);
    ocultar = setTimeout(function () { burbuja.hidden = true; }, 12000);
  }

  /* ---------- Siesta: se queda dormido si nadie lo mira ---------- */
  var siesta = false, vigilant = null;
  function despierta() {
    if (siesta) { siesta = false; sprite("normal"); }
    clearTimeout(vigilant);
    vigilant = setTimeout(function () {
      if (burbuja.hidden && !enVuelo && !arrastrando && !REDUCIDO) { siesta = true; sprite("durmiendo"); }
    }, 60000);
  }
  despierta();

  /* ---------- Arrastre libre (se queda donde el visitante lo deja) ---------- */
  var enVuelo = false; /* ya no vuela solo; variable por compatibilidad de estados */
  var arrastrando = false, ddx = 0, ddy = 0, movio = 0;
  btn.addEventListener("pointerdown", function (e) {
    arrastrando = true; movio = 0; despierta();
    var r = wrap.getBoundingClientRect();
    ddx = e.clientX - r.left; ddy = e.clientY - r.top;
    wrap.classList.add("gucu--arrastrando");
    calla();
    wrap.style.left = r.left + "px"; wrap.style.top = r.top + "px";
    wrap.style.right = "auto"; wrap.style.bottom = "auto";
    try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  btn.addEventListener("pointermove", function (e) {
    if (!arrastrando) return;
    movio += Math.abs(e.movementX) + Math.abs(e.movementY);
    var maxX = window.innerWidth - 60, maxY = window.innerHeight - 60;
    wrap.style.left = Math.min(Math.max(e.clientX - ddx, -20), maxX) + "px";
    wrap.style.top = Math.min(Math.max(e.clientY - ddy, -20), maxY) + "px";
  });
  btn.addEventListener("pointerup", function () {
    arrastrando = false;
    wrap.classList.remove("gucu--arrastrando");
    if (movio < 6) {
      if (burbuja.hidden) di(PAGINA === "inicio" ? "opciones" : PAGINA, PAGINA === "inicio" || PAGINA === "generico");
      else burbuja.hidden = true;
    } else {
      /* lo arrastraron de verdad: sonrisa zen donde lo dejaron, o mohín cómico si lo trajinaron mucho */
      sprite(movio > 400 ? "enojado" : "zen");
      setTimeout(function () { if (!enVuelo && !siesta) sprite("normal"); }, 3500);
    }
    despierta();
  });
  btn.addEventListener("pointercancel", function () { arrastrando = false; wrap.classList.remove("gucu--arrastrando"); });

  /* ---------- Silenciar ---------- */
  wrap.querySelector("[data-gucu-hoy]").addEventListener("click", function () {
    try { sessionStorage.setItem("tr-gucu:hoy", "1"); } catch (e) {}
    calla(); wrap.remove();
  });
  wrap.querySelector("[data-gucu-adios]").addEventListener("click", function () {
    if (confirm("¿Querés que Gucu ya no aparezca en este navegador? (podés reactivarlo borrando los datos del sitio)")) {
      try { localStorage.setItem("tr-gucu:adios", "1"); } catch (e) {}
      calla(); wrap.remove();
    }
  });

  /* ---------- Tranquilo: Gucu no habla ni se mueve por su cuenta ----------
     Solo responde con voz y bocadillo cuando el visitante le da clic
     (queriendo chatear). El botón de voz y los silencios siguen iguales. */
})();
