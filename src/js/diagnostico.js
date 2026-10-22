/* ==========================================================================
   TECHREVIVE · Doctor TechRevive (diagnóstico guiado + asistente con IA)
   Los síntomas, preguntas y precios vienen en #dx-data (los genera build.py
   a partir del tarifario). No necesita servicios externos.
   ========================================================================== */
(function () {
  "use strict";
  var root = document.getElementById("dx");
  var dataEl = document.getElementById("dx-data");
  if (!root || !dataEl) return;
  var D = JSON.parse(dataEl.textContent);
  var cfg = window.TECHREVIVE_CONFIG || {};
  var $ = function (s, c) { return (c || root).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || root).querySelectorAll(s)); };
  var EQ = { laptop: "Laptop", pc: "PC de escritorio", aio: "Todo en uno", otro: "Otro equipo" };
  var LVL = { alta: "Muy probable", media: "Probable", baja: "Posible" };
  var ORDER = { baja: 0, media: 1, alta: 2 };
  var st = { eq: "", sx: null, qi: 0, ans: [] };
  var resultEl = document.getElementById("dx-result");
  var ev = function (t, k) { if (window.trEvent) window.trEvent(t, k); };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(v) { var n = Number(v) || 0; return D.moneda + n.toLocaleString("es-GT", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function priceTxt(s) { return (s.desde ? "desde " : "") + money(s.p) + (s.u ? " / " + s.u : ""); }
  function waUrl(text) { return cfg.whatsapp ? "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(text) : "contacto.html"; }

  /* ---------- Pasos ---------- */
  var STEPS = ["eq", "sx", "q"];
  function show(step) {
    $$(".dx-step").forEach(function (s) { s.hidden = s.getAttribute("data-step") !== step; });
    var idx = STEPS.indexOf(step);
    $$(".dx-progress li").forEach(function (li, i) { li.classList.toggle("is-on", i <= idx); li.classList.toggle("is-done", i < idx); });
  }
  function scrollTo(el) {
    var top = el.getBoundingClientRect().top + window.pageYOffset - 96;
    if (Math.abs(window.pageYOffset - top) > 40) window.scrollTo({ top: top, behavior: "smooth" });
  }

  $$("[data-eq]").forEach(function (b) {
    b.addEventListener("click", function () {
      st.eq = b.getAttribute("data-eq");
      $$("[data-eq]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      var pre = st.pre && root.querySelector('[data-sx="' + st.pre + '"]');
      st.pre = "";
      if (pre) { pre.click(); return; }
      show("sx"); scrollTo(root);
    });
  });
  // Enlace directo desde la portada: diagnostico.html?s=lenta (se elige el síntoma después del equipo)
  try { st.pre = new URLSearchParams(location.search).get("s").replace(/[^a-z-]/g, "") || ""; } catch (e) { st.pre = ""; }
  $$("[data-sx]").forEach(function (b) {
    b.addEventListener("click", function () {
      var id = b.getAttribute("data-sx");
      st.sx = D.sintomas.filter(function (s) { return s.id === id; })[0];
      st.qi = 0; st.ans = [];
      $$("[data-sx]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      ask(); scrollTo(root);
    });
  });
  $$("[data-back]").forEach(function (b) {
    b.addEventListener("click", function () {
      var cur = b.closest(".dx-step").getAttribute("data-step");
      if (cur === "sx") return show("eq");
      if (st.qi > 0) { st.qi--; st.ans.length = st.qi; ask(); } else show("sx");
    });
  });

  function ask() {
    var qs = st.sx.q, q = qs[st.qi];
    show("q");
    $(".dx-count").textContent = st.sx.t + " · pregunta " + (st.qi + 1) + " de " + qs.length;
    $("#dx-qtext").textContent = q.q;
    var box = $("#dx-ans");
    box.innerHTML = "";
    q.o.forEach(function (o, i) {
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "dx-opt dx-opt--ans"; btn.textContent = o.t;
      btn.addEventListener("click", function () {
        st.ans[st.qi] = i; st.qi++;
        if (st.qi < qs.length) ask(); else guided();
      });
      box.appendChild(btn);
    });
    var first = box.querySelector("button"); if (first && document.activeElement && root.contains(document.activeElement)) first.focus({ preventScroll: true });
  }

  /* ---------- Resultado del diagnóstico guiado ---------- */
  function guided() {
    var sx = st.sx, score = {}, urg = sx.urg, resp = [];
    Object.keys(sx.causas).forEach(function (k) { score[k] = 1; });
    sx.q.forEach(function (q, qi) {
      var o = q.o[st.ans[qi]]; if (!o) return;
      resp.push({ q: q.q, a: o.t });
      Object.keys(o.fx || {}).forEach(function (k) { if (score[k] != null) score[k] += o.fx[k]; });
      if (o.urg && ORDER[o.urg] > ORDER[urg]) urg = o.urg;
    });
    var ranked = Object.keys(score).filter(function (k) { return score[k] > 0; }).sort(function (a, b) { return score[b] - score[a]; }).slice(0, 3);
    var tot = ranked.reduce(function (a, k) { return a + score[k]; }, 0) || 1;
    var causas = ranked.map(function (k) {
      var pct = score[k] / tot, c = sx.causas[k];
      return { t: c.t, d: c.d, s: c.s, pct: pct, nivel: pct >= 0.5 ? "alta" : pct >= 0.28 ? "media" : "baja" };
    });
    var servicios = [];
    causas.slice(0, causas.length > 1 && causas[1].pct >= 0.3 ? 2 : 1).forEach(function (c) {
      c.s.forEach(function (s) { if (!servicios.some(function (x) { return x.n === s.n; })) servicios.push(s); });
    });
    render({ equipo: EQ[st.eq] || "Equipo", sintoma: sx.t, causas: causas, servicios: servicios, urg: urg, ok: sx.ok, no: sx.no, resp: resp });
    ev("diagnostico", sx.t);
  }

  function render(R) {
    st.last = R;
    var U = D.urgencias[R.urg] || D.urgencias.media;
    var top = R.causas[0];
    var causasHtml = R.causas.map(function (c, i) {
      var pct = c.pct != null ? Math.round(c.pct * 100) : (c.nivel === "alta" ? 75 : c.nivel === "media" ? 50 : 25);
      return '<li class="dx-cause' + (i === 0 ? " dx-cause--top" : "") + '">' +
        '<div class="dx-cause__head"><strong>' + esc(c.t) + '</strong><span class="dx-lvl dx-lvl--' + c.nivel + '">' + LVL[c.nivel] + "</span></div>" +
        '<div class="dx-meter" aria-hidden="true"><span style="width:' + pct + '%"></span></div>' +
        (c.d ? "<p>" + esc(c.d) + "</p>" : "") + "</li>";
    }).join("");
    var svcHtml = R.servicios.length ? R.servicios.map(function (s) {
      return '<li><span>' + esc(s.n) + '</span><strong>' + esc(priceTxt(s)) + "</strong></li>";
    }).join("") : '<li><span>Revisión y diagnóstico en taller</span><strong>' + (D.diag ? esc(priceTxt(D.diag)) : "a cotizar") + "</strong></li>";
    var list = function (arr) { return (arr || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join(""); };
    var preguntas = R.preguntas && R.preguntas.length ? '<div class="dx-box"><h3>Lo que el técnico te preguntará</h3><ul class="dx-list">' + list(R.preguntas) + "</ul></div>" : "";

    resultEl.innerHTML =
      '<div class="dx-res">' +
        '<header class="dx-res__head">' +
          '<div><p class="dx-res__kicker">' + (R.ia ? "✨ Análisis con IA · " : "Diagnóstico probable · ") + esc(R.equipo) + (R.sintoma ? " · " + esc(R.sintoma) : "") + "</p>" +
          "<h2>" + (top ? esc(top.t) : "Necesitamos revisarlo en persona") + "</h2>" +
          (R.resumen ? '<p class="dx-res__sum">' + esc(R.resumen) + "</p>" : "") + "</div>" +
          '<div class="dx-urg dx-urg--' + R.urg + '"><strong>' + esc(U.t) + "</strong><span>" + esc(U.d) + "</span></div>" +
        "</header>" +
        '<div class="dx-res__grid">' +
          '<div class="dx-box"><h3>Causas más probables</h3><ol class="dx-causes">' + (causasHtml || "<li>No pudimos identificar una causa clara con la información disponible.</li>") + "</ol></div>" +
          '<div class="dx-box dx-box--price"><h3>Servicio recomendado y precio de referencia</h3><ul class="dx-svcs">' + svcHtml + "</ul>" +
            '<p class="dx-note">Precios de nuestro tarifario. El costo final se confirma con la revisión.</p></div>' +
          (R.ok && R.ok.length ? '<div class="dx-box dx-box--ok"><h3>✅ Puedes intentar en casa</h3><ul class="dx-list">' + list(R.ok) + "</ul></div>" : "") +
          (R.no && R.no.length ? '<div class="dx-box dx-box--no"><h3>⚠️ Evita esto</h3><ul class="dx-list">' + list(R.no) + "</ul></div>" : "") +
          preguntas +
        "</div>" +
        '<div class="dx-cta">' +
          '<div class="dx-cta__text"><strong>¿Quieres que lo revisemos?</strong><span>Envíanos este diagnóstico y te respondemos con los siguientes pasos.</span></div>' +
          '<div class="dx-cta__btns">' +
            '<a class="btn btn--primary" target="_blank" rel="noopener" data-ev="Doctor TechRevive" href="' + esc(waUrl(message(R))) + '">Enviar por WhatsApp</a>' +
            '<button type="button" class="btn btn--ghost-light" data-dx-form>Que me contacten</button>' +
            '<a class="btn btn--ghost-light" href="cotizador.html">Cotizar en detalle</a>' +
          "</div>" +
          '<form class="dx-lead" hidden novalidate>' +
            '<div class="dx-lead__row"><label>Tu nombre<input name="nombre" maxlength="80" autocomplete="name" required /></label>' +
            '<label>Teléfono / WhatsApp<input name="telefono" type="tel" inputmode="tel" maxlength="20" autocomplete="tel" required /></label></div>' +
            '<label>Algo más que debamos saber (opcional)<input name="mensaje" maxlength="300" placeholder="Marca y modelo, desde cuándo pasa…" /></label>' +
            '<div class="hp" aria-hidden="true"><input name="_gotcha" tabindex="-1" autocomplete="off" /></div>' +
            '<button type="submit" class="btn btn--primary">Enviar solicitud</button><p class="dx-lead__status" role="status" aria-live="polite"></p>' +
          "</form>" +
        "</div>" +
        '<button type="button" class="dx-restart">↺ Hacer otro diagnóstico</button>' +
      "</div>";

    $$(".dx-panel, .dx-tabs").forEach(function (p) { p.hidden = true; });
    resultEl.hidden = false;
    resultEl.focus({ preventScroll: true });
    scrollTo(resultEl);
    resultEl.querySelector("[data-dx-form]").addEventListener("click", function () {
      var f = resultEl.querySelector(".dx-lead"); f.hidden = !f.hidden; if (!f.hidden) f.elements.nombre.focus();
    });
    resultEl.querySelector(".dx-lead").addEventListener("submit", lead);
    resultEl.querySelector(".dx-restart").addEventListener("click", restart);
  }

  function message(R, extra) {
    var L = ["Hola TechRevive, hice el diagnóstico en línea (Doctor TechRevive)."];
    if (extra && extra.nombre) L.push("Soy " + extra.nombre + (extra.telefono ? " · " + extra.telefono : "") + ".");
    L.push("");
    L.push("*Equipo:* " + R.equipo);
    if (R.sintoma) L.push("*Problema:* " + R.sintoma);
    if (R.texto) L.push("*Lo que le pasa:* " + R.texto);
    (R.resp || []).forEach(function (r) { L.push("• " + r.q + " → " + r.a); });
    if (R.causas.length) L.push("*Causa probable:* " + R.causas[0].t + (R.causas[1] ? " (o " + R.causas[1].t.toLowerCase() + ")" : ""));
    if (R.servicios.length) L.push("*Servicio sugerido:* " + R.servicios.map(function (s) { return s.n + " (" + priceTxt(s) + ")"; }).join("; "));
    L.push("*Urgencia:* " + (D.urgencias[R.urg] || {}).t);
    if (extra && extra.mensaje) L.push("*Comentario:* " + extra.mensaje);
    L.push(""); L.push("¿Me pueden ayudar?");
    return L.join("\n");
  }

  function lead(e) {
    e.preventDefault();
    var f = e.target, R = st.last, status = f.querySelector(".dx-lead__status");
    var d = { nombre: f.elements.nombre.value.trim(), telefono: f.elements.telefono.value.trim(), mensaje: f.elements.mensaje.value.trim() };
    if (f.elements._gotcha.value) return;
    if (!d.nombre || d.telefono.replace(/\D/g, "").length < 8) { status.textContent = "Escribe tu nombre y un teléfono de al menos 8 dígitos."; status.className = "dx-lead__status is-error"; return; }
    var btn = f.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Enviando…";
    var vid = ""; try { vid = localStorage.getItem("tr-vid") || ""; } catch (x) { /* nada */ }
    var payload = {
      tipo: "diagnostico", nombre: d.nombre, telefono: d.telefono, mensaje: (R.texto ? R.texto + "\n" : "") + d.mensaje,
      servicio: R.servicios[0] ? R.servicios[0].n : (R.sintoma || "Diagnóstico"), pagina: location.pathname, vid: vid,
      datos: { equipo: R.equipo, sintoma: R.sintoma || "", ia: !!R.ia, urgencia: R.urg, respuestas: R.resp || [],
        causas: R.causas.map(function (c) { return { t: c.t, nivel: c.nivel }; }), servicios: R.servicios.map(function (s) { return s.n + " (" + priceTxt(s) + ")"; }) },
    };
    var done = function (saved) {
      ev("formulario", "Doctor TechRevive");
      status.className = "dx-lead__status is-ok";
      status.textContent = saved ? "¡Listo, " + d.nombre.split(" ")[0] + "! Recibimos tu solicitud. Te abrimos WhatsApp por si quieres escribirnos de una vez." : "Te abrimos WhatsApp con tu diagnóstico: solo presiona «Enviar».";
      if (cfg.whatsapp) window.open(waUrl(message(R, d)), "_blank", "noopener");
      btn.textContent = "Enviado ✓";
    };
    fetch("/api/solicitud", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) { done(j && j.ok && !j.sinBase); })
      .catch(function () { done(false); });
  }

  function restart() {
    st = { eq: "", sx: null, qi: 0, ans: [] };
    resultEl.hidden = true; resultEl.innerHTML = "";
    $$(".dx-tabs").forEach(function (p) { p.hidden = false; });
    $$("[aria-pressed]").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
    tab(curTab);
    show("eq"); scrollTo(root);
  }

  /* ---------- Pestañas e IA ---------- */
  var curTab = "guiado";
  function tab(name) {
    curTab = name;
    $$(".dx-tab").forEach(function (t) { var on = t.getAttribute("data-tab") === name; t.classList.toggle("is-on", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
    $$(".dx-panel").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== name; });
  }
  $$(".dx-tab").forEach(function (t) { t.addEventListener("click", function () { tab(t.getAttribute("data-tab")); }); });

  var iaForm = document.getElementById("dx-ia");
  if (iaForm) {
    iaForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var txt = iaForm.elements.texto.value.trim(), status = iaForm.querySelector(".dx-ia__status"), btn = iaForm.querySelector("button[type=submit]");
      if (txt.length < 12) { status.textContent = "Cuéntanos un poco más: qué equipo es y qué le pasa."; status.className = "dx-ia__status is-error"; return; }
      btn.disabled = true; status.className = "dx-ia__status"; status.textContent = "Analizando tu problema… (unos segundos)";
      fetch("/api/diagnostico/ia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: txt, equipo: iaForm.elements.equipo.value }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok) throw new Error(x.j.error || "No se pudo analizar.");
          var j = x.j;
          status.textContent = "";
          ev("diagnostico_ia", iaForm.elements.equipo.value);
          render({ ia: true, equipo: iaForm.elements.equipo.value, texto: txt, resumen: j.resumen,
            causas: (j.causas || []).map(function (c) { return { t: c.t, d: c.d, nivel: c.p }; }),
            servicios: j.servicios || [], urg: j.urgencia || "media", ok: j.consejos, no: j.evitar, preguntas: j.preguntas });
        })
        .catch(function (err) {
          status.className = "dx-ia__status is-error";
          status.textContent = (err && err.message) || "No se pudo analizar. Prueba el diagnóstico guiado.";
        })
        .finally(function () { btn.disabled = false; });
    });
  }
})();
