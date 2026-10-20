# TechRevive: sitio web con panel de administración

Con esta versión puedes **editar textos, fotos, servicios, cursos, artículos del blog, novedades y la galería desde un panel en el navegador**, sin tocar código. Cada vez que guardas, el sitio se actualiza solo en 1 o 2 minutos.

**Cómo funciona:**

```
Panel (Pages CMS)  →  guarda los cambios en  →  GitHub  →  Cloudflare reconstruye y publica el sitio
```

Todo es gratis. Lo configuras **una sola vez** (unos 20 minutos) siguiendo los pasos 1 a 5.

---

## Paso 1 · Crear tu cuenta de GitHub

GitHub es donde se guardan los archivos de tu sitio. El panel y Cloudflare se conectan a él.

1. Entra en **https://github.com/signup**.
2. Escribe tu **correo**, una **contraseña** y un **nombre de usuario** (por ejemplo `techrevive-gt`).
3. Resuelve la verificación ("no soy un robot").
4. Revisa tu correo, copia el **código de 8 dígitos** que te envió GitHub y pégalo.
5. Si te hace preguntas de bienvenida, puedes saltarlas (*Skip personalization*).
6. Elige el plan **Free** (gratis). Es suficiente.

> 💡 Te recomendamos activar la verificación en dos pasos en *Settings → Password and authentication*. Protege tu sitio.

---

## Paso 2 · Crear el repositorio y subir los archivos

Un **repositorio** es la carpeta de tu sitio dentro de GitHub.

1. Descomprime **techrevive-panel.zip** en tu computadora.
2. En GitHub, haz clic en el botón **+** (arriba a la derecha) y luego en **New repository**.
3. En **Repository name** escribe `techrevive`.
4. Elige **Private** (privado; solo tú lo ves) o **Public**. Los dos funcionan.
5. **No** marques "Add a README". Haz clic en **Create repository**.
6. En la página que aparece, haz clic en el enlace **uploading an existing file**.
7. Abre la carpeta descomprimida `techrevive-panel`, selecciona **todo su contenido** (las carpetas `content`, `generador` y `src`, y los archivos `build.py`, `.pages.yml`, etc.) y **arrástralo** a la página de GitHub.
   - ⚠️ Arrastra **lo que está dentro** de la carpeta, no la carpeta completa.
8. Espera a que terminen de cargar los archivos. Luego haz clic en **Commit changes**.

### ✅ Comprueba que se subió `.pages.yml`

Los archivos que empiezan con punto están **ocultos** en Mac (y a veces en Windows). Sin `.pages.yml`, el panel no funciona.

Si **no** ves `.pages.yml` en la lista de archivos del repositorio:

1. Haz clic en **Add file → Create new file**.
2. En el nombre escribe exactamente: `.pages.yml`
3. Abre el archivo **copia-de-pages.yml.txt** (incluido en el zip) con el Bloc de notas o TextEdit, copia **todo** su contenido y pégalo.
4. Haz clic en **Commit changes**.

> En Mac también puedes mostrar los archivos ocultos con **Cmd + Shift + .** (punto) en el Finder.

---

## Paso 3 · Publicar el sitio en Cloudflare (conectado a GitHub)

> ℹ️ El proyecto que creaste antes en Cloudflare subiendo archivos **no se puede conectar a GitHub**. Por eso creas uno nuevo. Al final de este paso te explicamos qué hacer con el anterior.

1. Entra en **https://dash.cloudflare.com** → **Workers & Pages** → **Create** (o *Create application*).
2. Elige la pestaña **Pages** y luego **Connect to Git** (o *Import an existing Git repository*).
3. Elige **GitHub** y haz clic en **Connect GitHub**. Autoriza a Cloudflare. Cuando te pregunte a qué repositorios dar acceso, elige **Only select repositories → techrevive** y confirma.
4. Selecciona el repositorio `techrevive` y haz clic en **Begin setup**.
5. Completa la configuración **exactamente así**:

   | Campo | Valor |
   |---|---|
   | Project name | `techrevive` (si ya está ocupado, por ejemplo `techrevive-gt`) |
   | Production branch | `main` |
   | Framework preset | **None** |
   | Build command | `python3 build.py` |
   | Build output directory | `_site` |

6. Haz clic en **Save and Deploy**. En 1 o 2 minutos verás **Success** y la dirección de tu sitio, por ejemplo `https://techrevive-gt.pages.dev`.

**¿Lo publicaste como Worker (dirección `…workers.dev`)?** También funciona. Comprueba en Cloudflare → tu Worker → **Settings → Build** que:

| Campo | Valor |
|---|---|
| Git repository | tu repositorio `techrevive` (conectado) |
| Build command | `python3 build.py` |
| Deploy command | `npx wrangler deploy` |

Si en lugar de eso dice que no hay repositorio conectado, haz clic en **Connect** y elige `techrevive`. Sin esa conexión, los cambios del panel no se publican.

**¿Qué hago con el proyecto anterior?**

- **Si quieres conservar la dirección `techrevive.pages.dev`:** primero elimina el proyecto anterior (*Settings → Delete project*) y luego crea el nuevo con el nombre `techrevive`.
- **Si tienes un dominio propio:** quítalo del proyecto anterior y agrégalo al nuevo en *Custom domains*.

---

## Paso 4 · Entrar al panel de administración

**Acceso rápido desde tu propio sitio:** escribe **`/panel`** al final de tu dirección, por ejemplo `https://techrevive.techrevive-gt.workers.dev/panel` (también sirve `/admin`). Esa página tiene el botón **Entrar al panel**. No aparece en el menú ni en Google; guárdala en favoritos.

> Para que el botón abra **directo tu repositorio**, entra una vez al panel y completa **Configuración general → Acceso al panel** con tu usuario de GitHub (el repositorio normalmente es `techrevive` y la rama `main`).

La primera vez:

1. Entra en **https://app.pagescms.org** (o usa el botón de `/panel`).
2. Haz clic en **Sign in with GitHub** y autoriza a Pages CMS.
3. Te pedirá **instalar la aplicación de Pages CMS** en GitHub. Elige **Only select repositories → techrevive** y haz clic en **Install**.
4. Elige el repositorio **techrevive** (rama `main`).

Verás el menú del panel:

- ⚙️ Configuración general
- 📄 Páginas
- 🎓 Capacitación
- 📝 Blog
- 📰 Sala de prensa

**Guarda en favoritos** `app.pagescms.org`: desde ahí administrarás el sitio.

---

## Paso 5 · Pon tus datos reales (primera edición)

Entra en **⚙️ Configuración general** y completa:

- **WhatsApp:** número para los enlaces, solo números con código de país (ej. `50212345678`), y número como se muestra (ej. `+502 1234-5678`).
- **Correo, dirección, horario y búsqueda para el mapa.**
- **Redes sociales:** enlaces completos (`https://…`).
- **Aula virtual:** enlace de Google Classroom, Moodle, etc. (si aún no tienes, déjalo vacío).
- **Sitio → Dirección del sitio:** la dirección que te dio Cloudflare en el paso 3 (o tu dominio).

Haz clic en **Save**. Espera 1 o 2 minutos y recarga tu sitio: ¡ya tiene tus datos! 🎉

---

## Uso diario: qué se edita en cada sección

| En el panel | Qué cambia en el sitio |
|---|---|
| ⚙️ **Configuración general** | WhatsApp, correo, dirección, horario, mapa, redes, aula virtual, opciones del formulario y Formspree. En **Sitio**: la dirección web, el eslogan, el **logo** (ícono junto al nombre) y el **ícono de la pestaña** del navegador. |
| 📄 Páginas → 🏠 **Inicio** | Portada, barra de valores, ¿Por qué TechRevive?, Tecnología para todos, Negocios, Proyectos, Testimonios, cantidad de artículos y llamado final. Cada sección tiene un interruptor **Mostrar**. |
| 📄 Páginas → 👋 **¿Quiénes somos?** | Historia, misión, visión, valores y "A quién servimos". |
| 📄 Páginas → 🛠️ **Servicios** | Las tarjetas de servicios **y** la página completa de cada servicio. Si agregas un servicio, se crea su página y aparece solo en el menú y en el pie de página. |
| 📄 Páginas → 🔄 **Nuestro proceso** | Los 5 pasos (Diagnóstico → Soporte) que aparecen en varias páginas. |
| 📄 Páginas → ❓ **Preguntas frecuentes** | Categorías y preguntas. |
| 🎓 Capacitación → 📚 **Cursos** | La lista de cursos. Se actualizan la página de cursos, el formulario de inscripción y la lista de la portada. |
| 🎓 Capacitación → 🧑‍🏫 **Página de Capacitación** | Portada, enfoque, modalidades, ¿para quién?, pasos, aviso de horarios y preguntas de cursos. |
| 📝 **Blog** | Artículos: **Add entry** para crear uno. Desactiva **Publicado** para guardarlo como borrador. |
| 📰 Sala de prensa → 📣 **Novedades** | Comunicados. La primera de la lista se destaca. Sin fecha se muestra "Próximamente". |
| 📰 Sala de prensa → 🖼️ **Galería** | Fotos con su descripción y categoría (para los filtros). |

### Consejos

- **Fotos:** súbelas en formato JPG, de unos 1200 a 1600 px de ancho y menos de 500 KB. Puedes reducirlas gratis en **squoosh.app**. Escribe siempre la **descripción de la imagen**: ayuda a Google y a personas con discapacidad visual.
- **Etiquetas de ejemplo:** cuando reemplaces un proyecto, foto, novedad o testimonio de muestra por uno real, **desactiva** la casilla "demostrativo" o "de ejemplo".
- **Testimonios:** publica solo opiniones reales y con permiso del cliente.
- **Enlaces de botones:** escribe una página (`cursos.html`, `contacto.html#formulario`), la palabra `whatsapp` o un enlace completo (`https://…`).
- **Orden:** en las listas puedes arrastrar los elementos para cambiar su orden.
- **Cambiar el nombre de una página de servicio** cambia su dirección. Los enlaces que hayas compartido antes dejarán de funcionar.

### ¿Más personas pueden editar?

Sí. En Pages CMS, entra en **Settings → Collaborators** e invita por correo. Esas personas **no necesitan cuenta de GitHub**.

---

## Si algo sale mal

- **Guardé y el sitio no cambió:** espera 2 minutos y recarga con **Ctrl + F5** (en Mac, **Cmd + Shift + R**). Para revisar el estado, entra en Cloudflare → tu proyecto → **Deployments**.
- **La publicación falló (Failed):** tu sitio **sigue en línea con la versión anterior**; no se rompe nada. Abre el despliegue fallido y lee el mensaje que empieza con ✖ ERROR: indica qué archivo revisar. Para deshacer un cambio, en GitHub entra en *Commits*, abre el último cambio y usa **Revert**, o vuelve a editar ese contenido en el panel.
- **Avisos ⚠ en el registro:** por ejemplo, "La imagen … no existe". El sitio se publica igual, pero conviene corregirlo.
- **Formularios:** si el enlace de Formspree está vacío, los formularios abren WhatsApp con la solicitud lista. Para recibirlos por correo, crea un formulario gratis en **formspree.io** y pega su enlace en Configuración general → Formularios.

---

## Lo que no se edita desde el panel

Estas páginas tienen textos fijos y se ajustan en el código (`generador/`). Si necesitas cambiarlas, pídelo y se agregan al panel:

- La página de **Redes sociales** (los enlaces sí se editan en Configuración).
- El **directorio** de la página Contacto y la página **Ubicación** (los datos de contacto y el mapa sí se editan).
- Los textos fijos del **aula virtual** y de la **inscripción**.
- La página **404**.

El **mapa del sitio**, `sitemap.xml` y el menú se generan **solos**.

---

## Para el desarrollador (opcional)

- **Compilar en tu computadora:** `python3 build.py`. Genera `_site/` y solo necesita Python 3.12 o superior, sin instalar nada más. Para verlo: `python3 -m http.server -d _site 8080`.
- **Estructura:**
  - `content/`: el contenido en JSON (lo que edita el panel).
  - `src/`: CSS, JavaScript e imágenes.
  - `generador/`: plantillas en Python.
  - `.pages.yml`: la definición del panel.
- **Si un JSON tiene un error de formato,** la compilación se detiene a propósito para que Cloudflare mantenga la versión anterior en línea.
- **Alternativa con Workers:** `wrangler.jsonc` ya apunta a `./_site`. Usa el build command `python3 build.py` y el deploy command `npx wrangler deploy`.
