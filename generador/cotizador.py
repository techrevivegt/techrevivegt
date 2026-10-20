# -*- coding: utf-8 -*-
"""Página «Tarifario y cotizador» (cotizador.html). Los precios y listas vienen de content/tarifario.json."""
import json
from base import *  # noqa: F401,F403

T = load("tarifario.json", default={}) or {}
LISTAS = g(T, "listas", default={}) or {}
MON = e(g(T, "moneda") or "Q")


def lista(k, default=()):
    v = [str(x).strip() for x in arr(LISTAS.get(k)) if str(x).strip()]
    return v or list(default)


def precio_num(v):
    try:
        return round(float(str(v).replace(",", "").replace("Q", "").strip() or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def fmt(v):
    n = precio_num(v)
    s = f"{n:,.2f}"
    return s[:-3] if s.endswith(".00") else s


def categorias():
    out = []
    for ci, c in enumerate(arr(g(T, "categorias", default=[]))):
        if not isinstance(c, dict) or not c.get("nombre"):
            continue
        svcs = []
        for si, s in enumerate(arr(c.get("servicios"))):
            if not isinstance(s, dict) or not s.get("nombre"):
                continue
            svcs.append({"id": f"s{ci}-{si}", "nombre": str(s["nombre"]), "precio": precio_num(s.get("precio")),
                         "desde": bool(s.get("desde")), "por_unidad": bool(s.get("por_unidad")),
                         "unidad": str(s.get("unidad") or "unidad"), "detalle": str(s.get("detalle") or "")})
        if svcs:
            out.append({"nombre": str(c["nombre"]), "icono": c.get("icono") or "wrench", "servicios": svcs})
    return out


def opts(items, placeholder="Seleccione…"):
    o = f'<option value="">{e(placeholder)}</option>' if placeholder is not None else ""
    return o + "".join(f'<option>{e(x)}</option>' for x in items)


def sel(name, label, items, full=False, placeholder="Seleccione…", required=False):
    req = ' required aria-required="true"' if required else ""
    star = ' <span class="req" aria-hidden="true">*</span>' if required else ""
    return (f'<div class="cf{" cf--full" if full else ""}"><label for="q-{name}">{e(label)}{star}</label>'
            f'<select id="q-{name}" name="{name}"{req}>{opts(items, placeholder)}</select></div>')


def inp(name, label, kind="text", placeholder="", full=False, required=False, extra="", wrap=""):
    req = ' required aria-required="true"' if required else ""
    star = ' <span class="req" aria-hidden="true">*</span>' if required else ""
    ph = f' placeholder="{e(placeholder)}"' if placeholder else ""
    return (f'<div class="cf{" cf--full" if full else ""}"{wrap}><label for="q-{name}">{e(label)}{star}</label>'
            f'<input id="q-{name}" name="{name}" type="{kind}"{ph}{req}{extra} /></div>')


def area(name, label, placeholder="", rows=3):
    return (f'<div class="cf cf--full"><label for="q-{name}">{e(label)}</label>'
            f'<textarea id="q-{name}" name="{name}" rows="{rows}" placeholder="{e(placeholder)}"></textarea></div>')


def chips(name, items, label=None, icons=None):
    lab = f'<p class="cf-label" id="lbl-{name}">{e(label)}</p>' if label else ""
    li = []
    for i, x in enumerate(items):
        ic = f"{icon(icons[i], 'check')} " if icons else ""
        li.append(f'<label class="chip-check"><input type="checkbox" name="{name}" value="{e(x)}" /><span>{ic}{e(x)}</span></label>')
    aria = f' role="group" aria-labelledby="lbl-{name}"' if label else ""
    return f'<div class="cf cf--full">{lab}<div class="chip-group"{aria}>{"".join(li)}</div></div>'


def step(n, ident, title, sub, body, note=""):
    nt = f'<p class="cotz-step__note">{icon("alert")} {e(note)}</p>' if note else ""
    return f'''
          <fieldset class="cotz-step reveal" id="{ident}">
            <legend class="cotz-step__title"><span class="cotz-step__num">{n}</span><span>{e(title)}<small>{e(sub)}</small></span></legend>
            {nt}<div class="cf-grid">{body}</div>
          </fieldset>'''


def build_cotizador():
    cats = categorias()
    tipos = [t for t in arr(g(T, "tipos_servicio", default=[])) if isinstance(t, dict) and t.get("nombre")]
    logo_src = e((g(T, "logo") or "/img/logo-techrevive.png").lstrip("/"))
    subt = e(g(T, "subtitulo") or "Tarifario interactivo de reparación y mantenimiento")
    urg = precio_num(g(T, "recargo_urgencia") or 0)

    # ---- servicios (tarifario)
    cat_html = []
    for c in cats:
        items = []
        for s in c["servicios"]:
            desde = '<span class="svc-desde">desde</span> ' if s["desde"] else ""
            unidad = f' <span class="svc-unit">/ {e(s["unidad"])}</span>' if s["por_unidad"] else ""
            det = f'<small>{e(s["detalle"])}</small>' if s["detalle"] else ""
            qty = (f'<span class="svc-qty"><label class="sr-only" for="qty-{s["id"]}">Cantidad de {e(s["unidad"])}</label>'
                   f'<input type="number" id="qty-{s["id"]}" name="qty-{s["id"]}" min="1" max="99" value="1" inputmode="numeric" /></span>') if s["por_unidad"] else ""
            items.append(f'''
                <li class="svc" data-search="{e((s["nombre"] + " " + s["detalle"] + " " + c["nombre"]).lower())}">
                  <label class="svc__main"><input type="checkbox" name="svc" value="{s["id"]}" />
                    <span class="svc__box" aria-hidden="true">{icon("check")}</span>
                    <span class="svc__name">{e(s["nombre"])}{det}</span>
                    <span class="svc__price">{desde}{MON}{fmt(s["precio"])}{unidad}</span>
                  </label>{qty}
                </li>''')
        cat_html.append(f'''
            <details class="svc-cat" data-cat="{e(c["nombre"])}">
              <summary><span class="svc-cat__icon">{icon(c["icono"], "wrench")}</span><span class="svc-cat__name">{e(c["nombre"])}</span>
                <span class="svc-cat__count" hidden>0</span><span class="svc-cat__chev">{icon("chevron")}</span></summary>
              <ul class="svc-list">{"".join(items)}
              </ul>
            </details>''')

    tipos_html = "".join(
        f'<label class="tipo-card"><input type="checkbox" name="tipo" value="{e(t["nombre"])}" data-cat="{e(t.get("categoria") or "")}" />'
        f'<span class="tipo-card__icon">{icon(t.get("icono"), "wrench")}</span><span class="tipo-card__name">{e(t["nombre"])}</span></label>'
        for t in tipos)

    pasos = "".join([
        step(1, "paso-cliente", "Datos del cliente", "¿A nombre de quién va la cotización?",
             inp("cliente", "Nombre completo", placeholder="Nombre del cliente", required=True, extra=' autocomplete="name"')
             + inp("telefono", "Teléfono / WhatsApp", "tel", "Ej. 5555 5555", required=True, extra=' autocomplete="tel"')
             + inp("correo", "Correo electrónico", "email", "correo@ejemplo.com", extra=' autocomplete="email"')
             + inp("nit", "NIT", placeholder="CF")
             + sel("tipo_cliente", "Tipo de cliente", ["Particular", "Empresa / negocio", "Institución educativa", "Estudiante"])
             + inp("direccion", "Dirección (si es servicio a domicilio)", placeholder="Zona, colonia, municipio")),
        step(2, "paso-equipo", "Datos del equipo", "Tipo, marca, modelo y estado en que se recibe",
             sel("equipo", "Tipo de computadora", lista("tipos_equipo", ["Laptop", "PC de escritorio", "Otro"]), required=True)
             + sel("marca", "Marca", lista("marcas", ["HP", "Dell", "Lenovo", "Otra"]))
             + inp("marca_otra", "¿Cuál marca?", placeholder="Escribe la marca", wrap=' data-show-if="marca=Otra" hidden')
             + inp("modelo", "Modelo", placeholder="Ej. Inspiron 15 3000, IdeaPad 3")
             + inp("serie", "Número de serie", placeholder="Está en la etiqueta inferior")
             + inp("anio", "Año aproximado", "number", "Ej. 2020", extra=' min="1990" max="2035"')
             + sel("so", "Sistema operativo actual", lista("sistemas", ["Windows 11", "Windows 10", "No sabe"]))
             + sel("contrasena", "¿El equipo tiene contraseña?", ["No tiene", "Sí, el cliente la proporciona", "Sí, pero no la comparte"])
             + chips("accesorios", lista("accesorios"), "Accesorios que se entregan con el equipo")
             + chips("estado_fisico", lista("estado_fisico"), "Estado físico al recibirlo")
             + area("obs_fisicas", "Observaciones del estado físico", "Ej. rayón en la tapa, falta tecla Fn…", 2)),
        step(3, "paso-specs", "Especificaciones técnicas", "Si no las conoces, déjalas en «No sabe»: el técnico las completa",
             sel("procesador", "Procesador", lista("procesadores"))
             + inp("procesador_modelo", "Modelo exacto del procesador", placeholder="Ej. i5-8250U, Ryzen 5 5500U")
             + sel("ram", "Memoria RAM", lista("ram"))
             + sel("tipo_ram", "Tipo de RAM", lista("tipo_ram"))
             + sel("disco_tipo", "Tipo de almacenamiento", lista("almacenamiento_tipo"))
             + sel("disco_cap", "Capacidad del disco", lista("almacenamiento_capacidad"))
             + sel("graficos", "Tarjeta gráfica", lista("graficos"))),
        step(4, "paso-previo", "Diagnóstico previo", "Lo que el cliente reporta antes de la revisión",
             chips("sintomas", lista("sintomas"), "¿Qué problema presenta? (marca todos los que apliquen)")
             + area("problema", "Describe el problema con tus palabras", "¿Qué pasa, desde cuándo y qué estabas haciendo cuando empezó?", 3)
             + sel("desde_cuando", "¿Desde cuándo ocurre?", ["Hoy", "Esta semana", "Este mes", "Hace más de un mes", "No recuerda"])
             + sel("reparado_antes", "¿Ha sido reparado antes?", ["No", "Sí, en TechRevive", "Sí, en otro lugar"])),
        step(5, "paso-solicitud", "¿Qué quiere el cliente que se haga?", "Elige uno o varios tipos de servicio",
             f'<div class="cf cf--full"><div class="tipo-grid" role="group" aria-label="Tipos de servicio">{tipos_html}</div>'
             f'<p class="cf-help">{icon("bulb")} Al elegir un tipo, abrimos su sección en el tarifario y marcamos el servicio sugerido.</p></div>'
             + area("solicitud", "Detalle de lo que solicita", "Ej. quiere pasar a SSD sin perder sus archivos y que la laptop arranque más rápido.", 2)
             + sel("modalidad", "Modalidad de atención", ["En taller", "A domicilio", "Remoto"], placeholder=None)
             + f'''<div class="cf"><p class="cf-label">Prioridad</p>
                <label class="switch-row"><input type="checkbox" name="urgente" value="1" /><span class="switch-ui" aria-hidden="true"></span>
                <span>Servicio urgente <small>(+{fmt(urg)}% de recargo, entrega prioritaria)</small></span></label></div>'''),
    ])

    tarifario = f'''
          <fieldset class="cotz-step reveal" id="paso-tarifario">
            <legend class="cotz-step__title"><span class="cotz-step__num">6</span><span>Tarifario de servicios<small>Marca los servicios a cotizar. Los precios son de referencia.</small></span></legend>
            <div class="svc-tools">
              <div class="svc-search">{icon("search")}<label class="sr-only" for="svc-buscar">Buscar servicio</label><input id="svc-buscar" type="search" placeholder="Buscar servicio… (ej. pantalla, SSD, virus)" autocomplete="off" /></div>
              <button type="button" class="btn btn--outline btn--sm" data-cats="open">Ver todo</button>
              <button type="button" class="btn btn--outline btn--sm" data-cats="close">Contraer</button>
            </div>
            <p class="svc-empty" hidden>No encontramos ese servicio. Agrégalo como «otro concepto» en el paso 7.</p>
            <div class="svc-cats">{"".join(cat_html)}
            </div>
          </fieldset>
          <fieldset class="cotz-step reveal" id="paso-repuestos">
            <legend class="cotz-step__title"><span class="cotz-step__num">7</span><span>Repuestos y otros conceptos<small>Piezas, licencias o trabajos que no están en el tarifario (opcional)</small></span></legend>
            <div class="parts" id="parts">
              <div class="parts__head" aria-hidden="true"><span>Descripción</span><span>Cant.</span><span>Precio unit. ({MON})</span><span></span></div>
              <div class="parts__rows" id="parts-rows"></div>
              <button type="button" class="btn btn--outline btn--sm" id="part-add">{icon("plus")} Agregar repuesto o concepto</button>
            </div>
          </fieldset>'''

    tecnico = step(8, "paso-tecnico", "Diagnóstico técnico", "Lo completa el técnico después de revisar el equipo",
                   area("diag_tecnico", "Diagnóstico del técnico", "Hallazgos de la revisión: pruebas realizadas, componentes con falla…", 3)
                   + area("causa", "Causa probable", "Ej. acumulación de polvo y pasta térmica seca", 2)
                   + area("trabajo", "Trabajo a realizar / recomendaciones", "Ej. limpieza interna, cambio de pasta térmica y migración a SSD", 2)
                   + sel("estado_general", "Estado general del equipo", ["Bueno", "Regular", "Malo", "Crítico"])
                   + sel("entrega", "Tiempo estimado de entrega", ["Mismo día", "24 horas", "2 a 3 días hábiles", "4 a 5 días hábiles", "Más de una semana", "Por confirmar"])
                   + sel("garantia", "Garantía del trabajo", ["30 días", "60 días", "90 días", "Sin garantía"])
                   + inp("tecnico", "Técnico responsable", placeholder="Nombre del técnico")
                   + f'''<div class="cf cf--full adjust">
                       <div class="adjust__item"><label for="q-descuento">Descuento</label>
                         <div class="adjust__row"><input id="q-descuento" name="descuento" type="number" min="0" step="0.01" placeholder="0" />
                         <select name="descuento_tipo" aria-label="Tipo de descuento"><option value="pct">%</option><option value="monto">{MON}</option></select></div></div>
                       <div class="adjust__item"><label for="q-anticipo">Anticipo recibido ({MON})</label>
                         <input id="q-anticipo" name="anticipo" type="number" min="0" step="0.01" placeholder="0" /></div>
                     </div>''',
                   note="Si eres cliente, puedes dejar esta sección en blanco.")

    resumen = f'''
          <aside class="cotz__aside" aria-label="Resumen de la cotización">
            <div class="cotz-sum" id="resumen">
              <div class="cotz-sum__head">
                <p class="cotz-sum__eyebrow">{icon("clipboard")} Resumen de cotización</p>
                <p class="cotz-sum__no">No. <span data-out="numero">—</span></p>
              </div>
              <dl class="cotz-sum__meta">
                <div><dt>Cliente</dt><dd data-out="cliente">—</dd></div>
                <div><dt>Equipo</dt><dd data-out="equipo">—</dd></div>
                <div><dt>Sistema</dt><dd data-out="so">—</dd></div>
                <div><dt>Specs</dt><dd data-out="specs">—</dd></div>
              </dl>
              <ul class="cotz-sum__items" id="sum-items"><li class="cotz-sum__empty">Aún no has elegido servicios.</li></ul>
              <dl class="cotz-sum__totals">
                <div><dt>Subtotal</dt><dd data-out="subtotal">{MON}0.00</dd></div>
                <div data-row="urgencia" hidden><dt>Recargo por urgencia</dt><dd data-out="urgencia"></dd></div>
                <div data-row="descuento" hidden><dt>Descuento</dt><dd data-out="descuento"></dd></div>
                <div class="cotz-sum__total"><dt>Total estimado</dt><dd data-out="total">{MON}0.00</dd></div>
                <div data-row="anticipo" hidden><dt>Anticipo</dt><dd data-out="anticipo"></dd></div>
                <div data-row="saldo" hidden><dt>Saldo pendiente</dt><dd data-out="saldo"></dd></div>
              </dl>
              <p class="cotz-sum__desde" data-row="desde" hidden>{icon("alert")} Incluye precios «desde»: el total final se confirma con el diagnóstico.</p>
              <div class="cotz-sum__actions">
                <button type="button" class="btn btn--white btn--block" id="btn-print">{icon("printer")} Imprimir / guardar PDF</button>
                <div class="wa-dest" role="radiogroup" aria-label="Enviar a">
                  <label><input type="radio" name="wa_dest" value="empresa" checked /> <span>A TechRevive</span></label>
                  <label><input type="radio" name="wa_dest" value="cliente" /> <span>Al cliente</span></label>
                </div>
                <button type="button" class="btn btn--whatsapp btn--block" id="btn-wa">{icon("whatsapp")} Enviar por WhatsApp</button>
                <button type="button" class="btn btn--ghost-light btn--block btn--sm" id="btn-reset">{icon("refresh")} Nueva cotización</button>
              </div>
              <p class="cotz-sum__saved" id="saved-note">{icon("check")} Se guarda automáticamente en este dispositivo.</p>
            </div>
          </aside>'''

    nota = e(g(T, "nota"))
    iva = "Precios en quetzales, incluyen IVA." if g(T, "precios_incluyen_iva", default=True) is not False else "Precios en quetzales, no incluyen IVA."
    data = {
        "moneda": g(T, "moneda") or "Q",
        "validez_dias": int(precio_num(g(T, "validez_dias") or 15)) or 15,
        "recargo_urgencia": urg,
        "iva": iva,
        "nota": g(T, "nota") or "",
        "condiciones": [str(c) for c in arr(g(T, "condiciones", default=[])) if str(c).strip()],
        "tipos": [{"nombre": t["nombre"], "categoria": t.get("categoria") or "", "sugeridos": [str(x) for x in arr(t.get("servicios_sugeridos"))]} for t in tipos],
        "categorias": cats,
        "logo": (g(T, "logo") or "/img/logo-techrevive.png").lstrip("/"),
        "subtitulo": g(T, "subtitulo") or "Tarifario interactivo de reparación y mantenimiento",
        "empresa": {"whatsapp": g(CFG, "contacto", "whatsapp_visible") or "", "correo": g(CFG, "contacto", "correo") or "",
                    "direccion": g(CFG, "contacto", "direccion") or "", "web": SITE_URL.replace("https://", "").replace("http://", ""),
                    "eslogan": g(CFG, "sitio", "eslogan") or "Tecnología que transforma, soluciones que impulsan."},
    }
    data_json = json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")

    P = g(T, "portada", default={}) or {}
    hero = page_hero([("Servicios", "servicios.html"), ("Tarifario y cotizador", None)], "Cotiza en línea",
                     hl(P.get("titulo") or "Tarifario y", P.get("titulo_resaltado") or "cotizador."),
                     P.get("texto") or "Calcula al instante el costo estimado de tu servicio.",
                     chips=["Precios de referencia", "Sin compromiso", "Imprime o envía por WhatsApp"])

    body = hero + f'''    <section class="section section--soft cotz-section" aria-label="Cotizador de servicios">
      <div class="container">
        <form class="cotz" id="cotizador" novalidate autocomplete="off">
          <div class="cotz__main">
            <header class="cotz-head reveal">
              <img class="cotz-head__logo" src="{logo_src}" width="1200" height="312" alt="TechRevive · Reparación y Mantenimiento" />
              <div class="cotz-head__info">
                <p class="cotz-head__sub">{subt}</p>
                <div class="cotz-head__fields">
                  <div class="cf cf--inline"><label for="q-numero">No. de cotización</label><input id="q-numero" name="numero" type="text" /></div>
                  <div class="cf cf--inline"><label for="q-fecha">Fecha</label><input id="q-fecha" name="fecha" type="date" /></div>
                </div>
              </div>
            </header>
            <noscript><p class="cotz-step">Para usar el cotizador necesitas activar JavaScript. También puedes escribirnos por WhatsApp.</p></noscript>
{pasos}{tarifario}{tecnico}
            <div class="cotz-note reveal">{icon("alert")}<p><strong>Nota importante:</strong> {nota} {e(iva)}</p></div>
          </div>
{resumen}
        </form>
        <div class="cotz-mobilebar" id="mobilebar" aria-hidden="true"><span>Total estimado <strong data-out="total">{MON}0.00</strong></span><a href="#resumen" class="btn btn--primary btn--sm">Ver resumen</a></div>
      </div>
    </section>
    <div class="qp" id="qp"></div>
    <script type="application/json" id="tarifario-data">{data_json}</script>
    <script src="js/cotizador.js" defer></script>
'''
    page("cotizador.html", "Tarifario y cotizador de servicios",
         "Cotiza en línea reparación, mantenimiento preventivo y correctivo, recuperación de datos, cambio de sistema operativo y clonación de disco. Precios de referencia en quetzales.",
         body, section="Servicios")
