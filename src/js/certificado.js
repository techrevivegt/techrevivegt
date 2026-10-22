/* TECHREVIVE · Certificado público y verificación (/certificado?c=CÓDIGO) */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var cfg = {};
  try { cfg = JSON.parse(($("#cert-config") || {}).textContent || "{}"); } catch (e) { /* nada */ }
  var form = $("[data-form]"), msg = $("[data-msg]");
  var code = (new URLSearchParams(location.search).get("c") || "").trim().toUpperCase();

  function fechaLarga(iso, ts) {
    var d = iso ? new Date(iso + "T12:00:00") : new Date(ts || Date.now());
    if (isNaN(d)) return iso || "";
    return d.toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
  }
  function set(name, val) { var el = document.querySelector('[data-f="' + name + '"]'); if (el) el.textContent = val; }

  // Ajusta el tamaño del nombre y del curso para que siempre quepan en el certificado
  function fit(sel, max, min, lines) {
    var el = document.querySelector(sel);
    if (!el) return;
    var size = max;
    el.style.fontSize = size + "pt";
    var tooBig = function () {
      if (lines === 1) return el.scrollWidth > el.clientWidth + 1;
      var cs = getComputedStyle(el);
      var lh = parseFloat(cs.lineHeight) || size * 1.6;
      var alto = el.scrollHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
      return el.scrollWidth > el.clientWidth + 1 || alto > lh * lines + 2;
    };
    while (tooBig() && size > min) { size -= 1; el.style.fontSize = size + "pt"; }
  }
  function fitAll() {
    var n = document.querySelector('[data-f="nombre"]');
    if (n) {
      n.style.whiteSpace = "";
      fit('[data-f="nombre"]', 44, 30, 1);
      // Nombres muy largos: se permiten dos líneas en lugar de achicar demasiado la letra
      if (n.scrollWidth > n.clientWidth + 1) { n.style.whiteSpace = "normal"; fit('[data-f="nombre"]', 34, 18, 2); }
    }
    fit('[data-f="curso"]', 24, 13, 2);
  }

  function scale() {
    var stage = $("[data-stage]"), cert = $("[data-cert]");
    if (stage.hidden) return;
    var w = stage.clientWidth, base = cert.offsetWidth;
    var k = Math.min(1, w / base);
    cert.style.transform = "scale(" + k + ")";
    stage.style.height = Math.ceil(cert.offsetHeight * k) + "px";
  }

  function show(d) {
    var url = location.origin + "/certificado?c=" + d.id;
    set("nombre", d.nombre);
    set("curso", d.curso);
    var horas = d.horas ? (/[a-z]/i.test(d.horas) ? d.horas : d.horas + " horas") : "";
    set("horas", horas);
    var fh = document.querySelector('[data-fact="horas"]'); if (fh) fh.hidden = !horas;
    set("fecha", fechaLarga(d.fecha, d.emitido));
    set("id", d.id);
    set("url", location.host + "/certificado");
    $("[data-code]").textContent = d.id;
    fitAll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitAll(); scale(); });
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", function () { fitAll(); });
    window.addEventListener("load", function () { fitAll(); });
    window.addEventListener("beforeprint", function () { fitAll(); });
    var qrBox = $("[data-qr]");
    if (window.qrcode) {
      var qr = qrcode(0, "M"); qr.addData(url); qr.make();
      qrBox.innerHTML = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
    }
    document.title = "Certificado de " + d.nombre + " · TechRevive";
    $('[data-state="buscar"]').hidden = true;
    $("[data-verified]").hidden = false;
    $("[data-stage]").hidden = false;
    $("[data-tools]").hidden = false;
    $("[data-wa]").href = "https://wa.me/?text=" + encodeURIComponent("Mi certificado del curso «" + d.curso + "» de TechRevive: " + url);
    $("[data-copy]").onclick = function () {
      var b = this;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
        b.textContent = "¡Enlace copiado!"; setTimeout(function () { b.textContent = "Copiar enlace"; }, 2000);
      }).catch(function () { prompt("Copia este enlace:", url); });
    };
    $("[data-print]").onclick = function () { window.print(); };
    scale();
  }

  function lookup(c) {
    msg.className = "certp__msg"; msg.textContent = "Buscando…";
    fetch("/api/certificado?c=" + encodeURIComponent(c), { cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d.revocado) { msg.className = "certp__msg is-bad"; msg.textContent = "El certificado " + c + " fue anulado y ya no es válido."; return; }
        if (!res.ok) throw new Error(res.d.error || "No encontramos un certificado con ese código.");
        msg.textContent = ""; show(res.d);
      })
      .catch(function (e) {
        msg.className = "certp__msg is-bad";
        msg.textContent = e.message === "Failed to fetch" ? "No hay conexión. Inténtalo de nuevo." : e.message;
      });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var c = form.elements.c.value.trim().toUpperCase();
    if (!/^TR-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)) { msg.className = "certp__msg is-bad"; msg.textContent = "El código tiene la forma TR-XXXX-XXXX."; return; }
    history.replaceState(null, "", "?c=" + c);
    lookup(c);
  });
  window.addEventListener("resize", scale);
  window.addEventListener("beforeprint", function () { var c = $("[data-cert]"); if (c) c.style.transform = "none"; $("[data-stage]").style.height = ""; });
  window.addEventListener("afterprint", scale);
  if (code) { form.elements.c.value = code; lookup(code); }
})();
