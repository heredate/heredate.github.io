# Ronda 4 · web, vídeo y kit comercial (agente `web`)

Rama `r4-web`. Qué se ha hecho, cómo se rehace y qué queda abierto.

## 1. Vídeo de demostración

**Archivos (en `video/`, build.py los copia a `dist/publicar` y `dist/publicar-gh`):**

| Archivo | Qué es |
|---|---|
| `hereda-demo.mp4` | 1920 x 1080, H.264 High, 30 fps, sin audio, ~94 s, «faststart» (empieza a verse antes de bajarlo entero) |
| `hereda-demo.webm` | El mismo en VP9 (más ligero; los navegadores que lo admiten lo prefieren) |
| `hereda-demo-poster.jpg`, `-1600.webp`, `-960.webp` | Póster: el expediente del caso 1 recién creado, sin cursor ni rótulos |
| `hereda-demo-vertical.mp4` | 1080 x 1920, 30 s, para LinkedIn y WhatsApp: seis escenas recortadas con el texto en grande arriba |
| `hereda-demo-vertical-poster.jpg` | Su póster |

**Guion (todo con la app real, datos ficticios):** tarjeta de título → despacho de demostración → «Desde documentos» → se arrastran los 26 documentos del caso 1 (`tools/ejemplos`) con un evento *drop* real → lectura (se ven unos segundos; el resto de la espera del OCR no se graba y hay un fundido) → 26 documentos reconocidos → propuestas con su documento de origen → «Cargar lo marcado» → expediente calculado (caudal 206.742 €, plusvalía 3.071 €) → Impuestos paso a paso → Mi día → cifras del 650 por heredero → informe de cálculo en PDF (el mismo PDF que descarga la app, abierto con el pdf.js local) → tarjeta de cierre «Probar 30 días».

Once rótulos en español, dentro de la página, con los tokens de la marca (tinta #18191C, Inter). Cursor dibujado con trayectoria curva y pulsación visible; los clics son clics reales de Playwright en ese punto.

**Cómo se rehace:**
```
python3 src/build.py && python3 -m http.server 8807 &
node tools/ejemplos/generar.mjs
node tools/video/grabar.mjs 8807      # ~15 min en un equipo cargado: fotogramas en tools/video/salida/cuadros
node tools/video/poster.mjs 8807      # póster
node tools/video/montar.mjs           # MP4, WebM, pósteres y vertical en video/
```

**Decisiones técnicas (por si alguien lo toca):**
- La grabación integrada de Playwright (`recordVideo`) entrega 1440 x 810 aunque se pida escala 4/3 y comprime en VP8 a 1 Mbit/s: texto borroso. El *screencast* de Chromium tampoco respeta la escala emulada.
- Solución: Chromium con `--force-device-scale-factor=1.3333333` y ventana de 1440 x 810 (la interfaz se ve como en un portátil, un tercio más grande en el vídeo) y captura `Page.captureScreenshot` a 1920 x 1080 reales.
- En un equipo compartido y cargado, grabar en tiempo real daba 4-5 fotogramas por segundo. Por eso `grabar.mjs` graba **fotograma a fotograma con reloj virtual** (`page.clock`): cada fotograma avanza 1/30 s los temporizadores y `requestAnimationFrame`, y las animaciones CSS se pausan y se colocan en su instante con la API de animaciones web. El vídeo sale fluido a 30 fps aunque cada captura tarde 200 ms.
- Hora fija: miércoles 7 de octubre de 2026, 9:40 («Buenos días, Elena»).
- La versión vertical sale de la misma grabación: los recortes evitan la franja de los rótulos, que van arriba en grande (imágenes generadas con Chromium y la letra de la marca).

**Revisión visual:** fotogramas sueltos extraídos con ffmpeg y revisados uno a uno (portada, arrastre, lectura, propuestas, expediente, Impuestos, Mi día, 650, PDF, cierre; y las seis escenas de la vertical). Corregido en la revisión: el rótulo del 650 decía «casilla a casilla» y la app dice expresamente que no se indican números de casilla porque no se han cotejado con el formulario autonómico → «en el orden del formulario».

## 2. Landing (`src/landing.html` → `index.html`)

- **Portada:** titular, subtítulo y dos llamadas: «Probar 30 días» (/app/) y «Hablar con nosotros» (contratar.html). Debajo, el vídeo en un marco de ventana.
  - El póster es una `<img>` con `fetchpriority="high"` y precarga (1600 px en escritorio, 960 en móvil): es la mayor pintura de contenido. El `<video>` lleva `preload="none"` y sin fuentes: el script las añade **después del evento load**, solo si el vídeo se ve, en pantallas de 700 px o más, sin «reducir movimiento» ni «ahorro de datos». Aparece encima del póster con un fundido al empezar.
  - Bucle silencioso que vuelve a empezar después de la tarjeta de título (el titular ya está en la página). Botón «Pausar el vídeo» siempre visible (WCAG 2.2.2); en móvil o con «reducir movimiento», botón «Ver el vídeo · 1:34». Descripción textual del vídeo para lectores de pantalla; el vídeo, `aria-hidden`.
- **Propuesta en tres puntos** bajo el vídeo: lista en una tarde · los documentos rellenan el expediente · nada sale del despacho.
- **Cómo funciona en 3 pasos** (antes eran 4): arrastrar → revisar y calcular → Mi día y escritos.
- **En cifras** (prueba): 28 tipos de documento, 22 normativas, 8.132 municipios (303 con ordenanza), 183 trámites y 1.472 pruebas automáticas (1.036 del cálculo + 436 de la lectura, a 08-10-2026; las cifras salen de `{{ORDENANZAS}}`, `{{TRAMITES}}` y los nuevos `{{PRUEBAS_TOTAL}}`, `{{PRUEBAS_MOTOR}}`, `{{PRUEBAS_LECTOR}}`). build.py calcula las de pruebas a partir de `src/test.mjs` y `src/test-lector.mjs` y les pone punto de millar.
- **Producto** (paneles y rejilla, con el escáner y la notaría).
- **Comparativa** nueva frente a «Excel y Word» y «software de despacho genérico»: por categorías, sin marcas, con «por lo general»/«habitualmente» donde no se puede afirmar para todos, y con las limitaciones propias a la vista (gestión general del despacho, varios ordenadores: «próximamente»). Tabla real en escritorio; en móvil, tarjetas con la etiqueta de cada columna.
- **Seguridad y datos** («Nada sale del despacho»): datos en los equipos, sin analítica; RGPD sin encargo del tratamiento en uso local (cláusula 8.2 de las condiciones; 9.2 para la nube); sin IA; el abogado decide.
- **Precios** como PRECIOS.md: 59 / 129 / 249 € y el Fundador (49 €, 10 plazas, hasta el 31-12-2026) en un recuadro aparte; anual = 10 meses; transferencia y código de licencia.
- **Preguntas**: instalación, datos, varios ordenadores (despacho en red «más adelante, sin fecha cerrada»), IA, errores, soporte, contrato y permanencia, Excel, 650, impago, contratación.
- **Tipografía:** la landing y las páginas legales usan ahora la letra de la app (Inter y Source Serif 4, autoalojadas, precargadas, con respaldo ajustado a sus métricas). Antes usaban la del sistema: en Windows salía Palatino/Segoe y en Linux, Liberation.
- Pie: versión 1.5. Se quitó el script que convertía «Pedir una demostración» en un `mailto:`: el brief pide que «Hablar con nosotros» lleve a contratar.html.

## 3. Kit comercial (`venta/`)

| Archivo | Cambio |
|---|---|
| `venta.css` | Nuevo: tokens y letra de la marca para todo lo impreso |
| `one-pager.html` / `.pdf` | Versión 1.5: tres puntos, escáner, formatos (Excel, correo, iPhone), forales, «más de 1.400 pruebas», RGPD, Fundador como oferta aparte. A4, una página |
| `dossier-despacho.html` / `.pdf` | Nuevo, 8 páginas A4: portada, qué es, cómo trabaja (28 tipos), qué calcula, cómo se instala, seguridad y RGPD, precios y contratación, soporte y prueba de 30 días |
| `charla-colegio.html` / `.pdf` | Letra de la marca; escáner y formatos en la demostración; forales; plan B con el vídeo; captura nueva |
| `guion-demo-5min.md` | Nuevo: guion de 5 minutos, el mismo recorrido del vídeo |
| `guion-demo.md`, `objeciones.md`, `correo-seguimiento.md` | 1.5, 26 documentos, «más de 1.400 pruebas»; se quitó «está en el plan para 2027» (no hay fecha) |
| `pdf.mjs` | Nuevo: genera los tres PDF con Chromium y comprueba páginas y letra incrustada (`--png` deja imágenes para revisarlas) |

Las cifras que cambian con cada versión van redondeadas en lo impreso («más de 300 ordenanzas», «más de 1.400 pruebas») para que el papel no quede viejo a la semana.

## 4. Páginas legales y contratar.html (solo forma)

Letra de la marca. Sin cambios de contenido. Siguen los huecos del titular (`[NIF]`, `[RAZÓN SOCIAL]`, `[DOMICILIO]`, `[EMAIL DE CONTACTO]`…) hasta que Javier rellene `src/empresa.json`: build.py lo avisa.

## 5. Pruebas

- `tools/qa/web.mjs` (nuevo): axe-core WCAG 2.2 AA en la portada, contratación y las tres páginas legales, a 1440 y 390 px, en claro y oscuro; sin desplazamiento horizontal; sin peticiones a otros dominios; sin marcadores visibles; enlaces de «Probar 30 días» y «Hablar con nosotros»; secciones, precios y preguntas; archivos, tamaño (≤ 12 MB), formato y duración de los vídeos; el vídeo se reproduce solo en escritorio después de cargar, el botón lo pausa, y en móvil y con «reducir movimiento» ni se descarga ni se reproduce; el botón dice la duración real.
- Resultados (08-10-2026): `tools/qa/web.mjs` todo correcto (45 comprobaciones); Lighthouse de la portada servida comprimida (`tools/qa/servidor.mjs` + `lighthouse.mjs`): **móvil 100 / 100 / 100** (rendimiento, accesibilidad, buenas prácticas; LCP 1,9 s, CLS 0) y escritorio 100 / 100 / 100; `node venta/pdf.mjs`: 3 PDF con la página esperada y la letra incrustada; `src/test.mjs` 1036/0; `src/test-lector.mjs` 436; resto de la batería en el informe final.
- Vídeo final: MP4 6,91 MB, 93,9 s, 1920 x 1080 H.264; WebM 6,7 MB; vertical 2,6 MB, 30,0 s.

## 6. Abierto / pendiente

- **Datos del titular** en las páginas legales: PENDIENTE de Javier (no se inventan).
- **«28 tipos de documento»**: el lector tiene 27 tipos internos; el 28.º es el certificado de valor de referencia, que se reconoce con el extractor del Catastro y la ayuda lo cuenta aparte. Se mantiene la cifra (es la de la ayuda, la contratación y el brief), pero conviene saberlo si alguien la cuenta en el código.
- **El dossier y el one-pager usan capturas antiguas** del lector y de Mi día (`img/web/*`, de la 1.4: «Buenas tardes», 25 documentos). Son correctas pero conviene regenerarlas con la 1.5 cuando se rehagan las capturas de la web.
- Con el equipo muy cargado, `producto.mjs` y `experiencia.mjs` dieron fallos de tiempo también en la rama de integración; repetidas con el equipo libre, pasan (45/0 y 47/0).
- WebM: con el tope de 430 kbit/s sale solo un poco menor que el MP4 (pantallas de texto); se sirve primero porque pesa menos.
