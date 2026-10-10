# Ronda 4 · «Despacho en red» (agente `red`)

Varios ordenadores del mismo despacho trabajan con los mismos expedientes a través de una carpeta que el despacho ya tiene
(OneDrive, Dropbox, Google Drive para escritorio o una carpeta del servidor/NAS). No hay servidor de Hereda+: cada equipo lee y
escribe archivos en esa carpeta con la File System Access API (Chrome y Edge), igual que la copia automática de `seguridad.js`.

## Qué se ha hecho

| Archivo | Qué |
|---|---|
| `src/app/red-motor.js` (nuevo) | Motor de sincronización **puro** (sin DOM ni globales de la app) contra tres interfaces: carpeta (listar, leer, escribir, borrar), datos locales (listar, aplicar, bytes de un documento) y cifrado. Fusión de tres vías, lápidas, presencia, documentos por contenido. |
| `src/app/red.js` (nuevo) | Conexión con la app: carpeta sobre `FileSystemDirectoryHandle`, datos sobre `DB.expedientes`, `DB.despacho` (sin `yo`) y los adjuntos de IndexedDB; cifrado con las funciones de `seguridad.js`; asistente de 3 pasos, estado en Ajustes, franjas, barra lateral, hoja de conflictos. |
| `src/app/seguridad.js` | 1 línea: `sgSeguir()` llama a `redArrancar()`. Además, la ventana modal propia tenía «Cancelar» visible con `aria-label="Cerrar"` (infracción axe `label-content-name-mismatch` en restaurar copia y contraseña, que `a11y.mjs` no abre): se quita el `aria-label`. |
| `src/app/ui.js` | 4 líneas: franja (`redBanner`), sección en Ajustes (`redAjustesHTML`), fila en la barra lateral (`redSideItem`) y el pie de «Datos». |
| `src/build.py` | `red-motor.js` y `red.js` en `MODULOS_PRODUCTO` (van en el núcleo: hacen falta al arrancar). |
| `src/app/ayuda.js` | Artículo «Trabajar varios en el mismo despacho»; «Cambiar de ordenador» y «Dónde se guardan» al día; destinos `ajustes:red` y `redAsistente`. |
| `src/app/producto.css` | Estilos `red-*` (solo tokens existentes; reutiliza `sg-modal`, `sg-opt`, `sg-banner`). |
| `src/app/compartir.js` | Entrada en Novedades. |
| `src/landing.html`, `src/legal/contratar.html`, `venta/objeciones.md` | La respuesta a «¿varios ordenadores?» ya no es «llegará más adelante». |
| `tools/qa/red.mjs` (nuevo) | 87 pruebas del motor en Node + 33 de navegador (dos contextos de Playwright con carpeta compartida simulada). |

## Diseño

### En la carpeta (`hereda-red/`)
- `despacho.json`: `{ f: "hereda+red", v, id, nombre, creado, cifrado, k?, prueba? }`. En claro (hace falta para unirse). Con contraseña, `k` es la clave del despacho envuelta con la contraseña (PBKDF2-SHA256 600.000 + AES-GCM, `sgNuevoSobre`) y `prueba` es un texto cifrado con una sal secreta (comprueba la clave antes de tocar nada).
- `expedientes/<id>.json`: `{ f, v, id, rev, h, hist, modificado, por: { equipo, nombre, persona }, x, docs }`. Con cifrado: `{ f, v, id, c: 1, d }`, con AAD `hereda+red:<despacho>:exp:<id>` (un archivo copiado con el nombre de otro expediente no se acepta).
- `expedientes/_despacho.json`: los datos del despacho (equipo de personas, contacto), sin `yo`, que es de cada ordenador.
- `documentos/<nombre>`: bytes de cada adjunto, una sola vez aunque esté en varios expedientes. Sin cifrado, el nombre es su SHA-256; con cifrado, SHA-256 de (sal secreta + SHA-256), para que nadie con acceso a la carpeta pueda confirmar si un documento conocido está dentro.
- `lapidas/<id>.json`: borrados deliberados `{ id, rev, h, t, por }`.
- `presencia/<equipo>.json`: latido `{ equipo, nombre, persona, abierto, seq, t, cerrado }`.
- `averiados/`: copia íntegra de archivos que no se han podido leer durante 10 ciclos, antes de reescribirlos.

### Reglas (motor)
- **Huella** (`h`, 128 bits sobre JSON canónico; sin `actualizado`) e **historia** (`hist`, las 30 últimas huellas de las que desciende). Las decisiones nunca usan relojes, así que los relojes desajustados no influyen.
- Por expediente, con la **base** (última versión sincronizada que guarda cada equipo): solo cambió este equipo → se escribe; solo cambió la carpeta → se aplica; los dos → **fusión de tres vías** campo a campo. Colecciones con `id` (personas, bienes, trámites, movimientos, documentos, equipo…) elemento a elemento; `auditoria` y `bitacora` como registros (unión menos lo que cualquiera quitó o reescribió: así las entradas que `auditoria.js` agrupa no se duplican).
- **Choque** (mismo dato, valores distintos): se queda el valor del equipo que funde y el otro se guarda en `x.redConflictos` con quién hizo cada uno; viaja con el expediente, así que lo ven todos y lo puede resolver cualquiera. Quitar en un equipo lo que el otro cambió: se conserva y se pregunta.
- **Escrituras que se pisan** (carpeta del servidor: gana la última): el equipo cuya escritura se perdió lo detecta porque la versión de la carpeta no desciende de la suya (`hist`) y vuelve a fundir con el antecesor común (guarda las dos últimas bases).
- **Copias de conflicto** de OneDrive/Dropbox/Drive (`abc-PC-MARTA.json`, `abc (1).json`, `abc (Marta's conflicted copy …).json`): se reconocen por el id de dentro, se funden con la principal y se quitan.
- **Borrar exige lápida**. Un archivo que falta no borra nada; si falta sin lápida, se espera 10 minutos (la lápida puede llegar después: OneDrive no garantiza el orden) y se vuelve a escribir. Una versión con `rev` mayor que la lápida resucita el expediente (editar gana a borrar, con aviso).
- **Archivos a medias** (JSON roto, huella que no cuadra, cifrado que no abre): se saltan sin tocar nada de ese expediente hasta que se pueden leer.
- **Adjuntos** que aún no han llegado: quedan pendientes (no cuentan como quitados) y se bajan en cuanto aparecen; se comprueba su SHA-256. Los que no usa ningún expediente se borran de la carpeta a los 30 días.
- **Concurrencia con el usuario**: el motor trabaja sobre una foto de los datos; al aplicar, si el expediente cambió desde que lo leyó (o se está revisando en el asistente, que guarda una copia entera al terminar), no lo toca y lo funde en el siguiente ciclo. Entre pestañas del mismo equipo, `navigator.locks`.
- **Presencia**: un equipo cuenta como conectado si su número de latido ha cambiado en los últimos 150 s *medidos con el reloj propio* (o, la primera vez, si su hora está a menos de 150 s de la nuestra). Al cerrar la app se escribe `cerrado`.

### En la app (`red.js`)
- Cuándo: al abrir, al guardar (2 s de margen), al volver a la ventana y cada 45 s. En pausa con la app bloqueada, en solo lectura (licencia), en el modo demostración (cambia el equipo de personas por uno ficticio) y sin permiso para la carpeta (franja «Reanudar», como la copia automática).
- Registro de cambios coherente: tras aplicar lo recibido se actualiza la foto de `auditoria.js` (`AU.base`) y el sello de `seguridad.js` (`SG.huellas`), para que lo que hizo otro equipo no se apunte como hecho aquí. Las entradas de cada equipo se unen.
- Borrar un expediente (`rbBorrarExpediente`) apunta el borrado deliberado; el texto de confirmación dice «Se quita de todos los equipos del despacho en red».
- Al unirse: los datos del despacho de la carpeta mandan (mismo id de persona); las personas que solo estaban en este equipo se añaden. Pantalla final para elegir «Quién usa este equipo».
- Clave del despacho en este equipo: si el equipo tiene contraseña propia, se guarda cifrada con ella; si no, como clave del navegador en IndexedDB (igual que el permiso de la carpeta). El estado local (bases) se cifra igual.
- Sin la API (Firefox, Safari, móviles): la sección lo explica y remite a Exportar/Importar.

### Por qué así (frente al diseño mínimo propuesto)
- Huella + historia en lugar de solo `rev`: con `rev` no se distingue «la carpeta avanzó desde lo mío» de «alguien escribió encima sin ver lo mío», que es justo lo que pasa en una carpeta de red.
- Choques dentro del expediente (`x.redConflictos`) y no en un archivo aparte: sobreviven a recargas y copias, viajan a todos los equipos y no hay una segunda fuente de verdad que pueda desincronizarse.
- `_despacho` como un expediente más: el equipo de personas tiene que coincidir (los responsables apuntan a sus ids).
- Espera de 10 min ante un archivo desaparecido y nunca caché de la fecha de un archivo recién escrito: los dos fallos los encontraron las pruebas (lápida que llega tarde; escritura sustituida al momento por otro equipo, con mismo tamaño y misma hora).

## Pruebas
- `node tools/qa/red.mjs`: **87 correctas** (motor, Node, carpeta en memoria que simula OneDrive: vistas por equipo con propagación diferida y filtrable, copias de conflicto, carpeta de servidor con «gana la última», relojes ±3 h). Cubre: alta, unión, idempotencia (sin escrituras ni lecturas de más), edición concurrente sin choque, choque y su resolución, colecciones, quitar contra cambiar, auditoría y bitácora (incluida la agrupación), borrados, lápidas tardías, archivos desaparecidos, expedientes que llegan tarde, archivos a medias, huella manipulada, averiados, copias de conflicto (OneDrive y Dropbox), temporales, escrituras pisadas, relojes, presencia (5), documentos (deduplicación, tardíos, a medias, cambios de estado, quitar, huérfanos a 30 días), cifrado (nada en claro, nombres de adjuntos, contraseña y clave equivocadas, archivo en claro y archivo cambiado de nombre), carpeta equivocada o sin despacho, edición durante el ciclo (con objetos vivos), datos del despacho, tres equipos, 200 expedientes (escribir ~55 ms, recibir ~45 ms, ciclo sin cambios ~55 ms; un cambio = una escritura).
- `node tools/qa/red.mjs http://127.0.0.1:8804/app/`: además **33 de navegador** (120 en total): asistente completo con contraseña, unirse (contraseña mala y buena), edición que llega, auditoría sin atribuciones falsas, aviso de presencia, choque en los dos equipos, franja y hoja de conflictos, resolución en los dos, borrado con lápida, copia automática intacta, navegador sin la API, sin errores de consola, y axe-core (WCAG 2.2 AA) en el asistente (pasos 1 y 3, crear y unirse, «Listo»), Ajustes y la hoja de conflictos, en claro y grafito: 0 infracciones.
- Batería del brief: `src/test.mjs` 1036/0 · `test-lector` 436 · `robustez --rapido` 53/0 · `a11y` 304/304 sin infracciones · `ejemplos/prueba` OK · `producto` 44/1 y `experiencia` 46/1: **los dos fallos son previos** (dan igual en la rama de integración sin tocar, 0f0dadc; dependen de la fecha: «La tarea aparece en Mi día del responsable» e «I9 · la cartera ofrece retomarlo»).
- Capturas revisadas a 1440 y 390 (claro y grafito): asistente, Ajustes, franjas, hoja de conflictos.

## Límites honestos
- **No es tiempo real.** Con OneDrive/Dropbox/Drive, un cambio tarda lo que tarde el servicio en subirlo y bajarlo (segundos, a veces minutos) más hasta 45 s. Con una carpeta del servidor, hasta 45 s. Los choques son más probables cuanto mayor la latencia; se resuelven sin pérdida, pero hay que elegir.
- **Navegadores**: solo Chrome y Edge de escritorio (File System Access API). Firefox, Safari y móviles: Exportar/Importar.
- **Permiso**: tras reiniciar, Chrome puede volver a pedir permiso para la carpeta (franja «Reanudar»; necesita un clic). Con la app instalada, Chrome recientes lo recuerdan.
- **OneDrive «Archivos a petición»**: si la carpeta no está marcada «Mantener siempre en este dispositivo», la primera lectura descarga y puede tardar; sin conexión, esos archivos se saltan hasta que llegan.
- **La prueba de navegador usa un manejador de carpeta simulado** (no se puede automatizar `showDirectoryPicker`); la API real con OneDrive real no se ha probado aquí. PENDIENTE: prueba manual en el despacho piloto con dos ordenadores y OneDrive.
- Contraseña del despacho olvidada: nadie puede leer la carpeta; cada equipo conserva sus datos. Cambiar la contraseña del despacho no está en la interfaz (PENDIENTE; el formato lo permite: se re-envuelve la misma clave).
- Unirse con expedientes que ya existían en los dos sitios (por haberlos exportado/importado antes) sin base común: cada diferencia sale como choque (seguro, pero puede ser ruidoso).
- Si cada ordenador tenía su propio equipo de personas, tras unirse conviene revisar los responsables (los ids de persona de la carpeta mandan).
- Lápidas: se conservan indefinidamente (son pequeñas). Documentos borrados: siguen en la carpeta 30 días.
- Las copias de seguridad siguen siendo necesarias: la red replica también los errores (un borrado deliberado llega a todos).

## Línea para el plan de producto
«1.6 · Despacho en red: varios ordenadores con los mismos expedientes a través de la carpeta compartida del despacho (OneDrive, Dropbox, Google Drive o servidor), cifrada con contraseña, sin servidor propio; fusión sin pérdidas, aviso de presencia y conflictos a elegir. Chrome y Edge. Pendiente: piloto con OneDrive real en dos equipos.»
