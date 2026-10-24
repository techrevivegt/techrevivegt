# -*- coding: utf-8 -*-
"""
Aula virtual propia (/aula/).

- Lee content/aula.json (ajustes, avisos, certificado), content/aula-cursos/*.json (un archivo
  por curso, con módulos y lecciones) y content/alumnos.json (accesos).
- Genera _site/aula/: ingresar, tablero «Mis cursos», página de cada curso y de cada lección.
- Copia src/aula-archivos/ → _site/aula/archivos/ (materiales descargables).
- Escribe worker/aula-datos.js con los alumnos (contraseñas cifradas) para que el Worker
  controle quién entra. Ese archivo se genera en cada publicación: no se sube a GitHub.

Las páginas /aula/* solo se entregan si el alumno inició sesión (lo comprueba worker/index.js).
"""
import hashlib
import json
import os
import re
import secrets
import shutil
from urllib.parse import urlparse, parse_qs

from base import *  # noqa: F401,F403

A = load("aula.json", default={}) or {}
AL = load("alumnos.json", default={}) or {}
AULA_OUT = os.path.join(OUT, "aula")
TIPOS = {
    "video": ("play", "Video"),
    "lectura": ("book", "Lectura"),
    "cuestionario": ("clipboard", "Cuestionario"),
    "tarea": ("file", "Tarea"),
    "simulador": ("cpu", "Simulador"),
}
SIMULADORES = {"pc": "Armado de PC de escritorio", "laptop": "Mantenimiento de laptop", "taller3d": "Taller 3D: arma PC y laptops", "arduino": "Laboratorio 3D de Arduino y robótica"}


def habilitada():
    return isinstance(A, dict) and A.get("habilitada", True) is not False and bool(cursos())


# ------------------------------------------------------------------ Datos
_CURSOS = None


def cursos():
    """Cursos publicados con sus lecciones numeradas y direcciones listas."""
    global _CURSOS
    if _CURSOS is not None:
        return _CURSOS
    out, seen = [], set()
    for c in raw_cursos():
        if not isinstance(c, dict) or not c.get("titulo") or c.get("publicado", True) is False:
            continue
        cid = slugify(c.get("_file") or c.get("id") or c["titulo"])
        if cid in ("archivos", "ingresar", "index"):
            cid = "curso-" + cid
        while cid in seen:
            cid += "-2"
        seen.add(cid)
        mods, lessons, lseen = [], [], set()
        for mi, m in enumerate(arr(c.get("modulos"))):
            if not isinstance(m, dict):
                continue
            ls = []
            for l in arr(m.get("lecciones")):
                if not isinstance(l, dict) or not l.get("titulo"):
                    continue
                ls_slug = slugify(l["titulo"])[:60].strip("-") or "leccion"
                while ls_slug in lseen or ls_slug == "index":
                    ls_slug += "-2"
                lseen.add(ls_slug)
                tipo = l.get("tipo") if l.get("tipo") in TIPOS else ("video" if l.get("video") else "lectura")
                if l.get("examen_final") and tipo != "cuestionario":
                    WARNINGS.append(f"Aula: «{l['titulo']}» está marcado como examen final pero no es de tipo Cuestionario.")
                item = dict(l, _slug=ls_slug, _tipo=tipo, _mod=mi, _mod_titulo=m.get("titulo") or f"Módulo {mi + 1}",
                            _url=f"/aula/{cid}/{ls_slug}", _key=f"{cid}/{ls_slug}")
                ls.append(item)
                lessons.append(item)
            if ls:
                mods.append({"titulo": m.get("titulo") or f"Módulo {mi + 1}", "lecciones": ls})
        if lessons:
            for i, l in enumerate(lessons):
                l["_n"] = i + 1
                l["_prev"] = lessons[i - 1] if i > 0 else None
                l["_next"] = lessons[i + 1] if i + 1 < len(lessons) else None
            out.append(dict(c, _id=cid, _mods=mods, _lessons=lessons))
    _CURSOS = out
    return out


def raw_cursos():
    """Cursos de content/aula-cursos/ (uno por archivo, ordenados) y los antiguos de aula.json."""
    out = []
    folder = os.path.join(CONTENT, "aula-cursos")
    if os.path.isdir(folder):
        for fn in sorted(os.listdir(folder)):
            if not fn.endswith(".json"):
                continue
            c = load(os.path.join("aula-cursos", fn), default=None)
            if isinstance(c, dict):
                out.append(dict(c, _file=fn[:-5]))
            else:
                WARNINGS.append(f"Aula: el curso content/aula-cursos/{fn} tiene un error de formato y no se publicó.")
    out.sort(key=lambda c: (precio_num(c.get("orden")) or 999, str(c.get("titulo") or "")))
    return out + [c for c in arr(g(A, "cursos", default=[])) if isinstance(c, dict)]


def horas_txt(c):
    h = str(c.get("horas") or "").strip()
    if not h:
        return ""
    return h if re.search(r"[a-z]", h, re.I) else f"{h} horas"


def cert_on(c):
    return c.get("certificado", True) is not False


def libre_on(c):
    """El alumno puede inscribirse solo en este curso (ajuste general + ajuste del curso)."""
    return g(A, "inscripcion_libre") is not False and c.get("inscripcion_libre", True) is not False


def img_abs(v, default="/img/aula-virtual.jpg"):
    v = str(v or "").strip()
    if not v:
        return default
    if v.startswith(("http://", "https://", "/")):
        return v
    return "/" + v.lstrip("./").replace("src/", "", 1)


def rich(s):
    h = clean_html(s)
    return re.sub(r'(src|href)="(img/|aula/)', r'\1="/\2', h)


def embed(url):
    """Convierte un enlace de YouTube, Vimeo o Google Drive en la dirección para insertar el video."""
    u = str(url or "").strip()
    if not u:
        return None
    try:
        p = urlparse(u)
    except ValueError:
        return None
    host = (p.netloc or "").lower().replace("www.", "").replace("m.", "", 1)
    vid = None
    if host in ("youtube.com", "youtube-nocookie.com", "music.youtube.com"):
        if p.path == "/watch":
            vid = (parse_qs(p.query).get("v") or [None])[0]
        else:
            m = re.match(r"^/(?:embed|shorts|live|v)/([\w-]{6,})", p.path)
            vid = m.group(1) if m else None
    elif host == "youtu.be":
        vid = p.path.strip("/").split("/")[0] or None
    if vid and re.fullmatch(r"[\w-]{6,20}", vid):
        return f"https://www.youtube-nocookie.com/embed/{vid}?rel=0"
    if host == "vimeo.com":
        m = re.match(r"^/(\d+)", p.path)
        if m:
            return f"https://player.vimeo.com/video/{m.group(1)}"
    if host == "player.vimeo.com":
        return u
    if host == "drive.google.com":
        m = re.search(r"/file/d/([\w-]+)", p.path) or re.search(r"[?&]id=([\w-]+)", "?" + p.query)
        if m:
            return f"https://drive.google.com/file/d/{m.group(1)}/preview"
    return None


def file_icon(name):
    ext = os.path.splitext(str(name).split("?")[0])[1].lower()
    return {".pdf": "PDF", ".doc": "DOC", ".docx": "DOC", ".xls": "XLS", ".xlsx": "XLS", ".ppt": "PPT", ".pptx": "PPT",
            ".zip": "ZIP", ".rar": "ZIP", ".txt": "TXT", ".mp3": "MP3", ".mp4": "MP4"}.get(ext, "LINK")


# ------------------------------------------------------------------ Plantilla
def shell(title, body, cls="", user=True, extra_head=""):
    nav = ""
    if user:
        nav = f'''
        <nav class="aula-top__nav" aria-label="Aula virtual">
          <a href="/aula/" class="aula-top__link">{icon("grid")} <span>Mis cursos</span></a>
          <div class="aula-user" data-user>
            <span class="aula-user__avatar" data-user-initials aria-hidden="true">·</span>
            <span class="aula-user__name" data-user-name>Mi cuenta</span>
          </div>
          <button type="button" class="aula-top__link aula-top__out" data-logout>{icon("arrow")} <span>Salir</span></button>
        </nav>'''
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{e(title)} · Aula virtual TechRevive</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="theme-color" content="#071233" />
  <link rel="icon" href="/{e(FAVICON)}" type="image/png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="stylesheet" href="/css/aula.css" />{extra_head}
  <script src="/js/config.js" defer></script>
  <script src="/js/aula.js" defer></script>
  <script src="/js/visitas.js" defer></script>
</head>
<body class="aula {cls}">
  {sprite()}
  <a class="skip-link" href="#aula-contenido">Saltar al contenido</a>
  <header class="aula-top">
    <div class="aula-top__inner">
      <a href="{'/aula/' if user else '/'}" class="logo aula-top__logo" aria-label="Aula virtual TechRevive">
        <img class="logo__mark logo__mark--img" src="/{e(LOGO_IMG)}" width="40" height="40" alt="" />
        <span class="logo__text">TECH<span>REVIVE</span></span>
        <span class="aula-top__tag">Aula virtual</span>
      </a>{nav}
    </div>
  </header>
  <main id="aula-contenido" class="aula-body">
{body}
  </main>
  <footer class="aula-foot">
    <span>© {YEAR} TechRevive · {SLOGAN}</span>
    <a href="/">Volver al sitio web</a>
  </footer>
</body>
</html>
'''


def write(rel, html_doc):
    path = os.path.join(AULA_OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html_doc)


def wa_digits():
    d = "".join(ch for ch in str(g(CFG, "contacto", "whatsapp") or g(CFG, "contacto", "whatsapp_visible") or "") if ch.isdigit())
    return "502" + d if len(d) == 8 else d


# ------------------------------------------------------------------ Páginas
def build_ingresar():
    texto = e(g(A, "texto_ingreso") or "Ingresa con el usuario y la contraseña que te enviamos al inscribirte.")
    body = f'''    <section class="aula-login">
      <div class="aula-login__brand">
        <div class="aula-login__brand-inner">
          <p class="eyebrow eyebrow--dark">Aula virtual</p>
          <h1>Aprende desde cualquier lugar, <span class="text-grad">a tu ritmo.</span></h1>
          <ul class="aula-login__feats">
            <li>{icon("play")} Clases en video y lecturas</li>
            <li>{icon("download")} Materiales para descargar</li>
            <li>{icon("clipboard")} Cuestionarios con calificación al instante</li>
            <li>{icon("trend")} Tu progreso, curso por curso</li>
          </ul>
        </div>
      </div>
      <div class="aula-login__panel">
        <form class="aula-login__card" id="aula-login" novalidate>
          <img class="aula-login__logo" src="/img/logo-techrevive.png" width="1200" height="312" alt="TechRevive · Reparación y Mantenimiento" />
          <h2>Ingresa a tu aula</h2>
          <p class="aula-login__lead">{texto}</p>
          <div class="cf"><label for="al-user">Usuario</label>
            <input id="al-user" name="usuario" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required /></div>
          <div class="cf"><label for="al-pass">Contraseña</label>
            <div class="aula-pass"><input id="al-pass" name="password" type="password" autocomplete="current-password" required />
            <button type="button" class="aula-pass__toggle" data-toggle-pass aria-label="Mostrar contraseña">Mostrar</button></div></div>
          <p class="aula-login__error" role="alert" hidden></p>
          <button type="submit" class="btn btn--primary btn--block btn--lg">{icon("lock")} Ingresar</button>
          <p class="aula-login__help">¿Olvidaste tu contraseña o aún no tienes usuario?
            <a href="#" data-aula-wa>Escríbenos por WhatsApp</a> o <a href="/inscripcion.html">inscríbete aquí</a>.</p>
        </form>
      </div>
    </section>'''
    write("ingresar.html", shell("Ingresar", body, cls="aula--login", user=False))


def lesson_icon(l):
    return icon(TIPOS[l["_tipo"]][0])


def outline(c, current=None):
    mods = []
    for mi, m in enumerate(c["_mods"]):
        items = "".join(
            f'<li><a href="{l["_url"]}" class="aula-ol__item{" is-current" if current is l else ""}" data-key="{e(l["_key"])}"'
            f'{" aria-current=\"page\"" if current is l else ""}><span class="aula-ol__icon">{lesson_icon(l)}</span>'
            f'<span class="aula-ol__text">{e(l["titulo"])}<small>{"Examen final" if l.get("examen_final") else e(TIPOS[l["_tipo"]][1])}{" · " + e(l.get("duracion")) if l.get("duracion") else ""}</small></span>'
            f'<span class="aula-ol__check" aria-hidden="true">{icon("check")}</span></a></li>' for l in m["lecciones"])
        open_attr = " open" if (current is None or current["_mod"] == m["lecciones"][0]["_mod"]) else ""
        mods.append(f'''<details class="aula-ol__mod"{open_attr}><summary><span class="aula-ol__modnum">Módulo {mi + 1}</span>{e(m["titulo"])}<span class="aula-ol__modcount" data-mod-count></span></summary><ul>{items}</ul></details>''')
    return "".join(mods)


def build_curso(c):
    keys = [l["_key"] for l in c["_lessons"]]
    meta = "".join(f'<li>{icon(ic)} {e(v)}</li>' for ic, v in (("user", c.get("docente")), ("clock", c.get("duracion")), ("trend", c.get("nivel"))) if v)
    if horas_txt(c) and cert_on(c):
        meta += f'<li>{icon("award", "check")} Certificado · {e(horas_txt(c))}</li>'
    objetivos = [str(x) for x in arr(c.get("objetivos")) if str(x).strip()]
    obj_html = (f'<section class="aula-card aula-goals"><h2>{icon("target", "check")} Lo que aprenderás</h2><ul>'
                + "".join(f'<li>{icon("check")}<span>{e(x)}</span></li>' for x in objetivos) + '</ul></section>') if objetivos else ""
    req = str(c.get("requisitos") or "").strip()
    req_html = f'<p class="aula-req"><strong>Requisitos:</strong> {e(req)}</p>' if req else ""
    exams = [l["_key"] for l in c["_lessons"] if l.get("examen_final")]
    cert_html = ""
    if cert_on(c):
        need = "todas las lecciones y aprueba el examen final" if exams else "todas las lecciones (y aprueba los cuestionarios)"
        cert_html = f'''<section class="aula-card aula-cert" id="certificado" data-cert data-curso="{e(c["_id"])}" data-keys='{e(json.dumps([l["_key"] for l in c["_lessons"]]))}'>
        <div class="aula-cert__icon">{icon("award", "check")}</div>
        <div class="aula-cert__body">
          <h2>Certificado del curso</h2>
          <p data-cert-msg>Completa {need} para solicitar tu certificado con tu nombre{(" (" + e(horas_txt(c)) + ")") if horas_txt(c) else ""}.</p>
          <form class="aula-cert__form" data-cert-form hidden>
            <label for="cert-nombre-{e(c["_id"])}">Tu nombre completo, tal como debe aparecer en el certificado</label>
            <input id="cert-nombre-{e(c["_id"])}" name="nombre" maxlength="90" autocomplete="name" required />
            <p class="aula-cert__hint">Revísalo bien: tildes, mayúsculas y los dos apellidos si los usas.</p>
            <div class="aula-cert__btns"><button type="submit" class="btn btn--primary btn--sm">Enviar solicitud</button><button type="button" class="btn btn--outline btn--sm" data-cert-cancel>Cancelar</button></div>
          </form>
          <div class="aula-cert__actions" data-cert-actions></div>
        </div>
      </section>'''
    total = len(c["_lessons"])
    body = f'''    <section class="aula-course-hero">
      <div class="aula-wrap aula-course-hero__inner">
        <div>
          <nav class="aula-crumbs" aria-label="Ruta"><a href="/aula/">Mis cursos</a>{icon("chevron")}<span aria-current="page">{e(c["titulo"])}</span></nav>
          <h1>{e(c["titulo"])}</h1>
          <p class="aula-course-hero__lead">{e(c.get("descripcion"))}</p>
          <ul class="aula-meta">{meta}<li>{icon("layers")} {len(c["_mods"])} módulos · {total} lecciones</li></ul>
          <div class="aula-progress aula-progress--hero" data-progress data-keys='{e(json.dumps(keys))}'>
            <div class="aula-progress__bar"><span></span></div><p><strong data-progress-pct>0%</strong> completado · <span data-progress-count>0</span> de {total} lecciones</p>
          </div>
          <a href="{c["_lessons"][0]["_url"]}" class="btn btn--primary btn--lg" data-continue='{e(json.dumps(keys))}' data-first="{c["_lessons"][0]["_url"]}">{icon("play")} <span>Comenzar curso</span></a>
        </div>
        <div class="aula-course-hero__media"><img src="{e(img_abs(c.get("imagen")))}" width="960" height="640" alt="" /></div>
      </div>
    </section>
    <section class="aula-wrap aula-course-body">
      <div class="aula-course-cols">
        <div>
          <h2 class="aula-h2">Contenido del curso</h2>
          {req_html}
          <div class="aula-ol aula-ol--page">{outline(c)}</div>
        </div>
        <aside class="aula-course-aside">
          {cert_html}
          {obj_html}
        </aside>
      </div>
    </section>'''
    write(os.path.join(c["_id"], "index.html"), shell(c["titulo"], body, cls="aula--curso"))


def quiz_items(l):
    """Preguntas válidas de un cuestionario: [(pregunta, opciones, correcta, explicación)]."""
    out = []
    for q in arr(l.get("preguntas")):
        if not (isinstance(q, dict) and q.get("pregunta") and len(arr(q.get("opciones"))) >= 2):
            continue
        opts = [str(o) for o in arr(q.get("opciones"))]
        try:
            ok = int(q.get("correcta") or 0)
        except (TypeError, ValueError):
            ok = 0
        if not 1 <= ok <= len(opts):
            WARNINGS.append(f"Aula: la pregunta «{str(q['pregunta'])[:50]}» no tiene una respuesta correcta válida (usa 1 a {len(opts)}).")
            ok = 1
        out.append((str(q["pregunta"]), opts, ok, str(q.get("explicacion") or "")))
    return out


def quiz_html(l):
    # Las respuestas correctas y las explicaciones NO van en la página: las revisa el servidor
    # (worker/aula-datos.js), así nadie puede verlas con «Inspeccionar» antes de responder.
    qs = quiz_items(l)
    if not qs:
        return '<p class="aula-empty">Este cuestionario todavía no tiene preguntas.</p>'
    items = []
    for qi, (preg, opts, ok, exp) in enumerate(qs):
        lis = "".join(f'<label class="quiz__opt"><input type="radio" name="q{qi}" value="{oi + 1}" /><span class="quiz__mark" aria-hidden="true"></span><span>{e(o)}</span></label>'
                      for oi, o in enumerate(opts))
        items.append(f'<fieldset class="quiz__q" data-q="{qi}"><legend><span>{qi + 1}</span>{e(preg)}</legend><div class="quiz__opts">{lis}</div><p class="quiz__exp" hidden></p></fieldset>')
    minimo = int(precio_num(g(A, "nota_minima") or 70)) or 70
    final = " data-final" if l.get("examen_final") else ""
    aviso = (f'<p class="quiz__intro">📝 <strong>Examen final:</strong> {len(qs)} preguntas en orden aleatorio. Necesitas {minimo}% para aprobar. '
             'Si no apruebas verás qué preguntas fallaste (sin revelar la respuesta) para que repases esos temas; las preguntas y opciones cambian de orden en cada intento '
             'y hay un máximo de 5 intentos por hora.</p>') if final else ""
    return f'''<form class="quiz" data-min="{minimo}"{final} novalidate>
            {aviso}{"".join(items)}
            <div class="quiz__foot">
              <button type="submit" class="btn btn--primary">{icon("check")} Revisar respuestas</button>
              <button type="button" class="btn btn--outline" data-quiz-reset hidden>{icon("refresh")} Intentar de nuevo</button>
              <p class="quiz__best" data-quiz-best hidden></p>
            </div>
            <div class="quiz__result" role="status" hidden></div>
          </form>'''


def precio_num(v):
    try:
        return float(str(v).strip() or 0)
    except (TypeError, ValueError):
        return 0.0


def build_leccion(c, l):
    tipo_ic, tipo_txt = TIPOS[l["_tipo"]]
    media = ""
    if l.get("video"):
        src = embed(l["video"])
        if src:
            media = (f'<div class="aula-video"><iframe src="{e(src)}" title="{e(l["titulo"])}" loading="lazy" '
                     f'allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" '
                     f'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>')
        else:
            media = f'<a class="aula-extlink" href="{e(l["video"])}" target="_blank" rel="noopener">{icon("play")} Abrir el video de la clase</a>'
    contenido = f'<div class="aula-rich">{rich(l.get("contenido"))}</div>' if l.get("contenido") else ""
    extra = ""
    if l["_tipo"] == "cuestionario":
        extra = quiz_html(l)
    elif l["_tipo"] == "simulador":
        sim = l.get("simulador") if l.get("simulador") in SIMULADORES else "pc"
        minimo = int(precio_num(g(A, "nota_minima") or 70)) or 70
        if sim == "arduino":
            extra = ('<section class="a3d" data-a3d aria-label="Laboratorio 3D de Arduino y robótica">'
                     '<p class="sim__loading">Cargando el laboratorio 3D…</p><noscript>Activa JavaScript para usar el laboratorio 3D.</noscript></section>'
                     '<script type="module" src="/js/arduino3d.js"></script>')
        elif sim == "taller3d":
            extra = ('<section class="t3d" data-t3d aria-label="Taller 3D: armado libre de PC y laptops">'
                     '<p class="sim__loading">Cargando el taller 3D…</p><noscript>Activa JavaScript para usar el taller 3D.</noscript></section>'
                     '<script src="/js/taller3d-catalogo.js" defer></script>'
                     '<script type="module" src="/js/taller3d.js"></script>')
        else:
            extra = (f'<section class="sim" data-sim="{sim}" data-min="{minimo}" aria-label="Simulador: {e(SIMULADORES[sim])}">'
                     f'<p class="sim__loading">Cargando el simulador…</p><noscript>Activa JavaScript para usar el simulador.</noscript></section>'
                     f'<script src="/js/simulador.js" defer></script>')
    elif l["_tipo"] == "tarea":
        fl = l.get("fecha_limite")
        fecha = f'<p class="aula-task__date">{icon("calendar")} Fecha límite: <strong>{e(fecha_larga(fl))}</strong></p>' if fl else ""
        entrega = (f'<a href="{e(l["enlace_entrega"])}" target="_blank" rel="noopener" class="btn btn--primary">{icon("send")} Abrir formulario de entrega</a>'
                   if l.get("enlace_entrega") else "")
        extra = f'''<div class="aula-task">
            <h2>{icon("send")} Entrega tu tarea</h2>
            {fecha}
            <p>Cuando la termines, envíanos tus archivos o capturas. Después marca la lección como completada.</p>
            <div class="aula-task__btns">{entrega}
              <a href="#" class="btn btn--whatsapp" data-task-wa data-curso="{e(c["titulo"])}" data-tarea="{e(l["titulo"])}">{icon("whatsapp")} Enviar por WhatsApp</a>
            </div>
          </div>'''
    mats = []
    for m in arr(l.get("materiales")):
        if not isinstance(m, dict):
            continue
        href = str(m.get("archivo") or m.get("enlace") or "").strip()
        if not href:
            continue
        if not href.startswith(("http://", "https://", "/")):
            href = "/" + href
        ext = not href.startswith("/")
        badge = file_icon(href) if not ext or re.search(r"\.\w{2,4}($|\?)", href) else "LINK"
        name = m.get("titulo") or os.path.basename(href)
        tgt = ' target="_blank" rel="noopener"' if ext else (' download' if href.startswith("/aula/archivos/") else "")
        mats.append(f'<li><a href="{e(href)}"{tgt}><span class="aula-mat__badge aula-mat__badge--{badge.lower()}">{badge}</span>'
                    f'<span>{e(name)}</span>{icon("download" if not ext else "arrow")}</a></li>')
    mats_html = f'<section class="aula-mats"><h2>{icon("download")} Materiales</h2><ul>{"".join(mats)}</ul></section>' if mats else ""

    prev_l, next_l = l["_prev"], l["_next"]
    prev = (f'<a href="{prev_l["_url"]}" class="aula-pager__btn"><small>Anterior</small><span>{e(prev_l["titulo"])}</span></a>'
            if prev_l else '<span></span>')
    nxt = (f'<a href="{next_l["_url"]}" class="aula-pager__btn aula-pager__btn--next"><small>Siguiente</small><span>{e(next_l["titulo"])}</span></a>'
           if next_l else f'<a href="/aula/{c["_id"]}/" class="aula-pager__btn aula-pager__btn--next"><small>Terminaste</small><span>Volver al curso</span></a>')
    keys = [x["_key"] for x in c["_lessons"]]
    if l["_tipo"] == "simulador" and l.get("simulador") == "arduino":
        done_html = (f'<div class="aula-done aula-done--quiz"><p data-quiz-state>{icon("cpu")} Esta lección se completa automáticamente cuando terminás las 7 prácticas del '
                     f'laboratorio (tu progreso se guarda en este navegador).</p>'
                     f'<button type="button" class="btn btn--outline aula-done__btn" data-done aria-pressed="false" hidden>{icon("check")} <span>Marcar como completada</span></button></div>')
    elif l["_tipo"] == "simulador" and l.get("simulador") == "taller3d":
        done_html = (f'<div class="aula-done aula-done--quiz"><p data-quiz-state>{icon("cpu")} Esta lección se completa automáticamente cuando armas un equipo '
                     f'que enciende, arranca desde un disco y no tiene errores graves.</p>'
                     f'<button type="button" class="btn btn--outline aula-done__btn" data-done aria-pressed="false" hidden>{icon("check")} <span>Marcar como completada</span></button></div>')
    elif l["_tipo"] == "simulador":
        done_html = (f'<div class="aula-done aula-done--quiz"><p data-quiz-state>{icon("cpu")} Esta lección se completa automáticamente cuando terminas el simulador con '
                     f'{int(precio_num(g(A, "nota_minima") or 70)) or 70}% o más.</p>'
                     f'<button type="button" class="btn btn--outline aula-done__btn" data-done aria-pressed="false" hidden>{icon("check")} <span>Marcar como completada</span></button></div>')
    elif l["_tipo"] == "cuestionario":
        done_html = (f'<div class="aula-done aula-done--quiz"><p data-quiz-state>{icon("clipboard")} Esta lección se completa automáticamente cuando apruebas el '
                     f'{"examen" if l.get("examen_final") else "cuestionario"} con {int(precio_num(g(A, "nota_minima") or 70)) or 70}% o más.</p>'
                     f'<button type="button" class="btn btn--outline aula-done__btn" data-done aria-pressed="false" hidden>{icon("check")} <span>Marcar como completada</span></button></div>')
    else:
        done_html = f'<div class="aula-done"><button type="button" class="btn btn--outline aula-done__btn" data-done aria-pressed="false">{icon("check")} <span>Marcar como completada</span></button></div>'
    body = f'''    <div class="aula-lesson" data-lesson="{e(l["_key"])}" data-tipo="{l["_tipo"]}" data-curso-titulo="{e(c["titulo"])}" data-titulo="{e(l["titulo"])}">
      <aside class="aula-side" id="aula-side" aria-label="Contenido del curso">
        <div class="aula-side__head">
          <a href="/aula/{c["_id"]}/" class="aula-side__course">{e(c["titulo"])}</a>
          <div class="aula-progress" data-progress data-keys='{e(json.dumps(keys))}'>
            <div class="aula-progress__bar"><span></span></div><p><strong data-progress-pct>0%</strong> completado</p>
          </div>
        </div>
        <div class="aula-ol">{outline(c, l)}</div>
      </aside>
      <article class="aula-main">
        <button type="button" class="aula-side-toggle" aria-controls="aula-side" aria-expanded="false">{icon("layers")} Contenido del curso</button>
        <nav class="aula-crumbs" aria-label="Ruta"><a href="/aula/">Mis cursos</a>{icon("chevron")}<a href="/aula/{c["_id"]}/">{e(c["titulo"])}</a>{icon("chevron")}<span>{e(l["_mod_titulo"])}</span></nav>
        <header class="aula-main__head">
          <p class="aula-badge aula-badge--{l["_tipo"]}">{icon(tipo_ic)} {"Examen final" if l.get("examen_final") else e(tipo_txt)}{" · " + e(l.get("duracion")) if l.get("duracion") else ""}<span>Lección {l["_n"]} de {len(c["_lessons"])}</span></p>
          <h1>{e(l["titulo"])}</h1>
        </header>
        {media}
        {contenido}
        {extra}
        {mats_html}
        {done_html}
        <nav class="aula-pager" aria-label="Lecciones">{prev}{nxt}</nav>
      </article>
    </div>'''
    write(os.path.join(c["_id"], l["_slug"] + ".html"), shell(f'{l["titulo"]} · {c["titulo"]}', body, cls="aula--leccion"))


def build_tablero():
    catalogo = [{
        "id": c["_id"], "titulo": c["titulo"], "descripcion": c.get("descripcion") or "", "imagen": img_abs(c.get("imagen")),
        "docente": c.get("docente") or "", "duracion": c.get("duracion") or "", "nivel": c.get("nivel") or "",
        "total": len(c["_lessons"]), "keys": [l["_key"] for l in c["_lessons"]],
        "titulos": {l["_key"]: l["titulo"] for l in c["_lessons"]},
        "urls": {l["_key"]: l["_url"] for l in c["_lessons"]}, "url": f'/aula/{c["_id"]}/',
        "certificado": cert_on(c), "horas": horas_txt(c), "libre": libre_on(c),
    } for c in cursos()]
    avisos = [a for a in arr(g(A, "avisos", default=[])) if isinstance(a, dict) and (a.get("titulo") or a.get("texto"))]
    avisos.sort(key=lambda a: str(a.get("fecha") or ""), reverse=True)
    av_html = "".join(f'<li><strong>{e(a.get("titulo"))}</strong>{"<time>" + e(fecha_larga(a["fecha"])) + "</time>" if a.get("fecha") else ""}<p>{e(a.get("texto"))}</p></li>' for a in avisos)
    av_sec = f'<section class="aula-card aula-avisos"><h2>{icon("news")} Avisos</h2><ul>{av_html}</ul></section>' if avisos else ""
    body = f'''    <section class="aula-wrap aula-dash">
      <div class="aula-noaccess" data-noaccess hidden>{icon("alert")} <span>No tienes acceso a ese curso. Si crees que es un error, escríbenos.</span></div>
      <header class="aula-dash__head">
        <div>
          <p class="eyebrow">{e(g(A, "nombre") or "Aula virtual TechRevive")}</p>
          <h1>Hola, <span data-user-first>bienvenido</span> 👋</h1>
          <p class="aula-dash__lead">{e(g(A, "bienvenida"))}</p>
        </div>
        <dl class="aula-stats">
          <div><dt>Mis cursos</dt><dd data-stat="cursos">—</dd></div>
          <div><dt>Lecciones completadas</dt><dd data-stat="hechas">—</dd></div>
          <div data-stat-vence hidden><dt>Acceso hasta</dt><dd data-stat="vence">—</dd></div>
        </dl>
      </header>
      <a class="aula-resume" data-resume hidden href="#">
        <span class="aula-resume__icon">{icon("play")}</span>
        <span><small>Continuar donde te quedaste</small><strong data-resume-title></strong><em data-resume-course></em></span>
        {icon("arrow")}
      </a>
      <div class="aula-dash__grid">
        <section aria-labelledby="mis-cursos">
          <h2 class="aula-h2" id="mis-cursos">Mis cursos</h2>
          <div class="aula-courses" data-courses><p class="aula-empty">Cargando tus cursos…</p></div>
          <section class="aula-available" data-available hidden aria-labelledby="cursos-disponibles">
            <h2 class="aula-h2" id="cursos-disponibles">Cursos disponibles</h2>
            <p class="aula-available__lead">Elige el curso que quieras tomar y empieza de inmediato. Al terminarlo también puedes solicitar tu certificado.</p>
            <div class="aula-courses" data-available-list></div>
          </section>
        </section>
        <aside class="aula-dash__side">
          <section class="aula-card aula-mycerts" data-mycerts hidden>
            <h2>{icon("award", "check")} Mis certificados</h2>
            <ul data-mycerts-list></ul>
          </section>
          {av_sec}
          <section class="aula-card aula-help">
            <h2>{icon("headset")} ¿Necesitas ayuda?</h2>
            <p>Escríbenos con el nombre del curso y la lección, y te ayudamos.</p>
            <a href="#" class="btn btn--whatsapp btn--block" data-aula-wa>{icon("whatsapp")} Escribir por WhatsApp</a>
          </section>
        </aside>
      </div>
    </section>
    <script type="application/json" id="aula-catalogo">{json.dumps(catalogo, ensure_ascii=False).replace("<", "\\u003c")}</script>'''
    write("index.html", shell("Mis cursos", body, cls="aula--tablero"))


# ------------------------------------------------------------------ Accesos (para el Worker)
def datos_worker():
    ids = {c["_id"]: c for c in cursos()}
    by_title = {slugify(c["titulo"]): c["_id"] for c in cursos()}
    alumnos = {}
    for a in arr(g(AL, "alumnos", default=[])):
        if not isinstance(a, dict):
            continue
        u = str(a.get("usuario") or "").strip().lower()
        pw = str(a.get("contrasena") or "")
        if not u or not pw:
            if a.get("nombre"):
                WARNINGS.append(f"Aula: al alumno «{a.get('nombre')}» le falta usuario o contraseña; no podrá entrar.")
            continue
        if u in alumnos:
            WARNINGS.append(f"Aula: el usuario «{u}» está repetido; solo vale el primero.")
            continue
        acc = []
        for x in arr(a.get("cursos")):
            s = slugify(x)
            if s in ("todos", "todo", "all"):
                acc = ["*"]
                break
            cid = s if s in ids else by_title.get(s)
            if cid:
                acc.append(cid)
            else:
                WARNINGS.append(f"Aula: el curso «{x}» del alumno «{u}» no existe (revisa el identificador).")
        salt = secrets.token_hex(8)
        alumnos[u] = {"n": str(a.get("nombre") or u), "s": salt,
                      "h": hashlib.sha256(f"{salt}:{pw}".encode("utf-8")).hexdigest(),
                      "c": acc, "a": a.get("activo", True) is not False, "v": str(a.get("vence") or "")[:10]}
    cdata = {}
    for cid, c in ids.items():
        cdata[cid] = {"t": c["titulo"], "h": horas_txt(c), "c": cert_on(c), "i": libre_on(c),
                      "l": [l["_key"] for l in c["_lessons"]],
                      "q": [l["_key"] for l in c["_lessons"] if l["_tipo"] == "cuestionario"],
                      "x": [l["_key"] for l in c["_lessons"] if l["_tipo"] == "cuestionario" and l.get("examen_final")],
                      # Clave de respuestas de cada cuestionario (solo la conoce el servidor)
                      "r": {l["_key"]: [[ok, exp] for (_, _, ok, exp) in quiz_items(l)] for l in c["_lessons"] if l["_tipo"] == "cuestionario"}}
    minimo = int(precio_num(g(A, "nota_minima") or 70)) or 70
    data = {"k": secrets.token_hex(24), "m": minimo, "cursos": cdata, "alumnos": alumnos}
    js = ("// Archivo generado automáticamente por build.py en cada publicación (no se sube a GitHub).\n"
          "// Contiene los alumnos del aula virtual con sus contraseñas cifradas.\n"
          "export default " + json.dumps(data, ensure_ascii=False) + ";\n")
    with open(os.path.join(ROOT, "worker", "aula-datos.js"), "w", encoding="utf-8") as f:
        f.write(js)
    return len(alumnos)


# ------------------------------------------------------------------ Certificado público
CERT_DEF = {
    "titulo": "Certificado",
    "subtitulo": "de finalización",
    "texto_otorga": "Se otorga el presente certificado a",
    "texto_curso": "por haber completado satisfactoriamente el curso",
    "lugar": "Guatemala",
    "logo": "/img/logo-techrevive.png",
    "sello": "/img/sello-techrevive.png",
    "firmas": [
        {"nombre": "Nombre del director(a)", "cargo": "Dirección general · TechRevive", "imagen": ""},
        {"nombre": "Elías Cruz", "cargo": "Instructor · TechRevive", "imagen": ""},
    ],
}


def cert_config():
    cfg = g(A, "certificado", default={})
    cfg = cfg if isinstance(cfg, dict) else {}
    out = {k: (cfg.get(k) if str(cfg.get(k) or "").strip() else v) for k, v in CERT_DEF.items() if k != "firmas"}
    out["logo"] = img_abs(out["logo"], "/img/logo-techrevive.png")
    out["sello"] = img_abs(out["sello"], "/img/sello-techrevive.png")
    out["mostrar_sello"] = cfg.get("mostrar_sello") is not False
    firmas = [f for f in arr(cfg.get("firmas")) if isinstance(f, dict) and (f.get("nombre") or f.get("cargo"))]
    # Si en el panel aún está el texto de ejemplo del instructor, se usa el instructor real
    for f in firmas:
        if (f.get("nombre") or "").strip() == "Nombre del instructor(a)":
            f["nombre"], f["cargo"] = "Elías Cruz", "Instructor · TechRevive"
    out["firmas"] = [{"nombre": f.get("nombre") or "", "cargo": f.get("cargo") or "",
                      "imagen": img_abs(f.get("imagen"), "") if f.get("imagen") else ""} for f in (firmas or CERT_DEF["firmas"])][:3]
    return out


def cert_band():
    """Franja lateral del certificado: circuitos (como los del logo), sello y código QR."""
    trazos = [
        "M8 0 V38 L22 52 V92", "M18 0 V24 L34 40 H52", "M66 0 V30 L52 44 V70", "M0 118 H14 L26 130 V170",
        "M74 104 H58 L46 116 V150 L58 162 V216", "M10 216 V186 L24 172 H40", "M36 216 V196 L50 182",
        "M0 70 H6 L16 80 V100",
    ]
    nodos = [(22, 92), (52, 40), (52, 70), (26, 170), (40, 172), (50, 182), (16, 100), (8, 38), (46, 150)]
    svg_tr = "".join(f'<path d="{d}"/>' for d in trazos)
    svg_no = "".join(f'<circle cx="{x}" cy="{y}" r="1.6"/>' for x, y in nodos)
    return f'''<aside class="cert__band" aria-hidden="false">
          <svg class="cert__circuit" viewBox="0 0 74 216" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke-width=".55" stroke-linecap="round" stroke-linejoin="round">{svg_tr}</g><g>{svg_no}</g></svg>
          <div class="cert__seal" aria-hidden="true">
            <svg viewBox="0 0 200 230">
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60A5FA"/><stop offset=".55" stop-color="#2563EB"/><stop offset="1" stop-color="#1D4ED8"/></linearGradient>
                <path id="sp" d="M100 100 m-71 0 a71 71 0 1 1 142 0 a71 71 0 1 1 -142 0"/>
              </defs>
              <path d="M62 160 L48 226 L72 212 L86 230 L96 170 Z" fill="#1D4ED8"/><path d="M138 160 L152 226 L128 212 L114 230 L104 170 Z" fill="#2563EB"/>
              <circle cx="100" cy="100" r="96" fill="url(#sg)"/>
              <circle cx="100" cy="100" r="86" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.4" stroke-dasharray="2 4"/>
              <text font-family="Manrope, Inter, sans-serif" font-weight="800" font-size="13.2" letter-spacing="2.3" fill="#fff"><textPath href="#sp" startOffset="0">CAPACITACIÓN TECNOLÓGICA • TECHREVIVE •</textPath></text>
              <circle cx="100" cy="100" r="54" fill="#071233"/>
              <circle cx="100" cy="100" r="54" fill="none" stroke="#38BDF8" stroke-width="2"/>
              <image href="/img/cert-icono.png" x="64" y="60" width="72" height="54" preserveAspectRatio="xMidYMid meet"/>
              <text x="100" y="129" text-anchor="middle" font-family="Manrope, Inter, sans-serif" font-weight="800" font-size="8.6" letter-spacing="1.6" fill="#93C5FD">CERTIFICADO</text>
            </svg>
          </div>
          <div class="cert__verify">
            <div class="cert__qr" data-qr></div>
            <p><strong data-f="id"></strong><span>Verifica su autenticidad en</span><span data-f="url"></span></p>
          </div>
        </aside>'''


def build_certificado():
    cfg = cert_config()
    body = f'''<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Certificado · TechRevive</title>
  <meta name="description" content="Verifica la autenticidad de un certificado emitido por TechRevive." />
  <meta name="robots" content="noindex, follow" />
  <meta name="theme-color" content="#071233" />
  <link rel="icon" href="/{e(FAVICON)}" type="image/png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&family=Playfair+Display:ital,wght@0,600;1,500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/certificado.css" />
  <script src="/js/qrcode.js" defer></script>
  <script src="/js/certificado.js" defer></script>
  <script src="/js/visitas.js" defer></script>
</head>
<body class="certp">
  <header class="certp__bar">
    <a href="/" class="certp__brand"><img src="/{e(LOGO_IMG)}" width="32" height="32" alt="" /> <span>TECH<b>REVIVE</b></span></a>
    <div class="certp__tools" data-tools hidden>
      <button type="button" class="certp__btn certp__btn--primary" data-print>Imprimir o guardar PDF</button>
      <button type="button" class="certp__btn" data-copy>Copiar enlace</button>
      <a class="certp__btn" data-wa target="_blank" rel="noopener" href="#">Compartir por WhatsApp</a>
    </div>
  </header>
  <main class="certp__main">
    <section class="certp__state" data-state="buscar">
      <h1>Verificar un certificado</h1>
      <p>Escribe el código que aparece en la parte inferior del certificado (por ejemplo, TR-AB12-CD34).</p>
      <form class="certp__form" data-form><input name="c" placeholder="TR-XXXX-XXXX" maxlength="12" autocomplete="off" aria-label="Código del certificado" required /><button class="certp__btn certp__btn--primary">Verificar</button></form>
      <p class="certp__msg" data-msg role="status"></p>
    </section>
    <div class="certp__verified" data-verified hidden>✓ Certificado auténtico emitido por TechRevive · Código <strong data-code></strong></div>
    <div class="certp__stage" data-stage hidden>
      <article class="cert" data-cert aria-label="Certificado">
        {cert_band()}
        <div class="cert__body">
          <img class="cert__mark" src="/img/cert-icono.png" alt="" aria-hidden="true" />
          <header class="cert__top">
            <img class="cert__logo" src="{e(cfg["logo"])}" alt="TechRevive" />
            <span class="cert__tag">Capacitación tecnológica</span>
          </header>
          <p class="cert__title">{e(cfg["titulo"])}</p>
          <p class="cert__subtitle">{e(cfg["subtitulo"])}</p>
          <p class="cert__lead">{e(cfg["texto_otorga"])}</p>
          <p class="cert__name" data-f="nombre"></p>
          <p class="cert__lead">{e(cfg["texto_curso"])}</p>
          <p class="cert__course" data-f="curso"></p>
          <dl class="cert__facts">
            <div data-fact="horas"><dt>Duración</dt><dd data-f="horas"></dd></div>
            <div><dt>Fecha de emisión</dt><dd data-f="fecha"></dd></div>
            <div><dt>Lugar</dt><dd>{e(cfg["lugar"])}</dd></div>
          </dl>
          {('<img class="cert__stamp" src="' + e(cfg["sello"]) + '" alt="Sello de TechRevive" />') if cfg["mostrar_sello"] else ""}
          <div class="cert__signs">{"".join(f'<div class="cert__sign">{(chr(60) + "img src=" + chr(34) + e(f["imagen"]) + chr(34) + " alt=" + chr(34) + chr(34) + " />") if f["imagen"] else ""}<span class="cert__line"></span><strong>{e(f["nombre"])}</strong><small>{e(f["cargo"])}</small></div>' for f in cfg["firmas"])}</div>
        </div>
      </article>
    </div>
  </main>
  <script type="application/json" id="cert-config">{json.dumps({"lugar": cfg["lugar"]}, ensure_ascii=False).replace("<", "\\u003c")}</script>
</body>
</html>
'''
    with open(os.path.join(OUT, "certificado.html"), "w", encoding="utf-8") as f:
        f.write(body)


def build_aula_virtual():
    os.makedirs(AULA_OUT, exist_ok=True)
    src = os.path.join(SRC, "aula-archivos")
    if os.path.isdir(src):
        shutil.copytree(src, os.path.join(AULA_OUT, "archivos"), dirs_exist_ok=True)
    n = datos_worker()
    build_certificado()
    if not habilitada():
        return 0
    build_ingresar()
    build_tablero()
    for c in cursos():
        build_curso(c)
        for l in c["_lessons"]:
            build_leccion(c, l)
    return n
