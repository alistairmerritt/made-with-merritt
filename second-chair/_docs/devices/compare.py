"""Compare a watch render with Apple's reference photo at matched scale: rim profiles, silhouette overlap, side by side."""
import numpy as np, sys
from PIL import Image, ImageChops
REF = '../ref/box.jpg'; OX, OY = 133, 109          # render origin in reference pixels (6 mm margin at 7.388 px/mm)

def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(int)

def profiles(render_path):
    ref = load(REF); r = load(render_path)
    lines = {'top (x=331, y151-177)': [(331, y) for y in range(151, 178)],
             'left (y=280, x175-201)': [(x, 280) for x in range(175, 202)],
             'bottom (x=331, y491-517)': [(331, y) for y in range(491, 518)],
             'crown (x=490, y250-330)': [(490, y) for y in range(250, 331, 4)],
             'button (x=493, y345-430)': [(493, y) for y in range(345, 431, 5)]}
    tot = []
    for name, pts in lines.items():
        a = np.array([ref[y, x].mean() for x, y in pts]); b = np.array([r[y-OY, x-OX].mean() for x, y in pts])
        err = np.abs(a-b).mean(); tot.append(err)
        print(f'{name:26s} mean |diff| {err:5.1f}   ref {" ".join(f"{v:3.0f}" for v in a)}')
        print(f'{"":26s}                 mine {" ".join(f"{v:3.0f}" for v in b)}')
    print(f'OVERALL mean |diff| {np.mean(tot):.1f}')

def silhouette_iou(render_path):
    ref = load(REF)[OY:OY+450, OX:OX+410]; r = load(render_path)[:450, :410]
    m1 = np.abs(ref - 246).sum(2) > 28; m2 = np.abs(r - 246).sum(2) > 28
    iou = (m1 & m2).sum() / (m1 | m2).sum()
    g1 = ref.mean(2) < 30; g2 = r.mean(2) < 30
    giou = (g1 & g2).sum() / (g1 | g2).sum()
    print(f'silhouette IoU {iou:.4f}   glass IoU {giou:.4f}   (pixels differing: case {(m1 ^ m2).sum()}, glass {(g1 ^ g2).sum()})')
    # overlay: reference edges in red, render edges in cyan
    import cv2
    e1 = cv2.Canny(m1.astype(np.uint8)*255, 50, 150) > 0; e2 = cv2.Canny(m2.astype(np.uint8)*255, 50, 150) > 0
    ov = (ref*0.5 + 127).astype(np.uint8); ov[e1] = [230, 40, 40]; ov[e2] = [0, 190, 230]; ov[e1 & e2] = [0, 0, 0]
    Image.fromarray(ov).resize((820, 900), Image.NEAREST).save(render_path.replace('.png', '_overlay.png'))

def side_by_side(render_path, out):
    ref = Image.open(REF).crop((OX, OY, OX+410, OY+450)); r = Image.open(render_path).crop((0, 0, 410, 450))
    s = Image.new('RGB', (830, 450), (255, 255, 255)); s.paste(ref, (0, 0)); s.paste(r, (420, 0))
    s.resize((1660, 900), Image.LANCZOS).save(out)

if __name__ == '__main__':
    p = sys.argv[1]; profiles(p); silhouette_iou(p); side_by_side(p, p.replace('.png', '_sbs.png'))
