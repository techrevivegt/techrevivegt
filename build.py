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
        "address": c.get("direccion") or "",
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


# ------------------------------------------------------------------ Rendimiento y seguridad
CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; "
       "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; "
       "font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' https:; "
       "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://www.google.com https://maps.google.com; "
       "connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self' https:; "
       "frame-ancestors 'self'; upgrade-insecure-requests")


def escribir_cabeceras():
    """_headers: Cloudflare lo aplica a los archivos del sitio (no se publica como archivo)."""
    reglas = [
        ("/*", ["X-Content-Type-Options: nosniff", "Referrer-Policy: strict-origin-when-cross-origin",
                "X-Frame-Options: SAMEORIGIN", "Strict-Transport-Security: max-age=31536000; includeSubDomains",
                "Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()",
                "Content-Security-Policy: " + CSP]),
        ("/img/*", ["Cache-Control: public, max-age=86400, stale-while-revalidate=604800"]),
        ("/css/*", ["Cache-Control: public, max-age=3600, stale-while-revalidate=86400"]),
        ("/js/*", ["Cache-Control: public, max-age=3600, stale-while-revalidate=86400"]),
        ("/js/config.js", ["Cache-Control: no-cache"]),
        ("/sw.js", ["Cache-Control: no-cache"]),
        ("/version.json", ["Cache-Control: no-store"]),
    ]
    with open(os.path.join(OUT, "_headers"), "w", encoding="utf-8") as f:
        for ruta, hs in reglas:
            f.write(ruta + "\n" + "".join("  " + h + "\n" for h in hs) + "\n")


def optimizar_imagenes():
    """Usa versiones WebP (más livianas) de las fotos cuando existen y corresponden a la imagen actual.

    src/img/webp.json guarda la huella de cada foto original: si reemplazas una foto desde el
    panel con el mismo nombre, la WebP vieja se ignora (o se regenera si Pillow está instalado).
    """
    import hashlib, re
    img_dir = os.path.join(OUT, "img")
    try:
        with open(os.path.join(img_dir, "webp.json"), encoding="utf-8") as f:
            huellas = json.load(f)
    except (OSError, ValueError):
        huellas = {}
    try:
        from PIL import Image  # opcional: en Cloudflare normalmente no está y no pasa nada
    except Exception:
        Image = None
    validas = set()
    for nombre in os.listdir(img_dir):
        base_, ext = os.path.splitext(nombre)
        if ext.lower() not in (".jpg", ".jpeg", ".png") or base_ in ("favicon", "apple-touch-icon"):
            continue
        ruta = os.path.join(img_dir, nombre)
        webp = os.path.join(img_dir, base_ + ".webp")
        with open(ruta, "rb") as f:
            huella = hashlib.sha1(f.read()).hexdigest()[:16]
        if os.path.exists(webp) and huellas.get(nombre) == huella:
            validas.add(nombre)
            continue
        if Image is not None:
            try:
                im = Image.open(ruta)
                if im.mode in ("P", "LA"):
                    im = im.convert("RGBA")
                im.save(webp, "WEBP", quality=80 if ext.lower() != ".png" else 90, method=4)
                if os.path.getsize(webp) < os.path.getsize(ruta) * 0.95:
                    validas.add(nombre)
                    continue
            except Exception:
                pass
        if os.path.exists(webp) and nombre not in validas:
            os.remove(webp)
    if os.path.exists(os.path.join(img_dir, "webp.json")):
        os.remove(os.path.join(img_dir, "webp.json"))
    if not validas:
        return 0
    patron = re.compile(r'<img\b([^>]*?)\bsrc="((?:/)?img/([^"/]+)\.(?:jpe?g|png))"([^>]*)>', re.I)
    total = 0
    for carpeta, _, archivos in os.walk(OUT):
        if os.sep + "panel" in carpeta:
            continue
        for a in archivos:
            if not a.endswith(".html"):
                continue
            ruta = os.path.join(carpeta, a)
            with open(ruta, encoding="utf-8") as f:
                html = f.read()

            def cambiar(m):
                nonlocal total
                archivo = os.path.basename(m.group(2))
                if archivo not in validas or "data-nowebp" in m.group(0):
                    return m.group(0)
                total += 1
                return (f'<picture><source type="image/webp" srcset="{m.group(2).rsplit(".", 1)[0]}.webp" />'
                        f'{m.group(0)}</picture>')
            nuevo = re.sub(r"<picture>.*?</picture>", lambda m: m.group(0).replace("<img", "<img data-nowebp"), html, flags=re.S)
            nuevo = patron.sub(cambiar, nuevo).replace(" data-nowebp", "")
            nuevo = re.sub(r'<link rel="preload" as="image" href="((?:/)?img/([^"/]+)\.(?:jpe?g|png))" />',
                           lambda m: (f'<link rel="preload" as="image" type="image/webp" href="{m.group(1).rsplit(".", 1)[0]}.webp" />'
                                      if os.path.basename(m.group(1)) in validas else m.group(0)), nuevo)
            if nuevo != html:
                with open(ruta, "w", encoding="utf-8") as f:
                    f.write(nuevo)
    return total


def escribir_app():
    """manifest.webmanifest + sw.js: el sitio se puede «instalar» en el celular y muestra
    una página amable cuando no hay internet. Nunca guarda el panel, el aula ni la API."""
    manifest = {
        "name": "TechRevive", "short_name": "TechRevive", "lang": "es",
        "description": "Reparación de computadoras, soporte técnico, capacitación y desarrollo web.",
        "start_url": "/", "scope": "/", "display": "standalone",
        "theme_color": "#071233", "background_color": "#040A1C",
        "icons": [{"src": "/img/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
                  {"src": "/img/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}],
        "shortcuts": [{"name": "Diagnóstico gratuito", "url": "/diagnostico.html"},
                      {"name": "Seguimiento de reparación", "url": "/seguimiento.html"},
                      {"name": "Cotizador", "url": "/cotizador.html"}],
    }
    with open(os.path.join(OUT, "manifest.webmanifest"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    version = (os.environ.get("WORKERS_CI_COMMIT_SHA") or "")[:8] or str(int(__import__("time").time()))
    sw = """/* TechRevive · service worker (generado por build.py) */
var V = "tr-%s", OFFLINE = "/offline.html";
var PRE = [OFFLINE, "/css/styles.css", "/img/logo-icono.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(PRE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (/^\\/(api|panel|aula|admin)(\\/|$)/.test(u.pathname) || u.pathname === "/version.json" || u.pathname === "/js/config.js") return;
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).catch(function () {
      return caches.match(r).then(function (m) { return m || caches.match(OFFLINE); });
    }));
    return;
  }
  if (/\\.(css|js|png|jpe?g|webp|svg|woff2?)$/.test(u.pathname)) {
    e.respondWith(caches.open(V).then(function (c) {
      return c.match(r).then(function (hit) {
        var net = fetch(r).then(function (res) { if (res.ok) c.put(r, res.clone()); return res; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
  }
});
""" % version
    with open(os.path.join(OUT, "sw.js"), "w", encoding="utf-8") as f:
        f.write(sw)
    # Íconos de la app a partir del logo (si Pillow está disponible; si no, se usan los ya generados)
    for n in (192, 512):
        destino = os.path.join(OUT, "img", f"icon-{n}.png")
        if os.path.exists(destino):
            continue
        try:
            from PIL import Image
            logo = Image.open(os.path.join(OUT, "img", "logo-icono.png")).convert("RGBA")
            lienzo = Image.new("RGBA", (n, n), (4, 10, 28, 255))
            lado = int(n * 0.66)
            logo.thumbnail((lado, lado))
            lienzo.paste(logo, ((n - logo.width) // 2, (n - logo.height) // 2), logo)
            lienzo.convert("RGB").save(destino, optimize=True)
        except Exception:
            shutil.copy(os.path.join(OUT, "img", "logo-icono.png"), destino)


def configurar_ia():
    """Asistente con IA del Doctor TechRevive (Workers AI, plan gratuito de Cloudflare).

    Se activa en Panel → Configuración general → «Asistente con inteligencia artificial».
    Solo en Cloudflare (WORKERS_CI=1) se agrega la conexión "ai" a wrangler.jsonc.
    """
    activo = g(CFG, "asistente_ia") is True or str(g(CFG, "asistente_ia")).lower() in ("true", "1", "si", "sí")
    if not activo:
        return
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wrangler.jsonc")
    with open(path, encoding="utf-8") as f:
        text = f.read()
    if '"ai"' in text:
        return
    if os.environ.get("WORKERS_CI") != "1":
        print("ℹ Asistente con IA: activado. Se conectará al publicar en Cloudflare.")
        return
    fin = text.rstrip().rfind("}")
    text = text[:fin] + '  ,"ai": { "binding": "AI" }\n' + text[fin:]
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("✔ Asistente con IA conectado (Workers AI).")


def versionar_recursos():
    """Agrega ?v=<versión> a los CSS/JS propios de cada página. Así, al publicar un cambio,
    el navegador (y el service worker) descargan los archivos nuevos en lugar de usar los guardados."""
    import re
    version = (os.environ.get("WORKERS_CI_COMMIT_SHA") or "")[:8] or str(int(__import__("time").time()))
    patron = re.compile(r'((?:href|src)=")((?:/?(?:css|js)/)?[\w./-]+\.(?:css|js))(")')
    n = 0
    for raiz, _, archivos in os.walk(OUT):
        for nombre in archivos:
            if not nombre.endswith(".html"):
                continue
            ruta = os.path.join(raiz, nombre)
            with open(ruta, encoding="utf-8") as f:
                html = f.read()
            nuevo = patron.sub(lambda m: m.group(0) if m.group(2).startswith(("http", "//")) else f"{m.group(1)}{m.group(2)}?v={version}{m.group(3)}", html)
            if nuevo != html:
                with open(ruta, "w", encoding="utf-8") as f:
                    f.write(nuevo)
                n += 1
    return n


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
    import herramientas as ph
    ph.build_all()
    pk.build_contacto(); pk.build_ubicacion(); pk.build_mapa(pr.POSTS); pk.build_404()
    escribir_extras()
    escribir_cabeceras()
    escribir_app()
    n_webp = optimizar_imagenes()
    versionar_recursos()

    # sitemap.xml y robots.txt
    urls = "".join(
        f"  <url><loc>{SITE_URL}/{'' if s == 'index.html' else s}</loc>"
        f"<priority>{'1.0' if s == 'index.html' else '0.7'}</priority></url>\n" for s, _, _ in PAGES)
    with open(os.path.join(OUT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n")
    with open(os.path.join(OUT, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(f"User-agent: *\nAllow: /\nDisallow: /panel/\nDisallow: /api/\nDisallow: /aula/\n\nSitemap: {SITE_URL}/sitemap.xml\n")

    configurar_base_datos()
    configurar_ia()
    for w in dict.fromkeys(WARNINGS):
        print("⚠ Aviso:", w)
    print(f"✔ {len(PAGES) + 1} páginas generadas en _site/" + (f" · {n_webp} imágenes en WebP" if n_webp else ""))
    if pa.habilitada():
        n_lec = sum(len(c["_lessons"]) for c in pa.cursos())
        print(f"✔ Aula virtual: {len(pa.cursos())} cursos, {n_lec} lecciones, {n_alumnos} alumnos con acceso")


if __name__ == "__main__":
    main()
