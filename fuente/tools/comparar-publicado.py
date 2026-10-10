#!/usr/bin/env python3
# Compara una web construida (por defecto dist/publicar-gh) con lo publicado en docs/ (una carpeta o un commit de git),
# archivo por archivo. Antes de comparar, cambia el identificador de construcción (AAAAMMDDhhmm, el de la etiqueta
# <meta name="hereda-version">) por «BUILD» en los dos lados: es lo único que cambia de una construcción a otra.
# Uso (desde fuente/):
#   python3 tools/comparar-publicado.py                       → dist/publicar-gh contra ../docs (árbol de trabajo)
#   python3 tools/comparar-publicado.py --ref a42c5c5         → contra docs/ de ese commit
#   python3 tools/comparar-publicado.py --solo-construidos    → no avisa de lo que hay en docs/ y build.py no produce
# Sale con código 0 si no hay diferencias reales.
import argparse, pathlib, re, subprocess, sys, difflib
raiz = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("--construido", default=str(raiz / "dist/publicar-gh"))
ap.add_argument("--docs", default=str(raiz.parent / "docs"))
ap.add_argument("--ref", help="commit de git cuyo docs/ se toma como publicado")
ap.add_argument("--solo-construidos", action="store_true")
ap.add_argument("--max", type=int, default=40, help="líneas de diferencia que se enseñan por archivo")
a = ap.parse_args()

def lista_carpeta(d):
    d = pathlib.Path(d)
    return {str(p.relative_to(d)): (lambda p=p: p.read_bytes()) for p in sorted(d.rglob("*")) if p.is_file()}
def lista_git(ref):
    top = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=raiz, capture_output=True, text=True, check=True).stdout.strip()
    nombres = subprocess.run(["git", "ls-tree", "-r", "--name-only", ref, "docs/"], cwd=top, capture_output=True, text=True, check=True).stdout.split("\n")
    return {n[len("docs/"):]: (lambda n=n: subprocess.run(["git", "show", f"{ref}:{n}"], cwd=top, capture_output=True, check=True).stdout) for n in nombres if n}
def id_de(leer):
    try: m = re.search(rb'<meta name="hereda-version" content="(\d{12})">', leer["app/index.html"]())
    except KeyError: m = None
    return m.group(1) if m else None

A = lista_carpeta(a.construido)
B = lista_git(a.ref) if a.ref else lista_carpeta(a.docs)
idA, idB = id_de(A), id_de(B)
print(f"construido: {a.construido} (build {idA and idA.decode()})\npublicado:  {'git ' + a.ref + ':docs' if a.ref else a.docs} (build {idB and idB.decode()})")
norm = lambda b, i: b.replace(i, b"BUILD") if i else b
reales = 0
for n in sorted(set(A) - set(B)): print("SOLO EN LO CONSTRUIDO:", n); reales += 1
solo_pub = sorted(set(B) - set(A))
if solo_pub and not a.solo_construidos:
    for n in solo_pub: print("solo en lo publicado (build.py no lo produce):", n)
iguales = 0
for n in sorted(set(A) & set(B)):
    x, y = A[n](), B[n]()
    if x == y: iguales += 1; continue
    xn, yn = norm(x, idA), norm(y, idB)
    if xn == yn: iguales += 1; continue
    reales += 1
    print("DIFERENTE:", n)
    try: lx, ly = xn.decode().split("\n"), yn.decode().split("\n")
    except UnicodeDecodeError: print(f"  (binario: {len(x)} frente a {len(y)} bytes)"); continue
    for k, l in enumerate(difflib.unified_diff(ly, lx, "publicado/" + n, "construido/" + n, n=0, lineterm="")):
        if k >= a.max: print("  …"); break
        print("  " + (l if len(l) < 300 else l[:300] + " …[" + str(len(l)) + " car.]"))
print(f"\n{iguales} archivos iguales (salvo el id de construcción) · {reales} con diferencias reales" + (f" · {len(solo_pub)} solo en lo publicado" if solo_pub else ""))
sys.exit(1 if reales else 0)
