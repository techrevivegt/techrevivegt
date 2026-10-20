# -*- coding: utf-8 -*-
"""
TechRevive · Generador del sitio con panel de administración (Pages CMS)

  Uso:  python3 build.py

Lee el contenido de la carpeta content/ (lo que se edita en el panel),
toma el diseño de src/ y genera el sitio completo en _site/.
Cloudflare ejecuta este comando automáticamente cada vez que guardas un cambio.
No necesita instalar nada: solo Python 3.
"""
import json, os, shutil, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "generador"))
import base as sb  # noqa: E402
from base import OUT, SRC, SITE_URL, PAGES, WARNINGS, CFG, g  # noqa: E402


def preparar_salida():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, "css"))
    shutil.copytree(os.path.join(SRC, "img"), os.path.join(OUT, "img"))
    shutil.copytree(os.path.join(SRC, "js"), os.path.join(OUT, "js"))
    css = ""
    for name in ("styles.css", "paginas.css"):
        with open(os.path.join(SRC, "css", name), encoding="utf-8") as f:
            css += f.read() + "\n"
    with open(os.path.join(OUT, "css", "styles.css"), "w", encoding="utf-8") as f:
        f.write(css)


def escribir_config():
    """js/config.js se genera con los datos de 'Configuración general' del panel."""
    c = g(CFG, "contacto", default={})
    r = g(CFG, "redes", default={})
    wa = "".join(ch for ch in str(c.get("whatsapp") or "") if ch.isdigit())
    data = {
        "whatsapp": wa or "50200000000",
        "whatsappDisplay": c.get("whatsapp_visible") or "+502 0000-0000",
        "whatsappMessage": c.get("mensaje_whatsapp") or "Hola TechRevive, me gustaría recibir información sobre sus servicios.",
        "email": c.get("correo") or "contacto@tudominio.com",
        "address": c.get("direccion") or "Tu dirección aquí, Guatemala",
        "mapQuery": c.get("busqueda_mapa") or c.get("direccion") or "Ciudad de Guatemala, Guatemala",
        "hours": c.get("horario") or "",
        "aulaVirtualUrl": g(CFG, "aula_virtual") or "",
        "social": {k: (r.get(k) or "") for k in ("facebook", "instagram", "tiktok", "linkedin")},
        "formEndpoint": g(CFG, "formulario", "endpoint") or "",
    }
    js = ("/* Archivo generado automáticamente desde el panel (Configuración general).\n"
          "   No lo edites a mano: los cambios se pierden en la siguiente publicación. */\n"
          "window.TECHREVIVE_CONFIG = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")
    with open(os.path.join(OUT, "js", "config.js"), "w", encoding="utf-8") as f:
        f.write(js)


def main():
    preparar_salida()
    escribir_config()

    import principal as pp
    import capacitacion as pc
    import recursos as pr
    import prensa as pk

    pp.build_index(pr.posts_preview)
    pp.build_about()
    pp.build_services()
    pp.build_service_pages()
    pc.build_capacitacion(); pc.build_cursos(); pc.build_aula(); pc.build_inscripcion()
    pr.build_blog(); pr.build_articles(); pr.build_faq()
    pk.build_novedades(); pk.build_galeria(); pk.build_redes()
    pk.build_contacto(); pk.build_ubicacion(); pk.build_mapa(pr.POSTS); pk.build_404(); pk.build_panel()

    # sitemap.xml y robots.txt
    urls = "".join(
        f"  <url><loc>{SITE_URL}/{'' if s == 'index.html' else s}</loc>"
        f"<priority>{'1.0' if s == 'index.html' else '0.7'}</priority></url>\n" for s, _, _ in PAGES)
    with open(os.path.join(OUT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n")
    with open(os.path.join(OUT, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n")

    for w in dict.fromkeys(WARNINGS):
        print("⚠ Aviso:", w)
    print(f"✔ {len(PAGES) + 1} páginas generadas en _site/")


if __name__ == "__main__":
    main()
