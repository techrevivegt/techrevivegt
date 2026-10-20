/* ==========================================================================
   TECHREVIVE · Interacciones del sitio
   Los datos de contacto se editan en js/config.js
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.TECHREVIVE_CONFIG || {};
  document.documentElement.classList.add("js");

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 1. Configuración (WhatsApp, correo, redes, mapa…) ---------- */
  function waUrl(message) {
    if (!cfg.whatsapp) return "contacto.html";
    var text = message || cfg.whatsappMessage || "";
    return "https://wa.me/" + cfg.whatsapp + (text ? "?text=" + encodeURIComponent(text) : "");
  }

  $$("[data-wa]").forEach(function (a) {
    a.href = waUrl(a.getAttribute("data-wa-msg"));
    if (cfg.whatsapp) { a.target = "_blank"; a.rel = "noopener"; }
  });

  $$("[data-cfg]").forEach(function (el) {
    var value = cfg[el.getAttribute("data-cfg")];
    if (value) el.textContent = value;
  });

  $$("[data-cfg-mail]").forEach(function (a) { if (cfg.email) a.href = "mailto:" + cfg.email; });

  var social = cfg.social || {};
  $$("[data-social]").forEach(function (a) {
    var url = social[a.getAttribute("data-social")];
    if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; }
    else {
      a.setAttribute("title", "Enlace pendiente de configurar");
      a.addEventListener("click", function (e) { e.preventDefault(); });
    }
  });

  // Mapa de Google (no necesita API key)
  var mapQuery = cfg.mapQuery || cfg.address || "Ciudad de Guatemala";
  $$("[data-map]").forEach(function (f) {
    f.src = "https://www.google.com/maps?q=" + encodeURIComponent(mapQuery) + "&output=embed";
  });
  $$("[data-map-link]").forEach(function (a) {
    a.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(mapQuery);
    a.target = "_blank"; a.rel = "noopener";
  });

  // Aula virtual
  $$("[data-aula]").forEach(function (a) {
    if (cfg.aulaVirtualUrl) {
      a.href = cfg.aulaVirtualUrl; a.target = "_blank"; a.rel = "noopener";
    } else {
      a.classList.add("is-disabled");
      a.setAttribute("aria-disabled", "true");
      var label = a.querySelector("[data-aula-label]");
      if (label) label.textContent = "Próximamente";
      a.addEventListener("click", function (e) { e.preventDefault(); });
    }
  });
  $$("[data-aula-pending]").forEach(function (el) { if (cfg.aulaVirtualUrl) el.hidden = true; });

  /* ---------- 2. Header y menú ---------- */
  var header = $("#header");
  function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 20); }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var toggle = $("#menuToggle");
  var nav = $("#nav");
  var mobileMQ = window.matchMedia("(max-width: 1180px)");

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    header.classList.toggle("menu-active", open);
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  }
  toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });

  // Submenús
  $$(".nav__sub-toggle").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var item = btn.closest(".has-sub");
      var open = !item.classList.contains("is-open");
      $$(".has-sub.is-open").forEach(function (o) {
        if (o !== item) { o.classList.remove("is-open"); $(".nav__sub-toggle", o).setAttribute("aria-expanded", "false"); }
      });
      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  document.addEventListener("click", function (e) {
    if (!mobileMQ.matches && !e.target.closest(".has-sub")) {
      $$(".has-sub.is-open").forEach(function (o) { o.classList.remove("is-open"); $(".nav__sub-toggle", o).setAttribute("aria-expanded", "false"); });
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var openSub = $(".has-sub.is-open");
    if (openSub) {
      openSub.classList.remove("is-open");
      var b = $(".nav__sub-toggle", openSub); b.setAttribute("aria-expanded", "false"); b.focus();
    } else if (nav.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
  });

  nav.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (a && a.getAttribute("href") && a.getAttribute("href").indexOf("#") !== -1) setMenu(false);
  });
  window.addEventListener("resize", function () { if (!mobileMQ.matches) setMenu(false); });

  /* ---------- 3. Animaciones al hacer scroll ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- 4. Filtros (proyectos, galería, cursos) ---------- */
  $$(".filters").forEach(function (group) {
    var target = group.getAttribute("data-target") ? $(group.getAttribute("data-target")) : group.nextElementSibling;
    if (!target) return;
    var buttons = $$(".filter", group);
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter");
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-pressed", String(on));
        });
        $$("[data-category]", target).forEach(function (item) {
          var cats = (item.getAttribute("data-category") || "").split(" ");
          var show = f === "all" || cats.indexOf(f) !== -1 || cats.indexOf("all") !== -1;
          item.classList.toggle("is-hidden", !show);
          item.classList.remove("is-filtering");
          if (show) { void item.offsetWidth; item.classList.add("is-filtering", "is-visible"); }
        });
      });
    });
  });

  /* ---------- 5. Galería con visor (lightbox) ---------- */
  var gallery = $$(".gallery__item");
  if (gallery.length) {
    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Visor de imágenes");
    lb.innerHTML =
      '<button class="lightbox__btn lightbox__close" aria-label="Cerrar">&times;</button>' +
      '<button class="lightbox__btn lightbox__prev" aria-label="Anterior">&#8249;</button>' +
      '<figure class="lightbox__figure"><img alt="" /><figcaption></figcaption></figure>' +
      '<button class="lightbox__btn lightbox__next" aria-label="Siguiente">&#8250;</button>';
    document.body.appendChild(lb);
    var lbImg = $("img", lb), lbCap = $("figcaption", lb), current = 0, lastFocus = null;

    function visibleItems() { return gallery.filter(function (g) { return !g.classList.contains("is-hidden"); }); }
    function show(i) {
      var items = visibleItems(); if (!items.length) return;
      current = (i + items.length) % items.length;
      var it = items[current], im = $("img", it);
      lbImg.src = im.getAttribute("src"); lbImg.alt = im.alt;
      lbCap.textContent = it.getAttribute("data-caption") || im.alt;
    }
    function openLb(item) {
      lastFocus = document.activeElement;
      show(visibleItems().indexOf(item));
      lb.classList.add("is-open"); document.body.classList.add("menu-open");
      $(".lightbox__close", lb).focus();
    }
    function closeLb() {
      lb.classList.remove("is-open"); document.body.classList.remove("menu-open");
      if (lastFocus) lastFocus.focus();
    }
    gallery.forEach(function (g) { g.addEventListener("click", function () { openLb(g); }); });
    $(".lightbox__close", lb).addEventListener("click", closeLb);
    $(".lightbox__prev", lb).addEventListener("click", function () { show(current - 1); });
    $(".lightbox__next", lb).addEventListener("click", function () { show(current + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
  }

  /* ---------- 6. Preseleccionar opciones en formularios ---------- */
  function preselect(select, value) {
    if (!select || !value) return;
    var match = Array.prototype.some.call(select.options, function (o) { return o.value === value || o.text === value; });
    if (match) { select.value = value; clearError(select); }
  }
  $$("[data-service]").forEach(function (el) {
    el.addEventListener("click", function () {
      preselect($("form.js-form select[name='servicio']"), el.getAttribute("data-service"));
    });
  });
  // Desde otra página: contacto.html?servicio=Reparación · inscripcion.html?curso=Ofimática
  var params = new URLSearchParams(window.location.search);
  params.forEach(function (value, key) {
    preselect($("form.js-form select[name='" + key + "']"), value);
  });

  /* ---------- 7. Formularios (contacto e inscripción) ---------- */
  function fieldOf(input) { return input.closest(".field"); }
  function setError(input, msg) {
    var f = fieldOf(input); if (!f) return;
    f.classList.add("has-error");
    var err = $(".field__error", f); if (err) err.textContent = msg;
    input.setAttribute("aria-invalid", "true");
  }
  function clearError(input) {
    var f = fieldOf(input); if (!f) return;
    f.classList.remove("has-error");
    var err = $(".field__error", f); if (err) err.textContent = "";
    input.removeAttribute("aria-invalid");
  }

  $$("form.js-form").forEach(function (form) {
    var statusEl = $(".form__status", form);
    var submitBtn = $(".form__submit", form);
    var submitText = $(".form__submit-text", form);
    var originalText = submitText ? submitText.textContent : "";
    var fields = $$("input:not([type=hidden]):not([name=_gotcha]), select, textarea", form);

    fields.forEach(function (input) {
      input.addEventListener("input", function () { if (fieldOf(input) && fieldOf(input).classList.contains("has-error")) clearError(input); });
      input.addEventListener("change", function () { clearError(input); });
    });

    function validate() {
      var first = null;
      fields.forEach(function (input) {
        var value = (input.value || "").trim();
        var ok = input.checkValidity() && !(input.required && !value);
        if (input.type === "tel" && value && value.replace(/\D/g, "").length < 8) ok = false;
        if (!ok) { setError(input, input.getAttribute("data-error") || "Revisa este campo."); first = first || input; }
        else clearError(input);
      });
      if (first) first.focus();
      return !first;
    }

    function labelOf(input) {
      var l = form.querySelector("label[for='" + input.id + "']");
      return l ? l.textContent.replace("*", "").trim() : input.name;
    }

    function showStatus(type, text) { statusEl.className = "form__status is-" + type; statusEl.textContent = text; }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      statusEl.textContent = ""; statusEl.className = "form__status";
      if (form.elements._gotcha && form.elements._gotcha.value) return;
      if (!validate()) return;

      var data = {}, lines = [];
      fields.forEach(function (input) {
        var v = (input.value || "").trim();
        if (!v) return;
        data[input.name] = v;
        lines.push("*" + labelOf(input) + ":* " + v);
      });
      data._formulario = form.getAttribute("data-form-name") || "Contacto";
      var nombre = (data.nombre || "").split(" ")[0];

      if (cfg.formEndpoint) {
        submitBtn.disabled = true; submitText.textContent = "Enviando…";
        fetch(cfg.formEndpoint, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(data)
        }).then(function (res) {
          if (!res.ok) throw new Error(res.status);
          form.reset();
          showStatus("success", "¡Gracias" + (nombre ? ", " + nombre : "") + "! Recibimos tu solicitud y te contactaremos pronto.");
        }).catch(function () {
          showStatus("error", "No pudimos enviar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.");
        }).finally(function () { submitBtn.disabled = false; submitText.textContent = originalText; });
        return;
      }

      if (cfg.whatsapp) {
        var intro = form.getAttribute("data-wa-intro") || "Hola TechRevive, quiero solicitar un servicio.";
        window.open(waUrl(intro + "\n\n" + lines.join("\n")), "_blank", "noopener");
        showStatus("success", "¡Listo! Abrimos WhatsApp con tu solicitud. Solo presiona «Enviar» para que nos llegue.");
        form.reset();
      } else {
        showStatus("error", "Falta configurar el número de WhatsApp en js/config.js.");
      }
    });
  });
})();
