# -*- coding: utf-8 -*-
"""Inicio, ¿Quiénes somos?, Servicios y la página de cada servicio."""
from base import *

INI = load("inicio.json")
NOS = load("nosotros.json")
CAP = load("capacitacion.json")
CURSOS = [c for c in arr(load("cursos.json", default=[])) if isinstance(c, dict) and c.get("titulo")]


def d(i):
    return f' style="--d:{i}"' if i else ""


def service_class(i, n):
    r, cls = n % 3, []
    if n == 1:
        cls.append("service--full")
    elif r == 2 and i >= n - 2:
        cls.append("service--wide")
    elif r == 1 and i >= n - 4:
        cls.append("service--wide")
    if n % 2 == 1 and i == n - 1:
        cls.append("service--odd-last")
    return " ".join(cls)


def grid_items():
    """Servicios del panel + tarjeta de Capacitación (en 2.º lugar)."""
    items = []
    for s in SERVICES:
        items.append({"href": s["_href"], "icono": s.get("icono"), "titulo": s["titulo"], "desc": s.get("descripcion", ""),
                      "lista": arr(s.get("incluye")),
                      "btn": f'<a href="{service_link(s.get("opcion_formulario"))}" class="btn btn--outline service__btn">'
                             f'{e(s.get("boton_texto") or "Solicitar servicio")} {ARROW}</a>\n'
                             f'            <a href="{s["_href"]}" class="service__more">Ver detalles del servicio {icon("chevron")}</a>'})
    t = g(CAP, "tarjeta_servicio", default={})
    if visible(t) and t.get("titulo"):
        cap = {"href": "capacitacion.html", "icono": t.get("icono") or "cap", "titulo": t["titulo"], "desc": t.get("descripcion", ""),
               "lista": [c["titulo"] for c in CURSOS][:8],
               "btn": f'<a href="capacitacion.html" class="btn btn--outline service__btn">{e(t.get("boton_texto") or "Ver capacitaciones")} {ARROW}</a>\n'
                      f'            <a href="cursos.html" class="service__more">Ver cursos disponibles {icon("chevron")}</a>'}
        items.insert(min(1, len(items)), cap)
    return items


def services_grid():
    items = grid_items()
    out = []
    for i, s in enumerate(items):
        out.append(f'''          <article class="{" ".join(["service", service_class(i, len(items))]).strip()} reveal"{d(i % 3)}>
            <div class="service__top">
              <span class="service__icon">{icon(s["icono"], "laptop")}</span>
              <span class="service__num">{i + 1:02d}</span>
            </div>
            <h3 class="service__title"><a href="{s["href"]}">{e(s["titulo"])}</a></h3>
            {f'<p class="service__desc">{e(s["desc"])}</p>' if s["desc"] else ""}
            {checklist(s["lista"])}
            {s["btn"]}
          </article>''')
    return '        <div class="services">\n' + "\n".join(out) + "\n        </div>"


# ------------------------------------------------------------------ Secciones de inicio
FLOAT_POS = ["a", "b", "c"]


def sec_hero():
    P = g(INI, "portada", default={})
    eti = f'<p class="eyebrow eyebrow--dark reveal"><span class="eyebrow__dot"></span> {e(P["etiqueta"])}</p>' if P.get("etiqueta") else ""
    frases = arr(P.get("frases"))
    fr = (f'<ul class="hero__tagline reveal" style="--d:4" aria-label="Mensaje de marca">'
          + "".join(f"<li>{e(f)}</li>" for f in frases) + "</ul>") if frases else ""
    visual = ""
    if P.get("imagen"):
        floats = ""
        for i, t in enumerate([x for x in arr(P.get("tarjetas_flotantes")) if x.get("titulo")][:3]):
            ok = " float-card__icon--ok" if t.get("icono") == "check" else ""
            sub = f'<small>{e(t["subtitulo"])}</small>' if t.get("subtitulo") else ""
            floats += f'''
          <div class="float-card float-card--{FLOAT_POS[i]}" aria-hidden="true">
            <span class="float-card__icon{ok}">{icon(t.get("icono"))}</span>
            <span><strong>{e(t["titulo"])}</strong>{sub}</span>
          </div>'''
        visual = f'''<div class="hero__visual reveal" style="--d:2">
          <div class="hero__frame">
            <img src="{e(img(P["imagen"]))}" width="960" height="720" alt="{e(P.get("imagen_descripcion"))}" fetchpriority="high" />
          </div>{floats}
        </div>'''
    texto = f'<p class="hero__text reveal" style="--d:2">{e(P["texto"])}</p>' if P.get("texto") else ""
    return f'''    <section class="hero" id="inicio" aria-labelledby="hero-title">
      <div class="hero__bg" aria-hidden="true">
        <div class="hero__grid"></div>
        <div class="hero__glow hero__glow--1"></div>
        <div class="hero__glow hero__glow--2"></div>
      </div>

      <div class="container hero__inner">
        <div class="hero__content">
          {eti}
          <h1 class="hero__title reveal" id="hero-title" style="--d:1">
            {hl(P.get("titulo") or "TechRevive", P.get("titulo_resaltado"))}
          </h1>
          {texto}
          <div class="hero__buttons reveal" style="--d:3">
            {button(P.get("boton_principal"), "btn btn--primary btn--lg", "arrow")}
            {button(P.get("boton_secundario"), "btn btn--ghost-light btn--lg")}
          </div>
          {fr}
        </div>

        {visual}
      </div>
    </section>
'''


def sec_values():
    v = [x for x in arr(INI.get("valores")) if x.get("titulo")]
    if not v:
        return '<div class="values-spacer"></div>\n'
    lis = "".join(f'''
          <li class="value reveal"{d(i)}>
            <span class="value__icon">{icon(x.get("icono"), "check")}</span>
            <div><h2 class="value__title">{e(x["titulo"])}</h2><p>{e(x.get("texto", ""))}</p></div>
          </li>''' for i, x in enumerate(v))
    return f'''    <section class="values" aria-label="Propuesta de valor">
      <div class="container">
        <ul class="values__bar" style="--n:{min(len(v), 4)}">{lis}
        </ul>
      </div>
    </section>
'''


def sec_services(S):
    pub = arr(S.get("publico"))
    pub_html = ('<ul class="audience" aria-label="A quién servimos">' + "".join(f"<li>{e(p)}</li>" for p in pub) + "</ul>") if pub else ""
    ey = f'<p class="eyebrow">{e(S["etiqueta"])}</p>' if S.get("etiqueta") else ""
    lead = f'<p class="section-lead">{e(S["texto"])}</p>' if S.get("texto") else ""
    return f'''    <section class="section section--soft" id="servicios" aria-labelledby="servicios-title">
      <div class="container">
        <header class="section-head reveal">
          {ey}
          <h2 class="section-title" id="servicios-title">{e(S.get("titulo") or "Nuestros servicios")}</h2>
          {lead}
          {pub_html}
        </header>
{services_grid()}
      </div>
    </section>
'''


def sec_why(W, eyebrow=None, about_link=True):
    if not visible(W) or not W.get("titulo"):
        return ""
    v = [x for x in arr(W.get("ventajas")) if x.get("titulo")]
    f = arr(W.get("formula"))
    ey = eyebrow or W.get("etiqueta")
    formula = (f'<div class="formula" aria-label="{e(" + ".join(f))}">' + '<b aria-hidden="true">+</b>'.join(f"<span>{e(x)}</span>" for x in f) + "</div>") if f else ""
    quote_ = f'<blockquote class="why__quote">“{e(W["cita"])}”</blockquote>' if W.get("cita") else ""
    link = f'\n          <a href="quienes-somos.html" class="btn btn--ghost-light" style="margin-top:2rem">Conoce más sobre nosotros {ARROW}</a>' if about_link else ""
    lis = "".join(f'''
          <li class="adv{" adv--wide" if len(v) % 2 == 1 and i == len(v) - 1 else ""} reveal"{d(i)}>
            <span class="adv__icon">{icon(x.get("icono"), "award")}</span>
            <h3>{e(x["titulo"])}</h3>
            <p>{e(x.get("texto", ""))}</p>
          </li>''' for i, x in enumerate(v))
    return f'''    <section class="section section--dark why" id="nosotros" aria-labelledby="why-title">
      <div class="why__glow" aria-hidden="true"></div>
      <div class="container why__inner">
        <div class="why__intro reveal">
          {f'<p class="eyebrow eyebrow--dark">{e(ey)}</p>' if ey else ""}
          <h2 class="section-title section-title--light" id="why-title">{e(W["titulo"])}</h2>
          {f'<p class="section-lead section-lead--light">{e(W["texto"])}</p>' if W.get("texto") else ""}
          {formula}
          {quote_}{link}
        </div>

        <ul class="why__grid">{lis}
        </ul>
      </div>
    </section>
'''


def sec_training(C):
    if not visible(C) or not C.get("titulo"):
        return ""
    imgs = [x for x in arr(C.get("imagenes")) if x.get("imagen")][:3]
    collage = ""
    if imgs:
        figs = "".join(f'''
          <figure class="collage__item{" collage__item--main" if i == 0 else ""}">
            <img src="{e(img(x["imagen"]))}" loading="lazy" alt="{e(x.get("descripcion"))}" />
            {f'<figcaption>{icon(x.get("icono"), "book")} {e(x["leyenda"])}</figcaption>' if x.get("leyenda") else ""}
          </figure>''' for i, x in enumerate(imgs))
        collage = f'<div class="collage collage--{len(imgs)} reveal">{figs}\n        </div>'
    niveles = arr(C.get("niveles"))
    lv = ""
    if niveles:
        lv = '<div class="levels reveal" style="--d:3" aria-label="Niveles de experiencia">' + "".join(
            f'<span class="level">{"<i></i>" * min(i + 1, 5)}{e(n)}</span>' for i, n in enumerate(niveles)) + "</div>"
    courses = ""
    if CURSOS:
        t = f'<h3 class="courses__title">{e(C["cursos_titulo"])}</h3>' if C.get("cursos_titulo") else ""
        courses = (f'<div class="courses reveal" style="--d:4">{t}<ul class="courses__list">'
                   + "".join(f'<li>{e(c["titulo"])}</li>' for c in CURSOS[:10]) + "</ul></div>")
    return f'''    <section class="section everyone" id="capacitacion" aria-labelledby="everyone-title">
      <div class="container everyone__inner{"" if imgs else " everyone__inner--solo"}">
        {collage}

        <div class="everyone__content">
          {f'<p class="eyebrow reveal">{e(C["etiqueta"])}</p>' if C.get("etiqueta") else ""}
          <h2 class="section-title reveal" id="everyone-title" style="--d:1">{e(C["titulo"])}</h2>
          {f'<p class="section-lead reveal" style="--d:2">{e(C["texto"])}</p>' if C.get("texto") else ""}
          {lv}
          {courses}
          <div class="reveal" style="--d:5; display:flex; flex-wrap:wrap; gap:.75rem">
            <a href="cursos.html" class="btn btn--primary">Ver cursos disponibles {ARROW}</a>
            <a href="inscripcion.html" class="btn btn--outline">Inscribirme</a>
          </div>
        </div>
      </div>
    </section>
'''


def sec_business(N):
    if not visible(N) or not N.get("titulo"):
        return ""
    tags = arr(N.get("etiquetas"))
    tags_html = ('<ul class="tags reveal" style="--d:3" aria-label="Soluciones para negocios">' + "".join(f"<li>{e(t)}</li>" for t in tags) + "</ul>") if tags else ""
    btn = button(N.get("boton"), "btn btn--primary btn--lg reveal", "rocket", ' style="--d:4"')
    pasos = "".join(f'''
          <li class="step reveal"{d(i)}>
            <span class="step__num">{i + 1}</span>
            <span class="step__icon">{icon(p.get("icono"), "search")}</span>
            <h3>{e(p["titulo"])}</h3>
            <p>{e(p.get("texto", ""))}</p>
          </li>''' for i, p in enumerate(x for x in arr(N.get("pasos")) if x.get("titulo")))
    return f'''    <section class="section section--blue business" id="desarrollo" aria-labelledby="business-title">
      <div class="container business__inner">
        <div class="business__content">
          {f'<p class="eyebrow reveal">{e(N["etiqueta"])}</p>' if N.get("etiqueta") else ""}
          <h2 class="section-title reveal" id="business-title" style="--d:1">{e(N["titulo"])}</h2>
          {f'<p class="section-lead reveal" style="--d:2">{e(N["texto"])}</p>' if N.get("texto") else ""}
          {tags_html}
          {btn}
        </div>

        <ol class="steps">{pasos}
        </ol>
      </div>
    </section>
'''


CATEGORIAS_PROY = ["Reparación", "Sitios web", "Aplicaciones", "Capacitación", "Soluciones empresariales"]


def sec_projects(P):
    if not visible(P) or not P.get("titulo"):
        return ""
    lista = [x for x in arr(P.get("lista")) if x.get("titulo")]
    cats = [c for c in CATEGORIAS_PROY if any(p.get("categoria") == c for p in lista)]
    cats += list(dict.fromkeys(p["categoria"] for p in lista if p.get("categoria") and p["categoria"] not in CATEGORIAS_PROY))
    filters = ""
    if len(cats) > 1:
        filters = ('<div class="filters reveal" role="group" aria-label="Filtrar proyectos por categoría">\n'
                   '          <button class="filter is-active" data-filter="all" aria-pressed="true">Todos</button>\n          '
                   + "\n          ".join(f'<button class="filter" data-filter="{slugify(c)}" aria-pressed="false">{e(c)}</button>' for c in cats)
                   + "\n        </div>")
    arts = ""
    for i, p in enumerate(lista):
        media = ""
        if p.get("imagen"):
            badge = '<span class="badge-demo">Proyecto demostrativo</span>' if p.get("demostrativo") else ""
            media = f'''<div class="project__media">
              <img src="{e(img(p["imagen"]))}" width="640" height="480" loading="lazy" alt="{e(p.get("imagen_descripcion") or p["titulo"])}" />
              {badge}
            </div>'''
        arts += f'''
          <article class="project reveal"{d(i % 3)} data-category="{slugify(p.get("categoria"))}">
            {media}
            <div class="project__body">
              {f'<span class="project__cat">{e(p["categoria"])}</span>' if p.get("categoria") else ""}
              <h3>{e(p["titulo"])}</h3>
              {f'<p>{e(p["descripcion"])}</p>' if p.get("descripcion") else ""}
            </div>
          </article>'''
    fin = P.get("tarjeta_final") or {}
    if visible(fin) and fin.get("titulo"):
        arts += f'''
          <a href="#contacto" class="project project--cta reveal" data-category="all">
            <span class="project--cta__icon">{icon("plus")}</span>
            <h3>{e(fin["titulo"])}</h3>
            {f'<p>{e(fin["texto"])}</p>' if fin.get("texto") else ""}
            {f'<span class="link-arrow">{e(fin["enlace_texto"])} {ARROW}</span>' if fin.get("enlace_texto") else ""}
          </a>'''
    return f'''    <section class="section section--soft" id="proyectos" aria-labelledby="projects-title">
      <div class="container">
        <header class="section-head section-head--split reveal">
          <div>
            {f'<p class="eyebrow">{e(P["etiqueta"])}</p>' if P.get("etiqueta") else ""}
            <h2 class="section-title" id="projects-title">{e(P["titulo"])}</h2>
          </div>
          {f'<p class="section-lead">{e(P["texto"])}</p>' if P.get("texto") else ""}
        </header>

        {filters}

        <div class="projects">{arts}
        </div>
        <div class="section-foot reveal">
          <a href="galeria.html" class="btn btn--outline">Ver galería de fotos {ARROW}</a>
        </div>
      </div>
    </section>
'''


def sec_testimonials(T):
    lista = [x for x in arr(T.get("lista")) if x.get("testimonio")]
    if not visible(T) or not lista:
        return ""
    figs = ""
    for i, t in enumerate(lista):
        av = (f'<img class="testimonial__avatar testimonial__avatar--photo" src="{e(img(t["foto"]))}" alt="{e(t.get("nombre"))}" loading="lazy" />'
              if t.get("foto") else f'<span class="testimonial__avatar" aria-hidden="true">{icon("user")}</span>')
        figs += f'''
          <figure class="testimonial{" testimonial--placeholder" if t.get("es_ejemplo") else ""} reveal"{d(i % 3)}>
            <svg class="testimonial__quote" aria-hidden="true"><use href="#i-quote"/></svg>
            <blockquote>{e(t["testimonio"])}</blockquote>
            <figcaption>
              {av}
              <span><strong>{e(t.get("nombre"))}</strong>{f'<small>Servicio: {e(t["servicio"])}</small>' if t.get("servicio") else ""}</span>
            </figcaption>
          </figure>'''
    return f'''    <section class="section testimonials" id="testimonios" aria-labelledby="testimonials-title">
      <div class="container">
{section_head(T.get("etiqueta"), T.get("titulo") or "Testimonios", T.get("texto"), center=True, hid="testimonials-title")}
        <div class="testimonials__grid{" testimonials__grid--odd" if len(lista) % 2 == 1 else ""}">{figs}
        </div>
      </div>
    </section>
'''


def sec_blog(B, posts_preview):
    if not visible(B) or not posts_preview:
        return ""
    return f'''    <section class="section section--soft" id="recursos" aria-labelledby="recursos-title">
      <div class="container">
        <header class="section-head section-head--split reveal">
          <div>
            {f'<p class="eyebrow">{e(B["etiqueta"])}</p>' if B.get("etiqueta") else ""}
            <h2 class="section-title" id="recursos-title">{e(B.get("titulo") or "Blog")}</h2>
          </div>
          {f'<p class="section-lead">{e(B["texto"])}</p>' if B.get("texto") else ""}
        </header>
        {posts_preview}
        <div class="section-foot">
          <a href="blog.html" class="btn btn--outline">Ver todos los artículos {ARROW}</a>
          <a href="preguntas-frecuentes.html" class="btn btn--outline">Preguntas frecuentes</a>
        </div>
      </div>
    </section>
'''


def build_index(preview_fn):
    B = g(INI, "blog", default={})
    try:
        n = max(1, min(int(B.get("cantidad") or 3), 9))
    except (TypeError, ValueError):
        n = 3
    L = g(INI, "llamado", default={})
    cta = cta_block(L.get("titulo"), L.get("texto"),
                    f'<a href="#contacto" class="btn btn--white btn--lg" data-wa>{icon("whatsapp")} {e(L.get("boton_whatsapp") or "Hablar con TechRevive")}</a>\n'
                    f'            <a href="#contacto" class="btn btn--ghost-light btn--lg">{e(L.get("boton_cotizacion") or "Solicitar cotización")}</a>')
    import herramientas as ph
    body = (sec_hero() + sec_values() + sec_services(g(INI, "servicios", default={})) + ph.promo_home() + sec_why(g(INI, "por_que", default={}))
            + sec_training(g(INI, "capacitacion", default={})) + sec_business(g(INI, "negocios", default={}))
            + process_section() + sec_projects(g(INI, "proyectos", default={})) + sec_testimonials(g(INI, "testimonios", default={}))
            + sec_blog(B, preview_fn(n)) + cta + contact_section("contacto"))
    P = g(INI, "portada", default={})
    jsonld = {
        "@context": "https://schema.org", "@type": "ProfessionalService", "name": "TechRevive",
        "slogan": strip_tags(SLOGAN),
        "description": "Soluciones tecnológicas integrales: capacitación, soporte técnico, reparación de equipos, desarrollo web y aplicaciones.",
        "url": SITE_URL + "/", "image": SITE_URL + "/" + (img(P.get("imagen")) or "img/hero.jpg"), "areaServed": "Guatemala",
        "address": {"@type": "PostalAddress", "addressCountry": "GT"},
        "knowsAbout": [s["_nombre"] for s in SERVICES] + ["Capacitación tecnológica"],
    }
    page("index.html", "TechRevive | Reparación de computadoras, capacitación y desarrollo web",
         P.get("texto") or "TechRevive ofrece soluciones tecnológicas integrales.",
         body, jsonld=jsonld, preload=img(P.get("imagen")) or None, image=img(P.get("imagen")), section="Inicio")


# ------------------------------------------------------------------ ¿Quiénes somos?
def build_about():
    P = g(NOS, "portada", default={})
    hero = page_hero([("¿Quiénes somos?", None)], "¿Quiénes somos?", hl(P.get("titulo") or "¿Quiénes somos?", P.get("titulo_resaltado")),
                     P.get("texto"), image=img(P.get("imagen")), alt=P.get("imagen_descripcion"),
                     buttons=f'<a href="servicios.html" class="btn btn--primary btn--lg">Conocer nuestros servicios {ARROW}</a>'
                             f'<a href="contacto.html" class="btn btn--ghost-light btn--lg">Contáctanos</a>')
    H = g(NOS, "historia", default={})
    historia = ""
    if H.get("titulo"):
        media = (f'''<div class="split__media reveal">
          <img src="{e(img(H["imagen"]))}" width="960" height="640" loading="lazy" alt="{e(H.get("imagen_descripcion"))}" />
        </div>''' if H.get("imagen") else "")
        pars = "".join(f'<p class="reveal" style="--d:{min(i + 2, 5)}">{e(p)}</p>' for i, p in enumerate(arr(H.get("parrafos"))))
        puntos = f'<div class="reveal" style="--d:4">{checklist(H.get("puntos"), two=True)}</div>' if arr(H.get("puntos")) else ""
        historia = f'''    <section class="section" aria-labelledby="historia-title">
      <div class="container split{"" if media else " split--solo"}">
        {media}
        <div class="split__body">
          {f'<p class="eyebrow reveal">{e(H["etiqueta"])}</p>' if H.get("etiqueta") else ""}
          <h2 class="section-title reveal" id="historia-title" style="--d:1">{e(H["titulo"])}</h2>
          {pars}
          {puntos}
        </div>
      </div>
    </section>
'''
    mvc = []
    if NOS.get("mision"):
        mvc.append(f'''<article class="mv-card reveal">
            <span class="mv-card__icon">{icon("target")}</span>
            <h2>Misión</h2>
            <p>{e(NOS["mision"])}</p>
          </article>''')
    if NOS.get("vision"):
        mvc.append(f'''<article class="mv-card mv-card--dark reveal" style="--d:1">
            <span class="mv-card__icon">{icon("eye")}</span>
            <h2>Visión</h2>
            <p>{e(NOS["vision"])}</p>
          </article>''')
    mv = f'''    <section class="section section--soft" aria-label="Misión y visión">
      <div class="container">
        <div class="mv{" mv--solo" if len(mvc) == 1 else ""}">
          {chr(10).join(mvc)}
        </div>
      </div>
    </section>
''' if mvc else ""
    V = g(NOS, "valores", default={})
    vc = cards(V.get("lista"), fallback="check")
    values_sec = f'''    <section class="section" aria-labelledby="valores-title">
      <div class="container">
{section_head("Nuestros valores", V.get("titulo") or "Nuestros valores", V.get("texto"), center=True, hid="valores-title")}
        {vc}
      </div>
    </section>
''' if vc else ""
    why = sec_why(g(INI, "por_que", default={}), eyebrow="Nuestra diferencia", about_link=False)
    A = g(NOS, "audiencia", default={})
    ac = cards(A.get("lista"), linked=True, fallback="user")
    aud_sec = f'''    <section class="section section--soft" aria-labelledby="audiencia-title">
      <div class="container">
{section_head("A quién servimos", A.get("titulo") or "A quién servimos", A.get("texto"), hid="audiencia-title")}
        {ac}
      </div>
    </section>
''' if ac else ""
    L = g(NOS, "llamado", default={})
    body = hero + historia + mv + values_sec + why + aud_sec + cta_block(L.get("titulo"), L.get("texto"))
    page("quienes-somos.html", "¿Quiénes somos? Misión, visión y valores",
         P.get("texto") or "Conoce TechRevive: misión, visión y valores.", body, image=img(P.get("imagen")), section="TechRevive")


# ------------------------------------------------------------------ Servicios
def build_services():
    P = g(SERVICIOS, "portada", default={})
    hero = page_hero([("Servicios", None)], "Nuestros servicios", hl(P.get("titulo") or "Nuestros servicios", P.get("titulo_resaltado")),
                     P.get("texto"), chips=arr(g(INI, "servicios", "publico", default=[])),
                     buttons=f'<a href="contacto.html#formulario" class="btn btn--primary btn--lg">Solicitar servicio {ARROW}</a>'
                             f'<a href="contacto.html" class="btn btn--ghost-light btn--lg" data-wa>{icon("whatsapp")} Escribir por WhatsApp</a>')
    grid = f'''    <section class="section section--soft" id="servicios" aria-label="Lista de servicios">
      <div class="container">
{services_grid()}
      </div>
    </section>
'''
    body = hero + grid + process_section() + cta_block(
        "¿No sabes qué servicio necesitas?", "Cuéntanos tu situación. Te ayudamos a identificar la mejor solución, sin compromiso.")
    page("servicios.html", "Servicios tecnológicos: reparación, web, aplicaciones y soporte",
         P.get("texto") or "Servicios tecnológicos de TechRevive.", body, section="Servicios")


def build_service_pages():
    for s in SERVICES:
        D = s.get("detalle") or {}
        nombre = s["_nombre"]
        link = service_link(s.get("opcion_formulario"))
        btn_txt = e(s.get("boton_texto") or "Solicitar servicio")
        hero_img = img(D.get("imagen"))
        hero = page_hero([("Servicios", "servicios.html"), (nombre, None)], "Servicios",
                         hl(D.get("titulo") or s["titulo"], D.get("titulo_resaltado")), D.get("texto") or s.get("descripcion"),
                         image=hero_img, alt=D.get("imagen_descripcion"),
                         buttons=f'<a href="{link}" class="btn btn--primary btn--lg">{btn_txt} {ARROW}</a>'
                                 f'<a href="contacto.html" class="btn btn--ghost-light btn--lg" data-wa data-wa-msg="Hola TechRevive, quiero información sobre: {e(nombre)}.">{icon("whatsapp")} Consultar por WhatsApp</a>')
        intro = ""
        if D.get("intro_titulo"):
            media = (f'''
        <div class="split__media reveal" style="--d:1">
          <img src="{e(img(D["intro_imagen"]))}" width="960" height="640" loading="lazy" alt="{e(D.get("intro_imagen_descripcion"))}" />
        </div>''' if D.get("intro_imagen") else "")
            pars = "".join(f'<p class="reveal" style="--d:{min(i + 2, 5)}">{e(p)}</p>' for i, p in enumerate(arr(D.get("intro_parrafos"))))
            intro = f'''    <section class="section" aria-labelledby="intro-title">
      <div class="container split{"" if media else " split--solo"}">
        <div class="split__body">
          <p class="eyebrow reveal">{e(nombre)}</p>
          <h2 class="section-title reveal" id="intro-title" style="--d:1">{e(D["intro_titulo"])}</h2>
          {pars}
        </div>{media}
      </div>
    </section>
'''
        inc_items = [x for x in arr(D.get("incluye_detalle")) if x.get("titulo")]
        if not inc_items:  # si no hay detalle, usa la lista corta del servicio
            inc_items = [{"icono": "check", "titulo": t} for t in arr(s.get("incluye"))]
        inc = f'''    <section class="section section--soft" aria-labelledby="inc-title">
      <div class="container">
{section_head("Qué incluye", D.get("incluye_titulo") or "¿Qué incluye el servicio?", center=True, hid="inc-title")}
        {cards(inc_items)}
      </div>
    </section>
''' if inc_items else ""
        ex_items = [x for x in arr(D.get("extra")) if x.get("titulo")]
        extra = f'''    <section class="section section--dark" aria-labelledby="extra-title">
      <div class="why__glow" aria-hidden="true"></div>
      <div class="container" style="position:relative">
{section_head("Para tener en cuenta", D.get("extra_titulo") or "Para tener en cuenta", hid="extra-title", light=True)}
        {cards(ex_items, fallback="bulb")}
      </div>
    </section>
''' if ex_items else ""
        faqs = [f for f in arr(D.get("preguntas")) if f.get("pregunta")]
        faq = f'''    <section class="section" aria-labelledby="faq-title">
      <div class="container faq-narrow">
{section_head("Preguntas frecuentes", "Resolvemos tus dudas.", center=True, hid="faq-title")}
        {faq_items(faqs, open_first=True)}
        <p class="reveal" style="text-align:center; margin-top:2rem; color:var(--muted)">¿Tienes otra pregunta? <a href="preguntas-frecuentes.html" style="color:var(--blue-700); font-weight:600">Consulta todas las preguntas frecuentes</a>.</p>
      </div>
    </section>
''' if faqs else ""
        cta = cta_block(f"¿Listo para empezar con {nombre.lower()}?",
                        "Cuéntanos qué necesitas y te enviaremos una orientación clara, sin compromiso.",
                        f'<a href="{link}" class="btn btn--white btn--lg">{btn_txt} {ARROW}</a>\n'
                        f'            <a href="contacto.html" class="btn btn--ghost-light btn--lg" data-wa>{icon("whatsapp")} Escribir por WhatsApp</a>')
        body = hero + intro + inc + extra + process_section(soft=True) + faq + cta
        jsonld = [{"@context": "https://schema.org", "@type": "Service", "name": nombre, "provider": {"@type": "Organization", "name": "TechRevive"},
                   "areaServed": "Guatemala", "description": s.get("descripcion", "")}, faq_jsonld(faqs)]
        page(s["_href"], D.get("seo_titulo") or nombre, D.get("seo_descripcion") or s.get("descripcion") or nombre, body,
             image=hero_img, jsonld=[j for j in jsonld if j], section="Servicios")
