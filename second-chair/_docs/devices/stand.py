"""A MagSafe charging stand under the StandBy phone, for the home page slide (_docs/slide.html).

Rendered, not drawn: a rounded-square base and a round pole, ray-marched as signed distance fields and lit by
the phone's own screen (a red rectangle facing the camera) plus a faint fill from above, standing on a dark table
that catches the screen's light and the base's soft shadow. Proportions are taken from Apple's StandBy
photographs: base about 0.58 of the phone's width, 9 mm thick with soft edges and ~10 mm corners; pole 8 mm,
about 43 mm visible below the phone; the camera level with the phone, about 630 mm away, which shows the base's
top face at the depth the photographs do.

Units are millimetres. x right, y up, z towards the camera; the phone's centre is the origin, its front glass at
z = +4. Lighting is deliberately plain (a soft key from above, a little ambient, a hint of the screen's warmth) so it
doesn't read as a render. The output is RGB on black, composited in the page with mix-blend-mode: screen, so black adds nothing.

    python3 stand.py desktop   # 2400x1200, phone 880 px wide, centred at (1200, 390)
    python3 stand.py mobile    # 2000x1500, phone 640 px wide, centred at (1000, 380)
"""
import sys
import numpy as np
from PIL import Image

PHONE_W, PHONE_H = 151.40, 73.30                 # iPhone 18 Pro, landscape, mm
SCREEN_HW, SCREEN_HH, SCREEN_Z = 72.4, 33.3, 4.1  # the lit display
POLE_R = 4.0
BASE_HALF, BASE_T, BASE_CR, BASE_FILLET = 44.0, 9.0, 10.0, 3.2
BASE_TOP = -(PHONE_H / 2 + 43.0)                 # 43 mm of pole below the phone
BASE_Z = -8.0                                    # the pole stands just behind the phone, near the base's centre
POLE_Z = -9.0
TABLE_Y = BASE_TOP - BASE_T
CAM_D = 630.0

LAYOUTS = {
    'desktop': dict(size=(2400, 1200), phone_px=880, centre=(1200, 390)),
    'mobile':  dict(size=(2000, 1500), phone_px=640,  centre=(1000, 380)),
}


def sd_base(p):
    """Rounded square slab: corner radius in plan, soft fillet on every edge."""
    x, y, z = p[..., 0], p[..., 1], p[..., 2] - BASE_Z
    yc = y - (BASE_TOP - BASE_T / 2)
    # plan: rounded square, shrunk by the fillet
    r = BASE_CR
    qx = np.abs(x) - (BASE_HALF - r)
    qz = np.abs(z) - (BASE_HALF - r)
    d2 = np.hypot(np.maximum(qx, 0), np.maximum(qz, 0)) + np.minimum(np.maximum(qx, qz), 0) - r
    # extrude with rounded edges
    f = BASE_FILLET
    wx = d2 + f
    wy = np.abs(yc) - (BASE_T / 2 - f)
    return np.hypot(np.maximum(wx, 0), np.maximum(wy, 0)) + np.minimum(np.maximum(wx, wy), 0) - f


def sd_pole(p):
    x, y, z = p[..., 0], p[..., 1], p[..., 2] - POLE_Z
    d = np.hypot(x, z) - POLE_R
    top, bot = 0.0, BASE_TOP - 1
    h = np.maximum(y - top, bot - y)
    return np.hypot(np.maximum(d, 0), np.maximum(h, 0)) + np.minimum(np.maximum(d, h), 0)


def sd_scene(p):
    return np.minimum(sd_base(p), sd_pole(p))


def normals(p):
    e = 0.05
    n = np.stack([
        sd_scene(p + [e, 0, 0]) - sd_scene(p - [e, 0, 0]),
        sd_scene(p + [0, e, 0]) - sd_scene(p - [0, e, 0]),
        sd_scene(p + [0, 0, e]) - sd_scene(p - [0, 0, e]),
    ], -1)
    return n / np.linalg.norm(n, axis=-1, keepdims=True)


# The screen as an area light: a grid of samples, red like the StandBy UI, brighter where the artwork is.
SCREEN_COL = np.array([0.78, 0.13, 0.08])
gx, gy = np.meshgrid(np.linspace(-SCREEN_HW, SCREEN_HW, 16), np.linspace(-SCREEN_HH, SCREEN_HH, 8))
SAMPLES = np.stack([gx.ravel(), gy.ravel(), np.full(gx.size, SCREEN_Z)], -1)
SAMPLE_W = np.where(SAMPLES[:, 0] < -10, 1.5, 1.0)   # the artwork on the left is the brightest part
SAMPLE_W = SAMPLE_W / SAMPLE_W.sum()
SCREEN_AREA = 4 * SCREEN_HW * SCREEN_HH


def screen_light(p, n, occluded=None):
    """Irradiance from the screen at points p with normals n (one-sided: the screen lights only what's in front)."""
    out = np.zeros(p.shape[:-1])
    for q, w in zip(SAMPLES, SAMPLE_W):
        v = q - p
        r2 = np.sum(v * v, -1)
        r = np.sqrt(r2)
        cos_e = -v[..., 2] / r            # emission along +z
        cos_r = np.sum(n * v, -1) / r
        c = np.clip(cos_e, 0, None) * np.clip(cos_r, 0, None) / r2
        if occluded is not None:
            c = c * ~occluded(p, q)
        out += w * c
    return out * SCREEN_AREA / np.pi


def base_blocks(p, q):
    """Whether the segment p→q passes through the base's bounding slab (for the table's shadow)."""
    d = q - p
    lo = np.array([-BASE_HALF, TABLE_Y, BASE_Z - BASE_HALF])
    hi = np.array([BASE_HALF, BASE_TOP, BASE_Z + BASE_HALF])
    with np.errstate(divide='ignore', invalid='ignore'):
        t1 = (lo - p) / d
        t2 = (hi - p) / d
    tmin = np.nanmax(np.minimum(t1, t2), -1)
    tmax = np.nanmin(np.maximum(t1, t2), -1)
    return (tmax > np.maximum(tmin, 1e-4)) & (tmin < 1)


def render(layout):
    L = LAYOUTS[layout]
    W, H = L['size']
    s = L['phone_px'] / PHONE_W                  # px per mm at the phone's plane
    f = s * CAM_D
    cx, cy = L['centre']
    cam = np.array([0.0, 0.0, CAM_D])
    ys, xs = np.mgrid[0:H, 0:W].astype(float)
    dirs = np.stack([(xs + .5 - cx) / f, -(ys + .5 - cy) / f, -np.ones_like(xs)], -1)
    dirs /= np.linalg.norm(dirs, axis=-1, keepdims=True)
    img = np.zeros((H, W, 3))

    # The stand: sphere-traced only inside its bounding box on screen.
    def proj(x, y, z):
        return cx + f * x / (CAM_D - z), cy - f * y / (CAM_D - z)
    corners = [proj(x, y, z) for x in (-BASE_HALF - 2, BASE_HALF + 2) for y in (0, TABLE_Y - 2)
               for z in (BASE_Z - BASE_HALF - 2, BASE_Z + BASE_HALF + 2)]
    x0, x1 = int(min(c[0] for c in corners)) - 2, int(max(c[0] for c in corners)) + 3
    y0, y1 = int(min(c[1] for c in corners)) - 2, int(max(c[1] for c in corners)) + 3
    sub = dirs[y0:y1, x0:x1]
    tt = np.full(sub.shape[:-1], CAM_D - 200.0)
    alive = np.ones(sub.shape[:-1], bool)
    hit = np.zeros(sub.shape[:-1], bool)
    for _ in range(160):
        p = cam + sub * tt[..., None]
        d = sd_scene(p)
        newly = alive & (d < 0.01)
        hit |= newly
        alive &= ~newly & (tt < CAM_D + 300)
        tt = np.where(alive, tt + d, tt)
        if not alive.any():
            break
    p = cam + sub[hit] * tt[hit][:, None]
    n = normals(p)
    # Plain, even light: a soft key from above and in front, and a little ambient. A white stand in a dim room,
    # faintly warm from the screen, with no coloured bands or highlights.
    albedo = 0.85
    key_dir = np.array([0.0, 0.86, 0.5]); key_dir /= np.linalg.norm(key_dir)
    key = 0.16 * np.clip(np.sum(n * key_dir, -1), 0, 1)
    amb = 0.06
    col = albedo * (key + amb)[:, None] * np.array([1.0, 0.86, 0.82])
    patch = img[y0:y1, x0:x1]
    patch[hit] = col
    # A soft contact shadow where the base meets the table.
    img[y0:y1, x0:x1] = patch

    out = np.clip(img, 0, 1) ** (1 / 2.2)
    return Image.fromarray((out * 255 + .5).astype(np.uint8))


if __name__ == '__main__':
    layout = sys.argv[1] if len(sys.argv) > 1 else 'desktop'
    render(layout).save(f'stand-{layout}.png')
    print('wrote', f'stand-{layout}.png')
