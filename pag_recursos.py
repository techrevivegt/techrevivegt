# -*- coding: utf-8 -*-
"""Blog, artículos y Preguntas frecuentes."""
from site_base import *

POSTS = [
    {
        "slug": "blog-mantenimiento-computadora.html",
        "cat": "Reparación", "date": "19 de octubre de 2026", "iso": "2026-10-19", "read": "4 min de lectura",
        "img": "img/tecnico.jpg", "alt": "Técnico realizando mantenimiento interno a una laptop",
        "title": "5 señales de que tu computadora necesita mantenimiento",
        "excerpt": "Lentitud, ruido o calentamiento no son normales. Aprende a reconocer a tiempo cuándo tu equipo te está pidiendo ayuda.",
        "body": """
<p class="lead">Las computadoras rara vez fallan de un día para otro. Casi siempre dan avisos antes. Reconocerlos a tiempo puede ahorrarte una reparación costosa e incluso la pérdida de tu información.</p>

<h2>1. Tarda cada vez más en encender</h2>
<p>Si antes tu equipo estaba listo en menos de un minuto y ahora necesitas ir por un café mientras arranca, algo está pasando. Las causas más comunes son demasiados programas que se abren al inicio, un disco duro desgastado o falta de espacio.</p>
<p><strong>Qué puedes hacer:</strong> revisa qué programas se abren al iniciar y desactiva los que no necesitas. Si el problema continúa, cambiar el disco duro por una unidad SSD puede hacer que tu computadora sea varias veces más rápida.</p>

<h2>2. Se calienta o el ventilador hace mucho ruido</h2>
<p>El polvo se acumula dentro del equipo y bloquea la salida del aire. El ventilador trabaja más para enfriar el procesador, hace ruido y, aun así, la temperatura sube. Con el tiempo, el calor daña los componentes.</p>
<div class="tip"><strong>Consejo:</strong> usa tu laptop sobre una superficie firme y plana. Las camas, almohadas y cobijas tapan las rejillas de ventilación.</div>

<h2>3. Se apaga sola o muestra pantallas de error</h2>
<p>Los apagados repentinos suelen ser una protección del equipo contra el sobrecalentamiento. Las pantallas azules o los reinicios inesperados pueden indicar problemas de memoria, de disco o de controladores. Es una señal para atender cuanto antes.</p>

<h2>4. Los programas se congelan o se cierran</h2>
<p>Si tu navegador, Word o Excel se quedan "pensando" con frecuencia, puede que tu equipo tenga poca memoria RAM para lo que necesitas hoy, o que haya programas maliciosos consumiendo recursos en segundo plano.</p>

<h2>5. Hace más de un año que no recibe mantenimiento</h2>
<p>Aunque no notes nada extraño, un mantenimiento preventivo cada año (o cada seis meses si usas mucho el equipo) mantiene limpio el interior, renueva la pasta térmica del procesador y te permite detectar problemas antes de que se conviertan en fallas.</p>

<h2>¿Qué incluye un buen mantenimiento?</h2>
<ul>
  <li>Diagnóstico general de hardware y software.</li>
  <li>Limpieza interna de ventiladores y disipadores.</li>
  <li>Cambio de pasta térmica.</li>
  <li>Optimización del sistema y revisión de programas de inicio.</li>
  <li>Recomendaciones claras sobre posibles mejoras, como SSD o memoria RAM.</li>
</ul>
<p>Si reconoces una o más de estas señales en tu equipo, no esperes a que falle. Un diagnóstico a tiempo es siempre más económico que una reparación de emergencia.</p>
""",
        "cta": ("¿Tu computadora tiene alguna de estas señales?", "Solicita un diagnóstico y te explicamos qué necesita tu equipo.", "Reparación"),
    },
    {
        "slug": "blog-respaldar-informacion.html",
        "cat": "Tutoriales", "date": "12 de octubre de 2026", "iso": "2026-10-12", "read": "5 min de lectura",
        "img": "img/blog-respaldo.jpg", "alt": "Laptop mostrando un respaldo en progreso hacia la nube junto a un disco duro externo",
        "title": "Cómo respaldar tu información y no perder tus archivos",
        "excerpt": "Fotos, documentos y trabajos importantes pueden perderse en segundos. Te enseñamos a protegerlos con un método sencillo.",
        "body": """
<p class="lead">Un disco que se daña, una laptop robada, un virus o un simple vaso de agua derramado. Cualquiera de estas situaciones puede hacer que pierdas años de fotos, documentos y trabajo. La buena noticia: protegerte es más fácil de lo que crees.</p>

<h2>La regla 3-2-1</h2>
<p>Es el método que recomiendan los profesionales y funciona igual para una persona que para un negocio:</p>
<ul>
  <li><strong>3 copias</strong> de tu información: el original y dos respaldos.</li>
  <li><strong>2 medios distintos</strong>, por ejemplo, tu computadora y un disco externo.</li>
  <li><strong>1 copia fuera de casa</strong> u oficina, como un servicio en la nube.</li>
</ul>

<h2>Opción 1: respaldo en la nube</h2>
<p>Servicios como Google Drive, OneDrive o iCloud guardan una copia de tus archivos en internet. Si tu equipo falla, puedes recuperarlos desde cualquier otro dispositivo.</p>
<ol>
  <li>Elige un servicio y crea tu cuenta (la mayoría ofrecen espacio gratuito para empezar).</li>
  <li>Instala la aplicación en tu computadora.</li>
  <li>Selecciona las carpetas que quieres proteger: Documentos, Escritorio e Imágenes son un buen comienzo.</li>
  <li>Verifica que la sincronización esté activa y revisa que tus archivos aparezcan en la web.</li>
</ol>

<h2>Opción 2: disco duro externo</h2>
<p>Un disco externo te permite guardar mucha información a un costo accesible, sin depender de internet.</p>
<ol>
  <li>Conecta el disco a tu computadora.</li>
  <li>Activa la herramienta de respaldo de tu sistema: <strong>Historial de archivos</strong> en Windows o <strong>Time Machine</strong> en Mac.</li>
  <li>Elige el disco externo como destino y define cada cuánto se hará la copia.</li>
  <li>Desconecta el disco cuando termine y guárdalo en un lugar seguro.</li>
</ol>
<div class="tip"><strong>Consejo:</strong> programa un recordatorio en tu celular para conectar el disco una vez por semana. Un respaldo solo sirve si está actualizado.</div>

<h2>¿Qué debes respaldar?</h2>
<ul>
  <li>Documentos personales y de trabajo.</li>
  <li>Fotos y videos familiares.</li>
  <li>Archivos de tu negocio: facturas, inventarios, bases de clientes.</li>
  <li>Contraseñas guardadas (usa un gestor de contraseñas confiable).</li>
</ul>

<h2>Revisa que tu respaldo funcione</h2>
<p>De vez en cuando intenta abrir algunos archivos desde tu copia de seguridad. Así confirmas que el respaldo está completo y que, si lo necesitas, realmente podrás recuperar tu información.</p>
<p>Si ya perdiste archivos, no sigas usando el equipo afectado y busca ayuda profesional cuanto antes: mientras menos se use el disco, más posibilidades hay de recuperar la información.</p>
""",
        "cta": ("¿Necesitas ayuda para configurar tus respaldos?", "Te ayudamos a proteger tu información o a recuperarla si ya tuviste un problema.", "Soporte técnico"),
    },
    {
        "slug": "blog-pagina-web-negocio.html",
        "cat": "Negocios", "date": "5 de octubre de 2026", "iso": "2026-10-05", "read": "4 min de lectura",
        "img": "img/emprendedor.jpg", "alt": "Emprendedora revisando su tienda en línea en una tablet dentro de su negocio",
        "title": "¿Por qué tu negocio necesita una página web?",
        "excerpt": "Las redes sociales ayudan, pero no son suficientes. Descubre cómo una página web puede darle credibilidad y más clientes a tu negocio.",
        "body": """
<p class="lead">"Ya tengo Facebook e Instagram, ¿para qué quiero una página web?" Es una de las preguntas que más escuchamos de emprendedores y dueños de negocios. Aquí te contamos por qué ambas cosas se complementan.</p>

<h2>1. Te da credibilidad</h2>
<p>Antes de comprar o contratar, la mayoría de las personas busca el negocio en Google. Encontrar una página profesional, con información clara y datos de contacto, genera confianza inmediata. No tenerla puede hacer que un cliente elija a la competencia.</p>

<h2>2. Es tuya, no de una red social</h2>
<p>En las redes sociales las reglas cambian constantemente: el alcance baja, las cuentas se bloquean y el contenido se pierde entre publicaciones. Tu página web es un espacio propio, donde decides qué mostrar y cómo.</p>

<h2>3. Te encuentran en Google</h2>
<p>Cuando alguien busca "reparación de celulares cerca de mí" o "pastelería en zona 10", Google muestra páginas web. Una página bien estructurada te ayuda a aparecer en esas búsquedas y a recibir clientes que ya están buscando lo que ofreces.</p>

<h2>4. Trabaja por ti las 24 horas</h2>
<p>Tu página muestra tus productos, precios, horarios y ubicación incluso cuando tu negocio está cerrado. Con un botón de WhatsApp, los clientes pueden escribirte en cualquier momento con un solo toque.</p>
<div class="tip"><strong>Dato útil:</strong> una página no tiene que ser grande para funcionar. Una landing page bien hecha, con tus servicios y un botón de contacto, ya marca una gran diferencia.</div>

<h2>5. Organiza tu información en un solo lugar</h2>
<p>En lugar de responder las mismas preguntas una y otra vez por chat, puedes enviar el enlace de tu página con todo lo que el cliente necesita saber: catálogo, preguntas frecuentes, formas de pago y cómo llegar.</p>

<h2>¿Qué debe tener una buena página web?</h2>
<ul>
  <li>Diseño profesional que se vea bien en celulares.</li>
  <li>Información clara de tus productos o servicios.</li>
  <li>Botón de WhatsApp y formulario de contacto.</li>
  <li>Ubicación, horarios y enlaces a tus redes sociales.</li>
  <li>Velocidad de carga rápida y estructura pensada para Google.</li>
</ul>
<p>Las redes sociales atraen la atención; tu página web la convierte en confianza y en clientes. Juntas, son la mejor combinación para hacer crecer tu negocio.</p>
""",
        "cta": ("¿Listo para tener tu página web?", "Conversemos sobre tu negocio y diseñamos la página que necesitas.", "Página web"),
    },
]


def post_card(p, featured=False, h="h3"):
    f = " post--featured" if featured else ""
    return f'''<article class="post{f} reveal">
            <div class="post__media"><img src="{p["img"]}" width="960" height="640" loading="lazy" alt="{e(p["alt"])}" /></div>
            <div class="post__body">
              <div class="post__meta"><span class="chip">{p["cat"]}</span><time datetime="{p["iso"]}">{p["date"]}</time></div>
              <{h}><a href="{p["slug"]}">{p["title"]}</a></{h}>
              <p>{p["excerpt"]}</p>
              <span class="link-arrow">Leer artículo {ARROW}</span>
            </div>
          </article>'''


def posts_preview():
    return '<div class="posts">\n          ' + "\n          ".join(post_card(p) for p in POSTS[:3]) + "\n        </div>"


def build_blog():
    hero = page_hero([("Recursos", None), ("Blog y tutoriales", None)], "Blog y tutoriales",
                     "Tecnología explicada <span class=\"text-grad\">de forma sencilla.</span>",
                     "Consejos prácticos, guías paso a paso y novedades para que aproveches mejor tus equipos, protejas tu información y hagas crecer tu negocio.",
                     chips=["Reparación", "Tutoriales", "Negocios", "Seguridad", "Capacitación"])
    grid = ('<div class="posts">\n          ' + post_card(POSTS[0], True, "h2") + "\n          "
            + "\n          ".join(post_card(p, h="h2") for p in POSTS[1:]) + f'''
          <article class="post reveal" style="justify-content:center; align-items:center; text-align:center; padding:2rem; background:var(--bg-blue); border-style:dashed">
            <span class="card__icon" style="margin-inline:auto">{icon("plus")}</span>
            <h2 style="font-size:1.15rem; margin-bottom:.5rem">Próximamente más artículos</h2>
            <p style="color:var(--muted); font-size:.95rem; margin-bottom:1.25rem">¿Sobre qué tema te gustaría aprender? Cuéntanos y lo preparamos.</p>
            <a href="contacto.html" class="btn btn--outline btn--sm" data-wa data-wa-msg="Hola TechRevive, me gustaría que publicaran un artículo sobre: ">Sugerir un tema</a>
          </article>
        </div>''')
    body = hero + f'''    <section class="section section--soft" aria-label="Artículos">
      <div class="container">
        {grid}
      </div>
    </section>
''' + cta_block("¿Prefieres que te ayudemos directamente?", "Si tienes un problema con tu equipo o una duda tecnológica, escríbenos. Te orientamos con gusto.")
    page("blog.html", "Blog y tutoriales de tecnología",
         "Consejos prácticos y tutoriales de tecnología: mantenimiento de computadoras, respaldos de información, páginas web para negocios y más.",
         body, image=POSTS[0]["img"], section="Recursos")


def build_articles():
    for i, p in enumerate(POSTS):
        hero = page_hero([("Blog", "blog.html"), (p["cat"], None)], p["cat"], p["title"], p["excerpt"], center=True,
                         extra=f'<div class="post__meta reveal" style="--d:3"><span>{icon("calendar")}</span><time datetime="{p["iso"]}">{p["date"]}</time><span>·</span><span>{p["read"]}</span></div>')
        others = [x for x in POSTS if x is not p]
        t, txt, serv = p["cta"]
        body = hero + f'''    <section class="section" aria-label="Artículo">
      <div class="container">
        <article class="article">
          <figure class="article__cover reveal"><img src="{p["img"]}" width="960" height="640" alt="{e(p["alt"])}" /></figure>
          <div class="prose">
{p["body"]}
          </div>
          <aside class="article-cta">
            <div><h2>{t}</h2><p>{txt}</p></div>
            <a href="{service_link(serv)}" class="btn btn--white">Contactar a TechRevive {ARROW}</a>
          </aside>
          <div class="article-share">
            <span>¿Te fue útil? Compártelo:</span>
            <a class="btn btn--whatsapp btn--sm" href="https://wa.me/?text={quote(p["title"] + " — " + SITE_URL + "/" + p["slug"])}" target="_blank" rel="noopener">{icon("whatsapp")} WhatsApp</a>
            <a class="btn btn--outline btn--sm" href="https://www.facebook.com/sharer/sharer.php?u={quote(SITE_URL + "/" + p["slug"])}" target="_blank" rel="noopener">{icon("facebook")} Facebook</a>
          </div>
        </article>
      </div>
    </section>
    <section class="section section--soft" aria-labelledby="mas-title">
      <div class="container">
{section_head("Sigue leyendo", "Otros artículos que te pueden interesar.", hid="mas-title")}
        <div class="posts" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
          {"".join(post_card(x) for x in others)}
        </div>
      </div>
    </section>
'''
        ld = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["title"], "description": p["excerpt"],
              "datePublished": p["iso"], "image": SITE_URL + "/" + p["img"], "author": {"@type": "Organization", "name": "TechRevive"},
              "publisher": {"@type": "Organization", "name": "TechRevive"}, "mainEntityOfPage": SITE_URL + "/" + p["slug"]}
        page(p["slug"], p["title"], p["excerpt"], body, active="blog.html", image=p["img"], jsonld=ld, section="Blog")


FAQ_GROUPS = [
    ("generales", "help", "Generales", [
        ("¿Qué servicios ofrece TechRevive?", "Ofrecemos reparación y mantenimiento de computadoras, capacitación tecnológica, diseño y desarrollo web, aplicaciones y soluciones digitales, y soporte técnico. Puedes ver el detalle en nuestra página de <a href=\"servicios.html\">servicios</a>."),
        ("¿A quién atienden?", "A personas, estudiantes, emprendedores, empresas e instituciones. Adaptamos cada servicio y cada curso al nivel de experiencia y a la necesidad de cada cliente."),
        ("¿Cómo puedo solicitar un servicio?", "Puedes escribirnos por WhatsApp, llenar el <a href=\"contacto.html#formulario\">formulario de contacto</a> o visitarnos en nuestro horario de atención. Te responderemos lo antes posible."),
        ("¿Cuánto cuestan sus servicios?", "Depende del tipo de servicio y de lo que necesites. Siempre te presentamos una propuesta clara, con tiempos y costos, antes de empezar cualquier trabajo."),
        ("¿Cuáles son las formas de pago?", "Te informaremos las formas de pago disponibles al confirmar tu servicio o inscripción."),
    ]),
    ("reparacion", "wrench", "Reparación y soporte", [
        ("¿El diagnóstico tiene costo?", "Te lo indicaremos al recibir tu equipo, según el tipo de revisión necesaria. Siempre sabrás el costo antes de autorizar cualquier trabajo."),
        ("¿Cuánto tiempo tarda una reparación?", "Depende del diagnóstico y de la disponibilidad de repuestos. Te damos un tiempo estimado antes de empezar y te mantenemos informado."),
        ("¿Mi información estará segura?", "Sí. Tratamos tus archivos con total confidencialidad. Cuando el trabajo lo requiere, te recomendamos hacer un respaldo y te ayudamos a realizarlo."),
        ("¿Ofrecen soporte remoto?", "Sí. Muchos problemas de software, configuración o programas pueden resolverse de forma remota y segura. Conoce más en <a href=\"soporte.html\">soporte tecnológico</a>."),
    ]),
    ("capacitacion", "cap", "Capacitación", [
        ("¿Necesito conocimientos previos para los cursos?", "No para los cursos de nivel principiante. Para los cursos intermedios te indicaremos qué conviene saber antes de empezar."),
        ("¿Los cursos son presenciales o virtuales?", "Ofrecemos ambas modalidades, además de capacitación personalizada. Revisa cada curso en la página de <a href=\"cursos.html\">cursos disponibles</a>."),
        ("¿Cómo me inscribo?", "Completa el <a href=\"inscripcion.html\">formulario de inscripción</a>. Te contactaremos para confirmar horario, modalidad y costo."),
        ("¿Entregan constancia?", "Sí, al completar el curso recibirás una constancia de participación de TechRevive."),
        ("¿Ofrecen capacitación para empresas o instituciones?", "Sí. Diseñamos programas a la medida para equipos de trabajo, con los temas y horarios que necesites."),
    ]),
    ("digital", "code", "Desarrollo web y aplicaciones", [
        ("¿Necesito tener dominio y hosting?", "No es necesario tenerlos antes. Te asesoramos para elegir el dominio y el alojamiento más convenientes para tu proyecto."),
        ("¿Podré actualizar mi página web?", "Sí. Al entregar tu sitio te explicamos cómo hacer cambios sencillos. También podemos encargarnos del mantenimiento si lo prefieres."),
        ("¿Cuánto tiempo toma desarrollar un proyecto?", "Depende del tamaño y la complejidad. En la propuesta incluimos un cronograma claro con cada etapa."),
        ("¿Desarrollan sistemas a la medida?", "Sí. Creamos aplicaciones web, formularios digitales y herramientas de gestión adaptadas a tus procesos. Conoce más en <a href=\"aplicaciones.html\">aplicaciones y soluciones digitales</a>."),
    ]),
]


def build_faq():
    hero = page_hero([("Recursos", None), ("Preguntas frecuentes", None)], "Preguntas frecuentes",
                     "Respuestas claras <span class=\"text-grad\">a tus dudas.</span>",
                     "Reunimos las preguntas que más nos hacen sobre nuestros servicios, cursos y proyectos digitales. Si no encuentras la tuya, escríbenos.")
    side = "".join(f'<a href="#{gid}">{icon(ic)} {t}</a>' for gid, ic, t, _ in FAQ_GROUPS)
    groups = "".join(f'''
          <div class="faq-group reveal" id="{gid}">
            <h2 class="faq-group__title">{icon(ic)} {t}</h2>
            {faq_items(items, open_first=(n == 0))}
          </div>''' for n, (gid, ic, t, items) in enumerate(FAQ_GROUPS))
    body = hero + f'''    <section class="section section--soft" aria-label="Preguntas por categoría">
      <div class="container faq-layout">
        <nav class="side-nav" aria-label="Categorías de preguntas"><p>Categorías</p>{side}</nav>
        <div>{groups}
        </div>
      </div>
    </section>
''' + cta_block("¿No encontraste tu respuesta?", "Escríbenos por WhatsApp o mediante el formulario. Te responderemos con gusto.")
    all_faqs = [q for g in FAQ_GROUPS for q in g[3]]
    page("preguntas-frecuentes.html", "Preguntas frecuentes",
         "Resolvemos tus dudas sobre reparación de computadoras, soporte técnico, cursos de capacitación, páginas web y aplicaciones.",
         body, jsonld=faq_jsonld(all_faqs), section="Recursos")
