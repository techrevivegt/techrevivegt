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
 * Base de datos (D1, binding DB): progreso de los alumnos, certificados y
 * estadísticas de visitas. Cloudflare la crea sola en la primera publicación
 * (ver d1_databases en wrangler.jsonc). Las tablas se crean solas al usarla.
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
  /^content\/aula-cursos\/[a-z0-9_-]+\.json$/,
];
const COLLECTIONS = ["content/blog", "content/aula-cursos"];
const IMAGE_PATH = /^src\/img\/[a-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/;
const DOC_PATH = /^src\/aula-archivos\/[a-z0-9_-]+\.(pdf|docx?|xlsx?|pptx?|zip|txt)$/;
const MAX_DOC_BYTES = 15 * 1024 * 1024;
const ALLOWED_DIRS = ["content/blog", "content/aula-cursos", "src/img", "src/aula-archivos"];

const AULA_COOKIE = "tr_aula";
const AULA_DAYS = 14;

const AULAOS_DOWNLOAD_PATH = "/descargas/aulaos-0.1-amd64-amd64.hybrid.iso";
const AULAOS_R2_KEY = "aulaos/aulaos-0.1-amd64-amd64.hybrid.iso";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === AULAOS_DOWNLOAD_PATH) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return withSec(new Response("Método no permitido.", { status: 405, headers: { Allow: "GET, HEAD" } }));
      }
      try {
        return withSec(await handleAulaOSDownload(request, env));
      } catch (err) {
        console.error("No se pudo servir AulaOS desde R2", err);
        return withSec(new Response("No se pudo acceder a la ISO de AulaOS.", { status: 502 }));
      }
    }
    if (url.pathname.startsWith("/api/")) {
      try {
        return withSec(await handleApi(request, env, url));
      } catch (err) {
        return withSec(json({ error: err.userMessage || "Error inesperado en el servidor del panel.", detail: String(err && err.message || err) }, err.status || 500));
      }
    }
    if (url.pathname === "/aula" || url.pathname.startsWith("/aula/")) {
      return withSec(await handleAulaPage(request, env, url), true);
    }
    if (url.pathname === "/admin" || url.pathname === "/admin/" || url.pathname === "/admin.html") {
      return Response.redirect(new URL("/panel/", url).toString(), 302);
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("No encontrado", { status: 404 });
  },
};

/* ───────────────────────── Descarga de AulaOS desde R2 ───────────────────────── */
async function handleAulaOSDownload(request, env) {
  const bucket = env.AULAOS_RELEASES;
  if (!bucket) {
    return new Response("La descarga de AulaOS aún no está configurada.", { status: 503 });
  }

  const object = request.method === "HEAD"
    ? await bucket.head(AULAOS_R2_KEY)
    : await bucket.get(
        AULAOS_R2_KEY,
        request.headers.has("range") ? { range: request.headers } : undefined
      );

  if (!object) {
    return new Response("La ISO de AulaOS todavía no está cargada en R2.", { status: 404 });
  }

  const headers = new Headers();
  if (typeof object.writeHttpMetadata === "function") object.writeHttpMetadata(headers);
  headers.set("Content-Type", "application/octet-stream");
  headers.set("Content-Disposition", 'attachment; filename="AulaOS-0.1-Live-AMD64.iso"');
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("X-Content-Type-Options", "nosniff");
  if (object.httpEtag) headers.set("ETag", object.httpEtag);

  if (request.method === "HEAD") {
    headers.set("Content-Length", String(object.size));
    return new Response(null, { status: 200, headers });
  }

  if (!object.body) {
    return new Response("No se pudo leer la ISO desde R2.", { status: 502 });
  }

  if (object.range && Number.isSafeInteger(object.range.offset) && Number.isSafeInteger(object.range.length)) {
    const first = object.range.offset;
    const last = first + object.range.length - 1;
    headers.set("Content-Range", `bytes ${first}-${last}/${object.size}`);
    headers.set("Content-Length", String(object.range.length));
    return new Response(object.body, { status: 206, headers });
  }

  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { status: 200, headers });
}

/* ───────────────────────── API ───────────────────────── */

async function handleApi(request, env, url) {
  const route = url.pathname.replace(/^\/api\//, "").replace(/\/$/, "");
  const method = request.method.toUpperCase();

  if (route === "v" || route === "v/fin" || route === "v/e") return handleBeacon(request, env, url, route, method);
  if (route === "solicitud" && method === "POST") return publicSolicitud(request, env, url);
  if (route === "seguimiento" && method === "GET") return publicSeguimiento(request, env, url);
  if (route === "diagnostico/ia" && method === "POST") return diagnosticoIA(request, env, url);
  if (route === "certificado" && method === "GET") return publicCertificate(env, url);
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
    const lkey = `panel:${clientIp(request)}`;
    if (await rlCount(env, lkey, 15 * 60) >= 5) {
      return json({ error: "Demasiados intentos fallidos. Por seguridad, espera 15 minutos antes de volver a intentar." }, 429);
    }
    const body = await readJson(request);
    const ok = await safeEqual(String(body.password || ""), String(env.PANEL_PASSWORD));
    if (!ok) {
      await rlHit(env, lkey);
      await sleep(700);
      return json({ error: "Contraseña incorrecta." }, 401);
    }
    await rlClear(env, lkey);
    const cookie = await makeSession(env, url);
    return json({ ok: true }, 200, { "Set-Cookie": cookie });
  }

  if (route === "logout" && method === "POST") {
    return json({ ok: true }, 200, { "Set-Cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict` });
  }

  // A partir de aquí todo requiere sesión iniciada.
  const session = await readSession(request, env);
  if (!session) return json({ error: "Tu sesión terminó. Vuelve a entrar con tu contraseña.", login: true }, 401);

  // Estadísticas, certificados y progreso de alumnos (base de datos, no necesitan GitHub).
  if (route === "estadisticas" || route === "estadisticas/csv" || route === "certificados" || route === "alumnos/progreso" || route === "alumnos/tiempo" || route === "alumnos/inscripcion" || route === "solicitudes" || route === "reparaciones" || route === "resumen") {
    return handlePanelDb(request, env, url, route, method);
  }
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
    // Lista los elementos de una colección (blog o cursos del aula) con sus datos (para la tabla).
    const dir = url.searchParams.get("carpeta") || "content/blog";
    if (!COLLECTIONS.includes(dir)) return json({ error: "Carpeta no permitida." }, 403);
    const list = await gh(env, `contents/${encodePath(dir)}?ref=${encodeURIComponent(branch(env))}`, {}, true);
    const files = Array.isArray(list) ? list.filter((x) => x.type === "file" && x.name.endsWith(".json")) : [];
    const items = await Promise.all(files.map(async (f) => {
      try {
        const file = await ghGetFile(env, f.path);
        let datos = JSON.parse(file.text);
        if (dir === "content/aula-cursos" && datos && typeof datos === "object") {
          // Para la tabla basta un resumen (los cursos completos pesan mucho).
          const mods = Array.isArray(datos.modulos) ? datos.modulos : [];
          datos = { titulo: datos.titulo, orden: datos.orden, nivel: datos.nivel, horas: datos.horas, publicado: datos.publicado,
            modulos: mods.map((m) => ({ lecciones: (m && Array.isArray(m.lecciones) ? m.lecciones : []).map(() => 0) })) };
        }
        return { ruta: f.path, sha: file.sha, datos };
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
// cursos: { id: { t: título, h: horas, l: [lecciones], q: [cuestionarios], x: [exámenes finales], c: entrega certificado } }
const AULA_COURSE_DATA = (AULA && AULA.cursos && !Array.isArray(AULA.cursos)) ? AULA.cursos : {};
const AULA_COURSES = Array.isArray(AULA && AULA.cursos) ? AULA.cursos : Object.keys(AULA_COURSE_DATA);
const AULA_MIN = Number(AULA && AULA.m) || 70;
const LESSON_COURSE = {};
for (const [cid, c] of Object.entries(AULA_COURSE_DATA)) for (const k of c.l || []) LESSON_COURSE[k] = cid;

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
  // Cursos que el alumno eligió por su cuenta (inscripción libre, guardados en la base de datos)
  const elegidos = await aulaElegidos(env, usuario);
  if (elegidos.length) {
    const c = Array.isArray(user.c) ? user.c : [];
    return { usuario, user: { ...user, c: [...new Set([...c, ...elegidos])], e: elegidos } };
  }
  return { usuario, user };
}

async function aulaElegidos(env, usuario) {
  if (!env.DB) return [];
  try {
    await ensureSchema(env);
    const rows = (await env.DB.prepare("SELECT curso FROM inscripciones WHERE usuario = ?").bind(usuario).all()).results || [];
    return rows.map((r) => r.curso).filter((cid) => AULA_COURSES.includes(cid));
  } catch { return []; }
}

function aulaLibre(cid) {
  const c = AULA_COURSE_DATA[cid];
  return Boolean(c && c.i === true);
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
    const akey = `aula:${clientIp(request)}`;
    if (await rlCount(env, akey, 15 * 60) >= 8) {
      return json({ error: "Demasiados intentos fallidos. Espera 15 minutos y vuelve a intentar, o pide ayuda por WhatsApp." }, 429);
    }
    const user = usuario && Object.prototype.hasOwnProperty.call(AULA_USERS, usuario) ? AULA_USERS[usuario] : null;
    const ok = user ? await safeEqual(await sha256Hex(`${user.s}:${password}`), user.h) : false;
    if (!ok) {
      await rlHit(env, akey);
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
    return json({ usuario: s.usuario, nombre: s.user.n, cursos: s.user.c, elegidos: s.user.e || [], vence: s.user.v || "", servidor: Boolean(env.DB),
      libres: env.DB ? AULA_COURSES.filter((cid) => aulaLibre(cid) && !aulaHasCourse(s.user, cid)) : [] });
  }

  // Lo que sigue necesita sesión de alumno y la base de datos.
  const s = await aulaSession(request, env);
  if (!s) return json({ error: "Inicia sesión para entrar al aula." }, 401);

  // Cuestionarios y exámenes: los revisa el servidor (las respuestas correctas no están en la página).
  if (route === "aula/quiz" && method === "POST") {
    const body = await readJson(request);
    const key = String(body.leccion || "");
    const cid = LESSON_COURSE[key];
    if (!cid || !aulaHasCourse(s.user, cid)) return json({ error: "No tienes acceso a ese cuestionario." }, 403);
    const c = AULA_COURSE_DATA[cid];
    const clave = (c.r || {})[key];
    if (!Array.isArray(clave) || !clave.length) return json({ error: "Este cuestionario no tiene preguntas." }, 404);
    const esExamen = (c.x || []).includes(key);
    const rk = `examen:${s.usuario}:${key}`;
    if (esExamen && await rlCount(env, rk, 3600) >= 5) {
      return json({ error: "Ya hiciste 5 intentos del examen en la última hora. Repasa las lecciones y vuelve a intentarlo más tarde." }, 429);
    }
    const resp = body.respuestas && typeof body.respuestas === "object" ? body.respuestas : {};
    let ok = 0;
    const detalle = clave.map(([right, exp], i) => {
      const pick = Math.round(Number(resp[i])) || null;
      const bien = pick === right;
      if (bien) ok++;
      return { bien, elegida: pick, correcta: right, explicacion: exp || "" };
    });
    const faltan = detalle.filter((d) => !d.elegida).length;
    if (faltan) return json({ error: faltan === 1 ? "Te falta responder 1 pregunta." : `Te faltan ${faltan} preguntas por responder.`, faltan }, 400);
    if (esExamen) await rlHit(env, rk);
    const pct = Math.round((ok * 100) / clave.length);
    const pass = pct >= AULA_MIN;
    // En el examen final, si no aprueba solo se dice cuáles falló (sin revelar la respuesta correcta).
    const out = esExamen && !pass ? detalle.map((d) => ({ bien: d.bien, elegida: d.elegida })) : detalle;
    let guardado = false;
    if (pass && env.DB) {
      await ensureSchema(env);
      await env.DB.prepare(
        "INSERT INTO progreso (usuario, leccion, ts, nota) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(usuario, leccion) DO UPDATE SET nota = CASE WHEN progreso.nota IS NULL OR excluded.nota > progreso.nota THEN excluded.nota ELSE progreso.nota END"
      ).bind(s.usuario, key, Date.now(), pct).run();
      guardado = true;
    }
    return json({ pct, ok, total: clave.length, pass, min: AULA_MIN, examen: esExamen, detalle: out, guardado });
  }

  if (!env.DB) return json({ error: "La base de datos del aula todavía no está conectada.", sinBase: true }, 503);
  await ensureSchema(env);

  if (route === "aula/inscribir" && method === "POST") {
    const body = await readJson(request);
    const cid = String(body.curso || "");
    if (!AULA_COURSES.includes(cid)) return json({ error: "Ese curso no existe." }, 404);
    if (aulaHasCourse(s.user, cid)) return json({ ok: true, ya: true });
    if (!aulaLibre(cid)) return json({ error: "Este curso no tiene inscripción libre. Escríbenos y te lo activamos." }, 403);
    if ((s.user.e || []).length >= 20) return json({ error: "Llegaste al máximo de cursos elegidos. Escríbenos si necesitas más." }, 400);
    await env.DB.prepare("INSERT OR IGNORE INTO inscripciones (usuario, curso, ts) VALUES (?, ?, ?)").bind(s.usuario, cid, Date.now()).run();
    return json({ ok: true, curso: cid });
  }

  if (route === "aula/progreso" && method === "GET") {
    const rows = (await env.DB.prepare("SELECT leccion, ts, nota FROM progreso WHERE usuario = ?").bind(s.usuario).all()).results || [];
    const hechas = {}, notas = {};
    for (const r of rows) { if (r.ts) hechas[r.leccion] = r.ts; if (r.nota != null) notas[r.leccion] = r.nota; }
    return json({ hechas, notas });
  }

  if (route === "aula/progreso" && method === "POST") {
    const body = await readJson(request);
    const items = Array.isArray(body.items) ? body.items.slice(0, 400) : [];
    const stmts = [];
    for (const it of items) {
      const key = String(it.leccion || "");
      const cid = LESSON_COURSE[key];
      if (!cid || !aulaHasCourse(s.user, cid)) continue;
      const c = AULA_COURSE_DATA[cid];
      const isQuiz = (c.q || []).includes(key);
      const nota = it.nota == null ? null : Math.max(0, Math.min(100, Math.round(Number(it.nota) || 0)));
      if (it.hecho === false) {
        if (!isQuiz) stmts.push(env.DB.prepare("DELETE FROM progreso WHERE usuario = ? AND leccion = ?").bind(s.usuario, key));
        continue;
      }
      if (isQuiz) continue; // los cuestionarios solo se registran cuando los revisa el servidor (aula/quiz)
      const ts = Math.min(Number(it.ts) || Date.now(), Date.now());
      stmts.push(env.DB.prepare(
        "INSERT INTO progreso (usuario, leccion, ts, nota) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(usuario, leccion) DO UPDATE SET nota = CASE WHEN excluded.nota IS NULL THEN progreso.nota " +
        "WHEN progreso.nota IS NULL OR excluded.nota > progreso.nota THEN excluded.nota ELSE progreso.nota END"
      ).bind(s.usuario, key, ts, nota));
    }
    if (stmts.length) await env.DB.batch(stmts);
    return json({ ok: true, guardados: stmts.length });
  }

  // Tiempo real por lección: el navegador manda latidos con los segundos vistos.
  if (route === "aula/tiempo" && method === "POST") {
    const body = await readJson(request);
    const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
    const stmts = [];
    for (const it of items) {
      const key = String(it.leccion || "");
      const cid = LESSON_COURSE[key];
      if (!cid || !aulaHasCourse(s.user, cid)) continue;
      const seg = Math.max(0, Math.min(960, Math.round(Number(it.segundos) || 0))); // tope anti-basura: 16 min por latido
      if (!seg) continue;
      stmts.push(env.DB.prepare(
        "INSERT INTO tiempo (usuario, leccion, segundos, actualizado) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(usuario, leccion) DO UPDATE SET segundos = tiempo.segundos + excluded.segundos, actualizado = excluded.actualizado"
      ).bind(s.usuario, key, seg, Date.now()));
    }
    if (stmts.length) await env.DB.batch(stmts);
    return json({ ok: true, guardados: stmts.length });
  }

  if (route === "aula/certificados" && method === "GET") {
    const rows = (await env.DB.prepare("SELECT id, curso, curso_titulo, nombre, estado, motivo, solicitado, emitido FROM certificados WHERE usuario = ? ORDER BY solicitado DESC").bind(s.usuario).all()).results || [];
    return json({ items: rows });
  }

  if (route === "aula/certificados" && method === "POST") {
    const body = await readJson(request);
    const cid = String(body.curso || "");
    const c = AULA_COURSE_DATA[cid];
    if (!c || !aulaHasCourse(s.user, cid)) return json({ error: "No tienes acceso a ese curso." }, 403);
    if (c.c === false) return json({ error: "Este curso no entrega certificado." }, 400);
    const prev = await env.DB.prepare("SELECT id, estado FROM certificados WHERE usuario = ? AND curso = ? AND estado IN ('solicitado','aprobado') LIMIT 1").bind(s.usuario, cid).first();
    if (prev) return json({ ok: true, id: prev.id, estado: prev.estado });
    const st = await courseStatus(env, s.usuario, cid);
    if (st.faltanSinExamen > 0) return json({ error: `Te faltan ${st.faltanSinExamen} lección(es) por completar.` }, 400);
    if (st.examenPendiente) return json({ error: "Primero aprueba el examen final del curso." }, 400);
    if (st.faltan > 0) return json({ error: `Te faltan ${st.faltan} lección(es) por completar.` }, 400);
    const nombre = cleanName(body.nombre) || s.user.n;
    const id = certId();
    await env.DB.prepare("INSERT INTO certificados (id, usuario, nombre, curso, curso_titulo, horas, nota, estado, origen, solicitado) VALUES (?, ?, ?, ?, ?, ?, ?, 'solicitado', 'aula', ?)")
      .bind(id, s.usuario, nombre, cid, c.t, String(c.h || ""), st.nota, Date.now()).run();
    return json({ ok: true, id, estado: "solicitado" });
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

/* ───────────────────────── Base de datos (D1) ───────────────────────── */

let schemaReady = null;
function ensureSchema(env) {
  if (!schemaReady) {
    schemaReady = env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS visitas (id INTEGER PRIMARY KEY AUTOINCREMENT, pid TEXT UNIQUE, ts INTEGER NOT NULL, vid TEXT, sid TEXT, ruta TEXT, titulo TEXT, ref TEXT, pais TEXT, region TEXT, ciudad TEXT, lat REAL, lon REAL, ip TEXT, dispositivo TEXT, so TEXT, navegador TEXT, pantalla TEXT, idioma TEXT, duracion INTEGER DEFAULT 0, usuario TEXT)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS visitas_ts ON visitas(ts)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS visitas_sid ON visitas(sid)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS secciones (pid TEXT NOT NULL, seccion TEXT NOT NULL, ts INTEGER NOT NULL, segundos INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (pid, seccion))"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS secciones_ts ON secciones(ts)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS progreso (usuario TEXT NOT NULL, leccion TEXT NOT NULL, ts INTEGER NOT NULL, nota INTEGER, PRIMARY KEY (usuario, leccion))"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS tiempo (usuario TEXT NOT NULL, leccion TEXT NOT NULL, segundos INTEGER NOT NULL DEFAULT 0, actualizado INTEGER, PRIMARY KEY (usuario, leccion))"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS certificados (id TEXT PRIMARY KEY, usuario TEXT, nombre TEXT NOT NULL, curso TEXT, curso_titulo TEXT NOT NULL, horas TEXT, nota INTEGER, estado TEXT NOT NULL, origen TEXT, motivo TEXT, solicitado INTEGER, emitido INTEGER, fecha TEXT)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS cert_usuario ON certificados(usuario, curso)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS eventos (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, pid TEXT, vid TEXT, tipo TEXT NOT NULL, etiqueta TEXT, ruta TEXT, seccion TEXT)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS eventos_ts ON eventos(ts)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS solicitudes (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, tipo TEXT, nombre TEXT, telefono TEXT, correo TEXT, servicio TEXT, mensaje TEXT, datos TEXT, pagina TEXT, ip TEXT, pais TEXT, ciudad TEXT, vid TEXT, estado TEXT NOT NULL DEFAULT 'nuevo', nota TEXT, actualizado INTEGER)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS solicitudes_ts ON solicitudes(ts)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS ordenes (codigo TEXT PRIMARY KEY, clave TEXT, cliente TEXT, telefono TEXT, equipo TEXT, problema TEXT, estado TEXT NOT NULL, nota_publica TEXT, notas_internas TEXT, presupuesto TEXT, entrega TEXT, historial TEXT, creado INTEGER, actualizado INTEGER)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS intentos (clave TEXT NOT NULL, ts INTEGER NOT NULL)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS intentos_clave ON intentos(clave, ts)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS ia_uso (dia TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS inscripciones (usuario TEXT NOT NULL, curso TEXT NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (usuario, curso))"),
    ]).catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

function certId() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(8));
  const c = [...b].map((x) => abc[x % abc.length]).join("");
  return `TR-${c.slice(0, 4)}-${c.slice(4)}`;
}

function cleanName(v) {
  return String(v || "").replace(/<[^>]*>/g, "").replace(/[<>\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 90);
}

async function courseStatus(env, usuario, cid) {
  const c = AULA_COURSE_DATA[cid] || { l: [], q: [], x: [] };
  const rows = (await env.DB.prepare("SELECT leccion, ts, nota FROM progreso WHERE usuario = ?").bind(usuario).all()).results || [];
  const map = new Map(rows.map((r) => [r.leccion, r]));
  const hechas = (c.l || []).filter((k) => map.has(k)).length;
  const exams = c.x && c.x.length ? c.x : [];
  const faltanSinExamen = (c.l || []).filter((k) => !map.has(k) && !exams.includes(k)).length;
  const examenPendiente = exams.some((k) => !map.has(k));
  const notas = (exams.length ? exams : c.q || []).map((k) => map.get(k)).filter((r) => r && r.nota != null).map((r) => r.nota);
  const nota = notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : null;
  const last = rows.filter((r) => LESSON_COURSE[r.leccion] === cid).reduce((m, r) => Math.max(m, r.ts || 0), 0);
  return { total: (c.l || []).length, hechas, faltan: (c.l || []).length - hechas, faltanSinExamen, examenPendiente, nota, ultima: last || null };
}

async function publicCertificate(env, url) {
  const id = String(url.searchParams.get("c") || "").toUpperCase().trim();
  if (!/^TR-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id)) return json({ error: "Código no válido." }, 400);
  if (!env.DB) return json({ error: "Servicio no disponible." }, 503);
  await ensureSchema(env);
  const r = await env.DB.prepare("SELECT id, nombre, curso_titulo, horas, estado, emitido, fecha FROM certificados WHERE id = ?").bind(id).first();
  if (!r || (r.estado !== "aprobado" && r.estado !== "revocado")) return json({ error: "No encontramos un certificado con ese código." }, 404);
  if (r.estado === "revocado") return json({ id: r.id, revocado: true });
  return json({ id: r.id, nombre: r.nombre, curso: r.curso_titulo, horas: r.horas || "", fecha: r.fecha || "", emitido: r.emitido });
}

/* ───────────── Estadísticas de visitas ───────────── */

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|monitor|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch|go-http/i;

function parseUA(ua) {
  ua = ua || "";
  let dispositivo = "Computadora";
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) dispositivo = "Tablet";
  else if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) dispositivo = "Celular";
  let so = "Otro", m;
  if ((m = ua.match(/Android (\d+)/))) so = `Android ${m[1]}`;
  else if ((m = ua.match(/(?:iPhone|CPU) OS (\d+)/))) so = `iOS ${m[1]}`;
  else if (/iPad/.test(ua)) so = "iPadOS";
  else if (/Windows NT 10/.test(ua)) so = "Windows 10/11";
  else if (/Windows NT 6\.[23]/.test(ua)) so = "Windows 8";
  else if (/Windows NT 6\.1/.test(ua)) so = "Windows 7";
  else if (/Windows/.test(ua)) so = "Windows";
  else if (/CrOS/.test(ua)) so = "ChromeOS";
  else if (/Mac OS X/.test(ua)) so = "macOS";
  else if (/Linux/.test(ua)) so = "Linux";
  let navegador = "Otro";
  if (/FBAN|FBAV|FB_IAB/.test(ua)) navegador = "Facebook (app)";
  else if (/Instagram/.test(ua)) navegador = "Instagram (app)";
  else if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) navegador = "TikTok (app)";
  else if (/WhatsApp/i.test(ua)) navegador = "WhatsApp";
  else if (/Edg(e|A|iOS)?\//.test(ua)) navegador = "Edge";
  else if (/OPR\/|Opera/.test(ua)) navegador = "Opera";
  else if (/SamsungBrowser/.test(ua)) navegador = "Samsung Internet";
  else if (/Firefox|FxiOS/.test(ua)) navegador = "Firefox";
  else if (/Chrome|CriOS/.test(ua)) navegador = "Chrome";
  else if (/Safari/.test(ua)) navegador = "Safari";
  return { dispositivo, so, navegador };
}

const clip = (v, n) => String(v == null ? "" : v).slice(0, n);

async function handleBeacon(request, env, url, route, method) {
  const ok = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (method !== "POST" || !env.DB) return ok();
  const ua = request.headers.get("user-agent") || "";
  if (BOT_RE.test(ua)) return ok();
  let d;
  try { d = JSON.parse((await request.text()).slice(0, 4000)); } catch { return ok(); }
  if (!d || !/^[a-z0-9-]{8,40}$/i.test(String(d.pid || ""))) return ok();
  try {
    await ensureSchema(env);
    if (route === "v/e") {
      const tipo = String(d.e || "");
      if (!EVENT_TYPES.has(tipo)) return ok();
      const ruta = clip(d.r, 300).replace(/\/index\.html$/, "/").replace(/\.html$/, "");
      await env.DB.prepare("INSERT INTO eventos (ts, pid, vid, tipo, etiqueta, ruta, seccion) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(Date.now(), clip(d.pid, 40), clip(d.vid, 40), tipo, clip(cleanName(d.k), 80), ruta, clip(cleanName(d.s), 60)).run();
      return ok();
    }
    if (route === "v/fin") {
      const dur = Math.max(0, Math.min(4 * 3600, Math.round(Number(d.d) || 0)));
      const visit = await env.DB.prepare("SELECT ts FROM visitas WHERE pid = ? AND ts > ?").bind(d.pid, Date.now() - 6 * 3600 * 1000).first();
      if (!visit) return ok();
      const stmts = [env.DB.prepare("UPDATE visitas SET duracion = MAX(duracion, ?) WHERE pid = ?").bind(dur, d.pid)];
      if (d.s && typeof d.s === "object" && !Array.isArray(d.s)) {
        for (const [k, v] of Object.entries(d.s).slice(0, 30)) {
          const name = clip(String(k).replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim(), 60);
          const secs = Math.max(0, Math.min(dur || 4 * 3600, Math.round(Number(v) || 0)));
          if (name && secs > 0) {
            stmts.push(env.DB.prepare("INSERT INTO secciones (pid, seccion, ts, segundos) VALUES (?, ?, ?, ?) ON CONFLICT(pid, seccion) DO UPDATE SET segundos = MAX(segundos, excluded.segundos)").bind(d.pid, name, visit.ts, secs));
          }
        }
      }
      await env.DB.batch(stmts);
      return ok();
    }
    // Rutas limpias: /cotizador.html → /cotizador · /aula/index.html → /aula/
    const ruta = clip(d.r, 300).replace(/\/index\.html$/, "/").replace(/\.html$/, "");
    if (!ruta.startsWith("/") || ruta.startsWith("/panel") || ruta.startsWith("/admin")) return ok();
    const cf = request.cf || {};
    let ref = clip(d.f, 300);
    try { const rh = new URL(ref).hostname; ref = rh === url.hostname ? "" : rh.replace(/^www\./, ""); } catch { ref = ""; }
    const { dispositivo, so, navegador } = parseUA(ua);
    let usuario = null;
    if (ruta.startsWith("/aula")) { const s = await aulaSession(request, env); if (s) usuario = s.usuario; }
    await env.DB.prepare(
      "INSERT OR IGNORE INTO visitas (pid, ts, vid, sid, ruta, titulo, ref, pais, region, ciudad, lat, lon, ip, dispositivo, so, navegador, pantalla, idioma, usuario) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(d.pid, Date.now(), clip(d.vid, 40), clip(d.sid, 40), ruta, clip(d.t, 160), ref,
      clip(cf.country, 2), clip(cf.region, 80), clip(cf.city, 80),
      cf.latitude != null ? Number(cf.latitude) : null, cf.longitude != null ? Number(cf.longitude) : null,
      clip(request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "", 64),
      dispositivo, so, navegador, clip(d.s, 20), clip(d.l, 12), usuario).run();
    if (Math.random() < 0.01) {
      const limite = Date.now() - 400 * 86400 * 1000;
      await env.DB.batch([env.DB.prepare("DELETE FROM visitas WHERE ts < ?").bind(limite), env.DB.prepare("DELETE FROM secciones WHERE ts < ?").bind(limite)]);
    }
  } catch { /* las estadísticas nunca deben romper el sitio */ }
  return ok();
}

/* ───────────── Panel: estadísticas, certificados, progreso ───────────── */

async function handlePanelDb(request, env, url, route, method) {
  if (!env.DB) return json({ error: "La base de datos todavía no está conectada. Pega su ID en Panel → Configuración general → «ID de la base de datos».", sinBase: true }, 503);
  await ensureSchema(env);
  const DB = env.DB;

  if (route === "estadisticas" || route === "estadisticas/csv") {
    const dias = Math.max(1, Math.min(400, Number(url.searchParams.get("dias")) || 30));
    // Los días se cuentan en hora de Guatemala (UTC-6).
    const tz = -6 * 3600 * 1000;
    const hoy0 = Math.floor((Date.now() + tz) / 86400000) * 86400000 - tz;
    const desde = hoy0 - (dias - 1) * 86400000;
    if (route === "estadisticas/csv") {
      const rows = (await DB.prepare("SELECT ts, ruta, titulo, pais, region, ciudad, ip, dispositivo, so, navegador, pantalla, idioma, duracion, ref, usuario, vid, (SELECT GROUP_CONCAT(seccion || ' ' || segundos || 's', '; ') FROM secciones s WHERE s.pid = visitas.pid) AS secciones FROM visitas WHERE ts >= ? ORDER BY ts DESC LIMIT 20000").bind(desde).all()).results || [];
      const head = ["fecha_hora_gt", "pagina", "titulo", "secciones_vistas", "segundos", "pais", "region", "ciudad", "ip", "dispositivo", "sistema", "navegador", "pantalla", "idioma", "llego_desde", "visitante", "alumno"];
      const esc = (v) => { const t = String(v == null ? "" : v); return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
      const fmt = (ts) => new Date(ts + tz).toISOString().replace("T", " ").slice(0, 19);
      const lines = [head.join(",")].concat(rows.map((r) => [fmt(r.ts), r.ruta, r.titulo, r.secciones, r.duracion, r.pais, r.region, r.ciudad, r.ip, r.dispositivo, r.so, r.navegador, r.pantalla, r.idioma, r.ref || "directo", (r.vid || "").slice(0, 8), r.usuario].map(esc).join(",")));
      return new Response("\ufeff" + lines.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="visitas-techrevive-${dias}dias.csv"`, "Cache-Control": "no-store" } });
    }
    const q = (sql, ...b) => DB.prepare(sql).bind(...b);
    const W = "FROM visitas WHERE ts >= ?";
    const res = await DB.batch([
      q(`SELECT COUNT(*) AS visitas, COUNT(DISTINCT vid) AS visitantes, COUNT(DISTINCT sid) AS sesiones, COALESCE(SUM(duracion),0) AS tiempo, COUNT(DISTINCT pais) AS paises, COUNT(DISTINCT usuario) AS alumnos, COUNT(DISTINCT ruta) AS paginas ${W}`, desde),
      q(`SELECT CAST((ts + ${tz}) / 86400000 AS INTEGER) AS d, COUNT(*) AS visitas, COUNT(DISTINCT vid) AS visitantes ${W} GROUP BY d ORDER BY d`, desde),
      q(`SELECT ruta, MAX(titulo) AS titulo, COUNT(*) AS visitas, COUNT(DISTINCT vid) AS visitantes, CAST(AVG(duracion) AS INTEGER) AS prom ${W} GROUP BY ruta ORDER BY visitas DESC LIMIT 30`, desde),
      q(`SELECT pais, COUNT(*) AS visitas, COUNT(DISTINCT vid) AS visitantes ${W} GROUP BY pais ORDER BY visitas DESC LIMIT 30`, desde),
      q(`SELECT ciudad, region, pais, COUNT(*) AS visitas ${W} GROUP BY ciudad, region, pais ORDER BY visitas DESC LIMIT 30`, desde),
      q(`SELECT dispositivo AS k, COUNT(*) AS n ${W} GROUP BY k ORDER BY n DESC`, desde),
      q(`SELECT navegador AS k, COUNT(*) AS n ${W} GROUP BY k ORDER BY n DESC LIMIT 12`, desde),
      q(`SELECT so AS k, COUNT(*) AS n ${W} GROUP BY k ORDER BY n DESC LIMIT 12`, desde),
      q(`SELECT COALESCE(ref, '') AS k, COUNT(*) AS n ${W} GROUP BY k ORDER BY n DESC LIMIT 15`, desde),
      q(`SELECT ROUND(lat, 1) AS lat, ROUND(lon, 1) AS lon, MAX(ciudad) AS ciudad, MAX(region) AS region, MAX(pais) AS pais, COUNT(*) AS n, COUNT(DISTINCT vid) AS p ${W} AND lat IS NOT NULL GROUP BY ROUND(lat, 1), ROUND(lon, 1) ORDER BY n DESC LIMIT 300`, desde),
      q(`SELECT CAST(((ts + ${tz}) % 86400000) / 3600000 AS INTEGER) AS h, COUNT(*) AS n ${W} GROUP BY h`, desde),
      q(`SELECT pid, ts, ruta, titulo, pais, region, ciudad, ip, dispositivo, so, navegador, pantalla, duracion, ref, usuario, vid, (SELECT MIN(v2.ts) FROM visitas v2 WHERE v2.sid = visitas.sid AND visitas.sid <> '') AS inicio ${W} ORDER BY ts DESC LIMIT 300`, desde),
      q(`SELECT SUM(CASE WHEN ts >= ? THEN 1 ELSE 0 END) AS hoy, SUM(CASE WHEN ts >= ? THEN 1 ELSE 0 END) AS semana, COUNT(*) AS total, COUNT(DISTINCT vid) AS visitantes, MIN(ts) AS primera FROM visitas`, hoy0, hoy0 - 6 * 86400000),
      q(`SELECT v.ruta AS ruta, MAX(v.titulo) AS titulo, s.seccion AS seccion, SUM(s.segundos) AS tiempo, COUNT(*) AS veces FROM secciones s JOIN visitas v ON v.pid = s.pid WHERE v.ts >= ? GROUP BY v.ruta, s.seccion ORDER BY tiempo DESC LIMIT 40`, desde),
      q(`SELECT pid, seccion, segundos FROM secciones WHERE pid IN (SELECT pid FROM visitas WHERE ts >= ? ORDER BY ts DESC LIMIT 300) ORDER BY segundos DESC`, desde),
      q(`SELECT tipo AS k, COUNT(*) AS n, COUNT(DISTINCT vid) AS p FROM eventos WHERE ts >= ? GROUP BY tipo ORDER BY n DESC`, desde),
      q(`SELECT tipo, ruta, seccion, etiqueta, COUNT(*) AS n FROM eventos WHERE ts >= ? GROUP BY tipo, ruta, seccion, etiqueta ORDER BY n DESC LIMIT 30`, desde),
      q(`SELECT tipo, COUNT(*) AS n FROM solicitudes WHERE ts >= ? GROUP BY tipo`, desde),
    ]);
    const r = (i) => res[i].results || [];
    const tot = r(0)[0] || {};
    const T = r(12)[0] || {};
    const porPid = {};
    for (const x of r(14)) (porPid[x.pid] = porPid[x.pid] || []).push({ s: x.seccion, t: x.segundos });
    const detalle = r(11).map((x) => { const o = { ...x, secciones: porPid[x.pid] || [] }; delete o.pid; return o; });
    return json({
      dias, desde,
      resumen: { visitas: tot.visitas || 0, visitantes: tot.visitantes || 0, sesiones: tot.sesiones || 0, tiempo: tot.tiempo || 0, paises: tot.paises || 0, alumnos: tot.alumnos || 0, paginas: tot.paginas || 0 },
      totales: { hoy: T.hoy || 0, semana: T.semana || 0, total: T.total || 0, visitantes: T.visitantes || 0, primera: T.primera || null },
      secciones: r(13),
      porDia: r(1).map((x) => ({ fecha: new Date(x.d * 86400000).toISOString().slice(0, 10), visitas: x.visitas, visitantes: x.visitantes })),
      paginas: r(2), paises: r(3), ciudades: r(4), dispositivos: r(5), navegadores: r(6), sistemas: r(7), referentes: r(8), mapa: r(9), horas: r(10), detalle,
      conversiones: { porTipo: r(15), donde: r(16), solicitudes: r(17) },
    });
  }

  if (route === "resumen" && method === "GET") {
    const [a, b] = await DB.batch([
      DB.prepare("SELECT COUNT(*) AS n FROM solicitudes WHERE estado = 'nuevo'"),
      DB.prepare("SELECT COUNT(*) AS n FROM ordenes WHERE estado NOT IN ('entregado', 'cancelado')"),
    ]);
    return json({ solicitudesNuevas: (a.results[0] || {}).n || 0, reparacionesActivas: (b.results[0] || {}).n || 0 });
  }

  if (route === "solicitudes") {
    if (method === "GET") {
      const rows = (await DB.prepare("SELECT id, ts, tipo, nombre, telefono, correo, servicio, mensaje, datos, pagina, pais, ciudad, estado, nota, actualizado FROM solicitudes ORDER BY ts DESC LIMIT 500").all()).results || [];
      return json({ items: rows.map((x) => ({ ...x, datos: safeParse(x.datos) })) });
    }
    if (method === "PUT") {
      const b = await readJson(request);
      const estado = String(b.estado || "");
      if (!SOL_ESTADOS.includes(estado)) return json({ error: "Estado no válido." }, 400);
      await DB.prepare("UPDATE solicitudes SET estado = ?, nota = ?, actualizado = ? WHERE id = ?").bind(estado, clip(b.nota, 1000), Date.now(), Number(b.id) || 0).run();
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await DB.prepare("DELETE FROM solicitudes WHERE id = ?").bind(Number(url.searchParams.get("id")) || 0).run();
      return json({ ok: true });
    }
  }

  if (route === "reparaciones") {
    if (method === "GET") {
      const rows = (await DB.prepare("SELECT * FROM ordenes ORDER BY actualizado DESC LIMIT 500").all()).results || [];
      return json({ items: rows.map((x) => ({ ...x, historial: safeParse(x.historial) || [] })), estados: ORDEN_ESTADOS });
    }
    if (method === "POST") {
      const b = await readJson(request);
      const cliente = cleanName(b.cliente);
      if (!cliente) return json({ error: "Escribe el nombre del cliente." }, 400);
      const estado = ORDEN_ESTADOS.some((x) => x.id === b.estado) ? b.estado : "recibido";
      const tel = String(b.telefono || "").replace(/\D/g, "").slice(0, 15);
      let codigo = "";
      for (let i = 0; i < 6 && !codigo; i++) {
        const c = ordenCodigo();
        const ex = await DB.prepare("SELECT codigo FROM ordenes WHERE codigo = ?").bind(c).first();
        if (!ex) codigo = c;
      }
      const now = Date.now();
      const hist = [{ estado, nota: clip(b.nota_publica, 500), ts: now }];
      await DB.prepare("INSERT INTO ordenes (codigo, clave, cliente, telefono, equipo, problema, estado, nota_publica, notas_internas, presupuesto, entrega, historial, creado, actualizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(codigo, tel.slice(-4), cliente, tel, clip(b.equipo, 160), clip(b.problema, 1000), estado, clip(b.nota_publica, 500), clip(b.notas_internas, 2000), clip(b.presupuesto, 60), clip(b.entrega, 10), JSON.stringify(hist), now, now).run();
      return json({ ok: true, codigo });
    }
    if (method === "PUT") {
      const b = await readJson(request);
      const o = await DB.prepare("SELECT * FROM ordenes WHERE codigo = ?").bind(String(b.codigo || "")).first();
      if (!o) return json({ error: "No se encontró la orden." }, 404);
      const hist = safeParse(o.historial) || [];
      const estado = ORDEN_ESTADOS.some((x) => x.id === b.estado) ? b.estado : o.estado;
      const nota = clip(b.nota, 500);
      const now = Date.now();
      if (estado !== o.estado || nota) hist.push({ estado, nota, ts: now });
      const tel = b.telefono != null ? String(b.telefono).replace(/\D/g, "").slice(0, 15) : o.telefono;
      const pick = (k, n) => (b[k] != null ? clip(b[k], n) : o[k]);
      await DB.prepare("UPDATE ordenes SET clave = ?, cliente = ?, telefono = ?, equipo = ?, problema = ?, estado = ?, nota_publica = ?, notas_internas = ?, presupuesto = ?, entrega = ?, historial = ?, actualizado = ? WHERE codigo = ?")
        .bind((tel || "").slice(-4), b.cliente != null ? (cleanName(b.cliente) || o.cliente) : o.cliente, tel, pick("equipo", 160), pick("problema", 1000), estado, nota || o.nota_publica, pick("notas_internas", 2000), pick("presupuesto", 60), pick("entrega", 10), JSON.stringify(hist.slice(-60)), now, o.codigo).run();
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await DB.prepare("DELETE FROM ordenes WHERE codigo = ?").bind(String(url.searchParams.get("codigo") || "")).run();
      return json({ ok: true });
    }
  }

  if (route === "alumnos/inscripcion" && method === "DELETE") {
    await DB.prepare("DELETE FROM inscripciones WHERE usuario = ? AND curso = ?")
      .bind(String(url.searchParams.get("usuario") || ""), String(url.searchParams.get("curso") || "")).run();
    return json({ ok: true });
  }

  if (route === "alumnos/progreso" && method === "GET") {
    const rows = (await DB.prepare("SELECT usuario, leccion, ts, nota FROM progreso").all()).results || [];
    const byUser = {};
    for (const x of rows) (byUser[x.usuario] = byUser[x.usuario] || []).push(x);
    const certs = (await DB.prepare("SELECT usuario, curso, estado FROM certificados WHERE usuario IS NOT NULL").all()).results || [];
    const insc = (await DB.prepare("SELECT usuario, curso, ts FROM inscripciones").all()).results || [];
    const items = Object.entries(AULA_USERS).map(([u, info0]) => {
      const elegidos = insc.filter((z) => z.usuario === u && AULA_COURSES.includes(z.curso)).map((z) => z.curso);
      const info = elegidos.length ? { ...info0, c: [...new Set([...(info0.c || []), ...elegidos])] } : info0;
      const mine = byUser[u] || [];
      const done = new Set(mine.map((x) => x.leccion));
      const cursos = AULA_COURSES.filter((cid) => aulaHasCourse(info, cid)).map((cid) => {
        const c = AULA_COURSE_DATA[cid] || { l: [] };
        const h = (c.l || []).filter((k) => done.has(k)).length;
        const cert = certs.find((z) => z.usuario === u && z.curso === cid && z.estado !== "rechazado");
        const asignado = aulaHasCourse(info0, cid);
        return { id: cid, titulo: c.t || cid, hechas: h, total: (c.l || []).length, certificado: cert ? cert.estado : "", elegido: !asignado };
      });
      const ultima = mine.reduce((m, x) => Math.max(m, x.ts || 0), 0) || null;
      return { usuario: u, nombre: info.n, activo: info.a, vence: info.v || "", ultima, cursos };
    });
    return json({ items });
  }

  // Reporte de tiempo real por lección (segundos vistos vs. minutos estimados de la lección).
  if (route === "alumnos/tiempo" && method === "GET") {
    const rows = (await DB.prepare("SELECT usuario, leccion, segundos, actualizado FROM tiempo").all()).results || [];
    const byUser = {};
    for (const x of rows) (byUser[x.usuario] = byUser[x.usuario] || {})[x.leccion] = { seg: x.segundos || 0, act: x.actualizado || 0 };
    const insc = (await DB.prepare("SELECT usuario, curso FROM inscripciones").all()).results || [];
    const items = Object.entries(AULA_USERS).map(([u, info0]) => {
      const elegidos = insc.filter((z) => z.usuario === u && AULA_COURSES.includes(z.curso)).map((z) => z.curso);
      const info = elegidos.length ? { ...info0, c: [...new Set([...(info0.c || []), ...elegidos])] } : info0;
      const t = byUser[u] || {};
      const cursos = AULA_COURSES.filter((cid) => aulaHasCourse(info, cid)).map((cid) => {
        const c = AULA_COURSE_DATA[cid] || { l: [], m: {} };
        const lecciones = (c.l || []).map((k) => {
          const meta = (c.m || {})[k] || [k, 0, ""];
          const r = t[k];
          return { key: k, titulo: meta[0], minutos: meta[1], modulo: meta[2], segundos: r ? r.seg : 0, actualizado: r ? r.act : 0 };
        }).filter((x) => x.segundos > 0);
        return { id: cid, titulo: c.t || cid, lecciones };
      }).filter((c) => c.lecciones.length);
      return { usuario: u, nombre: info.n, cursos };
    }).filter((u) => u.cursos.length);
    return json({ items });
  }

  if (route === "certificados") {
    if (method === "GET") {
      const rows = (await DB.prepare("SELECT * FROM certificados ORDER BY COALESCE(emitido, solicitado) DESC LIMIT 1000").all()).results || [];
      for (const r of rows) {
        if (r.estado === "solicitado" && r.usuario && r.curso) r.progreso = await courseStatus(env, r.usuario, r.curso);
      }
      const cursos = AULA_COURSES.map((cid) => ({ id: cid, titulo: (AULA_COURSE_DATA[cid] || {}).t || cid, horas: (AULA_COURSE_DATA[cid] || {}).h || "" }));
      return json({ items: rows, cursos });
    }
    if (method === "POST") { // emisión manual (por ejemplo, cursos presenciales)
      const b = await readJson(request);
      const nombre = cleanName(b.nombre);
      const cursoTitulo = cleanName(b.curso_titulo || (AULA_COURSE_DATA[b.curso] || {}).t);
      if (!nombre || !cursoTitulo) return json({ error: "Escribe el nombre del participante y el curso." }, 400);
      const id = certId();
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(b.fecha || "")) ? b.fecha : todayGT();
      await DB.prepare("INSERT INTO certificados (id, usuario, nombre, curso, curso_titulo, horas, estado, origen, solicitado, emitido, fecha) VALUES (?, ?, ?, ?, ?, ?, 'aprobado', 'manual', ?, ?, ?)")
        .bind(id, b.usuario ? clip(b.usuario, 60) : null, nombre, b.curso ? clip(b.curso, 60) : null, cursoTitulo, clip(b.horas, 20), Date.now(), Date.now(), fecha).run();
      return json({ ok: true, id });
    }
    if (method === "PUT") {
      const b = await readJson(request);
      const r = await DB.prepare("SELECT * FROM certificados WHERE id = ?").bind(String(b.id || "")).first();
      if (!r) return json({ error: "No se encontró el certificado." }, 404);
      const nombre = cleanName(b.nombre) || r.nombre;
      const horas = b.horas != null ? clip(b.horas, 20) : r.horas;
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(b.fecha || "")) ? b.fecha : (r.fecha || todayGT());
      const accion = String(b.accion || "editar");
      const estado = { aprobar: "aprobado", rechazar: "rechazado", revocar: "revocado", restaurar: "aprobado", editar: r.estado }[accion] || r.estado;
      const emitido = estado === "aprobado" && !r.emitido ? Date.now() : r.emitido;
      await DB.prepare("UPDATE certificados SET nombre = ?, horas = ?, fecha = ?, estado = ?, motivo = ?, emitido = ? WHERE id = ?")
        .bind(nombre, horas, fecha, estado, clip(b.motivo, 300) || (accion === "editar" ? r.motivo : null), emitido, r.id).run();
      return json({ ok: true, estado });
    }
    if (method === "DELETE") {
      await DB.prepare("DELETE FROM certificados WHERE id = ?").bind(String(url.searchParams.get("id") || "")).run();
      return json({ ok: true });
    }
  }
  return json({ error: "Ruta no encontrada." }, 404);
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


/* ───────────── Seguridad, solicitudes, seguimiento y Doctor TechRevive ───────────── */

const SEC_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' https:; frame-src https://www.youtube-nocookie.com https://www.youtube.com https://www.google.com https://maps.google.com; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self' https:; frame-ancestors 'self'; upgrade-insecure-requests";

function withSec(resp, html = false) {
  if (!resp || resp.status === 101) return resp;
  const r = new Response(resp.body, resp);
  for (const [k, v] of Object.entries(SEC_HEADERS)) if (!r.headers.has(k)) r.headers.set(k, v);
  if (html && (r.headers.get("content-type") || "").includes("text/html") && !r.headers.has("Content-Security-Policy")) r.headers.set("Content-Security-Policy", CSP);
  return r;
}

function clientIp(request) {
  return (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "0").split(",")[0].trim().slice(0, 64);
}

function safeParse(t) { try { return t ? JSON.parse(t) : null; } catch { return null; } }

// Límite de intentos (contraseñas, formularios, IA). Usa la base de datos si existe;
// si no, una memoria temporal (menos estricta, pero mejor que nada).
const MEM_HITS = new Map();
async function rlCount(env, key, windowSec) {
  const since = Date.now() - windowSec * 1000;
  if (env.DB) {
    try {
      await ensureSchema(env);
      const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM intentos WHERE clave = ? AND ts > ?").bind(key, since).first();
      return (r && r.n) || 0;
    } catch { /* memoria */ }
  }
  return (MEM_HITS.get(key) || []).filter((t) => t > since).length;
}
async function rlHit(env, key) {
  const now = Date.now();
  if (env.DB) {
    try {
      await ensureSchema(env);
      await env.DB.prepare("INSERT INTO intentos (clave, ts) VALUES (?, ?)").bind(key, now).run();
      if (Math.random() < 0.05) await env.DB.prepare("DELETE FROM intentos WHERE ts < ?").bind(now - 2 * 86400000).run();
      return;
    } catch { /* memoria */ }
  }
  const arr = (MEM_HITS.get(key) || []).filter((t) => t > now - 86400000);
  arr.push(now); MEM_HITS.set(key, arr);
  if (MEM_HITS.size > 5000) MEM_HITS.clear();
}
async function rlClear(env, key) {
  MEM_HITS.delete(key);
  if (env.DB) { try { await env.DB.prepare("DELETE FROM intentos WHERE clave = ?").bind(key).run(); } catch { /* nada */ } }
}
async function rlTake(env, key, max, windowSec) {
  if (await rlCount(env, key, windowSec) >= max) return false;
  await rlHit(env, key);
  return true;
}

const EVENT_TYPES = new Set(["whatsapp", "llamada", "correo", "formulario", "cotizacion_wa", "cotizacion_pdf", "diagnostico", "diagnostico_ia", "seguimiento"]);
const SOL_ESTADOS = ["nuevo", "contactado", "cotizado", "ganado", "perdido", "archivado"];
const SOL_TIPOS = ["contacto", "inscripcion", "cotizacion", "diagnostico", "otro"];
const ORDEN_ESTADOS = [
  { id: "recibido", t: "Equipo recibido" },
  { id: "diagnostico", t: "En diagnóstico" },
  { id: "aprobacion", t: "Esperando tu aprobación" },
  { id: "repuesto", t: "Esperando repuesto" },
  { id: "reparacion", t: "En reparación" },
  { id: "pruebas", t: "Pruebas de calidad" },
  { id: "listo", t: "Listo para entregar" },
  { id: "entregado", t: "Entregado" },
  { id: "cancelado", t: "Cancelado" },
];

function ordenCodigo() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(5));
  return "OT-" + [...b].map((x) => abc[x % abc.length]).join("");
}

function sameOrigin(request, url) {
  const o = request.headers.get("origin");
  return !o || o === url.origin;
}

async function publicSolicitud(request, env, url) {
  if (!sameOrigin(request, url)) return json({ error: "Solicitud no permitida." }, 403);
  if (!env.DB) return json({ ok: false, sinBase: true });
  const b = await readJson(request);
  if (b._gotcha) return json({ ok: true });
  const ua = request.headers.get("user-agent") || "";
  if (BOT_RE.test(ua)) return json({ ok: true });
  if (!await rlTake(env, `sol:${clientIp(request)}`, 10, 3600)) return json({ error: "Recibimos varias solicitudes seguidas. Escríbenos por WhatsApp, por favor." }, 429);
  const nombre = cleanName(b.nombre);
  const telefono = clip(String(b.telefono || "").replace(/[^\d+ -]/g, ""), 30);
  const correo = clip(String(b.correo || "").trim(), 120);
  if (!nombre && !telefono && !correo) return json({ error: "Faltan tus datos de contacto." }, 400);
  const tipo = SOL_TIPOS.includes(b.tipo) ? b.tipo : "otro";
  let datos = b.datos && typeof b.datos === "object" ? JSON.stringify(b.datos) : "";
  if (datos.length > 6000) datos = datos.slice(0, 6000);
  const cf = request.cf || {};
  await ensureSchema(env);
  const r = await env.DB.prepare("INSERT INTO solicitudes (ts, tipo, nombre, telefono, correo, servicio, mensaje, datos, pagina, ip, pais, ciudad, vid, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuevo')")
    .bind(Date.now(), tipo, nombre, telefono, correo, clip(cleanName(b.servicio), 120), clip(String(b.mensaje || "").replace(/[<>]/g, ""), 3000), datos, clip(b.pagina, 200), clientIp(request), clip(cf.country, 2), clip(cf.city, 80), clip(b.vid, 40)).run();
  return json({ ok: true, id: r.meta && r.meta.last_row_id });
}

async function publicSeguimiento(request, env, url) {
  if (!env.DB) return json({ error: "El seguimiento en línea todavía no está activo. Escríbenos por WhatsApp con tu número de orden." }, 503);
  if (!await rlTake(env, `seg:${clientIp(request)}`, 30, 600)) return json({ error: "Demasiadas consultas seguidas. Espera unos minutos." }, 429);
  const codigo = String(url.searchParams.get("c") || "").toUpperCase().replace(/\s+/g, "").replace(/^OT(?!-)/, "OT-");
  const clave = String(url.searchParams.get("t") || "").replace(/\D/g, "");
  await ensureSchema(env);
  const o = /^OT-[A-Z0-9]{5}$/.test(codigo) ? await env.DB.prepare("SELECT * FROM ordenes WHERE codigo = ?").bind(codigo).first() : null;
  if (!o || (o.clave && o.clave !== clave)) {
    await sleep(400);
    return json({ error: "No encontramos esa orden. Revisa el código (ej. OT-7K2QD) y los últimos 4 dígitos del teléfono que dejaste al entregar tu equipo." }, 404);
  }
  const est = (id) => (ORDEN_ESTADOS.find((x) => x.id === id) || { t: id }).t;
  const hist = (safeParse(o.historial) || []).map((h) => ({ estado: h.estado, titulo: est(h.estado), nota: h.nota || "", ts: h.ts }));
  return json({
    codigo: o.codigo, nombre: String(o.cliente || "").split(" ")[0], equipo: o.equipo, estado: o.estado, titulo: est(o.estado),
    nota: o.nota_publica || "", presupuesto: o.presupuesto || "", entrega: o.entrega || "", creado: o.creado, actualizado: o.actualizado,
    historial: hist, estados: ORDEN_ESTADOS,
  });
}

const IA_MODELOS = ["@cf/meta/llama-3.1-8b-instruct-fp8-fast", "@cf/zai-org/glm-4.7-flash", "@cf/google/gemma-4-26b-a4b-it", "@cf/meta/llama-3.1-8b-instruct"];
const IA_DIARIO = 60;

async function diagnosticoIA(request, env, url) {
  if (!sameOrigin(request, url)) return json({ error: "Solicitud no permitida." }, 403);
  if (!env.AI) return json({ error: "El asistente con inteligencia artificial no está activado. Usa el diagnóstico guiado.", sinIA: true }, 503);
  const b = await readJson(request);
  const texto = String(b.texto || "").replace(/\s+/g, " ").trim().slice(0, 700);
  if (texto.length < 12) return json({ error: "Cuéntanos un poco más: qué equipo es y qué le pasa." }, 400);
  if (!await rlTake(env, `ia:${clientIp(request)}`, 6, 3600)) return json({ error: "Ya hiciste varias consultas. Usa el diagnóstico guiado o escríbenos por WhatsApp.", limite: true }, 429);
  const dia = new Date().toISOString().slice(0, 10);
  if (env.DB) {
    try {
      await ensureSchema(env);
      const u = await env.DB.prepare("SELECT n FROM ia_uso WHERE dia = ?").bind(dia).first();
      if (u && u.n >= IA_DIARIO) return json({ error: "El asistente alcanzó su límite de hoy. Usa el diagnóstico guiado: es igual de útil.", limite: true }, 429);
      await env.DB.prepare("INSERT INTO ia_uso (dia, n) VALUES (?, 1) ON CONFLICT(dia) DO UPDATE SET n = n + 1").bind(dia).run();
    } catch { /* sigue */ }
  }
  let catalogo = [];
  try {
    const r = await env.ASSETS.fetch(new Request(new URL("/data/servicios-ia.json", url).toString()));
    if (r.ok) catalogo = (await r.json()).servicios || [];
  } catch { /* sin catálogo */ }
  const lista = catalogo.map((c) => `- ${c.n}`).join("\n");
  const system = [
    "Eres «Doctor TechRevive», asistente de diagnóstico de una empresa de reparación de computadoras en Guatemala.",
    "Responde SIEMPRE en español neutro, claro y amable, para personas sin conocimientos técnicos.",
    "Analiza el problema descrito y responde SOLO con un objeto JSON válido, sin texto adicional, con esta forma exacta:",
    '{"resumen":"1-2 frases","causas":[{"causa":"texto corto","probabilidad":"alta|media|baja","explicacion":"1 frase"}],"servicios":["nombre EXACTO copiado del catálogo"],"urgencia":"baja|media|alta","consejos":["acción segura que la persona puede intentar"],"evitar":["lo que NO debe hacer"],"preguntas":["pregunta que el técnico haría"]}',
    "Máximo 3 causas, 3 servicios, 3 consejos, 2 cosas a evitar y 2 preguntas.",
    "Nunca sugieras abrir la fuente de poder, manipular baterías hinchadas ni nada peligroso. Si hay líquido, humo, olor a quemado o batería hinchada, la urgencia es alta y el primer consejo es desconectar el equipo.",
    "No inventes precios ni servicios fuera del catálogo. Si el problema no es de computadoras, dilo en el resumen y deja causas vacías.",
    "Catálogo de servicios:\n" + lista,
  ].join("\n");
  let raw = null, modelo = "";
  for (const m of IA_MODELOS) {
    try {
      const out = await env.AI.run(m, { messages: [{ role: "system", content: system }, { role: "user", content: `Equipo: ${clip(b.equipo, 40) || "no indicado"}. Problema: ${texto}` }], max_tokens: 700, temperature: 0.2 });
      raw = out && (out.response ?? (out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content));
      if (raw) { modelo = m; break; }
    } catch { /* siguiente modelo */ }
  }
  let data = raw && typeof raw === "object" ? raw : null;
  if (!data && typeof raw === "string") {
    const i = raw.indexOf("{"), j = raw.lastIndexOf("}");
    if (i >= 0 && j > i) data = safeParse(raw.slice(i, j + 1));
  }
  if (!data || typeof data !== "object") return json({ error: "El asistente no pudo responder ahora. Usa el diagnóstico guiado o escríbenos por WhatsApp." }, 502);
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const findSvc = (name) => {
    const n = norm(name);
    if (!n) return null;
    return catalogo.find((c) => norm(c.n) === n) || catalogo.find((c) => norm(c.n).includes(n) || n.includes(norm(c.n))) || null;
  };
  const arrS = (v, k, max) => (Array.isArray(v) ? v : []).slice(0, max).map((x) => clip(typeof x === "string" ? x : (x && x[k]) || "", 220)).filter(Boolean);
  const causas = (Array.isArray(data.causas) ? data.causas : []).slice(0, 3).map((c) => ({
    t: clip(typeof c === "string" ? c : c.causa, 120), p: ["alta", "media", "baja"].includes(c && c.probabilidad) ? c.probabilidad : "media", d: clip(c && c.explicacion, 220),
  })).filter((c) => c.t);
  const servicios = [];
  for (const s of (Array.isArray(data.servicios) ? data.servicios : []).slice(0, 4)) {
    const f = findSvc(s);
    if (f && !servicios.some((x) => x.n === f.n)) servicios.push(f);
  }
  return json({
    ia: true, modelo,
    resumen: clip(data.resumen, 400), causas, servicios,
    urgencia: ["baja", "media", "alta"].includes(data.urgencia) ? data.urgencia : "media",
    consejos: arrS(data.consejos, "t", 3), evitar: arrS(data.evitar, "t", 2), preguntas: arrS(data.preguntas, "t", 2),
  });
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
