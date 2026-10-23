/* TechRevive · Panel de administración
   Lee la estructura de schema.json y arma los formularios automáticamente.
   Guarda a través de /api (Worker) → GitHub → Cloudflare publica el sitio. */
(() => {
  "use strict";

  const app = document.getElementById("app");
  const toasts = document.getElementById("toasts");
  const LOGO = "/img/logo-icono.png";

  const S = {
    schema: null,
    estado: null,
    view: null,       // { section, entry }
    doc: null,        // datos en edición
    sha: null,
    path: null,
    isNew: false,
    dirty: false,
    previews: {},     // url -> dataURL de imágenes recién subidas
    watch: null,      // seguimiento de la publicación
    blogCache: null,
  };

  /* ───────── utilidades ───────── */
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  };
  let uid = 0;
  const nextId = () => `f${++uid}`;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const slugify = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
  const stripEmoji = (s) => String(s || "").replace(/^[^\p{L}\p{N}¿¡]+/u, "").trim();
  const emojiOf = (s) => { const m = String(s || "").match(/^([^\p{L}\p{N}¿¡\s]+)\s/u); return m ? m[1] : "•"; };
  const today = () => new Date().toISOString().slice(0, 10);

  function toast(msg, type = "", ms = 4500) {
    const el = h("div", { class: `toast ${type ? "toast--" + type : ""}`, role: type === "error" ? "alert" : "status" });
    if (msg.nodeType) el.append(msg); else el.textContent = msg;
    toasts.append(el);
    setTimeout(() => el.remove(), ms);
  }

  async function api(method, route, body) {
    const res = await fetch(`/api/${route}`, {
      method,
      credentials: "same-origin",
      headers: { "x-panel": "1", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch { /* respuesta vacía */ }
    if (res.status === 401 && data.login) { S.dirty = false; renderLogin("Tu sesión terminó. Vuelve a entrar."); throw new Error("sesión"); }
    if (!res.ok) { const e = new Error(data.error || `Error ${res.status}`); e.data = data; throw e; }
    return data;
  }

  /* ───────── arranque ───────── */
  async function boot() {
    try {
      const [estado, schema] = await Promise.all([
        fetch("/api/estado", { credentials: "same-origin" }).then((r) => {
          if (!r.ok) throw new Error("sin-api");
          return r.json();
        }),
        fetch("schema.json", { cache: "no-cache" }).then((r) => r.json()),
      ]);
      S.estado = estado;
      S.schema = schema;
      if (!estado.configurado.contrasena || !estado.configurado.token || !estado.configurado.repositorio) return renderSetup(estado);
      if (!estado.sesion) return renderLogin();
      renderApp();
    } catch (err) {
      renderSetup(null);
    }
  }

  /* ───────── pantallas de acceso ───────── */
  function authShell(...kids) {
    app.className = "";
    app.replaceChildren(h("div", { class: "auth" }, h("div", { class: "auth__card" + (kids.wide ? " auth__card--wide" : "") }, ...kids)));
  }
  const brand = () => h("div", { class: "auth__brand" }, h("img", { src: LOGO, alt: "" }), h("div", { class: "brand-text", html: "TECH<span>REVIVE</span>" }));

  function renderLogin(msg) {
    const err = h("div", { class: "auth__error", hidden: !msg }, msg || "");
    const input = h("input", { class: "input", type: "password", id: "pw", autocomplete: "current-password", required: true, placeholder: "Tu contraseña" });
    const btn = h("button", { class: "btn btn--primary btn--lg btn--block", type: "submit" }, "Entrar al panel");
    const form = h("form", {
      onsubmit: async (e) => {
        e.preventDefault();
        btn.disabled = true; btn.textContent = "Entrando…"; err.hidden = true;
        try {
          await api("POST", "login", { password: input.value });
          S.estado = await fetch("/api/estado", { credentials: "same-origin" }).then((r) => r.json());
          renderApp();
        } catch (ex) {
          err.textContent = ex.message; err.hidden = false;
          btn.disabled = false; btn.textContent = "Entrar al panel"; input.select();
        }
      },
    }, err, h("div", { class: "field" }, h("label", { for: "pw" }, "Contraseña"), input), btn);
    authShell(brand(), h("h1", {}, "Panel de administración"), h("p", {}, "Edita textos, fotos, servicios, cursos y artículos de tu sitio."), form,
      h("div", { class: "auth__foot" }, h("a", { href: "/" }, "← Volver al sitio")));
    setTimeout(() => input.focus(), 50);
  }

  function renderSetup(estado) {
    const c = estado ? estado.configurado : null;
    const mark = (ok) => ok ? "✅" : "⬜";
    const card = h("div", { class: "auth__card auth__card--wide" },
      brand(),
      h("h1", {}, "Falta un último paso"),
      h("p", {}, c ? "El panel ya está instalado. Solo falta darle la contraseña y el permiso para guardar en GitHub. Se hace una sola vez en Cloudflare:"
        : "El servidor del panel todavía no está activo. Sube a GitHub todos los archivos del zip (incluida la carpeta «worker» y el archivo «wrangler.jsonc») y espera a que Cloudflare publique. Después configura esto en Cloudflare:"),
      h("ol", { class: "steps" },
        h("li", { html: `Entra en <b>Cloudflare → Workers &amp; Pages → techrevive → Settings → Variables and Secrets</b> y pulsa <b>+ Add</b>.` }),
        h("li", { html: `${mark(c && c.contrasena)} Tipo <b>Secret</b>, nombre <code>PANEL_PASSWORD</code>, valor: la contraseña que quieras usar para entrar.` }),
        h("li", { html: `${mark(c && c.token)} Tipo <b>Secret</b>, nombre <code>GITHUB_TOKEN</code>, valor: tu token de GitHub (la guía explica cómo crearlo).` }),
        h("li", { html: `${mark(c && c.repositorio)} <code>GITHUB_REPO</code> ya viene en el archivo <code>wrangler.jsonc</code>${estado && estado.repositorio ? ` (<b>${estado.repositorio.replace(/[<>&]/g, "")}</b>)` : ""}.` }),
        h("li", { html: `Pulsa <b>Deploy</b> o <b>Save</b> y recarga esta página.` })),
      h("div", { class: "auth__foot" }, h("button", { class: "btn btn--primary", onclick: () => location.reload() }, "Ya lo hice, recargar"), " ", h("a", { href: "/", class: "btn btn--ghost" }, "Ver el sitio")));
    app.className = "";
    app.replaceChildren(h("div", { class: "auth" }, card));
  }

  /* ───────── aplicación ───────── */
  let layout, navEl, topTitle, topCrumb, saveBtn, pubEl, contentEl;

  function allSections() {
    const out = [];
    for (const s of S.schema.sections) {
      if (s.group) s.items.forEach((i) => out.push({ ...i, group: s.group }));
      else out.push(s);
    }
    return out;
  }
  const findSection = (id) => allSections().find((s) => s.id === id);

  function renderApp() {
    app.className = "";
    navEl = h("nav", { class: "nav", "aria-label": "Secciones" });
    const side = h("aside", { class: "side" },
      h("a", { class: "side__brand", href: "#/" }, h("img", { src: LOGO, alt: "" }), h("span", { class: "brand-text", html: "TECH<span>REVIVE</span>" })),
      h("div", { class: "side__tag" }, "Panel de administración"),
      navEl,
      h("div", { class: "side__foot" },
        h("a", { href: "/", target: "_blank", rel: "noopener" }, "↗ Ver mi sitio"),
        h("button", { onclick: logout }, "⎋ Cerrar sesión")));
    topTitle = h("h1", {}, "");
    topCrumb = h("div", { class: "topbar__crumb" }, "");
    saveBtn = h("button", { class: "btn btn--primary", disabled: true, onclick: save }, "💾 Guardar cambios");
    pubEl = h("span", { class: "pub", role: "status", "aria-live": "polite" });
    const topbar = h("header", { class: "topbar" }, h("div", { class: "topbar__inner" },
      h("button", { class: "icon-btn menu-btn", "aria-label": "Abrir menú", onclick: () => layout.classList.toggle("nav-open") }, "☰"),
      h("div", { class: "topbar__title" }, topCrumb, topTitle),
      h("div", { class: "topbar__actions" }, pubEl, h("span", { class: "dirty-dot hide-sm" }, "Sin guardar"), saveBtn)));
    contentEl = h("main", { class: "content", id: "contenido" });
    layout = h("div", { class: "layout" }, side, h("div", { class: "main" }, topbar, contentEl));
    layout.addEventListener("click", (e) => { if (e.target === layout && layout.classList.contains("nav-open")) layout.classList.remove("nav-open"); });
    app.replaceChildren(layout);
    buildNav();
    route();
    refreshBadges();
    if (!S.badgeTimer) S.badgeTimer = setInterval(() => { if (layout && document.visibilityState === "visible") refreshBadges(); }, 120000);
  }

  function buildNav() {
    const link = (href, label, emoji) => h("a", { href, dataset: { href } }, h("span", { class: "nav__emoji" }, emoji), h("span", {}, label));
    navEl.replaceChildren(link("#/", "Inicio del panel", "🏠"));
    for (const s of S.schema.sections) {
      if (s.group) {
        navEl.append(h("div", { class: "nav__group" }, stripEmoji(s.group)));
        s.items.forEach((i) => navEl.append(link(`#/${i.id}`, stripEmoji(i.label), emojiOf(i.label))));
      } else {
        navEl.append(link(`#/${s.id}`, stripEmoji(s.label), emojiOf(s.label)));
      }
    }
  }

  function markNav() {
    const cur = "#/" + (S.view && S.view.section ? S.view.section : "");
    navEl.querySelectorAll("a").forEach((a) => a.classList.toggle("is-active", a.dataset.href === cur));
  }

  function setDirty(v) {
    S.dirty = v;
    if (saveBtn) saveBtn.disabled = !v;
    layout && layout.classList.toggle("is-dirty", v);
  }

  let lastHash = location.hash;
  window.addEventListener("hashchange", () => {
    if (!layout) return;
    if (S.dirty && !confirm("Tienes cambios sin guardar. ¿Salir sin guardarlos?")) {
      history.replaceState(null, "", lastHash || "#/");
      return;
    }
    route();
  });
  window.addEventListener("beforeunload", (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ""; } });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && layout) { e.preventDefault(); if (S.dirty) save(); }
  });

  function route() {
    lastHash = location.hash;
    layout.classList.remove("nav-open");
    setDirty(false);
    const parts = (location.hash.replace(/^#\/?/, "") || "").split("/").filter(Boolean).map(decodeURIComponent);
    window.scrollTo(0, 0);
    if (!parts.length) { S.view = { section: "" }; markNav(); return renderHome(); }
    const sec = findSection(parts[0]);
    if (!sec) { location.hash = "#/"; return; }
    S.view = { section: sec.id, entry: parts[1] || null };
    markNav();
    if (sec.type === "collection") return parts[1] ? openEntry(sec, parts[1]) : renderCollection(sec);
    if (sec.type === "custom") { saveBtn.hidden = true; setTitle(stripEmoji(sec.label), sec.group ? stripEmoji(sec.group) : "Panel"); return (VIEWS[sec.view] || renderHome)(sec); }
    return openFile(sec);
  }

  function setTitle(title, crumb) {
    topTitle.textContent = title;
    topCrumb.textContent = crumb || "";
    document.title = `${title} · Panel TechRevive`;
  }

  const loading = (txt = "Cargando…") => h("div", { class: "loading" }, h("span", { class: "spinner" }), txt);

  /* ───────── inicio del panel ───────── */
  function renderHome() {
    setTitle("Inicio del panel", "TechRevive");
    saveBtn.hidden = true;
    const q = (href, emoji, title, text) => h("a", { href }, h("div", { class: "quick__emoji" }, emoji), h("strong", {}, title), h("span", {}, text));
    const last = h("p", { class: "intro" }, loading("Consultando el último cambio…"));
    contentEl.replaceChildren(
      h("section", { class: "hello" }, h("h2", {}, "¡Hola! ¿Qué quieres cambiar hoy?"),
        h("p", {}, "Elige una sección, haz tus cambios y pulsa «Guardar cambios». Tu sitio se actualiza solo en 1 o 2 minutos.")),
      h("div", { class: "quick" },
        q("#/configuracion", "📞", "Datos de contacto", "WhatsApp, correo, dirección, horario, redes y logo."),
        q("#/inicio", "🏠", "Página de inicio", "Portada, secciones, proyectos y testimonios."),
        q("#/servicios", "🛠️", "Servicios", "Edita, agrega o quita servicios y su página."),
        q("#/cursos", "📚", "Cursos", "La lista de cursos y sus temas."),
        q("#/blog/nuevo", "📝", "Escribir un artículo", "Crea una nueva entrada para el blog."),
        q("#/galeria", "🖼️", "Galería de fotos", "Sube y organiza tus fotos."),
        q("#/estadisticas", "📊", "Estadísticas de visitas", "Quién visita tu sitio, desde dónde y cuánto tiempo."),
        q("#/certificados", "🏅", "Certificados", "Aprueba solicitudes y emite certificados."),
        q("#/aula-cursos", "🎓", "Cursos del aula", "Lecciones, videos, cuestionarios y exámenes.")),
      h("h2", { class: "sr-only" }, "Último cambio"), last,
      h("div", { class: "tips" },
        h("div", { class: "tip" }, h("h3", {}, "👁️ Ocultar una sección"), h("p", {}, "Muchas secciones tienen el interruptor «Mostrar». Apágalo para ocultarla sin borrar su contenido.")),
        h("div", { class: "tip" }, h("h3", {}, "➕ Agregar o quitar"), h("p", {}, "En las listas usa «+ Agregar» para crear elementos, ✕ para quitarlos y ▲ ▼ para cambiar el orden.")),
        h("div", { class: "tip" }, h("h3", {}, "🖼️ Imágenes"), h("p", {}, "Pulsa «Subir imagen» y elige una foto de tu computadora o celular. Se ajusta de tamaño automáticamente."))));
    api("GET", "ultimo-cambio").then((c) => {
      if (!c.sha) { last.textContent = ""; return; }
      const d = c.fecha ? new Date(c.fecha) : null;
      last.textContent = `Último cambio guardado: ${d ? d.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" }) : ""} — «${(c.mensaje || "").split("\n")[0]}»`;
    }).catch((e) => { last.replaceChildren(h("div", { class: "alert alert--error" }, e.message)); });
  }

  /* ───────── edición de un archivo ───────── */
  async function openFile(sec) {
    setTitle(stripEmoji(sec.label), sec.group ? stripEmoji(sec.group) : "Sitio");
    saveBtn.hidden = false;
    contentEl.replaceChildren(loading());
    try {
      const r = await api("GET", `archivo?ruta=${encodeURIComponent(sec.path)}`);
      S.path = sec.path; S.sha = r.sha; S.isNew = !r.existe;
      S.doc = r.datos !== null && r.datos !== undefined ? r.datos : (sec.list ? [] : {});
      renderEditor(sec);
    } catch (e) {
      if (e.message !== "sesión") contentEl.replaceChildren(h("div", { class: "alert alert--error" }, e.message));
    }
  }

  function renderEditor(sec, extraTop) {
    const wrap = h("div", { class: "editor" });
    if (extraTop) wrap.append(extraTop);
    if (sec.list) {
      if (!Array.isArray(S.doc)) S.doc = [];
      const holder = { v: S.doc };
      const field = { name: "_root", label: stripEmoji(sec.label), type: "object", fields: sec.fields, list: sec.listConfig || { summary: guessSummary(sec.fields) } };
      wrap.append(h("p", { class: "intro" }, "Cada elemento de la lista aparece en tu sitio en el mismo orden. Haz clic en uno para editarlo."));
      wrap.append(renderList(field, () => holder.v, (v) => { holder.v = v; S.doc = v; }));
    } else {
      sec.fields.forEach((f, i) => wrap.append(renderTop(f, i)));
    }
    contentEl.replaceChildren(wrap);
  }

  // Los campos de primer nivel se muestran como tarjetas plegables.
  function renderTop(f, i) {
    const get = () => S.doc[f.name];
    const set = (v) => { S.doc[f.name] = v; };
    const isGroup = (f.type === "object" && !f.list) || f.list;
    if (!isGroup) return h("div", { class: "card card--flat is-open" }, h("div", { class: "card__body", style: "display:block;padding-top:18px" }, renderField(f, get, set)));
    const card = h("section", { class: "card" + (i === 0 ? " is-open" : "") });
    const head = h("div", { class: "card__head", role: "button", tabindex: "0", "aria-expanded": i === 0 ? "true" : "false" },
      h("h2", {}, f.label), h("span", { class: "chev", "aria-hidden": "true" }, "▾"));
    const toggle = () => { card.classList.toggle("is-open"); head.setAttribute("aria-expanded", card.classList.contains("is-open")); };
    head.addEventListener("click", toggle);
    head.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    const body = h("div", { class: "card__body" });
    if (f.description) body.append(h("p", { class: "card__desc" }, f.description));
    if (f.list) body.append(renderList(f, get, set));
    else f.fields.forEach((sf) => body.append(renderField(sf, () => (get() || {})[sf.name], childSetter(get, set, sf.name))));
    card.append(head, body);
    return card;
  }

  function childSetter(get, set, key) {
    return (v) => {
      let o = get();
      if (!isObj(o)) { o = {}; set(o); }
      o[key] = v;
    };
  }

  const changed = () => setDirty(true);

  function labelEl(f, id) {
    const frag = [h("label", { for: id }, f.label || f.name)];
    if (f.description) frag.push(h("p", { class: "field__help" }, f.description));
    return frag;
  }

  function resolveOptions(f) {
    if (typeof f.options === "string" && f.options.startsWith("@")) return S.schema.shared[f.options.slice(1)] || [];
    return f.options || [];
  }

  function renderField(f, get, set) {
    if (f.list) return h("div", { class: "field" }, h("div", { class: "field__label" }, f.label), f.description ? h("p", { class: "field__help" }, f.description) : null, renderList(f, get, set));
    const id = nextId();
    const val = get();
    switch (f.type) {
      case "object": {
        const box = h("div", { class: "sub" }, h("div", { class: "sub__title" }, f.label));
        if (f.description) box.append(h("p", { class: "field__help" }, f.description));
        (f.fields || []).forEach((sf) => box.append(renderField(sf, () => (get() || {})[sf.name], childSetter(get, set, sf.name))));
        return box;
      }
      case "text": {
        const ta = h("textarea", { class: "textarea", id, rows: 3 });
        ta.value = val ?? "";
        autosize(ta);
        ta.addEventListener("input", () => { set(ta.value); autosize(ta); changed(); });
        return h("div", { class: "field" }, ...labelEl(f, id), ta);
      }
      case "number": {
        const inp = h("input", { class: "input input--num", type: "number", id, min: f.min, max: f.max });
        inp.value = val ?? "";
        inp.addEventListener("input", () => { set(inp.value === "" ? null : Number(inp.value)); changed(); });
        return h("div", { class: "field" }, ...labelEl(f, id), inp);
      }
      case "date": {
        const inp = h("input", { class: "input input--date", type: "date", id });
        inp.value = val ? String(val).slice(0, 10) : "";
        inp.addEventListener("input", () => { set(inp.value); changed(); });
        return h("div", { class: "field" }, ...labelEl(f, id), inp);
      }
      case "boolean": {
        const cb = h("input", { type: "checkbox", id, role: "switch" });
        cb.checked = val === undefined || val === null ? defaultBool(f) : Boolean(val);
        cb.addEventListener("change", () => { set(cb.checked); changed(); });
        return h("div", { class: "field" }, h("label", { class: "switch", for: id }, cb, h("span", { class: "switch__track" }), h("span", {}, f.label)),
          f.description ? h("p", { class: "field__help", style: "margin-top:6px" }, f.description) : null);
      }
      case "select": {
        const opts = resolveOptions(f);
        const sel = h("select", { class: "select", id }, h("option", { value: "" }, "— Elegir —"));
        let found = false;
        opts.forEach((o) => { const op = h("option", { value: o.value }, o.label); if (String(o.value) === String(val ?? "")) { op.selected = true; found = true; } sel.append(op); });
        if (val && !found) sel.append(h("option", { value: val, selected: true }, `${val} (actual)`));
        sel.addEventListener("change", () => { set(sel.value); changed(); });
        return h("div", { class: "field" }, ...labelEl(f, id), sel);
      }
      case "image": return renderImage(f, get, set, id);
      case "file": return renderDoc(f, get, set, id);
      case "password": {
        const inp = h("input", { class: "input input--mono", type: "text", id, autocomplete: "off", spellcheck: "false" });
        inp.value = val ?? "";
        inp.addEventListener("input", () => { set(inp.value); changed(); });
        const gen = h("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: () => { inp.value = makePassword(); set(inp.value); changed(); inp.select(); } }, "🎲 Generar");
        const copy = h("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: async () => {
          try { await navigator.clipboard.writeText(inp.value); toast("Contraseña copiada.", "ok", 2000); } catch { inp.select(); }
        } }, "Copiar");
        return h("div", { class: "field" }, ...labelEl(f, id), h("div", { class: "pass-field" }, inp, gen, copy));
      }
      case "rich-text": return renderRich(f, get, set, id);
      default: {
        const inp = h("input", { class: "input", type: "text", id });
        inp.value = val ?? "";
        inp.addEventListener("input", () => { set(inp.value); changed(); });
        return h("div", { class: "field" }, ...labelEl(f, id), inp);
      }
    }
  }

  function defaultBool(f) {
    if (f.default !== undefined) return Boolean(f.default);
    return ["mostrar", "publicado"].includes(f.name);
  }

  function autosize(ta) {
    requestAnimationFrame(() => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight + 2, 520) + "px"; });
  }

  /* ───────── listas ───────── */
  function guessSummary(fields) {
    const pref = ["titulo", "nombre", "pregunta", "texto", "leyenda", "imagen"];
    const names = (fields || []).map((f) => f.name);
    const k = pref.find((p) => names.includes(p)) || names[0];
    return k ? `{${k}}` : "{index}";
  }

  function emptyFor(f) {
    if (f.list) return [];
    switch (f.type) {
      case "object": { const o = {}; (f.fields || []).forEach((sf) => { o[sf.name] = emptyFor(sf); }); return o; }
      case "boolean": return defaultBool(f);
      case "number": return f.default ?? null;
      case "date": return f.default ?? today();
      default: return f.default ?? "";
    }
  }

  function summaryText(tpl, item, idx) {
    if (!isObj(item)) return String(item ?? "");
    const txt = String(tpl || "").replace(/\{(?:fields\.)?([a-z_]+)\}/gi, (_, k) => k === "index" ? String(idx + 1) : (item[k] ?? "")).trim();
    return txt.replace(/^\/img\//, "");
  }

  function renderList(f, get, set) {
    const itemField = { ...f, list: undefined };
    const cfg = isObj(f.list) ? f.list : {};
    const isObjItems = f.type === "object";
    const summary = cfg.summary || (isObjItems ? guessSummary(f.fields) : "");
    const box = h("div", {});
    const listEl = h("div", { class: "list" });
    const addBtn = h("button", { class: "btn btn--ghost btn--sm list__add", type: "button" }, `+ Agregar ${isObjItems ? "elemento" : ""}`.trim());
    const openSet = new Set();

    const arr = () => { let a = get(); if (!Array.isArray(a)) { a = []; set(a); } return a; };

    function draw() {
      const a = Array.isArray(get()) ? get() : [];
      listEl.replaceChildren();
      if (!a.length) listEl.append(h("div", { class: "list__empty" }, "Todavía no hay elementos."));
      a.forEach((item, i) => listEl.append(isObjItems ? objItem(a, item, i) : primItem(a, i)));
      addBtn.disabled = cfg.max && a.length >= cfg.max;
      addBtn.title = addBtn.disabled ? `Máximo ${cfg.max}` : "";
    }

    function tools(a, i) {
      const move = (d) => { const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; const oi = openSet.has(a[j]); changed(); draw(); if (oi) {/* conservar */} };
      return h("div", { class: "list__tools" },
        h("button", { class: "icon-btn", type: "button", title: "Subir", "aria-label": "Subir", disabled: i === 0, onclick: (e) => { e.stopPropagation(); move(-1); } }, "▲"),
        h("button", { class: "icon-btn", type: "button", title: "Bajar", "aria-label": "Bajar", disabled: i === a.length - 1, onclick: (e) => { e.stopPropagation(); move(1); } }, "▼"),
        h("button", { class: "icon-btn icon-btn--danger", type: "button", title: "Quitar", "aria-label": "Quitar", onclick: (e) => {
          e.stopPropagation();
          const name = isObjItems ? summaryText(summary, a[i], i) : String(a[i] || "");
          if (!confirm(`¿Quitar ${name ? "«" + name.slice(0, 60) + "»" : "este elemento"}?`)) return;
          a.splice(i, 1); changed(); draw();
        } }, "✕"));
    }

    function objItem(a, item, i) {
      if (!isObj(item)) { item = {}; a[i] = item; }
      const el = h("div", { class: "list__item" + (openSet.has(item) ? " is-open" : "") });
      const sumEl = h("span", {});
      const updateSum = () => { const t = summaryText(summary, item, i); sumEl.textContent = t || "(sin título)"; sumEl.className = t ? "" : "muted"; };
      updateSum();
      const head = h("div", { class: "list__head" },
        h("div", { class: "list__summary", role: "button", tabindex: "0", onclick: () => toggle(), onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } } },
          h("span", { class: "list__num" }, i + 1), sumEl),
        tools(a, i));
      let body = null;
      function toggle() {
        el.classList.toggle("is-open");
        if (el.classList.contains("is-open")) { openSet.add(item); build(); } else openSet.delete(item);
      }
      function build() {
        if (body) return;
        body = h("div", { class: "list__body" });
        (f.fields || []).forEach((sf) => body.append(renderField(sf, () => a[i][sf.name], (v) => { a[i][sf.name] = v; updateSum(); })));
        body.addEventListener("input", updateSum);
        el.append(body);
      }
      el.append(head);
      if (openSet.has(item)) build();
      return el;
    }

    function primItem(a, i) {
      const isText = itemField.type === "text";
      const inp = isText ? h("textarea", { class: "textarea", rows: 2 }) : h("input", { class: "input", type: "text" });
      inp.value = a[i] ?? "";
      inp.setAttribute("aria-label", `${f.label} ${i + 1}`);
      if (isText) autosize(inp);
      inp.addEventListener("input", () => { a[i] = inp.value; changed(); if (isText) autosize(inp); });
      return h("div", { class: "list__row" }, inp, tools(a, i));
    }

    addBtn.addEventListener("click", () => {
      const a = arr();
      const nuevo = isObjItems ? emptyFor({ type: "object", fields: f.fields }) : "";
      a.push(nuevo);
      if (isObjItems) openSet.add(nuevo);
      changed(); draw();
      const last = listEl.lastElementChild;
      if (last) { last.scrollIntoView({ behavior: "smooth", block: "center" }); const fi = last.querySelector("input,textarea,select"); fi && fi.focus({ preventScroll: true }); }
    });

    draw();
    box.append(listEl, addBtn);
    return box;
  }

  /* ───────── imágenes ───────── */
  function imgSrc(v) {
    if (!v) return "";
    if (S.previews[v]) return S.previews[v];
    if (/^https?:/.test(v)) return v;
    return "/" + String(v).replace(/^\/+/, "");
  }

  function renderImage(f, get, set, id) {
    const contain = /logo|favicon|icono/i.test(f.name);
    const prev = h("div", { class: "img-field__preview" + (contain ? " img-field__preview--contain" : "") });
    const pathEl = h("div", { class: "img-field__path" });
    const fileInp = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif", hidden: true, id });
    const upBtn = h("button", { class: "btn btn--primary btn--sm", type: "button", onclick: () => fileInp.click() }, "⬆ Subir imagen");
    const pickBtn = h("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: () => pickImage((url) => { set(url); changed(); draw(); }) }, "Elegir una existente");
    const delBtn = h("button", { class: "btn btn--danger btn--sm", type: "button", onclick: () => { set(""); changed(); draw(); } }, "Quitar");
    function draw() {
      const v = get();
      prev.replaceChildren(v ? h("img", { src: imgSrc(v), alt: "", onerror: function () { this.replaceWith(document.createTextNode("Vista previa disponible después de publicar")); } }) : document.createTextNode("Sin imagen"));
      pathEl.textContent = v ? String(v).replace(/^\/img\//, "") : "";
      delBtn.hidden = !v;
    }
    fileInp.addEventListener("change", async () => {
      const file = fileInp.files && fileInp.files[0];
      fileInp.value = "";
      if (!file) return;
      upBtn.disabled = true; upBtn.replaceChildren(h("span", { class: "spinner" }), " Subiendo…");
      try {
        const { dataUrl, name } = await prepareImage(file, contain);
        const r = await api("POST", "imagen", { nombre: name, base64: dataUrl });
        S.previews[r.url] = dataUrl;
        set(r.url); changed(); draw();
        toast("Imagen subida. Recuerda pulsar «Guardar cambios».", "ok");
      } catch (e) {
        if (e.message !== "sesión") toast(e.message, "error", 7000);
      } finally {
        upBtn.disabled = false; upBtn.textContent = "⬆ Subir imagen";
      }
    });
    draw();
    return h("div", { class: "field" }, ...labelEl(f, id),
      h("div", { class: "img-field" }, prev, h("div", { class: "img-field__side" }, h("div", { class: "img-field__btns" }, upBtn, pickBtn, delBtn), pathEl, fileInp)));
  }

  function makePassword() {
    const words = ["Quetzal", "Volcan", "Jade", "Ceiba", "Maya", "Lago", "Cafe", "Cacao", "Selva", "Tikal", "Luna", "Sol", "Rio", "Nube", "Pino", "Mango"];
    const r = new Uint32Array(3); crypto.getRandomValues(r);
    return `${words[r[0] % words.length]}-${words[r[1] % words.length]}-${100 + (r[2] % 900)}`;
  }

  /* ───────── documentos del aula (PDF, Word…) ───────── */
  const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|zip|txt)$/i;
  function renderDoc(f, get, set, id) {
    const info = h("div", { class: "doc-field__info" });
    const fileInp = h("input", { type: "file", accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt", hidden: true, id });
    const upBtn = h("button", { class: "btn btn--primary btn--sm", type: "button", onclick: () => fileInp.click() }, "⬆ Subir archivo");
    const pickBtn = h("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: () => pickDoc((url) => { set(url); changed(); draw(); }) }, "Elegir uno subido");
    const delBtn = h("button", { class: "btn btn--danger btn--sm", type: "button", onclick: () => { set(""); changed(); draw(); } }, "Quitar");
    function draw() {
      const v = get();
      const name = v ? String(v).split("/").pop() : "";
      const ext = (name.match(/\.([a-z0-9]+)$/i) || [, ""])[1].toUpperCase();
      info.replaceChildren(v ? h("span", { class: "doc-field__file" }, h("b", {}, ext || "ARCHIVO"), h("span", {}, name)) : h("span", { class: "muted" }, "Sin archivo"));
      delBtn.hidden = !v;
    }
    fileInp.addEventListener("change", async () => {
      const file = fileInp.files && fileInp.files[0];
      fileInp.value = "";
      if (!file) return;
      if (!DOC_EXT.test(file.name)) { toast("Formato no permitido. Usa PDF, Word, Excel, PowerPoint, ZIP o TXT.", "error", 6000); return; }
      if (file.size > 15 * 1024 * 1024) { toast("El archivo pesa más de 15 MB. Súbelo a Google Drive y pega el enlace en «enlace externo».", "error", 8000); return; }
      upBtn.disabled = true; upBtn.replaceChildren(h("span", { class: "spinner" }), " Subiendo…");
      try {
        const dataUrl = await new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.onerror = () => rej(new Error("No se pudo leer el archivo.")); rd.readAsDataURL(file); });
        const r = await api("POST", "documento", { nombre: file.name, base64: dataUrl });
        set(r.url); changed(); draw();
        toast("Archivo subido. Recuerda pulsar «Guardar cambios».", "ok");
      } catch (e) {
        if (e.message !== "sesión") toast(e.message, "error", 7000);
      } finally {
        upBtn.disabled = false; upBtn.textContent = "⬆ Subir archivo";
      }
    });
    draw();
    return h("div", { class: "field" }, ...labelEl(f, id),
      h("div", { class: "doc-field" }, info, h("div", { class: "img-field__btns" }, upBtn, pickBtn, delBtn), fileInp));
  }

  async function pickDoc(onPick) {
    const body = h("div", { class: "modal__body" }, loading("Cargando archivos…"));
    const close = () => { modal.remove(); document.removeEventListener("keydown", esc); };
    const modal = h("div", { class: "modal", onclick: (e) => { if (e.target === modal) close(); } },
      h("div", { class: "modal__box", role: "dialog", "aria-modal": "true", "aria-label": "Elegir archivo" },
        h("div", { class: "modal__head" }, h("h3", {}, "Elegir un archivo del aula"), h("button", { class: "icon-btn", "aria-label": "Cerrar", onclick: () => close() }, "✕")),
        body));
    const esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", esc);
    document.body.append(modal);
    try {
      const r = await api("GET", "carpeta?ruta=src/aula-archivos");
      const docs = r.items.filter((x) => DOC_EXT.test(x.nombre));
      const list = h("div", { class: "doc-list" });
      docs.forEach((x) => {
        const kb = x.tamano ? (x.tamano > 1048576 ? (x.tamano / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(x.tamano / 1024)) + " KB") : "";
        list.append(h("button", { type: "button", onclick: () => { onPick(`/aula/archivos/${x.nombre}`); close(); } },
          h("b", {}, (x.nombre.split(".").pop() || "").toUpperCase()), h("span", {}, x.nombre), h("small", {}, kb)));
      });
      body.replaceChildren(docs.length ? list : h("p", {}, "Todavía no has subido archivos. Usa «⬆ Subir archivo»."));
    } catch (e) {
      body.replaceChildren(h("div", { class: "alert alert--error" }, e.message));
    }
  }

  function prepareImage(file, keepSmall) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return reject(new Error("Formato no permitido. Usa JPG, PNG, WEBP o GIF."));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
      reader.onload = () => {
        const dataUrl = reader.result;
        if (file.type === "image/gif") {
          if (file.size > 5 * 1024 * 1024) return reject(new Error("El GIF es demasiado grande (máximo 5 MB)."));
          return resolve({ dataUrl, name: file.name });
        }
        const img = new Image();
        img.onerror = () => reject(new Error("La imagen parece dañada."));
        img.onload = () => {
          const MAX = keepSmall ? 512 : 1800;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          if (scale === 1 && file.size < 900 * 1024) return resolve({ dataUrl, name: file.name });
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
          const ctx = c.getContext("2d");
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, c.width, c.height);
          const png = file.type === "image/png" && keepSmall;
          const out = png ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.85);
          const base = file.name.replace(/\.[^.]+$/, "");
          resolve({ dataUrl: out, name: `${base}.${png ? "png" : "jpg"}` });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  async function pickImage(onPick) {
    const body = h("div", { class: "modal__body" }, loading("Cargando imágenes…"));
    const close = () => modal.remove();
    const modal = h("div", { class: "modal", onclick: (e) => { if (e.target === modal) close(); } },
      h("div", { class: "modal__box", role: "dialog", "aria-modal": "true", "aria-label": "Elegir imagen" },
        h("div", { class: "modal__head" }, h("h3", {}, "Elegir una imagen"), h("button", { class: "icon-btn", "aria-label": "Cerrar", onclick: close }, "✕")),
        body));
    document.body.append(modal);
    const esc = (e) => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } };
    document.addEventListener("keydown", esc);
    try {
      const r = await api("GET", "carpeta?ruta=src/img");
      const imgs = r.items.filter((x) => /\.(jpe?g|png|webp|gif)$/i.test(x.nombre) && !/^(favicon|apple-touch)/.test(x.nombre));
      const grid = h("div", { class: "gallery" });
      imgs.forEach((x) => {
        const url = `/img/${x.nombre}`;
        grid.append(h("button", { type: "button", onclick: () => { onPick(url); close(); } },
          h("img", { src: imgSrc(url), alt: "", loading: "lazy", onerror: function () { this.style.opacity = ".3"; } }), h("span", {}, x.nombre)));
      });
      body.replaceChildren(imgs.length ? grid : h("p", {}, "No hay imágenes todavía."));
    } catch (e) {
      body.replaceChildren(h("div", { class: "alert alert--error" }, e.message));
    }
  }

  /* ───────── texto con formato ───────── */
  const ALLOWED = { P: ["class"], H2: [], H3: [], H4: [], STRONG: [], B: [], EM: [], I: [], U: [], UL: ["class"], OL: [], LI: [], A: ["href"], BR: [], BLOCKQUOTE: [],
    ASIDE: ["class"], DETAILS: ["class"], SUMMARY: [], TABLE: [], THEAD: [], TBODY: [], TR: [], TH: [], TD: [], KBD: [], CODE: [], SMALL: [] };
  // Clases permitidas (bloques didácticos del aula: objetivos, puntos clave, consejos, prácticas…)
  const ALLOWED_CLASS = { P: ["aula-credit"], UL: ["checklist"], ASIDE: ["nota", "objetivos", "clave", "tip", "alerta", "practica", "caso", "typing"], DETAILS: ["check"] };
  function sanitize(html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) return;
        if (n.nodeType !== 1) { n.remove(); return; }
        if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|SVG|MATH|NOSCRIPT|HEAD|META|LINK|TITLE)$/i.test(n.tagName)) { n.remove(); return; }
        walk(n);
        let tag = n.tagName;
        if (tag === "DIV") { const p = doc.createElement("p"); p.append(...n.childNodes); n.replaceWith(p); return; }
        if (tag === "H1") tag = "H2";
        if (!ALLOWED[tag]) { n.replaceWith(...n.childNodes); return; }
        if (tag !== n.tagName) { const r = doc.createElement(tag); r.append(...n.childNodes); n.replaceWith(r); return; }
        [...n.attributes].forEach((a) => { if (!ALLOWED[tag].includes(a.name)) n.removeAttribute(a.name); });
        if (n.hasAttribute("class")) {
          const ok = n.getAttribute("class").split(/\s+/).filter((c) => (ALLOWED_CLASS[tag] || []).includes(c));
          if (ok.length) n.setAttribute("class", ok.join(" ")); else n.removeAttribute("class");
        }
        if (tag === "A") {
          const href = n.getAttribute("href") || "";
          if (!/^(https?:|mailto:|tel:|\/|#|[a-z0-9-]+\.html)/i.test(href)) n.removeAttribute("href");
        }
      });
    };
    walk(doc.body.firstChild);
    return doc.body.firstChild.innerHTML.replace(/<p><br><\/p>/g, "").trim();
  }

  function renderRich(f, get, set, id) {
    const area = h("div", { class: "rte__area" + (/respuesta/.test(f.name) ? " rte__area--small" : ""), contenteditable: "true", id, role: "textbox", "aria-multiline": "true" });
    area.innerHTML = sanitize(get() || "");
    const update = () => { set(sanitize(area.innerHTML)); changed(); };
    area.addEventListener("input", update);
    area.addEventListener("paste", (e) => {
      e.preventDefault();
      const html = e.clipboardData.getData("text/html");
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertHTML", false, html ? sanitize(html) : text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])).replace(/\n/g, "<br>"));
    });
    const cmd = (c, v) => (e) => { e.preventDefault(); area.focus(); document.execCommand(c, false, v); update(); };
    const bar = h("div", { class: "rte__bar" },
      h("button", { type: "button", title: "Negrita", onmousedown: cmd("bold") }, h("b", {}, "B")),
      h("button", { type: "button", title: "Cursiva", onmousedown: cmd("italic") }, h("i", {}, "I")),
      h("button", { type: "button", title: "Subtítulo", onmousedown: cmd("formatBlock", "<h2>") }, "Subtítulo"),
      h("button", { type: "button", title: "Subtítulo pequeño", onmousedown: cmd("formatBlock", "<h3>") }, "Subtítulo 2"),
      h("button", { type: "button", title: "Párrafo normal", onmousedown: cmd("formatBlock", "<p>") }, "Párrafo"),
      h("button", { type: "button", title: "Lista con viñetas", onmousedown: cmd("insertUnorderedList") }, "• Lista"),
      h("button", { type: "button", title: "Lista numerada", onmousedown: cmd("insertOrderedList") }, "1. Lista"),
      h("button", { type: "button", title: "Enlace", onmousedown: (e) => { e.preventDefault(); const u = prompt("Dirección del enlace (https://…):", "https://"); if (u) { area.focus(); document.execCommand("createLink", false, u); update(); } } }, "🔗 Enlace"),
      h("button", { type: "button", title: "Quitar formato", onmousedown: cmd("removeFormat") }, "Limpiar"),
      ...(/contenido/.test(f.name) ? [h("select", { class: "rte__blocks", title: "Insertar un bloque didáctico", onchange: (e) => {
        const v = e.target.value; e.target.value = ""; if (!v) return;
        const B = {
          objetivos: '<aside class="nota objetivos"><h4>🎯 Lo que aprenderás</h4><ul><li>…</li></ul></aside>',
          clave: '<aside class="nota clave"><h4>📌 Puntos clave</h4><ul><li>…</li></ul></aside>',
          tip: '<aside class="nota tip"><h4>💡 Consejo de técnico</h4><p>…</p></aside>',
          alerta: '<aside class="nota alerta"><h4>⚠️ Cuidado</h4><p>…</p></aside>',
          practica: '<aside class="nota practica"><h4>🧪 Práctica guiada</h4><ol><li>…</li></ol></aside>',
          caso: '<aside class="nota caso"><h4>🧰 Caso real</h4><p>…</p></aside>',
          check: '<details class="check"><summary>Pregunta para repasar…</summary><p>Respuesta…</p></details>',
          checklist: '<ul class="checklist"><li>Paso 1…</li><li>Paso 2…</li></ul>',
          typing: '<aside class="typing"><p>Escribe aquí el texto que el alumno debe copiar.</p></aside>',
        };
        area.focus(); document.execCommand("insertHTML", false, B[v] + "<p><br></p>"); update();
      } }, h("option", { value: "" }, "➕ Insertar bloque…"), h("option", { value: "objetivos" }, "🎯 Lo que aprenderás"), h("option", { value: "clave" }, "📌 Puntos clave"),
        h("option", { value: "tip" }, "💡 Consejo"), h("option", { value: "alerta" }, "⚠️ Cuidado"), h("option", { value: "practica" }, "🧪 Práctica guiada"), h("option", { value: "caso" }, "🧰 Caso real"),
        h("option", { value: "check" }, "❓ Ponte a prueba (pregunta y respuesta)"), h("option", { value: "checklist" }, "☑️ Lista de verificación"), h("option", { value: "typing" }, "⌨️ Práctica de mecanografía"))] : []));
    return h("div", { class: "field" }, ...labelEl(f, id), h("div", { class: "rte" }, bar, area));
  }

  /* ───────── colecciones (blog y cursos del aula) ───────── */
  // Cada colección define en schema.json: itemLabel (singular), itemsLabel (plural), columns, sort y newDefaults.
  const colLabel = (sec) => sec.itemLabel || "artículo";
  const colLabels = (sec) => sec.itemsLabel || "artículos";
  function cellValue(col, d) {
    const v = d[col.name];
    if (col.type === "estado") return v === false ? h("span", { class: "badge badge--off" }, col.off || "Borrador") : h("span", { class: "badge badge--ok" }, col.on || "Publicado");
    if (col.type === "count") return String(typeof col.count === "function" ? col.count(d) : countLessons(d));
    return v == null ? "" : String(v);
  }
  const countLessons = (d) => (Array.isArray(d.modulos) ? d.modulos : []).reduce((n, m) => n + ((m && Array.isArray(m.lecciones)) ? m.lecciones.length : 0), 0);

  async function renderCollection(sec) {
    setTitle(stripEmoji(sec.label), sec.group ? stripEmoji(sec.group) : colLabels(sec).replace(/^./, (c) => c.toUpperCase()));
    saveBtn.hidden = true;
    contentEl.replaceChildren(loading(`Cargando ${colLabels(sec)}…`));
    try {
      const r = await api("GET", `entradas?carpeta=${encodeURIComponent(sec.path)}`);
      S.blogCache = r.items;
      const cols = sec.columns || [{ name: "titulo", label: "Título", strong: true }, { name: "categoria", label: "Categoría" }, { name: "fecha", label: "Fecha" }, { name: "publicado", label: "Estado", type: "estado" }];
      const sortKey = sec.sort || "-fecha";
      const desc = sortKey.startsWith("-"), key = sortKey.replace(/^-/, "");
      const items = r.items.filter((x) => x.datos).sort((a, b) => {
        const va = a.datos[key], vb = b.datos[key];
        const c = (typeof va === "number" || typeof vb === "number") ? (Number(va) || 999) - (Number(vb) || 999) : String(va || "").localeCompare(String(vb || ""));
        return desc ? -c : c;
      });
      const tbody = h("tbody", {});
      items.forEach((x) => {
        const file = x.ruta.split("/").pop().replace(/\.json$/, "");
        const tr = h("tr", { tabindex: "0", onclick: () => { location.hash = `#/${sec.id}/${encodeURIComponent(file)}`; }, onkeydown: (e) => { if (e.key === "Enter") tr.click(); } },
          ...cols.map((c, i) => h("td", {}, i === 0 ? h("strong", {}, x.datos[c.name] || file) : cellValue(c, x.datos))));
        tbody.append(tr);
      });
      const broken = r.items.filter((x) => !x.datos);
      contentEl.replaceChildren(...[
        sec.intro ? h("p", { class: "intro" }, sec.intro) : null,
        h("div", { class: "toolbar" }, h("p", { class: "intro", style: "margin:0" }, `${items.length} ${colLabels(sec)}. Haz clic en uno para editarlo.`),
          h("a", { class: "btn btn--primary", href: `#/${sec.id}/nuevo` }, `＋ Nuevo ${colLabel(sec)}`)),
        broken.length ? h("div", { class: "alert alert--error" }, `Hay ${broken.length} archivo(s) con error de formato: ${broken.map((b) => b.ruta).join(", ")}`) : null,
        items.length ? h("div", { class: "table-wrap" }, h("table", { class: "table" }, h("thead", {}, h("tr", {}, ...cols.map((c) => h("th", {}, c.label)))), tbody))
          : h("div", { class: "card card--flat is-open" }, h("div", { class: "card__body", style: "display:block;padding:24px" }, `Todavía no hay ${colLabels(sec)}. Pulsa «Nuevo ${colLabel(sec)}» para crear el primero.`))].filter(Boolean));
    } catch (e) {
      if (e.message !== "sesión") contentEl.replaceChildren(h("div", { class: "alert alert--error" }, e.message));
    }
  }

  async function openEntry(sec, file) {
    saveBtn.hidden = false;
    const back = h("a", { href: `#/${sec.id}`, class: "btn btn--ghost btn--sm" }, "← Volver a la lista");
    if (file === "nuevo") {
      setTitle(`Nuevo ${colLabel(sec)}`, stripEmoji(sec.label));
      S.path = null; S.sha = null; S.isNew = true;
      S.doc = emptyFor({ type: "object", fields: sec.fields });
      Object.assign(S.doc, sec.newDefaults || { publicado: true });
      if (!sec.newDefaults || "fecha" in (sec.newDefaults || {})) { if (sec.fields.some((f) => f.name === "fecha")) S.doc.fecha = today(); }
      renderEditor({ ...sec, fields: sec.fields.map((f) => ({ ...f })) }, h("div", { class: "toolbar" }, back));
      wrapEntryFields(sec);
      return;
    }
    setTitle(`Editar ${colLabel(sec)}`, stripEmoji(sec.label));
    contentEl.replaceChildren(loading());
    try {
      const path = `${sec.path}/${file}.json`;
      const r = await api("GET", `archivo?ruta=${encodeURIComponent(path)}`);
      if (!r.existe) { toast(`Ese ${colLabel(sec)} ya no existe.`, "error"); location.hash = `#/${sec.id}`; return; }
      S.path = path; S.sha = r.sha; S.isNew = false; S.doc = r.datos || {};
      setTitle(S.doc.titulo || `Editar ${colLabel(sec)}`, stripEmoji(sec.label));
      const del = h("button", { class: "btn btn--danger btn--sm", type: "button", onclick: () => deleteEntry(sec) }, `🗑 Eliminar ${colLabel(sec)}`);
      const extra = sec.id === "aula-cursos" ? h("span", { class: "muted-sm" }, `Identificador: ${file} · dirección /aula/${file}/`) : null;
      renderEditor(sec, h("div", { class: "toolbar" }, h("div", { class: "toolbar__left" }, back, extra), del));
      wrapEntryFields(sec);
    } catch (e) {
      if (e.message !== "sesión") contentEl.replaceChildren(h("div", { class: "alert alert--error" }, e.message));
    }
  }

  // En los artículos, los campos se muestran juntos en una sola tarjeta.
  // En los cursos, solo se juntan los datos generales; los módulos quedan en su propia tarjeta.
  function wrapEntryFields(sec) {
    const editor = contentEl.querySelector(".editor");
    const flatOnly = sec && sec.wrap === "flat";
    const cards = [...editor.querySelectorAll(flatOnly ? ":scope > .card.card--flat" : ":scope > .card")];
    if (!cards.length) return;
    const card = h("section", { class: "card is-open" }, flatOnly ? h("div", { class: "card__head card__head--static" }, h("h2", {}, sec.wrapTitle || "Datos generales")) : null,
      h("div", { class: "card__body", style: "display:block;padding-top:18px" }));
    const body = card.lastChild;
    cards[0].before(card);
    cards.forEach((c) => { const b = c.querySelector(".card__body"); while (b.firstChild) body.append(b.firstChild); c.remove(); });
    if (flatOnly) editor.querySelectorAll(":scope > .card:not(.card--flat)").forEach((c) => { if (c !== card) c.classList.add("is-open"); });
  }

  async function deleteEntry(sec) {
    if (!confirm(`¿Eliminar el ${colLabel(sec)} «${S.doc.titulo || ""}»? Esta acción no se puede deshacer desde el panel.`)) return;
    try {
      const r = await api("DELETE", `archivo?ruta=${encodeURIComponent(S.path)}&sha=${encodeURIComponent(S.sha)}`);
      setDirty(false);
      toast(`${colLabel(sec).replace(/^./, (c) => c.toUpperCase())} eliminado. El sitio se actualizará en 1 o 2 minutos.`, "ok");
      watchPublish(r.commit);
      location.hash = `#/${sec.id}`;
    } catch (e) { if (e.message !== "sesión") toast(e.message, "error", 8000); }
  }

  /* ───────── vistas especiales: estadísticas y certificados ───────── */
  const VIEWS = { estadisticas: renderStats, certificados: renderCerts, solicitudes: renderSolicitudes, reparaciones: renderReparaciones };
  const fmtN = (n) => Number(n || 0).toLocaleString("es-GT");
  function fmtDur(s) {
    s = Math.round(Number(s) || 0);
    if (s < 60) return `${s} s`;
    const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return hh ? `${hh} h ${mm} min` : `${mm} min${ss && mm < 10 ? ` ${ss} s` : ""}`;
  }
  const fmtDT = (ts) => ts ? new Date(ts).toLocaleString("es-GT", { timeZone: "America/Guatemala", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  const fmtD = (ts) => ts ? new Date(ts).toLocaleDateString("es-GT", { timeZone: "America/Guatemala", day: "numeric", month: "short", year: "numeric" }) : "";
  let regionNames = null;
  try { regionNames = new Intl.DisplayNames(["es"], { type: "region" }); } catch { /* navegador antiguo */ }
  const countryName = (cc) => { if (!cc) return "Desconocido"; if (cc === "XX" || cc === "T1") return "Desconocido"; try { return regionNames ? regionNames.of(cc) : cc; } catch { return cc; } };
  const flag = (cc) => (cc && /^[A-Z]{2}$/.test(cc) && cc !== "XX" && cc !== "T1") ? String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0))) : "🌐";
  const devIcon = (d) => ({ Celular: "📱", Tablet: "📟", Computadora: "💻" }[d] || "🖥️");

  function dbError(e) {
    if (e.data && e.data.sinBase) {
      return h("div", { class: "alert alert--info db-setup" }, h("strong", {}, "Falta conectar la base de datos (gratis, una sola vez). "),
        "Con ella se activan las estadísticas de visitas, los certificados y el progreso del aula guardado en la cuenta de cada alumno.",
        h("ol", {},
          h("li", {}, "En Cloudflare entra a ", h("b", {}, "Storage & databases → D1 SQL database → Create database"), ", ponle de nombre ", h("code", {}, "techrevive-datos"), " y pulsa ", h("b", {}, "Create"), "."),
          h("li", {}, "Copia el ", h("b", {}, "Database ID"), " (se ve así: 1a2b3c4d-1234-…)."),
          h("li", {}, "Dale permiso a la publicación: ", h("b", {}, "tu perfil (arriba a la derecha) → API Tokens"), " → el token «Workers Builds…» → ", h("b", {}, "Edit → + Add more → Account · D1 · Edit"), " → Continue → Update token."),
          h("li", {}, "Aquí en el panel: ", h("a", { href: "#configuracion" }, "⚙️ Configuración general"), " → «ID de la base de datos» → pega el ID → ", h("b", {}, "Guardar cambios"), ". En 1–2 minutos esta sección empieza a funcionar.")),
        h("small", {}, "Si después de guardar la publicación falla (Cloudflare → techrevive → Deployments en rojo), borra el ID en Configuración general y guarda: el sitio vuelve a publicarse como antes."));
    }
    return h("div", { class: "alert alert--error" }, e.message);
  }

  /* ── Estadísticas: nombres amigables de páginas y fuentes ── */
  const ccTag = (cc) => h("span", { class: "cc" }, cc && /^[A-Z]{2}$/.test(cc) && cc !== "XX" && cc !== "T1" ? cc : "··");
  const cleanTitle = (t) => String(t || "").replace(/\s*[|·]\s*(Aula virtual )?TechRevive.*$/i, "").replace(/^TechRevive\s*\|\s*/i, "").trim();
  const PAGES_MAP = [
    [/^\/$/, "🏠", "Inicio"], [/^\/servicios$/, "🛠️", "Servicios"], [/^\/cotizador/, "💲", "Cotizador"],
    [/^\/quienes-somos/, "👋", "¿Quiénes somos?"], [/^\/capacitacion/, "🧑‍🏫", "Capacitación"], [/^\/cursos/, "📚", "Cursos"],
    [/^\/inscripcion/, "📝", "Inscripción"], [/^\/aula-virtual/, "💻", "Aula virtual (información)"], [/^\/aula\/ingresar/, "🔑", "Aula · Ingreso"],
    [/^\/aula\/?$/, "🎓", "Aula · Mis cursos"], [/^\/aula\//, "🎓", null], [/^\/certificado/, "🏅", "Verificación de certificado"],
    [/^\/blog$/, "📰", "Blog"], [/^\/blog-/, "📝", null], [/^\/preguntas-frecuentes/, "❓", "Preguntas frecuentes"],
    [/^\/contacto/, "✉️", "Contacto"], [/^\/ubicacion/, "📍", "Ubicación"], [/^\/novedades/, "📣", "Novedades"],
    [/^\/galeria/, "🖼️", "Galería"], [/^\/redes-sociales/, "📱", "Redes sociales"], [/^\/mapa-del-sitio/, "🗺️", "Mapa del sitio"],
    [/^\/(reparacion|soporte|desarrollo-web|aplicaciones)/, "🔧", null], [/^\/proceso/, "🔄", "Nuestro proceso"],
    [/^\/diagnostico/, "🩺", "Doctor TechRevive"], [/^\/seguimiento/, "🔎", "Seguimiento de reparación"], [/^\/privacidad/, "🔒", "Aviso de privacidad"],
  ];
  function pageInfo(ruta, titulo) {
    const r = String(ruta || "/").replace(/\/index\.html$/, "/").replace(/\.html$/, "") || "/";
    let t = cleanTitle(titulo);
    for (const [re, icon, name] of PAGES_MAP) {
      if (!re.test(r)) continue;
      if (name) return { icon, name, ruta: r };
      if (r.startsWith("/aula/")) { const parts = t.split(/\s+·\s+/); return { icon, name: "Aula · " + (parts.length > 1 ? parts[0] : t || r), ruta: r }; }
      if (r.startsWith("/blog-")) return { icon, name: "Blog · " + (t.split(/[:|]/)[0] || r), ruta: r };
      return { icon, name: t.split(/[:|]/)[0] || r, ruta: r };
    }
    return { icon: "📄", name: (t.split(/[:|]/)[0] || r).slice(0, 48), ruta: r };
  }
  const pageChip = (ruta, titulo, extra) => { const p = pageInfo(ruta, titulo); return h("span", { class: "chip chip--page", title: p.ruta }, `${p.icon} ${p.name}${extra ? " · " + extra : ""}`); };
  function refInfo(host) {
    const x = String(host || "").toLowerCase();
    if (!x) return ["🔗", "Directo (escribió la dirección o un enlace guardado)"];
    const known = [[/google\./, "🔎", "Google"], [/bing\./, "🔎", "Bing"], [/(facebook|fb)\.|^m\.facebook|l\.facebook/, "📘", "Facebook"], [/instagram\./, "📸", "Instagram"], [/(whatsapp|wa\.me)/, "💬", "WhatsApp"], [/tiktok\./, "🎵", "TikTok"], [/(youtube|youtu\.be)/, "▶️", "YouTube"], [/linkedin\./, "💼", "LinkedIn"], [/(twitter|t\.co|x\.com)/, "✖️", "X (Twitter)"], [/(chatgpt|openai)/, "🤖", "ChatGPT"]];
    for (const [re, icon, name] of known) if (re.test(x)) return [icon, name];
    return ["🌐", x];
  }
  const escapeHtml = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtShort = (s) => { s = Math.round(Number(s) || 0); const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60; return hh ? `${hh}h ${mm}m` : mm ? `${mm}m ${ss}s` : `${ss}s`; };
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString("es-GT", { timeZone: "America/Guatemala", hour: "2-digit", minute: "2-digit" });

  function rankList(title, rows, opts = {}) {
    const max = Math.max(1, ...rows.map((r) => r.n));
    const total = opts.total || rows.reduce((a, r) => a + r.n, 0) || 1;
    return h("section", { class: "stat-card" }, h("h3", { class: "stat-card__kicker" }, title),
      rows.length ? h("ul", { class: "rank2" }, ...rows.slice(0, opts.limit || 8).map((r) => h("li", { title: `${r.n} · ${Math.round(r.n * 100 / total)}%` },
        h("span", { class: `chip chip--${opts.kind || "page"}`, title: typeof r.label === "string" ? r.label : r.label.textContent }, r.label),
        h("span", { class: "rank2__bar" }, h("span", { style: `width:${Math.max(2, r.n * 100 / max)}%` })),
        h("strong", { class: "rank2__n" }, fmtN(r.n)))))
        : h("p", { class: "muted-sm" }, "Sin datos en este periodo."));
  }

  // Barras con el número encima. Hoy → por hora; ≤ 31 días → por día; 90 días → por semana; 1 año → por mes.
  function barsCard(d) {
    const tz = 6 * 3600 * 1000;
    let cols = [], title;
    if (d.dias === 1) {
      const m = new Map(d.horas.map((x) => [x.h, x.n]));
      cols = Array.from({ length: 24 }, (_, i) => ({ v: m.get(i) || 0, l: `${i}h`, t: `${i}:00 – ${i}:59` }));
      title = "Páginas vistas · hoy por hora";
    } else {
      const map = new Map(d.porDia.map((x) => [x.fecha, x]));
      const days = [];
      for (let i = 0; i < d.dias; i++) {
        const key = new Date(d.desde + i * 86400000 - tz).toISOString().slice(0, 10);
        const x = map.get(key) || { visitas: 0, visitantes: 0 };
        days.push({ key, v: x.visitas, p: x.visitantes });
      }
      const dm = (k) => `${k.slice(8, 10)}/${k.slice(5, 7)}`;
      // Empieza en el primer día con visitas (sin semanas vacías al inicio), mínimo 7 días.
      const first = days.findIndex((x) => x.v > 0);
      if (first > 0) days.splice(0, Math.min(first, Math.max(0, days.length - 7)));
      if (days.length <= 31) {
        cols = days.map((x) => ({ v: x.v, l: dm(x.key), t: `${dm(x.key)} · ${fmtN(x.v)} vistas · ${fmtN(x.p)} visitantes` }));
        title = days.length < d.dias ? `Páginas vistas · últimos ${days.length} días (desde la primera visita)` : `Páginas vistas · últimos ${d.dias} días`;
      } else {
        const size = days.length <= 120 ? 7 : 30;
        for (let i = 0; i < days.length; i += size) {
          const g = days.slice(i, i + size), v = g.reduce((a, x) => a + x.v, 0);
          cols.push({ v, l: dm(g[0].key), t: `${dm(g[0].key)} – ${dm(g[g.length - 1].key)} · ${fmtN(v)} vistas` });
        }
        title = `Páginas vistas · últimos ${days.length} días (por ${size === 7 ? "semana" : "mes"})`;
      }
    }
    const max = Math.max(1, ...cols.map((c) => c.v));
    const dense = cols.length > 16;
    return h("section", { class: "stat-card stat-card--wide" }, h("h3", { class: "stat-card__kicker" }, title),
      h("div", { class: `vbars${dense ? " vbars--dense" : ""}`, style: `--n:${cols.length}` }, ...cols.map((c, i) => h("div", { class: `vbars__col${c.v ? "" : " is-zero"}`, title: c.t },
        h("div", { class: "vbars__track" },
          h("small", { class: "vbars__v" }, c.v ? fmtN(c.v) : ""),
          h("span", { class: "vbars__bar", style: `height:${c.v ? Math.max(3, c.v * 100 / max) : 0}%` })),
        h("small", { class: `vbars__l${dense && i % 2 ? " is-alt" : ""}` }, c.l)))));
  }

  function hourChart(horas) {
    const m = new Map(horas.map((x) => [x.h, x.n]));
    const vals = Array.from({ length: 24 }, (_, i) => m.get(i) || 0);
    const max = Math.max(1, ...vals);
    return h("section", { class: "stat-card" }, h("h3", { class: "stat-card__kicker" }, "🕑 Horario de visitas (hora de Guatemala)"),
      h("div", { class: "hours" }, ...vals.map((v, i) => h("div", { class: "hours__col", title: `${i}:00 – ${i}:59 · ${v} vistas` },
        h("span", { style: `height:${v ? Math.max(4, v * 100 / max) : 0}%` }), h("small", {}, i % 3 === 0 ? String(i) : "")))));
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (S.leafletP) return S.leafletP;
    S.leafletP = new Promise((res, rej) => {
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.append(css);
      const js = document.createElement("script"); js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      js.onload = () => res(window.L); js.onerror = () => { S.leafletP = null; rej(new Error("No se pudo cargar el mapa (revisa tu conexión a internet).")); };
      document.head.append(js);
    });
    return S.leafletP;
  }

  function mapCard(points) {
    const box = h("div", { class: "map" }, h("p", { class: "muted-sm", style: "padding:16px" }, points.length ? "Cargando mapa…" : "Sin ubicaciones en este periodo."));
    if (points.length) {
      loadLeaflet().then((L) => {
        box.replaceChildren();
        const map = L.map(box, { scrollWheelZoom: false, worldCopyJump: true }).setView([15.5, -90.3], 3);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© Colaboradores de OpenStreetMap" }).addTo(map);
        const max = Math.max(...points.map((p) => p.n));
        const layer = L.featureGroup().addTo(map);
        points.forEach((p) => {
          const place = [p.ciudad, p.region].filter(Boolean).join(", ") || countryName(p.pais);
          const html = `<strong>${escapeHtml(place)}</strong><br>${escapeHtml(countryName(p.pais))}<br>${fmtN(p.n)} visita${p.n === 1 ? "" : "s"} · ${fmtN(p.p || 1)} persona${(p.p || 1) === 1 ? "" : "s"} distinta${(p.p || 1) === 1 ? "" : "s"}`;
          L.circleMarker([p.lat, p.lon], { radius: 6 + 16 * Math.sqrt(p.n / max), color: "#1D4ED8", weight: 2, fillColor: "#3B82F6", fillOpacity: 0.5 })
            .bindTooltip(`${place} · ${fmtN(p.n)}`).bindPopup(html).addTo(layer);
        });
        if (points.length > 1) map.fitBounds(layer.getBounds().pad(0.3), { maxZoom: 7 }); else map.setView([points[0].lat, points[0].lon], 7);
        setTimeout(() => map.invalidateSize(), 200);
      }).catch((e) => { box.replaceChildren(h("p", { class: "muted-sm", style: "padding:16px" }, e.message)); });
    }
    return h("section", { class: "stat-card stat-card--wide" }, h("h3", { class: "stat-card__kicker" }, "🗺️ Mapa de visitas · de dónde entran"), box,
      h("p", { class: "muted-sm stat-note" }, "Cada círculo es un lugar desde donde entraron (más grande = más visitas). Toca un círculo para ver cuántas visitas y cuántas personas distintas."));
  }

  function sectionsCard(rows) {
    const max = Math.max(1, ...rows.map((r) => r.tiempo));
    const LIM = 15;
    const more = rows.length > LIM ? h("button", { type: "button", class: "btn btn--ghost btn--sm secs__more", onclick: (e) => { e.currentTarget.closest("section").classList.add("is-all"); e.currentTarget.remove(); } }, `Ver las ${rows.length} secciones`) : null;
    return h("section", { class: "stat-card stat-card--wide secs-card" }, h("h3", { class: "stat-card__kicker" }, "⏱️ Tiempo por sección (lo que cada persona vio y cuánto se quedó)"),
      rows.length ? h("ul", { class: "secs" }, ...rows.map((r, i) => h("li", { class: i >= LIM ? "is-extra" : "" },
        pageChip(r.ruta, r.titulo, r.seccion),
        h("span", { class: "rank2__bar" }, h("span", { style: `width:${Math.max(1.5, r.tiempo * 100 / max)}%` })),
        h("span", { class: "secs__n" }, h("strong", {}, fmtShort(r.tiempo)), h("small", {}, `${fmtN(r.veces)}× · promedio ${fmtShort(r.veces ? r.tiempo / r.veces : 0)}`)))))
        : null, more,
      rows.length ? null : h("p", { class: "muted-sm" }, "Todavía no hay datos de secciones en este periodo. Se miden desde esta versión del sitio: cuando alguien recorra una página, aquí verás cuánto tiempo pasó en la portada, los servicios, el contacto, etc."));
  }

  function detailCard(rows, dias) {
    const tbody = h("tbody", {});
    const search = h("input", { type: "search", class: "input input--sm", placeholder: "Buscar ciudad, IP, página, visitante…" });
    const paintRows = (q) => {
      q = (q || "").toLowerCase().trim();
      const list = q ? rows.filter((r) => [r.ruta, pageInfo(r.ruta, r.titulo).name, r.ciudad, r.region, countryName(r.pais), r.ip, r.navegador, r.so, r.dispositivo, r.ref, r.usuario, (r.vid || "").slice(0, 8), (r.secciones || []).map((x) => x.s).join(" ")].join(" ").toLowerCase().includes(q)) : rows;
      tbody.replaceChildren(...list.map((r) => {
        const p = pageInfo(r.ruta, r.titulo);
        const secs = (r.secciones || []).slice(0, 3);
        const vshort = (r.vid || "").slice(0, 8);
        return h("tr", {},
          h("td", { class: "nowrap" }, h("strong", {}, fmtDT(r.ts)), r.inicio && r.inicio < r.ts - 30000 ? h("small", { class: "muted-sm block" }, `sesión desde ${fmtTime(r.inicio)}`) : null),
          h("td", {}, h("strong", { title: p.ruta }, `${p.icon} ${p.name}`),
            h("small", { class: "muted-sm block", title: (r.secciones || []).map((x) => `${x.s} ${fmtShort(x.t)}`).join(" · ") }, secs.length ? secs.map((x) => `${x.s} ${fmtShort(x.t)}`).join(" · ") + ((r.secciones || []).length > 3 ? ` · +${r.secciones.length - 3}` : "") : "abrió la página")),
          h("td", { class: "nowrap" }, r.duracion ? h("strong", {}, fmtShort(r.duracion)) : h("span", { class: "muted-sm" }, "—")),
          h("td", {}, `${devIcon(r.dispositivo)} ${r.dispositivo || ""}`, h("small", { class: "muted-sm block" }, [r.navegador, r.so, r.pantalla && r.pantalla !== "0x0" ? r.pantalla : ""].filter(Boolean).join(" · "))),
          h("td", {}, h("span", { class: "nowrap" }, ccTag(r.pais), " ", r.ciudad || countryName(r.pais)), h("small", { class: "muted-sm block" }, [r.region, countryName(r.pais)].filter(Boolean).join(", "))),
          h("td", { class: "mono ip" }, r.ip || ""),
          h("td", {}, vshort ? h("button", { type: "button", class: "vid", title: "Ver todas las visitas de esta persona", onclick: () => { search.value = vshort; paintRows(vshort); } }, vshort) : ""),
          h("td", {}, r.usuario ? h("span", { class: "badge badge--ok" }, `🎓 ${r.usuario}`) : h("span", { class: "muted-sm" }, "—")),
          h("td", {}, (() => { const [ic, nm] = refInfo(r.ref); return r.ref ? h("span", { title: r.ref }, `${ic} ${nm}`) : h("span", { class: "muted-sm" }, "Directo"); })()));
      }));
    };
    search.oninput = (e) => paintRows(e.target.value);
    paintRows("");
    return h("section", { class: "stat-card stat-card--wide stat-detail" },
      h("div", { class: "stat-detail__head" }, h("h3", {}, `🧾 Detalle de cada visita (últimas ${fmtN(rows.length)})`),
        h("div", { class: "stat-detail__tools" }, search, h("a", { class: "btn btn--sm btn--white", href: `/api/estadisticas/csv?dias=${dias}` }, "⬇ CSV para Excel"))),
      h("div", { class: "table-wrap table-wrap--scroll" }, h("table", { class: "table table--compact table--static table--visits" },
        h("thead", {}, h("tr", {}, ...["Cuándo (hora Guatemala)", "Página / sección", "Tiempo", "Dispositivo", "Lugar", "IP", "Visitante", "Alumno", "Vino de"].map((t) => h("th", {}, t)))), tbody)),
      h("p", { class: "muted-sm stat-note" }, "La ubicación es aproximada (la da la conexión a internet). «Visitante» es un código anónimo por navegador: tócalo para ver todo lo que hizo esa persona. El CSV trae todas las visitas del periodo."));
  }

  async function renderStats(sec) {
    const dias = Number(sessionStorage.getItem("tr-stats-dias")) || 30;
    const periods = [[1, "Hoy"], [7, "7 días"], [30, "30 días"], [90, "90 días"], [365, "1 año"]];
    const periodName = (periods.find((p) => p[0] === dias) || [0, `${dias} días`])[1].toLowerCase();
    const noTrack = localStorage.getItem("tr-noseguir") === "1";
    const toolbar = h("div", { class: "toolbar" },
      h("div", { class: "seg", role: "group", "aria-label": "Periodo" }, ...periods.map(([n, l]) => h("button", { type: "button", class: n === dias ? "is-on" : "", onclick: () => { sessionStorage.setItem("tr-stats-dias", n); renderStats(sec); } }, l))),
      h("div", { class: "toolbar__left" },
        h("label", { class: "check-inline", title: "Tus propias visitas desde este navegador no se contarán" },
          h("input", { type: "checkbox", checked: noTrack, onchange: (e) => { if (e.target.checked) localStorage.setItem("tr-noseguir", "1"); else localStorage.removeItem("tr-noseguir"); toast(e.target.checked ? "Listo: tus visitas desde este navegador ya no se cuentan." : "Tus visitas desde este navegador se volverán a contar.", "ok"); } }),
          " No contar mis visitas"),
        h("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: () => renderStats(sec) }, "↻ Actualizar")));
    contentEl.replaceChildren(toolbar, loading("Calculando estadísticas…"));
    let d;
    try { d = await api("GET", `estadisticas?dias=${dias}`); } catch (e) { if (e.message !== "sesión") contentEl.replaceChildren(toolbar, dbError(e)); return; }
    const R = d.resumen, T = d.totales || {};
    const big = (icon, value, label, hint) => h("div", { class: "kpi2" }, h("span", { class: "kpi2__icon" }, icon), h("div", {}, h("strong", {}, value), h("span", {}, label), hint ? h("small", {}, hint) : null));
    const band = h("div", { class: "kpi-band" },
      big("👁️", fmtN(T.hoy), "Vistas hoy"),
      big("📅", fmtN(T.semana), "Últimos 7 días"),
      big("🌐", fmtN(T.total), "Total desde el inicio", T.primera ? `desde el ${fmtD(T.primera)}` : ""),
      big("🧑‍🤝‍🧑", fmtN(R.visitantes), "Visitantes distintos", periodName),
      big("📄", fmtN(R.paginas), "Páginas con visitas", periodName));
    const mini = (label, value) => h("div", { class: "kpi-mini" }, h("span", {}, label), h("strong", {}, value));
    const minis = h("div", { class: "kpi-minis" },
      mini(`Vistas (${periodName})`, fmtN(R.visitas)),
      mini("Tiempo total en el sitio", fmtShort(R.tiempo)),
      mini("Promedio por visitante", fmtShort(R.visitantes ? R.tiempo / R.visitantes : 0)),
      mini("Páginas por visita", R.sesiones ? (R.visitas / R.sesiones).toFixed(1) : "0"),
      mini("Alumnos del aula activos", fmtN(R.alumnos)));
    if (!R.visitas) {
      contentEl.replaceChildren(toolbar, band, h("div", { class: "alert alert--info" }, `Todavía no hay visitas registradas en este periodo (${periodName}). Las visitas empiezan a contarse desde que se publica esta versión del sitio. Abre tu sitio en otra pestaña o desde tu celular y pulsa «Actualizar».`));
      return;
    }
    const total = R.visitas;
    const grid = h("div", { class: "stat-grid" },
      rankList("📄 Por página", d.paginas.map((x) => { const p = pageInfo(x.ruta, x.titulo); return { label: `${p.icon} ${p.name}`, n: x.visitas }; }), { total, kind: "page" }),
      rankList("📱 Dispositivo", d.dispositivos.map((x) => ({ label: `${devIcon(x.k)} ${x.k || "Otro"}`, n: x.n })), { kind: "dev" }),
      rankList("🌎 País", d.paises.map((x) => ({ label: h("span", {}, ccTag(x.pais), " ", countryName(x.pais)), n: x.visitas })), { total, kind: "geo" }),
      rankList("📍 Ciudad / región", d.ciudades.map((x) => ({ label: [x.ciudad, x.region].filter(Boolean).join(", ") || `${countryName(x.pais)} (sin ciudad)`, n: x.visitas })), { total, kind: "geo" }),
      rankList("🌐 Navegador", d.navegadores.map((x) => ({ label: x.k || "Otro", n: x.n })), { kind: "nav" }),
      rankList("🖥️ Sistema", d.sistemas.map((x) => ({ label: x.k || "Otro", n: x.n })), { kind: "nav" }),
      rankList("🔗 Vino de", d.referentes.map((x) => { const [ic, nm] = refInfo(x.k); return { label: `${ic} ${x.k ? nm : "Directo"}`, n: x.n }; }), { total, kind: "ref" }),
      d.dias > 1 ? hourChart(d.horas) : null);
    contentEl.replaceChildren(toolbar, band, minis, convCard(d.conversiones, periodName), barsCard(d), grid, mapCard(d.mapa), sectionsCard(d.secciones || []), detailCard(d.detalle, dias));
  }

  /* ── Certificados ── */
  const certEstado = { solicitado: ["⏳ Pendiente", "badge--warn"], aprobado: ["✓ Emitido", "badge--ok"], rechazado: ["✕ Rechazado", "badge--off"], revocado: ["⊘ Anulado", "badge--bad"] };
  const certLink = (id) => `${location.origin}/certificado?c=${id}`;

  async function renderCerts(sec) {
    const tab = sessionStorage.getItem("tr-cert-tab") || "pendientes";
    contentEl.replaceChildren(loading("Cargando certificados…"));
    let d;
    try { d = await api("GET", "certificados"); } catch (e) { if (e.message !== "sesión") contentEl.replaceChildren(dbError(e)); return; }
    const pend = d.items.filter((x) => x.estado === "solicitado");
    const tabs = [["pendientes", `⏳ Solicitudes${pend.length ? ` (${pend.length})` : ""}`], ["emitidos", "🏅 Certificados"], ["manual", "✍️ Emitir manualmente"], ["progreso", "📊 Progreso de alumnos"]];
    const go = (t) => { sessionStorage.setItem("tr-cert-tab", t); renderCerts(sec); };
    const bar = h("div", { class: "seg seg--tabs", role: "tablist" }, ...tabs.map(([k, l]) => h("button", { type: "button", role: "tab", "aria-selected": k === tab ? "true" : "false", class: k === tab ? "is-on" : "", onclick: () => go(k) }, l)));
    const body = h("div", {});
    contentEl.replaceChildren(bar, body);
    const act = async (payload, okMsg) => {
      try { await api("PUT", "certificados", payload); toast(okMsg, "ok"); renderCerts(sec); } catch (e) { if (e.message !== "sesión") toast(e.message, "error", 8000); }
    };

    if (tab === "pendientes") {
      if (!pend.length) { body.append(h("div", { class: "alert alert--info" }, "No hay solicitudes pendientes. Cuando un alumno termine un curso y pida su certificado, aparecerá aquí para que lo revises y lo apruebes.")); return; }
      body.append(h("p", { class: "intro" }, "Revisa el nombre (tildes, apellidos) antes de aprobar. Al aprobar, el alumno ve su certificado en el aula y puede imprimirlo."));
      pend.forEach((c) => {
        const name = h("input", { class: "input", value: c.nombre, maxlength: "90", "aria-label": "Nombre en el certificado" });
        const horas = h("input", { class: "input input--sm", value: c.horas || "", maxlength: "20", style: "max-width:120px", "aria-label": "Horas" });
        const p = c.progreso || {};
        body.append(h("article", { class: "cert-req" },
          h("div", { class: "cert-req__main" },
            h("label", { class: "field__label" }, "Nombre en el certificado"), name,
            h("p", { class: "cert-req__meta" }, h("strong", {}, c.curso_titulo), ` · alumno: ${c.usuario || "—"} · solicitado ${fmtDT(c.solicitado)}`),
            h("p", { class: "cert-req__meta" }, `Progreso: ${p.hechas ?? "?"} de ${p.total ?? "?"} lecciones`, p.nota != null ? ` · nota de evaluación: ${p.nota}%` : "", p.faltan > 0 ? h("span", { class: "badge badge--warn", style: "margin-left:6px" }, `le faltan ${p.faltan}`) : h("span", { class: "badge badge--ok", style: "margin-left:6px" }, "curso completo"))),
          h("div", { class: "cert-req__side" },
            h("label", { class: "field__label" }, "Horas"), horas,
            h("div", { class: "cert-req__btns" },
              h("button", { class: "btn btn--primary btn--sm", type: "button", onclick: () => act({ id: c.id, accion: "aprobar", nombre: name.value, horas: horas.value }, "✅ Certificado aprobado.") }, "✓ Aprobar"),
              h("button", { class: "btn btn--danger btn--sm", type: "button", onclick: () => { const m = prompt("Motivo del rechazo (el alumno lo verá):", ""); if (m !== null) act({ id: c.id, accion: "rechazar", motivo: m }, "Solicitud rechazada."); } }, "✕ Rechazar")))));
      });
      return;
    }

    if (tab === "emitidos") {
      const list = d.items.filter((x) => x.estado !== "solicitado");
      if (!list.length) { body.append(h("div", { class: "alert alert--info" }, "Todavía no hay certificados emitidos.")); return; }
      const tbody = h("tbody", {});
      const paint = (q) => {
        q = (q || "").toLowerCase();
        tbody.replaceChildren(...list.filter((c) => !q || [c.id, c.nombre, c.curso_titulo, c.usuario].join(" ").toLowerCase().includes(q)).map((c) => {
          const [lbl, cls] = certEstado[c.estado] || [c.estado, "badge--off"];
          const actions = h("div", { class: "row-actions" });
          if (c.estado === "aprobado") {
            actions.append(
              h("a", { class: "btn btn--ghost btn--sm", href: `/certificado?c=${c.id}`, target: "_blank", rel: "noopener" }, "👁 Ver"),
              h("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: () => { navigator.clipboard.writeText(certLink(c.id)).then(() => toast("Enlace copiado.", "ok")); } }, "🔗 Copiar enlace"),
              h("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: () => { const n = prompt("Corregir el nombre del participante:", c.nombre); if (n && n.trim() && n !== c.nombre) act({ id: c.id, accion: "editar", nombre: n }, "Nombre corregido."); } }, "✎ Nombre"),
              h("button", { class: "btn btn--danger btn--sm", type: "button", onclick: () => { const m = prompt("¿Anular este certificado? Dejará de ser válido al verificarlo. Motivo:", ""); if (m !== null) act({ id: c.id, accion: "revocar", motivo: m }, "Certificado anulado."); } }, "⊘ Anular"));
          } else {
            if (c.estado === "revocado") actions.append(h("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: () => act({ id: c.id, accion: "restaurar" }, "Certificado restaurado.") }, "↺ Restaurar"));
            actions.append(h("button", { class: "btn btn--danger btn--sm", type: "button", onclick: async () => {
              if (!confirm("¿Eliminar definitivamente este registro?")) return;
              try { await api("DELETE", `certificados?id=${encodeURIComponent(c.id)}`); toast("Eliminado.", "ok"); renderCerts(sec); } catch (e) { if (e.message !== "sesión") toast(e.message, "error"); }
            } }, "🗑"));
          }
          return h("tr", {}, h("td", { class: "mono nowrap" }, c.id), h("td", {}, h("strong", {}, c.nombre), c.usuario ? h("small", { class: "muted-sm block" }, c.usuario) : null),
            h("td", {}, c.curso_titulo, c.horas ? h("small", { class: "muted-sm block" }, /[a-z]/i.test(c.horas) ? c.horas : `${c.horas} horas`) : null),
            h("td", { class: "nowrap" }, c.fecha ? fmtD(new Date(c.fecha + "T12:00:00").getTime()) : fmtD(c.emitido)),
            h("td", {}, h("span", { class: `badge ${cls}` }, lbl), c.motivo ? h("small", { class: "muted-sm block" }, c.motivo) : null, c.origen === "manual" ? h("small", { class: "muted-sm block" }, "emitido manualmente") : null),
            h("td", {}, actions));
        }));
      };
      paint("");
      body.append(h("div", { class: "toolbar" }, h("p", { class: "intro", style: "margin:0" }, `${list.length} registro(s).`), h("input", { type: "search", class: "input input--sm", placeholder: "Buscar nombre, curso o código…", oninput: (e) => paint(e.target.value) })),
        h("div", { class: "table-wrap" }, h("table", { class: "table table--compact table--static" }, h("thead", {}, h("tr", {}, ...["Código", "Participante", "Curso", "Fecha", "Estado", ""].map((t) => h("th", {}, t)))), tbody)));
      return;
    }

    if (tab === "manual") {
      const f = { nombre: h("input", { class: "input", maxlength: "90", required: true }), curso: h("select", { class: "input" }, h("option", { value: "" }, "— Elige un curso —"), ...d.cursos.map((c) => h("option", { value: c.id }, c.titulo)), h("option", { value: "__otro" }, "Otro curso o taller (escribir)…")),
        otro: h("input", { class: "input", maxlength: "90", placeholder: "Ej. Taller presencial de Excel" }), horas: h("input", { class: "input", maxlength: "20", placeholder: "Ej. 20" }), fecha: h("input", { class: "input", type: "date", value: today() }) };
      const otroBox = h("div", { class: "field", hidden: true }, h("label", {}, "Nombre del curso o taller"), f.otro);
      f.curso.addEventListener("change", () => { otroBox.hidden = f.curso.value !== "__otro"; const c = d.cursos.find((x) => x.id === f.curso.value); if (c && c.horas) f.horas.value = String(c.horas).replace(/\s*horas?$/i, ""); });
      const out = h("div", {});
      const btn = h("button", { class: "btn btn--primary", type: "submit" }, "🏅 Emitir certificado");
      const form = h("form", { class: "card is-open", onsubmit: async (e) => {
        e.preventDefault();
        const isOtro = f.curso.value === "__otro";
        const cur = d.cursos.find((x) => x.id === f.curso.value);
        const payload = { nombre: f.nombre.value, curso: isOtro ? "" : f.curso.value, curso_titulo: isOtro ? f.otro.value : (cur ? cur.titulo : ""), horas: f.horas.value, fecha: f.fecha.value };
        if (!payload.nombre.trim() || !payload.curso_titulo.trim()) { toast("Escribe el nombre y elige el curso.", "error"); return; }
        btn.disabled = true;
        try {
          const r = await api("POST", "certificados", payload);
          out.replaceChildren(h("div", { class: "alert alert--info" }, "✅ Certificado emitido con el código ", h("strong", {}, r.id), ". ", h("a", { href: `/certificado?c=${r.id}`, target: "_blank", rel: "noopener" }, "Verlo e imprimirlo ↗"), " · Enlace para compartir: ", h("code", {}, certLink(r.id))));
          f.nombre.value = "";
        } catch (err) { if (err.message !== "sesión") toast(err.message, "error"); } finally { btn.disabled = false; }
      } }, h("div", { class: "card__body", style: "display:block;padding-top:18px" },
        h("p", { class: "intro" }, "Para cursos presenciales o personas que no usaron el aula. El certificado queda emitido de inmediato y se puede verificar con su código."),
        h("div", { class: "field" }, h("label", {}, "Nombre completo del participante"), f.nombre),
        h("div", { class: "field" }, h("label", {}, "Curso"), f.curso), otroBox,
        h("div", { class: "grid-2" }, h("div", { class: "field" }, h("label", {}, "Horas (opcional)"), f.horas), h("div", { class: "field" }, h("label", {}, "Fecha del certificado"), f.fecha)),
        btn));
      body.append(form, out);
      return;
    }

    if (tab === "progreso") {
      body.append(loading("Cargando progreso…"));
      try {
        const r = await api("GET", "alumnos/progreso");
        if (!r.items.length) { body.replaceChildren(h("div", { class: "alert alert--info" }, "No hay alumnos. Agrégalos en «Alumnos y accesos».")); return; }
        body.replaceChildren(h("p", { class: "intro" }, "Avance de cada alumno según lo guardado en el servidor (se actualiza cuando el alumno entra al aula)."),
          h("div", { class: "table-wrap" }, h("table", { class: "table table--compact table--static" },
            h("thead", {}, h("tr", {}, h("th", {}, "Alumno"), h("th", {}, "Última actividad"), h("th", {}, "Cursos"))),
            h("tbody", {}, ...r.items.map((a) => h("tr", {},
              h("td", {}, h("strong", {}, a.nombre), h("small", { class: "muted-sm block" }, a.usuario + (a.activo === false ? " · desactivado" : "") + (a.vence ? ` · vence ${a.vence}` : ""))),
              h("td", { class: "nowrap" }, a.ultima ? fmtDT(a.ultima) : h("span", { class: "muted-sm" }, "Sin actividad")),
              h("td", {}, ...a.cursos.map((c) => {
                const pct = c.total ? Math.round(c.hechas * 100 / c.total) : 0;
                return h("div", { class: "prog" }, h("span", { class: "prog__t" }, c.titulo), h("span", { class: "prog__bar" }, h("i", { style: `width:${pct}%` })), h("span", { class: "prog__n" }, `${c.hechas}/${c.total}`),
                  h("span", { class: "prog__x" }, c.certificado ? h("span", { class: `badge ${(certEstado[c.certificado] || [])[1] || ""}` }, (certEstado[c.certificado] || [c.certificado])[0]) : null,
                  c.elegido ? h("span", { class: "badge badge--info", title: "El alumno se inscribió solo desde el aula" }, "🎓 Lo eligió el alumno") : null,
                  c.elegido ? h("button", { type: "button", class: "btn btn--sm btn--danger", title: "Quitar este curso al alumno (su avance no se borra)", onclick: async (ev) => {
                    if (!confirm(`¿Quitar «${c.titulo}» a ${a.nombre}? Su avance se conserva por si lo vuelve a tomar.`)) return;
                    ev.target.disabled = true;
                    try { await api("DELETE", `alumnos/inscripcion?usuario=${encodeURIComponent(a.usuario)}&curso=${encodeURIComponent(c.id)}`); toast("Curso quitado.", "ok"); renderCerts(sec); }
                    catch (e) { ev.target.disabled = false; if (e.message !== "sesión") toast(e.message, "error"); }
                  } }, "Quitar") : null));
              }))))))));
      } catch (e) { if (e.message !== "sesión") body.replaceChildren(dbError(e)); }
    }
  }

  /* ───────── Solicitudes de clientes (formularios, cotizaciones, diagnósticos) ───────── */
  const SOL_TIPO = { contacto: ["✉️", "Contacto"], inscripcion: ["🎓", "Inscripción"], cotizacion: ["💲", "Cotización"], diagnostico: ["🩺", "Diagnóstico"], otro: ["📌", "Otro"] };
  const SOL_EST = { nuevo: ["🆕 Nueva", "badge--warn"], contactado: ["📞 Contactada", "badge--info"], cotizado: ["💬 Cotizada", "badge--info"], ganado: ["✅ Ganada", "badge--ok"], perdido: ["✕ Perdida", "badge--off"], archivado: ["🗄 Archivada", "badge--off"] };
  const waNum = (tel) => { let n = String(tel || "").replace(/\D/g, ""); if (n.length === 8) n = "502" + n; return n.length >= 10 ? n : ""; };
  const waLink = (tel, msg) => { const n = waNum(tel); return n ? `https://wa.me/${n}?text=${encodeURIComponent(msg)}` : ""; };
  const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "";

  function solDatos(x) {
    const d = x.datos || {};
    const rows = [];
    const add = (k, v) => { if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length)) rows.push([k, v]); };
    if (x.tipo === "diagnostico") {
      add("Equipo", d.equipo); add("Problema", d.sintoma); add("Con IA", d.ia ? "Sí" : "");
      add("Urgencia", { alta: "🔴 Alta", media: "🟠 Media", baja: "🟢 Baja" }[d.urgencia] || d.urgencia);
      add("Causas probables", (d.causas || []).map((c) => `${c.t} (${c.nivel})`).join(" · "));
      add("Servicios sugeridos", (d.servicios || []).join(" · "));
      (d.respuestas || []).forEach((r) => add(r.q, r.a));
    } else if (x.tipo === "cotizacion") {
      add("No. de cotización", d.numero); add("Equipo", d.equipo);
      add("Total estimado", d.total != null ? `Q${Number(d.total).toLocaleString("es-GT", { minimumFractionDigits: 2 })}${d.desde ? " (incluye precios «desde»)" : ""}` : "");
      add("Urgente", d.urgente ? "Sí" : "");
      add("Detalle", (d.detalle || []).join("\n"));
    } else {
      Object.entries(d).forEach(([k, v]) => add(k.charAt(0).toUpperCase() + k.slice(1), Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : v));
    }
    if (!rows.length) return null;
    return h("dl", { class: "req__datos" }, ...rows.map(([k, v]) => h("div", {}, h("dt", {}, k), h("dd", {}, String(v)))));
  }

  async function renderSolicitudes(sec) {
    const filtro = sessionStorage.getItem("tr-sol-f") || "abiertas";
    contentEl.replaceChildren(loading("Cargando solicitudes…"));
    let d;
    try { d = await api("GET", "solicitudes"); } catch (e) { if (e.message !== "sesión") contentEl.replaceChildren(dbError(e)); return; }
    const items = d.items || [];
    const cnt = (f) => items.filter(f).length;
    const abiertas = (x) => ["nuevo", "contactado", "cotizado"].includes(x.estado);
    const filtros = [["abiertas", `Abiertas (${cnt(abiertas)})`, abiertas], ["nuevo", `Nuevas (${cnt((x) => x.estado === "nuevo")})`, (x) => x.estado === "nuevo"],
      ["ganado", "Ganadas", (x) => x.estado === "ganado"], ["cerradas", "Perdidas / archivadas", (x) => ["perdido", "archivado"].includes(x.estado)], ["todas", `Todas (${items.length})`, () => true]];
    const fx = (filtros.find((f) => f[0] === filtro) || filtros[0])[2];
    let tipo = "", q = "";
    const list = h("div", { class: "req-list" });
    const paint = () => {
      const qq = q.toLowerCase();
      const rows = items.filter(fx).filter((x) => !tipo || x.tipo === tipo)
        .filter((x) => !qq || [x.nombre, x.telefono, x.correo, x.servicio, x.mensaje].join(" ").toLowerCase().includes(qq));
      if (!rows.length) {
        list.replaceChildren(h("div", { class: "alert alert--info" }, items.length ? "No hay solicitudes con este filtro." :
          "Todavía no hay solicitudes. Aquí aparecerá cada formulario de contacto o inscripción, cada cotización enviada a tu WhatsApp y cada diagnóstico del Doctor TechRevive donde la persona dejó sus datos."));
        return;
      }
      list.replaceChildren(...rows.map(solCard));
    };
    const solCard = (x) => {
      const [ic, tl] = SOL_TIPO[x.tipo] || SOL_TIPO.otro;
      const [el, ec] = SOL_EST[x.estado] || [x.estado, "badge--off"];
      const msg = `Hola ${firstName(x.nombre)}, te saluda TechRevive. Recibimos tu solicitud${x.servicio ? ` sobre «${x.servicio}»` : ""} y con gusto te ayudamos.`;
      const wa = waLink(x.telefono, msg);
      const estado = h("select", { class: "input input--sm", "aria-label": "Estado", onchange: () => upd({ estado: estado.value }) },
        ...Object.entries(SOL_EST).map(([k, [l]]) => h("option", { value: k, selected: k === x.estado }, l)));
      const nota = h("textarea", { class: "input input--sm req__nota", rows: "2", maxlength: "1000", placeholder: "Nota interna (solo tú la ves)…" }, x.nota || "");
      const notaBtn = h("button", { class: "btn btn--ghost btn--sm", type: "button", hidden: true, onclick: () => upd({ nota: nota.value }, "Nota guardada.") }, "💾 Guardar nota");
      nota.addEventListener("input", () => { notaBtn.hidden = nota.value === (x.nota || ""); });
      const upd = async (patch, okMsg) => {
        const body = { id: x.id, estado: x.estado, nota: x.nota || "", ...patch };
        try { await api("PUT", "solicitudes", body); Object.assign(x, patch); toast(okMsg || "Estado actualizado.", "ok"); notaBtn.hidden = true; refreshBadges(); paint(); }
        catch (e) { if (e.message !== "sesión") toast(e.message, "error"); }
      };
      const toOrder = h("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: () => {
        sessionStorage.setItem("tr-orden-pre", JSON.stringify({ cliente: x.nombre, telefono: x.telefono, equipo: (x.datos && x.datos.equipo) || "", problema: [x.datos && x.datos.sintoma, x.servicio, x.mensaje].filter(Boolean).join(" · ").slice(0, 900) }));
        location.hash = "#/reparaciones";
      } }, "🛠️ Crear orden");
      return h("article", { class: `req req--${x.estado}` },
        h("header", { class: "req__head" },
          h("span", { class: "req__tipo", title: tl }, ic),
          h("div", { class: "req__who" }, h("strong", {}, x.nombre || "(sin nombre)"),
            h("small", {}, [tl, fmtDT(x.ts), [x.ciudad, x.pais].filter(Boolean).join(", "), x.pagina ? pageInfo(x.pagina).name : ""].filter(Boolean).join(" · "))),
          h("span", { class: `badge ${ec}` }, el)),
        x.servicio ? h("p", { class: "req__svc" }, h("b", {}, "Servicio: "), x.servicio) : null,
        x.mensaje ? h("p", { class: "req__msg" }, x.mensaje) : null,
        solDatos(x),
        h("div", { class: "req__contact" },
          x.telefono ? h("span", {}, "📱 ", h("a", { href: `tel:${x.telefono.replace(/[^\d+]/g, "")}` }, x.telefono)) : null,
          x.correo ? h("span", {}, "✉️ ", h("a", { href: `mailto:${x.correo}` }, x.correo)) : null),
        h("footer", { class: "req__foot" },
          h("div", { class: "row-actions" },
            wa ? h("a", { class: "btn btn--primary btn--sm", href: wa, target: "_blank", rel: "noopener", onclick: () => { if (x.estado === "nuevo") upd({ estado: "contactado" }, "Marcada como contactada."); } }, "💬 WhatsApp") : null,
            ["diagnostico", "contacto", "cotizacion"].includes(x.tipo) ? toOrder : null,
            h("button", { class: "btn btn--danger btn--sm", type: "button", title: "Eliminar", onclick: async () => {
              if (!confirm(`¿Eliminar la solicitud de ${x.nombre || "este cliente"}?`)) return;
              try { await api("DELETE", `solicitudes?id=${x.id}`); items.splice(items.indexOf(x), 1); toast("Eliminada.", "ok"); refreshBadges(); paint(); } catch (e) { if (e.message !== "sesión") toast(e.message, "error"); }
            } }, "🗑")),
          h("div", { class: "req__state" }, estado)),
        h("div", { class: "req__notebox" }, nota, notaBtn));
    };
    const bar = h("div", { class: "seg seg--tabs", role: "tablist" }, ...filtros.map(([k, l]) => h("button", { type: "button", role: "tab", "aria-selected": k === filtro ? "true" : "false", class: k === filtro ? "is-on" : "", onclick: () => { sessionStorage.setItem("tr-sol-f", k); renderSolicitudes(sec); } }, l)));
    const tools = h("div", { class: "toolbar" },
      h("div", { class: "toolbar__left" },
        h("select", { class: "input input--sm", "aria-label": "Tipo", onchange: (e) => { tipo = e.target.value; paint(); } }, h("option", { value: "" }, "Todos los tipos"), ...Object.entries(SOL_TIPO).map(([k, [i, l]]) => h("option", { value: k }, `${i} ${l}`))),
        h("input", { type: "search", class: "input input--sm", placeholder: "Buscar nombre, teléfono, servicio…", oninput: (e) => { q = e.target.value; paint(); } })),
      h("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: () => renderSolicitudes(sec) }, "↻ Actualizar"));
    contentEl.replaceChildren(h("p", { class: "intro" }, "Cada persona que deja sus datos en el sitio queda aquí, aunque no haya terminado de enviar el WhatsApp. Escríbele, cambia el estado y lleva el control de quién se convirtió en cliente."), bar, tools, list);
    paint();
  }

  /* ───────── Reparaciones con seguimiento en línea ───────── */
  const ORD_CLS = { recibido: "badge--info", diagnostico: "badge--info", aprobacion: "badge--warn", repuesto: "badge--warn", reparacion: "badge--info", pruebas: "badge--info", listo: "badge--ok", entregado: "badge--off", cancelado: "badge--bad" };
  const trackLink = (o) => `${location.origin}/seguimiento.html?c=${o.codigo}${o.clave ? `&t=${o.clave}` : ""}`;

  async function renderReparaciones(sec) {
    const filtro = sessionStorage.getItem("tr-ord-f") || "activas";
    contentEl.replaceChildren(loading("Cargando reparaciones…"));
    let d;
    try { d = await api("GET", "reparaciones"); } catch (e) { if (e.message !== "sesión") contentEl.replaceChildren(dbError(e)); return; }
    const items = d.items || [], EST = d.estados || [];
    const estT = (id) => (EST.find((x) => x.id === id) || { t: id }).t;
    const activas = (o) => !["entregado", "cancelado"].includes(o.estado);
    const filtros = [["activas", `En taller (${items.filter(activas).length})`, activas], ["listo", `Listas para entregar (${items.filter((o) => o.estado === "listo").length})`, (o) => o.estado === "listo"],
      ["cerradas", "Entregadas / canceladas", (o) => !activas(o)], ["todas", `Todas (${items.length})`, () => true]];
    const fx = (filtros.find((f) => f[0] === filtro) || filtros[0])[2];
    const formBox = h("div", {});
    const list = h("div", { class: "table-wrap" });
    let q = "";
    const waMsg = (o, nota) => [`Hola ${firstName(o.cliente)}, te saluda TechRevive.`, `Tu orden *${o.codigo}*${o.equipo ? ` (${o.equipo})` : ""} está: *${estT(o.estado)}*.`,
      nota || o.nota_publica || "", `Puedes ver el avance cuando quieras aquí: ${trackLink(o)}`].filter(Boolean).join("\n");

    const openForm = (o) => {
      const isNew = !o;
      const pre = isNew ? JSON.parse(sessionStorage.getItem("tr-orden-pre") || "null") || {} : o;
      sessionStorage.removeItem("tr-orden-pre");
      const inp = (k, attrs = {}) => h("input", { class: "input", value: pre[k] || "", ...attrs });
      const f = { cliente: inp("cliente", { maxlength: "90", required: true }), telefono: inp("telefono", { type: "tel", maxlength: "20", placeholder: "Ej. 5555 5555" }),
        equipo: inp("equipo", { maxlength: "160", placeholder: "Ej. Laptop HP 15, gris, con cargador" }), presupuesto: inp("presupuesto", { maxlength: "60", placeholder: "Ej. Q350 (aprobado)" }),
        entrega: inp("entrega", { type: "date" }), problema: h("textarea", { class: "input", rows: "2", maxlength: "1000" }, pre.problema || ""),
        estado: h("select", { class: "input" }, ...EST.map((x) => h("option", { value: x.id, selected: x.id === (pre.estado || "recibido") }, x.t))),
        nota: h("textarea", { class: "input", rows: "2", maxlength: "500", placeholder: isNew ? "Ej. Recibimos tu equipo con cargador. Te avisamos al tener el diagnóstico." : "Ej. Ya llegó el repuesto, hoy lo instalamos." }),
        internas: h("textarea", { class: "input", rows: "2", maxlength: "2000", placeholder: "Contraseña de Windows, accesorios recibidos, golpes visibles…" }, pre.notas_internas || "") };
      const btn = h("button", { class: "btn btn--primary", type: "submit" }, isNew ? "＋ Crear orden" : "💾 Guardar cambios");
      const fld = (label, el, help) => h("div", { class: "field" }, h("label", {}, label), el, help ? h("small", { class: "muted-sm" }, help) : null);
      const form = h("form", { class: "card is-open ord-form", onsubmit: async (e) => {
        e.preventDefault();
        if (!f.cliente.value.trim()) { toast("Escribe el nombre del cliente.", "error"); f.cliente.focus(); return; }
        const body = { cliente: f.cliente.value, telefono: f.telefono.value, equipo: f.equipo.value, problema: f.problema.value, presupuesto: f.presupuesto.value, entrega: f.entrega.value, estado: f.estado.value, notas_internas: f.internas.value };
        if (isNew) body.nota_publica = f.nota.value; else { body.codigo = o.codigo; body.nota = f.nota.value; }
        btn.disabled = true;
        try {
          const r = await api(isNew ? "POST" : "PUT", "reparaciones", body);
          toast(isNew ? `✅ Orden ${r.codigo} creada. Envíale el enlace de seguimiento al cliente.` : "✅ Orden actualizada.", "ok", 7000);
          if (isNew) sessionStorage.setItem("tr-ord-nueva", r.codigo);
          refreshBadges(); renderReparaciones(sec);
        } catch (err) { if (err.message !== "sesión") toast(err.message, "error"); btn.disabled = false; }
      } }, h("div", { class: "card__body", style: "display:block;padding-top:18px" },
        h("h3", { class: "ord-form__title" }, isNew ? "Nueva orden de reparación" : `Editar orden ${o.codigo}`),
        h("div", { class: "grid-2" }, fld("Cliente *", f.cliente), fld("Teléfono / WhatsApp", f.telefono, "Sus últimos 4 dígitos son la clave para consultar en línea.")),
        h("div", { class: "grid-2" }, fld("Equipo", f.equipo), fld("Estado", f.estado)),
        fld("Problema reportado", f.problema),
        h("div", { class: "grid-2" }, fld("Presupuesto (opcional)", f.presupuesto), fld("Entrega estimada (opcional)", f.entrega)),
        fld(isNew ? "Mensaje para el cliente (lo verá en el seguimiento)" : "Nuevo mensaje para el cliente (se agrega al historial)", f.nota),
        fld("Notas internas (el cliente NO las ve)", f.internas),
        h("div", { class: "row-actions" }, btn, h("button", { class: "btn btn--ghost", type: "button", onclick: () => formBox.replaceChildren() }, "Cancelar"))));
      formBox.replaceChildren(form);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      f.cliente.focus({ preventScroll: true });
    };

    const quick = (o, row) => {
      const next = row.nextElementSibling;
      if (next && next.classList.contains("ord-quick")) { next.remove(); return; }
      const est = h("select", { class: "input input--sm" }, ...EST.map((x) => h("option", { value: x.id, selected: x.id === o.estado }, x.t)));
      const nota = h("input", { class: "input input--sm", maxlength: "500", placeholder: "Mensaje para el cliente (opcional)", style: "flex:1;min-width:200px" });
      const avisar = h("input", { type: "checkbox", checked: true });
      const go = h("button", { class: "btn btn--primary btn--sm", type: "button", onclick: async () => {
        go.disabled = true;
        try {
          await api("PUT", "reparaciones", { codigo: o.codigo, estado: est.value, nota: nota.value });
          const upd = { ...o, estado: est.value, nota_publica: nota.value || o.nota_publica };
          toast("✅ Estado actualizado.", "ok");
          if (avisar.checked) { const l = waLink(o.telefono, waMsg(upd, nota.value)); if (l) window.open(l, "_blank", "noopener"); }
          refreshBadges(); renderReparaciones(sec);
        } catch (e) { if (e.message !== "sesión") toast(e.message, "error"); go.disabled = false; }
      } }, "Guardar");
      row.after(h("tr", { class: "ord-quick" }, h("td", { colspan: "6" }, h("div", { class: "ord-quick__box" }, est, nota,
        o.telefono ? h("label", { class: "check-inline" }, avisar, " Avisar por WhatsApp") : null, go))));
      nota.focus();
    };

    const paint = () => {
      const qq = q.toLowerCase();
      const rows = items.filter(fx).filter((o) => !qq || [o.codigo, o.cliente, o.telefono, o.equipo, o.problema].join(" ").toLowerCase().includes(qq));
      if (!rows.length) {
        list.replaceChildren(h("div", { class: "alert alert--info" }, items.length ? "No hay órdenes con este filtro." :
          "Aún no hay órdenes. Cuando recibas un equipo, crea su orden con «＋ Nueva orden»: se genera un código (ej. OT-7K2QD) y un enlace para que el cliente vea el avance desde su celular sin tener que llamarte."));
        return;
      }
      const nueva = sessionStorage.getItem("tr-ord-nueva");
      sessionStorage.removeItem("tr-ord-nueva");
      const tbody = h("tbody", {});
      rows.forEach((o) => {
        const wa = waLink(o.telefono, waMsg(o));
        const tr = h("tr", { class: o.codigo === nueva ? "is-new" : "" },
          h("td", { class: "mono nowrap" }, h("strong", {}, o.codigo), h("small", { class: "muted-sm block" }, `desde ${fmtD(o.creado)}`)),
          h("td", {}, h("strong", {}, o.cliente), o.telefono ? h("small", { class: "muted-sm block" }, o.telefono) : null),
          h("td", {}, o.equipo || "—", o.problema ? h("small", { class: "muted-sm block ord-prob" }, o.problema) : null),
          h("td", {}, h("span", { class: `badge ${ORD_CLS[o.estado] || "badge--off"}` }, estT(o.estado)), o.entrega && activas(o) ? h("small", { class: "muted-sm block" }, `entrega ${o.entrega}`) : null),
          h("td", { class: "nowrap" }, fmtDT(o.actualizado)),
          h("td", {}, h("div", { class: "row-actions" },
            h("button", { class: "btn btn--primary btn--sm", type: "button", onclick: (e) => quick(o, e.target.closest("tr")) }, "↻ Estado"),
            wa ? h("a", { class: "btn btn--ghost btn--sm", href: wa, target: "_blank", rel: "noopener", title: "Enviar enlace de seguimiento" }, "💬") : null,
            h("button", { class: "btn btn--ghost btn--sm", type: "button", title: "Copiar enlace de seguimiento", onclick: () => navigator.clipboard.writeText(trackLink(o)).then(() => toast("Enlace de seguimiento copiado.", "ok")) }, "🔗"),
            h("button", { class: "btn btn--ghost btn--sm", type: "button", title: "Editar", onclick: () => openForm(o) }, "✎"),
            h("button", { class: "btn btn--danger btn--sm", type: "button", title: "Eliminar", onclick: async () => {
              if (!confirm(`¿Eliminar la orden ${o.codigo}? El cliente ya no podrá consultarla.`)) return;
              try { await api("DELETE", `reparaciones?codigo=${encodeURIComponent(o.codigo)}`); toast("Orden eliminada.", "ok"); refreshBadges(); renderReparaciones(sec); } catch (e) { if (e.message !== "sesión") toast(e.message, "error"); }
            } }, "🗑"))));
        tbody.append(tr);
        if ((o.historial || []).length > 1) {
          tr.children[3].append(h("details", { class: "ord-hist" }, h("summary", {}, `Historial (${o.historial.length})`),
            h("ol", {}, ...o.historial.slice().reverse().map((x) => h("li", {}, h("b", {}, estT(x.estado)), ` · ${fmtDT(x.ts)}`, x.nota ? h("span", { class: "block" }, x.nota) : null)))));
        }
      });
      list.replaceChildren(h("table", { class: "table table--compact table--static ord-table" },
        h("thead", {}, h("tr", {}, ...["Orden", "Cliente", "Equipo", "Estado", "Actualizado", ""].map((t) => h("th", {}, t)))), tbody));
    };

    const bar = h("div", { class: "seg seg--tabs", role: "tablist" }, ...filtros.map(([k, l]) => h("button", { type: "button", role: "tab", "aria-selected": k === filtro ? "true" : "false", class: k === filtro ? "is-on" : "", onclick: () => { sessionStorage.setItem("tr-ord-f", k); renderReparaciones(sec); } }, l)));
    const tools = h("div", { class: "toolbar" },
      h("div", { class: "toolbar__left" },
        h("button", { class: "btn btn--primary btn--sm", type: "button", onclick: () => openForm(null) }, "＋ Nueva orden"),
        h("input", { type: "search", class: "input input--sm", placeholder: "Buscar código, cliente, equipo…", oninput: (e) => { q = e.target.value; paint(); } })),
      h("a", { class: "btn btn--ghost btn--sm", href: "/seguimiento.html", target: "_blank", rel: "noopener" }, "↗ Ver página de seguimiento"));
    contentEl.replaceChildren(h("p", { class: "intro" }, "Registra cada equipo que recibes. El cliente consulta el avance en tu sitio con su código y los últimos 4 dígitos de su teléfono; tú solo cambias el estado y, si quieres, le avisas por WhatsApp con un clic."), tools, formBox, bar, list);
    paint();
    if (sessionStorage.getItem("tr-orden-pre")) openForm(null);
  }

  /* ───────── Contadores en el menú ───────── */
  async function refreshBadges() {
    if (!navEl) return;
    let r;
    try { r = await api("GET", "resumen"); } catch { return; }
    const set = (id, n, title) => {
      const a = navEl.querySelector(`a[data-href="#/${id}"]`);
      if (!a) return;
      let b = a.querySelector(".nav__badge");
      if (!n) { if (b) b.remove(); return; }
      if (!b) { b = h("span", { class: "nav__badge" }); a.append(b); }
      b.textContent = n > 99 ? "99+" : String(n);
      b.title = title;
    };
    set("solicitudes", r.solicitudesNuevas, "Solicitudes nuevas");
    set("reparaciones", r.reparacionesActivas, "Equipos en taller");
  }

  /* ───────── Estadísticas: tarjeta de conversiones ───────── */
  const CONV = { whatsapp: ["💬", "Clics en WhatsApp"], llamada: ["📞", "Clics en llamar"], correo: ["✉️", "Clics en correo"], formulario: ["📝", "Formularios enviados"],
    cotizacion_wa: ["💲", "Cotizaciones por WhatsApp"], cotizacion_pdf: ["🖨️", "Cotizaciones impresas"], diagnostico: ["🩺", "Diagnósticos completados"], diagnostico_ia: ["✨", "Diagnósticos con IA"], seguimiento: ["🔎", "Consultas de seguimiento"] };
  function convCard(c, periodName) {
    if (!c || !(c.porTipo || []).length) {
      return h("section", { class: "stat-card stat-card--wide conv-card" },
        h("h3", {}, "🎯 Contactos y conversiones"),
        h("p", { class: "muted-sm", style: "margin:0" }, `Sin contactos registrados en ${periodName}. Aquí verás cuántas personas pulsaron WhatsApp, llamaron, enviaron un formulario, una cotización o hicieron el diagnóstico, y desde qué página.`));
    }
    const tiles = h("div", { class: "conv-tiles" }, ...c.porTipo.map((x) => {
      const [ic, l] = CONV[x.k] || ["•", x.k];
      return h("div", { class: "conv-tile" }, h("span", { class: "conv-tile__ic" }, ic), h("strong", {}, fmtN(x.n)), h("span", {}, l), h("small", {}, `${fmtN(x.p)} persona${x.p === 1 ? "" : "s"}`));
    }));
    const tabla = (c.donde || []).length ? h("div", { class: "table-wrap" }, h("table", { class: "table table--compact table--static" },
      h("thead", {}, h("tr", {}, h("th", {}, "Acción"), h("th", {}, "Página"), h("th", {}, "Sección / botón"), h("th", { class: "num" }, "Veces"))),
      h("tbody", {}, ...c.donde.map((x) => { const p = pageInfo(x.ruta); const [ic, l] = CONV[x.tipo] || ["•", x.tipo];
        return h("tr", {}, h("td", { class: "nowrap" }, `${ic} ${l}`), h("td", {}, `${p.icon} ${p.name}`), h("td", {}, [x.etiqueta, x.seccion && x.seccion !== x.etiqueta ? `en «${x.seccion}»` : ""].filter(Boolean).join(" ") || "—"), h("td", { class: "num" }, fmtN(x.n))); })))) : null;
    const sol = (c.solicitudes || []).length ? h("p", { class: "muted-sm conv-sol" }, "Datos de contacto guardados: ",
      ...c.solicitudes.map((x, i) => h("span", {}, i ? " · " : "", `${(SOL_TIPO[x.tipo] || SOL_TIPO.otro)[0]} ${(SOL_TIPO[x.tipo] || SOL_TIPO.otro)[1]}: `, h("b", {}, fmtN(x.n)))), " — ", h("a", { href: "#/solicitudes" }, "ver solicitudes →")) : null;
    return h("section", { class: "stat-card stat-card--wide conv-card" },
      h("h3", {}, `🎯 Contactos y conversiones (${periodName})`), tiles, sol, tabla);
  }

  /* ───────── guardar ───────── */
  function validate(sec) {
    const req = [];
    const check = (fields, obj, prefix) => (fields || []).forEach((f) => {
      const v = obj ? obj[f.name] : undefined;
      if (f.required && !f.list && (v === undefined || v === null || String(v).trim() === "")) req.push(prefix + (f.label || f.name));
      if (f.type === "object" && !f.list && isObj(v)) check(f.fields, v, prefix);
      if (f.type === "object" && f.list && Array.isArray(v)) v.forEach((it, i) => isObj(it) && check(f.fields, it, `${prefix}${stripEmoji(f.label)} ${i + 1} → `));
    });
    if (sec.list) (S.doc || []).forEach((it, i) => isObj(it) && check(sec.fields, it, `Elemento ${i + 1} → `));
    else check(sec.fields, S.doc, "");
    return req;
  }

  async function save() {
    const sec = findSection(S.view.section);
    if (!sec || !S.dirty) return;
    const faltan = validate(sec);
    if (sec.type === "collection" && !String(S.doc[sec.primary || "titulo"] || "").trim()) faltan.unshift("Título");
    if (faltan.length) {
      toast(`Completa estos campos obligatorios: ${faltan.slice(0, 4).join(", ")}${faltan.length > 4 ? "…" : ""}`, "error", 8000);
      return;
    }
    let path = S.path;
    if (sec.type === "collection" && S.isNew) {
      const base = slugify(S.doc[sec.primary || "titulo"]).slice(0, 50).replace(/-+$/, "") || `${slugify(colLabel(sec))}-${Date.now().toString(36)}`;
      const existing = new Set((S.blogCache || []).map((x) => x.ruta));
      let name = base, n = 2;
      while (existing.has(`${sec.path}/${name}.json`)) name = `${base}-${n++}`;
      path = `${sec.path}/${name}.json`;
    }
    saveBtn.disabled = true;
    saveBtn.replaceChildren(h("span", { class: "spinner" }), " Guardando…");
    try {
      const label = sec.type === "collection" ? `${colLabel(sec)} «${S.doc.titulo || ""}»` : stripEmoji(sec.label);
      const r = await api("PUT", "archivo", { ruta: path, datos: S.doc, sha: S.sha, mensaje: `Panel: ${S.isNew ? "crear" : "actualizar"} ${label}` });
      S.sha = r.sha; S.path = path;
      const wasNew = S.isNew; S.isNew = false;
      setDirty(false);
      toast("✅ Cambios guardados. Tu sitio se está actualizando…", "ok");
      watchPublish(r.commit);
      if (sec.type === "collection" && wasNew) {
        S.blogCache = null;
        const file = path.split("/").pop().replace(/\.json$/, "");
        lastHash = `#/${sec.id}/${encodeURIComponent(file)}`;
        history.replaceState(null, "", lastHash);
        openEntry(sec, file);
      }
    } catch (e) {
      if (e.message !== "sesión") toast(e.message, "error", 9000);
      setDirty(true);
    } finally {
      saveBtn.replaceChildren("💾 Guardar cambios");
      saveBtn.disabled = !S.dirty;
    }
  }

  /* ───────── seguimiento de la publicación ───────── */
  function setPub(state, text) {
    pubEl.className = `pub ${state ? "pub--" + state : ""}`;
    pubEl.replaceChildren();
    if (state === "working") pubEl.append(h("span", { class: "spinner" }));
    if (text) pubEl.append(text);
  }

  function watchPublish(commit) {
    if (S.watch) clearInterval(S.watch.timer);
    const started = Date.now();
    setPub("working", "Publicando…");
    const check = async () => {
      const elapsed = (Date.now() - started) / 1000;
      try {
        const v = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" }).then((r) => r.ok ? r.json() : {});
        if (commit && v.commit && v.commit === commit) {
          clearInterval(S.watch.timer); S.watch = null;
          setPub("ok", "✓ Publicado");
          toast(h("span", {}, "🎉 ¡Listo! Tus cambios ya se ven en el sitio. ", h("a", { href: "/", target: "_blank", rel: "noopener" }, "Ver sitio ↗")), "ok", 8000);
          setTimeout(() => { if (!S.watch) setPub("", ""); }, 15000);
          return;
        }
        if (!v.commit && elapsed > 150) {
          clearInterval(S.watch.timer); S.watch = null;
          setPub("ok", "✓ Guardado");
          return;
        }
      } catch { /* reintenta */ }
      if (elapsed > 420) {
        clearInterval(S.watch.timer); S.watch = null;
        setPub("warn", "⚠ Tarda más de lo normal");
        toast("La publicación está tardando. Revisa en Cloudflare → techrevive → Deployments si apareció un error.", "error", 12000);
      }
    };
    S.watch = { timer: setInterval(check, 8000) };
    setTimeout(check, 4000);
  }

  async function logout() {
    if (S.dirty && !confirm("Tienes cambios sin guardar. ¿Cerrar sesión de todos modos?")) return;
    try { await api("POST", "logout"); } catch { /* nada */ }
    S.dirty = false; layout = null;
    history.replaceState(null, "", "#/");
    renderLogin();
  }

  boot();
})();
