# -*- coding: utf-8 -*-
"""Herramientas para clientes:
   · diagnostico.html  → «Doctor TechRevive»: diagnóstico guiado (y con IA si está activada)
   · seguimiento.html  → seguimiento de reparaciones con código de orden
   · privacidad.html   → aviso de privacidad
   · offline.html      → página sin conexión (app instalable)
Los precios salen del tarifario (content/tarifario.json), así siempre están al día.
"""
import json
import os
import unicodedata
from base import *  # noqa: F401,F403

T = load("tarifario.json", default={}) or {}
MON = g(T, "moneda") or "Q"


def _norm(s):
    s = unicodedata.normalize("NFD", str(s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join("".join(c if c.isalnum() else " " for c in s).split())


def _precio(v):
    try:
        return round(float(str(v).replace(",", "").replace("Q", "").strip() or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def catalogo():
    """Todos los servicios del tarifario: [{n, p, desde, u}]."""
    out = []
    for c in arr(g(T, "categorias", default=[])):
        if not isinstance(c, dict):
            continue
        for s in arr(c.get("servicios") or c.get("items")):
            if isinstance(s, dict) and s.get("nombre"):
                out.append({"n": str(s["nombre"]).strip(), "p": _precio(s.get("precio")),
                            "desde": bool(s.get("desde")), "u": str(s.get("unidad") or "").strip()})
    return out


CAT = catalogo()


def buscar(clave):
    k = _norm(clave)
    for s in CAT:
        if k and k in _norm(s["n"]):
            return s
    return None


def ia_activa():
    v = g(CFG, "asistente_ia")
    return v is True or str(v).lower() in ("true", "1", "si", "sí")


# ------------------------------------------------------------------ Árbol de diagnóstico
# Cada síntoma tiene causas (con servicios del tarifario por palabra clave) y preguntas.
# Cada respuesta suma o resta puntos a las causas. «urg» sube la urgencia del resultado.
SINTOMAS = [
    {"id": "no-enciende", "t": "No enciende", "i": "zap", "d": "No prende, no hace nada o se apaga al instante.", "urg": "media",
     "causas": {
         "cargador": {"t": "Cargador, cable o tomacorriente", "d": "Es lo más sencillo y lo primero que se descarta.", "s": ["Diagnóstico básico"]},
         "bateria": {"t": "Batería agotada o dañada", "d": "Una batería muerta puede impedir el arranque, incluso conectada.", "s": ["Cambio de batería"]},
         "fuente": {"t": "Fuente de poder o circuito de encendido", "d": "Suele fallar después de apagones o subidas de voltaje.", "s": ["Reparación de encendido"]},
         "placa": {"t": "Falla en la placa madre", "d": "Requiere revisión con instrumentos para confirmarla.", "s": ["Diagnóstico de placa madre", "Reparación de placa madre"]},
         "liquido": {"t": "Daño por líquido", "d": "La humedad causa cortos y corrosión en los circuitos.", "s": ["derrame de líquido"]},
     },
     "q": [
         {"q": "Al presionar el botón de encendido, ¿ves alguna luz o escuchas ventiladores?", "o": [
             {"t": "Nada, ninguna luz", "fx": {"cargador": 2, "fuente": 3, "bateria": 1}},
             {"t": "Prende una luz, pero no arranca", "fx": {"placa": 2, "bateria": 2, "fuente": 1}},
             {"t": "Enciende unos segundos y se apaga", "fx": {"fuente": 2, "placa": 2}}]},
         {"q": "¿Pasó algo antes de que fallara?", "o": [
             {"t": "Se mojó o le cayó líquido", "fx": {"liquido": 7}, "urg": "alta"},
             {"t": "Se cayó o recibió un golpe", "fx": {"placa": 3, "liquido": 1}},
             {"t": "Hubo un apagón o una subida de voltaje", "fx": {"fuente": 4, "placa": 1}},
             {"t": "Nada, simplemente dejó de encender", "fx": {"cargador": 1, "bateria": 1}}]},
         {"q": "¿Probaste con otro cargador o en otro tomacorriente?", "o": [
             {"t": "Sí, y sigue igual", "fx": {"cargador": -3, "fuente": 1, "placa": 1}},
             {"t": "Todavía no he probado", "fx": {"cargador": 2}},
             {"t": "Es una PC de escritorio", "fx": {"cargador": -2, "bateria": -4, "fuente": 2}}]},
     ],
     "ok": ["Prueba otro tomacorriente y revisa que el cable esté bien conectado en ambos extremos.",
            "En laptop: desconecta el cargador, mantén presionado el botón de encendido 30 segundos y vuelve a conectar. Eso descarga la energía residual.",
            "Si es PC de escritorio, revisa que el interruptor de atrás de la fuente esté en «I»."],
     "no": ["No abras la fuente de poder: guarda energía peligrosa aunque esté desconectada.",
            "Si huele a quemado, no insistas con el botón de encendido."]},

    {"id": "sin-imagen", "t": "Enciende, pero no da imagen", "i": "monitor", "d": "Se oyen ventiladores, pero la pantalla queda negra o se traba en el logo.", "urg": "media",
     "causas": {
         "pantalla": {"t": "Pantalla, retroiluminación o cable de video", "d": "Si en un monitor externo sí se ve, casi seguro es esto.", "s": ["Cambio de pantalla", "Diagnóstico avanzado"]},
         "ram": {"t": "Memoria RAM sucia o mal colocada", "d": "Es una causa muy común y de las más fáciles de resolver.", "s": ["Mantenimiento preventivo", "memoria RAM"]},
         "grafica": {"t": "Tarjeta de video", "d": "Puede fallar por calor o por desgaste.", "s": ["Diagnóstico avanzado", "tarjeta de video"]},
         "sistema": {"t": "El sistema operativo no arranca", "d": "El equipo funciona, pero Windows está dañado.", "s": ["Formateo", "Respaldo de información"]},
         "placa": {"t": "Falla en la placa madre", "d": "Se confirma después de descartar lo demás.", "s": ["Diagnóstico de placa madre"]},
     },
     "q": [
         {"q": "¿Qué ves en la pantalla?", "o": [
             {"t": "Totalmente negra", "fx": {"ram": 2, "grafica": 2, "pantalla": 1, "placa": 1}},
             {"t": "Muy oscura: se ve apenas si la alumbro con una linterna", "fx": {"pantalla": 6}},
             {"t": "Se queda en el logo y no avanza", "fx": {"sistema": 6}},
             {"t": "Rayas, manchas o colores raros", "fx": {"pantalla": 3, "grafica": 3}}]},
         {"q": "¿Escuchas pitidos al encender?", "o": [
             {"t": "Sí, varios pitidos", "fx": {"ram": 4, "placa": 1}},
             {"t": "No", "fx": {"pantalla": 1, "grafica": 1}},
             {"t": "No estoy seguro", "fx": {}}]},
         {"q": "Si conectas un monitor o TV externo, ¿se ve la imagen?", "o": [
             {"t": "Sí, en el externo sí se ve", "fx": {"pantalla": 6, "grafica": -2, "ram": -2}},
             {"t": "Tampoco se ve", "fx": {"grafica": 2, "ram": 2, "placa": 2, "pantalla": -2}},
             {"t": "No he probado o es PC de escritorio", "fx": {}}]},
     ],
     "ok": ["Si es laptop, conecta un monitor o TV por HDMI: así sabrás si la falla es de la pantalla.",
            "Sube el brillo con las teclas de función (Fn).",
            "En PC de escritorio, revisa que el monitor esté conectado a la tarjeta de video y no a la salida de la placa."],
     "no": ["No presiones la pantalla para «probar» si se arregla."]},

    {"id": "lenta", "t": "Está muy lenta", "i": "clock", "d": "Tarda en encender, en abrir programas o se congela.", "urg": "baja",
     "causas": {
         "disco": {"t": "Disco duro mecánico lento o desgastado", "d": "Cambiarlo por un SSD hace que el equipo se sienta nuevo.", "s": ["Clonación de disco", "Cambio de disco"]},
         "ram": {"t": "Poca memoria RAM", "d": "Se nota al tener varios programas o pestañas abiertas.", "s": ["memoria RAM"]},
         "virus": {"t": "Virus o programas no deseados", "d": "Consumen recursos en segundo plano.", "s": ["virus"]},
         "sistema": {"t": "Sistema saturado", "d": "Programas al inicio, poco espacio o años sin mantenimiento.", "s": ["Optimización del sistema", "Formateo"]},
         "calor": {"t": "Sobrecalentamiento", "d": "Con calor, el procesador baja su velocidad para protegerse.", "s": ["Mantenimiento preventivo", "pasta térmica"]},
     },
     "q": [
         {"q": "¿Cuándo se nota más la lentitud?", "o": [
             {"t": "Al encender: tarda varios minutos", "fx": {"disco": 4, "sistema": 2}},
             {"t": "Con varios programas o pestañas abiertas", "fx": {"ram": 4}},
             {"t": "Todo el tiempo, incluso recién encendida", "fx": {"disco": 2, "virus": 2, "sistema": 2}},
             {"t": "Después de un rato de uso, y se calienta", "fx": {"calor": 5}}]},
         {"q": "¿Cuántos años tiene el equipo?", "o": [
             {"t": "Menos de 3 años", "fx": {"sistema": 2, "virus": 1}},
             {"t": "Entre 3 y 6 años", "fx": {"disco": 2, "ram": 1}},
             {"t": "Más de 6 años", "fx": {"disco": 3, "ram": 2}}]},
         {"q": "¿Ves anuncios, ventanas o programas que no instalaste?", "o": [
             {"t": "Sí", "fx": {"virus": 6}},
             {"t": "No", "fx": {"virus": -1}}]},
     ],
     "ok": ["Reinicia (no solo suspender) y desactiva programas de inicio: Ctrl + Shift + Esc → pestaña «Inicio».",
            "Deja al menos un 20 % del disco libre.",
            "En el Administrador de tareas revisa qué está usando más CPU, memoria o disco."],
     "no": ["No instales «optimizadores» o «limpiadores» milagrosos: muchos traen publicidad o virus."]},

    {"id": "calor", "t": "Se calienta o se apaga sola", "i": "thermo", "d": "Ventilador muy ruidoso, mucho calor o apagones repentinos.", "urg": "media",
     "causas": {
         "polvo": {"t": "Polvo acumulado en ventilador y disipador", "d": "Es la causa número uno de sobrecalentamiento.", "s": ["Mantenimiento preventivo", "Limpieza interna profunda"]},
         "pasta": {"t": "Pasta térmica seca", "d": "Con los años pierde su capacidad de transferir calor.", "s": ["pasta térmica"]},
         "ventilador": {"t": "Ventilador dañado", "d": "Si no gira o hace ruidos raros, hay que cambiarlo.", "s": ["Cambio de ventilador"]},
         "fuente": {"t": "Fuente de poder inestable", "d": "Puede causar apagones aunque el equipo no esté caliente.", "s": ["Reparación de encendido"]},
     },
     "q": [
         {"q": "¿Cómo suena el ventilador?", "o": [
             {"t": "Muy fuerte todo el tiempo", "fx": {"polvo": 3, "pasta": 2}},
             {"t": "Hace un ruido raro (roce o zumbido)", "fx": {"ventilador": 5}},
             {"t": "No se escucha nada", "fx": {"ventilador": 4}}]},
         {"q": "¿Cuándo se apaga o se calienta más?", "o": [
             {"t": "Con juegos, videos o programas pesados", "fx": {"pasta": 3, "polvo": 2}},
             {"t": "En cualquier momento, aunque no esté haciendo nada", "fx": {"fuente": 3, "ventilador": 1}},
             {"t": "No se apaga, solo se calienta mucho", "fx": {"polvo": 2, "pasta": 1}}]},
         {"q": "¿Cuándo le dieron mantenimiento por última vez?", "o": [
             {"t": "Hace menos de un año", "fx": {"fuente": 1, "ventilador": 1}},
             {"t": "Hace más de un año", "fx": {"polvo": 3, "pasta": 2}},
             {"t": "Nunca", "fx": {"polvo": 4, "pasta": 3}}]},
     ],
     "ok": ["Úsala sobre una superficie dura y plana (no en la cama ni en las piernas).",
            "Verifica que las rejillas de ventilación no estén tapadas.",
            "Una base con ventilador ayuda mientras nos la traes."],
     "no": ["No soples con la boca dentro de las rejillas: la humedad daña los componentes.",
            "No uses aspiradora directamente sobre los componentes (genera estática)."]},

    {"id": "errores", "t": "Pantalla azul, reinicios o errores", "i": "alert", "d": "Pantallazos azules, se reinicia sola o Windows muestra errores.", "urg": "media",
     "causas": {
         "drivers": {"t": "Controladores (drivers) o una actualización", "d": "Muy común después de actualizar o instalar algo.", "s": ["Instalación de drivers"]},
         "sistema": {"t": "Sistema operativo dañado", "d": "Archivos de Windows corruptos.", "s": ["Formateo", "Respaldo de información"]},
         "disco": {"t": "Disco con fallas", "d": "Riesgo de perder información: conviene respaldar ya.", "s": ["Diagnóstico avanzado", "Clonación de disco"]},
         "ram": {"t": "Memoria RAM defectuosa", "d": "Provoca pantallas azules aleatorias.", "s": ["Diagnóstico avanzado", "memoria RAM"]},
         "virus": {"t": "Virus o malware", "d": "Algunos virus dañan archivos del sistema.", "s": ["virus"]},
     },
     "q": [
         {"q": "¿Cuándo empezó?", "o": [
             {"t": "Después de una actualización o de instalar algo", "fx": {"drivers": 4, "sistema": 2}},
             {"t": "De la nada", "fx": {"disco": 2, "ram": 2}},
             {"t": "Después de un golpe o de moverla", "fx": {"disco": 3, "ram": 2}}]},
         {"q": "¿Escuchas clics o ruidos raros que vienen del disco?", "o": [
             {"t": "Sí", "fx": {"disco": 7}, "urg": "alta"},
             {"t": "No", "fx": {}},
             {"t": "Tiene SSD o no sé", "fx": {}}]},
         {"q": "¿Con qué frecuencia pasa?", "o": [
             {"t": "Varias veces al día", "fx": {"ram": 2, "disco": 2, "sistema": 1}},
             {"t": "De vez en cuando", "fx": {"drivers": 2}},
             {"t": "Solo con un programa o juego", "fx": {"drivers": 4}}]},
     ],
     "ok": ["Toma una foto del código de la pantalla azul (por ejemplo, MEMORY_MANAGEMENT): ayuda mucho al diagnóstico.",
            "Respalda YA tus archivos importantes en una USB o en la nube.",
            "Si empezó tras una actualización, prueba «Restaurar sistema» a una fecha anterior."],
     "no": ["No formatees sin respaldar primero."]},

    {"id": "virus", "t": "Virus, anuncios o ventanas extrañas", "i": "shield", "d": "Publicidad, páginas que se abren solas o archivos raros.", "urg": "media",
     "causas": {
         "navegador": {"t": "Navegador secuestrado o extensiones maliciosas", "d": "Cambian tu página de inicio y muestran anuncios.", "s": ["virus"]},
         "malware": {"t": "Virus o malware en el sistema", "d": "Puede robar datos o dañar archivos.", "s": ["virus", "Respaldo de información"]},
         "cuenta": {"t": "Cuentas o contraseñas comprometidas", "d": "Alguien más tiene acceso a tus cuentas.", "s": ["Recuperación de contraseña", "Soporte remoto"]},
         "sistema": {"t": "Sistema muy infectado", "d": "A veces lo más seguro es reinstalar desde cero.", "s": ["Formateo"]},
     },
     "q": [
         {"q": "¿Qué notas?", "o": [
             {"t": "Anuncios y ventanas emergentes", "fx": {"navegador": 3, "malware": 2}},
             {"t": "El navegador abre páginas que no elegí", "fx": {"navegador": 5}},
             {"t": "Archivos con nombres raros o un mensaje pidiendo pago", "fx": {"malware": 7, "sistema": 2}, "urg": "alta"},
             {"t": "Mis cuentas publican cosas solas o cambiaron mi contraseña", "fx": {"cuenta": 7}, "urg": "alta"}]},
         {"q": "¿Tienes un antivirus activo y actualizado?", "o": [
             {"t": "Sí", "fx": {"sistema": 1}},
             {"t": "No o no sé", "fx": {"malware": 2}}]},
     ],
     "ok": ["Si ves archivos cifrados o un mensaje que pide pago, desconecta el equipo de internet.",
            "Cambia tus contraseñas importantes desde OTRO dispositivo y activa la verificación en dos pasos.",
            "Revisa las extensiones del navegador y quita las que no reconozcas."],
     "no": ["Nunca pagues un rescate.",
            "No llames a números de «soporte técnico» que aparecen en ventanas emergentes: es una estafa."]},

    {"id": "liquido", "t": "Se mojó o le cayó líquido", "i": "alert", "d": "Agua, café, refresco… cada hora cuenta.", "urg": "alta",
     "causas": {
         "liquido": {"t": "Líquido dentro del equipo", "d": "Hay que desarmar, limpiar y secar antes de que avance la corrosión.", "s": ["derrame de líquido"]},
         "teclado": {"t": "Teclado dañado por el líquido", "d": "Muchas veces solo se afecta el teclado.", "s": ["Cambio de teclado"]},
         "placa": {"t": "Corto o corrosión en la placa madre", "d": "Más probable si siguió encendida después del derrame.", "s": ["Reparación de placa madre"]},
     },
     "q": [
         {"q": "¿Qué se derramó?", "o": [
             {"t": "Agua", "fx": {"liquido": 3}},
             {"t": "Café, refresco o algo con azúcar", "fx": {"liquido": 4, "placa": 2}},
             {"t": "No sé u otra cosa", "fx": {"liquido": 3}}]},
         {"q": "¿Qué hiciste después?", "o": [
             {"t": "La apagué y desconecté de inmediato", "fx": {"teclado": 2}},
             {"t": "Siguió encendida un rato", "fx": {"placa": 4}},
             {"t": "Intenté encenderla después", "fx": {"placa": 3}}]},
         {"q": "¿Cómo está ahora?", "o": [
             {"t": "Funciona, pero fallan algunas teclas", "fx": {"teclado": 5}},
             {"t": "No enciende", "fx": {"placa": 4}},
             {"t": "Funciona normal (por ahora)", "fx": {"liquido": 2}}]},
     ],
     "ok": ["Apágala y desconéctala YA. Si la batería se puede quitar, quítala.",
            "Colócala abierta, boca abajo, en forma de «V» invertida para que escurra.",
            "Tráela lo antes posible: la corrosión avanza en horas o días, aunque parezca que funciona."],
     "no": ["NO la enciendas para probar.",
            "No uses secadora de pelo caliente ni la metas en arroz: no sirve y deja residuos."]},

    {"id": "pantalla", "t": "Pantalla rota, con rayas o manchas", "i": "laptop", "d": "Golpes, manchas de tinta, rayas o parpadeo.", "urg": "baja",
     "causas": {
         "panel": {"t": "Pantalla (panel) dañada", "d": "Se cambia la pantalla por una compatible con tu modelo.", "s": ["Cambio de pantalla"]},
         "cable": {"t": "Cable flex de video", "d": "Si la imagen cambia al mover la tapa, suele ser el cable.", "s": ["Diagnóstico avanzado"]},
         "bisagra": {"t": "Bisagras o carcasa dañadas", "d": "Unas bisagras flojas terminan rompiendo el cable o la pantalla.", "s": ["bisagras"]},
         "grafica": {"t": "Tarjeta de video", "d": "Si en un monitor externo también hay rayas.", "s": ["Diagnóstico avanzado"]},
     },
     "q": [
         {"q": "¿Qué tiene la pantalla?", "o": [
             {"t": "Está quebrada o con manchas de tinta", "fx": {"panel": 7}},
             {"t": "Rayas o parpadeo", "fx": {"cable": 3, "panel": 2, "grafica": 1}},
             {"t": "La imagen cambia al mover la tapa", "fx": {"cable": 5, "bisagra": 2}}]},
         {"q": "¿Las bisagras están flojas o la tapa cruje al abrirla?", "o": [
             {"t": "Sí", "fx": {"bisagra": 5}},
             {"t": "No", "fx": {}}]},
     ],
     "ok": ["Conecta un monitor externo para seguir trabajando y respaldar tu información.",
            "Anota la marca y el modelo exacto (etiqueta debajo del equipo): así cotizamos la pantalla correcta."],
     "no": ["No presiones las zonas dañadas: el daño se extiende."]},

    {"id": "teclado", "t": "Teclado o touchpad fallan", "i": "grid", "d": "Teclas que no responden, letras que se escriben solas o el touchpad no funciona.", "urg": "baja",
     "causas": {
         "suciedad": {"t": "Suciedad debajo de las teclas", "d": "Migas y polvo traban las teclas.", "s": ["Limpieza de teclado"]},
         "teclado": {"t": "Teclado dañado", "d": "Se reemplaza el teclado completo.", "s": ["Cambio de teclado"]},
         "driver": {"t": "Configuración o controlador", "d": "El touchpad puede estar desactivado o sin driver.", "s": ["Instalación de drivers"]},
         "liquido": {"t": "Restos de líquido", "d": "Un derrame antiguo puede dañar el teclado con el tiempo.", "s": ["derrame de líquido"]},
     },
     "q": [
         {"q": "¿Qué pasa?", "o": [
             {"t": "Algunas teclas no funcionan", "fx": {"teclado": 3, "suciedad": 2}},
             {"t": "Se escriben letras solas", "fx": {"teclado": 4, "liquido": 1}},
             {"t": "El touchpad no responde", "fx": {"driver": 5}},
             {"t": "Todo el teclado dejó de funcionar", "fx": {"driver": 2, "teclado": 3}}]},
         {"q": "¿Alguna vez le cayó líquido?", "o": [
             {"t": "Sí", "fx": {"liquido": 5, "teclado": 2}},
             {"t": "No", "fx": {}}]},
     ],
     "ok": ["Prueba un teclado o mouse USB: si funcionan, la falla es del teclado o touchpad integrado.",
            "Revisa que el touchpad no esté desactivado (tecla Fn + el ícono del touchpad)."],
     "no": ["No hagas palanca para sacar teclas: sus ganchos se rompen con facilidad."]},

    {"id": "carga", "t": "No carga o la batería dura poco", "i": "zap", "d": "El cargador no funciona, carga a ratos o la batería no aguanta.", "urg": "media",
     "causas": {
         "cargador": {"t": "Cargador dañado", "d": "Es lo primero que se descarta.", "s": ["Diagnóstico básico"]},
         "bateria": {"t": "Batería desgastada", "d": "Las baterías pierden capacidad con los años.", "s": ["Cambio de batería"]},
         "puerto": {"t": "Puerto de carga flojo o dañado", "d": "Típico cuando solo carga si mueves el cable.", "s": ["puerto de carga"]},
         "placa": {"t": "Circuito de carga en la placa madre", "d": "Se confirma con diagnóstico.", "s": ["Diagnóstico de placa madre"]},
     },
     "q": [
         {"q": "¿Qué pasa exactamente?", "o": [
             {"t": "No carga nada", "fx": {"cargador": 3, "puerto": 2, "placa": 1}},
             {"t": "Carga solo si muevo el cable", "fx": {"puerto": 6}},
             {"t": "Carga, pero la batería dura muy poco", "fx": {"bateria": 5}},
             {"t": "La batería está hinchada (la tapa se levanta)", "fx": {"bateria": 7}, "urg": "alta"}]},
         {"q": "¿La luz del cargador enciende?", "o": [
             {"t": "No", "fx": {"cargador": 4}},
             {"t": "Sí", "fx": {"cargador": -1, "puerto": 1, "placa": 1}},
             {"t": "Mi cargador no tiene luz", "fx": {}}]},
     ],
     "ok": ["Prueba con otro cargador original de la misma potencia (los vatios vienen en la etiqueta).",
            "Revisa el puerto con una linterna: a veces solo tiene pelusa."],
     "no": ["Si la batería está hinchada, deja de usar el equipo y no la presiones ni la perfores: hay riesgo de incendio.",
            "No uses cargadores genéricos de menor potencia."]},

    {"id": "datos", "t": "No detecta el disco o perdí archivos", "i": "database", "d": "Archivos borrados, disco que no aparece o USB que no abre.", "urg": "alta",
     "causas": {
         "borrado": {"t": "Archivos borrados o disco formateado", "d": "Mientras no se sobrescriban, suelen recuperarse.", "s": ["Recuperación de archivos"]},
         "disco": {"t": "Disco dañado", "d": "Requiere recuperación especializada.", "s": ["Recuperación de disco dañado"]},
         "usb": {"t": "Memoria USB o tarjeta SD dañada", "d": "Muchas veces se recupera la información.", "s": ["Recuperación de memoria USB"]},
     },
     "q": [
         {"q": "¿Qué pasó?", "o": [
             {"t": "Borré archivos o formateé por error", "fx": {"borrado": 6}},
             {"t": "El disco no aparece o dice que no hay sistema", "fx": {"disco": 5}},
             {"t": "Una USB o tarjeta SD no abre", "fx": {"usb": 6}},
             {"t": "El disco hace clics o ruidos", "fx": {"disco": 7}}]},
         {"q": "¿Has seguido usando ese disco desde entonces?", "o": [
             {"t": "Sí", "fx": {"borrado": 1}},
             {"t": "No, lo dejé de usar", "fx": {}}]},
     ],
     "ok": ["Deja de usar ese disco o USB de inmediato: cada uso puede sobrescribir lo que se perdió.",
            "No instales programas de recuperación en el mismo disco."],
     "no": ["No abras el disco duro: el polvo lo arruina.",
            "No lo formatees aunque Windows te lo pida."]},

    {"id": "red", "t": "Internet, WiFi o impresora", "i": "wifi", "d": "Sin conexión, WiFi que se cae o impresora que no imprime.", "urg": "baja",
     "causas": {
         "wifi": {"t": "Configuración de red o del router", "d": "Muchas veces se resuelve en minutos.", "s": ["Configuración de red", "Soporte remoto"]},
         "driver": {"t": "Controlador de red", "d": "Si solo falla esta computadora.", "s": ["Instalación de drivers"]},
         "impresora": {"t": "Configuración de la impresora", "d": "Drivers, cola de impresión o conexión.", "s": ["impresora"]},
     },
     "q": [
         {"q": "¿Qué no funciona?", "o": [
             {"t": "El WiFi no aparece o se desconecta", "fx": {"wifi": 3, "driver": 3}},
             {"t": "Hay WiFi, pero no hay internet", "fx": {"wifi": 5}},
             {"t": "La impresora no imprime o no la detecta", "fx": {"impresora": 7}}]},
         {"q": "¿Otros dispositivos se conectan bien?", "o": [
             {"t": "Sí, solo falla esta computadora", "fx": {"driver": 3}},
             {"t": "No, fallan todos", "fx": {"wifi": 4}},
             {"t": "No aplica", "fx": {}}]},
     ],
     "ok": ["Reinicia el módem o router: desconéctalo 30 segundos y vuelve a conectarlo.",
            "En Windows: Configuración → Red e internet → «Restablecimiento de red».",
            "Muchas de estas fallas se resuelven por soporte remoto, sin salir de casa."],
     "no": []},

    {"id": "mejorar", "t": "Quiero mejorarla", "i": "rocket", "d": "Disco SSD, más memoria RAM, Windows 11 o mantenimiento.", "urg": "baja",
     "causas": {
         "ssd": {"t": "Cambiar a disco SSD", "d": "Es la mejora que más se nota: arranque y programas mucho más rápidos.", "s": ["Clonación de disco", "Cambio de disco"]},
         "ram": {"t": "Ampliar la memoria RAM", "d": "Ideal si trabajas con muchos programas a la vez.", "s": ["memoria RAM"]},
         "w11": {"t": "Actualizar a Windows 11", "d": "Revisamos primero que tu equipo sea compatible.", "s": ["Actualización a Windows 11"]},
         "mant": {"t": "Mantenimiento preventivo", "d": "Alarga la vida del equipo y evita fallas.", "s": ["Mantenimiento preventivo"]},
     },
     "q": [
         {"q": "¿Qué buscas principalmente?", "o": [
             {"t": "Que encienda y abra programas más rápido", "fx": {"ssd": 5}},
             {"t": "Trabajar con muchos programas a la vez", "fx": {"ram": 5}},
             {"t": "Tener Windows 11", "fx": {"w11": 5}},
             {"t": "Que dure más años", "fx": {"mant": 4, "ssd": 1}}]},
         {"q": "¿Qué disco tiene?", "o": [
             {"t": "Disco duro mecánico (HDD)", "fx": {"ssd": 4}},
             {"t": "Ya tiene SSD", "fx": {"ssd": -5, "ram": 2}},
             {"t": "No sé", "fx": {"ssd": 1}}]},
     ],
     "ok": ["Para ver cuánta RAM tiene: Ctrl + Shift + Esc → Rendimiento → Memoria.",
            "Windows 11 necesita TPM 2.0 y Arranque seguro; lo verificamos por ti."],
     "no": ["No compres piezas sin confirmar que son compatibles con tu modelo."]},

    {"id": "acceso", "t": "Olvidé mi contraseña", "i": "lock", "d": "No puedes entrar a Windows o a tus cuentas.", "urg": "media",
     "causas": {
         "windows": {"t": "Recuperar el acceso a Windows", "d": "Se recupera sin perder tus archivos en la mayoría de los casos.", "s": ["Recuperación de contraseña"]},
         "cuenta": {"t": "Recuperar una cuenta de correo o redes", "d": "Te guiamos con el proceso oficial de recuperación.", "s": ["Soporte remoto"]},
         "bitlocker": {"t": "Disco cifrado (BitLocker)", "d": "Se necesita la clave de recuperación de tu cuenta Microsoft.", "s": ["Recuperación de contraseña"]},
     },
     "q": [
         {"q": "¿Qué contraseña olvidaste?", "o": [
             {"t": "La de Windows (al encender)", "fx": {"windows": 6}},
             {"t": "La de mi correo o redes sociales", "fx": {"cuenta": 6}},
             {"t": "El equipo pide una clave de BitLocker", "fx": {"bitlocker": 7}}]},
     ],
     "ok": ["Si es una cuenta Microsoft, puedes restablecerla desde otro dispositivo en account.live.com.",
            "Ten a mano tu correo o teléfono de recuperación."],
     "no": ["Por seguridad, solo atendemos equipos y cuentas propias: te pediremos comprobarlo."]},
]

URGENCIAS = {
    "baja": {"t": "Puede esperar", "d": "No empeora rápido, pero conviene atenderlo para que no crezca."},
    "media": {"t": "Atiéndelo pronto", "d": "Te recomendamos revisarlo en los próximos días."},
    "alta": {"t": "Urgente: actúa hoy", "d": "Cada hora cuenta para evitar un daño mayor o la pérdida de información."},
}


def datos_diagnostico():
    sint = []
    faltan = set()
    for s in SINTOMAS:
        causas = {}
        for cid, c in s["causas"].items():
            svcs = []
            for k in c["s"]:
                f = buscar(k)
                if f and f not in svcs:
                    svcs.append(f)
                elif not f:
                    faltan.add(k)
            causas[cid] = {"t": c["t"], "d": c["d"], "s": svcs}
        sint.append({"id": s["id"], "t": s["t"], "i": s["i"], "d": s["d"], "urg": s["urg"], "causas": causas,
                     "q": s["q"], "ok": s["ok"], "no": s["no"]})
    if faltan and CAT:
        WARNINGS.append("Doctor TechRevive: no encontré en el tarifario estos servicios (se muestran sin precio): " + ", ".join(sorted(faltan)))
    return {"moneda": MON, "sintomas": sint, "urgencias": URGENCIAS, "ia": ia_activa(),
            "diag": buscar("Diagnóstico básico")}


def _json_script(id_, data):
    return f'<script type="application/json" id="{id_}">{json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")}</script>'


# ------------------------------------------------------------------ Páginas
def build_diagnostico():
    D = datos_diagnostico()
    equipos = [("laptop", "Laptop", "laptop"), ("pc", "PC de escritorio", "monitor"), ("aio", "Todo en uno", "monitor"), ("otro", "Otro equipo", "cpu")]
    eq_html = "".join(
        f'<button type="button" class="dx-opt dx-opt--eq" data-eq="{k}" aria-pressed="false"><span class="dx-opt__icon">{icon(ic, "laptop")}</span><span>{t}</span></button>'
        for k, t, ic in equipos)
    sx_html = "".join(
        f'<button type="button" class="dx-opt dx-opt--sx" data-sx="{e(s["id"])}" aria-pressed="false"><span class="dx-opt__icon">{icon(s["i"], "wrench")}</span>'
        f'<span class="dx-opt__txt"><strong>{e(s["t"])}</strong><small>{e(s["d"])}</small></span></button>' for s in SINTOMAS)
    tabs = ""
    ia_panel = ""
    if D["ia"]:
        tabs = '''
          <div class="dx-tabs" role="tablist" aria-label="Forma de diagnóstico">
            <button type="button" role="tab" class="dx-tab is-on" aria-selected="true" data-tab="guiado">🧭 Diagnóstico guiado</button>
            <button type="button" role="tab" class="dx-tab" aria-selected="false" data-tab="ia">✨ Descríbelo con tus palabras <span class="dx-beta">IA</span></button>
          </div>'''
        ia_panel = f'''
          <div class="dx-panel" data-panel="ia" hidden>
            <form class="dx-ia" id="dx-ia" novalidate>
              <label class="dx-label" for="dx-ia-eq">¿Qué equipo es?</label>
              <select id="dx-ia-eq" name="equipo" class="dx-select">
                <option>Laptop</option><option>PC de escritorio</option><option>Todo en uno</option><option>Otro equipo</option>
              </select>
              <label class="dx-label" for="dx-ia-txt">Cuéntanos qué le pasa, con tus palabras</label>
              <textarea id="dx-ia-txt" name="texto" rows="5" maxlength="700" class="dx-textarea" placeholder="Ej.: Mi laptop HP se apaga sola cuando veo videos y el ventilador suena muy fuerte. Tiene unos 4 años."></textarea>
              <div class="dx-ia__foot">
                <small class="dx-note">No escribas contraseñas ni datos personales. La respuesta la genera una inteligencia artificial y es orientativa.</small>
                <button type="submit" class="btn btn--primary">{icon("zap")} Analizar mi problema</button>
              </div>
              <p class="dx-ia__status" role="status" aria-live="polite"></p>
            </form>
          </div>'''
    body = page_hero([("Servicios", "servicios.html"), ("Doctor TechRevive", None)], "Diagnóstico gratuito en 1 minuto",
                     hl("¿Qué le pasa a", "tu computadora?"),
                     "Responde unas preguntas sencillas y te decimos la causa más probable, qué puedes intentar en casa con seguridad y cuánto costaría repararla según nuestro tarifario.",
                     chips=["Gratis y sin registro", "Precios reales del tarifario", "Consejos seguros"]) + f'''
    <section class="section section--soft dx-section" aria-label="Doctor TechRevive" data-seccion="Doctor TechRevive">
      <div class="container">
        <div class="dx" id="dx" data-ia="{'1' if D['ia'] else '0'}">{tabs}
          <div class="dx-panel" data-panel="guiado">
            <ol class="dx-progress" aria-label="Progreso">
              <li class="is-on">Equipo</li><li>Síntoma</li><li>Preguntas</li><li>Resultado</li>
            </ol>
            <div class="dx-step" data-step="eq">
              <h2 class="dx-q">¿Qué equipo quieres revisar?</h2>
              <div class="dx-grid dx-grid--eq">{eq_html}</div>
            </div>
            <div class="dx-step" data-step="sx" hidden>
              <h2 class="dx-q">¿Qué está pasando?</h2>
              <p class="dx-help">Elige lo que más se parezca a tu problema.</p>
              <div class="dx-grid dx-grid--sx">{sx_html}</div>
              <button type="button" class="dx-back" data-back>{icon("arrow")} Atrás</button>
            </div>
            <div class="dx-step" data-step="q" hidden>
              <p class="dx-count"></p>
              <h2 class="dx-q" id="dx-qtext"></h2>
              <div class="dx-grid dx-grid--ans" id="dx-ans"></div>
              <button type="button" class="dx-back" data-back>{icon("arrow")} Atrás</button>
            </div>
          </div>{ia_panel}
          <div class="dx-result" id="dx-result" hidden tabindex="-1" aria-live="polite"></div>
        </div>
        <p class="dx-disclaimer">El Doctor TechRevive orienta, pero no reemplaza la revisión de un técnico. Los precios son de referencia según nuestro tarifario; el costo final se confirma con el diagnóstico. Los repuestos se cotizan aparte cuando el servicio dice «mano de obra».</p>
      </div>
    </section>
    {_json_script("dx-data", D)}
    <script src="js/diagnostico.js" defer></script>
'''
    jsonld = {"@context": "https://schema.org", "@type": "WebApplication", "name": "Doctor TechRevive",
              "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web", "inLanguage": "es",
              "description": "Diagnóstico gratuito en línea de fallas de computadoras y laptops, con precios de referencia.",
              "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GTQ"}, "url": SITE_URL + "/diagnostico"}
    page("diagnostico.html", "Doctor TechRevive: diagnóstico gratuito de tu computadora",
         "¿Tu computadora no enciende, está lenta o se calienta? Responde unas preguntas y conoce la causa probable, consejos seguros y el precio de la reparación.",
         body, jsonld=jsonld, section="Servicios")


def build_seguimiento():
    estados = [("recibido", "Recibido", "package"), ("diagnostico", "Diagnóstico", "search"), ("reparacion", "Reparación", "wrench"),
               ("pruebas", "Pruebas", "check"), ("listo", "Listo", "award")]
    pasos = "".join(f'<li class="trk-steps__item" data-st="{k}"><span class="trk-steps__dot">{icon(ic, "check")}</span><span>{t}</span></li>' for k, t, ic in estados)
    body = page_hero([("Servicios", "servicios.html"), ("Seguimiento de reparación", None)], "Seguimiento en línea",
                     hl("¿Cómo va", "tu reparación?"),
                     "Escribe el código de tu orden y los últimos 4 dígitos de tu teléfono para ver en qué etapa está tu equipo, sin tener que llamar.",
                     chips=["Actualizado por el técnico", "Disponible 24/7"]) + f'''
    <section class="section section--soft" aria-label="Consulta tu orden" data-seccion="Consulta de orden">
      <div class="container trk">
        <form class="trk-form" id="trk-form" novalidate>
          <div class="trk-form__row">
            <div class="trk-field">
              <label for="trk-c">Código de orden</label>
              <input id="trk-c" name="c" class="trk-input trk-input--code" placeholder="OT-7K2QD" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="9" required />
            </div>
            <div class="trk-field">
              <label for="trk-t">Últimos 4 dígitos de tu teléfono</label>
              <input id="trk-t" name="t" class="trk-input" inputmode="numeric" pattern="[0-9]{{4}}" maxlength="4" placeholder="1234" autocomplete="off" />
            </div>
            <button type="submit" class="btn btn--primary btn--lg">{icon("search")} Consultar</button>
          </div>
          <p class="trk-help">El código viene en tu comprobante o en el mensaje de WhatsApp que te enviamos al recibir tu equipo.</p>
          <p class="trk-status" role="status" aria-live="polite"></p>
        </form>
        <div class="trk-result" id="trk-result" hidden tabindex="-1">
          <ol class="trk-steps" aria-label="Etapas de la reparación">{pasos}</ol>
          <div class="trk-card" id="trk-card"></div>
        </div>
      </div>
    </section>
    <script src="js/seguimiento.js" defer></script>
'''
    page("seguimiento.html", "Seguimiento de tu reparación",
         "Consulta en línea el estado de la reparación de tu computadora con tu código de orden TechRevive.",
         body, section="Servicios")


def build_privacidad():
    correo = e(g(CFG, "contacto", "correo") or "")
    contacto = (f'escríbenos a <a href="mailto:{correo}">{correo}</a> o por WhatsApp' if correo and "tudominio" not in correo
                else 'escríbenos por <a href="contacto.html" data-wa>WhatsApp</a>')
    secciones = [
        ("Qué información recopilamos", [
            "<strong>Visitas al sitio:</strong> páginas que visitas, cuánto tiempo pasas en cada sección, desde qué página llegaste, tipo de dispositivo, sistema, navegador, idioma, tamaño de pantalla, tu dirección IP y una ubicación aproximada (país, región y ciudad) que se deduce de la conexión. También registramos clics en botones de contacto (WhatsApp, llamada, correo) para saber qué secciones son útiles.",
            "<strong>Formularios, cotizaciones y diagnósticos:</strong> los datos que escribes (nombre, teléfono, correo, servicio que te interesa, la descripción de tu problema y las respuestas del diagnóstico).",
            "<strong>Aula virtual:</strong> tu usuario, tu avance en las lecciones, las notas de tus evaluaciones y los certificados emitidos con tu nombre.",
            "<strong>Reparaciones:</strong> tu nombre, teléfono, el equipo y su estado, para darte seguimiento.",
        ]),
        ("Para qué la usamos", [
            "Responder tus solicitudes, preparar cotizaciones y darte seguimiento.",
            "Mejorar el sitio: saber qué páginas y secciones son útiles y cuáles no.",
            "Emitir y verificar certificados del aula virtual.",
            "Proteger el sitio contra abusos (por ejemplo, limitar intentos de contraseña).",
        ]),
        ("Lo que NO hacemos", [
            "No vendemos ni compartimos tu información con terceros para publicidad.",
            "No usamos servicios de rastreo publicitario (como píxeles de redes sociales) en este sitio.",
        ]),
        ("Dónde se guarda y por cuánto tiempo", [
            "La información se guarda en la infraestructura de Cloudflare, que aloja este sitio.",
            "Las visitas se borran automáticamente después de 400 días. Las solicitudes, reparaciones y certificados se conservan mientras sean necesarios para darte servicio o verificar un certificado.",
            "Si usas el asistente con inteligencia artificial del Doctor TechRevive, tu descripción se procesa en Cloudflare Workers AI para generar la respuesta y no la guardamos.",
        ]),
        ("Cookies y almacenamiento local", [
            "Usamos cookies solo para mantener abiertas las sesiones del panel de administración y del aula virtual.",
            "Guardamos en tu navegador un código anónimo de visitante y tu avance en el aula, para que no se pierda.",
        ]),
        ("Tus derechos", [
            f"Puedes pedirnos ver, corregir o borrar tus datos: {contacto}.",
        ]),
    ]
    html_secs = "".join(
        f'<h2>{e(t)}</h2><ul>' + "".join(f"<li>{x}</li>" for x in items) + "</ul>" for t, items in secciones)
    body = page_hero([("Aviso de privacidad", None)], "Transparencia", hl("Aviso de", "privacidad"),
                     "Qué datos recopilamos, para qué los usamos y cómo puedes pedir que los borremos.") + f'''
    <section class="section" aria-label="Aviso de privacidad">
      <div class="container legal">
        <p class="legal__date">Última actualización: {fecha_larga("2026-10-21")}</p>
        {html_secs}
      </div>
    </section>
'''
    page("privacidad.html", "Aviso de privacidad", "Cómo TechRevive recopila, usa y protege tu información.", body, section="Contacto")


def build_offline():
    doc = f'''<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sin conexión | TechRevive</title><meta name="robots" content="noindex" /><meta name="theme-color" content="#071233" />
<style>
  body{{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  background:radial-gradient(80% 60% at 80% 0%,rgba(56,189,248,.18),transparent 60%),linear-gradient(160deg,#040A1C,#0B1C4A);color:#E2E8F0;text-align:center;padding:24px}}
  img{{width:72px;height:72px}} h1{{font-size:1.6rem;margin:16px 0 8px;color:#fff}} p{{max-width:420px;line-height:1.6;color:#94A3B8}}
  button{{margin-top:18px;border:0;border-radius:12px;padding:12px 22px;font-weight:700;font-size:1rem;color:#fff;background:linear-gradient(135deg,#3B82F6,#2563EB);cursor:pointer}}
</style></head>
<body><main><img src="/img/logo-icono.png" alt="TechRevive" /><h1>Estás sin conexión</h1>
<p>Parece que no hay internet en este momento. Revisa tu WiFi o tus datos y vuelve a intentarlo.</p>
<button onclick="location.reload()">Reintentar</button></main></body></html>
'''
    with open(os.path.join(OUT, "offline.html"), "w", encoding="utf-8") as f:
        f.write(doc)


def promo_home():
    """Bloque de la portada que presenta el Doctor TechRevive y el seguimiento de reparaciones."""
    top = [s for s in SINTOMAS if s["id"] in ("no-enciende", "lenta", "calor", "errores", "virus", "liquido")]
    chips = "".join(f'<a class="dx-promo__chip" href="diagnostico.html?s={e(s["id"])}">{icon(s["i"], "wrench")}<span>{e(s["t"])}</span></a>' for s in top)
    return f'''
    <section class="section section--dark dx-promo" aria-labelledby="dx-promo-title" data-seccion="Doctor TechRevive">
      <div class="container dx-promo__inner">
        <div class="dx-promo__text reveal">
          <p class="eyebrow eyebrow--dark">Nuevo · Gratis</p>
          <h2 id="dx-promo-title">¿Tu computadora falla? {hl("Te decimos qué tiene", "en 1 minuto.")}</h2>
          <p class="dx-promo__lead">El <strong>Doctor TechRevive</strong> te hace unas preguntas sencillas y te muestra la causa más probable, qué puedes intentar en casa sin riesgo y cuánto costaría la reparación según nuestro tarifario.</p>
          <div class="dx-promo__btns">
            <a href="diagnostico.html" class="btn btn--primary btn--lg">{icon("search")} Empezar diagnóstico</a>
            <a href="seguimiento.html" class="btn btn--ghost-light btn--lg">{icon("clipboard")} Consultar mi reparación</a>
          </div>
        </div>
        <div class="dx-promo__card reveal" style="--d:1">
          <p class="dx-promo__label">¿Qué le pasa a tu equipo?</p>
          <div class="dx-promo__chips">{chips}</div>
          <a class="dx-promo__more" href="diagnostico.html">Ver los {len(SINTOMAS)} problemas más comunes {icon("arrow")}</a>
        </div>
      </div>
    </section>
'''


def escribir_catalogo_ia():
    os.makedirs(os.path.join(OUT, "data"), exist_ok=True)
    with open(os.path.join(OUT, "data", "servicios-ia.json"), "w", encoding="utf-8") as f:
        json.dump({"moneda": MON, "servicios": CAT}, f, ensure_ascii=False)


def build_all():
    build_diagnostico()
    build_seguimiento()
    build_privacidad()
    build_offline()
    escribir_catalogo_ia()
