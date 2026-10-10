# Hereda+

Software de sucesiones para despachos de abogados: reparto, Impuesto sobre Sucesiones, plusvalía municipal, trámites con plazos, escritos y encargo, en un solo sitio.
Aplicación web instalable (PWA) y archivo HTML que funciona sin conexión. Los datos se guardan en el navegador de cada equipo del despacho.

## Cómo se construye y se publica
Esta carpeta (`fuente/`) es la única fuente de verdad: lo que se publica en `../docs/` (GitHub Pages, https://heredate.github.io/) sale de aquí. No se edita `docs/` a mano.

1. `python3 src/build.py` (desde `fuente/`). Ejecuta antes las pruebas del motor (`node src/test.mjs`) y del lector (`node src/test-lector.mjs`) y no construye si falla alguna; avisa si faltan los datos del titular de `src/empresa.json`. Deja la web en `dist/publicar-gh/` (GitHub Pages), `dist/publicar/` (cualquier servidor; las cabeceras van en `dist/publicar/_headers`), `dist/Hereda-piloto.html` (archivo único) y `dist/app-claude.html` (versión para Claude).
2. `./publicar.sh` construye y copia `dist/publicar-gh/` encima de `../docs/`. No toca lo que build.py no produce (la portada nueva `docs/nueva/` y la demo `docs/video/hereda-demo-cine.mp4`; la lista está en el propio script). Con `--limpiar` borra además de `docs/` lo que build.py ya no produce, salvo eso.
3. Revisar con `git diff --stat docs` y, si se quiere, `python3 tools/comparar-publicado.py` (compara `dist/publicar-gh/` con `docs/` archivo a archivo, sin contar el id de construcción; `--ref <commit>` compara con el `docs/` de un commit). Después, commit y push de `docs/`.

El alojamiento es GitHub Pages (GitHub, Inc.): es el que figura en la política de privacidad.

## Estructura
- `src/landing.html` → `index.html` (presentación). `src/legal/*.html` → aviso legal, privacidad, condiciones y contratación.
- `src/empresa.json` — datos del titular (único sitio). El IBAN no se publica nunca: solo lo usan las facturas y los correos de `tools/README.md`.
- `app/index.html` — la aplicación ya construida (no editar a mano; no se guarda en git: la publicada es `../docs/app/`).
- `app/nucleo/*.js` y `app/partes/*.js` — también construidos: los scripts de la app (con defer) y lo que se carga bajo demanda (calculadora, cuestionario y carpeta de la familia, municipios, biblioteca, mapas; `src/app/partes.js`). `dist/Hereda-piloto.html` lo lleva todo dentro.
- `tools/qa/robustez.mjs` — prueba de navegador de datos dañados, importes y edades, borrado, solo lectura, 200/700 expedientes (IndexedDB) y carga bajo demanda.
- `src/app/` — interfaz (`shell.html` diseño, `ui.js` pantallas, `logic.js` cálculos de la app y módulos). `cine.css` (y `cine.js`, si existe) es la capa visual «cine»: build.py la pone en `<style id="hereda-cine">` (y `<script id="hereda-cine-js">`) justo después de la hoja de estilos principal de la app.
- `src/tramites.mjs` — catálogo de trámites de una herencia.
- `src/motor.mjs` — el motor de cálculo (Derecho civil, impuestos, plazos). Pruebas: `node src/test.mjs`.
- `tools/` — licencias, facturas y plantillas de correo para el cobro por transferencia (ver `tools/README.md`).
- `manifest.webmanifest`, `sw.js`, `icons/` — lo que la hace instalable y usable sin conexión. `icons/hereda-marca.svg` es el monograma; los PNG salen de él con `tools/marca/generar-iconos.mjs`.
- `img/` (imágenes de la portada) y `video/` (demostración de dos minutos y sus pósteres): se copian tal cual a la web.
- `publicar.sh` — construye y publica en `../docs/`. `tools/comparar-publicado.py` — compara lo construido con lo publicado.

## Reglas
- Hereda+ calcula y prepara; el criterio, la revisión y la firma son del abogado.
- Los datos de los expedientes no salen del equipo del despacho: no hay servidor.
