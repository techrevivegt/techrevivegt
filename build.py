# -*- coding: utf-8 -*-
"""
TechRevive · Generador del sitio con panel de administración propio (/panel)

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
    shutil.copytree(os.path.join(SRC, "panel"), os.path.join(OUT, "panel"))
    if os.path.isfile(os.path.join(SRC, "img", "favicon.ico")):
        shutil.copy(os.path.join(SRC, "img", "favicon.ico"), os.path.join(OUT, "favicon.ico"))
    css = ""
    for name in ("styles.css", "paginas.css", "cotizador.css"):
        with open(os.path.join(SRC, "css", name), encoding="utf-8") as f:
            css += f.read() + "\n"
    with open(os.path.join(OUT, "css", "styles.css"), "w", encoding="utf-8") as f:
        f.write(css)
    shutil.copy(os.path.join(SRC, "css", "aula.css"), os.path.join(OUT, "css", "aula.css"))
    shutil.copy(os.path.join(SRC, "css", "certificado.css"), os.path.join(OUT, "css", "certificado.css"))


def configurar_base_datos():
    """Conecta la base de datos D1 (estadísticas, certificados y progreso del aula).

    El ID se toma de la variable D1_DATABASE_ID (si existe) o del panel:
    Configuración general → «ID de la base de datos». Solo en Cloudflare (WORKERS_CI=1)
    se agrega la sección d1_databases a wrangler.jsonc antes de publicar; en tu
    computadora no se modifica nada. Un ID mal escrito se ignora con un aviso para
    que la publicación nunca falle por eso.
    """
    import re
    db_id = (os.environ.get("D1_DATABASE_ID") or g(CFG, "base_datos") or "").strip()
    if not db_id:
        print("ℹ Base de datos: sin conectar (estadísticas y certificados desactivados). "
              "Pega su ID en Panel → Configuración general para activarlos.")
        return
    if not re.fullmatch(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", db_id):
        WARNINGS.append(f"El «ID de la base de datos» ({db_id[:40]}) no tiene el formato correcto "
                        "(ej. 1a2b3c4d-1234-5678-9abc-1234567890ab). Se publicó sin base de datos.")
        return
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wrangler.jsonc")
    with open(path, encoding="utf-8") as f:
        text = f.read()
    if '"d1_databases"' in text:
        print("ℹ Base de datos: wrangler.jsonc ya tiene d1_databases; se respeta tal cual.")
        return
    if os.environ.get("WORKERS_CI") != "1":
        print(f"ℹ Base de datos: ID {db_id[:8]}… válido. Se conectará al publicar en Cloudflare.")
        return
    bloque = ('  ,"d1_databases": [\n'
              f'    {{ "binding": "DB", "database_name": "techrevive-datos", "database_id": "{db_id}" }}\n'
              '  ]\n')
    fin = text.rstrip().rfind("}")
    text = text[:fin] + bloque + text[fin:]
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"✔ Base de datos conectada (ID {db_id[:8]}…).")


def aula_propia():
    """True si el aula virtual propia (content/aula.json) está habilitada y tiene cursos."""
    import aula as pa
    return pa.habilitada()


def escribir_config():
    """js/config.js se genera con los datos de 'Configuración general' del panel."""
    c = g(CFG, "contacto", default={})
    r = g(CFG, "redes", default={})
    c = c if isinstance(c, dict) else {}
    r = r if isinstance(r, dict) else {}
    wa = "".join(ch for ch in str(c.get("whatsapp") or c.get("whatsapp_visible") or "") if ch.isdigit())
    if len(wa) == 8:  # número de Guatemala sin código de país
        wa = "502" + wa
    data = {
        "whatsapp": wa or "50200000000",
        "whatsappDisplay": c.get("whatsapp_visible") or "+502 0000-0000",
        "whatsappMessage": c.get("mensaje_whatsapp") or "Hola TechRevive, me gustaría recibir información sobre sus servicios.",
        "email": c.get("correo") or "contacto@tudominio.com",
        "address": c.get("direccion") or "Tu dirección aquí, Guatemala",
        "mapQuery": c.get("busqueda_mapa") or c.get("direccion") or "Ciudad de Guatemala, Guatemala",
        "hours": c.get("horario") or "",
        "aulaVirtualUrl": g(CFG, "aula_virtual") or (aula_propia() and "/aula/ingresar") or "",
        "social": {k: (r.get(k) or "") for k in ("facebook", "instagram", "tiktok", "linkedin")},
        "formEndpoint": g(CFG, "formulario", "endpoint") or "",
    }
    js = ("/* Archivo generado automáticamente desde el panel (Configuración general).\n"
          "   No lo edites a mano: los cambios se pierden en la siguiente publicación. */\n"
          "window.TECHREVIVE_CONFIG = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")
    with open(os.path.join(OUT, "js", "config.js"), "w", encoding="utf-8") as f:
        f.write(js)


def escribir_extras():
    """version.json (para que el panel sepa cuándo terminó de publicarse un cambio) y /admin → /panel/."""
    from datetime import datetime, timezone
    with open(os.path.join(OUT, "version.json"), "w", encoding="utf-8") as f:
        json.dump({"commit": os.environ.get("WORKERS_CI_COMMIT_SHA") or os.environ.get("CF_PAGES_COMMIT_SHA") or "",
                   "fecha": datetime.now(timezone.utc).isoformat(timespec="seconds")}, f)
    os.makedirs(os.path.join(OUT, "admin"), exist_ok=True)
    with open(os.path.join(OUT, "admin", "index.html"), "w", encoding="utf-8") as f:
        f.write('<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex">'
                '<meta http-equiv="refresh" content="0;url=/panel/"><title>Panel</title>'
                '<a href="/panel/">Ir al panel de administración</a>\n')


def main():
    preparar_salida()
    escribir_config()

    import principal as pp
    import capacitacion as pc
    import recursos as pr
    import prensa as pk
    import cotizador as pq
    import aula as pa

    pp.build_index(pr.posts_preview)
    pp.build_about()
    pp.build_services()
    pp.build_service_pages()
    pc.build_capacitacion(); pc.build_cursos(); pc.build_aula(); pc.build_inscripcion()
    pr.build_blog(); pr.build_articles(); pr.build_faq()
    pk.build_novedades(); pk.build_galeria(); pk.build_redes()
    pq.build_cotizador()
    n_alumnos = pa.build_aula_virtual()
    pk.build_contacto(); pk.build_ubicacion(); pk.build_mapa(pr.POSTS); pk.build_404()
    escribir_extras()

    # sitemap.xml y robots.txt
    urls = "".join(
        f"  <url><loc>{SITE_URL}/{'' if s == 'index.html' else s}</loc>"
        f"<priority>{'1.0' if s == 'index.html' else '0.7'}</priority></url>\n" for s, _, _ in PAGES)
    with open(os.path.join(OUT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n")
    with open(os.path.join(OUT, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(f"User-agent: *\nAllow: /\nDisallow: /panel/\nDisallow: /api/\nDisallow: /aula/\n\nSitemap: {SITE_URL}/sitemap.xml\n")

    configurar_base_datos()
    for w in dict.fromkeys(WARNINGS):
        print("⚠ Aviso:", w)
    print(f"✔ {len(PAGES) + 1} páginas generadas en _site/")
    if pa.habilitada():
        n_lec = sum(len(c["_lessons"]) for c in pa.cursos())
        print(f"✔ Aula virtual: {len(pa.cursos())} cursos, {n_lec} lecciones, {n_alumnos} alumnos con acceso")


if __name__ == "__main__":
    main()
