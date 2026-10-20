# -*- coding: utf-8 -*-
"""Novedades, Galería, Redes sociales, Contacto, Ubicación, Mapa del sitio y 404."""
from base import *

NOVEDADES = [n for n in arr(load("novedades.json", default=[])) if isinstance(n, dict) and n.get("titulo")]
GALERIA = [x for x in arr(load("galeria.json", default=[])) if isinstance(x, dict) and x.get("imagen")]
CATS_GAL = ["Reparación y soporte", "Capacitación", "Desarrollo digital", "Instalaciones"]


def build_novedades():
    hero = page_hero([("Sala de prensa", None), ("Novedades y comunicados", None)], "Sala de prensa",
                     'Novedades y <span class="text-grad">comunicados.</span>',
                     "Anuncios importantes, inscripciones abiertas, actividades y noticias de TechRevive. Vuelve pronto o síguenos en redes sociales para enterarte primero.",
                     buttons=f'<a href="redes-sociales.html" class="btn btn--ghost-light btn--lg">{icon("share")} Síguenos en redes</a>')
    items = []
    for i, n in enumerate(NOVEDADES):
        feat = " news--featured" if i == 0 else ""
        tag = ' <span class="tag-example">Ejemplo</span>' if n.get("ejemplo") else ""
        dt = parse_date(n.get("fecha"))
        date = (f'<div class="news__date"><strong>{dt[2]}</strong><span>{MESES_C[dt[1] - 1]} {dt[0]}</span></div>' if dt
                else f'<div class="news__date">{icon("calendar")}<span>Próximamente</span></div>')
        btn = f'<a {link_attrs(n.get("boton_enlace"))} class="link-arrow">{e(n["boton_texto"])} {ARROW}</a>' if n.get("boton_texto") else ""
        chip = f'<span class="chip">{e(n["categoria"])}</span>' if n.get("categoria") else ""
        items.append(f'''          <article class="news{feat} reveal">
            {date}
            <div>
              <div class="post__meta" style="margin:0">{chip}{tag}</div>
              <h2>{e(n["titulo"])}</h2>
              {f'<p>{e(n["texto"])}</p>' if n.get("texto") else ""}
              {btn}
            </div>
          </article>''')
    notice = (f'<div class="notice notice--center reveal" style="margin-bottom:2rem">{icon("alert")}<p>Las publicaciones marcadas como <strong>Ejemplo</strong> son demostrativas y muestran cómo se verán tus próximos comunicados.</p></div>'
              if any(n.get("ejemplo") for n in NOVEDADES) else "")
    lista = "\n".join(items) if items else '          <p class="empty-note">Muy pronto publicaremos nuestras novedades. Síguenos en redes sociales para enterarte primero.</p>'
    body = hero + f'''    <section class="section section--soft" aria-label="Lista de novedades">
      <div class="container">
        {notice}
        <div class="news-list">
{lista}
        </div>
      </div>
    </section>
''' + cta_block("¿Quieres recibir nuestras novedades?", "Escríbenos por WhatsApp y te avisaremos sobre nuevos cursos, promociones y actividades.",
                f'<a href="contacto.html" class="btn btn--white btn--lg" data-wa data-wa-msg="Hola TechRevive, quiero recibir información sobre nuevos cursos y novedades.">{icon("whatsapp")} Quiero recibir novedades</a>\n'
                f'            <a href="redes-sociales.html" class="btn btn--ghost-light btn--lg">Ver redes sociales</a>')
    page("novedades.html", "Novedades y comunicados",
         "Noticias, comunicados, inscripciones abiertas y actividades de TechRevive.", body, section="Sala de prensa")


def build_galeria():
    hero = page_hero([("Sala de prensa", None), ("Galería de fotos", None)], "Galería",
                     'Nuestro trabajo <span class="text-grad">en imágenes.</span>',
                     "Reparaciones, capacitaciones, proyectos digitales y el día a día de TechRevive. Haz clic en cualquier foto para verla en grande.")
    usadas = [c for c in CATS_GAL if any(x.get("categoria") == c for x in GALERIA)]
    usadas += list(dict.fromkeys(x["categoria"] for x in GALERIA if x.get("categoria") and x["categoria"] not in CATS_GAL))
    fbtns = ""
    if len(usadas) > 1:
        fbtns = ('<div class="filters reveal" role="group" aria-label="Filtrar fotos por categoría">'
                 '<button class="filter is-active" data-filter="all" aria-pressed="true">Todas</button>'
                 + "".join(f'<button class="filter" data-filter="{slugify(c)}" aria-pressed="false">{e(c)}</button>' for c in usadas) + "</div>")
    items = ""
    for i, x in enumerate(GALERIA):
        cap = x.get("titulo") or "Foto de TechRevive"
        demo = bool(x.get("demostrativa"))
        full_cap = cap + (" (imagen demostrativa)" if demo else "")
        items += f'''
          <button class="gallery__item reveal" style="--d:{i % 3}" data-category="{slugify(x.get("categoria"))}" data-caption="{e(full_cap)}" aria-label="Ver imagen: {e(cap)}">
            <img src="{e(img(x["imagen"]))}" width="960" height="640" loading="lazy" alt="{e(cap)}" />
            {'<span class="badge-demo">Imagen demostrativa</span>' if demo else ""}
            <span class="gallery__cap">{f'<small>{e(x["categoria"])}</small>' if x.get("categoria") else ""}{e(cap)}</span>
          </button>'''
    notice = (f'<div class="notice notice--center reveal" style="margin-bottom:2rem">{icon("image")}<p><strong>Imágenes demostrativas.</strong> Muy pronto aquí aparecerán fotos reales de nuestros trabajos, cursos y actividades.</p></div>'
              if any(x.get("demostrativa") for x in GALERIA) else "")
    grid = f'<div class="gallery">{items}\n        </div>' if items else '<p class="empty-note">Muy pronto compartiremos aquí fotos de nuestros trabajos y actividades.</p>'
    body = hero + f'''    <section class="section section--soft" aria-label="Galería de fotos">
      <div class="container">
        {notice}
        {fbtns}
        {grid}
      </div>
    </section>
''' + cta_block("¿Quieres que tu proyecto aparezca aquí?", "Cuéntanos tu idea o tu necesidad y trabajemos juntos en una solución.")
    page("galeria.html", "Galería de fotos",
         "Galería de TechRevive: reparaciones, capacitaciones, proyectos de desarrollo web y nuestras instalaciones.",
         body, image=(img(GALERIA[0]["imagen"]) if GALERIA else "img/taller.jpg"), section="Sala de prensa")


def build_redes():
    hero = page_hero([("Sala de prensa", None), ("Redes sociales", None)], "Redes sociales",
                     "Síguenos y <span class=\"text-grad\">mantente al día.</span>",
                     "Compartimos consejos de tecnología, novedades de cursos, trabajos realizados y promociones. Elige tu red favorita y únete a la comunidad TechRevive.")
    nets = [
        ("whatsapp", "WhatsApp", "Escríbenos directamente para consultas, cotizaciones e inscripciones.", "Enviar mensaje", 'data-wa'),
        ("facebook", "Facebook", "Novedades, comunicados, fotos de actividades y promociones.", "Seguir", 'data-social="facebook"'),
        ("instagram", "Instagram", "Fotos de nuestros trabajos, el día a día y consejos rápidos.", "Seguir", 'data-social="instagram"'),
        ("tiktok", "TikTok", "Videos cortos con trucos de tecnología y tutoriales prácticos.", "Seguir", 'data-social="tiktok"'),
        ("linkedin", "LinkedIn", "Servicios para empresas, alianzas y oportunidades profesionales.", "Seguir", 'data-social="linkedin"'),
    ]
    cardsh = "".join(f'''
          <article class="card social-card social-card--{k} reveal" style="--d:{i}">
            <span class="card__icon">{icon(k)}</span>
            <h2 style="font-size:1.15rem; margin-bottom:.45rem">{n}</h2>
            <p>{d}</p>
            <a href="contacto.html" class="btn btn--outline btn--sm" {attr}>{b} {ARROW}</a>
          </article>''' for i, (k, n, d, b, attr) in enumerate(nets))
    body = hero + f'''    <section class="section section--soft" aria-label="Nuestras redes">
      <div class="container">
        <div class="social-grid">{cardsh}
        </div>
        <p class="reveal" style="text-align:center; margin-top:2rem; color:var(--muted); font-size:.92rem">¿Quieres compartir algo con nosotros? Etiquétanos en tus publicaciones o escríbenos por mensaje directo.</p>
      </div>
    </section>
    <section class="section" aria-labelledby="blog-title">
      <div class="container split">
        <div class="split__body">
          <p class="eyebrow reveal">Contenido útil</p>
          <h2 class="section-title reveal" id="blog-title" style="--d:1">¿Te gusta aprender sobre tecnología?</h2>
          <p class="reveal" style="--d:2">Además de nuestras redes, publicamos guías y tutoriales en nuestro blog: desde cómo cuidar tu computadora hasta cómo llevar tu negocio a internet.</p>
          <a href="blog.html" class="btn btn--primary reveal" style="--d:3">Visitar el blog {ARROW}</a>
        </div>
        <div class="split__media reveal" style="--d:1">
          <img src="img/blog-respaldo.jpg" width="960" height="640" loading="lazy" alt="Laptop con un respaldo de información en progreso" />
        </div>
      </div>
    </section>
'''
    page("redes-sociales.html", "Redes sociales",
         "Sigue a TechRevive en Facebook, Instagram, TikTok y LinkedIn, o escríbenos por WhatsApp.", body, section="Sala de prensa")


# ------------------------------------------------------------------ Contacto
def build_contacto():
    hero = page_hero([("Contacto", None)], "Contacto",
                     "Hablemos de <span class=\"text-grad\">lo que necesitas.</span>",
                     "¿Tienes un problema con tu equipo, quieres inscribirte en un curso o tienes una idea para tu negocio? Escríbenos y te responderemos con una orientación clara.",
                     buttons=f'<a href="contacto.html" class="btn btn--whatsapp btn--lg" data-wa>{icon("whatsapp")} Escribir por WhatsApp</a>'
                             f'<a href="#formulario" class="btn btn--ghost-light btn--lg">Llenar formulario</a>')
    dirs = [
        ("dollar", "Ventas y cotizaciones", "Páginas web, aplicaciones, planes para empresas y cotizaciones en general.",
         ["Cotizaciones", "Proyectos digitales", "Planes empresariales"], "Hola TechRevive, quiero solicitar una cotización."),
        ("wrench", "Soporte técnico", "Reparación, mantenimiento, diagnóstico y soporte remoto de tus equipos.",
         ["Diagnósticos", "Reparaciones", "Soporte remoto"], "Hola TechRevive, necesito soporte técnico para mi equipo."),
        ("cap", "Capacitación", "Información de cursos, horarios, inscripciones y capacitación para grupos.",
         ["Cursos disponibles", "Inscripciones", "Grupos e instituciones"], "Hola TechRevive, quiero información sobre los cursos."),
    ]
    dir_cards = "".join(f'''
          <article class="card reveal" style="--d:{i}">
            <span class="card__icon">{icon(ic)}</span>
            <h3>{t}</h3>
            <p>{d}</p>
            {checklist(lst)}
            <a href="contacto.html" class="btn btn--outline" data-wa data-wa-msg="{e(msg)}">{icon("whatsapp")} Escribir a {t.split(" ")[0].lower() if i else "ventas"}</a>
          </article>''' for i, (ic, t, d, lst, msg) in enumerate(dirs))
    directory = f'''    <section class="section" aria-labelledby="dir-title">
      <div class="container">
{section_head("Directorio", "¿Con quién quieres hablar?", "Elige el área que mejor se ajuste a tu consulta y te atenderemos más rápido.", center=True, hid="dir-title")}
        <div class="cards directory">{dir_cards}
        </div>
      </div>
    </section>
'''
    links = f'''    <section class="section section--soft" style="padding-top:0" aria-label="Más información">
      <div class="container">
        <div class="quick">
          <a href="ubicacion.html" class="card reveal"><span class="card__icon">{icon("pin")}</span><h3>Ubicación y horarios</h3><p>Encuéntranos en el mapa.</p></a>
          <a href="preguntas-frecuentes.html" class="card reveal" style="--d:1"><span class="card__icon">{icon("help")}</span><h3>Preguntas frecuentes</h3><p>Respuestas rápidas.</p></a>
          <a href="inscripcion.html" class="card reveal" style="--d:2"><span class="card__icon">{icon("clipboard")}</span><h3>Inscripción a cursos</h3><p>Reserva tu lugar.</p></a>
          <a href="redes-sociales.html" class="card reveal" style="--d:3"><span class="card__icon">{icon("share")}</span><h3>Redes sociales</h3><p>Síguenos.</p></a>
        </div>
      </div>
    </section>
'''
    body = hero + directory + contact_section("formulario", title="Envíanos tu solicitud.") + links
    page("contacto.html", "Contacto: solicita tu servicio",
         "Contacta a TechRevive por WhatsApp, correo o formulario. Solicita reparación, soporte técnico, capacitación, página web o aplicaciones.",
         body, section="Contacto")


def build_ubicacion():
    hero = page_hero([("Contacto", "contacto.html"), ("Ubicación y horarios", None)], "Ubicación",
                     "Encuéntranos <span class=\"text-grad\">fácilmente.</span>",
                     "Visítanos en nuestro horario de atención o, si lo prefieres, te atendemos de forma remota sin que tengas que salir de casa.")
    body = hero + f'''    <section class="section section--soft" aria-label="Mapa y datos de ubicación">
      <div class="container map-wrap">
        <div class="map-embed reveal">
          <iframe data-map title="Mapa de ubicación de TechRevive" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
        </div>
        <aside class="info-card reveal" style="--d:1">
          <h2>TechRevive</h2>
          {contact_list()}
          <a href="#" class="btn btn--primary btn--lg btn--block" data-map-link>{icon("map")} Cómo llegar</a>
        </aside>
      </div>
    </section>
    <section class="section" aria-labelledby="mod-title">
      <div class="container">
{section_head("Formas de atención", "Te atendemos como te sea más cómodo.", center=True, hid="mod-title")}
        {cards([{"icono": "building", "titulo": "En nuestras instalaciones", "texto": "Trae tu equipo para diagnóstico o asiste a tus clases presenciales."},
                {"icono": "monitor", "titulo": "De forma remota", "texto": "Soporte técnico y clases virtuales desde donde estés."},
                {"icono": "calendar", "titulo": "Con cita previa", "texto": "Agenda tu visita por WhatsApp y te atendemos sin esperas."}], 3, center=True)}
      </div>
    </section>
''' + cta_block("¿Prefieres que te atendamos a distancia?", "Muchos problemas se resuelven de forma remota. Escríbenos y lo revisamos.")
    page("ubicacion.html", "Ubicación y horarios",
         "Dirección, mapa y horarios de atención de TechRevive. Atención presencial y remota.", body, section="Contacto")


def build_404():
    body = f'''    <section class="page-hero page-hero--text page-hero--center page-hero--404" aria-labelledby="page-title">
      <div class="hero__bg" aria-hidden="true"><div class="hero__grid"></div><div class="hero__glow hero__glow--1"></div></div>
      <div class="container page-hero__inner">
        <div class="page-hero__content">
          <p class="err-code">404</p>
          <h1 class="page-hero__title" id="page-title">Esta página no existe… todavía.</h1>
          <p class="page-hero__lead">Es posible que el enlace haya cambiado o que la dirección esté mal escrita. Te ayudamos a encontrar lo que buscas.</p>
          <div class="page-hero__buttons">
            <a href="index.html" class="btn btn--primary btn--lg">{icon("home")} Ir al inicio</a>
            <a href="mapa-del-sitio.html" class="btn btn--ghost-light btn--lg">Ver mapa del sitio</a>
          </div>
        </div>
      </div>
    </section>
'''
    page("404.html", "Página no encontrada", "La página que buscas no existe.", body, active="", sitemap=False, noindex=True)


def build_mapa(posts):
    groups = [("home", "Inicio", "index.html", [("¿Quiénes somos?", "quienes-somos.html")])]
    icons = {"Servicios": "grid", "Capacitación": "cap", "Recursos": "book", "Sala de prensa": "news", "Contacto": "mail"}
    for label, href, sub in nav_items()[2:]:
        links = list(dict.fromkeys((s[0], s[1]) for s in sub if s))
        if label == "Recursos":
            links += [(p["title"], p["slug"]) for p in posts]
        groups.append((icons.get(label, "grid"), label, href, links))
    html_groups = "".join(f'''
          <div class="sitemap__group reveal" style="--d:{i % 3}">
            <h2>{icon(ic)} <a href="{h}">{e(t)}</a></h2>
            <ul>{"".join(f'<li><a href="{lh}">{icon("chevron")} {e(lt)}</a></li>' for lt, lh in links)}</ul>
          </div>''' for i, (ic, t, h, links) in enumerate(groups))
    hero = page_hero([("Contacto", "contacto.html"), ("Mapa del sitio", None)], "Mapa del sitio",
                     'Todas nuestras páginas, <span class="text-grad">en un solo lugar.</span>',
                     "Encuentra rápidamente la información que buscas sobre nuestros servicios, cursos, recursos y formas de contacto.")
    body = hero + f'''    <section class="section section--soft" aria-label="Lista de páginas">
      <div class="container">
        <div class="sitemap">{html_groups}
        </div>
      </div>
    </section>
'''
    page("mapa-del-sitio.html", "Mapa del sitio", "Mapa del sitio de TechRevive: todas las páginas organizadas por sección.", body, section="Contacto")


# ------------------------------------------------------------------ Acceso al panel (/panel y /admin)
def panel_url():
    P = g(CFG, "panel", default={})
    user = re.sub(r"[^A-Za-z0-9-]", "", str(P.get("usuario_github") or ""))
    repo = re.sub(r"[^A-Za-z0-9._-]", "", str(P.get("repositorio") or "techrevive"))
    rama = re.sub(r"[^A-Za-z0-9._/-]", "", str(P.get("rama") or "main"))
    if user and repo:
        return f"https://app.pagescms.org/{user}/{repo}/{rama}", f"{user}/{repo}"
    return "https://app.pagescms.org", ""


def build_panel():
    url, repo = panel_url()
    repo_txt = f"Tu repositorio: <strong>{e(repo)}</strong>" if repo else "Inicia sesión con tu cuenta de GitHub"
    hero = f'''    <section class="page-hero page-hero--text page-hero--center" aria-labelledby="page-title">
      <div class="hero__bg" aria-hidden="true"><div class="hero__grid"></div><div class="hero__glow hero__glow--1"></div></div>
      <div class="container page-hero__inner">
        <div class="page-hero__content">
          <p class="eyebrow eyebrow--dark reveal">{icon("lock")} Administración</p>
          <h1 class="page-hero__title reveal" id="page-title" style="--d:1">Panel de <span class="text-grad">administración.</span></h1>
          <p class="page-hero__lead reveal" style="--d:2">Desde aquí modificas, agregas o quitas textos, fotos, servicios, cursos, artículos del blog, novedades y fotos de la galería. Al guardar, el sitio se actualiza solo en 1 o 2 minutos.</p>
          <div class="page-hero__buttons reveal" style="--d:3">
            <a href="{e(url)}" class="btn btn--primary btn--lg" rel="noopener">{icon("settings")} Entrar al panel {ARROW}</a>
            <a href="index.html" class="btn btn--ghost-light btn--lg">{icon("home")} Ver el sitio</a>
          </div>
          <p class="panel-repo reveal" style="--d:4">{icon("lock")} {repo_txt}</p>
        </div>
      </div>
    </section>
'''
    acciones = [
        {"icono": "file", "titulo": "Modificar", "texto": "Cambia cualquier texto, foto, dato de contacto, horario o enlace de redes sociales."},
        {"icono": "layers", "titulo": "Agregar", "texto": "Crea servicios (con su propia página), cursos, artículos, novedades, proyectos y fotos."},
        {"icono": "eye", "titulo": "Ocultar o quitar", "texto": "Apaga secciones con el interruptor «Mostrar» o elimina elementos de cualquier lista."},
        {"icono": "zap", "titulo": "Publicación automática", "texto": "Cada vez que guardas, el sitio se reconstruye y publica solo. No tienes que subir archivos."},
    ]
    mapa = [
        {"icono": "settings", "titulo": "Configuración general", "texto": "WhatsApp, correo, dirección, horario, mapa, redes, aula virtual y formularios."},
        {"icono": "home", "titulo": "Páginas", "texto": "Inicio, ¿Quiénes somos?, Servicios (y la página de cada uno), Nuestro proceso y Preguntas frecuentes."},
        {"icono": "cap", "titulo": "Capacitación", "texto": "La lista de cursos y la página de Capacitación."},
        {"icono": "file", "titulo": "Blog", "texto": "Crea artículos con «Add entry». Desactiva «Publicado» para guardarlos como borrador."},
        {"icono": "news", "titulo": "Sala de prensa", "texto": "Novedades y comunicados, y la galería de fotos."},
        {"icono": "image", "titulo": "Media", "texto": "Sube y administra todas las imágenes del sitio."},
    ]
    pasos = [
        {"titulo": "Inicia sesión", "texto": "Haz clic en «Entrar al panel» y elige «Sign in with GitHub»."},
        {"titulo": "Da acceso a tu repositorio", "texto": "La primera vez, instala Pages CMS y elige solo el repositorio «techrevive»."},
        {"titulo": "Abre tu sitio", "texto": "Selecciona el repositorio «techrevive» y la rama «main»."},
        {"titulo": "Edita y guarda", "texto": "Haz tus cambios y pulsa «Save». En 1 o 2 minutos se ven en el sitio."},
    ]
    body = hero + f'''    <section class="section section--soft" aria-labelledby="acc-title">
      <div class="container">
{section_head("Qué puedes hacer", "Todo tu sitio, en tus manos.", center=True, hid="acc-title")}
        {cards(acciones, 4, center=True)}
      </div>
    </section>
    <section class="section" aria-labelledby="mapa-panel-title">
      <div class="container">
{section_head("Dónde está cada cosa", "El menú del panel.", "Así se organiza el panel cuando entras.", hid="mapa-panel-title")}
        {cards(mapa, 3)}
      </div>
    </section>
    <section class="section section--soft" aria-labelledby="primera-title">
      <div class="container">
{section_head("¿Primera vez?", "Entra en cuatro pasos.", center=True, hid="primera-title")}
        {steps_row(pasos)}
        <div class="notice notice--center reveal" style="margin-top:2.5rem">{icon("shield")}<p><strong>Tu sitio está protegido:</strong> solo pueden editar las personas con acceso a tu repositorio de GitHub o que tú invites desde el panel (Settings → Collaborators). Esta página no aparece en el menú ni en Google; guárdala en tus favoritos.</p></div>
        <div class="section-foot"><a href="{e(url)}" class="btn btn--primary btn--lg" rel="noopener">{icon("settings")} Entrar al panel {ARROW}</a></div>
      </div>
    </section>
'''
    for slug in ("panel.html", "admin.html"):
        page(slug, "Panel de administración", "Acceso al panel de administración de TechRevive.", body,
             active="", sitemap=False, noindex=True)
