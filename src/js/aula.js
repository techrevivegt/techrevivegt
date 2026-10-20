/* ==========================================================================
   TECHREVIVE · Aula virtual
   El progreso (lecciones completadas, cuestionarios) se guarda en este dispositivo.
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
        '<div class="aula-course__body"><p class="aula-course__meta">' + meta + "</p>" +
        '<h3><a href="' + esc(c.url) + '">' + esc(c.titulo) + "</a></h3>" +
        '<p class="aula-course__desc">' + esc(c.descripcion) + "</p>" +
        '<div class="aula-progress"><div class="aula-progress__bar"><span style="width:' + pct + '%"></span></div><p><strong>' + pct + "%</strong> · " + n + " de " + c.total + "</p></div>" +
        '<a href="' + esc(next ? c.urls[next] : c.url) + '" class="btn btn--primary btn--sm">' + label + "</a></div></article>";
    }).join("") : '<div class="aula-empty"><p>Todavía no tienes cursos asignados.</p><p>Si ya te inscribiste, escríbenos y lo activamos.</p></div>';
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

  /* ---------- Lección ---------- */
  var lesson = $("[data-lesson]");
  function initLesson() {
    if (!lesson) return;
    var key = lesson.getAttribute("data-lesson");
    write("ultima", { url: location.pathname, titulo: lesson.getAttribute("data-titulo"), curso: lesson.getAttribute("data-curso-titulo") });
    var btn = $("[data-done]");
    function setDone(v) {
      var d = done();
      if (v) d[key] = Date.now(); else delete d[key];
      write("hechas", d);
      paint();
    }
    function paint() {
      var on = !!done()[key];
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      $("span", btn).textContent = on ? "Lección completada" : "Marcar como completada";
      paintProgress();
    }
    btn.addEventListener("click", function () { setDone(!done()[key]); });
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

  function initQuiz(form, key, setDone) {
    var min = Number(form.getAttribute("data-min") || 70);
    var result = $(".quiz__result", form), reset = $("[data-quiz-reset]", form), bestEl = $("[data-quiz-best]", form);
    var notas = read("notas", {});
    function showBest() {
      if (notas[key] != null) { bestEl.textContent = "Tu mejor nota: " + notas[key] + "%"; bestEl.hidden = false; }
    }
    showBest();
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var qs = $$(".quiz__q", form), ok = 0, falt = 0;
      qs.forEach(function (q) { if (!$("input:checked", q)) falt++; });
      if (falt) {
        result.className = "quiz__result is-warn"; result.hidden = false;
        result.textContent = falt === 1 ? "Te falta responder 1 pregunta." : "Te faltan " + falt + " preguntas por responder.";
        var first = qs.filter(function (q) { return !$("input:checked", q); })[0];
        first.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      qs.forEach(function (q) {
        var right = q.getAttribute("data-ok"), pick = $("input:checked", q).value;
        var good = pick === right; if (good) ok++;
        q.classList.add(good ? "is-right" : "is-wrong");
        $$(".quiz__opt", q).forEach(function (o) {
          var v = $("input", o).value;
          o.classList.toggle("is-answer", v === right);
          o.classList.toggle("is-picked-wrong", v === pick && !good);
          $("input", o).disabled = true;
        });
        var exp = $(".quiz__exp", q); if (exp && exp.textContent.trim()) exp.hidden = false;
      });
      var pct = Math.round(ok * 100 / qs.length), pass = pct >= min;
      notas[key] = Math.max(notas[key] || 0, pct); write("notas", notas); showBest();
      result.className = "quiz__result " + (pass ? "is-pass" : "is-fail"); result.hidden = false;
      result.innerHTML = "<strong>" + pct + "%</strong> · " + ok + " de " + qs.length + " correctas. " +
        (pass ? "¡Aprobaste! La lección quedó marcada como completada." : "Necesitas " + min + "% para aprobar. Revisa las explicaciones e inténtalo de nuevo.");
      if (pass) setDone(true);
      $('button[type="submit"]', form).hidden = true; reset.hidden = false;
      result.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    reset.addEventListener("click", function () {
      $$(".quiz__q", form).forEach(function (q) { q.classList.remove("is-right", "is-wrong"); var x = $(".quiz__exp", q); if (x) x.hidden = true; });
      $$(".quiz__opt", form).forEach(function (o) { o.classList.remove("is-answer", "is-picked-wrong"); var i = $("input", o); i.disabled = false; i.checked = false; });
      result.hidden = true; reset.hidden = true; $('button[type="submit"]', form).hidden = false;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ---------- Inicio ---------- */
  getUser().then(function (u) {
    if (!u) { location.href = "/aula/ingresar?volver=" + encodeURIComponent(location.pathname); return; }
    fillUser(u);
    renderDashboard(); initLesson(); paintProgress();
  }).catch(function () {
    // Sin servidor del aula (vista previa local): se muestra igual, sin datos del alumno.
    fillUser({ usuario: "vista-previa", nombre: "Vista previa", cursos: ["*"] });
    renderDashboard(); initLesson(); paintProgress();
  });
})();
