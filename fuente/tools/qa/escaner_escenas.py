# Banco de escenas para probar el escáner con una cámara «de verdad» (la cámara falsa de Chromium reproduce un vídeo).
# Compone fotos realistas de los documentos FICTICIOS de tools/ejemplos/salida (folio A4 y DNI) sobre mesas y telas, con perspectiva, sombra,
# dedos en el borde, poca luz, reflejo, papel curvado…, a la resolución de un móvil en vertical (1080×1920) o de una webcam (1280×720).
# Cada escena es un vídeo MJPEG de 2 s a 30 imágenes por segundo (ffmpeg): primero el pulso de la mano (temblor) y luego quieto, como al
# encuadrar. Junto a cada vídeo, la verdad: las cuatro esquinas del documento en cada imagen, y unas cuantas imágenes reducidas a 360 px en
# RGBA crudo para medir la detección sin navegador (tools/qa/escaner.mjs).
# Uso: python3 tools/qa/escaner_escenas.py <carpeta de ejemplos (tools/ejemplos/salida)> <carpeta de salida> [escena…]
# Requiere numpy y OpenCV (cv2), pdftoppm (poppler) y ffmpeg. Determinista (semilla fija por escena).
import json, math, os, subprocess, sys, zlib
import numpy as np
import cv2

EJ = sys.argv[1]; OUT = sys.argv[2]; SOLO = set(sys.argv[3:])
os.makedirs(OUT, exist_ok=True)
FPS, N = 30, 60  # 2 s
QUIETO = 26      # a partir de esta imagen, la mano está quieta


def pagina_pdf(pdf, n=1, dpi=110):
    base = os.path.join(OUT, "_pag-%s-%d" % (os.path.basename(pdf)[:2], n))
    if not os.path.exists(base + ".png"):
        subprocess.run(["pdftoppm", "-r", str(dpi), "-f", str(n), "-l", str(n), "-png", "-singlefile", pdf, base], check=True)
    return cv2.imread(base + ".png")


def dni_plano():
    """El DNI ficticio sin el fondo: se deshace el giro de -1,2° con el que se fotografió y se recorta la tarjeta (en la captura, a doble
    resolución: 1712×1080 desde (84, 80)); se deja en 856×540 con esquinas de 28 px."""
    im = cv2.imread(os.path.join(EJ, "caso1-testamento-malaga", "11-dni-javier-jimenez-ruiz.jpg"))
    k = im.shape[1] / 940.0  # la captura se hizo con deviceScaleFactor 2
    M = cv2.getRotationMatrix2D((470 * k, 310 * k), -1.2, 1.0)
    r = cv2.warpAffine(im, M, (im.shape[1], im.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    x0, y0 = int(round(42 * k)), int(round(40 * k))
    c = r[y0 + 2:y0 + int(540 * k) - 2, x0 + 2:x0 + int(856 * k) - 2]
    return cv2.resize(c, (856, 540), interpolation=cv2.INTER_AREA)


def mascara_redondeada(w, h, r):
    m = np.zeros((h, w), np.uint8); cv2.rectangle(m, (r, 0), (w - r, h), 255, -1); cv2.rectangle(m, (0, r), (w, h - r), 255, -1)
    for cx, cy in ((r, r), (w - r - 1, r), (r, h - r - 1), (w - r - 1, h - r - 1)): cv2.circle(m, (cx, cy), r, 255, -1, cv2.LINE_AA)
    return m


# ── Fondos ──
def madera(W, H, rng, tono=(62, 96, 140)):
    y = np.arange(H)[:, None]; x = np.arange(W)[None, :]
    vetas = np.sin((y * 0.045 + 6 * np.sin(x * 0.004 + rng.random() * 6) + rng.random() * 9)) * 0.5 + 0.5
    ruido = cv2.GaussianBlur(rng.standard_normal((H, W)).astype(np.float32), (0, 0), 3) * 0.25
    tablas = ((x // max(1, W // 3)) % 2) * 0.06
    k = 0.72 + 0.22 * vetas + ruido + tablas
    img = np.stack([np.full((H, W), c, np.float32) for c in tono], -1) * k[..., None]
    return np.clip(img, 0, 255)


def liso(W, H, rng, color, ruido=4.0):
    img = np.empty((H, W, 3), np.float32); img[:] = color
    img += cv2.GaussianBlur(rng.standard_normal((H, W, 3)).astype(np.float32), (0, 0), 1.2) * ruido
    return img


def tela(W, H, rng):
    y = np.arange(H)[:, None]; x = np.arange(W)[None, :]
    a = ((x // 46) + (y // 46)) % 2; b = ((x // 14) % 3 == 0) | ((y // 14) % 3 == 0)
    img = np.empty((H, W, 3), np.float32); img[:] = (205, 210, 215)
    img[a.astype(bool)] = (70, 60, 170); img[b & a.astype(bool)] = (90, 85, 200); img[b & ~a.astype(bool)] = (180, 180, 200)
    return cv2.GaussianBlur(img, (0, 0), 1.0)


def granito(W, H, rng):
    img = liso(W, H, rng, (128, 132, 136), 2)
    p = rng.random((H, W)) < 0.05; img[p] = (60, 60, 64); q = rng.random((H, W)) < 0.04; img[q] = (210, 210, 205)
    return cv2.GaussianBlur(img, (0, 0), 1.1)


# ── Documento sobre el fondo ──
def colocar(fondo, doc, Q, rng, sombra=0.35, mascara=None, curva=0.0):
    H, W = fondo.shape[:2]; h, w = doc.shape[:2]
    d = doc.astype(np.float32)
    m = (mascara if mascara is not None else np.full((h, w), 255, np.uint8)).astype(np.float32) / 255.0
    if curva:  # papel combado: desplaza las filas según una parábola (las esquinas quedan en su sitio)
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32); t = (xx / (w - 1)) * 2 - 1
        dy = curva * h * (1 - t * t) * np.sin(np.pi * yy / (h - 1)) * 0.5
        d = cv2.remap(d, xx, yy - dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        m = cv2.remap(m, xx, yy - dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    src = np.float32([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]]); M = cv2.getPerspectiveTransform(src, np.float32(Q))
    dw = cv2.warpPerspective(d, M, (W, H), flags=cv2.INTER_AREA if w > W else cv2.INTER_LINEAR)
    mw = cv2.warpPerspective(m, M, (W, H), flags=cv2.INTER_LINEAR)
    if sombra:
        s = cv2.GaussianBlur(mw, (0, 0), max(4, W * 0.012)); s = np.roll(np.roll(s, int(W * 0.008), 1), int(W * 0.012), 0)
        fondo = fondo * (1 - sombra * s[..., None])
    return fondo * (1 - mw[..., None]) + dw * mw[..., None], mw


def rect_centrado(W, H, w, h, frac, ang, cx=0.5, cy=0.5):
    a = math.radians(ang); c, s = math.cos(a), math.sin(a)
    bw, bh = abs(w * c) + abs(h * s), abs(w * s) + abs(h * c)  # caja del documento ya girado
    k = frac * min(W / bw, H / bh)
    P = []
    for x, y in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)):
        x, y = x * k, y * k; P.append([cx * W + x * c - y * s, cy * H + x * s + y * c])
    return P


def inclinar(Q, arriba=0.0, lado=0.0):
    """Perspectiva: estrecha el borde superior (cámara inclinada hacia delante) y/o el derecho."""
    Q = [list(p) for p in Q]; cx = sum(p[0] for p in Q) / 4; cy = sum(p[1] for p in Q) / 4
    for i in (0, 1): Q[i][0] = cx + (Q[i][0] - cx) * (1 - arriba); Q[i][1] = cy + (Q[i][1] - cy) * (1 - arriba * 0.35)
    for i in (1, 2): Q[i][1] = cy + (Q[i][1] - cy) * (1 - lado); Q[i][0] = cx + (Q[i][0] - cx) * (1 - lado * 0.3)
    return Q


# ── Efectos de luz y cámara ──
def luz(img, rng, nivel=1.0, grad=0.25, tinte=(1, 1, 1)):
    H, W = img.shape[:2]; y = np.linspace(-1, 1, H)[:, None]; x = np.linspace(-1, 1, W)[None, :]
    a = rng.random() * 6.28; g = 1 - grad * (0.5 + 0.5 * (np.cos(a) * x + np.sin(a) * y)) - 0.18 * (x * x + y * y)
    return img * (g * nivel)[..., None] * np.float32(tinte)


def sombra_proyectada(img, rng, poli, fuerza=0.5, blur=0.03):
    H, W = img.shape[:2]; m = np.zeros((H, W), np.float32); cv2.fillPoly(m, [np.int32(poli)], 1.0, cv2.LINE_AA)
    m = cv2.GaussianBlur(m, (0, 0), max(2, W * blur)); return img * (1 - fuerza * m[..., None])


def reflejo(img, cx, cy, rx, ry, fuerza=230):
    H, W = img.shape[:2]; y = (np.arange(H)[:, None] - cy) / ry; x = (np.arange(W)[None, :] - cx) / rx
    g = np.exp(-(x * x + y * y) * 1.6); return img + fuerza * g[..., None]


def dedos(img, rng, base, direccion, n=3, ancho=None, largo=None):
    """Dedos (cápsulas color piel con sombreado) que entran desde fuera del papel y pisan el borde."""
    H, W = img.shape[:2]; ancho = ancho or W * 0.055; largo = largo or W * 0.2
    dx, dy = direccion; nx, ny = -dy, dx; out = img.copy()
    piel = np.float32([120, 150, 205]) * (0.9 + 0.2 * rng.random())
    for i in range(n):
        off = (i - (n - 1) / 2) * ancho * 1.05; bx, by = base[0] + nx * off, base[1] + ny * off
        L = largo * (0.8 + 0.35 * rng.random() if i != n // 2 else 1.1)
        p0 = (bx - dx * largo * 0.6, by - dy * largo * 0.6); p1 = (bx + dx * (L - largo * 0.6), by + dy * (L - largo * 0.6))
        m = np.zeros((H, W), np.float32); cv2.line(m, (int(p0[0]), int(p0[1])), (int(p1[0]), int(p1[1])), 1.0, int(ancho), cv2.LINE_AA)
        m = cv2.GaussianBlur(m, (0, 0), 1.5)
        dist = cv2.GaussianBlur(m, (0, 0), ancho * 0.25)
        tono = piel * (0.75 + 0.35 * dist[..., None])
        sm = np.roll(np.roll(cv2.GaussianBlur(m, (0, 0), ancho * 0.3), int(ancho * 0.25), 1), int(ancho * 0.3), 0)
        out = out * (1 - 0.35 * sm[..., None])
        out = out * (1 - m[..., None]) + tono * m[..., None]
    return out


def camara(img, rng, desenfoque=0.7, ruido=3.0):
    if desenfoque > 0: img = cv2.GaussianBlur(img, (0, 0), desenfoque)
    if ruido > 0: img = img + rng.standard_normal(img.shape).astype(np.float32) * ruido
    return np.clip(img, 0, 255).astype(np.uint8)


# ── Escenas ──
def escenas():
    cat = pagina_pdf(os.path.join(EJ, "caso1-testamento-malaga", "07-certificacion-catastral-vivienda.pdf"), 1)
    cat2 = pagina_pdf(os.path.join(EJ, "caso1-testamento-malaga", "07-certificacion-catastral-vivienda.pdf"), 2)
    ban = pagina_pdf(os.path.join(EJ, "caso1-testamento-malaga", "09-certificado-bancario-unicaja.pdf"), 1)
    nota = pagina_pdf(os.path.join(EJ, "caso1-testamento-malaga", "05-nota-simple-vivienda-malaga.pdf"), 1)
    dni = dni_plano(); mdni = mascara_redondeada(dni.shape[1], dni.shape[0], 28)
    M, Wc = (1080, 1920), (1280, 720)
    E = []
    def e(nombre, tam, doc, Q, fondo, desc, **k): E.append(dict(nombre=nombre, tam=tam, doc=doc, Q=Q, fondo=fondo, desc=desc, **k))
    h, w = cat.shape[:2]
    e("a4-madera-frontal", M, cat, inclinar(rect_centrado(*M, w, h, 0.82, 3), 0.06), "madera", "Folio sobre mesa de madera, casi de frente, buena luz")
    e("a4-madera-angulo", M, cat, inclinar(rect_centrado(*M, w, h, 0.8, -11), 0.28, 0.08), "madera", "Folio en ángulo: móvil inclinado unos 30° y girado")
    e("a4-sombra", M, nota, inclinar(rect_centrado(*M, w, h, 0.8, 4), 0.1), "madera", "Sombra del móvil y la mano sobre medio folio", sombra=[[0, 700], [1080, 1050], [1080, 1920], [0, 1920]])
    e("a4-dedos", M, ban, inclinar(rect_centrado(*M, w, h, 0.8, -3), 0.08), "granito", "Dedos sujetando el folio por el borde inferior", dedos=True)
    e("a4-poca-luz", M, cat, inclinar(rect_centrado(*M, w, h, 0.8, 6), 0.12), "madera", "Poca luz: imagen oscura, con ruido y luz cálida", nivel=0.38, tinte=(0.78, 0.92, 1.1), ruido=7)
    e("a4-reflejo", M, ban, inclinar(rect_centrado(*M, w, h, 0.8, -5), 0.1), "madera", "Reflejo de una lámpara sobre el papel cerca del borde", reflejo=True)
    e("a4-mesa-clara", M, nota, inclinar(rect_centrado(*M, w, h, 0.78, 8), 0.12), "clara", "Folio sobre mesa blanca (poco contraste con el papel)")
    e("a4-mantel", M, cat2, inclinar(rect_centrado(*M, w, h, 0.78, -7), 0.1), "tela", "Folio sobre mantel de cuadros (fondo con mucho dibujo)")
    e("a4-curvado", M, nota, inclinar(rect_centrado(*M, w, h, 0.8, 2), 0.08), "granito", "Papel combado (recién sacado de un sobre)", curva=0.025)
    e("a4-lejos", M, cat, inclinar(rect_centrado(*M, w, h, 0.42, 9, 0.48, 0.52), 0.1), "madera", "Folio pequeño en la imagen: hay que acercarse")
    e("a4-webcam", Wc, cat, inclinar(rect_centrado(*Wc, w, h, 0.9, 2), 0.05), "oscura", "Webcam del despacho (1280×720) con el folio en vertical")
    e("a4-webcam-girado", Wc, ban, inclinar(rect_centrado(*Wc, w, h, 0.88, 88), 0.05), "madera", "Webcam con el folio tumbado")
    h2, w2 = dni.shape[:2]
    e("dni-madera", M, dni, inclinar(rect_centrado(*M, w2, h2, 0.78, -6), 0.12), "madera", "DNI sobre mesa de madera", mascara=mdni)
    e("dni-mano", M, dni, inclinar(rect_centrado(*M, w2, h2, 0.74, 4), 0.06), "oscura", "DNI sujeto con los dedos por un lado", mascara=mdni, dedos=True)
    e("dni-webcam", Wc, dni, inclinar(rect_centrado(*Wc, w2, h2, 0.62, -3), 0.06), "granito", "DNI ante la webcam", mascara=mdni)
    e("dni-vertical", M, dni, inclinar(rect_centrado(*M, w2, h2, 0.9, 90), 0.08), "madera", "DNI girado en el móvil en vertical (llena el ancho)", mascara=mdni)
    e("dni-mesa-clara", M, dni, inclinar(rect_centrado(*M, w2, h2, 0.76, 7), 0.1), "clara", "DNI sobre mesa blanca", mascara=mdni)
    e("a4-45-grados", M, cat, inclinar(rect_centrado(*M, w, h, 0.86, 38), 0.08), "madera", "Folio girado unos 40°")
    e("a4-noche", M, nota, inclinar(rect_centrado(*M, w, h, 0.8, -4), 0.1), "oscura", "De noche: muy poca luz y mucho ruido sobre mesa oscura", nivel=0.24, tinte=(0.7, 0.9, 1.15), ruido=10)
    e("a4-reflejo-borde", M, cat, inclinar(rect_centrado(*M, w, h, 0.8, 3), 0.08), "clara", "Reflejo fuerte que cruza el borde del folio sobre mesa clara", reflejo="borde")
    e("a4-doblado", M, ban, inclinar(rect_centrado(*M, w, h, 0.8, -6), 0.1), "madera", "Folio que estuvo doblado en tres (pliegues con sombra)", pliegues=True)
    e("a4-mesa-objetos", M, nota, inclinar(rect_centrado(*M, w, h, 0.74, 5), 0.1), "madera", "Mesa con objetos: bolígrafo sobre una esquina y carpeta azul debajo", objetos=True)
    e("a4-sobre-papeles", M, cat, inclinar(rect_centrado(*M, w, h, 0.72, 2), 0.06), "madera", "Folio encima de otros papeles blancos desordenados", papeles=True)
    e("a4-fuera", M, nota, inclinar(rect_centrado(*M, w, h, 1.08, 3, 0.5, 0.58), 0.05), "madera", "Folio demasiado cerca: se sale por abajo (debe pedir que te alejes, no disparar)", fuera=True)
    e("sin-documento", M, None, None, "madera", "Mesa sin documento: no debe detectar nada")
    return E


def componer(sc, idx, fondo=None):
    rng = np.random.default_rng(1000 + idx); W, H = sc["tam"]; pad = int(max(W, H) * 0.05)
    WW, HH = W + 2 * pad, H + 2 * pad
    f = sc["fondo"]
    if fondo is None: fondo = madera(WW, HH, rng) if f == "madera" else liso(WW, HH, rng, (214, 218, 222), 3) if f == "clara" else liso(WW, HH, rng, (52, 48, 46), 5) if f == "oscura" else tela(WW, HH, rng) if f == "tela" else granito(WW, HH, rng)
    Q = None
    if sc.get("objetos"):  # carpeta azul que asoma por debajo del folio
        cv2.fillPoly(fondo, [np.int32([[pad + W * 0.05, pad + H * 0.55], [pad + W * 0.75, pad + H * 0.5], [pad + W * 0.85, pad + H * 0.98], [pad + W * 0.1, pad + H * 1.02]])], (150, 95, 40), cv2.LINE_AA)
    if sc.get("papeles"):  # otros papeles blancos debajo, girados y desplazados
        blanco = np.full((sc["doc"].shape[0], sc["doc"].shape[1], 3), 236, np.uint8)
        for k, (dx, dy, da) in enumerate(((-90, 60, -9), (110, -40, 7), (40, 150, 15))):
            Qp = inclinar(rect_centrado(W, H, sc["doc"].shape[1], sc["doc"].shape[0], 0.72, 2 + da, 0.5 + dx / W, 0.5 + dy / H), 0.06)
            fondo, _ = colocar(fondo, blanco, [[x + pad, y + pad] for x, y in Qp], rng, sombra=0.25)
    doc = sc["doc"]
    if sc.get("pliegues") and doc is not None:  # dos pliegues horizontales: banda de sombra y brillo
        doc = doc.astype(np.float32); hh = doc.shape[0]
        for yy in (hh // 3, 2 * hh // 3):
            g = np.exp(-((np.arange(hh) - yy) / (hh * 0.012)) ** 2)[:, None, None]; doc = doc * (1 - 0.22 * g) + 18 * np.roll(g, int(hh * 0.02), 0)
        doc = np.clip(doc, 0, 255).astype(np.uint8)
    if doc is not None:
        Q = [[x + pad, y + pad] for x, y in sc["Q"]]
        img, mw = colocar(fondo, doc, Q, rng, mascara=sc.get("mascara"), curva=sc.get("curva", 0))
    else: img = fondo
    if sc.get("objetos"):  # bolígrafo negro cruzando la esquina superior derecha
        q = Q[1]; cv2.line(img, (int(q[0] - W * 0.25), int(q[1] + H * 0.05)), (int(q[0] + W * 0.12), int(q[1] - H * 0.03)), (30, 30, 34), int(W * 0.018), cv2.LINE_AA)
    img = luz(img, np.random.default_rng(5), sc.get("nivel", 1.0), 0.22, sc.get("tinte", (1, 1, 1)))
    if sc.get("sombra"): img = sombra_proyectada(img, rng, [[x + pad, y + pad] for x, y in sc["sombra"]], 0.52)
    if sc.get("reflejo") == "borde": q = Q; img = reflejo(img, (q[1][0] + q[2][0]) / 2, (q[1][1] + q[2][1]) / 2 - 120, W * 0.2, W * 0.16, 300)
    elif sc.get("reflejo"): q = Q; img = reflejo(img, q[1][0] * 0.55 + q[2][0] * 0.45 - (q[1][0] - q[0][0]) * 0.12, (q[1][1] + q[2][1]) / 2 - 80, W * 0.17, W * 0.12, 250)
    if sc.get("dedos"):
        a, b = (Q[3], Q[2]) if sc["doc"].shape[0] > sc["doc"].shape[1] else (Q[1], Q[2])
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2; cx = sum(p[0] for p in Q) / 4; cy = sum(p[1] for p in Q) / 4
        L = math.hypot(cx - mx, cy - my); img = dedos(img, rng, (mx + (mx - cx) / L * W * 0.02, my + (my - cy) / L * W * 0.02), ((cx - mx) / L, (cy - my) / L), 3)
    return img, Q, WW, HH, pad, W, H


def fotograma(img, Q, WW, HH, pad, W, H, amp, k, semilla, ruido=2.5):
    """Una imagen del vídeo con el temblor de la mano (amp 0 = quieto) y la verdad (esquinas) transformada igual."""
    ang = amp * 1.2 * math.sin(k * 1.7); tx = amp * W * 0.018 * math.sin(k * 2.3 + 1); ty = amp * H * 0.012 * math.cos(k * 1.9)
    Mk = cv2.getRotationMatrix2D((WW / 2, HH / 2), ang, 1.0); Mk[0, 2] += tx - pad; Mk[1, 2] += ty - pad
    fr = cv2.warpAffine(img, Mk, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    v = None if Q is None else [[float(Mk[0, 0] * x + Mk[0, 1] * y + Mk[0, 2]), float(Mk[1, 0] * x + Mk[1, 1] * y + Mk[1, 2])] for x, y in Q]
    return camara(fr, np.random.default_rng(semilla), 0.8 + min(amp, 1) * 1.2, ruido), v


def generar(sc, idx):
    img, Q, WW, HH, pad, W, H = componer(sc, idx)
    frames, verdad = [], []
    for k in range(N):
        amp = max(0.0, 1 - k / QUIETO) if k < QUIETO else 0.0
        fr, v = fotograma(img, Q, WW, HH, pad, W, H, amp, k, k + 77 * idx, sc.get("ruido", 2.5)); frames.append(fr); verdad.append(v)
    return frames, verdad


def secuencia():
    """Tres papeles que se ponen y se quitan de la misma mesa, como al escanear: la certificación catastral (dos hojas) y el certificado del
    banco (otro documento). Para la prueba de varias páginas con disparo automático, dos PDF y la lectura de los campos clave."""
    cat = pagina_pdf(os.path.join(EJ, "caso1-testamento-malaga", "07-certificacion-catastral-vivienda.pdf"), 1)
    cat2 = pagina_pdf(os.path.join(EJ, "caso1-testamento-malaga", "07-certificacion-catastral-vivienda.pdf"), 2)
    ban = pagina_pdf(os.path.join(EJ, "caso1-testamento-malaga", "09-certificado-bancario-unicaja.pdf"), 1)
    M = (1080, 1920); h, w = cat.shape[:2]; rng = np.random.default_rng(4242); pad = int(max(M) * 0.05)
    mesa = madera(M[0] + 2 * pad, M[1] + 2 * pad, rng)
    pags = [dict(tam=M, doc=cat, Q=inclinar(rect_centrado(*M, w, h, 0.9, 3, 0.5, 0.5), 0.05), fondo="madera"),
            dict(tam=M, doc=cat2, Q=inclinar(rect_centrado(*M, w, h, 0.86, -7, 0.48, 0.51), 0.07), fondo="madera"),
            dict(tam=M, doc=ban, Q=inclinar(rect_centrado(*M, w, h, 0.9, 5, 0.52, 0.5), 0.06), fondo="madera")]
    frames, verdad = [], []
    vacia = componer(dict(tam=M, doc=None, fondo="madera"), 0, mesa.copy())
    for i, pg in enumerate(pags):
        comp = componer(pg, 50 + i, mesa.copy())
        for k in range(10): fr, v = fotograma(*comp, 2.5 * (1 - k / 10) + 0.2, k, 900 + len(frames)); frames.append(fr); verdad.append(v)
        for k in range(54): fr, v = fotograma(*comp, 0.0, k, 900 + len(frames)); frames.append(fr); verdad.append(v)
        for k in range(15): fr, v = fotograma(*vacia, 0.3 * math.sin(k), k, 900 + len(frames)); frames.append(fr); verdad.append(None)
    d = os.path.join(OUT, "secuencia-3-paginas"); os.makedirs(d, exist_ok=True)
    for k, fr in enumerate(frames): cv2.imwrite(os.path.join(d, "f%03d.jpg" % k), fr, [cv2.IMWRITE_JPEG_QUALITY, 90])
    vid = os.path.join(OUT, "secuencia-3-paginas.mjpeg")
    # q:v 4 y 237 imágenes: unos 20 MB (con archivos de más de unos 25 MB, la cámara falsa de Chromium no llega a arrancar)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(d, "f%03d.jpg"), "-c:v", "mjpeg", "-q:v", "4", "-pix_fmt", "yuvj420p", "-f", "mjpeg", vid], check=True)
    for f in os.listdir(d): os.remove(os.path.join(d, f))
    os.rmdir(d)
    json.dump({"video": vid, "w": M[0], "h": M[1], "imagenes": len(frames), "paginas": 3}, open(os.path.join(OUT, "secuencia.json"), "w"))
    print("escena secuencia-3-paginas", flush=True)


def main():
    if not SOLO or "secuencia-3-paginas" in SOLO: secuencia()
    if SOLO == {"secuencia-3-paginas"}: return
    E = escenas(); meta = []
    for i, sc in enumerate(E):
        if SOLO and sc["nombre"] not in SOLO: continue
        frames, verdad = generar(sc, i); W, H = sc["tam"]
        d = os.path.join(OUT, sc["nombre"]); os.makedirs(d, exist_ok=True)
        for k, fr in enumerate(frames): cv2.imwrite(os.path.join(d, "f%03d.jpg" % k), fr, [cv2.IMWRITE_JPEG_QUALITY, 92])
        vid = os.path.join(OUT, sc["nombre"] + ".mjpeg")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(d, "f%03d.jpg"), "-c:v", "mjpeg", "-q:v", "3", "-pix_fmt", "yuvj420p", "-f", "mjpeg", vid], check=True)
        # Muestras reducidas (lado mayor 360, como el bucle de detección) para medir sin navegador: RGBA crudo comprimido
        mu = []
        for k in list(range(0, QUIETO, 3)) + list(range(QUIETO, N, 4)):
            fr = frames[k]; s = 360 / max(W, H); w, h = round(W * s), round(H * s)
            r = cv2.cvtColor(cv2.resize(fr, (w, h), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGBA)
            open(os.path.join(d, "m%03d.rgba.z" % k), "wb").write(zlib.compress(r.tobytes(), 6))
            mu.append({"k": k, "w": w, "h": h, "quieto": k >= QUIETO, "verdad": None if verdad[k] is None else [[x * s, y * s] for x, y in verdad[k]]})
        # Una imagen grande (720) de la parte quieta, como la detección del disparo
        fr = frames[N - 1]; s = 720 / max(W, H); w, h = round(W * s), round(H * s)
        r = cv2.cvtColor(cv2.resize(fr, (w, h), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGBA); open(os.path.join(d, "g.rgba.z"), "wb").write(zlib.compress(r.tobytes(), 6))
        cv2.imwrite(os.path.join(OUT, sc["nombre"] + ".jpg"), cv2.resize(frames[N - 1], (W // 3, H // 3), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 80])
        meta.append({"nombre": sc["nombre"], "desc": sc["desc"], "w": W, "h": H, "tipo": "ninguno" if sc["doc"] is None else "fuera" if sc.get("fuera") else ("dni" if sc["doc"].shape[1] > sc["doc"].shape[0] * 1.3 and sc["doc"].shape[0] < 700 else "a4"),
                     "video": vid, "muestras": mu, "grande": {"w": w, "h": h, "verdad": None if verdad[N - 1] is None else [[x * s, y * s] for x, y in verdad[N - 1]]}, "verdad_final": verdad[N - 1]})
        print("escena", sc["nombre"], flush=True)
    prev = os.path.join(OUT, "escenas.json")
    old = json.load(open(prev)) if (SOLO and os.path.exists(prev)) else []
    names = {m["nombre"] for m in meta}; meta = [m for m in old if m["nombre"] not in names] + meta
    orden = [s["nombre"] for s in E]; meta.sort(key=lambda m: orden.index(m["nombre"]))
    json.dump(meta, open(prev, "w"), ensure_ascii=False, indent=1)


main()
