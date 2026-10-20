# TechRevive · Fuente del sitio multipágina

Este es el **generador** del sitio. No se sube a Cloudflare: se sube la carpeta generada `techrevive-sitio/`.

## Generar el sitio
Requiere Python 3 (no necesita librerías extra):

    python3 build.py

Crea (o reemplaza) la carpeta `../techrevive-sitio/` con las 23 páginas.

## Dónde se edita cada cosa
| Qué | Archivo |
|---|---|
| WhatsApp, correo, dirección, horarios, redes, aula virtual, mapa | `js/config.js` (también se puede editar directo en el sitio generado) |
| Menú, encabezado, pie de página, dominio (SITE_URL) | `site_base.py` |
| Inicio, ¿Quiénes somos?, Servicios y cada servicio | `pag_principal.py` (+ `home_a.html`, `home_b.html`) |
| Capacitación, cursos, aula virtual, inscripción | `pag_capacitacion.py` |
| Blog, artículos, preguntas frecuentes | `pag_recursos.py` |
| Novedades, galería, redes, contacto, ubicación, mapa del sitio, 404 | `pag_prensa_contacto.py` |
| Estilos | `css/styles.css` (base) y `css/paginas.css` (páginas internas) |
| Imágenes | `img/` |
