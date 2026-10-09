# Vídeo de demostración (Hereda+ «cine»)

No se publica: está fuera de `docs/`. Sirve para regenerar `docs/video/hereda-demo-cine.mp4`.

1. Sirve la web: `python3 -m http.server 8765` dentro de `docs/`.
2. Captura la app real en modo demostración, a 2×: `node capture.mjs` y `node capture2.mjs` (usan `setup.mjs`, que completa la bienvenida, carga los 14 expedientes ficticios y pone el tema grafito).
3. Copia a `stage/img/` las capturas que nombra `plato.html` (y `lector-*-osc-1200.webp` de `docs/img/web/`), junto con las fuentes de `docs/fonts/` y `docs/icons/hereda-marca.svg`.
4. `plato.html` compone cada fotograma de forma determinista (`renderAt(segundos)`): cámara 3D sobre las capturas, foco, rótulos y fundidos. El guion está en `SHOTS`.
5. `node render.mjs 0 99999 frames` y después
   `ffmpeg -framerate 30 -i frames/f%05d.jpg -vf "hqdn3d=1.5:1.5:3:3,format=yuv420p" -c:v libx264 -preset slow -crf 23 -tune film -movflags +faststart hereda-demo-cine.mp4`.

Necesita Playwright y Chromium.
