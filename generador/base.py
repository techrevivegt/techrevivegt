# -*- coding: utf-8 -*-
"""TechRevive · Base del generador: lee el contenido (content/*.json) y arma las piezas comunes."""
import html, json, os, re, glob, unicodedata
from urllib.parse import quote

GEN = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(GEN)
CONTENT = os.path.join(ROOT, "content")
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(ROOT, "_site")

PAGES = []      # registro para sitemap.xml
WARNINGS = []   # avisos que se muestran al final de la compilación


# ------------------------------------------------------------------ Lectura de contenido
def load(name, default=None):
    path = os.path.join(CONTENT, name)
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        WARNINGS.append(f"No se encontró {name}; se usó contenido vacío.")
    except json.JSONDecodeError as ex:
        # Se detiene la publicación: Cloudflare mantiene en línea la versión anterior del sitio.
        raise SystemExit(f"✖ ERROR: el archivo content/{name} tiene un error de formato ({ex}). "
                         "Corrígelo (o deshaz el último cambio) y vuelve a publicar.")
    return {} if default is None else default


def g(d, *keys, default=""):
    """Obtiene un valor anidado sin fallar: g(datos, 'portada', 'titulo')."""
    for k in keys:
        if isinstance(d, dict):
            d = d.get(k)
        else:
            return default
    return default if d is None else d


def arr(v):
    return [x for x in v if x not in (None, "", {})] if isinstance(v, list) else []


def visible(sec):
    return isinstance(sec, dict) and sec.get("mostrar", True) is not False


def read_gen(name):
    with open(os.path.join(GEN, name), encoding="utf-8") as f:
        return f.read()


def slugify(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "item"


def e(v):
    return html.escape(str(v if v is not None else ""), quote=True)


CFG = load("configuracion.json")
SITE_URL = (g(CFG, "sitio", "url") or "https://techrevive.pages.dev").rstrip("/")
YEAR = "2026"


def img(p):
    """Convierte la ruta guardada por el panel (/img/foto.jpg) en ruta relativa (img/foto.jpg)."""
    p = str(p or "").strip()
    if not p:
        return ""
    if p.startswith(("http://", "https://", "data:")):
        return p
    p = p.lstrip("/")
    if p.startswith("src/"):
        p = p[4:]
    if not os.path.exists(os.path.join(SRC, p)):
        WARNINGS.append(f"La imagen {p} no existe en src/.")
    return p


# ------------------------------------------------------------------ Íconos
_EXTRA = {
    "eye": '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    "heart": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    "star": '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
    "calendar": '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    "globe": '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    "monitor": '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    "wifi": '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/>',
    "printer": '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    "lock": '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "cloud": '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    "camera": '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    "file": '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    "image": '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    "news": '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>',
    "share": '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
    "map": '<path d="M14.1 6.3 9.9 4.2a2 2 0 0 0-1.8 0L3.6 6.5A1 1 0 0 0 3 7.4v12.2a1 1 0 0 0 1.4.9l3.7-1.8a2 2 0 0 1 1.8 0l4.2 2.1a2 2 0 0 0 1.8 0l4.5-2.3a1 1 0 0 0 .6-.9V5.4a1 1 0 0 0-1.4-.9l-3.7 1.8a2 2 0 0 1-1.8 0z"/><path d="M15 6.8v14M9 3.2v14"/>',
    "home": '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    "sitemap": '<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 12V8"/>',
    "grid": '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    "help": '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
    "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    "zap": '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    "refresh": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    "cart": '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    "phone": '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
    "database": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    "settings": '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    "message": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    "thermo": '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
    "alert": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
    "handshake": '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8"/>',
    "building": '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    "school": '<path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17M4 6l8-4 8 4M6 5v17"/><circle cx="12" cy="9" r="2"/>',
    "play": '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z"/>',
    "dollar": '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
}
_SPRITE = None
ICON_NAMES = set()


def sprite():
    global _SPRITE
    if _SPRITE is None:
        base = read_gen("sprite_base.svg")
        extra = "".join(
            f'\n      <symbol id="i-{k}" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round">{v}</g></symbol>' for k, v in _EXTRA.items())
        _SPRITE = base.replace("    </defs>", extra + "\n    </defs>")
    return _SPRITE


ICON_NAMES.update(re.findall(r'id="i-([a-z]+)"', read_gen("sprite_base.svg")))
ICON_NAMES.update(_EXTRA.keys())


def icon(name, fallback="check", cls="icon"):
    n = name if name in ICON_NAMES else fallback
    return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{n}"/></svg>'


ARROW = icon("arrow")

# ------------------------------------------------------------------ Datos compartidos
SERVICIOS = load("servicios.json")
RESERVED = {"index", "quienes-somos", "servicios", "capacitacion", "cursos", "aula-virtual", "inscripcion", "blog",
            "preguntas-frecuentes", "novedades", "galeria", "redes-sociales", "contacto", "ubicacion", "mapa-del-sitio", "404"}


def service_list():
    out, seen = [], set()
    for s in arr(g(SERVICIOS, "lista", default=[])):
        if not s.get("titulo"):
            continue
        slug = slugify(s.get("pagina") or s.get("nombre_corto") or s["titulo"])
        if slug in RESERVED or slug.startswith("blog-"):
            slug = "servicio-" + slug
        while slug in seen:
            slug += "-2"
        seen.add(slug)
        s = dict(s)
        s["_href"] = slug + ".html"
        s["_nombre"] = s.get("nombre_corto") or s["titulo"]
        out.append(s)
    return out


SERVICES = service_list()


def form_options():
    opts = [o for o in arr(g(CFG, "formulario", "opciones_servicio", default=[]))]
    for s in SERVICES:  # asegura que cada servicio tenga su opción en el formulario
        v = s.get("opcion_formulario")
        if v and v not in opts:
            opts.insert(max(len(opts) - 1, 0), v)
    return opts or ["Otro"]


def link_attrs(href):
    """Enlaces del panel: 'whatsapp' abre WhatsApp; el resto se usa tal cual."""
    href = str(href or "").strip()
    if href.lower() == "whatsapp":
        return 'href="contacto.html" data-wa'
    if href.startswith(("http://", "https://")):
        return f'href="{e(href)}" target="_blank" rel="noopener"'
    return f'href="{e(href or "contacto.html")}"'


def button(b, cls, ico=None, extra=""):
    if not isinstance(b, dict) or not b.get("texto"):
        return ""
    i = f" {icon(ico)}" if ico else ""
    lead = icon("whatsapp") + " " if str(b.get("enlace", "")).lower() == "whatsapp" else ""
    return f'<a {link_attrs(b.get("enlace"))} class="{cls}"{extra}>{lead}{e(b["texto"])}{i}</a>'


def service_link(value):
    return "contacto.html?servicio=" + quote(value) + "#formulario" if value else "contacto.html#formulario"


# ------------------------------------------------------------------ Navegación
def nav_items():
    serv = [(s["_nombre"], s["_href"], s.get("icono"), s.get("descripcion_menu", "")) for s in SERVICES]
    serv += [None, ("Todos los servicios", "servicios.html", "grid", "Conoce todo lo que podemos hacer por ti.")]
    return [
        ("Inicio", "index.html", None),
        ("¿Quiénes somos?", "quienes-somos.html", None),
        ("Servicios", "servicios.html", serv),
        ("Capacitación", "capacitacion.html", [
            ("Capacitación tecnológica", "capacitacion.html", "cap", "Modalidades, niveles y nuestra forma de enseñar."),
            ("Cursos disponibles", "cursos.html", "book", "Computación, ofimática, reparación y más."),
            ("Aula virtual", "aula-virtual.html", "monitor", "Aprende en línea, a tu ritmo."),
            ("Inscripción", "inscripcion.html", "clipboard", "Reserva tu lugar en un curso.")]),
        ("Recursos", "blog.html", [
            ("Blog y tutoriales", "blog.html", "file", "Consejos prácticos para tu tecnología."),
            ("Preguntas frecuentes", "preguntas-frecuentes.html", "help", "Respuestas rápidas a dudas comunes.")]),
        ("Sala de prensa", "novedades.html", [
            ("Novedades y comunicados", "novedades.html", "news", "Anuncios, inscripciones y actividades."),
            ("Galería de fotos", "galeria.html", "image", "Nuestro trabajo y actividades en imágenes."),
            ("Redes sociales", "redes-sociales.html", "share", "Síguenos y mantente al día.")]),
        ("Contacto", "contacto.html", [
            ("Contáctanos", "contacto.html", "mail", "Escríbenos o solicita un servicio."),
            ("Ubicación y horarios", "ubicacion.html", "pin", "Encuéntranos en el mapa."),
            ("Mapa del sitio", "mapa-del-sitio.html", "sitemap", "Todas las páginas en un solo lugar.")]),
    ]


def nav_html(active):
    items = []
    for i, (label, href, sub) in enumerate(nav_items()):
        if not sub:
            cur = ' is-active" aria-current="page' if href == active else ""
            items.append(f'          <li class="nav__item"><a href="{href}" class="nav__link{cur}">{label}</a></li>')
            continue
        is_cur = active in [s[1] for s in sub if s]
        sid = f"sub-{i}"
        links = []
        for s in sub:
            if s is None:
                links.append('                <li class="dd-sep" role="separator"></li>')
                continue
            t, h, ic, d = s
            act = ' is-active" aria-current="page' if h == active else ""
            small = f"<small>{e(d)}</small>" if d else ""
            links.append(f'                <li><a href="{h}" class="dd-link{act}"><span class="dd-icon">{icon(ic, "laptop")}</span>'
                         f'<span class="dd-text"><strong>{e(t)}</strong>{small}</span></a></li>')
        items.append(f'''          <li class="nav__item has-sub{' is-current' if is_cur else ''}">
            <a href="{href}" class="nav__link{' is-active' if is_cur else ''}">{label}</a>
            <button class="nav__sub-toggle" type="button" aria-expanded="false" aria-controls="{sid}" aria-label="Mostrar opciones de {label}">{icon("chevron")}</button>
            <div class="nav__dropdown" id="{sid}">
              <ul class="nav__dropdown-inner">
{chr(10).join(links)}
              </ul>
            </div>
          </li>''')
    return "\n".join(items)


def _img_path(v, default):
    v = (v or "").strip() or default
    return v.lstrip("/") if not v.startswith("http") else v


LOGO_IMG = _img_path(g(CFG, "sitio", "logo"), "img/logo-icono.png")
FAVICON = _img_path(g(CFG, "sitio", "favicon"), "img/favicon.png")


def logo(footer=False):
    return (f'<a href="index.html" class="logo" aria-label="TechRevive, ir al inicio">\n'
            f'        <img class="logo__mark logo__mark--img" src="{e(LOGO_IMG)}" width="44" height="44" alt="" decoding="async" />\n'
            f'        <span class="logo__text">TECH<span>REVIVE</span></span>\n      </a>')


def header(active):
    return f'''  <a class="skip-link" href="#contenido">Saltar al contenido</a>

  <header class="header" id="header">
    <div class="container header__inner">
      {logo()}

      <nav class="nav" id="nav" aria-label="Navegación principal">
        <ul class="nav__list">
{nav_html(active)}
        </ul>
        <a href="contacto.html#formulario" class="btn btn--primary nav__cta-mobile">Solicitar servicio</a>
      </nav>

      <div class="header__actions">
        <a href="contacto.html#formulario" class="btn btn--primary btn--sm header__cta">Solicitar servicio</a>
        <button class="menu-toggle" id="menuToggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>'''


SOCIALS = '''<a href="#" data-social="facebook" aria-label="Facebook"><svg class="icon"><use href="#i-facebook"/></svg></a>
          <a href="#" data-social="instagram" aria-label="Instagram"><svg class="icon"><use href="#i-instagram"/></svg></a>
          <a href="#" data-social="tiktok" aria-label="TikTok"><svg class="icon"><use href="#i-tiktok"/></svg></a>
          <a href="#" data-social="linkedin" aria-label="LinkedIn"><svg class="icon"><use href="#i-linkedin"/></svg></a>'''

C_WA = e(g(CFG, "contacto", "whatsapp_visible") or "+502 0000-0000")
C_MAIL = e(g(CFG, "contacto", "correo") or "contacto@tudominio.com")
C_ADDR = e(g(CFG, "contacto", "direccion") or "Tu dirección aquí")
C_HOURS = e(g(CFG, "contacto", "horario") or "")
SLOGAN = e(g(CFG, "sitio", "eslogan") or "Tecnología que transforma, soluciones que impulsan.")


def footer():
    fl = [(s["_href"], s["_nombre"]) for s in SERVICES]
    fl.insert(min(1, len(fl)), ("capacitacion.html", "Capacitación tecnológica"))
    serv_links = "".join(f'\n          <li><a href="{h}">{e(n)}</a></li>' for h, n in fl)
    return f'''  <footer class="footer">
    <div class="container footer__inner">
      <div class="footer__brand">
        {logo(footer=True)}
        <p class="footer__slogan">{SLOGAN}</p>
        <div class="socials socials--footer" aria-label="Redes sociales">
          <a href="contacto.html" data-wa aria-label="WhatsApp"><svg class="icon"><use href="#i-whatsapp"/></svg></a>
          {SOCIALS}
        </div>
      </div>

      <nav class="footer__col" aria-label="Enlaces del sitio">
        <h3>TechRevive</h3>
        <ul>
          <li><a href="quienes-somos.html">¿Quiénes somos?</a></li>
          <li><a href="capacitacion.html">Capacitación</a></li>
          <li><a href="cursos.html">Cursos</a></li>
          <li><a href="blog.html">Blog y tutoriales</a></li>
          <li><a href="novedades.html">Novedades</a></li>
          <li><a href="galeria.html">Galería</a></li>
          <li><a href="preguntas-frecuentes.html">Preguntas frecuentes</a></li>
        </ul>
      </nav>

      <nav class="footer__col" aria-label="Servicios">
        <h3>Servicios</h3>
        <ul>{serv_links}
        </ul>
      </nav>

      <div class="footer__col">
        <h3>Contacto</h3>
        <ul class="footer__contact">
          <li><svg class="icon" aria-hidden="true"><use href="#i-whatsapp"/></svg><a href="contacto.html" data-wa data-cfg="whatsappDisplay">{C_WA}</a></li>
          <li><svg class="icon" aria-hidden="true"><use href="#i-mail"/></svg><a href="contacto.html" data-cfg="email" data-cfg-mail>{C_MAIL}</a></li>
          <li><svg class="icon" aria-hidden="true"><use href="#i-pin"/></svg><a href="ubicacion.html" data-cfg="address">{C_ADDR}</a></li>
          <li><svg class="icon" aria-hidden="true"><use href="#i-clock"/></svg><span data-cfg="hours">{C_HOURS}</span></li>
        </ul>
      </div>
    </div>

    <div class="container footer__bottom">
      <p>© {YEAR} TechRevive. Todos los derechos reservados. · <a href="mapa-del-sitio.html">Mapa del sitio</a></p>
      <p class="footer__formula">Tecnología + Conocimiento + Soluciones</p>
    </div>
  </footer>

  <a href="contacto.html" class="wa-float" data-wa aria-label="Escríbenos por WhatsApp">
    <svg class="icon" aria-hidden="true"><use href="#i-whatsapp"/></svg>
    <span class="wa-float__tip">¿Necesitas ayuda? Escríbenos</span>
  </a>'''


def head(slug, title, desc, image="img/hero.jpg", jsonld=None, preload=None, noindex=False):
    url = SITE_URL + "/" + ("" if slug == "index.html" else slug)
    full_title = title if "TechRevive" in title else f"{title} | TechRevive"
    ld = ""
    for b in (jsonld if isinstance(jsonld, list) else ([jsonld] if jsonld else [])):
        ld += f'\n  <script type="application/ld+json">{json.dumps(b, ensure_ascii=False).replace("<", "\\u003c")}</script>'
    pre = f'\n  <link rel="preload" as="image" href="{e(preload)}" />' if preload else ""
    robots = "noindex, follow" if noindex else "index, follow"
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{e(full_title)}</title>
  <meta name="description" content="{e(desc)}" />
  <meta name="theme-color" content="#071233" />
  <meta name="robots" content="{robots}" />
  <link rel="canonical" href="{url}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="es_GT" />
  <meta property="og:site_name" content="TechRevive" />
  <meta property="og:title" content="{e(full_title)}" />
  <meta property="og:description" content="{e(desc)}" />
  <meta property="og:image" content="{SITE_URL}/{e(image)}" />
  <meta property="og:url" content="{url}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="{e(FAVICON)}" type="image/png" />
  <link rel="apple-touch-icon" href="img/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet" />{pre}
  <link rel="stylesheet" href="css/styles.css" />{ld}
  <script src="js/config.js" defer></script>
  <script src="js/main.js" defer></script>
</head>'''


def page(slug, title, desc, body, active=None, image="img/hero.jpg", jsonld=None, preload=None,
         section=None, sitemap=True, noindex=False):
    doc = (head(slug, title, desc, image or "img/hero.jpg", jsonld, preload, noindex) + "\n\n<body>\n  " + sprite() + "\n\n"
           + header(active if active is not None else slug) + '\n\n  <main id="contenido">\n' + body + "\n  </main>\n\n"
           + footer() + "\n</body>\n</html>\n")
    with open(os.path.join(OUT, slug), "w", encoding="utf-8") as f:
        f.write(doc)
    if sitemap:
        PAGES.append((slug, title, section))


# ------------------------------------------------------------------ Componentes
def hl(titulo, resaltado):
    """Título con la parte resaltada en degradado."""
    t = e(titulo)
    return f'{t} <span class="text-grad">{e(resaltado)}</span>' if resaltado else t


def breadcrumb(trail):
    parts = ['<a href="index.html">Inicio</a>']
    for n, (label, href) in enumerate(trail):
        parts.append(icon("chevron"))
        if n == len(trail) - 1:
            parts.append(f'<span aria-current="page">{e(label)}</span>')
        elif href:
            parts.append(f'<a href="{href}">{e(label)}</a>')
        else:
            parts.append(f'<span>{e(label)}</span>')
    return f'<nav class="breadcrumb reveal" aria-label="Ruta de navegación">{"".join(parts)}</nav>'


def page_hero(trail, eyebrow, title_html, lead, image=None, alt="", buttons="", chips=None, center=False, extra=""):
    cls = "page-hero" + ("" if image else " page-hero--text") + (" page-hero--center" if center else "")
    chips_html = ""
    if chips:
        chips_html = '<ul class="page-hero__chips reveal" style="--d:4">' + "".join(f"<li>{e(c)}</li>" for c in chips) + "</ul>"
    btns = f'<div class="page-hero__buttons reveal" style="--d:3">{buttons}</div>' if buttons else ""
    lead_html = f'<p class="page-hero__lead reveal" style="--d:2">{e(lead)}</p>' if lead else ""
    media = ""
    if image:
        media = f'''
        <div class="page-hero__media reveal" style="--d:2">
          <div class="hero__frame"><img src="{e(image)}" width="960" height="720" alt="{e(alt)}" fetchpriority="high" /></div>
        </div>'''
    return f'''    <section class="{cls}" aria-labelledby="page-title">
      <div class="hero__bg" aria-hidden="true">
        <div class="hero__grid"></div>
        <div class="hero__glow hero__glow--1"></div>
      </div>
      <div class="container page-hero__inner">
        <div class="page-hero__content">
          {breadcrumb(trail)}
          <p class="eyebrow eyebrow--dark reveal">{e(eyebrow)}</p>
          <h1 class="page-hero__title reveal" id="page-title" style="--d:1">{title_html}</h1>
          {lead_html}
          {btns}{chips_html}{extra}
        </div>{media}
      </div>
    </section>
'''


def section_head(eyebrow, title, lead="", center=False, hid=None, light=False):
    c = " section-head--center" if center else ""
    t = " section-title--light" if light else ""
    l = " section-lead--light" if light else ""
    ey = " eyebrow--dark" if light else ""
    idattr = f' id="{hid}"' if hid else ""
    ey_html = f'\n          <p class="eyebrow{ey}">{e(eyebrow)}</p>' if eyebrow else ""
    lead_html = f'\n          <p class="section-lead{l}">{e(lead)}</p>' if lead else ""
    return f'''        <header class="section-head{c} reveal">{ey_html}
          <h2 class="section-title{t}"{idattr}>{e(title)}</h2>{lead_html}
        </header>'''


def cards(items, cols=None, center=False, linked=False, fallback="check"):
    """items = lista de dict {icono, titulo, texto, enlace?}"""
    items = [x for x in arr(items) if isinstance(x, dict) and x.get("titulo")]
    if not items:
        return ""
    if cols is None:
        n = len(items)
        cols = 4 if n % 4 == 0 and n >= 4 else (2 if n in (2,) else 3)
        if n == 1:
            cols = 2
    out = []
    for i, it in enumerate(items):
        cc = " card--center" if center else ""
        d = f' style="--d:{i % 4}"'
        body = f'<span class="card__icon">{icon(it.get("icono"), fallback)}</span><h3>{e(it["titulo"])}</h3>'
        if it.get("texto"):
            body += f'<p>{e(it["texto"])}</p>'
        if linked and it.get("enlace"):
            out.append(f'<a {link_attrs(it["enlace"])} class="card{cc} reveal"{d}>{body}<span class="link-arrow">Ver más {ARROW}</span></a>')
        else:
            out.append(f'<article class="card{cc} reveal"{d}>{body}</article>')
    colcls = {2: " cards--2", 3: "", 4: " cards--4"}.get(cols, "")
    return f'<div class="cards{colcls}">\n          ' + "\n          ".join(out) + "\n        </div>"


def checklist(items, two=False):
    items = arr(items)
    if not items:
        return ""
    c = " checklist--2" if two else ""
    return f'<ul class="checklist{c}">' + "".join(f"<li>{e(x)}</li>" for x in items) + "</ul>"


def faq_items(faqs, open_first=False, rich=False):
    out = []
    for i, f in enumerate(x for x in arr(faqs) if x.get("pregunta")):
        op = " open" if (open_first and i == 0) else ""
        ans = clean_html(f.get("respuesta", "")) if rich else f'<p>{e(f.get("respuesta", ""))}</p>'
        out.append(f'<details class="faq"{op}><summary>{e(f["pregunta"])}</summary><div class="faq__body">{ans}</div></details>')
    return '<div class="accordion">\n          ' + "\n          ".join(out) + "\n        </div>" if out else ""


def strip_tags(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def faq_jsonld(faqs):
    faqs = [f for f in arr(faqs) if f.get("pregunta")]
    if not faqs:
        return None
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": f["pregunta"],
                            "acceptedAnswer": {"@type": "Answer", "text": strip_tags(f.get("respuesta"))}} for f in faqs]}


def clean_html(s):
    """Limpieza básica del HTML del editor de texto (quita scripts y estilos en línea)."""
    s = str(s or "")
    s = re.sub(r"<(script|style|iframe)[^>]*>.*?</\1>", "", s, flags=re.S | re.I)
    s = re.sub(r"\son\w+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", "", s, flags=re.I)
    s = re.sub(r'\sstyle\s*=\s*"[^"]*"', "", s, flags=re.I)
    s = re.sub(r'(src|href)\s*=\s*"/(img/[^"]+)"', r'\1="\2"', s)
    s = re.sub(r'(src|href)\s*=\s*"/?src/(img/[^"]+)"', r'\1="\2"', s)
    if s and not s.lstrip().startswith("<"):
        s = f"<p>{s}</p>"
    return s


def steps_row(items):
    items = [x for x in arr(items) if x.get("titulo")]
    lis = "".join(f'<li class="step-card reveal" style="--d:{i % 4}"><h3>{e(x["titulo"])}</h3><p>{e(x.get("texto", ""))}</p></li>' for i, x in enumerate(items))
    return f'<ol class="steps-row" style="--n:{min(len(items), 4)}">{lis}</ol>' if items else ""


def cta_block(title, text, buttons=None):
    if not title:
        return ""
    if buttons is None:
        buttons = (f'<a href="contacto.html" class="btn btn--white btn--lg" data-wa>{icon("whatsapp")} Hablar con TechRevive</a>\n'
                   f'            <a href="contacto.html#formulario" class="btn btn--ghost-light btn--lg">Solicitar cotización</a>')
    text_html = f'<p class="cta__text">{e(text)}</p>' if text else ""
    return f'''    <section class="cta" aria-label="Llamado a la acción">
      <div class="container">
        <div class="cta__box reveal">
          <div class="cta__glow" aria-hidden="true"></div>
          <div class="cta__grid" aria-hidden="true"></div>
          <h2 class="cta__title">{e(title)}</h2>
          {text_html}
          <div class="cta__buttons">
            {buttons}
          </div>
        </div>
      </div>
    </section>
'''


# ------------------------------------------------------------------ Formularios
def field(fid, label, name, kind="text", required=False, placeholder="", error="", options=None, autocomplete=""):
    star = ' <span aria-hidden="true">*</span>' if required else ""
    req = " required" if required else ""
    err = f' data-error="{e(error)}"' if error else ""
    ac = f' autocomplete="{autocomplete}"' if autocomplete else ""
    ph = f' placeholder="{e(placeholder)}"' if placeholder else ""
    if kind == "select":
        opts = '<option value="" disabled selected>Selecciona una opción</option>' + "".join(f"<option>{e(o)}</option>" for o in options)
        control = f'<div class="select"><select id="{fid}" name="{name}"{req}{err}>{opts}</select></div>'
    elif kind == "textarea":
        control = f'<textarea id="{fid}" name="{name}" rows="5"{ph}{req}{err}></textarea>'
    elif kind == "tel":
        control = (f'<input id="{fid}" name="{name}" type="tel" autocomplete="tel" inputmode="tel"{ph} '
                   f'pattern="[0-9+()\\s-]{{8,}}"{req}{err} />')
    else:
        control = f'<input id="{fid}" name="{name}" type="{kind}"{ac}{ph}{req}{err} />'
    return (f'<div class="field"><label for="{fid}">{label}{star}</label>{control}'
            f'<span class="field__error" aria-live="polite"></span></div>')


HONEYPOT = '''<div class="hp" aria-hidden="true"><label for="{p}-web">No llenar</label><input id="{p}-web" name="_gotcha" type="text" tabindex="-1" autocomplete="off" /></div>'''


def contact_form(prefix="c", title="Solicita tu servicio"):
    return f'''<form class="form js-form reveal" style="--d:1" novalidate data-form-name="Solicitud de servicio" data-wa-intro="Hola TechRevive, quiero solicitar un servicio.">
          <h3 class="form__title">{title}</h3>
          <p class="form__sub">Los campos marcados con <span aria-hidden="true">*</span><span class="sr-only">asterisco</span> son obligatorios.</p>
          <div class="form__row">
            {field(prefix + "-nombre", "Nombre", "nombre", required=True, placeholder="Tu nombre completo", error="Escribe tu nombre.", autocomplete="name")}
            {field(prefix + "-telefono", "Teléfono / WhatsApp", "telefono", "tel", True, "Ej. 5555 5555", "Escribe un número válido (mínimo 8 dígitos).")}
          </div>
          <div class="form__row">
            {field(prefix + "-email", "Correo electrónico", "email", "email", False, "tucorreo@ejemplo.com", "Revisa el formato del correo.", autocomplete="email")}
            {field(prefix + "-servicio", "Tipo de servicio", "servicio", "select", True, error="Selecciona el tipo de servicio.", options=form_options())}
          </div>
          {field(prefix + "-mensaje", "Mensaje", "mensaje", "textarea", True, "Cuéntanos qué necesitas: el problema de tu equipo, el curso que te interesa o la idea de tu proyecto.", "Cuéntanos brevemente qué necesitas.")}
          {HONEYPOT.format(p=prefix)}
          <button type="submit" class="btn btn--primary btn--lg btn--block form__submit">
            <span class="form__submit-text">Enviar solicitud</span>
            {icon("send")}
          </button>
          <p class="form__status" role="status" aria-live="polite"></p>
        </form>'''


def contact_list():
    return f'''<ul class="contact__list">
            <li><span class="contact__icon">{icon("whatsapp")}</span><span><small>WhatsApp</small><a href="contacto.html" data-wa data-cfg="whatsappDisplay">{C_WA}</a></span></li>
            <li><span class="contact__icon">{icon("mail")}</span><span><small>Correo electrónico</small><a href="contacto.html" data-cfg="email" data-cfg-mail>{C_MAIL}</a></span></li>
            <li><span class="contact__icon">{icon("pin")}</span><span><small>Dirección</small><span data-cfg="address">{C_ADDR}</span></span></li>
            <li><span class="contact__icon">{icon("clock")}</span><span><small>Horario de atención</small><span data-cfg="hours">{C_HOURS}</span></span></li>
          </ul>'''


def contact_section(sec_id="contacto", heading_tag="h2", title="Hablemos de lo que necesitas."):
    return f'''    <section class="section section--soft contact" id="{sec_id}" aria-labelledby="{sec_id}-title">
      <div class="container contact__inner">
        <aside class="contact__info reveal">
          <p class="eyebrow eyebrow--dark">Contacto</p>
          <{heading_tag} class="contact__title" id="{sec_id}-title">{title}</{heading_tag}>
          <p class="contact__lead">Escríbenos por WhatsApp o completa el formulario. Te responderemos lo antes posible con una orientación clara.</p>
          <a href="contacto.html" class="btn btn--whatsapp btn--lg btn--block" data-wa>{icon("whatsapp")} Escribir por WhatsApp</a>
          {contact_list()}
          <div class="socials" aria-label="Redes sociales">
          {SOCIALS}
          </div>
        </aside>
        {contact_form(sec_id[:2])}
      </div>
    </section>
'''


def process_section(soft=False):
    P = load("proceso.json")
    pasos = [p for p in arr(g(P, "pasos", default=[])) if p.get("titulo")]
    if not pasos:
        return ""
    c = " section--soft" if soft else ""
    lis = "".join(f'''
          <li class="timeline__step reveal" style="--d:{i % 5}"><span class="timeline__node">{icon(p.get("icono"), "search")}</span><h3>{e(p["titulo"])}</h3><p>{e(p.get("texto", ""))}</p></li>''' for i, p in enumerate(pasos))
    return f'''    <section class="section process{c}" aria-labelledby="process-title">
      <div class="container">
{section_head(g(P, "etiqueta"), g(P, "titulo") or "Nuestro proceso", g(P, "texto"), center=True, hid="process-title")}
        <ol class="timeline" style="--n:{len(pasos)}">{lis}
        </ol>
      </div>
    </section>
'''


MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
MESES_C = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]


def parse_date(s):
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", str(s or ""))
    return (int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else None


def fecha_larga(s):
    d = parse_date(s)
    return f"{d[2]} de {MESES[d[1] - 1]} de {d[0]}" if d else ""
