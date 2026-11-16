"""The Watch band: Apple's Alpine Loop, in navy, as in Apple's front-on Ultra photograph.

Alpine Loop is a two-layer textile knit from two yarns: seen front-on it's fine rows of small stitches that lean
alternately left and right in narrow columns (a chevron, or herringbone, texture), the rows alternating between the
two yarn colours so the band reads as a speckled, heathered single colour. No edge stitching (that's Trail Loop).

Size and placement (watch.py, base.css): 28 mm wide, behind the case, so it disappears into the slot between the
lugs' posts; its free end is cut across with slightly rounded corners and fades darker, as the band curves away
around the wrist.

    python3 band.py    # writes ../../assets/img/devices/watch-band-top.webp and watch-band-bottom.webp
"""
import numpy as np
from PIL import Image

W, H = 644, 330               # 28 x 14.4 mm (59.7% of the watch's width x 30cqw), ~23 px/mm
SS = 3
rng = np.random.default_rng(11)
w, h = W * SS, H * SS
ys, xs = np.mgrid[0:h, 0:w].astype(float) + .5
u = xs / w

# Stitch grid: ~0.5 x 0.43 mm, the scale of the zigzag rows in Apple's photo.
px, py = 11.5 * SS, 10.0 * SS
row = np.floor(ys / py)
col = np.floor(xs / px)
fx = xs / px - col - .5
fy = ys / py - row - .5
lean = np.where((np.floor(col / 2) % 2) == 0, 1.0, -1.0)          # columns in pairs lean left, then right
ang = np.deg2rad(38) * lean
rx = fx * np.cos(ang) + fy * np.sin(ang)
ry = -fx * np.sin(ang) + fy * np.cos(ang)
bump = np.clip(1 - (rx / .66) ** 2 - (ry / .36) ** 2, 0, 1) ** .6  # each stitch a small leaning oval

tone = rng.normal(0, 1, (int(row.max()) + 2, int(col.max()) + 2))[row.astype(int), col.astype(int)]
yarn_a = np.array([0.17, 0.22, 0.42])        # navy
yarn_b = np.array([0.11, 0.15, 0.31])        # a deeper navy
yarn = np.where(((row % 2) == 0)[..., None], yarn_a, yarn_b)
c = yarn * (1 + .07 * tone[..., None]) * (.5 + .7 * bump[..., None])   # dark gaps between stitches

# The band's thick, rounded edges and its curve over the wrist: darker towards the sides.
edge = np.clip(np.minimum(u, 1 - u) / .035, 0, 1)
c = c * (.55 + .45 * edge ** .7)[..., None] * (1 - .18 * (2 * u - 1) ** 6)[..., None]

# Into the slot: the band darkens over its last ~1.2 mm, most of it hidden behind the slot's floor.
mm = h / 14.4
d_slot = (h - ys) / mm                                      # mm from the slot end
c = c * (1 - .7 * np.exp(-d_slot / .6))[..., None]

# Towards its free end the band curves away around the wrist: a subtle fade to black over the last ~5 mm.
d_free = ys / mm                                            # mm from the free end
fade = np.clip(d_free / 5.0, 0, 1)
c = c * (.45 + .55 * fade * fade * (3 - 2 * fade))[..., None]

# The free end's corners are slightly rounded (r 0.8 mm).
r = .8 * mm
dx = np.maximum(np.maximum(r - xs, xs - (w - r)), 0)
dy = np.maximum(r - ys, 0)
alpha = np.clip(r - np.hypot(dx, dy) + .5 * SS, 0, SS) / SS
alpha = np.where((dx > 0) & (dy > 0), alpha, 1.0)
rgba = np.concatenate([np.clip(c, 0, 1), alpha[..., None]], -1)
rgba = rgba.reshape(H, SS, W, SS, 4).mean(axis=(1, 3))
img = Image.fromarray((rgba * 255 + .5).astype(np.uint8), 'RGBA')
out = '../../assets/img/devices/'
img.save(out + 'watch-band-top.webp', quality=92)
img.transpose(Image.FLIP_TOP_BOTTOM).save(out + 'watch-band-bottom.webp', quality=92)
print('wrote', out + 'watch-band-top.webp', 'and -bottom')
