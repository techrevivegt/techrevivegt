/* ==========================================================================
   TECHREVIVE · Aula virtual
   El progreso (lecciones completadas, cuestionarios) se guarda en este dispositivo
   y, si la base de datos está conectada, también en el servidor (así el alumno
   lo ve en cualquier dispositivo y puede pedir su certificado).
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.TECHREVIVE_CONFIG || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  document.documentElement.classList.add("js");

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function waLink(text) {
    var n = String(cfg.whatsapp || "").replace(/\D/g, "");
    return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent(text) : "/contacto.html";
  }
  function fecha(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T12:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
  }

  /* ---------- Usuario ---------- */
  var USER = null;
  function store(name) { return "tr-aula:" + (USER ? USER.usuario : "anon") + ":" + name; }
  function read(name, def) { try { return JSON.parse(localStorage.getItem(store(name)) || "null") || def; } catch (e) { return def; } }
  function write(name, val) { try { localStorage.setItem(store(name), JSON.stringify(val)); } catch (e) { /* sin espacio */ } }
  function done() { return read("hechas", {}); }

  /* ---------- Progreso en el servidor ---------- */
  function api(method, path, body) {
    return fetch("/api/aula/" + path, {
      method: method, credentials: "same-origin", cache: "no-store",
      headers: body ? { "Content-Type": "application/json", "x-aula": "1" } : { "x-aula": "1" },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.error || "Error del servidor"); e.status = r.status; throw e; }
        return d;
      });
    });
  }
  function online() { return USER && USER.servidor; }
  function pushProgress(items) {
    if (!online() || !items.length) return Promise.resolve();
    return api("POST", "progreso", { items: items }).catch(function () { /* se reintenta en la próxima visita */ });
  }
  // Une lo guardado en este dispositivo con lo del servidor (en ambos sentidos).
  function syncProgress() {
    if (!online()) return Promise.resolve(false);
    return api("GET", "progreso").then(function (srv) {
      var d = done(), notas = read("notas", {}), up = [], changed = false;
      Object.keys(srv.hechas || {}).forEach(function (k) { if (!d[k]) { d[k] = srv.hechas[k]; changed = true; } });
      Object.keys(srv.notas || {}).forEach(function (k) { if ((notas[k] || 0) < srv.notas[k]) { notas[k] = srv.notas[k]; changed = true; } });
      Object.keys(d).forEach(function (k) { if (!(srv.hechas || {})[k]) up.push({ leccion: k, hecho: true, ts: d[k], nota: notas[k] }); });
      if (changed) { write("hechas", d); write("notas", notas); }
      pushProgress(up);
      return changed;
    }).catch(function () { return false; });
  }

  /* ---------- Certificados ---------- */
  var CERTS = null;
  function loadCerts() {
    if (!online()) return Promise.resolve([]);
    if (CERTS) return Promise.resolve(CERTS);
    return api("GET", "certificados").then(function (r) { CERTS = r.items || []; return CERTS; }).catch(function () { return []; });
  }
  function certFor(curso) {
    var list = (CERTS || []).filter(function (c) { return c.curso === curso; });
    return list.filter(function (c) { return c.estado === "aprobado"; })[0] || list.filter(function (c) { return c.estado === "solicitado"; })[0] || list[0] || null;
  }
  function certUrl(id) { return "/certificado?c=" + encodeURIComponent(id); }

  function initCertCard() {
    var box = $("[data-cert]");
    if (!box) return;
    var curso = box.getAttribute("data-curso"), keys = JSON.parse(box.getAttribute("data-keys") || "[]");
    var msg = $("[data-cert-msg]", box), actions = $("[data-cert-actions]", box), form = $("[data-cert-form]", box);
    var original = msg.textContent;
    function render() {
      var d = done(), n = keys.filter(function (k) { return d[k]; }).length, complete = n === keys.length;
      var c = certFor(curso);
      box.className = "aula-card aula-cert";
      actions.innerHTML = ""; form.hidden = true;
      if (c && c.estado === "aprobado") {
        box.classList.add("is-ready");
        msg.innerHTML = "¡Felicidades! Tu certificado a nombre de <strong>" + esc(c.nombre) + "</strong> está listo.";
        actions.innerHTML = '<a class="btn btn--primary btn--sm" href="' + certUrl(c.id) + '" target="_blank" rel="noopener">Ver e imprimir certificado</a>';
        return;
      }
      if (c && c.estado === "solicitado") {
        box.classList.add("is-pending");
        msg.innerHTML = "Recibimos tu solicitud a nombre de <strong>" + esc(c.nombre) + "</strong>. La estamos revisando; te avisaremos cuando esté lista.";
        return;
      }
      if (!online()) { msg.textContent = original + " La solicitud en línea aún no está activada: cuando termines, escríbenos por WhatsApp y te lo preparamos."; return; }
      if (!complete) { msg.textContent = original + " Llevas " + n + " de " + keys.length + " lecciones."; return; }
      box.classList.add("is-unlocked");
      msg.innerHTML = (c && c.estado === "rechazado" ? "Tu solicitud anterior no fue aprobada" + (c.motivo ? ": <em>" + esc(c.motivo) + "</em>" : ".") + " Puedes enviarla de nuevo. " : "¡Completaste el curso! ") + "Ya puedes solicitar tu certificado.";
      var b = document.createElement("button");
      b.type = "button"; b.className = "btn btn--primary btn--sm"; b.textContent = "Solicitar certificado";
      b.onclick = function () { form.hidden = false; b.hidden = true; form.elements.nombre.value = (c && c.nombre) || USER.nombre || ""; form.elements.nombre.focus(); };
      actions.appendChild(b);
    }
    $("[data-cert-cancel]", box).onclick = function () { render(); };
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var nombre = form.elements.nombre.value.trim().replace(/\s+/g, " ");
      if (nombre.split(" ").length < 2) { alert("Escribe tu nombre completo (nombre y apellido)."); return; }
      if (!confirm("Tu certificado dirá:\n\n" + nombre + "\n\n¿Está bien escrito?")) return;
      var btn = $('button[type="submit"]', form); btn.disabled = true; btn.textContent = "Enviando…";
      // primero se asegura de que el servidor tenga todo el progreso
      var d = done(), notas = read("notas", {});
      pushProgress(keys.filter(function (k) { return d[k]; }).map(function (k) { return { leccion: k, hecho: true, ts: d[k], nota: notas[k] }; }))
        .then(function () { return api("POST", "certificados", { curso: curso, nombre: nombre }); })
        .then(function () { CERTS = null; return loadCerts(); })
        .then(render)
        .catch(function (e) { alert(e.message); })
        .finally(function () { btn.disabled = false; btn.textContent = "Enviar solicitud"; });
    });
    box.__render = render;
    render();
    loadCerts().then(render);
  }

  function renderMyCerts() {
    var sec = $("[data-mycerts]");
    if (!sec) return;
    loadCerts().then(function (list) {
      list = list.filter(function (c) { return c.estado === "aprobado" || c.estado === "solicitado"; });
      if (!list.length) return;
      $("[data-mycerts-list]", sec).innerHTML = list.map(function (c) {
        return c.estado === "aprobado"
          ? '<li><a href="' + certUrl(c.id) + '" target="_blank" rel="noopener"><strong>' + esc(c.curso_titulo) + '</strong><span>Ver e imprimir →</span></a></li>'
          : '<li><strong>' + esc(c.curso_titulo) + '</strong><span class="aula-mycerts__pending">En revisión</span></li>';
      }).join("");
      sec.hidden = false;
    });
  }

  function getUser() {
    try {
      var c = JSON.parse(sessionStorage.getItem("tr-aula-yo") || "null");
      if (c && Date.now() - c.t < 5 * 60 * 1000) return Promise.resolve(c.u);
    } catch (e) { /* nada */ }
    return fetch("/api/aula/yo", { credentials: "same-origin", cache: "no-store" }).then(function (r) {
      if (r.status === 401) return null;
      if (!r.ok) throw new Error("sin-servidor");
      return r.json();
    }).then(function (u) {
      if (u) sessionStorage.setItem("tr-aula-yo", JSON.stringify({ t: Date.now(), u: u }));
      return u;
    });
  }

  function fillUser(u) {
    USER = u;
    var first = String(u.nombre || u.usuario).split(/\s+/)[0];
    $$("[data-user-name]").forEach(function (el) { el.textContent = u.nombre || u.usuario; });
    $$("[data-user-first]").forEach(function (el) { el.textContent = first; });
    $$("[data-user-initials]").forEach(function (el) {
      el.textContent = String(u.nombre || u.usuario).split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
    });
  }

  /* ---------- WhatsApp de ayuda ---------- */
  $$("[data-aula-wa]").forEach(function (a) {
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      var who = USER ? " Soy " + (USER.nombre || USER.usuario) + " (usuario: " + USER.usuario + ")." : "";
      window.open(waLink("Hola TechRevive, necesito ayuda con el aula virtual." + who), "_blank", "noopener");
    });
  });

  /* ---------- Salir ---------- */
  $$("[data-logout]").forEach(function (b) {
    b.addEventListener("click", function () {
      b.disabled = true;
      sessionStorage.removeItem("tr-aula-yo");
      fetch("/api/aula/logout", { method: "POST", credentials: "same-origin", headers: { "x-aula": "1" } })
        .finally(function () { location.href = "/aula/ingresar"; });
    });
  });

  /* ---------- Página de ingreso ---------- */
  var loginForm = $("#aula-login");
  if (loginForm) {
    var params = new URLSearchParams(location.search);
    var volver = params.get("volver") || "";
    if (!/^\/aula\/(?!ingresar)/.test(volver)) volver = "/aula/";
    var errEl = $(".aula-login__error", loginForm);
    var btn = $('button[type="submit"]', loginForm);
    var btnHtml = btn.innerHTML;
    $("[data-toggle-pass]", loginForm).addEventListener("click", function () {
      var p = loginForm.elements.password, show = p.type === "password";
      p.type = show ? "text" : "password";
      this.textContent = show ? "Ocultar" : "Mostrar";
      this.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
    });
    sessionStorage.removeItem("tr-aula-yo");
    getUser().then(function (u) { if (u) location.replace(volver); }).catch(function () { /* sin servidor */ });
    loginForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var usuario = loginForm.elements.usuario.value.trim(), password = loginForm.elements.password.value;
      if (!usuario || !password) { errEl.textContent = "Escribe tu usuario y tu contraseña."; errEl.hidden = false; return; }
      errEl.hidden = true;
      btn.disabled = true; btn.textContent = "Ingresando…";
      fetch("/api/aula/login", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "x-aula": "1" },
        body: JSON.stringify({ usuario: usuario, password: password }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; });
      }).then(function (res) {
        if (!res.ok) throw new Error(res.d.error || "No se pudo ingresar. Inténtalo de nuevo.");
        location.href = volver;
      }).catch(function (e) {
        errEl.textContent = e.message === "Failed to fetch" ? "No hay conexión. Revisa tu internet." : e.message;
        errEl.hidden = false;
        btn.disabled = false; btn.innerHTML = btnHtml;
      });
    });
    return;
  }

  /* ---------- Progreso ---------- */
  function paintProgress() {
    var d = done();
    $$("[data-key]").forEach(function (a) { a.classList.toggle("is-done", !!d[a.getAttribute("data-key")]); });
    $$("[data-progress]").forEach(function (box) {
      var keys = JSON.parse(box.getAttribute("data-keys") || "[]");
      var n = keys.filter(function (k) { return d[k]; }).length;
      var pct = keys.length ? Math.round(n * 100 / keys.length) : 0;
      $(".aula-progress__bar span", box).style.width = pct + "%";
      var p = $("[data-progress-pct]", box); if (p) p.textContent = pct + "%";
      var c = $("[data-progress-count]", box); if (c) c.textContent = n;
    });
    $$(".aula-ol__mod").forEach(function (m) {
      var items = $$("[data-key]", m), n = items.filter(function (a) { return d[a.getAttribute("data-key")]; }).length;
      var el = $("[data-mod-count]", m); if (el) el.textContent = n + "/" + items.length;
      m.classList.toggle("is-complete", items.length && n === items.length);
    });
    $$("[data-continue]").forEach(function (b) {
      var keys = JSON.parse(b.getAttribute("data-continue") || "[]");
      var next = keys.filter(function (k) { return !d[k]; })[0];
      var started = keys.some(function (k) { return d[k]; });
      var label = $("span", b);
      if (!next) { label.textContent = "Repasar el curso"; b.href = b.getAttribute("data-first"); }
      else if (started) { label.textContent = "Continuar"; b.href = "/aula/" + next; }
    });
  }

  /* ---------- Tablero ---------- */
  function renderDashboard() {
    var box = $("[data-courses]");
    if (!box) return;
    var cat = JSON.parse(($("#aula-catalogo") || {}).textContent || "[]");
    var mine = USER && USER.cursos.indexOf("*") === -1 ? cat.filter(function (c) { return USER.cursos.indexOf(c.id) > -1; }) : cat;
    var d = done(), hechas = 0;
    box.innerHTML = mine.length ? mine.map(function (c) {
      var n = c.keys.filter(function (k) { return d[k]; }).length; hechas += n;
      var pct = c.total ? Math.round(n * 100 / c.total) : 0;
      var next = c.keys.filter(function (k) { return !d[k]; })[0];
      var label = !n ? "Comenzar" : next ? "Continuar" : "Repasar";
      var meta = [c.nivel, c.duracion, c.total + " lecciones"].filter(Boolean).map(esc).join(" · ");
      return '<article class="aula-course">' +
        '<a href="' + esc(c.url) + '" class="aula-course__media"><img src="' + esc(c.imagen) + '" alt="" loading="lazy" />' +
        (pct === 100 ? '<span class="aula-course__done">✓ Completado</span>' : "") + "</a>" +
        (function () { var ce = c.certificado && certFor(c.id); return ce && ce.estado === "aprobado" ? '<a class="aula-course__cert" href="' + certUrl(ce.id) + '" target="_blank" rel="noopener">🏅 Ver certificado</a>' : (pct === 100 && c.certificado && !ce && online() ? '<a class="aula-course__cert aula-course__cert--ask" href="' + esc(c.url) + '#certificado">🏅 Solicitar certificado</a>' : ""); })() +
        '<div class="aula-course__body"><p class="aula-course__meta">' + meta + "</p>" +
        '<h3><a href="' + esc(c.url) + '">' + esc(c.titulo) + "</a></h3>" +
        '<p class="aula-course__desc">' + esc(c.descripcion) + "</p>" +
        '<div class="aula-progress"><div class="aula-progress__bar"><span style="width:' + pct + '%"></span></div><p><strong>' + pct + "%</strong> · " + n + " de " + c.total + "</p></div>" +
        '<a href="' + esc(next ? c.urls[next] : c.url) + '" class="btn btn--primary btn--sm">' + label + "</a></div></article>";
    }).join("") : (libresDe(cat).length
      ? '<div class="aula-empty"><p>Todavía no tienes cursos.</p><p>Elige uno abajo en <strong>Cursos disponibles</strong> y empieza hoy mismo. 👇</p></div>'
      : '<div class="aula-empty"><p>Todavía no tienes cursos asignados.</p><p>Si ya te inscribiste, escríbenos y lo activamos.</p></div>');
    renderAvailable(cat);
    var s = function (k, v) { var el = $('[data-stat="' + k + '"]'); if (el) el.textContent = v; };
    s("cursos", mine.length); s("hechas", hechas);
    if (USER && USER.vence) { s("vence", fecha(USER.vence)); $("[data-stat-vence]").hidden = false; }
    var last = read("ultima", null);
    if (last && last.url) {
      var r = $("[data-resume]");
      r.href = last.url; $("[data-resume-title]", r).textContent = last.titulo; $("[data-resume-course]", r).textContent = last.curso;
      r.hidden = false;
    }
    if (new URLSearchParams(location.search).get("sin-acceso")) $("[data-noaccess]").hidden = false;
  }

  /* ---------- Cursos disponibles (inscripción libre) ---------- */
  function libresDe(cat) {
    var ids = (USER && USER.libres) || [];
    return cat.filter(function (c) { return ids.indexOf(c.id) > -1; });
  }
  function renderAvailable(cat) {
    var sec = $("[data-available]");
    if (!sec) return;
    var list = libresDe(cat);
    sec.hidden = !list.length;
    if (!list.length) return;
    $("[data-available-list]", sec).innerHTML = list.map(function (c) {
      var meta = [c.nivel, c.duracion, c.total + " lecciones"].filter(Boolean).map(esc).join(" · ");
      return '<article class="aula-course aula-course--new">' +
        '<div class="aula-course__media"><img src="' + esc(c.imagen) + '" alt="" loading="lazy" />' +
        (c.certificado ? '<span class="aula-course__badge">🏅 Con certificado</span>' : "") + "</div>" +
        '<div class="aula-course__body"><p class="aula-course__meta">' + meta + "</p>" +
        "<h3>" + esc(c.titulo) + "</h3>" +
        '<p class="aula-course__desc">' + esc(c.descripcion) + "</p>" +
        (c.docente ? '<p class="aula-course__meta">Docente: ' + esc(c.docente) + "</p>" : "") +
        '<button type="button" class="btn btn--primary btn--sm" data-enroll="' + esc(c.id) + '" data-title="' + esc(c.titulo) + '">Inscribirme</button></div></article>';
    }).join("");
    $$("[data-enroll]", sec).forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-enroll"), title = b.getAttribute("data-title");
        if (!confirm("¿Quieres inscribirte en «" + title + "»?\n\nEl curso aparecerá en «Mis cursos» y podrás empezar de inmediato.")) return;
        b.disabled = true; b.textContent = "Inscribiendo…";
        api("POST", "inscribir", { curso: id }).then(function () {
          sessionStorage.removeItem("tr-aula-yo");
          return getUser();
        }).then(function (u) {
          if (u) fillUser(u);
          renderDashboard();
          var first = (cat.filter(function (c) { return c.id === id; })[0] || {});
          if (first.url) location.href = first.url;
        }).catch(function (e) {
          alert(e.message || "No se pudo completar la inscripción. Intenta de nuevo.");
          b.disabled = false; b.textContent = "Inscribirme";
        });
      });
    });
  }

  /* ---------- Lección ---------- */
  var lesson = $("[data-lesson]"), lessonPaint = null;
  function initLesson() {
    if (!lesson) return;
    var key = lesson.getAttribute("data-lesson");
    write("ultima", { url: location.pathname, titulo: lesson.getAttribute("data-titulo"), curso: lesson.getAttribute("data-curso-titulo") });
    var btn = $("[data-done]");
    var isQuiz = lesson.getAttribute("data-tipo") === "cuestionario";
    function setDone(v, nota) {
      var d = done();
      if (v) d[key] = d[key] || Date.now(); else delete d[key];
      write("hechas", d);
      pushProgress([{ leccion: key, hecho: !!v, ts: d[key], nota: nota }]);
      paint();
    }
    function paint() {
      var on = !!done()[key];
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      $("span", btn).textContent = on ? "Lección completada" : "Marcar como completada";
      if (isQuiz) {
        btn.hidden = !on; btn.disabled = true;
        var st = $("[data-quiz-state]"); if (st) st.hidden = on;
      }
      paintProgress();
    }
    lessonPaint = paint;
    btn.addEventListener("click", function () { if (!isQuiz) setDone(!done()[key]); });
    paint();
    // lecciones de lectura y video: se marcan solas al llegar al final de la página
    if (["lectura", "video"].indexOf(lesson.getAttribute("data-tipo")) > -1 && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && !done()[key]) { setTimeout(function () { if (!done()[key]) setDone(true); }, 2500); io.disconnect(); }
      });
      io.observe($(".aula-pager"));
    }
    // menú lateral en celular
    var tg = $(".aula-side-toggle"), side = $("#aula-side");
    tg.addEventListener("click", function () {
      var open = !side.classList.contains("is-open");
      side.classList.toggle("is-open", open); tg.setAttribute("aria-expanded", open);
    });
    document.addEventListener("click", function (ev) {
      if (side.classList.contains("is-open") && !side.contains(ev.target) && !tg.contains(ev.target)) {
        side.classList.remove("is-open"); tg.setAttribute("aria-expanded", "false");
      }
    });
    // cuestionario
    var quiz = $(".quiz");
    if (quiz) initQuiz(quiz, key, setDone);
    initChecklists(key); initTyping();
    // tarea por WhatsApp
    $$("[data-task-wa]").forEach(function (a) {
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        var who = USER ? (USER.nombre || USER.usuario) + " (usuario: " + USER.usuario + ")" : "";
        window.open(waLink("Hola TechRevive, envío mi tarea.\nAlumno: " + who + "\nCurso: " + a.getAttribute("data-curso") + "\nTarea: " + a.getAttribute("data-tarea").replace(/^tarea:\s*/i, "") + "\n(Adjunto mis archivos)"), "_blank", "noopener");
      });
    });
    var cur = $(".aula-ol__item.is-current");
    if (cur && cur.scrollIntoView && window.innerWidth > 1024) cur.scrollIntoView({ block: "center" });
  }

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = list[i]; list[i] = list[j]; list[j] = t; }
    return list;
  }
  function initQuiz(form, key, setDone) {
    var min = Number(form.getAttribute("data-min") || 70);
    var result = $(".quiz__result", form), reset = $("[data-quiz-reset]", form), bestEl = $("[data-quiz-best]", form);
    var submit = $('button[type="submit"]', form), foot = $(".quiz__foot", form);
    var notas = read("notas", {});
    function showBest() {
      if (notas[key] != null) { bestEl.textContent = "Tu mejor nota: " + notas[key] + "%"; bestEl.hidden = false; }
    }
    // Preguntas y opciones en orden aleatorio en cada intento
    function mix() {
      var qs = shuffle($$(".quiz__q", form));
      qs.forEach(function (q, i) {
        form.insertBefore(q, foot);
        var n = $("legend span", q); if (n) n.textContent = i + 1;
        var box = $(".quiz__opts", q); shuffle($$(".quiz__opt", box)).forEach(function (o) { box.appendChild(o); });
      });
    }
    mix(); showBest();
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var qs = $$(".quiz__q", form), resp = {}, falt = qs.filter(function (q) { return !$("input:checked", q); });
      if (falt.length) {
        result.className = "quiz__result is-warn"; result.hidden = false;
        result.textContent = falt.length === 1 ? "Te falta responder 1 pregunta." : "Te faltan " + falt.length + " preguntas por responder.";
        falt[0].scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      qs.forEach(function (q) { resp[q.getAttribute("data-q")] = Number($("input:checked", q).value); });
      submit.disabled = true; submit.textContent = "Revisando…";
      api("POST", "quiz", { leccion: key, respuestas: resp }).then(function (r) {
        qs.forEach(function (q) {
          var d = r.detalle[Number(q.getAttribute("data-q"))] || {};
          q.classList.add(d.bien ? "is-right" : "is-wrong");
          $$(".quiz__opt", q).forEach(function (o) {
            var v = Number($("input", o).value);
            if (d.correcta) o.classList.toggle("is-answer", v === d.correcta);
            o.classList.toggle("is-picked-wrong", v === d.elegida && !d.bien);
            $("input", o).disabled = true;
          });
          var exp = $(".quiz__exp", q);
          if (exp) { exp.textContent = d.explicacion || ""; exp.hidden = !d.explicacion; }
        });
        notas[key] = Math.max(notas[key] || 0, r.pct); write("notas", notas); showBest();
        result.className = "quiz__result " + (r.pass ? "is-pass" : "is-fail"); result.hidden = false;
        result.innerHTML = "<strong>" + r.pct + "%</strong> · " + r.ok + " de " + r.total + " correctas. " +
          (r.pass ? "¡Aprobaste! La lección quedó marcada como completada."
            : r.examen ? "Necesitas " + r.min + "% para aprobar. Las preguntas en rojo son las que fallaste: repasa esos temas en las lecciones y vuelve a intentarlo."
            : "Necesitas " + r.min + "% para aprobar. Revisa las explicaciones e inténtalo de nuevo.");
        if (r.pass) setDone(true, notas[key]);
        submit.hidden = true; reset.hidden = false;
        result.scrollIntoView({ behavior: "smooth", block: "center" });
      }).catch(function (e) {
        result.className = "quiz__result is-warn"; result.hidden = false;
        result.textContent = e.status === 401 ? "Tu sesión terminó. Vuelve a entrar al aula para enviar tus respuestas." : (e.message || "No se pudieron revisar tus respuestas. Revisa tu conexión e inténtalo de nuevo.");
      }).finally(function () {
        submit.disabled = false; submit.innerHTML = submit.getAttribute("data-label") || submit.innerHTML;
      });
    });
    submit.setAttribute("data-label", submit.innerHTML);
    reset.addEventListener("click", function () {
      $$(".quiz__q", form).forEach(function (q) { q.classList.remove("is-right", "is-wrong"); var x = $(".quiz__exp", q); if (x) { x.hidden = true; x.textContent = ""; } });
      $$(".quiz__opt", form).forEach(function (o) { o.classList.remove("is-answer", "is-picked-wrong"); var i = $("input", o); i.disabled = false; i.checked = false; });
      mix();
      result.hidden = true; reset.hidden = true; submit.hidden = false;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ---------- Bloques interactivos de las lecciones ---------- */
  // Lista de verificación: <ul class="checklist"> → cada punto se puede marcar (se guarda en el navegador)
  function initChecklists(key) {
    $$(".aula-rich ul.checklist").forEach(function (ul, n) {
      var id = "check:" + key + ":" + n, st = read(id, {});
      $$("li", ul).forEach(function (li, i) {
        li.setAttribute("role", "checkbox"); li.tabIndex = 0;
        var paint = function () { li.classList.toggle("is-checked", !!st[i]); li.setAttribute("aria-checked", st[i] ? "true" : "false"); };
        var toggle = function () { st[i] = !st[i]; write(id, st); paint(); };
        li.addEventListener("click", function (ev) { if (ev.target.tagName !== "A") toggle(); });
        li.addEventListener("keydown", function (ev) { if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); toggle(); } });
        paint();
      });
    });
  }
  // Práctica de mecanografía: <aside class="typing"><p>Texto a copiar</p></aside>
  function initTyping() {
    $$(".aula-rich aside.typing").forEach(function (box) {
      var text = (box.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) return;
      box.innerHTML = '<p class="typing__label">⌨️ Práctica de mecanografía: copia el texto tal como está (con tildes y signos).</p>' +
        '<p class="typing__text"></p><textarea class="typing__input" rows="3" spellcheck="false" autocomplete="off" placeholder="Empieza a escribir aquí… el tiempo corre desde la primera tecla"></textarea>' +
        '<p class="typing__stats"><span data-t="ppm">—</span> palabras por minuto · <span data-t="pre">100</span>% de precisión · <span data-t="avance">0</span>% completado</p>' +
        '<button type="button" class="btn btn--outline btn--sm">Reiniciar</button>';
      var shown = $(".typing__text", box), input = $(".typing__input", box), t0 = 0;
      var paintText = function (typed) {
        shown.innerHTML = text.split("").map(function (ch, i) {
          var cls = i < typed.length ? (typed[i] === ch ? "ok" : "bad") : (i === typed.length ? "cur" : "");
          return '<span class="' + cls + '">' + esc(ch) + "</span>";
        }).join("");
      };
      var stat = function (k, v) { $('[data-t="' + k + '"]', box).textContent = v; };
      paintText("");
      input.addEventListener("input", function () {
        var typed = input.value;
        if (!t0 && typed) t0 = Date.now();
        var good = 0; for (var i = 0; i < typed.length; i++) if (typed[i] === text[i]) good++;
        var min = (Date.now() - t0) / 60000;
        stat("ppm", typed && min > 0.08 ? Math.round(good / 5 / min) : "—");
        stat("pre", typed ? Math.round(good * 100 / typed.length) : 100);
        stat("avance", Math.min(100, Math.round(typed.length * 100 / text.length)));
        paintText(typed);
        if (typed.length >= text.length) { input.disabled = true; box.classList.add("is-done"); }
      });
      $("button", box).addEventListener("click", function () { input.disabled = false; input.value = ""; t0 = 0; box.classList.remove("is-done"); paintText(""); stat("ppm", "—"); stat("pre", 100); stat("avance", 0); input.focus(); });
    });
  }

  /* ---------- Inicio ---------- */
  getUser().then(function (u) {
    if (!u) { location.href = "/aula/ingresar?volver=" + encodeURIComponent(location.pathname); return; }
    fillUser(u);
    renderDashboard(); initLesson(); paintProgress(); initCertCard();
    syncProgress().then(function (changed) {
      if (changed) { renderDashboard(); paintProgress(); if (lessonPaint) lessonPaint(); }
      var cb = $("[data-cert]"); if (cb && cb.__render) cb.__render();
      if ($("[data-courses]")) loadCerts().then(function () { renderDashboard(); renderMyCerts(); });
    });
  }).catch(function () {
    // Sin servidor del aula (vista previa local): se muestra igual, sin datos del alumno.
    fillUser({ usuario: "vista-previa", nombre: "Vista previa", cursos: ["*"] });
    renderDashboard(); initLesson(); paintProgress();
  });
})();
