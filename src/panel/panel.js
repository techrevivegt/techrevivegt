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
  const VIEWS = { estadisticas: renderStats, certificados: renderCerts };
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

  function rankList(title, rows, opts = {}) {
    const max = Math.max(1, ...rows.map((r) => r.n));
    const total = opts.total || rows.reduce((a, r) => a + r.n, 0) || 1;
    return h("section", { class: "stat-card" }, h("h3", {}, title),
      rows.length ? h("ul", { class: "rank" }, ...rows.slice(0, opts.limit || 8).map((r) => h("li", {},
        h("div", { class: "rank__top" }, h("span", { class: "rank__label", title: r.title || r.label }, r.label), h("span", { class: "rank__n" }, fmtN(r.n), h("small", {}, ` ${Math.round(r.n * 100 / total)}%`))),
        h("div", { class: "rank__bar" }, h("span", { style: `width:${Math.max(2, r.n * 100 / max)}%` })))))
        : h("p", { class: "muted-sm" }, "Sin datos en este periodo."));
  }

  function dayChart(porDia, desde, dias) {
    const map = new Map(porDia.map((d) => [d.fecha, d]));
    const days = [];
    for (let i = 0; i < dias; i++) {
      const key = new Date(desde + i * 86400000 - 6 * 3600 * 1000).toISOString().slice(0, 10);
      days.push(map.get(key) || { fecha: key, visitas: 0, visitantes: 0 });
    }
    const W = 900, H = 220, pad = { l: 36, r: 8, t: 12, b: 26 };
    const peak = Math.max(4, ...days.map((d) => d.visitas));
    const unit = Math.ceil(peak / 4 / Math.pow(10, Math.floor(Math.log10(peak / 4)))) * Math.pow(10, Math.floor(Math.log10(peak / 4)));
    const tick = [1, 2, 3, 5, 10].map((m) => m * Math.pow(10, Math.floor(Math.log10(unit)))).find((t) => t >= unit) || unit;
    const max = tick * 4;
    const step = (W - pad.l - pad.r) / days.length, bw = Math.max(2, step * 0.7);
    const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
    let svg = "";
    for (let g = 0; g <= 4; g++) { const v = tick * g, yy = y(v); svg += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}" class="grid"/><text x="${pad.l - 6}" y="${yy + 4}" text-anchor="end">${v}</text>`; }
    const every = Math.ceil(days.length / 10);
    days.forEach((d, i) => {
      const x = pad.l + i * step + (step - bw) / 2;
      const label = new Date(d.fecha + "T12:00:00").toLocaleDateString("es-GT", { day: "numeric", month: "short" });
      svg += `<g><title>${label}: ${d.visitas} visitas · ${d.visitantes} visitantes</title><rect x="${x}" y="${y(d.visitas)}" width="${bw}" height="${Math.max(0, H - pad.b - y(d.visitas))}" rx="2" class="b1"/><rect x="${x + bw * 0.2}" y="${y(d.visitantes)}" width="${bw * 0.6}" height="${Math.max(0, H - pad.b - y(d.visitantes))}" rx="2" class="b2"/></g>`;
      if (i % every === 0) svg += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${label}</text>`;
    });
    return h("div", { class: "chart", html: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visitas por día">${svg}</svg>` });
  }

  function hourChart(horas) {
    const m = new Map(horas.map((x) => [x.h, x.n]));
    const vals = Array.from({ length: 24 }, (_, i) => m.get(i) || 0);
    const max = Math.max(1, ...vals);
    return h("section", { class: "stat-card" }, h("h3", {}, "🕑 Horario de visitas (hora de Guatemala)"),
      h("div", { class: "hours" }, ...vals.map((v, i) => h("div", { class: "hours__col", title: `${i}:00 – ${i}:59 · ${v} visitas` },
        h("span", { style: `height:${Math.max(3, v * 100 / max)}%` }), h("small", {}, i % 3 === 0 ? String(i) : "")))));
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (S.leafletP) return S.leafletP;
    S.leafletP = new Promise((res, rej) => {
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.append(css);
      const js = document.createElement("script"); js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      js.onload = () => res(window.L); js.onerror = () => { S.leafletP = null; rej(new Error("No se pudo cargar el mapa.")); };
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
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);
        const max = Math.max(...points.map((p) => p.n));
        const layer = L.featureGroup().addTo(map);
        points.forEach((p) => {
          L.circleMarker([p.lat, p.lon], { radius: 5 + 14 * Math.sqrt(p.n / max), color: "#1D4ED8", weight: 1.5, fillColor: "#3B82F6", fillOpacity: 0.45 })
            .bindTooltip(`${flag(p.pais)} ${p.ciudad || countryName(p.pais)} · ${fmtN(p.n)} visitas`).addTo(layer);
        });
        if (points.length > 1) map.fitBounds(layer.getBounds().pad(0.3), { maxZoom: 7 }); else map.setView([points[0].lat, points[0].lon], 7);
        setTimeout(() => map.invalidateSize(), 200);
      }).catch((e) => { box.replaceChildren(h("p", { class: "muted-sm", style: "padding:16px" }, e.message)); });
    }
    return h("section", { class: "stat-card stat-card--wide" }, h("h3", {}, "🗺️ Mapa de visitantes"), box);
  }

  async function renderStats(sec) {
    const dias = Number(sessionStorage.getItem("tr-stats-dias")) || 30;
    const periods = [[1, "Hoy"], [7, "7 días"], [30, "30 días"], [90, "90 días"], [365, "1 año"]];
    const noTrack = localStorage.getItem("tr-noseguir") === "1";
    const toolbar = h("div", { class: "toolbar" },
      h("div", { class: "seg", role: "group", "aria-label": "Periodo" }, ...periods.map(([d, l]) => h("button", { type: "button", class: d === dias ? "is-on" : "", onclick: () => { sessionStorage.setItem("tr-stats-dias", d); renderStats(sec); } }, l))),
      h("div", { class: "toolbar__left" },
        h("label", { class: "check-inline", title: "Tus propias visitas desde este navegador no se contarán" },
          h("input", { type: "checkbox", checked: noTrack, onchange: (e) => { if (e.target.checked) localStorage.setItem("tr-noseguir", "1"); else localStorage.removeItem("tr-noseguir"); toast(e.target.checked ? "Listo: tus visitas desde este navegador ya no se cuentan." : "Tus visitas desde este navegador se volverán a contar.", "ok"); } }),
          " No contar mis visitas"),
        h("a", { class: "btn btn--ghost btn--sm", href: `/api/estadisticas/csv?dias=${dias}` }, "⬇ Exportar CSV"),
        h("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: () => renderStats(sec) }, "↻ Actualizar")));
    contentEl.replaceChildren(toolbar, loading("Calculando estadísticas…"));
    let d;
    try { d = await api("GET", `estadisticas?dias=${dias}`); } catch (e) { if (e.message !== "sesión") contentEl.replaceChildren(toolbar, dbError(e)); return; }
    const R = d.resumen;
    const kpi = (emoji, label, value, hint) => h("div", { class: "kpi" }, h("span", { class: "kpi__emoji" }, emoji), h("div", {}, h("strong", {}, value), h("span", {}, label), hint ? h("small", {}, hint) : null));
    const kpis = h("div", { class: "kpis" },
      kpi("👁️", "Visitas (páginas vistas)", fmtN(R.visitas)),
      kpi("🧑", "Visitantes únicos", fmtN(R.visitantes)),
      kpi("⏱️", "Tiempo total en el sitio", fmtDur(R.tiempo)),
      kpi("⌛", "Tiempo promedio por visitante", fmtDur(R.visitantes ? R.tiempo / R.visitantes : 0)),
      kpi("📄", "Páginas por visita", R.sesiones ? (R.visitas / R.sesiones).toFixed(1) : "0"),
      kpi("🎓", "Alumnos del aula activos", fmtN(R.alumnos), "con sesión iniciada"));
    if (!R.visitas) {
      contentEl.replaceChildren(toolbar, kpis, h("div", { class: "alert alert--info" }, "Todavía no hay visitas registradas en este periodo. Las visitas empiezan a contarse desde que se publica esta versión del sitio. Abre tu sitio en otra pestaña (o desde tu celular) y vuelve a actualizar."));
      return;
    }
    const pages = h("section", { class: "stat-card stat-card--wide" }, h("h3", {}, "📄 Páginas más visitadas"),
      h("div", { class: "table-wrap" }, h("table", { class: "table table--compact table--static" },
        h("thead", {}, h("tr", {}, h("th", {}, "Página"), h("th", { class: "num" }, "Visitas"), h("th", { class: "num" }, "Visitantes"), h("th", { class: "num" }, "Tiempo prom."))),
        h("tbody", {}, ...d.paginas.map((p) => h("tr", {}, h("td", {}, h("a", { href: p.ruta, target: "_blank", rel: "noopener" }, (p.titulo || p.ruta).replace(/\s*\|\s*TechRevive$/, "")), h("small", { class: "muted-sm block" }, p.ruta)),
          h("td", { class: "num" }, fmtN(p.visitas)), h("td", { class: "num" }, fmtN(p.visitantes)), h("td", { class: "num" }, fmtDur(p.prom))))))));
    const rows = d.detalle;
    const tbody = h("tbody", {});
    const paintRows = (q) => {
      q = (q || "").toLowerCase();
      const list = q ? rows.filter((r) => [r.ruta, r.titulo, r.ciudad, r.region, countryName(r.pais), r.ip, r.navegador, r.so, r.dispositivo, r.ref, r.usuario].join(" ").toLowerCase().includes(q)) : rows;
      tbody.replaceChildren(...list.map((r) => h("tr", {},
        h("td", { class: "nowrap" }, fmtDT(r.ts)),
        h("td", {}, h("span", { title: r.titulo || "" }, r.ruta)),
        h("td", {}, `${flag(r.pais)} ${[r.ciudad, r.region].filter(Boolean).join(", ") || countryName(r.pais)}`, h("small", { class: "muted-sm block" }, countryName(r.pais))),
        h("td", {}, `${devIcon(r.dispositivo)} ${r.dispositivo || ""}`, h("small", { class: "muted-sm block" }, r.so || "")),
        h("td", {}, r.navegador || ""),
        h("td", { class: "mono" }, r.ip || ""),
        h("td", { class: "num nowrap" }, r.duracion ? fmtDur(r.duracion) : "—"),
        h("td", {}, r.ref || h("span", { class: "muted-sm" }, "Directo / interno")),
        h("td", {}, r.usuario ? h("span", { class: "badge badge--ok" }, r.usuario) : ""))));
    };
    paintRows("");
    const detail = h("section", { class: "stat-card stat-card--wide" },
      h("div", { class: "stat-card__head" }, h("h3", {}, `🧾 Últimas visitas (${rows.length})`), h("input", { type: "search", class: "input input--sm", placeholder: "Buscar ciudad, IP, página…", oninput: (e) => paintRows(e.target.value) })),
      h("div", { class: "table-wrap table-wrap--scroll" }, h("table", { class: "table table--compact table--static" },
        h("thead", {}, h("tr", {}, ...["Fecha y hora", "Página", "Ubicación", "Dispositivo", "Navegador", "IP", "Tiempo", "Llegó desde", "Alumno"].map((t) => h("th", {}, t)))), tbody)),
      h("p", { class: "muted-sm", style: "margin:10px 0 0" }, "La ubicación es aproximada (por la conexión a internet). Para ver todas las visitas del periodo usa «Exportar CSV» (se abre en Excel)."));
    contentEl.replaceChildren(toolbar, kpis,
      h("section", { class: "stat-card stat-card--wide" }, h("div", { class: "stat-card__head" }, h("h3", {}, "📈 Visitas por día"), h("div", { class: "legend" }, h("span", { class: "lg1" }, "Visitas"), h("span", { class: "lg2" }, "Visitantes únicos"))), dayChart(d.porDia, d.desde, d.dias)),
      h("div", { class: "stat-grid" },
        rankList("🌎 Países", d.paises.map((x) => ({ label: `${flag(x.pais)} ${countryName(x.pais)}`, n: x.visitas })), { total: R.visitas }),
        rankList("📍 Ciudades / regiones", d.ciudades.map((x) => ({ label: `${flag(x.pais)} ${[x.ciudad, x.region].filter(Boolean).join(", ") || countryName(x.pais)}`, n: x.visitas })), { total: R.visitas }),
        rankList("📱 Dispositivos", d.dispositivos.map((x) => ({ label: `${devIcon(x.k)} ${x.k}`, n: x.n }))),
        rankList("🌐 Navegadores", d.navegadores.map((x) => ({ label: x.k, n: x.n }))),
        rankList("🖥️ Sistemas operativos", d.sistemas.map((x) => ({ label: x.k, n: x.n }))),
        rankList("🔗 Llegaron desde", d.referentes.map((x) => ({ label: x.k, n: x.n })), { total: R.visitas })),
      mapCard(d.mapa), hourChart(d.horas), pages, detail);
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
                  c.certificado ? h("span", { class: `badge ${(certEstado[c.certificado] || [])[1] || ""}` }, (certEstado[c.certificado] || [c.certificado])[0]) : null);
              }))))))));
      } catch (e) { if (e.message !== "sesión") body.replaceChildren(dbError(e)); }
    }
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
