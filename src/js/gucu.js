/* ==========================================================================
   TECHREVIVE · Gucu — la mascota-guía del sitio 🐍⚡ (v6 «modo mascota»)
   · Sin cuadros de diálogo: nunca despliega texto en pantalla.
   · Modo tranquilo: siempre quieto en su esquina; no se mueve ni habla solo.
   · Si el visitante le da CLIC: habla en voz alta (voz grabada, /audio/gucu/)
     y cambia su pose; si le dan otro clic, calla.
   · Arrastrable con mouse o dedo: se queda donde lo dejaron.
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

  /* línea de voz (y pose) según la página */
  var RUTA = location.pathname.toLowerCase();
  var LINEA = (RUTA === "/" || RUTA.endsWith("index.html")) ? ["saludo", "saludando"]
    : RUTA.indexOf("servicio") > -1 ? ["servicios", "soldador"]
    : RUTA.indexOf("cotiz") > -1 || RUTA.indexOf("tarifa") > -1 ? ["cotizador", "calculadora"]
    : RUTA.indexOf("contacto") > -1 ? ["contacto", "telefono"]
    : RUTA.indexOf("seguimiento") > -1 ? ["seguimiento", "lupa"]
    : RUTA.indexOf("diagnostico") > -1 ? ["diagnostico", "doctor"]
    : ["generico", "normal"];
  var PASEOS = [["paseo1", "sorprendido"], ["paseo2", "graduado"], ["paseo3", "pensando"], ["paseo4", "riendo"], ["paseo5", "durmiendo"]];
  var paseoIx = 0, clicN = 0;

  /* ---------- Estilos ---------- */
  var st = document.createElement("style");
  st.textContent = [
    ".gucu{position:fixed;right:18px;bottom:96px;z-index:900;line-height:0;touch-action:none;user-select:none;border:0;background:transparent;cursor:grab;padding:0;filter:drop-shadow(0 8px 18px rgba(4,18,50,.45))}",
    ".gucu:active{cursor:grabbing}",
    "@media print{.gucu{display:none!important}}",
    (REDUCIDO ? "" : ".gucu img{animation:gucu-latido 4.5s ease-in-out infinite}"),
    "@keyframes gucu-latido{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.015)}}",
    ".gucu img{width:104px;height:auto;display:block;pointer-events:none}",
    ".gucu::after{content:'Gucu';position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);background:#0b1f4e;color:#fff;font:700 10px/1.6 Inter,system-ui,sans-serif;padding:3px 8px;border-radius:999px;cursor:pointer;pointer-events:none}",
    ".gucu:focus-visible{outline:3px solid #22d3ee;outline-offset:4px;border-radius:14px}",
    "@media(max-width:520px){.gucu img{width:82px}.gucu{right:12px;bottom:88px}}"
  ].join("\n");
  document.head.appendChild(st);

  /* ---------- La mascota ---------- */
  var b = document.createElement("button");
  b.type = "button";
  b.className = "gucu";
  b.setAttribute("aria-label", "Gucu, la mascota del sitio: dame clic y te hablo, o arrastramé");
  var img = document.createElement("img");
  img.width = 130; img.height = 195; img.alt = ""; img.draggable = false;
  b.appendChild(img);
  document.body.appendChild(b);

  /* sprites con respaldo en cadena */
  function sprite(p) {
    var cadenas = [BASE + POSES[p] + ".webp", BASE + POSES[p] + ".png", BASE + POSES.normal + ".webp", BASE + POSES.normal + ".png"];
    var n = 0;
    (function pon() { img.onerror = function () { n++; if (n < cadenas.length) pon(); }; img.src = cadenas[n]; })();
  }
  sprite("normal");

  /* ---------- Voz (audios grabados + voz del navegador de respaldo) ---------- */
  var voz = true, gesto = false, audio = null;
  try { if (localStorage.getItem("tr-gucu:voz") === "0") voz = false; } catch (e) {}
  function calla() {
    try { if (audio) { audio.pause(); audio.currentTime = 0; } if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  }
  function habla(clave, pose) {
    if (!voz || !gesto) { sprite(pose); setTimeout(function () { sprite("normal"); }, 3000); return; }
    calla();
    audio = new Audio(AU + clave + ".mp3");
    audio.onplay = function () { sprite(pose); };
    audio.onended = function () { sprite("normal"); };
    audio.onerror = function () {
      if (!("speechSynthesis" in window)) return;
      try {
        var u = new SpeechSynthesisUtterance("");
        u.lang = "es-GT"; u.rate = 1.05; u.pitch = 1.1;
        speechSynthesis.speak(u); sprite(pose);
        setTimeout(function () { sprite("normal"); }, 3500);
      } catch (e) {}
    };
    var pr = audio.play(); if (pr && pr.catch) pr.catch(function () {});
  }
  function primerGesto() { gesto = true; }
  document.addEventListener("pointerdown", primerGesto, { once: false });
  document.addEventListener("keydown", primerGesto, { once: false });

  /* ---------- Arrastre + clic ---------- */
  var arrastrando = false, ddx = 0, ddy = 0, movio = 0;
  b.addEventListener("pointerdown", function (e) {
    arrastrando = true; movio = 0; gesto = true; calla();
    var r = b.getBoundingClientRect();
    ddx = e.clientX - r.left; ddy = e.clientY - r.top;
    b.style.transition = "none";
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
    if (movio < 6) {
      /* clic: habla una línea de la página; segundos clics: frases sueltas */
      if (clicN === 0) habla(LINEA[0], LINEA[1]);
      else { var p = PASEOS[paseoIx++ % PASEOS.length]; habla(p[0], p[1]); }
      clicN++;
    } else {
      sprite(movio > 400 ? "enojado" : "zen");
      setTimeout(function () { sprite("normal"); }, 3500);
    }
  });
  b.addEventListener("pointercancel", function () { arrastrando = false; });
})();
