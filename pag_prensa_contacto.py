# -*- coding: utf-8 -*-
"""Novedades, Galería, Redes sociales, Contacto, Ubicación, Mapa del sitio y 404."""
from site_base import *

# ------------------------------------------------------------------ Novedades
# ejemplo=True muestra la etiqueta "Ejemplo" (contenido demostrativo)
NEWS = [
    ("19", "Oct 2026", "Comunicado", "¡Estrenamos nuestro nuevo sitio web!",
     "Ahora puedes conocer todos nuestros servicios, revisar los cursos disponibles, inscribirte en línea y leer consejos prácticos en nuestro blog. Gracias por acompañarnos en esta nueva etapa.",
     ("Explorar servicios", "servicios.html"), False),
    ("--", "Próximamente", "Capacitación", "Inscripciones abiertas: computación básica y ofimática",
     "Ejemplo de anuncio de inscripciones. Aquí podrás publicar las fechas de inicio, horarios y modalidades de tus próximos grupos.",
     ("Ver cursos", "cursos.html"), True),
    ("--", "Próximamente", "Actividades", "Jornada de mantenimiento preventivo",
     "Ejemplo de comunicado sobre una actividad especial, como una jornada de limpieza y diagnóstico de equipos para estudiantes o vecinos.",
     ("Solicitar diagnóstico", "reparacion.html"), True),
    ("--", "Próximamente", "Servicios", "Nuevos planes de soporte para negocios",
     "Ejemplo de novedad sobre un servicio. Úsalo para anunciar promociones, nuevos servicios o alianzas con otras organizaciones.",
     ("Ver soporte tecnológico", "soporte.html"), True),
]


def build_novedades():
    hero = page_hero([("Sala de prensa", None), ("Novedades y comunicados", None)], "Sala de prensa",
                     "Novedades y <span class=\"text-grad\">comunicados.</span>",
                     "Anuncios importantes, inscripciones abiertas, actividades y noticias de TechRevive. Vuelve pronto o síguenos en redes sociales para enterarte primero.",
                     buttons=f'<a href="redes-sociales.html" class="btn btn--ghost-light btn--lg">{icon("share")} Síguenos en redes</a>')
    items = []
    for i, (day, month, cat, title, text, (lt, lh), ex) in enumerate(NEWS):
        feat = " news--featured" if i == 0 else ""
        tag = ' <span class="tag-example">Ejemplo</span>' if ex else ""
        date = (f'<div class="news__date"><strong>{day}</strong><span>{month}</span></div>' if day != "--"
                else f'<div class="news__date">{icon("calendar")}<span>{month}</span></div>')
        items.append(f'''          <article class="news{feat} reveal">
            {date}
            <div>
              <div class="post__meta" style="margin:0"><span class="chip">{cat}</span>{tag}</div>
              <h2>{title}</h2>
              <p>{text}</p>
              <a href="{lh}" class="link-arrow">{lt} {ARROW}</a>
            </div>
          </article>''')
    body = hero + f'''    <section class="section section--soft" aria-label="Lista de novedades">
      <div class="container">
        <div class="notice notice--center reveal" style="margin-bottom:2rem">{icon("alert")}<p>Las publicaciones marcadas como <strong>Ejemplo</strong> son demostrativas y muestran cómo se verán tus próximos comunicados.</p></div>
        <div class="news-list">
{chr(10).join(items)}
        </div>
      </div>
    </section>
''' + cta_block("¿Quieres recibir nuestras novedades?", "Escríbenos por WhatsApp y te avisaremos sobre nuevos cursos, promociones y actividades.",
                f'<a href="contacto.html" class="btn btn--white btn--lg" data-wa data-wa-msg="Hola TechRevive, quiero recibir información sobre nuevos cursos y novedades.">{icon("whatsapp")} Quiero recibir novedades</a>\n'
                f'            <a href="redes-sociales.html" class="btn btn--ghost-light btn--lg">Ver redes sociales</a>')
    page("novedades.html", "Novedades y comunicados",
         "Noticias, comunicados, inscripciones abiertas y actividades de TechRevive.", body, section="Sala de prensa")


# ------------------------------------------------------------------ Galería
GALLERY = [
    ("img/taller.jpg", "instalaciones", "Instalaciones", "Nuestro espacio de trabajo y capacitación"),
    ("img/tecnico.jpg", "reparacion", "Reparación", "Cambio de pasta térmica en una laptop"),
    ("img/aprender.jpg", "capacitacion", "Capacitación", "Clase de computación para todas las edades"),
    ("img/p-web.jpg", "desarrollo", "Desarrollo", "Diseño de un sitio web responsive"),
    ("img/p-reparacion.jpg", "reparacion", "Reparación", "Actualización con memoria RAM y unidad SSD"),
    ("img/soporte.jpg", "instalaciones", "Soporte", "Atención de soporte técnico remoto"),
    ("img/p-capacitacion.jpg", "capacitacion", "Capacitación", "Práctica de ofimática en grupo"),
    ("img/p-app.jpg", "desarrollo", "Desarrollo", "Panel de control de una aplicación web"),
    ("img/p-empresa.jpg", "reparacion", "Soporte", "Instalación de red en una pequeña oficina"),
    ("img/aula-virtual.jpg", "capacitacion", "Capacitación", "Clase en línea desde el aula virtual"),
    ("img/emprendedor.jpg", "desarrollo", "Desarrollo", "Tienda en línea para un emprendimiento"),
    ("img/hero.jpg", "instalaciones", "Instalaciones", "Mesa de trabajo técnico y desarrollo"),
]


def build_galeria():
    hero = page_hero([("Sala de prensa", None), ("Galería de fotos", None)], "Galería",
                     "Nuestro trabajo <span class=\"text-grad\">en imágenes.</span>",
                     "Reparaciones, capacitaciones, proyectos digitales y el día a día de TechRevive. Haz clic en cualquier foto para verla en grande.")
    filtros = [("all", "Todas"), ("reparacion", "Reparación y soporte"), ("capacitacion", "Capacitación"),
               ("desarrollo", "Desarrollo digital"), ("instalaciones", "Instalaciones")]
    fbtns = "".join(f'<button class="filter{" is-active" if k == "all" else ""}" data-filter="{k}" aria-pressed="{"true" if k == "all" else "false"}">{l}</button>' for k, l in filtros)
    items = "".join(f'''
          <button class="gallery__item reveal" style="--d:{i % 3}" data-category="{cat}" data-caption="{e(cap)} (imagen demostrativa)" aria-label="Ver imagen: {e(cap)}">
            <img src="{src}" width="960" height="640" loading="lazy" alt="{e(cap)}" />
            <span class="badge-demo">Imagen demostrativa</span>
            <span class="gallery__cap"><small>{lab}</small>{cap}</span>
          </button>''' for i, (src, cat, lab, cap) in enumerate(GALLERY))
    body = hero + f'''    <!--
      PARA AGREGAR FOTOS REALES:
      1. Copia tu foto en la carpeta img/ (de preferencia JPG de unos 1200 px de ancho).
      2. Duplica un <button class="gallery__item"> y cambia src, alt, data-caption y el texto.
      3. data-category: reparacion | capacitacion | desarrollo | instalaciones
      4. Quita <span class="badge-demo"> cuando la foto sea real.
    -->
    <section class="section section--soft" aria-label="Galería de fotos">
      <div class="container">
        <div class="notice notice--center reveal" style="margin-bottom:2rem">{icon("image")}<p><strong>Imágenes demostrativas.</strong> Muy pronto aquí aparecerán fotos reales de nuestros trabajos, cursos y actividades.</p></div>
        <div class="filters reveal" role="group" aria-label="Filtrar fotos por categoría">{fbtns}</div>
        <div class="gallery">{items}
        </div>
      </div>
    </section>
''' + cta_block("¿Quieres que tu proyecto aparezca aquí?", "Cuéntanos tu idea o tu necesidad y trabajemos juntos en una solución.")
    page("galeria.html", "Galería de fotos",
         "Galería de TechRevive: reparaciones, capacitaciones, proyectos de desarrollo web y nuestras instalaciones.",
         body, image="img/taller.jpg", section="Sala de prensa")


# ------------------------------------------------------------------ Redes sociales
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
        {cards([("building", "En nuestras instalaciones", "Trae tu equipo para diagnóstico o asiste a tus clases presenciales."),
                ("monitor", "De forma remota", "Soporte técnico y clases virtuales desde donde estés."),
                ("calendar", "Con cita previa", "Agenda tu visita por WhatsApp y te atendemos sin esperas.")], 3, center=True)}
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


def build_mapa(pages):
    groups = [
        ("home", "Inicio", "index.html", [("¿Quiénes somos?", "quienes-somos.html")]),
    ]
    from site_base import NAV
    for label, href, sub in NAV[2:]:
        links = [(s[0], s[1]) for s in sub if s]
        groups.append(({"Servicios": "grid", "Capacitación": "cap", "Recursos": "book", "Sala de prensa": "news", "Contacto": "mail"}[label], label, href, links))
    # artículos del blog
    from pag_recursos import POSTS
    groups[3][3].extend((p["title"], p["slug"]) for p in POSTS)
    html_groups = "".join(f'''
          <div class="sitemap__group reveal" style="--d:{i % 3}">
            <h2>{icon(ic)} <a href="{h}">{t}</a></h2>
            <ul>{"".join(f'<li><a href="{lh}">{icon("chevron")} {lt}</a></li>' for lt, lh in links)}</ul>
          </div>''' for i, (ic, t, h, links) in enumerate(groups))
    hero = page_hero([("Contacto", "contacto.html"), ("Mapa del sitio", None)], "Mapa del sitio",
                     "Todas nuestras páginas, <span class=\"text-grad\">en un solo lugar.</span>",
                     "Encuentra rápidamente la información que buscas sobre nuestros servicios, cursos, recursos y formas de contacto.")
    body = hero + f'''    <section class="section section--soft" aria-label="Lista de páginas">
      <div class="container">
        <div class="sitemap">{html_groups}
        </div>
      </div>
    </section>
'''
    page("mapa-del-sitio.html", "Mapa del sitio", "Mapa del sitio de TechRevive: todas las páginas organizadas por sección.", body, section="Contacto")
