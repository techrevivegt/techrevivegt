/**
 * TechRevive · Servidor del panel de administración (Cloudflare Worker)
 *
 * - Sirve el sitio estático (carpeta _site) como siempre.
 * - Atiende /api/* para el panel en /panel/:
 *     inicio de sesión con contraseña, lectura y guardado del contenido,
 *     subida de imágenes. Cada "Guardar" crea un commit en GitHub, lo que
 *     dispara la publicación automática en Cloudflare (1–2 minutos).
 *
 * Variables (Cloudflare → tu Worker → Settings → Variables and Secrets):
 *   PANEL_PASSWORD  (Secret)  contraseña para entrar al panel
 *   GITHUB_TOKEN    (Secret)  token de GitHub con permiso Contents: Read and write
 *   GITHUB_REPO     (texto)   usuario/repositorio, ej. techrevivegt/techrevivegt
 *   GITHUB_BRANCH   (texto)   rama, normalmente main
 *   AULA_SECRET     (Secret, opcional) clave para firmar las sesiones del aula virtual
 *
 * Aula virtual (/aula/*): solo entra quien tenga usuario y contraseña en
 * content/alumnos.json (se editan en el panel → Aula virtual → Alumnos).
 * build.py convierte esa lista en worker/aula-datos.js con las contraseñas cifradas.
 */

import AULA from "./aula-datos.js";

const SESSION_COOKIE = "tr_panel";
const SESSION_HOURS = 12;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const ALLOWED_PATHS = [
  /^content\/[a-z0-9_-]+\.json$/,
  /^content\/blog\/[a-z0-9_-]+\.json$/,
];
const IMAGE_PATH = /^src\/img\/[a-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/;
const DOC_PATH = /^src\/aula-archivos\/[a-z0-9_-]+\.(pdf|docx?|xlsx?|pptx?|zip|txt)$/;
const MAX_DOC_BYTES = 15 * 1024 * 1024;
const ALLOWED_DIRS = ["content/blog", "src/img", "src/aula-archivos"];

const AULA_COOKIE = "tr_aula";
const AULA_DAYS = 14;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        return json({ error: err.userMessage || "Error inesperado en el servidor del panel.", detail: String(err && err.message || err) }, err.status || 500);
      }
    }
    if (url.pathname === "/aula" || url.pathname.startsWith("/aula/")) {
      return handleAulaPage(request, env, url);
    }
    if (url.pathname === "/admin" || url.pathname === "/admin/" || url.pathname === "/admin.html") {
      return Response.redirect(new URL("/panel/", url).toString(), 302);
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("No encontrado", { status: 404 });
  },
};

/* ───────────────────────── API ───────────────────────── */

async function handleApi(request, env, url) {
  const route = url.pathname.replace(/^\/api\//, "").replace(/\/$/, "");
  const method = request.method.toUpperCase();

  if (route.startsWith("aula/")) return handleAulaApi(request, env, url, route, method);

  // Protección CSRF básica: las llamadas que modifican deben venir del panel.
  if (method !== "GET" && request.headers.get("x-panel") !== "1") {
    return json({ error: "Solicitud no permitida." }, 403);
  }

  if (route === "estado" && method === "GET") {
    const session = await readSession(request, env);
    return json({
      configurado: {
        contrasena: Boolean(env.PANEL_PASSWORD),
        token: Boolean(env.GITHUB_TOKEN),
        repositorio: Boolean(env.GITHUB_REPO),
      },
      repositorio: env.GITHUB_REPO || "",
      rama: env.GITHUB_BRANCH || "main",
      sesion: Boolean(session),
    });
  }

  if (route === "login" && method === "POST") {
    if (!env.PANEL_PASSWORD) return json({ error: "Falta configurar la contraseña del panel (PANEL_PASSWORD) en Cloudflare." }, 500);
    const body = await readJson(request);
    const ok = await safeEqual(String(body.password || ""), String(env.PANEL_PASSWORD));
    if (!ok) {
      await sleep(700);
      return json({ error: "Contraseña incorrecta." }, 401);
    }
    const cookie = await makeSession(env, url);
    return json({ ok: true }, 200, { "Set-Cookie": cookie });
  }

  if (route === "logout" && method === "POST") {
    return json({ ok: true }, 200, { "Set-Cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict` });
  }

  // A partir de aquí todo requiere sesión iniciada.
  const session = await readSession(request, env);
  if (!session) return json({ error: "Tu sesión terminó. Vuelve a entrar con tu contraseña.", login: true }, 401);
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return json({ error: "Falta configurar GITHUB_TOKEN o GITHUB_REPO en Cloudflare (Settings → Variables and Secrets)." }, 500);
  }

  if (route === "archivo") {
    const path = url.searchParams.get("ruta") || "";
    if (method === "GET") {
      assertPath(path);
      const file = await ghGetFile(env, path);
      if (!file) return json({ existe: false, sha: null, datos: null });
      let datos;
      try { datos = JSON.parse(file.text); } catch { return json({ error: `El archivo ${path} tiene un error de formato y no se puede abrir en el panel.` }, 422); }
      return json({ existe: true, sha: file.sha, datos });
    }
    if (method === "PUT") {
      const body = await readJson(request);
      assertPath(body.ruta);
      if (body.datos === undefined) return json({ error: "No hay datos para guardar." }, 400);
      const text = JSON.stringify(body.datos, null, 2) + "\n";
      const res = await ghPutFile(env, body.ruta, utf8ToB64(text), body.sha || undefined, body.mensaje || `Panel: actualizar ${body.ruta}`);
      return json({ ok: true, sha: res.content && res.content.sha, commit: res.commit && res.commit.sha });
    }
    if (method === "DELETE") {
      assertPath(path);
      const sha = url.searchParams.get("sha");
      if (!sha) return json({ error: "Falta la versión del archivo." }, 400);
      const res = await gh(env, `contents/${encodePath(path)}`, {
        method: "DELETE",
        body: JSON.stringify({ message: `Panel: eliminar ${path}`, sha, branch: branch(env) }),
      });
      return json({ ok: true, commit: res.commit && res.commit.sha });
    }
  }

  if (route === "carpeta" && method === "GET") {
    const dir = url.searchParams.get("ruta") || "";
    if (!ALLOWED_DIRS.includes(dir)) return json({ error: "Carpeta no permitida." }, 403);
    const list = await gh(env, `contents/${encodePath(dir)}?ref=${encodeURIComponent(branch(env))}`, {}, true);
    const items = Array.isArray(list) ? list.filter((x) => x.type === "file").map((x) => ({ nombre: x.name, ruta: x.path, sha: x.sha, tamano: x.size })) : [];
    return json({ items });
  }

  if (route === "entradas" && method === "GET") {
    // Lista los artículos del blog con sus datos principales (para la tabla).
    const list = await gh(env, `contents/content/blog?ref=${encodeURIComponent(branch(env))}`, {}, true);
    const files = Array.isArray(list) ? list.filter((x) => x.type === "file" && x.name.endsWith(".json")) : [];
    const items = await Promise.all(files.map(async (f) => {
      try {
        const file = await ghGetFile(env, f.path);
        return { ruta: f.path, sha: file.sha, datos: JSON.parse(file.text) };
      } catch {
        return { ruta: f.path, sha: f.sha, datos: null, error: true };
      }
    }));
    return json({ items });
  }

  if (route === "imagen" && method === "POST") {
    const body = await readJson(request);
    const name = safeImageName(body.nombre || "imagen.jpg");
    const b64 = String(body.base64 || "").replace(/^data:[^,]+,/, "");
    if (!b64) return json({ error: "No llegó ninguna imagen." }, 400);
    if (b64.length * 0.75 > MAX_IMAGE_BYTES) return json({ error: "La imagen es demasiado grande (máximo 6 MB)." }, 413);
    const path = `src/img/${name}`;
    if (!IMAGE_PATH.test(path)) return json({ error: "Formato no permitido. Usa JPG, PNG, WEBP o GIF." }, 400);
    const res = await ghPutFile(env, path, b64, undefined, `Panel: subir imagen ${name}`);
    return json({ ok: true, url: `/img/${name}`, commit: res.commit && res.commit.sha });
  }

  if (route === "documento" && method === "POST") {
    const body = await readJson(request);
    const name = safeDocName(body.nombre || "documento.pdf");
    const b64 = String(body.base64 || "").replace(/^data:[^,]+,/, "");
    if (!b64) return json({ error: "No llegó ningún archivo." }, 400);
    if (b64.length * 0.75 > MAX_DOC_BYTES) return json({ error: "El archivo es demasiado grande (máximo 15 MB). Para archivos más pesados usa un enlace de Google Drive." }, 413);
    const path = `src/aula-archivos/${name}`;
    if (!DOC_PATH.test(path)) return json({ error: "Formato no permitido. Usa PDF, Word, Excel, PowerPoint, ZIP o TXT." }, 400);
    const res = await ghPutFile(env, path, b64, undefined, `Panel: subir material ${name}`);
    return json({ ok: true, url: `/aula/archivos/${name}`, commit: res.commit && res.commit.sha });
  }

  if (route === "ultimo-cambio" && method === "GET") {
    const commits = await gh(env, `commits?sha=${encodeURIComponent(branch(env))}&per_page=1`, {}, true);
    const c = Array.isArray(commits) && commits[0];
    return json(c ? { sha: c.sha, mensaje: c.commit && c.commit.message, fecha: c.commit && c.commit.author && c.commit.author.date } : {});
  }

  return json({ error: "Ruta no encontrada." }, 404);
}

/* ───────────────────────── Aula virtual ───────────────────────── */

const AULA_USERS = (AULA && AULA.alumnos) || {};
const AULA_COURSES = (AULA && AULA.cursos) || [];

function todayGT() {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "America/Guatemala" }); }
  catch { return new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10); }
}

// Revisa si la cuenta puede entrar. Devuelve un mensaje de error o "" si todo está bien.
function aulaProblem(user) {
  if (!user) return "Usuario o contraseña incorrectos.";
  if (!user.a) return "Tu cuenta está desactivada. Escríbenos para reactivarla.";
  if (user.v && user.v < todayGT()) return "Tu acceso venció. Escríbenos para renovarlo.";
  return "";
}

function aulaHasCourse(user, slug) {
  return Array.isArray(user.c) && (user.c.includes("*") || user.c.includes(slug));
}

async function aulaKey(env) {
  const secret = `${env.AULA_SECRET || env.PANEL_PASSWORD || (AULA && AULA.k) || "aula"}::techrevive-aula`;
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function aulaSign(env, payload) {
  const sig = await crypto.subtle.sign("HMAC", await aulaKey(env), new TextEncoder().encode(payload));
  return bytesToB64url(new Uint8Array(sig));
}

async function sha256Hex(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function aulaSession(request, env) {
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${AULA_COOKIE}=([^;]+)`));
  if (!m) return null;
  const parts = m[1].split(".");
  if (parts.length !== 3) return null;
  const [u64, exp, sig] = parts;
  if (!(await safeEqual(sig, await aulaSign(env, `${u64}.${exp}`)))) return null;
  if (Number(exp) < Date.now()) return null;
  let usuario;
  try { usuario = b64ToUtf8(u64.replace(/-/g, "+").replace(/_/g, "/")); } catch { return null; }
  const user = Object.prototype.hasOwnProperty.call(AULA_USERS, usuario) ? AULA_USERS[usuario] : null;
  if (aulaProblem(user)) return null; // se desactivó, venció o se borró: la sesión deja de valer
  return { usuario, user };
}

function aulaCookie(url, value, maxAge) {
  const secure = url.protocol === "https:" ? " Secure;" : "";
  return `${AULA_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly;${secure} SameSite=Lax`;
}

async function handleAulaApi(request, env, url, route, method) {
  if (method !== "GET" && request.headers.get("x-aula") !== "1") return json({ error: "Solicitud no permitida." }, 403);

  if (route === "aula/login" && method === "POST") {
    const body = await readJson(request);
    const usuario = String(body.usuario || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = usuario && Object.prototype.hasOwnProperty.call(AULA_USERS, usuario) ? AULA_USERS[usuario] : null;
    const ok = user ? await safeEqual(await sha256Hex(`${user.s}:${password}`), user.h) : false;
    if (!ok) {
      await sleep(800);
      return json({ error: "Usuario o contraseña incorrectos." }, 401);
    }
    const problem = aulaProblem(user);
    if (problem) return json({ error: problem }, 403);
    const u64 = utf8ToB64(usuario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const exp = Date.now() + AULA_DAYS * 86400 * 1000;
    const token = `${u64}.${exp}.${await aulaSign(env, `${u64}.${exp}`)}`;
    return json({ ok: true }, 200, { "Set-Cookie": aulaCookie(url, token, AULA_DAYS * 86400) });
  }

  if (route === "aula/logout" && method === "POST") {
    return json({ ok: true }, 200, { "Set-Cookie": aulaCookie(url, "", 0) });
  }

  if (route === "aula/yo" && method === "GET") {
    const s = await aulaSession(request, env);
    if (!s) return json({ error: "Inicia sesión para entrar al aula." }, 401);
    return json({ usuario: s.usuario, nombre: s.user.n, cursos: s.user.c, vence: s.user.v || "" });
  }

  return json({ error: "Ruta no encontrada." }, 404);
}

async function handleAulaPage(request, env, url) {
  const path = url.pathname;
  if (path === "/aula") return Response.redirect(new URL("/aula/" + url.search, url).toString(), 302);
  if (!env.ASSETS) return new Response("No encontrado", { status: 404 });

  const isLogin = /^\/aula\/ingresar(\.html|\/)?$/.test(path);
  if (!isLogin) {
    const s = await aulaSession(request, env);
    if (!s) {
      const back = encodeURIComponent(path + url.search);
      return new Response(null, { status: 302, headers: { Location: `/aula/ingresar?volver=${back}`, "Cache-Control": "no-store" } });
    }
    const slug = path.split("/")[2] || "";
    if (AULA_COURSES.includes(slug) && !aulaHasCourse(s.user, slug)) {
      return new Response(null, { status: 302, headers: { Location: `/aula/?sin-acceso=${encodeURIComponent(slug)}`, "Cache-Control": "no-store" } });
    }
  }
  const res = await env.ASSETS.fetch(request);
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/* ───────────────────────── GitHub ───────────────────────── */

function branch(env) { return env.GITHUB_BRANCH || "main"; }
function encodePath(p) { return p.split("/").map(encodeURIComponent).join("/"); }

async function gh(env, endpoint, init = {}, allow404 = false) {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "techrevive-panel",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (res.status === 404 && allow404) return null;
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).message || ""; } catch { /* sin cuerpo */ }
    throw ghError(res.status, detail, env);
  }
  return res.status === 204 ? {} : res.json();
}

function ghError(status, detail, env) {
  const msgs = {
    401: "GitHub rechazó el token: no es válido o ya venció. Crea uno nuevo y actualiza GITHUB_TOKEN en Cloudflare.",
    403: "El token de GitHub no tiene permiso para guardar. Debe tener «Contents: Read and write» sobre tu repositorio.",
    404: `GitHub no encuentra el repositorio «${env.GITHUB_REPO}» o el token no tiene acceso a él. Revisa GITHUB_REPO y que el token incluya ese repositorio.`,
    409: "Alguien guardó un cambio en este mismo contenido hace un momento. Recarga la página para ver la versión más reciente.",
    422: "Este contenido cambió desde que lo abriste (quizá en otra pestaña). Recarga la página e inténtalo de nuevo.",
  };
  const err = new Error(`GitHub ${status}: ${detail}`);
  err.status = status === 401 || status === 403 || status === 404 ? 502 : status === 409 || status === 422 ? 409 : 502;
  if (status === 403 && /rate limit/i.test(detail)) {
    err.userMessage = "GitHub está limitando las solicitudes. Espera unos minutos e inténtalo de nuevo.";
  } else {
    err.userMessage = msgs[status] || `GitHub respondió con un error (${status}). ${detail}`;
  }
  return err;
}

async function ghGetFile(env, path) {
  const data = await gh(env, `contents/${encodePath(path)}?ref=${encodeURIComponent(branch(env))}`, {}, true);
  if (!data) return null;
  if (Array.isArray(data)) throw Object.assign(new Error("Es una carpeta"), { status: 400, userMessage: "La ruta indicada es una carpeta." });
  let b64 = data.content;
  if (!b64 && data.download_url) {
    // Archivos grandes (> 1 MB) no traen contenido: se descargan aparte.
    const raw = await fetch(data.git_url, { headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "techrevive-panel" } });
    b64 = (await raw.json()).content;
  }
  return { sha: data.sha, text: b64ToUtf8(b64 || "") };
}

async function ghPutFile(env, path, b64, sha, message) {
  const body = { message, content: b64, branch: branch(env) };
  if (sha) body.sha = sha;
  try {
    return await gh(env, `contents/${encodePath(path)}`, { method: "PUT", body: JSON.stringify(body) });
  } catch (err) {
    // Si el archivo no existía en el panel pero sí en GitHub, reintenta con su versión actual.
    if (!sha && err.status === 409) {
      const current = await gh(env, `contents/${encodePath(path)}?ref=${encodeURIComponent(branch(env))}`, {}, true);
      if (current && current.sha && (path.startsWith("src/img/") || path.startsWith("src/aula-archivos/"))) {
        body.sha = current.sha;
        return gh(env, `contents/${encodePath(path)}`, { method: "PUT", body: JSON.stringify(body) });
      }
    }
    throw err;
  }
}

/* ───────────────────────── Sesión ───────────────────────── */

async function hmacKey(env) {
  const secret = `${env.PANEL_PASSWORD || ""}::${env.GITHUB_TOKEN || ""}::techrevive`;
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function sign(env, payload) {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(env), new TextEncoder().encode(payload));
  return bytesToB64url(new Uint8Array(sig));
}

async function makeSession(env, url) {
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  const payload = String(exp);
  const token = `${payload}.${await sign(env, payload)}`;
  const secure = url.protocol === "https:" ? " Secure;" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_HOURS * 3600}; HttpOnly;${secure} SameSite=Strict`;
}

async function readSession(request, env) {
  if (!env.PANEL_PASSWORD) return null;
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!m) return null;
  const [payload, sig] = m[1].split(".");
  if (!payload || !sig) return null;
  if (!(await safeEqual(sig, await sign(env, payload)))) return null;
  if (Number(payload) < Date.now()) return null;
  return { exp: Number(payload) };
}

async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/* ───────────────────────── Utilidades ───────────────────────── */

function assertPath(path) {
  if (!path || !ALLOWED_PATHS.some((re) => re.test(path))) {
    throw Object.assign(new Error("ruta no permitida"), { status: 403, userMessage: "Ese archivo no se puede editar desde el panel." });
  }
}

function safeImageName(name) {
  const m = String(name).toLowerCase().match(/^(.*?)(?:\.([a-z0-9]+))?$/);
  let base = (m[1] || "imagen").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "imagen";
  let ext = (m[2] || "jpg").replace("jpeg", "jpg");
  if (!["jpg", "png", "webp", "gif"].includes(ext)) ext = "jpg";
  const stamp = Date.now().toString(36).slice(-5);
  return `${base}-${stamp}.${ext}`;
}

function safeDocName(name) {
  const m = String(name).toLowerCase().match(/^(.*?)(?:\.([a-z0-9]+))?$/);
  const base = (m[1] || "documento").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "documento";
  const ext = m[2] || "pdf";
  return `${base}.${ext}`;
}

function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function b64ToUtf8(b64) {
  const bin = atob(String(b64).replace(/\s/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function bytesToB64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
