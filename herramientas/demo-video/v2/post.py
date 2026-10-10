# python3 post.py RAWDIR OUTDIR [procs]  → promedia submuestras, profundidad de campo en los bordes y aberración cromática radial
import sys, json, glob, os
import numpy as np
from PIL import Image, ImageFilter
from multiprocessing import Pool
raw, out = sys.argv[1], sys.argv[2]; P = int(sys.argv[3]) if len(sys.argv) > 3 else 4
os.makedirs(out, exist_ok=True)
W, H = 1920, 1080
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
r = np.sqrt(((xx - W / 2) / (W * .62)) ** 2 + ((yy - H * .48) / (H * .60)) ** 2)
MASK = np.clip((r - .52) / .48, 0, 1) ** 1.5
MASK = MASK[..., None]
def ca(im, px):
    k = px / 960.0
    if k < 1e-4: return im
    rr, gg, bb = im.split()
    def sc(ch, s):
        w2, h2 = round(W * s), round(H * s)
        c = ch.resize((w2, h2), Image.BILINEAR)
        l, t = (w2 - W) // 2, (h2 - H) // 2
        if s >= 1: return c.crop((l, t, l + W, t + H))
        bg = ch.copy(); bg.paste(c, (-l, -t)); return bg
    return Image.merge('RGB', (sc(rr, 1 + k), gg, sc(bb, 1 - k)))
def job(p):
    f = p['f']; fs = sorted(glob.glob(f'{raw}/f{f:05d}_*.jpg'))
    acc = None
    for x in fs:
        a = np.asarray(Image.open(x), dtype=np.float32)
        acc = a if acc is None else acc + a
    acc /= len(fs)
    d = p.get('dof', 0)
    if d > .3:
        bl = np.asarray(Image.fromarray(acc.astype(np.uint8)).filter(ImageFilter.GaussianBlur(d)), dtype=np.float32)
        acc = acc * (1 - MASK) + bl * MASK
    im = Image.fromarray(np.clip(acc + .5, 0, 255).astype(np.uint8))
    im = ca(im, p.get('ca', 1.2))
    im.save(f'{out}/f{f:05d}.jpg', quality=95)
    return f
if __name__ == '__main__':
    ps = {}
    for fn in glob.glob(f'{raw}/params-*.jsonl'):
        for ln in open(fn):
            if ln.strip(): q = json.loads(ln); ps[q['f']] = q
    todo = [q for f, q in sorted(ps.items()) if not os.path.exists(f'{out}/f{f:05d}.jpg') or '--force' in sys.argv]
    with Pool(P) as pool:
        for i, _ in enumerate(pool.imap_unordered(job, todo, chunksize=4)):
            if i % 500 == 0: print('post', i, '/', len(todo), flush=True)
    print('post done', len(todo))
