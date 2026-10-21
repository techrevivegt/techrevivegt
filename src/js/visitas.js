/* ==========================================================================
   TECHREVIVE · Estadísticas de visitas (propias, sin servicios externos)
   Registra la página vista, de dónde llegó la persona y cuánto tiempo estuvo.
   El país, la ciudad, el dispositivo y la IP los agrega el servidor.
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

  // Tiempo en la página: solo cuenta mientras la pestaña está visible.
  var total = 0, since = document.visibilityState === "visible" ? Date.now() : 0, lastSent = -1;
  function flush() {
    if (since) { total += Date.now() - since; since = 0; }
    var secs = Math.round(total / 1000);
    if (secs > 0 && secs !== lastSent) { lastSent = secs; send("/api/v/fin", { pid: pid, d: secs }); }
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flush();
    else if (!since) since = Date.now();
  });
  window.addEventListener("pagehide", flush);
})();
