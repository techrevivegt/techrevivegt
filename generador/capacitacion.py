# -*- coding: utf-8 -*-
"""Capacitación, Cursos, Aula virtual e Inscripción."""
from base import *

CAP = load("capacitacion.json")
INI_CAP = g(load("inicio.json"), "capacitacion", default={})
CURSOS = [c for c in arr(load("cursos.json", default=[])) if isinstance(c, dict) and c.get("titulo")]
CATEGORIAS = ["Computación", "Técnico", "Digital", "Desarrollo profesional", "A tu medida"]
CAT_ICON = {"Computación": "monitor", "Técnico": "wrench", "Digital": "globe", "Desarrollo profesional": "briefcase", "A tu medida": "user"}


def course_cards():
    out = []
    for i, c in enumerate(CURSOS):
        link = "inscripcion.html?curso=" + quote(c["titulo"]) + "#formulario"
        cat = c.get("categoria") or "Otros"
        meta = ""
        if c.get("nivel"):
            meta += f'<span class="chip">{icon("award")} {e(c["nivel"])}</span>'
        if c.get("modalidad"):
            meta += f'<span class="chip chip--soft">{icon("monitor")} {e(c["modalidad"])}</span>'
        out.append(f'''          <article class="course reveal" style="--d:{i % 3}" data-category="{slugify(cat)}">
            <div class="course__top">
              <span class="course__icon">{icon(c.get("icono"), CAT_ICON.get(cat, "book"))}</span>
              <span class="course__cat">{e(cat)}</span>
            </div>
            <h3>{e(c["titulo"])}</h3>
            {f'<p>{e(c["descripcion"])}</p>' if c.get("descripcion") else ""}
            {f'<div class="course__meta">{meta}</div>' if meta else ""}
            {checklist(c.get("temas"))}
            <a href="{link}" class="btn btn--outline">Inscribirme {ARROW}</a>
          </article>''')
    return '<div class="course-grid" id="cursosGrid">\n' + "\n".join(out) + "\n        </div>"


def levels_html(style=""):
    niveles = arr(INI_CAP.get("niveles")) or ["Principiante", "Intermedio", "Avanzado"]
    return (f'<div class="levels reveal" style="{style}" aria-label="Niveles de experiencia">'
            + "".join(f'<span class="level">{"<i></i>" * min(i + 1, 5)}{e(n)}</span>' for i, n in enumerate(niveles)) + "</div>")


def build_capacitacion():
    P = g(CAP, "portada", default={})
    hero = page_hero([("Capacitación", None)], "Capacitación tecnológica", hl(P.get("titulo") or "Capacitación tecnológica", P.get("titulo_resaltado")),
                     P.get("texto"), image=img(P.get("imagen")), alt=P.get("imagen_descripcion"),
                     buttons=f'<a href="cursos.html" class="btn btn--primary btn--lg">Ver cursos {ARROW}</a>'
                             f'<a href="inscripcion.html" class="btn btn--ghost-light btn--lg">Inscribirme</a>')
    E = g(CAP, "enfoque", default={})
    enfoque = ""
    if E.get("titulo"):
        media = (f'''<div class="split__media reveal">
          <img src="{e(img(E["imagen"]))}" width="960" height="640" loading="lazy" alt="{e(E.get("imagen_descripcion"))}" />
        </div>''' if E.get("imagen") else "")
        pars = "".join(f'<p class="reveal" style="--d:{min(i + 2, 5)}">{e(p)}</p>' for i, p in enumerate(arr(E.get("parrafos"))))
        enfoque = f'''    <section class="section" aria-labelledby="enfoque-title">
      <div class="container split split--reverse{"" if media else " split--solo"}">
        {media}
        <div class="split__body">
          {f'<p class="eyebrow reveal">{e(E["etiqueta"])}</p>' if E.get("etiqueta") else ""}
          <h2 class="section-title reveal" id="enfoque-title" style="--d:1">{e(E["titulo"])}</h2>
          {pars}
          {levels_html("--d:4; margin-top:1.5rem")}
        </div>
      </div>
    </section>
'''
    mc = cards(CAP.get("modalidades"), center=True, fallback="monitor")
    modal = f'''    <section class="section section--soft" aria-labelledby="mod-title">
      <div class="container">
{section_head("Modalidades", "Aprende como mejor te funcione.", "Elige la modalidad que se adapte a tu tiempo, tu ubicación y tu forma de aprender.", center=True, hid="mod-title")}
        {mc}
      </div>
    </section>
''' if mc else ""
    destacados = [{"icono": c.get("icono"), "titulo": c["titulo"], "texto": c.get("descripcion", ""), "enlace": "cursos.html"} for c in CURSOS[:4]]
    dest = ""
    if destacados:
        names = [c["titulo"] for c in CURSOS]
        lead = (", ".join(names[:-1]) + " y " + names[-1]).lower().capitalize() + "." if len(names) > 1 else names[0] + "."
        dest = f'''    <section class="section" aria-labelledby="dest-title">
      <div class="container">
        <header class="section-head section-head--split reveal">
          <div>
            <p class="eyebrow">Cursos</p>
            <h2 class="section-title" id="dest-title">Capacitaciones disponibles.</h2>
          </div>
          <p class="section-lead">{e(lead)}</p>
        </header>
        {cards(destacados, linked=True, fallback="book")}
        <div class="section-foot"><a href="cursos.html" class="btn btn--primary">Ver todos los cursos {ARROW}</a></div>
      </div>
    </section>
'''
    pc = cards(CAP.get("para_quien"), fallback="users")
    para_sec = f'''    <section class="section section--dark" aria-labelledby="para-title">
      <div class="why__glow" aria-hidden="true"></div>
      <div class="container" style="position:relative">
{section_head("¿Para quién?", "Cursos para cada etapa.", hid="para-title", light=True)}
        {pc}
      </div>
    </section>
''' if pc else ""
    sr = steps_row(CAP.get("pasos"))
    n_pasos = len([x for x in arr(CAP.get("pasos")) if x.get("titulo")])
    num = {2: "dos", 3: "tres", 4: "cuatro", 5: "cinco", 6: "seis"}.get(n_pasos)
    pasos = f'''    <section class="section section--soft" aria-labelledby="pasos-title">
      <div class="container">
{section_head("Cómo inscribirte", f"Empieza en {num} pasos." if num else "Empieza paso a paso.", center=True, hid="pasos-title")}
        {sr}
        <div class="section-foot"><a href="inscripcion.html" class="btn btn--primary btn--lg">Inscribirme ahora {ARROW}</a></div>
      </div>
    </section>
''' if sr else ""
    body = hero + enfoque + modal + dest + para_sec + pasos + cta_block(
        "¿Buscas una capacitación para tu equipo o institución?",
        "Diseñamos programas a la medida, con los temas y horarios que necesites.",
        f'<a href="contacto.html" class="btn btn--white btn--lg" data-wa data-wa-msg="Hola TechRevive, quiero información sobre capacitación para mi equipo o institución.">{icon("whatsapp")} Solicitar información</a>\n'
        f'            <a href="cursos.html" class="btn btn--ghost-light btn--lg">Ver cursos</a>')
    page("capacitacion.html", "Capacitación tecnológica: cursos prácticos para todos",
         P.get("texto") or "Cursos prácticos de tecnología para todas las edades.", body, image=img(P.get("imagen")), section="Capacitación")


def build_cursos():
    hero = page_hero([("Capacitación", "capacitacion.html"), ("Cursos disponibles", None)], "Cursos disponibles",
                     'Aprende habilidades <span class="text-grad">que sí vas a usar.</span>',
                     "Elige tu curso, revisa los temas y reserva tu lugar. Todos nuestros cursos son prácticos y se adaptan a tu nivel de experiencia.",
                     buttons=f'<a href="inscripcion.html" class="btn btn--primary btn--lg">Inscribirme {ARROW}</a>'
                             f'<a href="contacto.html" class="btn btn--ghost-light btn--lg" data-wa data-wa-msg="Hola TechRevive, quiero información sobre horarios y costos de los cursos.">{icon("whatsapp")} Consultar horarios</a>')
    usadas = [c for c in CATEGORIAS if any(x.get("categoria") == c for x in CURSOS)]
    usadas += list(dict.fromkeys(x.get("categoria") or "Otros" for x in CURSOS if (x.get("categoria") or "Otros") not in CATEGORIAS))
    fbtns = ""
    if len(usadas) > 1:
        fbtns = ('<div class="filters reveal" role="group" aria-label="Filtrar cursos por categoría">'
                 '<button class="filter is-active" data-filter="all" aria-pressed="true">Todos</button>'
                 + "".join(f'<button class="filter" data-filter="{slugify(c)}" aria-pressed="false">{e(c)}</button>' for c in usadas) + "</div>")
    aviso = CAP.get("aviso_cursos")
    notice = f'<div class="notice reveal" style="margin-bottom:2rem">{icon("calendar")}<p>{e(aviso)}</p></div>' if aviso else ""
    grid_html = course_cards() if CURSOS else '<p class="empty-note">Muy pronto publicaremos los próximos cursos. Escríbenos para más información.</p>'
    grid = f'''    <section class="section section--soft" aria-label="Lista de cursos">
      <div class="container">
        {notice}
        {fbtns}
        {grid_html}
      </div>
    </section>
'''
    faqs = [f for f in arr(CAP.get("preguntas_cursos")) if f.get("pregunta")]
    faq = f'''    <section class="section" aria-labelledby="faq-title">
      <div class="container faq-narrow">
{section_head("Dudas comunes", "Antes de inscribirte.", center=True, hid="faq-title")}
        {faq_items(faqs, open_first=True)}
      </div>
    </section>
''' if faqs else ""
    body = hero + grid + faq + cta_block("¿Listo para aprender algo nuevo?", "Reserva tu lugar y te contactaremos con los detalles del próximo grupo.",
                                         f'<a href="inscripcion.html" class="btn btn--white btn--lg">Inscribirme ahora {ARROW}</a>\n'
                                         f'            <a href="contacto.html" class="btn btn--ghost-light btn--lg" data-wa>{icon("whatsapp")} Tengo una pregunta</a>')
    names = ", ".join(c["titulo"].lower() for c in CURSOS[:8])
    page("cursos.html", "Cursos de computación, ofimática y habilidades digitales",
         f"Cursos prácticos de TechRevive: {names}." if names else "Cursos prácticos de TechRevive.",
         body, image="img/p-capacitacion.jpg", jsonld=faq_jsonld(faqs), section="Capacitación")


def build_aula():
    hero = page_hero([("Capacitación", "capacitacion.html"), ("Aula virtual", None)], "Aula virtual",
                     'Aprende desde cualquier lugar, <span class="text-grad">a tu ritmo.</span>',
                     "Nuestra aula virtual reúne tus clases, materiales y ejercicios en un solo lugar. Ingresa desde tu computadora o celular cuando lo necesites.",
                     image="img/aula-virtual.jpg", alt="Estudiante tomando una clase en línea desde su laptop en casa",
                     buttons=f'<a href="#acceso" class="btn btn--primary btn--lg" data-aula>{icon("monitor")} <span data-aula-label>Ingresar al aula virtual</span></a>'
                             f'<a href="inscripcion.html" class="btn btn--ghost-light btn--lg">Inscribirme</a>')
    feats = [{"icono": "play", "titulo": "Clases en línea", "texto": "Sesiones en vivo o grabadas para repasar cuando quieras."},
             {"icono": "download", "titulo": "Material descargable", "texto": "Guías, presentaciones y archivos de práctica de cada tema."},
             {"icono": "clipboard", "titulo": "Ejercicios prácticos", "texto": "Actividades para aplicar lo aprendido y medir tu avance."},
             {"icono": "message", "titulo": "Acompañamiento", "texto": "Resuelve tus dudas con el instructor durante todo el curso."}]
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
        {steps_row([{"titulo": "Inscríbete", "texto": "Completa tu inscripción en un curso con modalidad virtual."},
                    {"titulo": "Recibe tu acceso", "texto": "Te enviamos tu usuario e instrucciones por correo o WhatsApp."},
                    {"titulo": "Ingresa al aula", "texto": "Entra desde tu computadora o celular con tus datos de acceso."},
                    {"titulo": "Aprende a tu ritmo", "texto": "Sigue las clases, descarga materiales y realiza tus ejercicios."}])}
        <div class="access-box reveal" style="margin-top:2.5rem">
          <div>
            <h2>¿Ya tienes tu usuario?</h2>
            <p data-aula-pending>Estamos preparando nuestra aula virtual. Inscríbete y te avisaremos en cuanto esté disponible.</p>
            <p data-aula-ready hidden>Entra con el usuario y la contraseña que te enviamos. ¿Los olvidaste? <a href="contacto.html" data-wa>Escríbenos</a> y te ayudamos.</p>
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
                     'Reserva tu lugar <span class="text-grad">en un curso.</span>',
                     "Completa el formulario y te contactaremos para confirmar horario, modalidad y todos los detalles de tu curso.")
    nombres = [c["titulo"] for c in CURSOS] or ["Capacitación personalizada"]
    modalidades = [m["titulo"] for m in arr(CAP.get("modalidades")) if isinstance(m, dict) and m.get("titulo")] or ["Presencial", "Virtual", "Personalizada"]
    niveles = arr(INI_CAP.get("niveles")) or ["Principiante", "Intermedio", "Avanzado"]
    form = f'''<form class="form js-form reveal" style="--d:1" novalidate data-form-name="Inscripción a curso" data-wa-intro="Hola TechRevive, quiero inscribirme a un curso.">
          <h3 class="form__title">Formulario de inscripción</h3>
          <p class="form__sub">Los campos marcados con <span aria-hidden="true">*</span><span class="sr-only">asterisco</span> son obligatorios.</p>
          <div class="form__row">
            {field("i-nombre", "Nombre completo", "nombre", required=True, placeholder="Tu nombre y apellido", error="Escribe tu nombre completo.", autocomplete="name")}
            {field("i-telefono", "Teléfono / WhatsApp", "telefono", "tel", True, "Ej. 5555 5555", "Escribe un número válido (mínimo 8 dígitos).")}
          </div>
          <div class="form__row">
            {field("i-email", "Correo electrónico", "email", "email", False, "tucorreo@ejemplo.com", "Revisa el formato del correo.", autocomplete="email")}
            {field("i-curso", "Curso de interés", "curso", "select", True, error="Selecciona el curso que te interesa.", options=nombres)}
          </div>
          <div class="form__row">
            {field("i-modalidad", "Modalidad preferida", "modalidad", "select", True, error="Selecciona una modalidad.", options=modalidades)}
            {field("i-horario", "Horario preferido", "horario", "select", False, options=["Mañana", "Tarde", "Noche", "Fin de semana", "Flexible"])}
          </div>
          {field("i-nivel", "Nivel de experiencia", "nivel", "select", False, options=niveles)}
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
         "Inscríbete en los cursos de TechRevive. Modalidad presencial, virtual o personalizada.",
         body, image="img/p-capacitacion.jpg", section="Capacitación")
