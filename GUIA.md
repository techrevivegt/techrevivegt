# TechRevive · Guía del panel de administración

Tu sitio tiene un **panel propio** en:

> **https://techrevive.techrevive-gt.workers.dev/panel**
> (también funciona `/admin`)

Entras con una **contraseña**, cambias lo que quieras y pulsas **Guardar cambios**. El panel te avisa cuando el cambio ya se ve en el sitio (1 o 2 minutos). No necesitas otras páginas ni otras cuentas para editar.

**Cómo funciona por dentro:** cuando guardas, el panel guarda el cambio en tu repositorio de GitHub. Cloudflare lo detecta y vuelve a publicar el sitio solo.

---

## Instalación (una sola vez, unos 10 minutos)

### Paso 1 · Subir los archivos a GitHub

1. Descomprime `techrevive-panel.zip`.
2. Entra a tu repositorio **techrevivegt/techrevivegt** en GitHub y elige **Add file → Upload files**.
3. Abre la carpeta descomprimida, selecciona **todo** con **Ctrl + A**, arrástralo a la página y pulsa **Commit changes**.

Deben quedar estas carpetas y archivos (además de los que ya tenías):

```
📁 content   📁 generador   📁 src   📁 worker   ← carpeta nueva del panel
build.py   wrangler.jsonc   GUIA.md   .pages.yml   .python-version   .gitignore
```

> ⚠️ **Más adelante, cuando ya edites desde el panel:** si vuelves a subir un zip, **no subas la carpeta `content`**. Ahí se guarda lo que editas en el panel, y si la subes se reemplaza por la del zip.

### Paso 2 · Crear la "llave" de GitHub (token)

El panel necesita permiso para guardar en tu repositorio. Ese permiso es un *token*:

1. En GitHub, haz clic en tu foto (arriba a la derecha) → **Settings**.
2. Abajo del menú izquierdo: **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
3. Llena así:

| Campo | Qué poner |
|---|---|
| Token name | `Panel TechRevive` |
| Expiration | La más larga que permita (por ejemplo, 1 año). Anota la fecha: ese día hay que crear uno nuevo. |
| Repository access | **Only select repositories** → elige `techrevivegt/techrevivegt` |
| Permissions → Repository permissions | **Contents** → **Read and write** (si ves un botón **Add permissions**, búscalo ahí) |

4. Pulsa **Generate token** y **copia** el código que empieza con `github_pat_…`. Solo se muestra una vez; si lo pierdes, genera otro.

### Paso 3 · Poner la contraseña y el token en Cloudflare

1. En Cloudflare entra en **Workers & Pages → techrevive → Settings → Variables and Secrets**.
2. Pulsa **+ Add** y crea estos dos, los dos con **Type: Secret**:

| Variable name | Value |
|---|---|
| `PANEL_PASSWORD` | La contraseña que quieras para entrar al panel (usa una larga, que no uses en otro lado) |
| `GITHUB_TOKEN` | El código `github_pat_…` que copiaste |

3. Pulsa **Deploy** (o **Save**).

> El repositorio (`techrevivegt/techrevivegt`) y la rama (`main`) ya vienen configurados en `wrangler.jsonc`. Si algún día cambias de repositorio, edita ahí `GITHUB_REPO`.

### Paso 4 · Revisar la publicación automática

En **Settings → Build** del mismo Worker debe estar (como ya lo tienes):

| Campo | Valor |
|---|---|
| Git repository | `techrevivegt/techrevivegt` |
| Build command | `python3 build.py` |
| Deploy command | `npx wrangler deploy` |

### Paso 5 · Entrar

Abre **`/panel`** en tu sitio, escribe tu contraseña y listo. Si falta algo de la configuración, el mismo panel te muestra qué falta (✅ / ⬜).

---

## Uso diario

1. Entra a `/panel`.
2. Elige una sección en el menú de la izquierda (en el celular, en el botón ☰).
3. Haz tus cambios. Arriba aparece **"Sin guardar"**.
4. Pulsa **💾 Guardar cambios** (o **Ctrl + S**).
5. Arriba verás **"Publicando…"** y después **"✓ Publicado"**: ya se ve en el sitio.

| Sección del panel | Qué cambia en el sitio |
|---|---|
| ⚙️ **Configuración general** | WhatsApp, correo, dirección, horario, mapa, redes sociales, aula virtual, opciones del formulario, textos de la sección de contacto, **logo** e ícono de la pestaña. |
| 🏠 **Inicio** | Portada, valores, ¿Por qué TechRevive?, capacitación, negocios, proyectos, testimonios, blog y el recuadro azul final. |
| 👋 **¿Quiénes somos?** | Historia, misión, visión, valores y "A quién servimos". |
| 🛠️ **Servicios** | Las tarjetas **y** la página de cada servicio. Si agregas uno, se crea su página y aparece en el menú. |
| 💲 **Tarifario y cotizador** | Servicios y precios por categoría, tarjetas «¿Qué quiere el cliente?», opciones de las listas (marcas, sistemas, síntomas…), vigencia, recargo por urgencia, logo de la impresión, nota y términos y condiciones. |
| 🔄 **Nuestro proceso** | Los pasos (Diagnóstico → Soporte). |
| ❓ **Preguntas frecuentes** | Categorías y preguntas. |
| 📚 **Cursos** | La lista de cursos (página de cursos, inscripción y portada). |
| 🧑‍🏫 **Página de Capacitación** | Portada, enfoque, modalidades, pasos y preguntas. |
| 📘 **Cursos del aula** | Aula virtual: cursos, módulos, lecciones (videos, lecturas, cuestionarios, tareas), materiales en PDF y avisos. |
| 👥 **Alumnos y accesos** | Quién puede entrar al aula: usuario, contraseña, cursos asignados, activo y fecha de vencimiento. |
| 📝 **Blog** | Crear, editar, borrar artículos. Apaga **Publicado** para dejarlo como borrador. |
| 📣 **Novedades** | Comunicados y anuncios. |
| 🖼️ **Galería** | Fotos con descripción y categoría. |

### Herramientas

- **Listas:** **+ Agregar** crea un elemento, **▲ ▼** cambian el orden y **✕** lo quita. Haz clic en el nombre de un elemento para abrirlo.
- **Mostrar:** muchas secciones tienen este interruptor. Apágalo para ocultar la sección sin borrar su contenido.
- **Imágenes:**
  - **Subir imagen** usa una foto de tu computadora o celular; se achica sola si es muy grande.
  - **Elegir una existente** reutiliza una foto que ya está en el sitio.
  - Después de elegirla, pulsa **Guardar cambios**.
- **Texto con formato** (artículos del blog y respuestas de preguntas frecuentes): botones para negrita, subtítulos, listas y enlaces.
- Si intentas salir con cambios sin guardar, el panel te avisa.

### Tarifario y cotizador (`/cotizador`)

- Está en el menú **Servicios → Tarifario y cotizador**. Lo pueden usar los clientes (para tener un precio estimado) y el técnico (para la recepción y la cotización formal).
- **Pasos:** cliente → equipo (tipo, marca, modelo, serie, sistema, accesorios, estado físico) → especificaciones → diagnóstico previo (lo que reporta el cliente) → qué quiere el cliente → tarifario → repuestos → diagnóstico técnico, descuento y anticipo.
- **Imprimir / guardar PDF** genera una cotización formal con el logo, el número `TR-AAAAMMDD-XXXX`, la fecha de vencimiento, una tabla de precios, los términos y las líneas de firma. Para guardarla como PDF, elige **Guardar como PDF** en el destino de la impresora. Si aparecen la dirección web y la fecha en los bordes, desactiva **Encabezados y pies de página** en *Más opciones*.
- **Enviar por WhatsApp** manda el resumen a TechRevive (el número de Configuración general) o al cliente (el teléfono del paso 1).
- Lo escrito se guarda solo **en ese navegador** hasta que pulses **Nueva cotización**. No se envía a ningún servidor.
- **Precios:** en el panel escribe solo el número (ej. `175`). Activa **Precio «desde»** cuando el precio final depende del diagnóstico. Activa **Se cobra por unidad** para servicios por hora o por programa.
- Si cambias el nombre de una categoría, cambia también la **Categoría que se abre** en las tarjetas «¿Qué quiere el cliente?». Lo mismo con los **servicios que se marcan solos**: el nombre debe ser idéntico.

### Aula virtual (`/aula/ingresar`)

- El botón **Ingresar al aula virtual** del sitio lleva a `/aula/ingresar`. Cada alumno entra con **su** usuario y contraseña; sin sesión, ninguna página del aula, video o PDF es visible.
- **Dar acceso a un alumno:** panel → **👥 Alumnos y accesos** → **+ Agregar** → nombre, usuario (ej. `maria.lopez`), contraseña (**🎲 Generar** y **Copiar**), cursos (el identificador, ej. `computacion-basica`, o `todos`) → **Guardar cambios**. En 1–2 minutos ya puede entrar. Envíale sus datos por WhatsApp.
- **Quitar el acceso:** apaga **Acceso activo** o pon una fecha en **Acceso hasta**. Al día siguiente de esa fecha ya no puede entrar. Si estaba dentro, su sesión se cierra en la siguiente publicación.
- **Crear un curso:** panel → **📘 Cursos del aula** → **Cursos → + Agregar** → nombre, **identificador** (corto, sin espacios ni tildes), imagen → **Módulos → + Agregar** → **Lecciones → + Agregar**.
- **Tipos de lección:**
  - **Video:** pega el enlace de YouTube (súbelo como **No listado**), Vimeo o Google Drive. Se reproduce dentro del aula.
  - **Lectura:** solo el texto con formato.
  - **Cuestionario:** agrega **Preguntas**, cada una con sus opciones, el **número** de la correcta (1, 2, 3…) y una explicación. Se califica al instante; con la **nota mínima** (70 % por defecto) la lección queda completada.
  - **Tarea:** instrucciones, fecha límite y, si quieres, un enlace de entrega (ej. Google Forms). Siempre aparece el botón **Enviar por WhatsApp**, que te llega con el nombre del alumno, el curso y la tarea.
- **Materiales:** en cada lección, **Materiales → + Agregar → Subir archivo** (PDF, Word, Excel, PowerPoint, ZIP o TXT; máx. 15 MB). Para archivos más pesados usa un enlace de Google Drive.
- El **progreso** (lecciones completadas y notas) se guarda en el navegador del alumno. Si cambia de computadora o borra sus datos, empieza de cero; sus accesos no se pierden.
- Cuentas de ejemplo incluidas: `demo` (todos los cursos) y `alumno.prueba` (solo Computación básica). Sus contraseñas están en el documento de accesos. **Desactívalas o bórralas** cuando ya no las necesites.
- Si en algún momento prefieres Google Classroom o Moodle, pega su enlace en **Configuración general → Enlace de un aula externa**. El botón del sitio llevará ahí en lugar del aula propia.

### Seguridad

- La contraseña solo está en Cloudflare. Para cambiarla, edita `PANEL_PASSWORD` en **Variables and Secrets**.
- La sesión dura 12 horas. Usa **Cerrar sesión** en computadoras compartidas.
- El panel no aparece en Google ni en el menú del sitio.

---

## Si algo sale mal

El panel muestra mensajes claros. Los más comunes:

| Mensaje | Solución |
|---|---|
| "Falta un último paso" con casillas ⬜ | Falta `PANEL_PASSWORD` o `GITHUB_TOKEN` en Cloudflare (Paso 3). |
| "GitHub rechazó el token" | El token venció o se copió mal. Crea uno nuevo (Paso 2) y reemplaza `GITHUB_TOKEN`. |
| "El token no tiene permiso para guardar" | Al token le falta **Contents: Read and write**. |
| "GitHub no encuentra el repositorio" | El token no incluye tu repositorio, o `GITHUB_REPO` en `wrangler.jsonc` está mal escrito. |
| "Este contenido cambió desde que lo abriste" | Se guardó desde otra pestaña. Recarga la página (tus cambios sin guardar se pierden). |
| "Tarda más de lo normal" | Revisa **Cloudflare → techrevive → Deployments**. Si hay uno en rojo, abre el registro y envíalo a tu desarrollador. El sitio anterior sigue en línea. |
| `/panel` muestra el error 404 | Todavía no se publicó la versión con el panel: sube los archivos (Paso 1) y espera a que el despliegue diga **Success**. |

---

## Lo que no se edita desde el panel

Textos fijos de: la página **Redes sociales** (los enlaces sí se editan), el **directorio** de Contacto, la página **Ubicación** (los datos y el mapa sí se editan), los textos fijos de la página informativa del **aula virtual** y de la **inscripción**, y la página **404**. El **mapa del sitio**, `sitemap.xml` y el menú se generan solos.

---

## Para el desarrollador (opcional)

- **Compilar localmente:** ejecuta `python3 build.py` (Python 3.12+, sin dependencias). Genera `_site/`.
- **Panel:**
  - `src/panel/` contiene la interfaz: `index.html`, `panel.js`, `panel.css` y `schema.json`, que define los campos de cada sección.
  - `worker/index.js` es la API `/api/*`: sesión con cookie firmada (HMAC), lectura y escritura vía la GitHub Contents API, y subida de imágenes a `src/img/`.
  - Solo se permiten estas rutas: `content/*.json`, `content/blog/*.json` e imágenes en `src/img/`.
- **Aviso de "Publicado":** `build.py` escribe `_site/version.json` con `WORKERS_CI_COMMIT_SHA`, y el panel lo compara con el commit que acaba de guardar.
- **Cotizador:** `generador/cotizador.py` genera `cotizador.html` desde `content/tarifario.json` (los precios también quedan en el HTML para Google). La lógica está en `src/js/cotizador.js` y los estilos de pantalla e impresión (`@media print`, documento `#qp`) en `src/css/cotizador.css`.
- **Aula virtual:**
  - `generador/aula.py` genera `_site/aula/` desde `content/aula.json` y copia `src/aula-archivos/` a `/aula/archivos/`.
  - También escribe `worker/aula-datos.js` con los alumnos de `content/alumnos.json`: contraseñas con SHA-256 y sal aleatoria, cursos, activo y vencimiento. Ese archivo se genera en cada build y **no** se sube a GitHub (`.gitignore`).
  - `worker/index.js` atiende `/aula/*` gracias a `run_worker_first` en `wrangler.jsonc`. Usa la cookie firmada `tr_aula` (14 días, clave `AULA_SECRET` o `PANEL_PASSWORD`), la API `/api/aula/login|logout|yo` y la subida de materiales `/api/documento`.
  - Las respuestas del aula llevan `Cache-Control: private, no-store` y `X-Robots-Tag: noindex`, y `/aula/` está en `Disallow` de `robots.txt`.
  - La interfaz está en `src/js/aula.js` y `src/css/aula.css`.
- `.pages.yml` sigue presente por compatibilidad con Pages CMS, pero ya no es necesario.
