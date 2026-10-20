# -*- coding: utf-8 -*-
"""Blog (colección de artículos), artículos y Preguntas frecuentes."""
from base import *


def load_posts():
    posts, used = [], set(RESERVED) | {s["_href"][:-5] for s in SERVICES}
    for path in sorted(glob.glob(os.path.join(CONTENT, "blog", "*.json"))):
        name = os.path.basename(path)
        p = load(os.path.join("blog", name))
        if not isinstance(p, dict) or not p.get("titulo") or p.get("publicado") is False:
            continue
        stem = slugify(name[:-5])
        slug = "blog-" + stem
        while slug in used:
            slug += "-2"
        used.add(slug)
        body = clean_html(p.get("contenido", ""))
        words = len(strip_tags(body).split())
        dt = parse_date(p.get("fecha"))
        posts.append({
            "slug": slug + ".html", "title": p["titulo"], "cat": p.get("categoria") or "Blog",
            "iso": "%04d-%02d-%02d" % dt if dt else "", "date": fecha_larga(p.get("fecha")),
            "read": f"{max(1, -(-words // 100))} min de lectura",
            "excerpt": p.get("resumen") or (strip_tags(body)[:157] + "…" if len(strip_tags(body)) > 160 else strip_tags(body)),
            "img": img(p.get("imagen")), "alt": p.get("imagen_descripcion") or p["titulo"], "body": body,
            "cta_t": p.get("llamado_titulo") or "¿Necesitas ayuda con este tema?",
            "cta_x": p.get("llamado_texto") or "Escríbenos y te orientamos con gusto.",
            "serv": p.get("servicio_relacionado") or "",
        })
    posts.sort(key=lambda x: x["iso"], reverse=True)  # más recientes primero
    return posts


POSTS = load_posts()


def post_card(p, featured=False, h="h3"):
    f = " post--featured" if featured else ""
    media = f'<div class="post__media"><img src="{e(p["img"])}" width="960" height="640" loading="lazy" alt="{e(p["alt"])}" /></div>' if p["img"] else ""
    when = f'<time datetime="{p["iso"]}">{p["date"]}</time>' if p["iso"] else ""
    return f'''<article class="post{f}{"" if media else " post--noimg"} reveal">
            {media}
            <div class="post__body">
              <div class="post__meta"><span class="chip">{e(p["cat"])}</span>{when}</div>
              <{h}><a href="{p["slug"]}">{e(p["title"])}</a></{h}>
              <p>{e(p["excerpt"])}</p>
              <span class="link-arrow">Leer artículo {ARROW}</span>
            </div>
          </article>'''


def posts_preview(n=3):
    if not POSTS:
        return ""
    return '<div class="posts">\n          ' + "\n          ".join(post_card(p) for p in POSTS[:n]) + "\n        </div>"


SUGERIR = f'''
          <article class="post reveal" style="justify-content:center; align-items:center; text-align:center; padding:2rem; background:var(--bg-blue); border-style:dashed">
            <span class="card__icon" style="margin-inline:auto">{icon("plus")}</span>
            <h2 style="font-size:1.15rem; margin-bottom:.5rem">Próximamente más artículos</h2>
            <p style="color:var(--muted); font-size:.95rem; margin-bottom:1.25rem">¿Sobre qué tema te gustaría aprender? Cuéntanos y lo preparamos.</p>
            <a href="contacto.html" class="btn btn--outline btn--sm" data-wa data-wa-msg="Hola TechRevive, me gustaría que publicaran un artículo sobre: ">Sugerir un tema</a>
          </article>'''


def build_blog():
    cats = list(dict.fromkeys(p["cat"] for p in POSTS))
    hero = page_hero([("Recursos", None), ("Blog y tutoriales", None)], "Blog y tutoriales",
                     'Tecnología explicada <span class="text-grad">de forma sencilla.</span>',
                     "Consejos prácticos, guías paso a paso y novedades para que aproveches mejor tus equipos, protejas tu información y hagas crecer tu negocio.",
                     chips=cats or None)
    if POSTS:
        cards_html = post_card(POSTS[0], True, "h2") + "".join("\n          " + post_card(p, h="h2") for p in POSTS[1:])
    else:
        cards_html = ""
    grid = '<div class="posts">\n          ' + cards_html + SUGERIR + "\n        </div>"
    body = hero + f'''    <section class="section section--soft" aria-label="Artículos">
      <div class="container">
        {grid}
      </div>
    </section>
''' + cta_block("¿Prefieres que te ayudemos directamente?", "Si tienes un problema con tu equipo o una duda tecnológica, escríbenos. Te orientamos con gusto.")
    desc = "Consejos prácticos y tutoriales de tecnología" + (": " + ", ".join(p["title"].lower() for p in POSTS[:3]) + "." if POSTS else ".")
    page("blog.html", "Blog y tutoriales de tecnología", desc, body,
         image=(POSTS[0]["img"] if POSTS and POSTS[0]["img"] else "img/blog-respaldo.jpg"), section="Recursos")


def build_articles():
    for p in POSTS:
        meta = f'<span>{icon("calendar")}</span><time datetime="{p["iso"]}">{p["date"]}</time><span>·</span>' if p["iso"] else ""
        hero = page_hero([("Blog", "blog.html"), (p["cat"], None)], p["cat"], e(p["title"]), p["excerpt"], center=True,
                         extra=f'<div class="post__meta reveal" style="--d:3">{meta}<span>{p["read"]}</span></div>')
        others = [x for x in POSTS if x is not p][:3]
        cover = f'<figure class="article__cover reveal"><img src="{e(p["img"])}" width="960" height="640" alt="{e(p["alt"])}" /></figure>' if p["img"] else ""
        more = f'''
    <section class="section section--soft" aria-labelledby="mas-title">
      <div class="container">
{section_head("Sigue leyendo", "Otros artículos que te pueden interesar.", hid="mas-title")}
        <div class="posts" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
          {"".join(post_card(x) for x in others)}
        </div>
      </div>
    </section>
''' if others else ""
        url = SITE_URL + "/" + p["slug"]
        body = hero + f'''    <section class="section" aria-label="Artículo">
      <div class="container">
        <article class="article">
          {cover}
          <div class="prose">
{p["body"]}
          </div>
          <aside class="article-cta">
            <div><h2>{e(p["cta_t"])}</h2><p>{e(p["cta_x"])}</p></div>
            <a href="{service_link(p["serv"])}" class="btn btn--white">Contactar a TechRevive {ARROW}</a>
          </aside>
          <div class="article-share">
            <span>¿Te fue útil? Compártelo:</span>
            <a class="btn btn--whatsapp btn--sm" href="https://wa.me/?text={quote(p["title"] + " — " + url)}" target="_blank" rel="noopener">{icon("whatsapp")} WhatsApp</a>
            <a class="btn btn--outline btn--sm" href="https://www.facebook.com/sharer/sharer.php?u={quote(url)}" target="_blank" rel="noopener">{icon("facebook")} Facebook</a>
          </div>
        </article>
      </div>
    </section>
''' + more
        ld = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["title"], "description": p["excerpt"],
              "author": {"@type": "Organization", "name": "TechRevive"},
              "publisher": {"@type": "Organization", "name": "TechRevive"}, "mainEntityOfPage": url}
        if p["iso"]:
            ld["datePublished"] = p["iso"]
        if p["img"]:
            ld["image"] = SITE_URL + "/" + p["img"]
        page(p["slug"], p["title"], p["excerpt"], body, active="blog.html", image=p["img"], jsonld=ld, section="Blog")


def build_faq():
    F = load("preguntas.json")
    grupos = [gr for gr in arr(g(F, "grupos", default=[])) if gr.get("titulo") and arr(gr.get("preguntas"))]
    ids = []
    for gr in grupos:
        gid = slugify(gr["titulo"])
        while gid in ids:
            gid += "-2"
        ids.append(gid)
    hero = page_hero([("Recursos", None), ("Preguntas frecuentes", None)], "Preguntas frecuentes",
                     'Respuestas claras <span class="text-grad">a tus dudas.</span>',
                     "Reunimos las preguntas que más nos hacen sobre nuestros servicios, cursos y proyectos digitales. Si no encuentras la tuya, escríbenos.")
    side = "".join(f'<a href="#{gid}">{icon(gr.get("icono"), "help")} {e(gr["titulo"])}</a>' for gid, gr in zip(ids, grupos))
    groups = "".join(f'''
          <div class="faq-group reveal" id="{gid}">
            <h2 class="faq-group__title">{icon(gr.get("icono"), "help")} {e(gr["titulo"])}</h2>
            {faq_items(gr["preguntas"], open_first=(n == 0), rich=True)}
          </div>''' for n, (gid, gr) in enumerate(zip(ids, grupos)))
    body = hero + f'''    <section class="section section--soft" aria-label="Preguntas por categoría">
      <div class="container faq-layout">
        <nav class="side-nav" aria-label="Categorías de preguntas"><p>Categorías</p>{side}</nav>
        <div>{groups}
        </div>
      </div>
    </section>
''' + cta_block("¿No encontraste tu respuesta?", "Escríbenos por WhatsApp o mediante el formulario. Te responderemos con gusto.")
    all_faqs = [q for gr in grupos for q in arr(gr["preguntas"])]
    page("preguntas-frecuentes.html", "Preguntas frecuentes",
         "Resolvemos tus dudas sobre reparación de computadoras, soporte técnico, cursos de capacitación, páginas web y aplicaciones.",
         body, jsonld=faq_jsonld(all_faqs), section="Recursos")
