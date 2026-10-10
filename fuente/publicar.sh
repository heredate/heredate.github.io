#!/usr/bin/env bash
# Publica Hereda+ en GitHub Pages: construye la web desde el código fuente (src/build.py, que no construye si falla
# alguna prueba) y copia dist/publicar-gh/ encima de ../docs/, que es la carpeta que sirve GitHub Pages.
#
# Uso (desde cualquier carpeta):
#   fuente/publicar.sh              construye y copia; no borra nada de docs/
#   fuente/publicar.sh --limpiar    además borra de docs/ lo que build.py ya no produce, salvo lo protegido (lista de abajo)
#
# Después: revisar con «git diff --stat docs» (en una publicación sin cambios de fuente solo cambia el id de construcción)
# y, si se quiere, comparar con «python3 fuente/tools/comparar-publicado.py».
set -euo pipefail

FUENTE="$(cd "$(dirname "$0")" && pwd)"
DOCS="$(cd "$FUENTE/../docs" && pwd)"
ORIGEN="$FUENTE/dist/publicar-gh"

# Archivos y carpetas de docs/ que build.py NO produce: no se tocan nunca (ni se sobrescriben ni se borran).
PROTEGIDOS=(
  "nueva/"                        # portada nueva, página aparte (docs/nueva/index.html y sus imágenes en docs/nueva/img/)
  "video/hereda-demo-cine.mp4"    # demo comercial «cine» (se genera con herramientas/, no con build.py)
)

protegido() {
  local f="$1" p
  for p in "${PROTEGIDOS[@]}"; do
    if [[ "$p" == */ ]]; then [[ "$f" == "$p"* ]] && return 0
    else [[ "$f" == "$p" ]] && return 0; fi
  done
  return 1
}

LIMPIAR=0
[[ "${1:-}" == "--limpiar" ]] && LIMPIAR=1

# 1. Construir (pruebas del motor y del lector incluidas: si alguna falla, build.py para y aquí no se copia nada)
( cd "$FUENTE" && python3 src/build.py )

# 2. Copiar lo construido encima de docs/ (archivo a archivo; lo protegido se salta aunque build.py lo produjera)
copiados=0
while IFS= read -r -d '' f; do
  rel="${f#"$ORIGEN"/}"
  if protegido "$rel"; then echo "protegido, no se copia: $rel"; continue; fi
  mkdir -p "$DOCS/$(dirname "$rel")"
  cp "$f" "$DOCS/$rel"
  copiados=$((copiados + 1))
done < <(find "$ORIGEN" -type f -print0)
echo "copiados $copiados archivos de dist/publicar-gh/ a docs/"

# 3. Lo que hay en docs/ y build.py no produce: se avisa (y con --limpiar se borra), salvo lo protegido
while IFS= read -r -d '' f; do
  rel="${f#"$DOCS"/}"
  [[ -e "$ORIGEN/$rel" ]] && continue
  protegido "$rel" && continue
  if [[ $LIMPIAR == 1 ]]; then rm "$f"; echo "borrado (build.py ya no lo produce): $rel"
  else echo "AVISO: docs/$rel no lo produce build.py (se deja; «--limpiar» lo borraría)"; fi
done < <(find "$DOCS" -type f -print0)

echo "Hecho. Revisa: git -C \"$FUENTE/..\" diff --stat docs"
