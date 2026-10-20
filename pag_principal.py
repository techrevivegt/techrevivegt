# -*- coding: utf-8 -*-
"""Inicio, ¿Quiénes somos?, Servicios y páginas de cada servicio."""
from site_base import *

# ------------------------------------------------------------------ Servicios
SERVICES = [
    {
        "slug": "reparacion.html", "icon": "laptop", "num": "01",
        "title": "Reparación y Mantenimiento", "nav": "Reparación y mantenimiento",
        "desc": "Diagnóstico, mantenimiento preventivo y correctivo, optimización y reparación de computadoras y laptops.",
        "list": ["Diagnóstico técnico", "Limpieza interna", "Cambio de pasta térmica", "Optimización",
                 "Instalación de sistemas operativos", "Actualización de componentes",
                 "Recuperación y respaldo de información", "Soporte técnico"],
        "btn": "Solicitar diagnóstico", "value": "Reparación",
    },
    {
        "slug": "capacitacion.html", "icon": "cap", "num": "02",
        "title": "Capacitación Tecnológica", "nav": "Capacitación tecnológica",
        "desc": "Cursos prácticos para desarrollar habilidades digitales aplicables al estudio, trabajo y emprendimiento.",
        "list": ["Computación básica", "Ofimática", "Reparación de computadoras", "Herramientas digitales",
                 "Fotografía", "Emprendimiento", "Empleabilidad", "Capacitación personalizada"],
        "btn": "Ver capacitaciones", "value": None,
    },
    {
        "slug": "desarrollo-web.html", "icon": "layout", "num": "03",
        "title": "Diseño y Desarrollo Web", "nav": "Diseño y desarrollo web",
        "desc": "Creamos sitios web modernos, funcionales y adaptados a las necesidades de cada negocio o proyecto.",
        "list": ["Sitios web corporativos", "Landing pages", "Portafolios", "Tiendas en línea", "Formularios",
                 "Integración con WhatsApp", "Diseño responsive", "Optimización básica para buscadores"],
        "btn": "Crear mi página web", "value": "Página web",
    },
    {
        "slug": "aplicaciones.html", "icon": "layers", "num": "04", "wide": True,
        "title": "Aplicaciones y Soluciones Digitales", "nav": "Aplicaciones y soluciones digitales",
        "desc": "Desarrollamos herramientas digitales personalizadas para automatizar procesos y resolver necesidades específicas.",
        "list": ["Aplicaciones web", "Sistemas personalizados", "Formularios digitales", "Automatización",
                 "Gestión de información", "Herramientas para negocios"],
        "btn": "Hablar sobre mi proyecto", "value": "Aplicación",
    },
    {
        "slug": "soporte.html", "icon": "headset", "num": "05", "wide": True,
        "title": "Soporte Tecnológico", "nav": "Soporte tecnológico",
        "desc": "Te ayudamos a resolver problemas tecnológicos y mantener tus herramientas digitales funcionando correctamente.",
        "list": ["Soporte remoto", "Configuración de equipos", "Instalación de software", "Redes", "Impresoras",
                 "Seguridad básica", "Asistencia tecnológica"],
        "btn": "Solicitar soporte", "value": "Soporte técnico",
    },
]


def services_grid():
    out = []
    for i, s in enumerate(SERVICES):
        wide = " service--wide" if s.get("wide") else ""
        d = i % 3
        if s["value"]:
            btn = (f'<a href="{service_link(s["value"])}" class="btn btn--outline service__btn">'
                   f'{s["btn"]} {ARROW}</a>\n            <a href="{s["slug"]}" class="service__more">Ver detalles del servicio {icon("chevron")}</a>')
        else:
            btn = (f'<a href="capacitacion.html" class="btn btn--outline service__btn">{s["btn"]} {ARROW}</a>\n'
                   f'            <a href="cursos.html" class="service__more">Ver cursos disponibles {icon("chevron")}</a>')
        out.append(f'''          <article class="service{wide} reveal" style="--d:{d}">
            <div class="service__top">
              <span class="service__icon">{icon(s["icon"])}</span>
              <span class="service__num">{s["num"]}</span>
            </div>
            <h3 class="service__title"><a href="{s["slug"]}">{s["title"]}</a></h3>
            <p class="service__desc">{s["desc"]}</p>
            {checklist(s["list"])}
            {btn}
          </article>''')
    return '        <div class="services">\n' + "\n".join(out) + "\n        </div>"


PROCESS = '''        <ol class="timeline">
          <li class="timeline__step reveal"><span class="timeline__node"><svg class="icon"><use href="#i-search"/></svg></span><h3>Diagnóstico</h3><p>Escuchamos tu necesidad y revisamos el equipo o proyecto.</p></li>
          <li class="timeline__step reveal" style="--d:1"><span class="timeline__node"><svg class="icon"><use href="#i-clipboard"/></svg></span><h3>Propuesta</h3><p>Te presentamos una solución clara, con tiempos y costos.</p></li>
          <li class="timeline__step reveal" style="--d:2"><span class="timeline__node"><svg class="icon"><use href="#i-cpu"/></svg></span><h3>Implementación</h3><p>Reparamos, desarrollamos o capacitamos según lo acordado.</p></li>
          <li class="timeline__step reveal" style="--d:3"><span class="timeline__node"><svg class="icon"><use href="#i-package"/></svg></span><h3>Entrega</h3><p>Revisamos el resultado contigo y te explicamos cómo usarlo.</p></li>
          <li class="timeline__step reveal" style="--d:4"><span class="timeline__node"><svg class="icon"><use href="#i-shield"/></svg></span><h3>Soporte</h3><p>Seguimos disponibles para dudas, ajustes y mantenimiento.</p></li>
        </ol>'''


def process_section(soft=False):
    c = " section--soft" if soft else ""
    return f'''    <section class="section process{c}" aria-labelledby="process-title">
      <div class="container">
{section_head("Nuestro proceso", "Un camino claro, de principio a fin.", "Sabrás en todo momento qué estamos haciendo, cuánto tiempo tomará y qué sigue.", center=True, hid="process-title")}
{PROCESS}
      </div>
    </section>
'''


# ------------------------------------------------------------------ Inicio
def build_index(posts_preview):
    a = read("home_a.html")
    b = read("home_b.html")

    # Capacitación: enlazar a las nuevas páginas
    b = b.replace(
        '''<a href="#contacto" class="btn btn--primary reveal" style="--d:5" data-service="Capacitación">
            Quiero capacitarme <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>
          </a>''',
        f'''<div class="reveal" style="--d:5; display:flex; flex-wrap:wrap; gap:.75rem">
            <a href="cursos.html" class="btn btn--primary">Ver cursos disponibles {ARROW}</a>
            <a href="inscripcion.html" class="btn btn--outline">Inscribirme</a>
          </div>''')
    # Nosotros: enlace a la página completa
    b = b.replace(
        '''“Sabemos de tecnología, pero hacemos que la tecnología sea fácil de entender.”
          </blockquote>''',
        f'''“Sabemos de tecnología, pero hacemos que la tecnología sea fácil de entender.”
          </blockquote>
          <a href="quienes-somos.html" class="btn btn--ghost-light" style="margin-top:2rem">Conoce más sobre nosotros {ARROW}</a>''')
    # Negocios: enlaces a servicios digitales
    b = b.replace(
        '''<a href="#contacto" class="btn btn--primary btn--lg reveal" style="--d:4" data-service="Página web">''',
        '''<a href="desarrollo-web.html" class="btn btn--primary btn--lg reveal" style="--d:4">''')
    # Proyectos: enlace a la galería, debajo de las tarjetas
    end_projects = b.index("    <!-- ==================== 10. TESTIMONIOS")
    close = b.rindex("      </div>\n    </section>", 0, end_projects)
    b = (b[:close] + f'''        <div class="section-foot reveal">
          <a href="galeria.html" class="btn btn--outline">Ver galería de fotos {ARROW}</a>
        </div>
''' + b[close:])
    assert "quienes-somos.html" in b and "cursos.html" in b

    services = f'''    <!-- ==================== SERVICIOS ==================== -->
    <section class="section section--soft" id="servicios" aria-labelledby="servicios-title">
      <div class="container">
        <header class="section-head reveal">
          <p class="eyebrow">Nuestros servicios</p>
          <h2 class="section-title" id="servicios-title">Todo lo que necesitas en tecnología, en un solo lugar.</h2>
          <p class="section-lead">Desde reparar tu computadora hasta crear la página web o el sistema de tu negocio. Te acompañamos en cada paso, con explicaciones claras y sin complicaciones.</p>
          <ul class="audience" aria-label="A quién servimos">
            <li>Personas</li><li>Estudiantes</li><li>Emprendedores</li><li>Empresas</li><li>Instituciones</li>
          </ul>
        </header>
{services_grid()}
      </div>
    </section>

'''
    recursos = f'''    <!-- ==================== RECURSOS (blog) ==================== -->
    <section class="section section--soft" id="recursos" aria-labelledby="recursos-title">
      <div class="container">
        <header class="section-head section-head--split reveal">
          <div>
            <p class="eyebrow">Recursos</p>
            <h2 class="section-title" id="recursos-title">Aprende con nuestros consejos.</h2>
          </div>
          <p class="section-lead">Guías cortas y prácticas para cuidar tus equipos, proteger tu información y llevar tu negocio al mundo digital.</p>
        </header>
        {posts_preview}
        <div class="section-foot">
          <a href="blog.html" class="btn btn--outline">Ver todos los artículos {ARROW}</a>
          <a href="preguntas-frecuentes.html" class="btn btn--outline">Preguntas frecuentes</a>
        </div>
      </div>
    </section>

'''
    cta = cta_block("¿Tienes un problema tecnológico o una idea que quieres convertir en realidad?",
                    "Cuéntanos qué necesitas. En TechRevive podemos ayudarte a encontrar una solución.",
                    f'<a href="#contacto" class="btn btn--white btn--lg" data-wa>{icon("whatsapp")} Hablar con TechRevive</a>\n'
                    f'            <a href="#contacto" class="btn btn--ghost-light btn--lg">Solicitar cotización</a>')
    # Botones del hero: "Solicitar servicio" lleva al formulario de esta misma página
    body = a + services + b + recursos + cta + contact_section("contacto")
    jsonld = {
        "@context": "https://schema.org", "@type": "ProfessionalService", "name": "TechRevive",
        "slogan": "Tecnología que transforma, soluciones que impulsan.",
        "description": "Soluciones tecnológicas integrales: capacitación, soporte técnico, reparación de equipos, desarrollo web y aplicaciones.",
        "url": SITE_URL + "/", "image": SITE_URL + "/img/hero.jpg", "areaServed": "Guatemala",
        "address": {"@type": "PostalAddress", "addressCountry": "GT"},
        "knowsAbout": ["Reparación de computadoras", "Capacitación tecnológica", "Desarrollo web", "Aplicaciones web", "Soporte técnico"],
    }
    page("index.html", "TechRevive | Reparación de computadoras, capacitación y desarrollo web",
         "TechRevive ofrece soluciones tecnológicas integrales: reparación y mantenimiento de computadoras, capacitación tecnológica, diseño web, aplicaciones y soporte técnico para personas y negocios.",
         body, jsonld=jsonld, preload="img/hero.jpg", section="Inicio")


# ------------------------------------------------------------------ ¿Quiénes somos?
def build_about():
    hero = page_hero([("¿Quiénes somos?", None)], "¿Quiénes somos?",
                     "Tecnología, conocimiento y soluciones <span class=\"text-grad\">para todos.</span>",
                     "TechRevive es una empresa tecnológica integral que acompaña a personas, estudiantes, emprendedores, empresas e instituciones a aprender, reparar, crear y crecer con la tecnología.",
                     image="img/taller.jpg", alt="Espacio de trabajo de TechRevive con área técnica y estaciones de capacitación",
                     buttons=f'<a href="servicios.html" class="btn btn--primary btn--lg">Conocer nuestros servicios {ARROW}</a>'
                             f'<a href="contacto.html" class="btn btn--ghost-light btn--lg">Contáctanos</a>')

    historia = f'''    <section class="section" aria-labelledby="historia-title">
      <div class="container split">
        <div class="split__media reveal">
          <img src="img/aprender.jpg" width="960" height="640" loading="lazy" alt="Instructor de TechRevive enseñando computación a un grupo de personas de distintas edades" />
        </div>
        <div class="split__body">
          <p class="eyebrow reveal">Nuestra historia</p>
          <h2 class="section-title reveal" id="historia-title" style="--d:1">Más que un taller: un aliado tecnológico.</h2>
          <p class="reveal" style="--d:2">TechRevive nació de una idea sencilla: la tecnología debe ser una herramienta al alcance de todos, no una barrera. Muchas personas tienen un equipo que no funciona bien, una idea de negocio que no saben cómo llevar a internet o simplemente quieren aprender a usar mejor su computadora.</p>
          <p class="reveal" style="--d:3">Por eso unimos en un solo lugar el servicio técnico, la capacitación y el desarrollo digital. Reparamos tu equipo, pero también te explicamos qué pasó. Creamos tu página web, pero también te enseñamos a usarla. Nuestro objetivo es que cada cliente salga con una solución y con más confianza en la tecnología.</p>
          <div class="reveal" style="--d:4">{checklist(["Atención cercana y personalizada", "Explicaciones claras, sin tecnicismos", "Soluciones a la medida de cada necesidad", "Acompañamiento después del servicio"], two=True)}</div>
        </div>
      </div>
    </section>
'''

    mv = f'''    <section class="section section--soft" aria-label="Misión y visión">
      <div class="container">
        <div class="mv">
          <article class="mv-card reveal">
            <span class="mv-card__icon">{icon("target")}</span>
            <h2>Misión</h2>
            <p>Brindar soluciones tecnológicas integrales —capacitación, soporte, reparación y desarrollo digital— que permitan a personas, emprendedores y organizaciones aprovechar la tecnología de forma práctica, accesible y confiable.</p>
          </article>
          <article class="mv-card mv-card--dark reveal" style="--d:1">
            <span class="mv-card__icon">{icon("eye")}</span>
            <h2>Visión</h2>
            <p>Ser un referente en soluciones tecnológicas y formación digital en Guatemala, reconocido por hacer que la tecnología sea fácil de entender y por impulsar el crecimiento de las personas y los negocios que confían en nosotros.</p>
          </article>
        </div>
      </div>
    </section>
'''

    valores = [
        ("shield", "Confianza", "Cuidamos tus equipos y tu información como si fueran nuestros, con total confidencialidad."),
        ("message", "Claridad", "Explicamos cada diagnóstico, propuesta y costo con palabras sencillas, antes de empezar."),
        ("bulb", "Innovación", "Nos actualizamos constantemente para ofrecerte soluciones modernas y eficientes."),
        ("heart", "Compromiso", "Cumplimos lo que prometemos y damos seguimiento hasta que todo funcione bien."),
        ("users", "Accesibilidad", "Creemos que todos pueden aprender y aprovechar la tecnología, sin importar su nivel."),
        ("book", "Aprendizaje continuo", "Compartimos lo que sabemos para que cada cliente gane autonomía y confianza."),
    ]
    values_sec = f'''    <section class="section" aria-labelledby="valores-title">
      <div class="container">
{section_head("Nuestros valores", "Lo que nos guía en cada servicio.", "Más allá de la técnica, estos principios definen cómo trabajamos y cómo tratamos a cada persona que confía en nosotros.", center=True, hid="valores-title")}
        {cards(valores, 3)}
      </div>
    </section>
'''

    why = read("home_b.html")
    a = why.index("    <!-- ==================== 5.")
    z = why.index("    <!-- ==================== 6.")
    why = why[a:z].replace('<p class="eyebrow eyebrow--dark">Nosotros</p>', '<p class="eyebrow eyebrow--dark">Nuestra diferencia</p>')

    audiencia = [
        ("user", "Personas", "Reparamos y optimizamos tu equipo, y te enseñamos a usar la tecnología con confianza.", "reparacion.html"),
        ("school", "Estudiantes", "Cursos prácticos de computación y ofimática para destacar en tus estudios.", "cursos.html"),
        ("rocket", "Emprendedores", "Página web, WhatsApp y herramientas digitales para vender más y mejor.", "desarrollo-web.html"),
        ("briefcase", "Empresas", "Soporte técnico, redes, sistemas a medida y capacitación para tu equipo.", "soporte.html"),
        ("building", "Instituciones", "Programas de formación tecnológica y soluciones digitales para tu organización.", "capacitacion.html"),
        ("handshake", "Aliados", "¿Quieres colaborar con nosotros en un proyecto o programa? Conversemos.", "contacto.html"),
    ]
    aud_sec = f'''    <section class="section section--soft" aria-labelledby="audiencia-title">
      <div class="container">
{section_head("A quién servimos", "Soluciones para cada tipo de cliente.", "Adaptamos cada servicio y cada curso a tu nivel de experiencia y a lo que realmente necesitas.", hid="audiencia-title")}
        {cards(audiencia, 3, linked=True)}
      </div>
    </section>
'''
    body = (hero + historia + mv + values_sec + why + aud_sec +
            cta_block("¿Quieres conocernos mejor?", "Escríbenos y cuéntanos en qué podemos ayudarte. Será un gusto atenderte."))
    page("quienes-somos.html", "¿Quiénes somos? Misión, visión y valores",
         "Conoce TechRevive: una empresa tecnológica integral de capacitación, soporte, reparación y desarrollo digital. Nuestra misión, visión y valores.",
         body, image="img/taller.jpg", section="TechRevive")


# ------------------------------------------------------------------ Servicios (resumen)
def build_services():
    hero = page_hero([("Servicios", None)], "Nuestros servicios",
                     "Todo lo que necesitas en tecnología, <span class=\"text-grad\">en un solo lugar.</span>",
                     "Reparamos, enseñamos, creamos y acompañamos. Elige el servicio que necesitas o cuéntanos tu situación y te orientamos.",
                     chips=["Personas", "Estudiantes", "Emprendedores", "Empresas", "Instituciones"],
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
         "Reparación y mantenimiento de computadoras, capacitación tecnológica, diseño web, aplicaciones a la medida y soporte técnico para personas, negocios e instituciones.",
         body, section="Servicios")


# ------------------------------------------------------------------ Páginas de cada servicio
DETAIL = {
    "reparacion.html": {
        "h1": "Reparación y mantenimiento de <span class=\"text-grad\">computadoras.</span>",
        "lead": "Diagnóstico, mantenimiento preventivo y correctivo, optimización y reparación de computadoras y laptops. Te explicamos qué tiene tu equipo y qué conviene hacer, antes de empezar.",
        "img": "img/tecnico.jpg", "alt": "Técnico aplicando pasta térmica en una laptop abierta",
        "seo": ("Reparación y mantenimiento de computadoras y laptops",
                "Diagnóstico técnico, limpieza interna, cambio de pasta térmica, optimización, instalación de sistemas, actualización a SSD y recuperación de información."),
        "intro_t": "Tu equipo, como nuevo otra vez.",
        "intro": ["Una computadora lenta, que se calienta o que se apaga sola no siempre necesita ser reemplazada. En la mayoría de los casos, un buen diagnóstico y el mantenimiento adecuado pueden devolverle velocidad y alargar su vida útil por varios años.",
                  "Revisamos tu equipo a fondo, te explicamos con palabras sencillas lo que encontramos y te damos opciones claras. Tú decides qué hacer, sin presiones ni sorpresas."],
        "intro_img": "img/p-reparacion.jpg", "intro_alt": "Computadora de escritorio abierta con nuevos módulos de memoria y unidad SSD",
        "inc_t": "¿Qué incluye el servicio?",
        "inc": [("search", "Diagnóstico técnico", "Revisamos hardware y software para encontrar la causa real del problema."),
                ("refresh", "Limpieza interna", "Eliminamos el polvo que provoca calentamiento, ruido y fallas."),
                ("thermo", "Cambio de pasta térmica", "Mejora la temperatura del procesador y protege los componentes."),
                ("zap", "Optimización", "Quitamos programas innecesarios y aceleramos el arranque."),
                ("monitor", "Sistemas operativos", "Instalación de Windows o Linux con controladores y programas esenciales."),
                ("cpu", "Actualización de componentes", "Unidades SSD, memoria RAM y otras mejoras para ganar velocidad."),
                ("database", "Recuperación y respaldo", "Protegemos tus archivos antes de trabajar y te ayudamos a recuperarlos."),
                ("headset", "Soporte técnico", "Te acompañamos después del servicio para resolver tus dudas.")],
        "extra_t": "¿Cuándo es momento de traer tu equipo?",
        "extra": [("thermo", "Se calienta o hace mucho ruido", "El ventilador trabaja de más y el equipo quema al tacto."),
                  ("clock", "Está lento o tarda en encender", "Abrir programas o archivos se vuelve una espera."),
                  ("alert", "Se apaga solo o muestra errores", "Pantallas azules, reinicios o mensajes extraños."),
                  ("calendar", "Lleva más de un año sin mantenimiento", "La limpieza preventiva evita reparaciones costosas.")],
        "faq": [("¿Cuánto tiempo tarda una reparación?", "Depende del diagnóstico. Antes de empezar te damos un tiempo estimado y te avisamos de cualquier cambio. Los mantenimientos preventivos suelen ser los más rápidos."),
                ("¿Mi información está segura?", "Sí. Tratamos tus archivos con total confidencialidad y, cuando el trabajo lo requiere, te recomendamos hacer un respaldo antes de empezar. Si lo necesitas, nosotros te ayudamos a hacerlo."),
                ("¿Cada cuánto debo dar mantenimiento a mi computadora?", "Recomendamos un mantenimiento preventivo al menos una vez al año, o cada seis meses si el equipo se usa muchas horas al día o en lugares con mucho polvo."),
                ("¿Vale la pena reparar o es mejor comprar otro equipo?", "Te lo decimos con honestidad después del diagnóstico. Muchas veces una actualización a SSD o más memoria RAM da excelentes resultados por una fracción del costo de un equipo nuevo."),
                ("¿Trabajan con laptops y computadoras de escritorio?", "Sí, trabajamos con ambos tipos de equipo. Escríbenos con la marca y el modelo, y te orientamos sobre el servicio que necesitas.")],
    },
    "desarrollo-web.html": {
        "h1": "Diseño y desarrollo <span class=\"text-grad\">web.</span>",
        "lead": "Creamos sitios web modernos, funcionales y adaptados a las necesidades de cada negocio o proyecto. Tu página trabaja por ti las 24 horas, en computadoras y celulares.",
        "img": "img/p-web.jpg", "alt": "Laptop mostrando el diseño de un sitio web moderno",
        "seo": ("Diseño y desarrollo de páginas web para negocios",
                "Sitios web corporativos, landing pages, portafolios y tiendas en línea con diseño responsive, integración con WhatsApp y optimización básica para buscadores."),
        "intro_t": "Una página web que te ayuda a vender.",
        "intro": ["Hoy, antes de comprar o contratar, las personas buscan en internet. Una página web profesional le da a tu negocio credibilidad, te ayuda a aparecer en Google y facilita que tus clientes te contacten con un solo toque.",
                  "Diseñamos cada sitio a la medida: entendemos tu negocio, organizamos tu información y creamos una página clara, rápida y fácil de usar. Al terminar, te explicamos cómo funciona y cómo mantenerla actualizada."],
        "intro_img": "img/emprendedor.jpg", "intro_alt": "Emprendedora revisando su tienda en línea en una tablet",
        "inc_t": "¿Qué podemos crear para ti?",
        "inc": [("building", "Sitios web corporativos", "Presenta tu empresa, servicios y datos de contacto con imagen profesional."),
                ("target", "Landing pages", "Páginas enfocadas en una promoción, producto o campaña específica."),
                ("image", "Portafolios", "Muestra tus trabajos, proyectos o productos de forma atractiva."),
                ("cart", "Tiendas en línea", "Catálogo de productos con pedidos por WhatsApp o pagos en línea."),
                ("clipboard", "Formularios", "Cotizaciones, reservas o inscripciones que llegan directo a ti."),
                ("whatsapp", "Integración con WhatsApp", "Botones y mensajes listos para que te escriban al instante."),
                ("phone", "Diseño responsive", "Tu página se verá perfecta en celulares, tablets y computadoras."),
                ("search", "Optimización básica para buscadores", "Estructura y textos preparados para que Google te encuentre.")],
        "extra_t": "Lo que recibes con tu página",
        "extra": [("layout", "Diseño a tu medida", "Con los colores, logo e identidad de tu marca."),
                  ("globe", "Asesoría de dominio y hosting", "Te ayudamos a elegir y configurar tu dirección web."),
                  ("book", "Capacitación de uso", "Te enseñamos a actualizar tu información."),
                  ("buoy", "Acompañamiento", "Soporte y ajustes después de la entrega.")],
        "faq": [("¿Necesito tener un dominio o hosting antes de empezar?", "No. Te asesoramos para elegir el dominio (por ejemplo, tunegocio.com) y el servicio de alojamiento más conveniente para tu proyecto."),
                ("¿Cuánto tiempo toma crear mi página?", "Depende del tamaño y del tipo de sitio. Una landing page es más rápida que una tienda en línea. En la propuesta te damos un cronograma claro con cada etapa."),
                ("¿Podré actualizar mi página yo mismo?", "Sí. Al entregar el sitio te explicamos cómo hacer cambios sencillos. Si lo prefieres, también podemos encargarnos del mantenimiento."),
                ("¿Mi página se verá bien en celulares?", "Sí. Todos nuestros sitios son responsive: se adaptan automáticamente a celulares, tablets y computadoras."),
                ("¿Qué necesito para empezar?", "Solo tu idea. Si ya tienes logo, fotos o textos, excelente; si no, te orientamos para prepararlos.")],
    },
    "aplicaciones.html": {
        "h1": "Aplicaciones y soluciones <span class=\"text-grad\">digitales.</span>",
        "lead": "Desarrollamos herramientas digitales personalizadas para automatizar procesos y resolver necesidades específicas de tu negocio o institución.",
        "img": "img/p-app.jpg", "alt": "Pantalla con un panel de control de una aplicación web",
        "seo": ("Aplicaciones web y sistemas a la medida",
                "Aplicaciones web, sistemas personalizados, formularios digitales, automatización y gestión de información para negocios e instituciones."),
        "intro_t": "Menos papel, menos errores, más tiempo.",
        "intro": ["Muchos negocios todavía controlan inventarios, ventas o clientes en cuadernos o en hojas de cálculo difíciles de mantener. Una solución digital a la medida ordena tu información, evita errores y te da datos claros para tomar mejores decisiones.",
                  "Escuchamos cómo trabajas hoy, identificamos qué se puede simplificar y construimos una herramienta fácil de usar para ti y tu equipo, sin funciones que no necesitas."],
        "intro_img": "img/p-empresa.jpg", "intro_alt": "Equipo de red ordenado en una oficina",
        "inc_t": "¿Qué incluye el servicio?",
        "inc": [("globe", "Aplicaciones web", "Funcionan desde el navegador, en computadora o celular, sin instalar nada."),
                ("settings", "Sistemas personalizados", "Diseñados según los procesos reales de tu negocio."),
                ("clipboard", "Formularios digitales", "Registros, encuestas y solicitudes que se guardan automáticamente."),
                ("zap", "Automatización", "Tareas repetitivas que se hacen solas: reportes, avisos y recordatorios."),
                ("database", "Gestión de información", "Datos organizados, seguros y disponibles cuando los necesitas."),
                ("briefcase", "Herramientas para negocios", "Soluciones prácticas para vender, controlar y crecer.")],
        "extra_t": "Ejemplos de soluciones que podemos desarrollar",
        "extra": [("package", "Control de inventario", "Entradas, salidas y existencias en tiempo real."),
                  ("users", "Registro de clientes", "Historial, contactos y seguimiento de cada cliente."),
                  ("calendar", "Reservas y citas", "Agenda en línea con confirmaciones automáticas."),
                  ("file", "Cotizaciones y reportes", "Documentos generados en segundos, sin errores.")],
        "faq": [("¿Cómo sé si mi negocio necesita una aplicación?", "Si repites las mismas tareas cada día, pierdes información o te cuesta saber cómo van tus ventas o inventario, probablemente una herramienta digital te ahorrará tiempo y errores. Conversemos sobre tu caso."),
                ("¿Es muy caro desarrollar un sistema a la medida?", "Depende del alcance. Empezamos por lo esencial y, si lo necesitas, el sistema puede crecer por etapas. Siempre recibirás una propuesta clara antes de empezar."),
                ("¿Mi equipo podrá usarla fácilmente?", "Sí. Diseñamos interfaces sencillas y, al entregar, capacitamos a las personas que la utilizarán."),
                ("¿Qué pasa si después necesito cambios?", "Ofrecemos soporte y mejoras continuas para que la herramienta siga adaptándose a tu negocio.")],
    },
    "soporte.html": {
        "h1": "Soporte <span class=\"text-grad\">tecnológico.</span>",
        "lead": "Te ayudamos a resolver problemas tecnológicos y a mantener tus herramientas digitales funcionando correctamente, de forma remota o presencial.",
        "img": "img/soporte.jpg", "alt": "Técnico de soporte con auriculares atendiendo una solicitud frente a dos monitores",
        "seo": ("Soporte técnico remoto y presencial",
                "Soporte remoto, configuración de equipos, instalación de software, redes, impresoras, seguridad básica y asistencia tecnológica para hogares y negocios."),
        "intro_t": "Tecnología que funciona cuando la necesitas.",
        "intro": ["Una impresora que no imprime, una red WiFi que falla o un programa que no abre pueden detener tu día. Nuestro servicio de soporte resuelve esos problemas rápidamente para que tú te enfoques en lo importante.",
                  "Muchos problemas se pueden resolver de forma remota en pocos minutos. Cuando se necesita, te atendemos de forma presencial. En ambos casos te explicamos qué hicimos y cómo evitar que vuelva a pasar."],
        "intro_img": "img/p-empresa.jpg", "intro_alt": "Rack de red ordenado con switch y cables en una oficina",
        "inc_t": "¿En qué te podemos ayudar?",
        "inc": [("monitor", "Soporte remoto", "Nos conectamos a tu equipo de forma segura para resolver el problema."),
                ("settings", "Configuración de equipos", "Computadoras nuevas listas para trabajar desde el primer día."),
                ("download", "Instalación de software", "Programas, antivirus y herramientas de trabajo instalados correctamente."),
                ("wifi", "Redes", "Configuración y mejora de redes WiFi y cableadas en casa u oficina."),
                ("printer", "Impresoras", "Instalación, configuración en red y solución de errores comunes."),
                ("lock", "Seguridad básica", "Antivirus, contraseñas seguras, respaldos y buenas prácticas."),
                ("headset", "Asistencia tecnológica", "Orientación para elegir equipos, servicios y herramientas.")],
        "extra_t": "Modalidades de atención",
        "extra": [("monitor", "Remoto", "Rápido y sin desplazarte, ideal para problemas de software."),
                  ("building", "Presencial", "Para redes, impresoras o equipos que requieren revisión física."),
                  ("briefcase", "Para negocios", "Planes de soporte periódico para mantener tu operación activa."),
                  ("book", "Con capacitación", "Te enseñamos a resolver por tu cuenta los problemas más comunes.")],
        "faq": [("¿Cómo funciona el soporte remoto?", "Con tu autorización, nos conectamos a tu computadora mediante un programa seguro. Tú ves en todo momento lo que hacemos y puedes terminar la conexión cuando quieras."),
                ("¿Atienden negocios y oficinas?", "Sí. Además de atenciones puntuales, podemos acordar un plan de soporte periódico para revisar equipos, redes y respaldos."),
                ("¿Qué necesito para recibir soporte remoto?", "Una computadora con conexión a internet. Te guiamos paso a paso para iniciar la sesión."),
                ("¿Y si el problema no se puede resolver de forma remota?", "Te lo diremos con claridad y coordinaremos una revisión presencial o en nuestro taller.")],
    },
}


def build_service_pages():
    for s in SERVICES:
        if s["slug"] not in DETAIL:
            continue
        d = DETAIL[s["slug"]]
        link = service_link(s["value"])
        hero = page_hero([("Servicios", "servicios.html"), (s["nav"], None)], "Servicios", d["h1"], d["lead"],
                         image=d["img"], alt=d["alt"],
                         buttons=f'<a href="{link}" class="btn btn--primary btn--lg">{s["btn"]} {ARROW}</a>'
                                 f'<a href="contacto.html" class="btn btn--ghost-light btn--lg" data-wa data-wa-msg="Hola TechRevive, quiero información sobre: {s["nav"]}.">{icon("whatsapp")} Consultar por WhatsApp</a>')
        intro = f'''    <section class="section" aria-labelledby="intro-title">
      <div class="container split">
        <div class="split__body">
          <p class="eyebrow reveal">{s["nav"]}</p>
          <h2 class="section-title reveal" id="intro-title" style="--d:1">{d["intro_t"]}</h2>
          {"".join(f'<p class="reveal" style="--d:{i + 2}">{p}</p>' for i, p in enumerate(d["intro"]))}
        </div>
        <div class="split__media reveal" style="--d:1">
          <img src="{d["intro_img"]}" width="960" height="640" loading="lazy" alt="{e(d["intro_alt"])}" />
        </div>
      </div>
    </section>
'''
        n = len(d["inc"])
        cols = 4 if n % 4 == 0 else 3
        inc = f'''    <section class="section section--soft" aria-labelledby="inc-title">
      <div class="container">
{section_head("Qué incluye", d["inc_t"], center=True, hid="inc-title")}
        {cards(d["inc"], cols)}
      </div>
    </section>
'''
        extra = f'''    <section class="section section--dark" aria-labelledby="extra-title">
      <div class="why__glow" aria-hidden="true"></div>
      <div class="container" style="position:relative">
{section_head("Para tener en cuenta", d["extra_t"], hid="extra-title", light=True)}
        {cards(d["extra"], 4)}
      </div>
    </section>
'''
        faq = f'''    <section class="section" aria-labelledby="faq-title">
      <div class="container faq-narrow">
{section_head("Preguntas frecuentes", "Resolvemos tus dudas.", center=True, hid="faq-title")}
        {faq_items(d["faq"], open_first=True)}
        <p class="reveal" style="text-align:center; margin-top:2rem; color:var(--muted)">¿Tienes otra pregunta? <a href="preguntas-frecuentes.html" style="color:var(--blue-700); font-weight:600">Consulta todas las preguntas frecuentes</a>.</p>
      </div>
    </section>
'''
        cta = cta_block(f"¿Listo para empezar con {s['nav'].lower()}?",
                        "Cuéntanos qué necesitas y te enviaremos una orientación clara, sin compromiso.",
                        f'<a href="{link}" class="btn btn--white btn--lg">{s["btn"]} {ARROW}</a>\n'
                        f'            <a href="contacto.html" class="btn btn--ghost-light btn--lg" data-wa>{icon("whatsapp")} Escribir por WhatsApp</a>')
        body = hero + intro + inc + extra + process_section(soft=True) + faq + cta
        jsonld = [{"@context": "https://schema.org", "@type": "Service", "name": s["nav"], "provider": {"@type": "Organization", "name": "TechRevive"},
                   "areaServed": "Guatemala", "description": s["desc"]}, faq_jsonld(d["faq"])]
        page(s["slug"], d["seo"][0], d["seo"][1], body, image=d["img"], jsonld=jsonld, section="Servicios")
