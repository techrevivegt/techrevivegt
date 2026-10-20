# -*- coding: utf-8 -*-
"""Capacitación, Cursos, Aula virtual e Inscripción."""
from site_base import *

# (categoría-filtro, etiqueta categoría, ícono, título, descripción, nivel, modalidad, temas)
COURSES = [
    ("computacion", "Computación", "monitor", "Computación básica",
     "Da tus primeros pasos con la computadora con confianza, desde cero y a tu ritmo.",
     "Principiante", "Presencial · Virtual",
     ["Uso del sistema operativo", "Archivos y carpetas", "Internet y correo electrónico", "Seguridad básica en línea"]),
    ("computacion", "Computación", "file", "Ofimática",
     "Domina las herramientas que más se usan en el estudio y en el trabajo.",
     "Principiante · Intermedio", "Presencial · Virtual",
     ["Documentos con Word", "Hojas de cálculo con Excel", "Presentaciones con PowerPoint", "Herramientas en la nube"]),
    ("tecnico", "Técnico", "wrench", "Reparación de computadoras",
     "Aprende a diagnosticar, mantener y reparar equipos con práctica real.",
     "Intermedio", "Presencial",
     ["Componentes de una computadora", "Diagnóstico de fallas", "Mantenimiento preventivo", "Instalación de sistemas"]),
    ("digital", "Digital", "cloud", "Herramientas digitales",
     "Trabaja, estudia y colabora en línea de forma más productiva.",
     "Principiante", "Presencial · Virtual",
     ["Correo y calendario", "Almacenamiento en la nube", "Videollamadas y trabajo remoto", "Herramientas de inteligencia artificial"]),
    ("digital", "Digital", "camera", "Fotografía",
     "Toma mejores fotos con tu celular o cámara para tus redes y tu negocio.",
     "Principiante", "Presencial",
     ["Composición e iluminación", "Fotografía con celular", "Edición básica", "Fotos de producto para redes"]),
    ("profesional", "Desarrollo profesional", "rocket", "Emprendimiento",
     "Convierte tu idea en un negocio y llévalo al mundo digital.",
     "Todos los niveles", "Presencial · Virtual",
     ["Modelo de negocio", "Presencia digital", "Ventas por redes y WhatsApp", "Finanzas básicas"]),
    ("profesional", "Desarrollo profesional", "briefcase", "Empleabilidad",
     "Prepárate para buscar empleo y destacar en un mundo cada vez más digital.",
     "Todos los niveles", "Presencial · Virtual",
     ["Currículum efectivo", "Preparación para entrevistas", "Perfil profesional en LinkedIn", "Habilidades digitales para el trabajo"]),
    ("personalizada", "A tu medida", "settings", "Capacitación personalizada",
     "Elige el tema, el horario y el ritmo. Para personas, equipos de trabajo e instituciones.",
     "Según tu nivel", "Presencial · Virtual",
     ["Temas a elección", "Horarios flexibles", "Individual o grupal", "Para empresas e instituciones"]),
]
COURSE_NAMES = [c[3] for c in COURSES]


def course_cards():
    out = []
    for i, (cat, catl, ic, t, d, lvl, mod, topics) in enumerate(COURSES):
        link = "inscripcion.html?curso=" + quote(t) + "#formulario"
        out.append(f'''          <article class="course reveal" style="--d:{i % 3}" data-category="{cat}">
            <div class="course__top">
              <span class="course__icon">{icon(ic)}</span>
              <span class="course__cat">{catl}</span>
            </div>
            <h3>{t}</h3>
            <p>{d}</p>
            <div class="course__meta">
              <span class="chip">{icon("award")} {lvl}</span>
              <span class="chip chip--soft">{icon("monitor")} {mod}</span>
            </div>
            {checklist(topics)}
            <a href="{link}" class="btn btn--outline">Inscribirme {ARROW}</a>
          </article>''')
    return '<div class="course-grid" id="cursosGrid">\n' + "\n".join(out) + "\n        </div>"


MODALIDADES = [
    ("building", "Presencial", "Clases prácticas en grupos reducidos, con equipo y acompañamiento del instructor."),
    ("monitor", "Virtual", "Aprende desde casa con clases en línea, material digital y seguimiento personalizado."),
    ("user", "Personalizada", "Sesiones individuales o para tu equipo, con el tema y el horario que necesites."),
]


def build_capacitacion():
    hero = page_hero([("Capacitación", None)], "Capacitación tecnológica",
                     "La tecnología no debería <span class=\"text-grad\">ser una barrera.</span>",
                     "Cursos prácticos para desarrollar habilidades digitales aplicables al estudio, al trabajo y al emprendimiento. Para todas las edades y niveles de experiencia.",
                     image="img/aprender.jpg", alt="Grupo de personas de distintas edades aprendiendo computación con un instructor",
                     buttons=f'<a href="cursos.html" class="btn btn--primary btn--lg">Ver cursos {ARROW}</a>'
                             f'<a href="inscripcion.html" class="btn btn--ghost-light btn--lg">Inscribirme</a>')
    enfoque = f'''    <section class="section" aria-labelledby="enfoque-title">
      <div class="container split split--reverse">
        <div class="split__media reveal">
          <img src="img/p-capacitacion.jpg" width="960" height="640" loading="lazy" alt="Estudiantes practicando en computadoras durante una clase" />
        </div>
        <div class="split__body">
          <p class="eyebrow reveal">Nuestra forma de enseñar</p>
          <h2 class="section-title reveal" id="enfoque-title" style="--d:1">Aprender haciendo, paso a paso.</h2>
          <p class="reveal" style="--d:2">En TechRevive creemos que cualquier persona puede aprender, utilizar y aprovechar la tecnología. Por eso nuestras capacitaciones son prácticas: cada tema se aprende resolviendo situaciones reales del estudio, del trabajo o del negocio.</p>
          <p class="reveal" style="--d:3">Explicamos con paciencia y sin tecnicismos, respetando el ritmo de cada persona. Al terminar, no solo sabrás usar una herramienta: entenderás para qué sirve y cómo sacarle provecho.</p>
          <div class="levels reveal" style="--d:4; margin-top:1.5rem" aria-label="Niveles de experiencia">
            <span class="level"><i></i>Principiante</span>
            <span class="level"><i></i><i></i>Intermedio</span>
            <span class="level"><i></i><i></i><i></i>Avanzado</span>
          </div>
        </div>
      </div>
    </section>
'''
    modal = f'''    <section class="section section--soft" aria-labelledby="mod-title">
      <div class="container">
{section_head("Modalidades", "Aprende como mejor te funcione.", "Elige la modalidad que se adapte a tu tiempo, tu ubicación y tu forma de aprender.", center=True, hid="mod-title")}
        {cards(MODALIDADES, 3, center=True)}
      </div>
    </section>
'''
    destacados = [(c[2], c[3], c[4], "cursos.html") for c in COURSES[:4]]
    dest = f'''    <section class="section" aria-labelledby="dest-title">
      <div class="container">
        <header class="section-head section-head--split reveal">
          <div>
            <p class="eyebrow">Cursos</p>
            <h2 class="section-title" id="dest-title">Capacitaciones disponibles.</h2>
          </div>
          <p class="section-lead">Computación básica, ofimática, reparación de computadoras, herramientas digitales, fotografía, emprendimiento, empleabilidad y capacitación personalizada.</p>
        </header>
        {cards(destacados, 4, linked=True)}
        <div class="section-foot"><a href="cursos.html" class="btn btn--primary">Ver todos los cursos {ARROW}</a></div>
      </div>
    </section>
'''
    para = [
        ("school", "Estudiantes", "Refuerza tus habilidades digitales para tus tareas, proyectos y futuro profesional."),
        ("users", "Adultos y adultos mayores", "Aprende a usar la computadora y el celular con paciencia y confianza."),
        ("rocket", "Emprendedores", "Herramientas digitales para vender, promocionar y organizar tu negocio."),
        ("building", "Empresas e instituciones", "Programas de capacitación para equipos de trabajo, a la medida."),
    ]
    para_sec = f'''    <section class="section section--dark" aria-labelledby="para-title">
      <div class="why__glow" aria-hidden="true"></div>
      <div class="container" style="position:relative">
{section_head("¿Para quién?", "Cursos para cada etapa.", hid="para-title", light=True)}
        {cards(para, 4)}
      </div>
    </section>
'''
    pasos = f'''    <section class="section section--soft" aria-labelledby="pasos-title">
      <div class="container">
{section_head("Cómo inscribirte", "Empieza en cuatro pasos.", center=True, hid="pasos-title")}
        {steps_row([("Elige tu curso", "Revisa los cursos disponibles y elige el que más te interese."),
                    ("Llena tu inscripción", "Completa el formulario en línea con tus datos y preferencias."),
                    ("Confirmamos contigo", "Te contactamos para confirmar horario, modalidad y detalles."),
                    ("¡A aprender!", "Empieza tus clases y aprende con acompañamiento en cada paso.")])}
        <div class="section-foot"><a href="inscripcion.html" class="btn btn--primary btn--lg">Inscribirme ahora {ARROW}</a></div>
      </div>
    </section>
'''
    body = hero + enfoque + modal + dest + para_sec + pasos + cta_block(
        "¿Buscas una capacitación para tu equipo o institución?",
        "Diseñamos programas a la medida, con los temas y horarios que necesites.",
        f'<a href="contacto.html" class="btn btn--white btn--lg" data-wa data-wa-msg="Hola TechRevive, quiero información sobre capacitación para mi equipo o institución.">{icon("whatsapp")} Solicitar información</a>\n'
        f'            <a href="cursos.html" class="btn btn--ghost-light btn--lg">Ver cursos</a>')
    page("capacitacion.html", "Capacitación tecnológica: cursos prácticos para todos",
         "Cursos prácticos de computación, ofimática, reparación de computadoras, herramientas digitales, fotografía, emprendimiento y empleabilidad. Modalidad presencial, virtual y personalizada.",
         body, image="img/aprender.jpg", section="Capacitación")


def build_cursos():
    hero = page_hero([("Capacitación", "capacitacion.html"), ("Cursos disponibles", None)], "Cursos disponibles",
                     "Aprende habilidades <span class=\"text-grad\">que sí vas a usar.</span>",
                     "Elige tu curso, revisa los temas y reserva tu lugar. Todos nuestros cursos son prácticos y se adaptan a tu nivel de experiencia.",
                     buttons=f'<a href="inscripcion.html" class="btn btn--primary btn--lg">Inscribirme {ARROW}</a>'
                             f'<a href="contacto.html" class="btn btn--ghost-light btn--lg" data-wa data-wa-msg="Hola TechRevive, quiero información sobre horarios y costos de los cursos.">{icon("whatsapp")} Consultar horarios</a>')
    filtros = [("all", "Todos"), ("computacion", "Computación"), ("tecnico", "Técnico"), ("digital", "Digital"),
               ("profesional", "Desarrollo profesional"), ("personalizada", "A tu medida")]
    fbtns = "".join(f'<button class="filter{" is-active" if k == "all" else ""}" data-filter="{k}" aria-pressed="{"true" if k == "all" else "false"}">{l}</button>' for k, l in filtros)
    grid = f'''    <section class="section section--soft" aria-label="Lista de cursos">
      <div class="container">
        <div class="notice reveal" style="margin-bottom:2rem">{icon("calendar")}<p><strong>Horarios, duración y costos:</strong> varían según la modalidad y el grupo. Escríbenos o llena tu inscripción y te enviaremos toda la información del próximo grupo.</p></div>
        <div class="filters reveal" role="group" aria-label="Filtrar cursos por categoría">{fbtns}</div>
        {course_cards()}
      </div>
    </section>
'''
    faqs = [("¿Necesito conocimientos previos?", "No para los cursos de nivel principiante. En los cursos intermedios te indicaremos lo que conviene saber antes de empezar."),
            ("¿Necesito llevar mi propia computadora?", "En las clases presenciales te indicaremos si contamos con equipo disponible para tu grupo. Para las clases virtuales necesitas una computadora o celular con internet."),
            ("¿Entregan constancia o diploma?", "Al completar el curso recibirás una constancia de participación de TechRevive."),
            ("¿Puedo pedir un curso que no está en la lista?", "Sí. Con la capacitación personalizada puedes elegir el tema que necesites. Escríbenos y lo preparamos para ti.")]
    faq = f'''    <section class="section" aria-labelledby="faq-title">
      <div class="container faq-narrow">
{section_head("Dudas comunes", "Antes de inscribirte.", center=True, hid="faq-title")}
        {faq_items(faqs, open_first=True)}
      </div>
    </section>
'''
    body = hero + grid + faq + cta_block("¿Listo para aprender algo nuevo?", "Reserva tu lugar y te contactaremos con los detalles del próximo grupo.",
                                         f'<a href="inscripcion.html" class="btn btn--white btn--lg">Inscribirme ahora {ARROW}</a>\n'
                                         f'            <a href="contacto.html" class="btn btn--ghost-light btn--lg" data-wa>{icon("whatsapp")} Tengo una pregunta</a>')
    page("cursos.html", "Cursos de computación, ofimática y habilidades digitales",
         "Cursos de computación básica, ofimática, reparación de computadoras, herramientas digitales, fotografía, emprendimiento, empleabilidad y capacitación personalizada.",
         body, image="img/p-capacitacion.jpg", jsonld=faq_jsonld(faqs), section="Capacitación")


def build_aula():
    hero = page_hero([("Capacitación", "capacitacion.html"), ("Aula virtual", None)], "Aula virtual",
                     "Aprende desde cualquier lugar, <span class=\"text-grad\">a tu ritmo.</span>",
                     "Nuestra aula virtual reúne tus clases, materiales y ejercicios en un solo lugar. Ingresa desde tu computadora o celular cuando lo necesites.",
                     image="img/aula-virtual.jpg", alt="Estudiante tomando una clase en línea desde su laptop en casa",
                     buttons=f'<a href="#acceso" class="btn btn--primary btn--lg" data-aula>{icon("monitor")} <span data-aula-label>Ingresar al aula virtual</span></a>'
                             f'<a href="inscripcion.html" class="btn btn--ghost-light btn--lg">Inscribirme</a>')
    feats = [("play", "Clases en línea", "Sesiones en vivo o grabadas para repasar cuando quieras."),
             ("download", "Material descargable", "Guías, presentaciones y archivos de práctica de cada tema."),
             ("clipboard", "Ejercicios prácticos", "Actividades para aplicar lo aprendido y medir tu avance."),
             ("message", "Acompañamiento", "Resuelve tus dudas con el instructor durante todo el curso.")]
    feat_sec = f'''    <section class="section" aria-labelledby="feat-title">
      <div class="container">
{section_head("Qué encontrarás", "Todo tu curso, en un solo lugar.", center=True, hid="feat-title")}
        {cards(feats, 4, center=True)}
      </div>
    </section>
'''
    pasos = f'''    <section class="section section--soft" id="acceso" aria-labelledby="acceso-title">
      <div class="container">
{section_head("Cómo acceder", "Ingresa en cuatro pasos.", center=True, hid="acceso-title")}
        {steps_row([("Inscríbete", "Completa tu inscripción en un curso con modalidad virtual."),
                    ("Recibe tu acceso", "Te enviamos tu usuario e instrucciones por correo o WhatsApp."),
                    ("Ingresa al aula", "Entra desde tu computadora o celular con tus datos de acceso."),
                    ("Aprende a tu ritmo", "Sigue las clases, descarga materiales y realiza tus ejercicios.")])}
        <div class="access-box reveal" style="margin-top:2.5rem">
          <div>
            <h2>¿Ya tienes tu usuario?</h2>
            <p data-aula-pending>Estamos preparando nuestra aula virtual. Inscríbete y te avisaremos en cuanto esté disponible.</p>
          </div>
          <a href="#acceso" class="btn btn--primary btn--lg" data-aula>{icon("monitor")} <span data-aula-label>Ingresar al aula virtual</span></a>
        </div>
      </div>
    </section>
'''
    req = f'''    <section class="section" aria-labelledby="req-title">
      <div class="container split">
        <div class="split__body">
          <p class="eyebrow reveal">Requisitos</p>
          <h2 class="section-title reveal" id="req-title" style="--d:1">Lo que necesitas para tus clases virtuales.</h2>
          <p class="reveal" style="--d:2">No necesitas un equipo potente ni conocimientos avanzados. Si tienes dudas para configurar tu dispositivo, te ayudamos antes de la primera clase.</p>
          <div class="reveal" style="--d:3">{checklist(["Computadora, tablet o celular", "Conexión a internet estable", "Audífonos con micrófono (recomendado)", "Un correo electrónico activo", "Ganas de aprender"])}</div>
        </div>
        <div class="split__media reveal" style="--d:1">
          <img src="img/aprender.jpg" width="960" height="640" loading="lazy" alt="Personas aprendiendo computación con acompañamiento de un instructor" />
        </div>
      </div>
    </section>
'''
    body = hero + feat_sec + pasos + req + cta_block("¿Quieres estudiar en línea?", "Inscríbete en uno de nuestros cursos virtuales y empieza a aprender desde casa.",
                                                   f'<a href="inscripcion.html" class="btn btn--white btn--lg">Inscribirme {ARROW}</a>\n'
                                                   f'            <a href="cursos.html" class="btn btn--ghost-light btn--lg">Ver cursos</a>')
    page("aula-virtual.html", "Aula virtual: aprende en línea",
         "Aula virtual de TechRevive: clases en línea, material descargable, ejercicios prácticos y acompañamiento del instructor.",
         body, image="img/aula-virtual.jpg", section="Capacitación")


def build_inscripcion():
    hero = page_hero([("Capacitación", "capacitacion.html"), ("Inscripción", None)], "Inscripción",
                     "Reserva tu lugar <span class=\"text-grad\">en un curso.</span>",
                     "Completa el formulario y te contactaremos para confirmar horario, modalidad y todos los detalles de tu curso.")
    form = f'''<form class="form js-form reveal" style="--d:1" novalidate data-form-name="Inscripción a curso" data-wa-intro="Hola TechRevive, quiero inscribirme a un curso.">
          <h3 class="form__title">Formulario de inscripción</h3>
          <p class="form__sub">Los campos marcados con <span aria-hidden="true">*</span><span class="sr-only">asterisco</span> son obligatorios.</p>
          <div class="form__row">
            {field("i-nombre", "Nombre completo", "nombre", required=True, placeholder="Tu nombre y apellido", error="Escribe tu nombre completo.", autocomplete="name")}
            {field("i-telefono", "Teléfono / WhatsApp", "telefono", "tel", True, "Ej. 5555 5555", "Escribe un número válido (mínimo 8 dígitos).")}
          </div>
          <div class="form__row">
            {field("i-email", "Correo electrónico", "email", "email", False, "tucorreo@ejemplo.com", "Revisa el formato del correo.", autocomplete="email")}
            {field("i-curso", "Curso de interés", "curso", "select", True, error="Selecciona el curso que te interesa.", options=COURSE_NAMES)}
          </div>
          <div class="form__row">
            {field("i-modalidad", "Modalidad preferida", "modalidad", "select", True, error="Selecciona una modalidad.", options=["Presencial", "Virtual", "Personalizada"])}
            {field("i-horario", "Horario preferido", "horario", "select", False, options=["Mañana", "Tarde", "Noche", "Fin de semana", "Flexible"])}
          </div>
          {field("i-nivel", "Nivel de experiencia", "nivel", "select", False, options=["Principiante (desde cero)", "Intermedio", "Avanzado"])}
          {field("i-mensaje", "Comentarios", "mensaje", "textarea", False, "¿Algo que debamos saber? Por ejemplo: objetivos, disponibilidad o si la inscripción es para un grupo.")}
          {HONEYPOT.format(p="i")}
          <button type="submit" class="btn btn--primary btn--lg btn--block form__submit">
            <span class="form__submit-text">Enviar inscripción</span>
            {icon("send")}
          </button>
          <p class="form__status" role="status" aria-live="polite"></p>
        </form>'''
    body = hero + f'''    <section class="section section--soft" id="formulario" aria-labelledby="ins-title">
      <div class="container form-layout">
        <aside class="form-aside reveal">
          <p class="eyebrow">¿Qué sigue?</p>
          <h2 id="ins-title">Así funciona tu inscripción.</h2>
          <p>Tu solicitud nos llega al instante. No necesitas pagar nada para enviarla: primero confirmamos contigo todos los detalles.</p>
          <ol class="mini-steps">
            <li><strong>Envías el formulario</strong><span>Con el curso y la modalidad que prefieres.</span></li>
            <li><strong>Te contactamos</strong><span>Por WhatsApp o correo, para confirmar horario y costo.</span></li>
            <li><strong>Reservamos tu lugar</strong><span>Te enviamos la información de inicio y lo que necesitas.</span></li>
            <li><strong>Empiezas a aprender</strong><span>Presencial o en nuestra <a href="aula-virtual.html" style="color:var(--blue-700);font-weight:600">aula virtual</a>.</span></li>
          </ol>
          <div class="notice">{icon("users")}<p><strong>¿Inscripción para un grupo o institución?</strong> Indícalo en los comentarios y te prepararemos una propuesta a la medida.</p></div>
        </aside>
        {form}
      </div>
    </section>
'''
    page("inscripcion.html", "Inscripción a cursos",
         "Inscríbete en los cursos de TechRevive: computación, ofimática, reparación de computadoras, herramientas digitales y más. Presencial, virtual o personalizada.",
         body, image="img/p-capacitacion.jpg", section="Capacitación")
