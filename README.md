# Hereda+

Software de sucesiones para despachos de abogados. Este repositorio tiene el código fuente y la web publicada.

## Carpetas

- **`fuente/`** — el código fuente (la única fuente de verdad): interfaz, motor de cálculo, trámites, lector de documentos, páginas de la web, iconos, imágenes y vídeo. Ver `fuente/README.md`.
- **`docs/`** — la web tal como se publica (página de presentación, aplicación en `app/`, cuestionario de la familia en `familia/`, calculadora en `calculadora/` y páginas legales). **Se genera desde `fuente/`: no se edita a mano.** Lo único de `docs/` que no sale de `fuente/` es la portada nueva (`docs/nueva/`) y la demo comercial `docs/video/hereda-demo-cine.mp4`.
- **`herramientas/`** — el plató con el que se graba la demo comercial «cine».

## Construir y publicar

```
fuente/publicar.sh
git diff --stat docs        # revisar lo que cambia
git add docs && git commit  # y subirlo
```

`publicar.sh` ejecuta `python3 src/build.py` (que no construye si falla alguna prueba del motor o del lector) y copia `fuente/dist/publicar-gh/` encima de `docs/` sin tocar lo que build.py no produce. Para solo construir: `cd fuente && python3 src/build.py`. Para ver qué cambiaría respecto a lo publicado: `python3 fuente/tools/comparar-publicado.py` (compara archivo a archivo, sin contar el id de construcción).

El repositorio se llama `heredate.github.io`, así que GitHub Pages sirve la carpeta `docs/` de la rama `main` en https://heredate.github.io/ (Settings › Pages › Branch: main, /docs). Cada cambio en esa carpeta se publica solo en uno o dos minutos. La aplicación guarda los datos en el navegador de cada equipo; no hay servidor ni base de datos.
