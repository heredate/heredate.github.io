# Hereda+

Software de sucesiones para despachos de abogados: reparto, Impuesto sobre Sucesiones, plusvalía municipal, trámites con plazos, escritos y encargo, en un solo sitio.
Aplicación web instalable (PWA) y archivo HTML que funciona sin conexión. Los datos se guardan en el navegador de cada equipo del despacho.

## Cómo se publica
1. `python3 src/build.py` (desde la raíz). No construye si falla alguna prueba del motor, y avisa si faltan los datos del titular de `src/empresa.json`.
2. Arrastrar la carpeta `dist/publicar` a Netlify (sitio hereda2piloto.netlify.app). Las cabeceras de seguridad van en `dist/publicar/_headers`.

El alojamiento es Netlify, Inc.: es el que figura en la política de privacidad. No se publica en otros servicios.

## Estructura
- `src/landing.html` → `index.html` (presentación). `src/legal/*.html` → aviso legal, privacidad, condiciones y contratación.
- `src/empresa.json` — datos del titular (único sitio). El IBAN no se publica nunca: solo lo usan las facturas y los correos de `tools/README.md`.
- `app/index.html` — la aplicación ya construida (no editar a mano).
- `app/nucleo/*.js` y `app/partes/*.js` — también construidos: los scripts de la app (con defer) y lo que se carga bajo demanda (calculadora, cuestionario y carpeta de la familia, municipios, biblioteca, mapas; `src/app/partes.js`). `dist/Hereda-piloto.html` lo lleva todo dentro.
- `tools/qa/robustez.mjs` — prueba de navegador de datos dañados, importes y edades, borrado, solo lectura, 200/700 expedientes (IndexedDB) y carga bajo demanda.
- `src/app/` — interfaz (`shell.html` diseño, `ui.js` pantallas, `logic.js` cálculos de la app y módulos).
- `src/tramites.mjs` — catálogo de trámites de una herencia.
- `src/motor.mjs` — el motor de cálculo (Derecho civil, impuestos, plazos). Pruebas: `node src/test.mjs`.
- `tools/` — licencias, facturas y plantillas de correo para el cobro por transferencia (ver `tools/README.md`).
- `manifest.webmanifest`, `sw.js`, `icons/` — lo que la hace instalable y usable sin conexión.

## Reglas
- Hereda+ calcula y prepara; el criterio, la revisión y la firma son del abogado.
- Los datos de los expedientes no salen del equipo del despacho: no hay servidor.
