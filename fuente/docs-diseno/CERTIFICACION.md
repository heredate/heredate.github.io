# Hereda+ · Certificación de accesibilidad, calidad y rendimiento (v9 «Firma»)

Fecha: 7 oct 2026 · Rama `r2-diseno` · Herramientas: axe-core 4.14.0 y Lighthouse 13.5 sobre el Chromium de Playwright (headless).

## 1. Resultado

| Medida | Antes (Hereda+ 1.4, commit 55aa01b) | Ahora (v9) |
|---|---|---|
| axe-core, WCAG 2.0/2.1/2.2 niveles A y AA · comprobaciones sin infracciones | 51 de 304 | **304 de 304** |
| axe-core · nodos con infracción | 1.196 | **0** |
| Lighthouse escritorio · Rendimiento / Accesibilidad / Buenas prácticas | 98 / 100 / 100 | **97–98 / 100 / 100** |
| Lighthouse móvil (Moto G, 4G lenta, CPU ×4) · R / A / BP | 54 / 100 / 100 | **51–56 / 100 / 100** |
| Escritorio · FCP / LCP / TBT / CLS | 0,9 s / 0,9 s / 30 ms / 0 | 0,8 s / 1,0 s / 40–90 ms / **0** |

Lighthouse solo mira la carga de la portada; ya daba 100 en accesibilidad antes. Las 1.196 infracciones de antes estaban en pantallas, hojas y superposiciones que Lighthouse no abre: por eso la certificación se hace con axe-core pantalla a pantalla.

Infracciones de partida, por regla (304 comprobaciones): contraste 528 · nombre accesible distinto del texto visible 374 · campos sin etiqueta 100 · objetivos de menos de 24 px 56 · zonas desplazables sin acceso por teclado 46 · botones sin nombre 40 · atributos ARIA no permitidos 28 · roles sin los hijos requeridos 12 · enlaces que solo se distinguen por el color 12.

## 2. Qué se comprueba (76 pantallas × 2 temas × 2 anchos = 304)

Cada pantalla en tema claro y grafito, a 1440 px y a 390 px, con `prefers-reduced-motion` activo y el despacho ficticio cargado (14 expedientes):

- **Bienvenida**: sus cuatro pasos.
- **Vistas**: Mi día; Expedientes en tabla, por fase y plazos y mapa; Agenda en lista y por meses; Rentabilidad; Normativa (novedades, estatal, autonómica, municipal); Despacho (panel del socio y actividad).
- **Expediente**: Resumen, Herederos y bienes, Impuestos, Partición (los seis pasos), Trámites (lista y cronograma), Documentos (archivo y escritos), Diagnóstico, Estrategia fiscal, Dos herencias, Bancos y notaría, Listo para firmar, Normativa, Encargo y honorarios (encargo, honorarios y fondos, tiempos, documentación, actividad).
- **Hojas**: persona, bien, trámite, ajustes, Para la familia, añadir persona, añadir bien, importar, desde documentos (lector), novedades, opinión, menú, más secciones, carpeta de la familia, calculadora para la web.
- **Superposiciones**: asistente de alta (dos pasos), paleta ⌘K, centro de ayuda, las once guías interactivas, modo reunión.
- **Fuera de la app**: cuestionario de la familia (/familia/, portada y primer paso) y la carpeta que se entrega a la familia (archivo autónomo, también en oscuro).

Todas: **0 infracciones**. El detalle por pantalla queda en `tools/qa/salida/axe.json` al ejecutar el script con `--json`.

## 3. Cómo se corrigió (sin tocar lógica, datos ni atributos `data-*`)

- **Contraste**: `--ink-3` del grafito sube a #9D9EA4 (≥ 4,5:1 también sobre superficies tintadas); `--c2` y `--c5` del tema claro se oscurecen lo justo; migas, aviso de demostración, simulador, legítimas, paleta y estrategia dejan de usar tonos u opacidades por debajo de AA.
- **Nombre accesible**: botón de búsqueda, contador de Mi día, cerrar la paleta y nodos del árbol familiar (el árbol es una imagen con nombre; se edita desde la lista).
- **Campos sin etiqueta**: `src/app/acceso.js`, un pase tras cada repintado que da a interruptores, casillas y deslizadores el texto de su fila con `aria-labelledby` (nunca `aria-label`, para que la recuperación del foco tras repintar siga encontrando el mismo elemento).
- **Desplazamiento con teclado**: el mismo pase hace enfocables, como región con nombre, las tablas anchas, el árbol, las hojas de solo lectura y el escenario de la bienvenida cuando desbordan y no tienen nada enfocable dentro.
- **ARIA**: pestañas de herederos con `aria-selected`; segmentados sin `role="tablist"` impropio; selector de color propio sin `aria-pressed` en una etiqueta.
- **Objetivos de 24 px**: eventos del calendario por meses (también los puntos en móvil), editar y eliminar en la tabla de tiempos.
- **Teclado**: «Ir al contenido» como primer elemento; al cambiar de vista el foco pasa al contenido (antes, el siguiente Tab saltaba al cronómetro flotante del final del documento).

## 4. Rendimiento

- La app es un único HTML de 3,3 MB (motor, trámites, 8.132 municipios, ordenanzas, calculadora y cuestionario incrustados). Con compresión brotli viajan **0,74 MB**.
- `python3 -m http.server` no comprime: con él Lighthouse escritorio da 64–67 y móvil 33, porque mide 3,3 MB. Netlify y GitHub Pages sí comprimen, así que la medida válida es con `tools/qa/servidor.mjs`.
- Lo que añade esta ronda: dos fuentes WOFF2 de 51 KB (Inter) y 73 KB (Source Serif 4), subconjunto latino, precargadas, `font-display:swap` y respaldo con métricas ajustadas (**CLS 0**). En el archivo único del piloto y en la versión para Claude van incrustadas (sin peticiones).
- Esqueleto de arranque dentro de `#app`: lo primero que se pinta es la marca y la forma de la app, no una página en blanco.
- **Pendiente para el móvil (51–56)**: el tiempo se va en descargar e interpretar 3,3 MB de JavaScript con la CPU ×4. Subir de ahí exige partir el paquete: cargar bajo demanda la calculadora para la web (471 KB), los municipios (213 KB) y la biblioteca de normas (79 KB). Es un cambio de arquitectura de la carga, no de diseño, y queda propuesto.

## 5. Pruebas de la app (en verde tras todos los cambios)

`python3 src/build.py` · `tools/qa/producto.mjs` 45/45 · `tools/ejemplos/generar.mjs` + `prueba.mjs` (3 casos, documentos reconocidos, sin errores) · suites de navegador fn (10/10 «TODO OK»), qa3, qa7, qa8 y qa9 sin errores · guías interactivas: las 10 disponibles con el despacho de prueba, sin problemas.

## 6. Cómo repetirlo

```
cd tools/qa && npm install && cd ../..          # axe-core y lighthouse (devDependencies de tools/qa)
python3 src/build.py
python3 -m http.server 8783 &                     # o cualquier puerto
node tools/qa/a11y.mjs http://127.0.0.1:8783/app/ --json tools/qa/salida/axe.json
#   --tema claro|grafito · --ancho 1440|390 · --solo <parte del nombre> · --capturas <carpeta> · --sin-axe · DETALLE=1
node tools/qa/servidor.mjs 8786 dist/publicar &   # con compresión, como en producción
node tools/qa/lighthouse.mjs http://127.0.0.1:8786/app/ --json tools/qa/salida/lighthouse.json
```

`a11y.mjs` sale con código 1 si queda alguna infracción: sirve como control antes de publicar.
