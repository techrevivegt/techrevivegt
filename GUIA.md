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

### Paso 6 · Conectar la base de datos (estadísticas y certificados)

Sin este paso el sitio, el panel y el aula funcionan igual; solo quedan apagadas las **estadísticas de visitas**, los **certificados** y el progreso del aula guardado en la cuenta del alumno. Es gratis (plan Free de Cloudflare) y se hace una sola vez:

1. En Cloudflare: **Storage & databases → D1 SQL database → Create database**. Nombre: `techrevive-datos` → **Create**.
2. Copia el **Database ID** (se ve así: `1a2b3c4d-1234-5678-9abc-1234567890ab`).
3. Dale permiso a la publicación automática: **tu perfil (arriba a la derecha) → API Tokens** → el token llamado **«Workers Builds – …»** → **Edit** → **+ Add more** → **Account · D1 · Edit** → **Continue to summary** → **Update token**.
4. En el panel: **⚙️ Configuración general → «ID de la base de datos»** → pega el ID → **Guardar cambios**.
5. Espera a **"✓ Publicado"** y abre **📊 Estadísticas de visitas**. Las tablas se crean solas.

> Si después de guardar el ID la publicación sale en rojo en **Deployments**, borra el ID en Configuración general y guarda: el sitio vuelve a publicarse como antes. Revisa el permiso del paso 3 y pégalo otra vez.

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
| 📊 **Estadísticas de visitas** | Solo consulta: visitas, visitantes, tiempo, países, ciudades, dispositivos, navegadores, mapa, páginas y detalle con IP. Exporta a Excel (CSV). |
| 📘 **Cursos del aula** | Un archivo por curso: datos, objetivos, requisitos, horas del certificado, módulos y lecciones (videos, lecturas, cuestionarios, tareas, examen final) y materiales. |
| 🏅 **Certificados** | Aprobar o rechazar solicitudes, ver y anular certificados, emitir uno a mano y ver el progreso de cada alumno. |
| 👥 **Alumnos y accesos** | Quién puede entrar al aula: usuario, contraseña, cursos asignados, activo y fecha de vencimiento. |
| ⚙️ **Ajustes del aula y certificado** | Bienvenida, avisos, nota mínima y el diseño del certificado: título, textos, lugar, logo y firmas. |
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
- **Cursos incluidos:** **Computación básica** (5 módulos, 22 lecciones, 20 horas) y **Reparación y mantenimiento de computadoras** (5 módulos, 25 lecciones, 30 horas). Ambos tienen lecturas, videos de YouTube en español (con el crédito del canal), cuestionarios, tareas, proyecto final y **examen final**. Los demás cursos del catálogo se agregan en próximas entregas.
- **Crear un curso:** panel → **📘 Cursos del aula** → **+ Nuevo curso** → nombre → **Guardar cambios**. El identificador (ej. `ofimatica-word-excel-y-powerpoint`) se crea solo con el nombre: es el que pones en los **Cursos** de cada alumno. Después agrega **Módulos → Lecciones**. Un curso sin lecciones no aparece en el aula todavía.
- **Tipos de lección:**
  - **Video:** pega el enlace de YouTube (súbelo como **No listado**), Vimeo o Google Drive. Se reproduce dentro del aula.
  - **Lectura:** solo el texto con formato.
  - **Cuestionario:** agrega **Preguntas**, cada una con sus opciones, el **número** de la correcta (1, 2, 3…) y una explicación. Se califica al instante; con la **nota mínima** (70 % por defecto) la lección queda completada.
  - **Examen final:** un cuestionario con la casilla **Examen final** activada. Para pedir el certificado hay que aprobarlo con la nota mínima.
  - **Tarea:** instrucciones, fecha límite y, si quieres, un enlace de entrega (ej. Google Forms). Siempre aparece el botón **Enviar por WhatsApp**, que te llega con el nombre del alumno, el curso y la tarea.
- **Materiales:** en cada lección, **Materiales → + Agregar → Subir archivo** (PDF, Word, Excel, PowerPoint, ZIP o TXT; máx. 15 MB). Para archivos más pesados usa un enlace de Google Drive.
- El **progreso** (lecciones completadas y notas) se guarda en el navegador del alumno **y**, si la base de datos está conectada (Paso 6), también en su cuenta: puede cambiar de computadora o celular sin perder nada.
- Cuentas de ejemplo incluidas: `demo` (todos los cursos) y `alumno.prueba` (solo Computación básica). Sus contraseñas están en el documento de accesos. **Desactívalas o bórralas** cuando ya no las necesites.
- Si en algún momento prefieres Google Classroom o Moodle, pega su enlace en **Configuración general → Enlace de un aula externa**. El botón del sitio llevará ahí en lugar del aula propia.

### Certificados (requiere el Paso 6)

1. El alumno termina **todas** las lecciones y aprueba el examen final. En la página del curso aparece **Solicitar certificado**: escribe su nombre completo, lo confirma y envía.
2. En el panel, **🏅 Certificados → Solicitudes** aparece con su avance y su nota. **Corrige el nombre si hace falta** (tildes, apellidos) y las horas → **✓ Aprobar** (o **✕ Rechazar** con un motivo; el alumno lo ve y puede volver a pedirlo).
3. Al aprobarlo, el alumno lo ve en **Mis certificados** del aula y puede **imprimirlo o guardarlo en PDF** (hoja **tamaño carta horizontal**; en el diálogo de impresión deja márgenes en «Ninguno» y activa «Gráficos de fondo» si tu navegador lo pide), copiar el enlace o compartirlo por WhatsApp.
- Cada certificado tiene un **código** (ej. `TR-AB12-CD34`) y un **código QR**. Cualquiera puede verificarlo en `/certificado?c=CÓDIGO`. Si lo **anulas**, la verificación dirá que fue revocado (puedes restaurarlo).
- **Emitir manualmente:** para cursos presenciales o talleres que no están en el aula: nombre, curso, horas y fecha.
- **Progreso de alumnos:** cuántas lecciones lleva cada alumno en cada curso y su última actividad.
- **Aspecto:** franja azul marino con circuitos, sello TechRevive, código QR de verificación y el nombre del alumno en grande (si el nombre o el curso son muy largos, la letra se ajusta sola o pasa a dos líneas).
- **Diseño:** **⚙️ Ajustes del aula y certificado → Certificado**. Cambia los textos, el lugar, el logo y las **firmas**: nombre, cargo y, si quieres, la imagen de la firma escaneada (PNG con fondo transparente). Las firmas incluidas son de ejemplo: **cámbialas por las reales**.
- Al imprimir, desactiva **Encabezados y pies de página** en *Más opciones* y activa **Gráficos de fondo** para que salgan los colores.

### Estadísticas de visitas (requiere el Paso 6)

- **📊 Estadísticas de visitas** muestra arriba: vistas de hoy, de los últimos 7 días, total desde el inicio, visitantes distintos y páginas con visitas. Debajo: tiempo total en el sitio, promedio por visitante, páginas por visita y alumnos activos.
- **Gráfica de páginas vistas** por día, con el número sobre cada barra. En 90 días o 1 año agrupa por semana o mes.
- **Listas:** por página, dispositivo, país, ciudad/región, navegador, sistema y de dónde llegaron (Directo, Google, Facebook, Instagram, WhatsApp…). También el horario de visitas (hora de Guatemala).
- **Mapa:** cada círculo es un lugar desde donde entraron. Tócalo para ver las visitas y las personas.
- **⏱️ Tiempo por sección:** cuánto tiempo pasaron en cada parte de cada página (Portada, Servicios, Testimonios, Contacto…). En el aula: Video, Lectura, Cuestionario, Tarea… Solo cuenta mientras la pestaña está a la vista y la persona no está inactiva.
- **Detalle de cada visita** (las últimas 300): fecha, página y secciones vistas, tiempo, dispositivo, lugar, **IP**, visitante, alumno y de dónde llegó. Usa el buscador (ciudad, IP, página…) o toca el código de **visitante** para ver todo lo que hizo esa persona.
- Elige el periodo: Hoy, 7, 30 o 90 días, o 1 año. **CSV para Excel** descarga todas las visitas (con las secciones vistas) del periodo para abrirlas en Excel.
- **No contar mis visitas:** márcalo en cada navegador y celular que uses tú o tu equipo, para que sus visitas no inflen los números.
- Las visitas de robots (Google, buscadores, vistas previas de enlaces) no se cuentan. La ubicación es aproximada (la da la conexión a internet). Se guardan 400 días.
- **Privacidad:** se guarda la IP completa. Ya está explicado en el **Aviso de privacidad** (`/privacidad`), enlazado en el pie del sitio.

### Doctor TechRevive · diagnóstico gratuito (`/diagnostico`)

- El cliente elige su equipo y el problema (14 problemas comunes), responde 2 o 3 preguntas y recibe: la **causa más probable**, el **servicio recomendado con el precio de tu tarifario**, qué puede intentar en casa sin riesgo, qué debe evitar y la urgencia.
- Desde el resultado puede **enviarte el diagnóstico por WhatsApp** o dejar su nombre y teléfono («Que me contacten»). Si la base de datos está conectada (Paso 6), ese contacto queda guardado en **📥 Solicitudes de clientes**.
- Los precios salen solos de **💲 Tarifario y cotizador**: si cambias un precio allí, el diagnóstico se actualiza en la siguiente publicación.
- La portada tiene un bloque que lo presenta. Además está en el menú **Servicios → Diagnóstico gratuito** y en el pie de página.

### Asistente con inteligencia artificial (opcional, gratis)

- Agrega al diagnóstico la pestaña **«Descríbelo con tus palabras»**: el cliente escribe lo que le pasa a su equipo y la IA responde con causas, servicios **de tu tarifario**, consejos y preguntas que el técnico le haría.
- **Para activarla:** Panel → ⚙️ Configuración general → activa **«✨ Asistente con inteligencia artificial»** → Guardar. No necesitas crear nada en Cloudflare: usa **Workers AI**, que viene incluido en tu cuenta gratuita.
- **Límites para que nunca te cobren:** 6 consultas por hora por persona y 60 al día en total. El plan gratuito de Cloudflare permite 10,000 «neuronas» diarias (unas 80–100 respuestas). Si se llena el cupo del día, el cliente ve un aviso y puede usar el diagnóstico guiado normal.
- **Si la publicación falla después de activarla**, desactívala y guarda: el sitio vuelve a publicarse como antes.

### 📥 Solicitudes de clientes (requiere el Paso 6)

- Cada persona que deja sus datos queda aquí, **aunque no haya terminado de enviar el WhatsApp**: formularios de contacto e inscripción, cotizaciones que te envían desde el cotizador y diagnósticos del Doctor TechRevive.
- Verás nombre, teléfono, servicio, mensaje y los detalles (respuestas del diagnóstico, detalle y total de la cotización, curso y modalidad…).
- **💬 WhatsApp** abre el chat con un saludo listo y marca la solicitud como **Contactada**. Cambia el estado (Nueva → Contactada → Cotizada → Ganada / Perdida / Archivada) y escribe notas internas que solo tú ves.
- **🛠️ Crear orden** convierte la solicitud en una orden de reparación con los datos ya llenos.
- El número naranja del menú indica cuántas solicitudes nuevas tienes.

### 🛠️ Reparaciones y seguimiento en línea (requiere el Paso 6)

1. Cuando recibas un equipo: **＋ Nueva orden** → cliente, teléfono, equipo, problema, presupuesto y fecha estimada de entrega (opcionales) → **Crear orden**. Se genera un código, por ejemplo **OT-7K2QD**.
2. Envíale al cliente el enlace con **💬** (WhatsApp) o **🔗** (copiar). El enlace abre `/seguimiento` con su orden.
3. El cliente también puede entrar a **Servicios → Seguimiento de reparación** y escribir el código y los **últimos 4 dígitos de su teléfono**, que son su clave.
4. Para avanzar: **↻ Estado** → elige la etapa (Recibido, En diagnóstico, Esperando aprobación, Esperando repuesto, En reparación, Pruebas, Listo, Entregado, Cancelado) → escribe un mensaje opcional → **Guardar**. Si dejas marcado «Avisar por WhatsApp», se abre el mensaje para el cliente con el enlace.
5. Las **notas internas** (contraseñas, accesorios recibidos, golpes) nunca las ve el cliente.

### Otras mejoras incluidas

- **Contactos y conversiones** en 📊 Estadísticas: cuántas personas pulsaron WhatsApp, llamar o correo, enviaron un formulario o una cotización, hicieron el diagnóstico o consultaron una orden, y **desde qué página y botón**.
- **Aviso de privacidad** (`/privacidad`), enlazado en el pie de página. Explica que se guardan las visitas con IP, los formularios y los datos del aula.
- **Fotos más livianas (WebP):** el sitio carga ~37 % menos de imágenes. Si cambias una foto desde el panel, el sitio usa la nueva automáticamente.
- **App instalable:** en el celular, el sitio se puede «Agregar a la pantalla de inicio» y, sin internet, muestra una página amable con tu WhatsApp.
- **Seguridad:** cabeceras de protección en todo el sitio y bloqueo tras 5 contraseñas incorrectas en el panel (15 minutos), 8 en el aula, y límites contra envíos masivos en los formularios.
- Si dejas vacía la **dirección** en Configuración general, ya no aparece «Tu dirección aquí»: simplemente se oculta.

### Seguridad

- La contraseña solo está en Cloudflare. Para cambiarla, edita `PANEL_PASSWORD` en **Variables and Secrets**.
- La sesión dura 12 horas. Usa **Cerrar sesión** en computadoras compartidas.
- Después de 5 contraseñas incorrectas, el panel se bloquea 15 minutos para esa conexión.
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
| "Falta conectar la base de datos" | Sigue el **Paso 6**. |
| La publicación falla después de pegar el ID de la base de datos | Borra el ID en Configuración general y guarda. Revisa el permiso **D1 · Edit** del token (Paso 6, punto 3) y vuelve a pegarlo. |
| La publicación falla después de activar el asistente con IA | Desactívalo en Configuración general y guarda. |
| «El seguimiento en línea todavía no está activo» | Falta la base de datos: sigue el **Paso 6**. |
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
- **Base de datos (D1):** `wrangler.jsonc` **no** lleva `d1_databases`. `build.py` (función `configurar_base_datos`) la agrega en Cloudflare (`WORKERS_CI=1`) con el ID de `content/configuracion.json → base_datos` o de la variable `D1_DATABASE_ID`, y valida su formato. Se evita así el aprovisionamiento automático, que necesita permiso D1 en el token de Workers Builds (el token por defecto no lo tiene). El Worker crea las tablas `visitas`, `progreso` y `certificados` con `CREATE TABLE IF NOT EXISTS`. Sin `env.DB`, las rutas devuelven 503 `{sinBase:true}` y el aula usa solo `localStorage`.
- **Cursos del aula:** `content/aula-cursos/<id>.json` (uno por curso; el panel los lista con `entradas?carpeta=content/aula-cursos`). `content/aula.json` guarda los ajustes y el diseño del certificado. `generador/aula.py` también escribe `_site/certificado.html` (`src/js/certificado.js`, `src/js/qrcode.js`, `src/css/certificado.css`).
- **Visitas:** `src/js/visitas.js` envía `/api/v` y `/api/v/fin` (sendBeacon). El país, la ciudad, las coordenadas y la IP vienen de `request.cf` y de `CF-Connecting-IP`. También define `window.trEvent(tipo, etiqueta)` → `/api/v/e` (tabla `eventos`) y registra solo los clics en enlaces `wa.me`, `tel:` y `mailto:` (etiqueta: `data-ev`, «Botón flotante» o el texto del enlace).
- **Herramientas:** `generador/herramientas.py` genera `diagnostico.html` (síntomas, preguntas y efectos en la lista `SINTOMAS`, precios buscados en el tarifario por palabra clave; si no encuentra uno, avisa en el build), `seguimiento.html`, `privacidad.html`, `offline.html` y `data/servicios-ia.json` (catálogo para la IA). La lógica está en `src/js/diagnostico.js` y `src/js/seguimiento.js`, y los estilos en `src/css/paginas.css`.
- **API nueva:** `POST /api/solicitud` (mismo origen, honeypot `_gotcha`, 10/h por IP), `GET /api/seguimiento?c=&t=` (30/10 min), `POST /api/diagnostico/ia` (Workers AI `env.AI`, 6/h por IP y 60/día, respuesta en JSON validada contra el catálogo) y, con sesión, `resumen`, `solicitudes` y `reparaciones` (tablas `solicitudes`, `ordenes`, `intentos`, `ia_uso`).
- **IA:** `build.py` (`configurar_ia`) agrega `"ai": {"binding": "AI"}` a `wrangler.jsonc` solo en Cloudflare y solo si `asistente_ia` está activado.
- **Rendimiento y seguridad:** `build.py` escribe `_site/_headers` (cabeceras de seguridad, CSP y caché; Cloudflare lo aplica a los archivos estáticos, y el Worker agrega las suyas a `/api` y `/aula`), `manifest.webmanifest` y `sw.js` (red primero, página sin conexión; nunca guarda `/api`, `/panel` ni `/aula`). `optimizar_imagenes()` envuelve las `<img>` en `<picture>` con la versión WebP de `src/img/` solo si su huella coincide con `src/img/webp.json`; con Pillow instalado también genera las que falten.
- `.pages.yml` sigue presente por compatibilidad con Pages CMS, pero ya no es necesario.
