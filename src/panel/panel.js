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
        q("#/galeria", "🖼️", "Galería de fotos", "Sube y organiza tus fotos.")),
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
  const ALLOWED = { P: [], H2: [], H3: [], STRONG: [], B: [], EM: [], I: [], U: [], UL: [], OL: [], LI: [], A: ["href"], BR: [], BLOCKQUOTE: [] };
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
      h("button", { type: "button", title: "Quitar formato", onmousedown: cmd("removeFormat") }, "Limpiar"));
    return h("div", { class: "field" }, ...labelEl(f, id), h("div", { class: "rte" }, bar, area));
  }

  /* ───────── blog (colección) ───────── */
  async function renderCollection(sec) {
    setTitle(stripEmoji(sec.label), "Artículos");
    saveBtn.hidden = true;
    contentEl.replaceChildren(loading("Cargando artículos…"));
    try {
      const r = await api("GET", "entradas");
      S.blogCache = r.items;
      const items = r.items.filter((x) => x.datos).sort((a, b) => String(b.datos.fecha || "").localeCompare(String(a.datos.fecha || "")));
      const tbody = h("tbody", {});
      items.forEach((x) => {
        const file = x.ruta.split("/").pop().replace(/\.json$/, "");
        const tr = h("tr", { tabindex: "0", onclick: () => { location.hash = `#/${sec.id}/${encodeURIComponent(file)}`; }, onkeydown: (e) => { if (e.key === "Enter") tr.click(); } },
          h("td", {}, h("strong", {}, x.datos.titulo || file)),
          h("td", {}, x.datos.categoria || ""),
          h("td", {}, x.datos.fecha || ""),
          h("td", {}, x.datos.publicado === false ? h("span", { class: "badge badge--off" }, "Borrador") : h("span", { class: "badge badge--ok" }, "Publicado")));
        tbody.append(tr);
      });
      const broken = r.items.filter((x) => !x.datos);
      contentEl.replaceChildren(...[
        h("div", { class: "toolbar" }, h("p", { class: "intro", style: "margin:0" }, `${items.length} artículo(s). Haz clic en uno para editarlo.`),
          h("a", { class: "btn btn--primary", href: `#/${sec.id}/nuevo` }, "＋ Nuevo artículo")),
        broken.length ? h("div", { class: "alert alert--error" }, `Hay ${broken.length} archivo(s) con error de formato: ${broken.map((b) => b.ruta).join(", ")}`) : null,
        items.length ? h("table", { class: "table" }, h("thead", {}, h("tr", {}, h("th", {}, "Título"), h("th", {}, "Categoría"), h("th", {}, "Fecha"), h("th", {}, "Estado"))), tbody)
          : h("div", { class: "card card--flat is-open" }, h("div", { class: "card__body", style: "display:block;padding:24px" }, "Todavía no hay artículos. Pulsa «Nuevo artículo» para escribir el primero."))].filter(Boolean));
    } catch (e) {
      if (e.message !== "sesión") contentEl.replaceChildren(h("div", { class: "alert alert--error" }, e.message));
    }
  }

  async function openEntry(sec, file) {
    saveBtn.hidden = false;
    const back = h("a", { href: `#/${sec.id}`, class: "btn btn--ghost btn--sm" }, "← Volver a la lista");
    if (file === "nuevo") {
      setTitle("Nuevo artículo", stripEmoji(sec.label));
      S.path = null; S.sha = null; S.isNew = true;
      S.doc = emptyFor({ type: "object", fields: sec.fields });
      S.doc.publicado = true; S.doc.fecha = today();
      renderEditor({ ...sec, fields: sec.fields.map((f) => ({ ...f })) }, h("div", { class: "toolbar" }, back));
      wrapEntryFields();
      return;
    }
    setTitle("Editar artículo", stripEmoji(sec.label));
    contentEl.replaceChildren(loading());
    try {
      const path = `${sec.path}/${file}.json`;
      const r = await api("GET", `archivo?ruta=${encodeURIComponent(path)}`);
      if (!r.existe) { toast("Ese artículo ya no existe.", "error"); location.hash = `#/${sec.id}`; return; }
      S.path = path; S.sha = r.sha; S.isNew = false; S.doc = r.datos || {};
      setTitle(S.doc.titulo || "Editar artículo", stripEmoji(sec.label));
      const del = h("button", { class: "btn btn--danger btn--sm", type: "button", onclick: () => deleteEntry(sec) }, "🗑 Eliminar artículo");
      renderEditor(sec, h("div", { class: "toolbar" }, back, del));
      wrapEntryFields();
    } catch (e) {
      if (e.message !== "sesión") contentEl.replaceChildren(h("div", { class: "alert alert--error" }, e.message));
    }
  }

  // En los artículos, los campos se muestran juntos en una sola tarjeta.
  function wrapEntryFields() {
    const editor = contentEl.querySelector(".editor");
    const cards = [...editor.querySelectorAll(":scope > .card")];
    if (!cards.length) return;
    const card = h("section", { class: "card is-open" }, h("div", { class: "card__body", style: "display:block;padding-top:18px" }));
    cards.forEach((c) => { const b = c.querySelector(".card__body"); while (b.firstChild) card.firstChild.append(b.firstChild); c.remove(); });
    editor.append(card);
  }

  async function deleteEntry(sec) {
    if (!confirm(`¿Eliminar el artículo «${S.doc.titulo || ""}»? Esta acción no se puede deshacer desde el panel.`)) return;
    try {
      const r = await api("DELETE", `archivo?ruta=${encodeURIComponent(S.path)}&sha=${encodeURIComponent(S.sha)}`);
      setDirty(false);
      toast("Artículo eliminado. El sitio se actualizará en 1 o 2 minutos.", "ok");
      watchPublish(r.commit);
      location.hash = `#/${sec.id}`;
    } catch (e) { if (e.message !== "sesión") toast(e.message, "error", 8000); }
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
      const base = slugify(S.doc[sec.primary || "titulo"]) || `articulo-${Date.now().toString(36)}`;
      const existing = new Set((S.blogCache || []).map((x) => x.ruta));
      let name = base, n = 2;
      while (existing.has(`${sec.path}/${name}.json`)) name = `${base}-${n++}`;
      path = `${sec.path}/${name}.json`;
    }
    saveBtn.disabled = true;
    saveBtn.replaceChildren(h("span", { class: "spinner" }), " Guardando…");
    try {
      const label = sec.type === "collection" ? `artículo «${S.doc.titulo || ""}»` : stripEmoji(sec.label);
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
