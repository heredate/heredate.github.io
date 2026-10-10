# Ronda 4 · móvil: escáner con cámara de verdad, ergonomía a 390 px y rendimiento

Rama `r4-movil`. Responsable: `movil` (visión y rendimiento). Fecha: 8-10-2026.

## 1. Escáner probado con un vídeo de cámara

### Cómo se prueba
- **Banco de escenas** (`tools/qa/escaner_escenas.py`, Python con numpy y OpenCV, `pdftoppm` y `ffmpeg`): compone fotos realistas de los
  documentos ficticios de `tools/ejemplos/salida` (certificación catastral, nota simple, certificado de Unicaja y DNI) sobre mesas y telas, y
  graba un vídeo MJPEG de 2 s a 30 imágenes por segundo por escena: 0,9 s de pulso de la mano (temblor que se apaga) y 1,1 s quieto. Se guarda
  la verdad (las cuatro esquinas en cada imagen) y muestras a 360 y 720 px para medir sin navegador. Determinista (semilla fija).
- **Prueba** (`tools/qa/escaner.mjs`): (1) banco sin navegador; (2) Chromium con `--use-fake-device-for-media-stream
  --use-file-for-fake-video-capture=<escena>.mjpeg`, emulando iPhone 14 (390×664, táctil, DPR 3, agente de iOS), Pixel 7 (412×839, DPR 2,625,
  agente de Android, **CPU 4× más lenta**) y escritorio 1440×900.
- Las escenas se generan solas la primera vez en `tools/qa/salida/escenas` (unos 700 MB, ignorado por git; tarda unos 20 min).

### Banco: 25 escenas
Móvil en vertical 1080×1920 salvo las de webcam (1280×720).

| Escena | Qué prueba | Antes | Ahora |
|---|---|---|---|
| a4-madera-frontal | folio sobre madera, casi de frente | 9/9 | 9/9 |
| a4-madera-angulo | móvil inclinado unos 30° y girado | 9/9 | 9/9 |
| a4-sombra | sombra del móvil y la mano sobre medio folio | 9/9 | 9/9 |
| a4-dedos | dedos sujetando el folio por el borde | 9/9 | 9/9 |
| a4-poca-luz | imagen oscura, con ruido y luz cálida | 9/9 | 9/9 |
| a4-reflejo | reflejo de una lámpara cerca del borde | 9/9 | 9/9 |
| a4-mesa-clara | folio sobre mesa blanca (poco contraste) | 0/9 | 9/9 |
| a4-mantel | mantel de cuadros (fondo con dibujo) | 9/9 | 9/9 |
| a4-curvado | papel combado | 9/9 | 9/9 |
| a4-lejos | folio pequeño: debe pedir «acércate» | 0/9 | 9/9 |
| a4-webcam | webcam del despacho, folio en vertical | 9/9 | 9/9 |
| a4-webcam-girado | webcam, folio tumbado | 9/9 | 9/9 |
| dni-madera | DNI sobre madera | 9/9 | 9/9 |
| dni-mano | DNI con dedos en un lado | 9/9 | 9/9 |
| dni-webcam | DNI ante la webcam | 9/9 | 9/9 |
| dni-vertical | DNI girado, llenando el ancho | 9/9 | 9/9 |
| dni-mesa-clara | DNI sobre mesa blanca | 0/9 | 9/9 |
| a4-45-grados | folio girado unos 40° | 9/9 | 9/9 |
| a4-noche | muy poca luz y mucho ruido | 0/9 | 9/9 |
| a4-reflejo-borde | reflejo fuerte que cruza el borde sobre mesa clara | 9/9 | 9/9 |
| a4-doblado | pliegues con sombra | 9/9 | 9/9 |
| a4-mesa-objetos | bolígrafo sobre una esquina y carpeta debajo | 9/9 | 9/9 |
| a4-sobre-papeles | folio encima de otros papeles blancos | 0/9 | 0/9 ⚠ |
| a4-fuera | folio que se sale por abajo: debe pedir «aléjate» y no disparar | 9/9 | 9/9 |
| sin-documento | mesa vacía: no debe detectar nada | 9/9 | 9/9 |

Acierto = las cuatro esquinas a menos del 2,5 % de la diagonal, en las imágenes quietas (9 por escena, a 360 px como el bucle de la cámara).

- **Antes (v1.5): 80,0 % (180/225). Ahora: 96,0 % (216/225)**; con temblor, 94,2 %. Error mediano de las esquinas: 0,2-0,3 % de la diagonal.
- Recorte final del disparo (detección a 360 px y esquinas afinadas a 720 px, error < 2 %): 24/25 (falla a4-sobre-papeles).
- Coste: 8,3 ms de CPU por imagen de 360 px antes y 8,1 ms ahora, medidos a la vez en este equipo (en un móvil medio, unas 4-5 veces más).
- **Limitación conocida (a4-sobre-papeles):** con el folio encima de otros papeles blancos, el recorte coge a veces el borde del papel de
  debajo (5 % de error). Se corrige a mano con las esquinas. La prueba la mide y la informa (⚠) sin fallar.

### Cambios en la detección (`src/app/escaner.js`)
- **Dos candidatos y una puntuación común.** Al método de siempre (región clara: «papel» → Otsu → región conexa → crecimiento → envolvente →
  cuadrilátero de área máxima) se suma uno de **rectas**: gradiente de Sobel, transformada de Hough orientada (cada punto vota solo rectas casi
  perpendiculares a su gradiente, con peso saturado para que un borde largo y suave pese más que la letra), pares de rectas casi paralelas y
  cuadriláteros con dos pares. Cada candidato se afina lado a lado sobre el gradiente y se **puntúa** (`scnPuntuar`): fracción de cada lado con
  el interior más claro que el exterior (media y mínimo de los lados), con geometría (convexo, ángulos de 35° a 145°, tamaño). Gana el mejor;
  a igualdad, el mayor. Las rectas solo se calculan si la región no convence (puntuación < 0,82): el caso normal no paga nada extra.
- Umbral de «más claro dentro» según la luz de la escena (de noche los saltos son pequeños); contraste mínimo de la región bajado de 22 a 14.
- Desenfoque de caja con sumas enteras, contorno por filas y columnas (no miles de puntos), Sobel con enteros: mismo coste que antes con el
  doble de trabajo.
- `scnDetectarEn` (disparo y fotos subidas) detecta a 360 px —la escala para la que están pensados los umbrales— y afina las esquinas a la
  resolución pedida (`scnAfinar`). La detección directa a 720 px fallaba en papel claro sobre mesa clara.
- Devuelve además `borde` (el papel toca el borde de la imagen) y `origen` (región o rectas).

### Cambios en la cámara en vivo
- **requestVideoFrameCallback** (solo se trabaja cuando llega una imagen nueva; si no existe, requestAnimationFrame) y **intervalo adaptativo**:
  como mucho ~10 detecciones por segundo y nunca más del 40 % del tiempo (si cada detección tarda 100 ms, una cada 250 ms).
- **Estabilidad por tiempo**, no por número de imágenes: dispara tras 750 ms quieto (movimiento < 1,2 % entre detecciones, contado desde la detección anterior) y al menos dos
  detecciones; un fallo suelto no reinicia la cuenta. El anillo del disparador muestra el progreso.
- **Suavizado temporal** del marco que se dibuja (sin retraso cuando el papel se mueve de verdad).
- **Comprobación en el disparo automático:** antes de guardar, se vuelve a detectar en la imagen que se va a guardar; si el papel ya no está o
  se ha ido a otro sitio (en un móvil lento pasan cientos de milisegundos), no se guarda. Antes se podía guardar una foto de la mesa con las
  esquinas viejas (visto en la prueba con la CPU frenada). Si está pero las esquinas no coinciden del todo, se usan las que se veían.
- Reducción de la imagen con `imageSmoothingQuality = "high"`: al pasar una foto de 1920 px a 360 px sin ese suavizado salen dientes de sierra
  que hacían fallar la detección del DNI sobre mesa blanca en el disparo.
- **Guía:** «Busca el documento», «Hace falta más luz» (brillo medio bajo; con linterna, «enciende la linterna»), «Acércate un poco» (el papel
  ocupa menos del 18 % de la imagen y menos del 60 % del ancho o del alto: así un DNI en un móvil en vertical sí dispara), «Aléjate un poco: el
  documento se sale de la imagen» (dos esquinas o más en el borde: no dispara), «Poca luz. No te muevas…».
- **Foto a resolución del sensor** cuando la cámara la da (ImageCapture.takePhoto, Chrome en Android) y gana al menos un 40 % al vídeo: el
  texto pequeño se lee mejor. Con tiempo máximo; ante cualquier fallo, la imagen del vídeo. No se puede probar con la cámara falsa (da la misma
  resolución): PENDIENTE de probar en un Android real.
- **Liberar la cámara:** al cerrar, al terminar, al pasar la app a segundo plano (`visibilitychange`, y `pagehide`) se paran las pistas y se
  suelta el vídeo; al volver, se enciende sola.
- **Permiso denegado explicado según el móvil:** iPhone («Ajustes › Safari › Cámara», o «aA › Ajustes del sitio web»), Android (icono junto a la
  dirección › Permisos › Cámara), escritorio (candado). Botón **Reintentar**. Cámara ocupada por otra aplicación, explicado. Si la cámara no
  admite la resolución pedida, se reintenta sin restricciones.

### Resultados en el navegador (cámara falsa)
`node tools/qa/escaner.mjs 8805`: **121 comprobaciones correctas, 0 fallidas, 2 avisos** (la limitación conocida, en el banco y en vivo). Detalle
en `tools/qa/salida/escaner-informe.json`. Última pasada, con la máquina tranquila:

| Dispositivo | Escenas | Primera detección | Disparo automático | Error del recorte (mediana) | Coste por detección · intervalo |
|---|---|---|---|---|---|
| iPhone 14 | 22 de móvil | 0,15-0,21 s | 1,4-2,2 s (mediana 1,8 s) | 0,1 % | 20 ms · 90 ms |
| Pixel 7, CPU 4× más lenta | 6 | 0,24-0,35 s | 1,6-3,2 s | < 0,1 % | 55 ms · 130 ms |
| Escritorio 1440 | 4 (webcam, mesa clara) | 0,12-0,18 s | 1,3-2,0 s | 0,1 % | 18 ms · 90 ms |

Los vídeos solo tienen 1,1 s quieto por cada 2 s: es más exigente que la realidad. El marco no se mueve más de un 0,1 % en los 600 ms antes del
disparo. «Sin documento» no dibuja nada; «a4-fuera» pide alejarse y no dispara; «a4-lejos» pide acercarse y no dispara.

- **Tres páginas seguidas** (vídeo que pone y quita tres papeles: catastro hoja 1 y 2, y el certificado del banco), en iPhone 14 y Pixel 7:
  tres capturas automáticas, una por papel, en unos 7 s; «Otro doc.» entre la segunda y la tercera; un disparo manual que luego se borra;
  páginas enderezadas a proporción de folio (1,414); **dos PDF archivados (2 y 1 páginas)** en el expediente nuevo; el lector reconoce
  «catastro» y «bancario»; la cámara queda apagada.
- **Campos clave:** el NIF del titular sale siempre; la referencia catastral y el IBAN, según la imagen capturada (última pasada: iPhone 14 NIF
  y referencia, Pixel 7 los tres; en pasadas anteriores, también NIF e IBAN sin la referencia). Con vídeo de 1080×1920 (lo que da la cámara de
  un móvil al navegador), la letra de las tablas queda a unos 100 ppp y la lectura óptica confunde a veces un carácter (visto: «VK» leído
  «VX» en la referencia, que el corrector del lector no arregla porque solo prueba los caracteres de control; el IBAN partido en dos renglones
  dentro de la celda). La prueba exige dos de los tres campos y los informa uno a uno. Mejora PROPUESTA para quien lleve el lector: en
  `lecRefCatArreglar`, probar también K↔X en las dos letras de la hoja cuando el control no cuadra (sigue siendo una corrección única
  comprobada con los dos caracteres de control). En Android, la foto a resolución del sensor (arriba) debería resolverlo: PENDIENTE de un
  móvil real.
- `tools/ejemplos/prueba.mjs` (con su propio escáner con cámara falsa, de imagen fija) sigue en verde.

## 2. Ergonomía móvil (390 px)
- Barra inferior del escáner: a 390 px no cabía todo y «Otro doc.» se partía en dos renglones. Ahora: **Fotos · Automático · disparador ·
  Guardar**; «Otro doc.» pasa al final de las miniaturas (tiene sentido ahí: «lo que capture ahora va en otro PDF») y la **linterna** a la
  cabecera. Título de la cabecera con puntos suspensivos si no cabe.
- **Horizontal** (poca altura): cabecera fina y los controles en una columna a la derecha, al alcance del pulgar, como la cámara del sistema; el
  editor de esquinas con sus botones en dos columnas y «Hecho» siempre visible (antes había que desplazarse para verlo).
- «Escanear con la cámara» en Documentos del expediente y en «Desde documentos»: a 390 px, a todo lo ancho y de 48 px (antes 36 px).
- Comprobado en la prueba (iPhone 14 y Pixel 7, vertical y horizontal): sin desbordes, todos los controles del escáner de 44 px o más,
  disparador de 68-74 px en el cuarto inferior de la pantalla (vertical) o en la columna derecha (horizontal), editor con las cuatro asas
  visibles (44 px) y «Hecho» abajo.
- Capturas en `tools/qa/salida/escaner-*.png` (subir, vertical, horizontal, editor, sin permiso).

## 3. Rendimiento (Lighthouse)
Medido con `node tools/qa/lighthouse.mjs <url> --veces 3` (opción nueva: mediana de N pasadas; en esta máquina compartida una sola pasada
varía ±10 puntos), servido con compresión (`tools/qa/servidor.mjs`), el mismo rato para las dos versiones.

| App (`/app/`) | Antes (v1.5) | Ahora |
|---|---|---|
| Móvil, rendimiento (mediana de 3) | **75** (71-76) | **90** (90-93) |
| Móvil: FCP · LCP · TBT · SI | 1,1 s · 5,3 s · 260 ms · 2,3 s | 1,0 s · 1,8 s · 380 ms · 2,4 s |
| Escritorio, rendimiento | 98 | 97 |
| Accesibilidad · buenas prácticas | 100 · 100 | 100 · 100 |

| Carga real frenada (`tools/qa/arranque.mjs`: 4G lenta 150 ms/1,6 Mbit/s, CPU 4×) | Antes | Ahora |
|---|---|---|
| Primer pintado con contenido (y LCP) | 4,3 s (hasta entonces solo barras grises) | 0,75 s |
| La app pintada | 4,2 s | 3,85 s |

Landing (`/`): 100 en móvil y escritorio antes y después; no ha hecho falta tocarla.

### Qué se ha hecho
- **Arranque con texto real** (`shell.html`, `pro.css`): el esqueleto de carga muestra «Abriendo el despacho… Los expedientes y los documentos
  se guardan en este equipo y no salen de él» con las fuentes locales de respaldo, así que pinta en cuanto llega el HTML. Ese texto es el LCP
  en el móvil: es lo que de verdad ve quien abre la app con mala cobertura durante los 3-4 s que tardan los scripts.
- **El núcleo se pide justo tras el primer pintado** (`build.py`: un cargador mínimo inserta `nucleo/motor.js` y `nucleo/app.js` en orden, con
  `async=false`). Antes eran `<script defer>` y competían con el HTML y las fuentes. En la copia íntegra («Enviar a un compañero») el núcleo va
  dentro y el cargador se quita (`partes.js`). Coste real medido: ninguno apreciable (la app pinta antes que en la v1.5 por el minificado).
- **Minificado prudente** (`tools/minificar.mjs`, lo llama `build.py`): quita comentarios y sangrías de `app/nucleo/*.js` (las partes, datos que se cargan después, no)
  trabajando sobre los tokens de acorn, conserva los saltos de línea (la inserción automática de punto y coma no cambia) y comprueba que la
  secuencia de tokens del resultado es idéntica; si no, deja el archivo como estaba. Núcleo: 2.360 → 2.000 KB; app.js 464 → 405 KB comprimido.
  Sin acorn en la máquina, no minifica y lo dice; `HEREDA_SIN_MINIFICAR=1` lo desactiva para depurar.
- **Trabajo síncrono al arrancar:** orden alfabético con un único `Intl.Collator` (antes `localeCompare(…, "es")` creaba uno por comparación:
  municipios y colegios, ~40 ms en un móvil); la fecha larga de la portada sin `Intl` (idéntica, comprobado en 800 días).
- Lo que se probó y **no** se ha dejado: (a) pintar la app en una tarea aparte (`setTimeout` alrededor de `sgArranque`): rompía una prueba de
  producto («La tarea aparece en Mi día»), se deshizo; (b) pedir las fuentes tras el primer pintado: retrasaba la app 0,5 s en la carga real.

### Lo que queda (TBT)
El TBT simulado (260-400 ms) lo forman la compilación de `app.js` (1,5 MB) y `motor.js` y el primer pintado de la app. En esta máquina de dos
núcleos compartida, la compilación en segundo plano no termina a tiempo y se acaba en el hilo principal («LargeScriptCatchup»), y Lighthouse lo
multiplica por 4. La puntuación de 90 queda justa. Para tener margen haría falta cargar bajo demanda partes grandes que hoy van en el núcleo
(el lector, 260 KB, con lector-tipos y el escáner, 365 KB en total), lo que toca muchos puntos de `ui.js`, `archivo.js` y `guia.js`:
PENDIENTE, mejor en una ronda en la que nadie más toque el lector.

## Pruebas
- `node src/test.mjs` 1036 correctas · `node src/test-lector.mjs` 436 correctas (incluye los casos sintéticos del escáner).
- `node tools/qa/escaner.mjs 8805` (nueva): banco + navegador, ver arriba.
- `node tools/qa/producto.mjs`, `experiencia.mjs`, `robustez.mjs --rapido`, `a11y.mjs` (0 infracciones) y `tools/ejemplos/prueba.mjs`
  (incluido su escáner con cámara falsa): en verde, ver el informe final.

## Archivos
- `src/app/escaner.js`, `src/app/escaner.css`: detección, bucle de cámara, guía, permisos, ergonomía.
- `src/app/shell.html`, `src/app/pro.css` (arranque), `src/app/logic.js`, `src/app/bienvenida.js` (Collator), `src/app/ui.js` (fecha, una
  línea), `src/app/partes.js` (cargador en la copia íntegra; precarga si el «load» ya pasó).
- `src/build.py` (cargador del núcleo, minificado).
- Nuevos: `tools/minificar.mjs`, `tools/qa/escaner.mjs`, `tools/qa/escaner_escenas.py`, `tools/qa/arranque.mjs`; `tools/qa/lighthouse.mjs`
  con `--veces` y `--solo`.
