/* ==========================================================================
   TECHREVIVE · Seguimiento de reparación (consulta pública por código)
   Admite enlace directo: seguimiento.html?c=OT-7K2QD&t=1234
   ========================================================================== */
(function () {
  "use strict";
  var form = document.getElementById("trk-form");
  if (!form) return;
  var cIn = document.getElementById("trk-c"), tIn = document.getElementById("trk-t");
  var status = form.querySelector(".trk-status"), result = document.getElementById("trk-result"), card = document.getElementById("trk-card");
  var cfg = window.TECHREVIVE_CONFIG || {};
  var STEP = { recibido: 0, diagnostico: 1, aprobacion: 1, repuesto: 2, reparacion: 2, pruebas: 3, listo: 4, entregado: 5 };
  var ICON = { recibido: "📥", diagnostico: "🔎", aprobacion: "✋", repuesto: "📦", reparacion: "🛠️", pruebas: "🧪", listo: "✅", entregado: "🎉", cancelado: "⛔" };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fdt(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    return d.toLocaleDateString("es-GT", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("es-GT", { hour: "numeric", minute: "2-digit" });
  }
  function fdate(s) {
    if (!s) return "";
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return s;
    return new Date(+m[1], m[2] - 1, +m[3]).toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" });
  }
  function normCode(v) {
    v = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (v.indexOf("OT") === 0) v = v.slice(2);
    return v ? "OT-" + v.slice(0, 5) : "";
  }
  cIn.addEventListener("blur", function () { if (cIn.value.trim()) cIn.value = normCode(cIn.value); });
  tIn.addEventListener("input", function () { tIn.value = tIn.value.replace(/\D/g, "").slice(0, 4); });

  function say(msg, kind) { status.textContent = msg || ""; status.className = "trk-status" + (kind ? " is-" + kind : ""); }

  function lookup(auto) {
    var c = normCode(cIn.value), t = tIn.value.replace(/\D/g, "");
    cIn.value = c;
    if (!/^OT-[A-Z0-9]{5}$/.test(c)) { say("El código tiene este formato: OT-7K2QD.", "error"); cIn.focus(); return; }
    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true; say("Buscando tu orden…");
    fetch("/api/seguimiento?c=" + encodeURIComponent(c) + "&t=" + encodeURIComponent(t), { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) throw new Error(x.j.error || "No pudimos consultar tu orden.");
        say("");
        paint(x.j);
        if (window.trEvent) window.trEvent("seguimiento", x.j.titulo || x.j.estado);
        try { history.replaceState(null, "", location.pathname + "?c=" + encodeURIComponent(c) + (t ? "&t=" + t : "")); } catch (e) { /* nada */ }
        if (!auto) result.focus({ preventScroll: true });
        var top = result.getBoundingClientRect().top + window.pageYOffset - 96;
        window.scrollTo({ top: top, behavior: "smooth" });
      })
      .catch(function (err) { result.hidden = true; say(err.message || "No pudimos consultar tu orden. Intenta de nuevo.", "error"); })
      .finally(function () { btn.disabled = false; });
  }

  function paint(o) {
    var idx = STEP[o.estado], cancel = o.estado === "cancelado";
    Array.prototype.forEach.call(result.querySelectorAll(".trk-steps__item"), function (li, i) {
      li.classList.toggle("is-done", !cancel && idx != null && i < idx);
      li.classList.toggle("is-current", !cancel && i === idx);
      if (!cancel && i === idx) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    result.classList.toggle("is-cancelled", cancel);
    result.classList.toggle("is-delivered", o.estado === "entregado");
    var hist = (o.historial || []).slice().reverse();
    var waMsg = "Hola TechRevive, consulto por mi orden " + o.codigo + (o.equipo ? " (" + o.equipo + ")" : "") + ". Estado actual: " + o.titulo + ".";
    var meta = [];
    if (o.equipo) meta.push(["Equipo", o.equipo]);
    if (o.presupuesto) meta.push(["Presupuesto", o.presupuesto]);
    if (o.entrega && o.estado !== "entregado" && !cancel) meta.push(["Entrega estimada", fdate(o.entrega)]);
    meta.push(["Última actualización", fdt(o.actualizado || o.creado)]);
    card.innerHTML =
      '<div class="trk-card__head">' +
        '<span class="trk-card__icon" aria-hidden="true">' + (ICON[o.estado] || "🔧") + "</span>" +
        "<div><p class=\"trk-card__code\">Orden " + esc(o.codigo) + (o.nombre ? " · " + esc(o.nombre) : "") + "</p>" +
        '<h2 class="trk-card__title">' + esc(o.titulo) + "</h2></div>" +
      "</div>" +
      (o.nota ? '<p class="trk-card__note">' + esc(o.nota) + "</p>" : "") +
      (o.estado === "aprobacion" ? '<p class="trk-card__alert">Necesitamos tu confirmación para continuar. Escríbenos por WhatsApp para aprobar el presupuesto.</p>' : "") +
      (o.estado === "listo" ? '<p class="trk-card__alert trk-card__alert--ok">¡Tu equipo está listo! Coordina con nosotros la entrega o recogida.</p>' : "") +
      '<dl class="trk-meta">' + meta.map(function (m) { return "<div><dt>" + esc(m[0]) + "</dt><dd>" + esc(m[1]) + "</dd></div>"; }).join("") + "</dl>" +
      (hist.length ? '<h3 class="trk-card__sub">Historial</h3><ol class="trk-timeline">' + hist.map(function (h, i) {
        return '<li class="' + (i === 0 ? "is-last" : "") + '"><span class="trk-timeline__dot" aria-hidden="true"></span><div><strong>' + esc(h.titulo) + "</strong><time>" + esc(fdt(h.ts)) + "</time>" +
          (h.nota ? "<p>" + esc(h.nota) + "</p>" : "") + "</div></li>";
      }).join("") + "</ol>" : "") +
      '<div class="trk-card__actions">' +
        (cfg.whatsapp ? '<a class="btn btn--primary" target="_blank" rel="noopener" data-ev="Seguimiento de orden" href="https://wa.me/' + esc(cfg.whatsapp) + "?text=" + encodeURIComponent(waMsg) + '">Preguntar por WhatsApp</a>' : "") +
        '<button type="button" class="btn btn--outline" data-trk-refresh>↻ Actualizar</button>' +
      "</div>";
    card.querySelector("[data-trk-refresh]").addEventListener("click", function () { lookup(true); });
    result.hidden = false;
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); lookup(false); });

  var q = new URLSearchParams(location.search);
  if (q.get("c")) {
    cIn.value = normCode(q.get("c"));
    tIn.value = (q.get("t") || "").replace(/\D/g, "").slice(0, 4);
    lookup(true);
  }
})();
