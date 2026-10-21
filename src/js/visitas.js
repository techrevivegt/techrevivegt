/* ==========================================================================
   TECHREVIVE · Estadísticas de visitas (propias, sin servicios externos)
   Registra la página vista, de dónde llegó la persona, cuánto tiempo estuvo
   y cuánto tiempo pasó en cada sección (Portada, Servicios, Contacto…).
   El país, la ciudad, el dispositivo y la IP los agrega el servidor.
   El tiempo solo cuenta con la pestaña visible y si la persona está activa.
   Para no contar tus propias visitas: Panel → Estadísticas → «No contar mis visitas».
   ========================================================================== */
(function () {
  "use strict";
  try {
    if (location.pathname.indexOf("/panel") === 0) return;
    if (localStorage.getItem("tr-noseguir") === "1") return;
    if (navigator.webdriver && localStorage.getItem("tr-vtest") !== "1") return;
  } catch (e) { return; }

  function rid() {
    if (window.crypto && crypto.getRandomValues) {
      var b = crypto.getRandomValues(new Uint8Array(12)), s = "";
      for (var i = 0; i < b.length; i++) s += ("0" + b[i].toString(16)).slice(-2);
      return s;
    }
    return (Date.now().toString(36) + Math.random().toString(36).slice(2) + "000000000000").slice(0, 24);
  }
  function keep(store, key) {
    try { var v = store.getItem(key); if (!v) { v = rid(); store.setItem(key, v); } return v; } catch (e) { return rid(); }
  }
  function send(url, data) {
    var body = JSON.stringify(data);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }))) return;
    } catch (e) { /* sigue */ }
    try { fetch(url, { method: "POST", body: body, keepalive: true, credentials: "same-origin", headers: { "Content-Type": "text/plain" } }); } catch (e) { /* nada */ }
  }

  var pid = rid();
  send("/api/v", {
    pid: pid,
    vid: keep(localStorage, "tr-vid"),
    sid: keep(sessionStorage, "tr-sid"),
    r: location.pathname,
    t: document.title,
    f: document.referrer,
    s: (screen.width || 0) + "x" + (screen.height || 0),
    l: navigator.language || "",
  });

  /* ---------- Secciones ---------- */
  // Nombre corto de cada sección. Se puede forzar con data-seccion="Nombre" en el HTML.
  var BY_ID = { inicio: "Portada", servicios: "Servicios", nosotros: "¿Por qué TechRevive?", capacitacion: "Capacitación", desarrollo: "Desarrollo web y apps", proyectos: "Proyectos", testimonios: "Testimonios", recursos: "Blog y consejos", contacto: "Contacto", proceso: "Nuestro proceso", preguntas: "Preguntas" };
  var BY_CLASS = [["hero", "Portada"], ["page-hero", "Portada"], ["process", "Nuestro proceso"], ["testimonials", "Testimonios"], ["contact", "Contacto"], ["cta", "Llamado a la acción"], ["values", "Propuesta de valor"]];
  var AULA = [[".aula-course-hero", "Portada del curso"], [".aula-video", "Video"], [".quiz", "Cuestionario"], [".aula-task", "Tarea"], [".aula-mats", "Materiales"], [".aula-rich", "Lectura"], [".aula-cert", "Certificado"], [".aula-courses", "Mis cursos"], [".aula-ol", "Contenido del curso"]];

  function clean(t) { return String(t || "").replace(/\s+/g, " ").trim().slice(0, 50); }
  function nameOf(el) {
    if (el.__trn) return el.__trn;
    var n = el.getAttribute("data-seccion");
    if (!n && el.__aula) n = el.__aula;
    if (!n && el.tagName === "FOOTER") n = "Pie de página";
    if (!n && el.id && BY_ID[el.id] && !/\bhero\b/.test(el.className)) n = BY_ID[el.id];
    if (!n) {
      var cls = " " + (el.className || "") + " ";
      for (var i = 0; i < BY_CLASS.length && !n; i++) if (cls.indexOf(" " + BY_CLASS[i][0] + " ") >= 0) n = BY_CLASS[i][1];
    }
    if (!n) n = el.getAttribute("aria-label");
    if (!n) {
      var by = el.getAttribute("aria-labelledby"), hd = (by && document.getElementById(by)) || el.querySelector("h1, h2, h3");
      if (hd) n = hd.textContent;
    }
    el.__trn = clean(n || el.id || "Contenido") || "Contenido";
    return el.__trn;
  }
  var parts = null;
  function collect() {
    var list = [];
    if (location.pathname.indexOf("/aula") === 0) {
      AULA.forEach(function (a) {
        var nodes = document.querySelectorAll(a[0]);
        for (var i = 0; i < nodes.length; i++) if (!nodes[i].closest(".aula-side")) { nodes[i].__aula = a[1]; list.push(nodes[i]); }
      });
      list.sort(function (x, y) { return x.compareDocumentPosition(y) & 4 ? -1 : 1; });
    } else {
      var secs = document.querySelectorAll("section, footer");
      for (var j = 0; j < secs.length; j++) if (!secs[j].parentElement.closest("section")) list.push(secs[j]);
    }
    return list;
  }
  function current() {
    if (!parts) parts = collect();
    var line = window.innerHeight * 0.4, i, r;
    for (i = 0; i < parts.length; i++) {
      r = parts[i].getBoundingClientRect();
      if (r.height && r.top <= line && r.bottom > line) return nameOf(parts[i]);
    }
    for (i = parts.length - 1; i >= 0; i--) {   // final de la página: la última sección visible
      r = parts[i].getBoundingClientRect();
      if (r.height && r.top < window.innerHeight && r.bottom > 0) return nameOf(parts[i]);
    }
    return location.pathname.indexOf("/aula/") === 0 && location.pathname.split("/").length > 3 ? "Clase" : "Contenido";
  }

  /* ---------- Tiempo ---------- */
  var total = 0, secs = {}, nSecs = 0, lastSent = -1, lastAct = Date.now(), IDLE = 5 * 60 * 1000;
  ["scroll", "mousemove", "keydown", "touchstart", "click", "wheel"].forEach(function (ev) {
    window.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true });
  });
  function flush() {
    if (total > 0 && total !== lastSent) { lastSent = total; send("/api/v/fin", { pid: pid, d: total, s: secs }); }
  }
  setInterval(function () {
    if (document.visibilityState !== "visible" || Date.now() - lastAct > IDLE) return;
    total++;
    var n = current();
    if (secs[n] == null) { if (nSecs >= 25) n = "Otras"; else nSecs++; }
    secs[n] = (secs[n] || 0) + 1;
    if (total % 60 === 0) flush();   // guarda cada minuto por si se cierra de golpe
  }, 1000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flush(); else lastAct = Date.now();
  });
  window.addEventListener("pagehide", flush);
})();
