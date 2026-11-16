"""A woven loop band for the Apple Watch Ultra on the home page, after Apple's Trail Loop: a knitted centre in
heathered brown, near-black edges each carrying a dashed line of light stitching, and a softly squared end.

The texture is built stitch by stitch (each a small rounded bump, with per-stitch variation in the yarn's tone),
then lit gently across the width as the band curves over the wrist. No fade: the band is solid to its end.

    python3 band.py    # writes ../../assets/img/devices/watch-band-top.webp and watch-band-bottom.webp
"""
import numpy as np
from PIL import Image

W, H = 600, 468                        # matches .watch-band: 59% of the watch's width, 46cqw tall, at 2x
SS = 3                                 # supersampling for smooth stitch edges
rng = np.random.default_rng(7)

w, h = W * SS, H * SS
ys, xs = np.mgrid[0:h, 0:w].astype(float)
u = xs / w                              # 0..1 across the band
v = ys / h                              # 0..1 along it (0 = free end, 1 = at the case)

# Knit: rows of small stitches, alternate rows offset by half a stitch.
px, py = 4.6 * SS, 3.6 * SS
row = np.floor(ys / py)
off = (row % 2) * px / 2
cx = np.floor((xs + off) / px)
fx = ((xs + off) / px) - cx - .5
fy = (ys / py) - row - .5
bump = np.clip(1 - (fx / .5) ** 2 * .9 - (fy / .5) ** 2 * .8, 0, 1) ** .6     # each stitch a rounded bump
cell_tone = rng.normal(0, 1, (int(row.max()) + 2, int(cx.max()) + 2))
tone = cell_tone[row.astype(int), cx.astype(int)]

# Display (sRGB) values, as in Apple's photograph.
brown = np.array([0.27, 0.16, 0.11])
brown_hi = np.array([0.36, 0.23, 0.16])
black = np.array([0.075, 0.07, 0.068])
stitch = np.array([0.74, 0.72, 0.70])

heather = np.clip(.5 + .2 * tone, 0, 1)[..., None]
col = brown * (1 - heather) + brown_hi * heather
col = col * (.78 + .3 * bump[..., None])

# The edges: near-black knit, each with a dashed line of light stitches.
edge = 0.16
in_edge = (u < edge) | (u > 1 - edge)
col = np.where(in_edge[..., None], black * (.8 + .4 * bump[..., None]) * (1 + .12 * tone[..., None]), col)
for c in (edge * .42, 1 - edge * .42):
    near = np.abs(u - c) < 0.011
    dash = ((ys / (7 * SS)) % 1) < .45
    col = np.where((near & dash)[..., None], stitch * (.8 + .25 * bump[..., None]), col)
# A thin seam where edge meets centre.
seam = (np.abs(u - edge) < .004) | (np.abs(u - (1 - edge)) < .004)
col = np.where(seam[..., None], col * .55, col)

# The band curves over the wrist: gently darker towards its sides, slightly lit along the middle.
curve = 1 - .3 * (2 * u - 1) ** 4
col = col * curve[..., None]

# Shape: straight sides, a softly squared free end (radius ~10% of the width).
r = .1 * w
dx = np.maximum(np.maximum(r - xs, xs - (w - 1 - r)), 0)
dy = np.maximum(r - ys, 0)
inside = np.hypot(dx, dy) <= r
alpha = inside.astype(float)
# A faint darkening right at the free end, where the band turns under itself.
col = col * (1 - .35 * np.exp(-ys / (6 * SS)))[..., None]

rgba = np.concatenate([np.clip(col, 0, 1), alpha[..., None]], -1)
rgba = rgba.reshape(H, SS, W, SS, 4).mean(axis=(1, 3))
img = Image.fromarray((rgba * 255 + .5).astype(np.uint8), 'RGBA')
out = '../../assets/img/devices/'
img.save(out + 'watch-band-top.webp', quality=90)
img.transpose(Image.FLIP_TOP_BOTTOM).save(out + 'watch-band-bottom.webp', quality=90)
print('wrote', out + 'watch-band-top.webp', 'and -bottom')
