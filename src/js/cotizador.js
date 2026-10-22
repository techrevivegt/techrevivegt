/* ==========================================================================
   TECHREVIVE · Tarifario y cotizador interactivo
   Los precios, servicios y listas se editan en el panel → «Tarifario y cotizador».
   ========================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("cotizador");
  var dataEl = document.getElementById("tarifario-data");
  if (!form || !dataEl) return;

  var D = JSON.parse(dataEl.textContent || "{}");
  var cfg = window.TECHREVIVE_CONFIG || {};
  var M = D.moneda || "Q";
  var KEY = "techrevive-cotizacion-v1";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  document.body.classList.add("is-cotizador");

  /* ---------- Catálogo ---------- */
  var SVC = {};
  (D.categorias || []).forEach(function (c) {
    c.servicios.forEach(function (s) { s.cat = c.nombre; SVC[s.id] = s; });
  });
  // Firma del catálogo: si cambian los servicios en el panel, no se restauran selecciones antiguas.
  var SIG = (function (str) { var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return String(h); })(
    Object.keys(SVC).map(function (k) { return k + ":" + SVC[k].nombre; }).join("|"));
  var TIPOS = {};
  (D.tipos || []).forEach(function (t) { TIPOS[t.nombre] = t; });

  /* ---------- Utilidades ---------- */
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function num(v) { var n = parseFloat(String(v || "").replace(",", ".")); return isFinite(n) && n > 0 ? n : 0; }
  function money(n) {
    return M + (Math.round(n * 100) / 100).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hoyISO() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function nuevoNumero() {
    return "TR-" + hoyISO().replace(/-/g, "") + "-" + String(Math.floor(1000 + Math.random() * 9000));
  }
  function fechaLarga(iso, plusDays) {
    if (!iso) return "";
    var d = new Date(iso + "T12:00:00");
    if (isNaN(d)) return iso;
    if (plusDays) d.setDate(d.getDate() + plusDays);
    return d.toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
  }
  function field(name) { var el = form.elements[name]; return el && "value" in el ? String(el.value || "").trim() : ""; }
  function checked(name) {
    return $$('input[name="' + name + '"]:checked', form).map(function (i) { return i.value; });
  }
  function out(key, text) { $$('[data-out="' + key + '"]').forEach(function (el) { el.textContent = text; }); }
  function row(key, show) { $$('[data-row="' + key + '"]').forEach(function (el) { el.hidden = !show; }); }
  function join(list, sep) { return list.filter(function (x) { return x && x !== "No sabe"; }).join(sep || " · "); }

  /* ---------- Repuestos ---------- */
  var partsRows = $("#parts-rows");
  function addPart(p, focus) {
    p = p || {};
    var r = document.createElement("div");
    r.className = "parts__row";
    r.innerHTML =
      '<input type="text" class="p-desc" placeholder="Ej. SSD 480 GB Kingston" aria-label="Descripción del repuesto" maxlength="120" />' +
      '<input type="number" class="p-cant" min="1" max="999" value="1" inputmode="numeric" aria-label="Cantidad" />' +
      '<input type="number" class="p-precio" min="0" step="0.01" placeholder="0.00" inputmode="decimal" aria-label="Precio unitario" />' +
      '<button type="button" class="parts__del" aria-label="Quitar este repuesto">✕</button>';
    $(".p-desc", r).value = p.d || "";
    $(".p-cant", r).value = p.c || 1;
    $(".p-precio", r).value = p.p || "";
    partsRows.appendChild(r);
    if (focus) $(".p-desc", r).focus();
  }
  function readParts() {
    return $$(".parts__row", partsRows).map(function (r) {
      return { d: $(".p-desc", r).value.trim(), c: Math.max(1, Math.round(num($(".p-cant", r).value)) || 1), p: num($(".p-precio", r).value) };
    }).filter(function (p) { return p.d || p.p; });
  }
  $("#part-add").addEventListener("click", function () { addPart(null, true); });
  partsRows.addEventListener("click", function (ev) {
    var b = ev.target.closest(".parts__del");
    if (!b) return;
    b.parentNode.remove();
    changed();
  });

  /* ---------- Guardado local ---------- */
  function collect() {
    var st = { f: {}, m: {}, parts: readParts(), sig: SIG };
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.type === "button") return;
      if (el.type === "checkbox") { (st.m[el.name] = st.m[el.name] || []); if (el.checked) st.m[el.name].push(el.value); }
      else if (el.type === "radio") { if (el.checked) st.f[el.name] = el.value; }
      else st.f[el.name] = el.value;
    });
    return st;
  }
  function restore(st) {
    if (st.sig !== SIG && st.m) { delete st.m.svc; }
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === "checkbox") el.checked = ((st.m || {})[el.name] || []).indexOf(el.value) > -1;
      else if (el.type === "radio") { if ((st.f || {})[el.name] != null) el.checked = st.f[el.name] === el.value; }
      else if ((st.f || {})[el.name] != null) el.value = st.f[el.name];
    });
    partsRows.innerHTML = "";
    (st.parts || []).forEach(function (p) { addPart(p); });
  }
  var saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(collect())); } catch (e) { /* modo privado */ }
    }, 250);
  }

  /* ---------- Cálculo ---------- */
  function compute() {
    var items = checked("svc").map(function (id) {
      var s = SVC[id]; if (!s) return null;
      var q = s.por_unidad ? Math.max(1, Math.round(num(field("qty-" + id))) || 1) : 1;
      return { nombre: s.nombre, cant: q, precio: s.precio, sub: s.precio * q, desde: s.desde, unidad: s.unidad, por_unidad: s.por_unidad, cat: s.cat };
    }).filter(Boolean);
    var parts = readParts().map(function (p) { return { nombre: p.d || "Repuesto / concepto", cant: p.c, precio: p.p, sub: p.p * p.c, repuesto: true }; });
    var servicios = items.reduce(function (a, i) { return a + i.sub; }, 0);
    var repuestos = parts.reduce(function (a, i) { return a + i.sub; }, 0);
    var subtotal = servicios + repuestos;
    var urg = checked("urgente").length ? subtotal * num(D.recargo_urgencia) / 100 : 0;
    var dv = num(field("descuento"));
    var desc = field("descuento_tipo") === "monto" ? dv : (subtotal + urg) * Math.min(dv, 100) / 100;
    desc = Math.min(desc, subtotal + urg);
    var total = subtotal + urg - desc;
    var anticipo = Math.min(num(field("anticipo")), total);
    return {
      items: items, parts: parts, servicios: servicios, repuestos: repuestos, subtotal: subtotal, urg: urg, desc: desc,
      descLabel: field("descuento_tipo") === "monto" ? "" : " (" + Math.min(dv, 100) + "%)",
      total: total, anticipo: anticipo, saldo: total - anticipo, desde: items.some(function (i) { return i.desde; })
    };
  }

  function marca() { return field("marca") === "Otra" ? (field("marca_otra") || "Otra") : field("marca"); }
  function equipoTxt() { return join([field("equipo"), marca(), field("modelo")]); }
  function specsTxt() {
    var cpu = join([field("procesador"), field("procesador_modelo")], " ");
    var ram = join([field("ram"), field("tipo_ram")], " ");
    var disco = join([field("disco_tipo"), field("disco_cap")], " ");
    return join([cpu, ram ? ram + " RAM" : "", disco]);
  }

  /* ---------- Resumen en pantalla ---------- */
  function render() {
    var c = compute();
    out("numero", field("numero") || "—");
    out("cliente", field("cliente") || "—");
    out("equipo", equipoTxt() || "—");
    out("so", field("so") && field("so") !== "No sabe" ? field("so") : "—");
    out("specs", specsTxt() || "—");

    var ul = $("#sum-items");
    var all = c.items.concat(c.parts);
    ul.innerHTML = all.length ? all.map(function (i) {
      var q = i.cant > 1 ? ' <em>×' + i.cant + "</em>" : "";
      return '<li><span>' + esc(i.nombre) + q + (i.desde ? ' <span class="tag-desde">desde</span>' : "") + "</span><strong>" + money(i.sub) + "</strong></li>";
    }).join("") : '<li class="cotz-sum__empty">Aún no has elegido servicios.</li>';

    out("subtotal", money(c.subtotal));
    out("urgencia", "+ " + money(c.urg)); row("urgencia", c.urg > 0);
    out("descuento", "− " + money(c.desc)); row("descuento", c.desc > 0);
    out("total", money(c.total));
    out("anticipo", "− " + money(c.anticipo)); row("anticipo", c.anticipo > 0);
    out("saldo", money(c.saldo)); row("saldo", c.anticipo > 0);
    row("desde", c.desde);

    // contador por categoría
    $$(".svc-cat").forEach(function (d) {
      var n = $$('input[name="svc"]:checked', d).length;
      var b = $(".svc-cat__count", d);
      b.hidden = !n; b.textContent = n + (n === 1 ? " elegido" : " elegidos");
    });
    // campos condicionales
    $$("[data-show-if]", form).forEach(function (el) {
      var kv = el.getAttribute("data-show-if").split("=");
      el.hidden = field(kv[0]) !== kv[1];
    });
    return c;
  }

  function changed() { render(); save(); }
  form.addEventListener("input", changed);
  form.addEventListener("change", changed);
  form.addEventListener("submit", function (ev) { ev.preventDefault(); });

  /* ---------- Tipos de servicio → categoría sugerida ---------- */
  var tipHelp = $(".cf-help", $("#paso-solicitud"));
  var tipHelpDefault = tipHelp ? tipHelp.innerHTML : "";
  function esEscritorio() { return /escritorio|pc|all-in|mini|imac|servidor/i.test(field("equipo")); }
  function marcarSugeridos() {
    var cats = {};
    checked("tipo").forEach(function (t) { if (TIPOS[t] && TIPOS[t].categoria) cats[TIPOS[t].categoria] = 1; });
    $$(".svc-cat").forEach(function (d) {
      var on = !!cats[d.getAttribute("data-cat")];
      d.classList.toggle("is-suggested", on);
      if (on) d.open = true;
    });
  }
  $$('input[name="tipo"]', form).forEach(function (inp) {
    inp.addEventListener("change", function () {
      marcarSugeridos();
      if (!inp.checked) return;
      var t = TIPOS[inp.value]; if (!t) return;
      var sug = (t.sugeridos || []).filter(Boolean);
      if (sug.length > 1) {
        var desk = esEscritorio();
        var pick = sug.filter(function (n) { return desk ? /escritorio|\bpc\b/i.test(n) : /laptop/i.test(n); })[0];
        sug = [pick || sug[0]];
      }
      var added = [];
      sug.forEach(function (n) {
        var id = Object.keys(SVC).filter(function (k) { return SVC[k].nombre === n; })[0];
        var box = id && $('input[name="svc"][value="' + id + '"]', form);
        if (box && !box.checked) { box.checked = true; added.push(n); }
      });
      if (tipHelp) {
        tipHelp.innerHTML = added.length
          ? "✓ Agregamos <strong>" + esc(added.join(", ")) + "</strong> al tarifario. Puedes cambiarlo en el paso 6."
          : (t.categoria ? "✓ Abrimos la sección <strong>" + esc(t.categoria) + "</strong> del tarifario (paso 6)." : tipHelpDefault);
      }
      changed();
    });
  });

  /* ---------- Buscador y abrir/contraer ---------- */
  var buscar = $("#svc-buscar");
  var vacio = $(".svc-empty");
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  buscar.addEventListener("input", function () {
    var q = norm(buscar.value.trim());
    var any = false;
    $$(".svc-cat").forEach(function (d) {
      var hits = 0;
      $$(".svc", d).forEach(function (li) {
        var ok = !q || norm(li.getAttribute("data-search")).indexOf(q) > -1;
        li.hidden = !ok; if (ok) hits++;
      });
      d.hidden = !hits;
      if (q && hits) d.open = true;
      if (hits) any = true;
    });
    vacio.hidden = any;
  });
  buscar.addEventListener("keydown", function (ev) { if (ev.key === "Enter") ev.preventDefault(); });
  $$("[data-cats]").forEach(function (b) {
    b.addEventListener("click", function () {
      var open = b.getAttribute("data-cats") === "open";
      $$(".svc-cat").forEach(function (d) { d.open = open; });
    });
  });

  /* ---------- Documento para imprimir ---------- */
  var qp = document.getElementById("qp");
  if (qp && qp.parentNode !== document.body) document.body.appendChild(qp);
  qp.innerHTML = '<div class="qp-page"><header class="qp-head"><img class="qp-logo" alt="TechRevive · Reparación y Mantenimiento" /><div class="qp-head__doc" id="qp-doc"></div></header><div id="qp-body"></div></div>';
  var qpLogo = $(".qp-logo", qp);
  qpLogo.src = D.logo || "img/logo-techrevive.png";

  function dl(pairs) {
    var rows = pairs.filter(function (p) { return p[1] && p[1] !== "No sabe"; });
    if (!rows.length) return "";
    return "<dl>" + rows.map(function (p) { return "<div><dt>" + esc(p[0]) + "</dt><dd>" + esc(p[1]) + "</dd></div>"; }).join("") + "</dl>";
  }
  function box(title, inner, cls) {
    return inner ? '<section class="qp-box' + (cls ? " " + cls : "") + '"><h3>' + esc(title) + "</h3>" + inner + "</section>" : "";
  }
  function para(label, text) { return text ? '<p class="qp-p"><strong>' + esc(label) + ":</strong> " + esc(text) + "</p>" : ""; }

  function buildPrint() {
    var c = compute();
    var E = D.empresa || {};
    var fecha = field("fecha") || hoyISO();
    var wa = cfg.whatsappDisplay || E.whatsapp;
    $("#qp-doc", qp).innerHTML =
      '<p class="qp-title">Cotización</p>' +
      '<table class="qp-meta"><tr><th>No.</th><td>' + esc(field("numero")) + "</td></tr>" +
      "<tr><th>Fecha</th><td>" + esc(fechaLarga(fecha)) + "</td></tr>" +
      "<tr><th>Válida hasta</th><td>" + esc(fechaLarga(fecha, D.validez_dias || 15)) + "</td></tr></table>";

    var contacto = [wa ? "WhatsApp: " + wa : "", cfg.email || E.correo, cfg.address || E.direccion, E.web].filter(Boolean).map(esc).join("  ·  ");

    var lineas = c.items.map(function (i) {
      return { d: i.nombre + (i.desde ? " (precio desde)" : "") + (i.por_unidad ? " — por " + i.unidad : ""), cat: i.cat, q: i.cant, p: i.precio, s: i.sub };
    }).concat(c.parts.map(function (p) { return { d: p.nombre, cat: "Repuesto / concepto", q: p.cant, p: p.precio, s: p.sub }; }));
    var tabla = lineas.length ? lineas.map(function (l, n) {
      return "<tr><td>" + (n + 1) + "</td><td>" + esc(l.d) + '<small>' + esc(l.cat) + "</small></td><td>" + l.q + "</td><td>" + money(l.p) + "</td><td>" + money(l.s) + "</td></tr>";
    }).join("") : '<tr><td colspan="5" class="qp-none">Servicios por definir después del diagnóstico.</td></tr>';

    var tot = '<tr><th>Subtotal servicios</th><td>' + money(c.servicios) + "</td></tr>" +
      (c.repuestos ? "<tr><th>Repuestos y otros</th><td>" + money(c.repuestos) + "</td></tr>" : "") +
      (c.urg ? "<tr><th>Recargo por urgencia (" + num(D.recargo_urgencia) + "%)</th><td>+ " + money(c.urg) + "</td></tr>" : "") +
      (c.desc ? "<tr><th>Descuento" + esc(c.descLabel) + "</th><td>− " + money(c.desc) + "</td></tr>" : "") +
      '<tr class="qp-total"><th>Total estimado</th><td>' + money(c.total) + "</td></tr>" +
      (c.anticipo ? "<tr><th>Anticipo recibido</th><td>− " + money(c.anticipo) + '</td></tr><tr class="qp-saldo"><th>Saldo pendiente</th><td>' + money(c.saldo) + "</td></tr>" : "");

    var conds = (D.condiciones || []).map(function (t) { return "<li>" + esc(String(t).replace(/\{dias\}/g, D.validez_dias || 15)) + "</li>"; }).join("");
    var sintomas = checked("sintomas").join(", ");
    var tipos = checked("tipo").join(", ");

    $("#qp-body", qp).innerHTML =
      '<div class="qp-bar"></div>' +
      (contacto ? '<p class="qp-contact">' + contacto + "</p>" : "") +
      '<div class="qp-grid">' +
        box("Datos del cliente", dl([["Nombre", field("cliente") || "—"], ["Teléfono", field("telefono")], ["Correo", field("correo")],
          ["NIT", field("nit") || "CF"], ["Tipo de cliente", field("tipo_cliente")], ["Dirección", field("direccion")]])) +
        box("Datos del equipo", dl([["Tipo", field("equipo") || "—"], ["Marca", marca()], ["Modelo", field("modelo")], ["No. de serie", field("serie")],
          ["Año", field("anio")], ["Sistema operativo", field("so")], ["Contraseña", field("contrasena")]])) +
        box("Especificaciones", dl([["Procesador", join([field("procesador"), field("procesador_modelo")], " ")], ["Memoria RAM", join([field("ram"), field("tipo_ram")], " ")],
          ["Almacenamiento", join([field("disco_tipo"), field("disco_cap")], " ")], ["Tarjeta gráfica", field("graficos")]])) +
        box("Recepción del equipo", dl([["Accesorios", checked("accesorios").join(", ")], ["Estado físico", checked("estado_fisico").join(", ")],
          ["Observaciones", field("obs_fisicas")]])) +
      "</div>" +
      '<div class="qp-grid">' + box("Diagnóstico previo (reportado por el cliente)", para("Síntomas", sintomas) + para("Descripción", field("problema")) +
        para("Desde cuándo", field("desde_cuando")) + para("Reparado antes", field("reparado_antes"))) +
      box("Servicio solicitado", para("Tipo de servicio", tipos) + para("Detalle", field("solicitud")) +
        para("Modalidad", field("modalidad")) + (checked("urgente").length ? para("Prioridad", "Urgente") : "")) + "</div>" +
      box("Diagnóstico técnico", para("Diagnóstico", field("diag_tecnico")) + para("Causa probable", field("causa")) +
        para("Trabajo a realizar / recomendaciones", field("trabajo")) +
        dl([["Estado general", field("estado_general")], ["Entrega estimada", field("entrega")], ["Garantía", field("garantia")], ["Técnico", field("tecnico")]]), "qp-box--wide qp-box--tech") +
      '<table class="qp-table"><thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th></tr></thead><tbody>' + tabla + "</tbody></table>" +
      '<div class="qp-sum"><div class="qp-sum__note">' +
        (c.desde ? "<p><strong>Importante:</strong> los servicios marcados «precio desde» se confirman después del diagnóstico técnico.</p>" : "") +
        (D.nota ? "<p>" + esc(D.nota) + "</p>" : "") + "<p>" + esc(D.iva || "") + "</p></div>" +
        '<table class="qp-totals">' + tot + "</table></div>" +
      (conds ? '<section class="qp-cond"><h3>Términos y condiciones</h3><ol>' + conds + "</ol></section>" : "") +
      '<div class="qp-sign"><div><span></span>Firma del cliente<small>' + esc(field("cliente")) + '</small></div><div><span></span>Firma del técnico<small>' + esc(field("tecnico")) + "</small></div></div>" +
      '<div class="qp-foot"><img src="' + esc(qpLogo.src) + '" alt="TechRevive" /><span>' + esc(E.eslogan || "") + "</span></div>";
    document.title = "Cotizacion " + (field("numero") || "") + (field("cliente") ? " - " + field("cliente") : "") + " | TechRevive";
  }

  var baseTitle = document.title;
  window.addEventListener("beforeprint", buildPrint);
  window.addEventListener("afterprint", function () { document.title = baseTitle; });
  $("#btn-print").addEventListener("click", function () {
    buildPrint();
    if (window.trEvent) window.trEvent("cotizacion_pdf", field("numero"));
    var go = function () { window.print(); };
    if (qpLogo.complete && qpLogo.naturalWidth) go();
    else if (qpLogo.decode) qpLogo.decode().then(go, go);
    else qpLogo.onload = go;
  });

  /* ---------- WhatsApp ---------- */
  $("#btn-wa").addEventListener("click", function () {
    var c = compute();
    var dest = (form.querySelector('input[name="wa_dest"]:checked') || {}).value || "empresa";
    var tel = field("telefono").replace(/\D/g, "");
    if (tel.length === 8) tel = "502" + tel;
    var to = dest === "cliente" ? tel : (cfg.whatsapp || "");
    if (dest === "cliente" && tel.length < 8) {
      alert("Escribe el teléfono / WhatsApp del cliente en el paso 1.");
      form.elements.telefono.focus();
      return;
    }
    var L = [];
    L.push("*Cotización TechRevive* No. " + field("numero"));
    L.push("Fecha: " + fechaLarga(field("fecha") || hoyISO()) + " · Válida hasta: " + fechaLarga(field("fecha") || hoyISO(), D.validez_dias || 15));
    L.push("");
    if (field("cliente")) L.push("*Cliente:* " + field("cliente") + (field("telefono") ? " · " + field("telefono") : ""));
    if (equipoTxt()) L.push("*Equipo:* " + equipoTxt() + (field("so") ? " · " + field("so") : ""));
    if (specsTxt()) L.push("*Especificaciones:* " + specsTxt());
    var sint = checked("sintomas").join(", ");
    if (sint || field("problema")) L.push("*Problema reportado:* " + join([sint, field("problema")], ". "));
    if (checked("tipo").length || field("solicitud")) L.push("*Servicio solicitado:* " + join([checked("tipo").join(", "), field("solicitud")], ". "));
    if (field("diag_tecnico")) L.push("*Diagnóstico técnico:* " + field("diag_tecnico"));
    if (checked("urgente").length) L.push("*Prioridad:* Urgente");
    var all = c.items.concat(c.parts);
    if (all.length) {
      L.push(""); L.push("*Detalle:*");
      all.forEach(function (i) { L.push("• " + i.nombre + (i.cant > 1 ? " ×" + i.cant : "") + (i.desde ? " (desde)" : "") + " — " + money(i.sub)); });
      L.push("");
      if (c.urg) L.push("Recargo por urgencia: + " + money(c.urg));
      if (c.desc) L.push("Descuento: − " + money(c.desc));
      L.push("*Total estimado: " + money(c.total) + "*");
      if (c.anticipo) L.push("Anticipo: " + money(c.anticipo) + " · Saldo: " + money(c.saldo));
      if (c.desde) L.push("_Incluye precios «desde»; el total final se confirma con el diagnóstico._");
    }
    var url = "https://wa.me/" + to + "?text=" + encodeURIComponent(L.join("\n"));
    window.open(url, "_blank", "noopener");
    if (window.trEvent) window.trEvent("cotizacion_wa", dest === "cliente" ? "Enviada al cliente" : "Enviada a TechRevive");
    // Si la persona nos la envía a nosotros, queda guardada en Panel → Solicitudes
    if (dest !== "cliente" && (field("cliente") || field("telefono"))) {
      var vid = ""; try { vid = localStorage.getItem("tr-vid") || ""; } catch (e) { /* nada */ }
      try {
        fetch("/api/solicitud", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          tipo: "cotizacion", nombre: field("cliente"), telefono: field("telefono"),
          servicio: all.length ? all[0].nombre + (all.length > 1 ? " y " + (all.length - 1) + " más" : "") : "Cotización",
          mensaje: join([sint, field("problema"), field("solicitud")], ". "),
          datos: { numero: field("numero"), equipo: equipoTxt(), total: c.total, desde: !!c.desde, urgente: !!c.urg,
            detalle: all.map(function (i) { return i.nombre + (i.cant > 1 ? " ×" + i.cant : "") + " — " + money(i.sub); }) },
          pagina: location.pathname, vid: vid,
        }) }).catch(function () {});
      } catch (e) { /* nada */ }
    }
  });

  /* ---------- Nueva cotización ---------- */
  function nueva() {
    form.reset();
    partsRows.innerHTML = "";
    addPart();
    form.elements.numero.value = nuevoNumero();
    form.elements.fecha.value = hoyISO();
    $$(".svc-cat").forEach(function (d) { d.open = false; d.classList.remove("is-suggested"); });
    if (tipHelp) tipHelp.innerHTML = tipHelpDefault;
  }
  $("#btn-reset").addEventListener("click", function () {
    if (!confirm("¿Empezar una nueva cotización? Se borrarán los datos que escribiste.")) return;
    try { localStorage.removeItem(KEY); } catch (e) { /* nada */ }
    nueva(); changed();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------- Barra móvil con el total ---------- */
  var bar = $("#mobilebar"), sum = $("#resumen");
  if (bar && sum && "IntersectionObserver" in window) {
    var visible = { sum: false, form: false };
    var upd = function () { bar.classList.toggle("is-show", visible.form && !visible.sum); };
    new IntersectionObserver(function (en) { en.forEach(function (x) { visible.sum = x.isIntersecting; }); upd(); }).observe(sum);
    new IntersectionObserver(function (en) { en.forEach(function (x) { visible.form = x.isIntersecting; }); upd(); }).observe($(".cotz__main"));
  }

  /* ---------- Inicio ---------- */
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { saved = null; }
  if (saved) restore(saved);
  if (!form.elements.numero.value) form.elements.numero.value = nuevoNumero();
  if (!form.elements.fecha.value) form.elements.fecha.value = hoyISO();
  if (!partsRows.children.length) addPart();
  marcarSugeridos();
  $$('input[name="svc"]:checked', form).forEach(function (i) { var d = i.closest(".svc-cat"); if (d) d.open = true; });
  if (!$$(".svc-cat[open]").length && $(".svc-cat")) $(".svc-cat").open = true;
  render();
})();
