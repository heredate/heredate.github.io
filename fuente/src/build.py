# Construye Cauce: une interfaz, lógica, motor y catálogo de trámites.
# Uso (desde la raíz del repositorio): python3 src/build.py
# Salidas: app/index.html (la aplicación), index.html se escribe aparte (página de presentación), dist/cauce-app-claude.html (versión para Claude).
import re, pathlib, datetime, json, shutil
root = pathlib.Path(__file__).resolve().parent.parent
# ── Marca: cambiar aquí el nombre y el lema actualiza toda la app, la web y el manifiesto
MARCA = "Hereda+"
LEMA = "Software de sucesiones para despachos de abogados."
APP_CLAUDE = "https://claude.ai/artifact/JWLSBt2qQZ4YWYkt2Z3yub"  # versión de la app dentro de Claude
def _ff(fam, archivo, peso, estilo="normal"): return '@font-face{font-family:"%s";font-style:%s;font-weight:%s;font-display:swap;src:url(/fonts/%s.woff2) format("woff2")}' % (fam, estilo, peso, archivo)
FUENTES_WEB = None  # página de presentación: la misma letra que la app y el vídeo (se define tras FUENTES_APP)
FUENTES_CLAUDE = ""
# ── Tipografía de la app (autoalojada, licencia SIL OFL 1.1; ver fonts/OFL-*.txt): Inter para la interfaz y Source Serif 4 para
# los títulos. Variables (peso y tamaño óptico), subconjunto latino (español, €, comillas y rayas), WOFF2 y font-display:swap:
# el texto se pinta al momento con la fuente de respaldo (ajustada a las métricas de Inter para que no salte) y cambia al llegar.
_FUENTES = (("Hereda Sans", "inter-var-latin", "400 700"), ("Hereda Serif", "source-serif-4-var-latin", "450 650"))
_RESPALDO = ('@font-face{font-family:"Hereda Sans Fallback";src:local("Arial"),local("Helvetica Neue"),local("Segoe UI");ascent-override:90.2%;descent-override:22.48%;line-gap-override:0%;size-adjust:107.4%}'
             '@font-face{font-family:"Hereda Serif Fallback";src:local("Georgia"),local("Times New Roman");ascent-override:96%;descent-override:31%;line-gap-override:0%;size-adjust:99%}')
def _fuentes_css(url):
    return "<style>" + "".join('@font-face{font-family:"%s";font-style:normal;font-weight:%s;font-display:swap;src:url(%s) format("woff2")}' % (fam, peso, url(arch)) for fam, arch, peso in _FUENTES) + _RESPALDO + "</style>"
FUENTES_APP = "".join('<link rel="preload" href="/fonts/%s.woff2" as="font" type="font/woff2" crossorigin>' % a for _, a, _ in _FUENTES) + _fuentes_css(lambda a: "/fonts/%s.woff2" % a)
FUENTES_WEB = FUENTES_APP  # landing: Inter y Source Serif 4 precargadas (124 KB), con respaldo ajustado a sus métricas para que el texto no salte
import base64 as _b64
FUENTES_INCRUSTADAS = _fuentes_css(lambda a: "data:font/woff2;base64," + _b64.b64encode((root / "fonts" / (a + ".woff2")).read_bytes()).decode())  # archivo único y versión para Claude: sin peticiones
import subprocess
_gen = subprocess.run(["node", str(root / "tools/generar-ordenanzas.mjs")], capture_output=True, text=True)
if _gen.returncode != 0: raise SystemExit("Ordenanzas declarativas con errores: no se construye.\n" + _gen.stdout + _gen.stderr)
_tests = subprocess.run(["node", str(root / "src/test.mjs")], capture_output=True, text=True).stdout
PRUEBAS = re.search(r"(\d+) correctas", _tests).group(1) if re.search(r"(\d+) correctas", _tests) else "100"
if " 0 fallidas" not in _tests: raise SystemExit("Hay pruebas fallidas: no se construye.\n" + _tests)
_tl = subprocess.run(["node", str(root / "src/test-lector.mjs")], capture_output=True, text=True)
if _tl.returncode != 0: raise SystemExit("Pruebas del lector de documentos fallidas: no se construye.\n" + _tl.stdout + _tl.stderr)
# Cifras de pruebas para la web pública (con punto de millar, como el resto de cifras de la landing)
_mil = lambda n: f"{int(n):,}".replace(",", ".")
PRUEBAS_LECTOR = (re.search(r"lector: (\d+) pruebas correctas", _tl.stdout) or [None, "0"])[1]
PRUEBAS_WEB = {"{{PRUEBAS_MOTOR}}": _mil(PRUEBAS), "{{PRUEBAS_LECTOR}}": _mil(PRUEBAS_LECTOR), "{{PRUEBAS_TOTAL}}": _mil(int(PRUEBAS) + int(PRUEBAS_LECTOR))}
TRAMITES = subprocess.run(["node", "-e", "import('" + (root / "src/tramites.mjs").as_uri() + "').then(m=>console.log(m.TR_TOTAL))"], capture_output=True, text=True).stdout.strip()
ORDEN_N = subprocess.run(["node", "-e", "import('" + (root / "src/motor.mjs").as_uri() + "').then(m=>console.log(Object.keys(m.ORDENANZAS).length-1))"], capture_output=True, text=True).stdout.strip() or "70"
# ── Datos del titular (src/empresa.json, único sitio). El IBAN y el titular de la cuenta nunca se publican.
_emp = json.loads((root / "src/empresa.json").read_text()) if (root / "src/empresa.json").exists() else {}
_E = lambda k: str(_emp.get(k) or "").strip()
_MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
def _fecha_larga(iso):
    try: a, m, d = iso.split("-"); return f"{int(d)} de {_MESES[int(m) - 1]} de {a}"
    except Exception: return ""
FALTAN = [n for k, n in (("titular", "titular (nombre y apellidos o razón social)"), ("nif", "NIF"), ("domicilio", "domicilio"), ("email", "correo de contacto")) if not _E(k)]
_SUST = {"[RAZÓN SOCIAL]": _E("titular"), "[NOMBRE O RAZÓN SOCIAL]": _E("titular"), "[NIF]": _E("nif"), "[DOMICILIO]": _E("domicilio"), "[EMAIL DE CONTACTO]": _E("email"),
         "[TELÉFONO]": _E("telefono"), "[TELÉFONO — opcional]": _E("telefono"), "[FECHA DE PUBLICACIÓN]": _fecha_larga(_E("fecha_legal")),
         "[PROVEEDOR DE CORREO ELECTRÓNICO]": _E("correo_proveedor"), "[PROGRAMA DE FACTURACIÓN]": _E("facturacion"), "[ENTIDAD BANCARIA]": _E("banco"), "[ASESORÍA FISCAL Y CONTABLE]": _E("asesoria")}
def titular(t):
    """Pone los datos del titular en las páginas públicas. Lo que falta se queda como marcador visible (y build.py avisa)."""
    # Filas opcionales: sin teléfono ni datos registrales (persona física), la fila se quita; sin asesoría, también
    if not _E("telefono"): t = re.sub(r'\s*<dt>Teléfono</dt><dd><span class="ph">\[TELÉFONO[^]]*\]</span></dd>', "", t)
    if not _E("registro"): t = re.sub(r'\s*<dt>(Datos registrales|Inscripción registral)</dt><dd><span class="ph">\[DATOS REGISTRALES[^<]*</span></dd>', "", t)
    else: t = re.sub(r'<span class="ph">\[DATOS REGISTRALES[^<]*</span>', _E("registro"), t)
    if not _E("asesoria"): t = re.sub(r"<!--ASESORIA-->.*?<!--/ASESORIA-->", "", t, flags=re.S)
    t = t.replace("<!--ASESORIA-->", "").replace("<!--/ASESORIA-->", "")
    # Ubicación de cada proveedor de la tabla de destinatarios de la privacidad
    t = t.replace('<span class="ph">[PROVEEDOR DE CORREO ELECTRÓNICO]</span></td><td>Correo electrónico</td><td><span class="ph">[UBICACIÓN]</span>', '<span class="ph">[PROVEEDOR DE CORREO ELECTRÓNICO]</span></td><td>Correo electrónico</td><td>' + (_E("correo_ubicacion") or '<span class="ph">[UBICACIÓN]</span>'))
    t = t.replace('<span class="ph">[PROGRAMA DE FACTURACIÓN]</span></td><td>Emisión y archivo de facturas</td><td><span class="ph">[UBICACIÓN]</span>', '<span class="ph">[PROGRAMA DE FACTURACIÓN]</span></td><td>Emisión y archivo de facturas</td><td>' + (_E("facturacion_ubicacion") or '<span class="ph">[UBICACIÓN]</span>'))
    if _E("hosting"): t = t.replace("GitHub, Inc.</td><td>Alojamiento", _E("hosting") + "</td><td>Alojamiento")
    for k, v in _SUST.items():
        if not v: continue
        t = t.replace(f'<span class="ph">{k}</span>', html_esc(v)).replace(k, html_esc(v))
    return t
def html_esc(v): return v.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
HEREDA_SOPORTE = "const HEREDA_SOPORTE = " + json.dumps(_emp.get("soporte", {}) if isinstance(_emp.get("soporte"), dict) else {}, ensure_ascii=False) + ";"
def marca(t):
    for k, v in PRUEBAS_WEB.items(): t = t.replace(k, v)
    return t.replace("{{ORDENANZAS}}", ORDEN_N).replace("{{MARCA}}", MARCA).replace("{{LEMA}}", LEMA).replace("{{PRUEBAS}}", PRUEBAS).replace("{{TRAMITES}}", TRAMITES)
def modulo(nombre):
    t = (root / "src" / nombre).read_text()
    t = re.sub(r"^export\s+", "", t, flags=re.M)
    return marca(re.sub(r"^import .*$", "", t, flags=re.M))
shell = (root / "src/app/shell.html").read_text()
# Módulos de producto (despacho, auditoría, búsqueda global, tareas y acciones masivas): van antes de ui.js; sus estilos, tras pro.css
MODULOS_PRODUCTO = ("tareas.js", "fiscal.js", "auditoria.js", "socio.js", "buscar.js", "masivo.js", "red-motor.js", "red.js")  # red: despacho en red (carpeta compartida)
_enl = json.loads((root / "src/enlaces.json").read_text())["tramites"]
_jsv = lambda v: json.dumps(v, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
ENLACES = "const ENLACES = " + json.dumps(_enl, ensure_ascii=False, separators=(",", ":")) + ";"
_BIBLIO = json.loads((root / "src/biblioteca.json").read_text())
_fd = json.loads(subprocess.run(["node", "-e", "import('" + (root / "src/motor.mjs").as_uri() + "').then(m=>console.log(JSON.stringify({t:m.TERRITORIOS.filter(([k])=>k!=='EST'),m:Object.entries(m.ORDENANZAS).filter(([k])=>k!=='OTRO').map(([,o])=>o.nombre).sort((a,b)=>a.localeCompare(b,'es'))})))"], capture_output=True, text=True).stdout)
FAMILIA = marca((root / "src/familia.html").read_text()).replace("/*__FAM_DATA__*/", "const TERR = " + json.dumps(_fd["t"], ensure_ascii=False) + ";\nconst MUNIS = /*__MUNIS__*/[];")
_mu = json.loads((root / "src/municipios.json").read_text())
MUNI_CLAVES_JS = "const MUNI_CLAVES = " + json.dumps(json.loads((root / "src/municipios-claves.json").read_text()), separators=(",", ":")) + ";"
MUNI_JS = "const MUNI_ES = " + json.dumps({"provincias": _mu["provincias"], "m": _mu["m"], "n": len(_mu["m"])}, ensure_ascii=False, separators=(",", ":")) + ";\n" + MUNI_CLAVES_JS
# Calculadora de herencias para la web de los despachos (src/calculadora.html): lleva dentro el motor; los municipios se añaden al publicarla o al descargarla desde la app
MOTOR_JS = modulo("festivos.mjs") + "\n" + modulo("motor.mjs")  # festivos.mjs (G09): calendario de inhábiles que usa el motor
CALCULADORA = titular(marca((root / "src/calculadora.html").read_text())).replace("/*__MOTOR__*/", MOTOR_JS, 1)
_mc = {}
for _i, _n in _mu["m"]: _mc.setdefault(_i[:2], []).append(_n)
CALC_MUNIS = json.dumps({k: [p["n"], p["ccaa"], "|".join(_mc.get(k, []))] for k, p in sorted(_mu["provincias"].items())}, ensure_ascii=False, separators=(",", ":"))
# ── Rendimiento móvil: en la app publicada (app/index.html) lo que no hace falta para arrancar va en app/partes/*.js y se carga bajo demanda
# (src/app/partes.js); el archivo único (dist/Hereda-piloto.html) y la versión para Claude lo llevan todo dentro, como siempre.
version = datetime.datetime.utcnow().strftime("%Y%m%d%H%M")
_MAPAS = (root / "src/mapas.js").read_text()
PARTES = {
    "municipios": "MUNI_ES.m = " + _jsv(_mu["m"]) + ";",
    "biblioteca": "BIBLIO = " + _jsv(_BIBLIO) + ";",
    "mapas": _MAPAS.replace("\nconst MAPA_ES = ", "\nMAPA_ES = ", 1).replace("\nconst MAPA_AND = ", "\nMAPA_AND = ", 1),
    "carpeta": "CARPETA_HTML = " + _jsv(marca((root / "src/carpeta.html").read_text())) + ";",
    "familia": "FAMILIA_HTML = " + _jsv(FAMILIA) + ";",
    "calculadora": "CALCULADORA_HTML = " + _jsv(CALCULADORA) + ";",
}
assert "const MAPA_" not in PARTES["mapas"], "mapas.js ha cambiado de forma: revisa PARTES en build.py"
PARTES_URL = {k: "partes/%s.js?v=%s" % (k, version) for k in PARTES}
NUCLEO_URL = ["nucleo/%s.js?v=%s" % (k, version) for k in ("motor", "app")]  # los dos scripts grandes, aparte y con defer: el HTML pinta antes
DATOS_COMPLETO = ENLACES + "\nlet BIBLIO = " + _jsv(_BIBLIO) + ";\n" + MUNI_JS + "\n" + _MAPAS.replace("\nconst MAPA_ES = ", "\nlet MAPA_ES = ", 1).replace("\nconst MAPA_AND = ", "\nlet MAPA_AND = ", 1)
DATOS_LIGERO = ("const HEREDA_PARTES = " + json.dumps({"archivos": PARTES_URL, "nucleo": NUCLEO_URL}) + ";\n" + ENLACES + '\nlet BIBLIO = { estatal: [], autonomica: {}, municipal: {}, actualizado: "", pendiente: true };\n'
                + "const MUNI_ES = " + json.dumps({"provincias": _mu["provincias"], "m": [], "n": len(_mu["m"])}, ensure_ascii=False, separators=(",", ":")) + ";\n" + MUNI_CLAVES_JS + "\nlet MAPA_ES = null, MAPA_AND = null;")
FAMILIA_COMPLETO = "let FAMILIA_HTML = " + _jsv(FAMILIA) + ";\nlet CALCULADORA_HTML = " + _jsv(CALCULADORA) + ";\nlet CARPETA_HTML = " + _jsv(marca((root / "src/carpeta.html").read_text())) + ";"
FAMILIA_LIGERO = "let FAMILIA_HTML = null, CALCULADORA_HTML = null, CARPETA_HTML = null;"
shell = (shell.replace("/*__MOTOR__*/", MOTOR_JS)
              .replace("/*__TRAMITES__*/", modulo("tramites.mjs") + "\n/*__DATOS__*/")
              .replace("/*__LOGIC__*/", marca((root / "src/app/logic.js").read_text()))
              .replace("/*__FAMILIA__*/", "/*__DATOS_FAMILIA__*/")
              .replace("/*__UI__*/", HEREDA_SOPORTE + "\n" + "\n".join(marca((root / "src/app" / f).read_text()) for f in ("partes.js", "visual.js", "estrategia.js", "archivo.js", "despacho.js", "normativa.js", "compartir.js", "calculo.js", "particion.js", "regimen.js", "muni.js", "pdf.js", "informe.js", "licencia.js", "diagnostico.js", "legitimas.js", "foral.js", "segunda.js", "reunion.js", "paleta.js", "motion.js", "acceso.js", "radar.js", "terceros.js", "firma.js", "modelos.js", "escritos.js", "tiempos.js", "bienvenida.js", "demo.js", "widget.js", "seguridad.js", "ayuda.js", "guia.js", "lector.js", *sorted(p.name for p in (root / "src/app").glob("lector-*.js")), "escaner.js", *MODULOS_PRODUCTO, "robustez.js", "ui.js"))))
shell = shell.replace("/*__PRO_CSS__*/", (root / "src/app/pro.css").read_text() + "\n" + ((root / "src/app/producto.css").read_text() if (root / "src/app/producto.css").exists() else "") + "\n" + ((root / "src/app/escaner.css").read_text() if (root / "src/app/escaner.css").exists() else ""))  # escaner.css: escáner con la cámara
# Capa visual «cine» (src/app/cine.css y, si existe, src/app/cine.js): va justo después de la hoja de estilos principal y antes de
# <div id="app">, en su propio <style id="hereda-cine"> (y <script id="hereda-cine-js">), para poder quitarla o cambiarla sin tocar el resto
_cine_css, _cine_js = root / "src/app/cine.css", root / "src/app/cine.js"
CINE = (('<style id="hereda-cine">\n' + _cine_css.read_text() + "</style>\n") if _cine_css.exists() else "") + (('<script id="hereda-cine-js">\n' + _cine_js.read_text() + "</script>\n") if _cine_js.exists() else "")
assert "<!--CINE-->\n" in shell, "shell.html ha perdido el marcador <!--CINE-->"
shell = shell.replace("<!--CINE-->\n", CINE, 1)
shell = marca(shell)
# Dos variantes: completa (archivo único y Claude) y ligera (app publicada, con las partes aparte)
shell_ligero = shell.replace("/*__DATOS__*/", marca(DATOS_LIGERO), 1).replace("/*__DATOS_FAMILIA__*/", FAMILIA_LIGERO, 1)
# Los dos scripts grandes (motor y trámites; lógica e interfaz) salen a app/nucleo/*.js con defer: el esqueleto de carga se pinta sin esperar
# a que lleguen, y se ejecutan en el mismo orden al terminar de leer el HTML. El primero, pequeño (tema), sigue dentro.
NUCLEO = {}
_grandes = [m for m in re.finditer(r"<script>(.*?)</script>", shell_ligero, re.S) if len(m.group(1)) > 100000]
assert len(_grandes) == 2, "Se esperaban dos scripts grandes en la app"
# Rendimiento móvil (r4): no se piden con <script defer> (el escáner previo del navegador los descargaría a la vez que el HTML, las fuentes y
# el primer pintado, y en 4G lenta compiten por el ancho de banda); un cargador mínimo los pide justo después del primer pintado, en orden
# (async=false) y una sola vez. En la copia íntegra («Enviar a un compañero») van dentro y el cargador no hace nada.
_CARGADOR = ('<script data-nucleo-cargador>(function () { var hecho = false; function cargar() { if (hecho) return; hecho = true; if (typeof HTML_ORIGINAL !== "undefined") return; '
             + '[%s].forEach(function (n) { var s = document.createElement("script"); s.src = n[1]; s.async = false; s.setAttribute("data-nucleo", n[0]); document.body.appendChild(s); }); } '
             'if (window.requestAnimationFrame) requestAnimationFrame(function () { setTimeout(cargar, 0); }); setTimeout(cargar, 300); })();</script>')
for _k, _m in reversed(list(zip(("motor", "app"), _grandes))):
    NUCLEO[_k] = _m.group(1)
    _sust = (_CARGADOR % ", ".join('["%s", "nucleo/%s.js?v=%s"]' % (k, k, version) for k in ("motor", "app"))) if _k == "motor" else ""
    shell_ligero = shell_ligero[:_m.start()] + _sust + shell_ligero[_m.end():]
shell = shell.replace("/*__DATOS__*/", marca(DATOS_COMPLETO), 1).replace("/*__DATOS_FAMILIA__*/", FAMILIA_COMPLETO, 1)
# K6: el <title> va en <head> (el shell lo trae al principio; en el archivo para Claude se queda donde está)
TITULO = (re.search(r"<title>.*?</title>", shell) or [""])[0]
_sin_titulo = lambda t: t.replace(TITULO + ("\n" if TITULO + "\n" in t else ""), "", 1) if TITULO else t
shell_cuerpo = _sin_titulo(shell)
shell_ligero = _sin_titulo(shell_ligero)
head = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="hereda-version" content="{version}">
<meta name="description" content="{MARCA}: software de sucesiones para despachos de abogados.">
<meta name="theme-color" content="#F4F2EC">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="{MARCA}">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" type="image/svg+xml" href="/icons/hereda-marca.svg">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
{TITULO}
</head>
<body>
"""
tail = f"""
<script>
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js?v={version}").catch(() => {{}}));
</script>
</body>
</html>
"""
(root / "app").mkdir(exist_ok=True)
(root / "app/index.html").write_text(head + shell_ligero.replace('<meta charset="utf-8">\n', "", 1).replace("<!--FONTS-->", FUENTES_APP) + tail)
shutil.rmtree(root / "app/partes", ignore_errors=True); (root / "app/partes").mkdir()
for _k, _t in PARTES.items(): (root / "app/partes" / (_k + ".js")).write_text(_t)
shutil.rmtree(root / "app/nucleo", ignore_errors=True); (root / "app/nucleo").mkdir()
for _k, _t in NUCLEO.items(): (root / "app/nucleo" / (_k + ".js")).write_text(_t)
# Minificado prudente (tools/minificar.mjs: sin comentarios ni sangrías, mismos tokens) del núcleo, lo que se descarga y se compila al
# arrancar. Las partes (datos que se cargan después) se dejan como están
_min = subprocess.run(["node", str(root / "tools/minificar.mjs")] + [str(p) for p in sorted((root / "app/nucleo").glob("*.js"))], capture_output=True, text=True)
print((_min.stdout + _min.stderr).strip())
(root / "dist").mkdir(exist_ok=True)
(root / "dist/app-claude.html").write_text(shell.replace("<!--FONTS-->", FUENTES_INCRUSTADAS))

# Piloto en un solo archivo: se abre con doble clic, sin instalar nada ni conexión (datos en el navegador de ese equipo)
import base64
_fav = base64.b64encode((root / "favicon.png").read_bytes()).decode()
piloto = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" type="image/png" href="data:image/png;base64,{_fav}">
{TITULO}
</head>
<body>
""" + shell_cuerpo.replace('<meta charset="utf-8">\n', "", 1).replace("<!--FONTS-->", FUENTES_INCRUSTADAS) + "\n</body>\n</html>\n"
(root / "dist/Hereda-piloto.html").write_text(piloto)
import shutil
# Carpeta lista para publicar en Netlify (arrastrar la carpeta) o en cualquier servidor. Solo lo que se sirve al público.
pub = root / "dist/publicar"
shutil.rmtree(pub, ignore_errors=True); pub.mkdir(parents=True)
for f in ("manifest.webmanifest", "favicon.png"): shutil.copy(root / f, pub / f)
(pub / "sw.js").write_text((root / "sw.js").read_text().replace("__BUILD__", version).replace("const PARTES = [];", "const PARTES = " + json.dumps(["/app/" + u for u in list(PARTES_URL.values()) + NUCLEO_URL]) + ";", 1))
for d in ("icons", "img", "lib", "fonts", "video"):  # video: demostración de la portada (MP4, WebM y pósteres; tools/video/)
    if (root / d).exists(): shutil.copytree(root / d, pub / d)  # fonts: tipografía de la app (OFL)  # lib: pdf.js y tesseract.js para la lectura de documentos (en local, sin servidor externo)
(pub / "app").mkdir()
_munis_json = json.dumps([f"{n} ({_mu['provincias'][i[:2]]['n']})" for i, n in _mu["m"]], ensure_ascii=False, separators=(",", ":"))
FAMILIA_PUB = FAMILIA.replace("/*__MUNIS__*/[]", _munis_json)
(pub / "familia").mkdir(); (pub / "familia/index.html").write_text(FAMILIA_PUB)
(root / "familia").mkdir(exist_ok=True); (root / "familia/index.html").write_text(FAMILIA_PUB)
CALC_PUB = CALCULADORA.replace("/*__MUNIS__*/{}", CALC_MUNIS, 1)
(pub / "calculadora").mkdir(); (pub / "calculadora/index.html").write_text(CALC_PUB)
(root / "calculadora").mkdir(exist_ok=True); (root / "calculadora/index.html").write_text(CALC_PUB)
for _lg in sorted((root / "src/legal").glob("*.html")):
    _t = titular(marca(_lg.read_text())).replace("<!--FONTS-->", FUENTES_WEB); (pub / _lg.name).write_text(_t); (root / _lg.name).write_text(_t)
(pub / "_headers").write_text("/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Permissions-Policy: camera=(self), microphone=(), geolocation=()\n/sw.js\n  Cache-Control: no-cache\n")
# Página de presentación y manifiesto
landing = (root / "src/landing.html")
if landing.exists():
    L = titular(marca(landing.read_text()))
    (root / "index.html").write_text(L.replace("<!--FONTS-->", FUENTES_WEB))
    (pub / "index.html").write_text(L.replace("<!--FONTS-->", FUENTES_WEB))
    (root / "dist/web-claude.html").write_text(L.replace("<!--FONTS-->", FUENTES_CLAUDE).replace('href="/app/"', 'href="' + APP_CLAUDE + '" target="_blank" rel="noopener"'))
man = {"name": MARCA, "short_name": MARCA, "description": LEMA, "lang": "es-ES", "start_url": "/app/", "scope": "/", "display": "standalone", "orientation": "portrait-primary", "background_color": "#F4F2EC", "theme_color": "#F4F2EC",
       "icons": [{"src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png"}, {"src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
(root / "manifest.webmanifest").write_text(json.dumps(man, ensure_ascii=False, indent=1))
shutil.copy(root / "manifest.webmanifest", pub / "manifest.webmanifest"); shutil.copy(root / "app/index.html", pub / "app/index.html"); shutil.copytree(root / "app/partes", pub / "app/partes"); shutil.copytree(root / "app/nucleo", pub / "app/nucleo")
# ── Variante para GitHub Pages (la web cuelga de https://<usuario>.github.io/<repositorio>/): las rutas absolutas llevan ese prefijo.
# empresa.json: "web_github_base": "" (sitio heredate.github.io) o "/Repositorio". Carpeta: dist/publicar-gh (misma web; solo cambian las rutas). Netlify sigue usando dist/publicar.
_GHB = (_E("web_github_base") or "").rstrip("/")
if True:  # dist/publicar-gh se genera siempre; con base vacía (sitio <usuario>.github.io) es la misma web que dist/publicar más .nojekyll
    def _con_base(txt, es_sw=False):
        for a in ("href", "src", "action"):
            txt = re.sub(r'(%s=")/(?!/)' % a, r"\1%s/" % _GHB, txt)
        txt = txt.replace('register("/sw.js', 'register("%s/sw.js' % _GHB).replace("url(/fonts/", "url(%s/fonts/" % _GHB)
        if es_sw:
            txt = txt.replace('const ESENCIAL = ["/app/"];', 'const ESENCIAL = ["%s/app/"];' % _GHB)
            txt = txt.replace('const OPCIONAL = ["/", "/manifest.webmanifest", "/favicon.png", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/fonts/inter-var-latin.woff2", "/fonts/source-serif-4-var-latin.woff2"];',
                              'const OPCIONAL = [%s];' % ", ".join('"%s%s"' % (_GHB, u) for u in ("/", "/manifest.webmanifest", "/favicon.png", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/fonts/inter-var-latin.woff2", "/fonts/source-serif-4-var-latin.woff2")))
            txt = txt.replace('u.pathname === "/sw.js"', 'u.pathname === "%s/sw.js"' % _GHB).replace('"/app/partes/', '"%s/app/partes/' % _GHB).replace('"/app/nucleo/', '"%s/app/nucleo/' % _GHB)
        return txt
    ghp = root / "dist/publicar-gh"
    shutil.rmtree(ghp, ignore_errors=True); shutil.copytree(pub, ghp)
    for _f in list(ghp.rglob("*.html")) + [ghp / "sw.js"]:
        _f.write_text(_con_base(_f.read_text(), _f.name == "sw.js"))
    _m = json.loads((ghp / "manifest.webmanifest").read_text())
    _m["start_url"] = _GHB + "/app/"; _m["scope"] = _GHB + "/"
    for _ic in _m["icons"]: _ic["src"] = _GHB + _ic["src"]
    (ghp / "manifest.webmanifest").write_text(json.dumps(_m, ensure_ascii=False, indent=1))
    (ghp / ".nojekyll").write_text("")
    (ghp / "_headers").unlink(missing_ok=True)
    # Sin cabeceras del servidor: la etiqueta robots ya va en cada página (noindex)
# Comprobación de sintaxis de cada bloque de script: si algo se rompe, no se publica
import tempfile
for _i, _sc in enumerate(re.findall(r"<script>(.*?)</script>", (root / "app/index.html").read_text(), re.S)):
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as _f: _f.write(_sc)
    _r = subprocess.run(["node", "--check", _f.name], capture_output=True, text=True)
    if _r.returncode: raise SystemExit("Error de sintaxis en el script %d:\n%s" % (_i, _r.stderr[:1500]))
if _cine_js.exists():  # capa cine: su script también se comprueba
    _r = subprocess.run(["node", "--check", str(_cine_js)], capture_output=True, text=True)
    if _r.returncode: raise SystemExit("Error de sintaxis en src/app/cine.js:\n" + _r.stderr[:1500])
for _k in list(PARTES) + ["../nucleo/motor", "../nucleo/app"]:  # partes que se cargan aparte y núcleo
    _r = subprocess.run(["node", "--check", str(root / "app/partes" / (_k + ".js"))], capture_output=True, text=True)
    if _r.returncode: raise SystemExit("Error de sintaxis en la parte %s:\n%s" % (_k, _r.stderr[:1500]))
for _i, _sc in enumerate(re.findall(r"<script>(.*?)</script>", CALC_PUB, re.S)):
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as _f: _f.write(_sc)
    _r = subprocess.run(["node", "--check", _f.name], capture_output=True, text=True)
    if _r.returncode: raise SystemExit("Error de sintaxis en la calculadora (script %d):\n%s" % (_i, _r.stderr[:1500]))
# ── Control de la web pública: ningún marcador «[MAYÚSCULAS]» visible, y el IBAN nunca publicado
_iban = re.sub(r"\s", "", _E("iban"))
_marcadores = {}
for _f in sorted(pub.rglob("*.html")):
    _txt = _f.read_text()
    if _iban and _iban in re.sub(r"\s", "", _txt): raise SystemExit(f"El IBAN aparece en {_f.relative_to(root)}: no se publica.")
    if _f.parent.name == "app": continue  # la app lleva marcadores de escritos ([NIF], [domicilio]) que rellena el abogado
    _vis = re.sub(r"<script.*?</script>|<style.*?</style>|<!--.*?-->", "", _txt, flags=re.S)
    for _m in re.findall(r"\[[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 .,…—–/º-]{2,}[^\]\[]{0,80}\]", _vis): _marcadores.setdefault(_m, set()).add(str(_f.relative_to(pub)))
if FALTAN or _marcadores:
    print("\n" + "!" * 72 + "\nAVISO · FALTAN DATOS DEL TITULAR: " + (", ".join(FALTAN) or "—") + ".\nRellena src/empresa.json (lo exige el art. 10 LSSI también a una persona física) y vuelve a construir.")
    for _m, _fs in sorted(_marcadores.items()): print(f"  · {_m}  →  {', '.join(sorted(_fs))}")
    print("!" * 72 + "\n")
print("app/index.html listo ·", len(head + shell_ligero + tail) // 1024, "KB (partes aparte: " + str(sum(len(t) for t in PARTES.values()) // 1024) + " KB) · archivo único", len(piloto) // 1024, "KB · versión", version)
