"""Apple Watch Ultra 4 (49 mm, Natural titanium), front orthographic render.

Geometry in millimetres.
  documented (apple.com specs): case 49 x 44 mm incl. crown, display 422 x 514 px at 326 ppi, active area 1245 mm2
  measured from Apple's front-orthographic product photo (in_the_box, 7.388 px/mm, calibrated on the 49 mm height):
    body 41.7 wide; outline corner = superellipse quadrant, extent 16.4, n 2.58
    sapphire (black) 36.0 x 43.3; corner extent 14.2, n 2.87; rim 2.84 all round
    rim cross-section from the outer edge: roll-off 0-0.27, brushed flank to 1.2, groove 1.35, polished ridge 1.62,
      flat brushed lip 1.75-2.7, dark seam 2.7-2.84
    crown y 13.7-22.6 (from case top) protruding 2.2; guard y 11.2-38.0 protruding 1.35; side button y 26.7-37.2
      protruding 1.9; Action button sliver y 21.9-35.2 on the left
  derived: display corner (circular-equivalent) radius 9.15 from 32.88 x 40.05 mm and 1245 mm2
Surfaces are height profiles; shading reflects a fitted studio environment off titanium.
"""
import numpy as np, cv2, sys
from PIL import Image

P = dict(
    body_w=41.7, body_h=49.0, body_a=16.4, body_n=2.58,
    glass_w=36.0, glass_h=43.3, glass_a=14.2, glass_n=2.87,
    disp_w=422/326*25.4, disp_h=514/326*25.4,
    guard=(11.2, 38.0, 1.35), crown=(13.7, 22.6, 2.2), button=(26.7, 37.2, 1.9), action=(21.9, 35.2),
    # band lugs (horns), measured from Apple's front-on Alpine Loop photo at ~17.2 px/mm (body 41.7 mm = 718 px):
    # 31.6 mm across, rising 3.5 mm above the body's top and below its bottom, corners r 2.0, flowing into the
    # body's shoulders through a ~2.4 mm concave fillet. The band (27 mm) runs between them into a slot 0.75 mm
    # above the body line; that slot and the band are drawn in the page (base.css), not here.
    lug_w=31.6, lug_h=3.5, lug_r=2.0, lug_fillet=2.4,
)
ENV = dict(front=0.717, front_pow=0.318, soft=0.173, soft_el=0.537, soft_w=0.343, below=0.47, side=0.265, back=0.153, lip_tilt=0.078, roll_R=1.509, groove=0.067,
           f0=(0.84, 0.75, 0.665), polish=1.22, brush=0.05, roll_h=1.5)   # fitted to Apple's photo (fit.py)

def superrect(X, Y, w, h, a, n):
    qx = np.abs(X) - (w/2 - a); qy = np.abs(Y) - (h/2 - a)
    cx = np.clip(qx, 0, None); cy = np.clip(qy, 0, None)
    return np.where((qx > 0) & (qy > 0), (cx**n + cy**n) ** (1/n) - a, np.maximum(qx, qy) - a)

def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t*t*(3-2*t)

def env_light(r, e):
    rx, ry, rz = r[...,0], r[...,1], r[...,2]
    front = e['front'] * np.clip(rz, 0, 1) ** e['front_pow']
    # overhead softbox: elevation soft_el above the camera axis (image y is down, so up is -y)
    sx, sy, sz = 0.0, -np.sin(e['soft_el']), np.cos(e['soft_el'])
    dot = np.clip(rx*sx + ry*sy + rz*sz, -1, 1)
    soft = e['soft'] * np.exp(-(np.arccos(dot)**2) / (2*e['soft_w']**2))
    L = front + soft
    L = L * (1 - e['below'] * np.clip(ry, 0, 1))          # floor side is darker
    L = L * (1 - e['side'] * np.abs(rx))
    return np.maximum(L, e['back'])

def render(scale=7.388, ss=3, margin=6.0, screen=None, e=None, out=None, shadow=False, bg=0.965, frame=False, margin_x=None):
    e = dict(ENV, **(e or {}))
    S = scale*ss
    mx = margin if margin_x is None else margin_x
    w, h = int((P['body_w'] + 2*mx + (3 if margin_x is None else 0))*S), int((P['body_h'] + 2*margin)*S)
    xs = (np.arange(w)+0.5)/S - (mx + P['body_w']/2); ys = (np.arange(h)+0.5)/S - (margin + P['body_h']/2)
    X, Y = np.meshgrid(xs, ys); px = 1/S
    yt = Y + P['body_h']/2; right = P['body_w']/2
    body = superrect(X, Y, P['body_w'], P['body_h'], P['body_a'], P['body_n']) <= 0
    # lugs: one rounded block across the top and bottom, merged into the shoulders with a concave fillet
    lugs = superrect(X, Y, P['lug_w'], P['body_h'] + 2*P['lug_h'], P['lug_r'], 2.0) <= 0
    kf = max(3, int(2*P['lug_fillet']*S)) | 1
    # padded first, so the frame's edge doesn't erode the lugs' tops
    padded = cv2.copyMakeBorder((body | lugs).astype(np.uint8), kf, kf, kf, kf, cv2.BORDER_CONSTANT, value=0)
    body = cv2.morphologyEx(padded, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kf, kf)))[kf:-kf, kf:-kf].astype(bool)
    glass = superrect(X, Y, P['glass_w'], P['glass_h'], P['glass_a'], P['glass_n']) <= 0
    def part(y0, y1, prot, r):
        cy = (y0+y1)/2 - P['body_h']/2
        return superrect(X - (right - 2 + (prot+2)/2), Y - cy, prot+2, y1-y0, r, 2.0) <= 0
    guard, crown, button = part(*P['guard'], 0.7), part(*P['crown'], 1.2), part(*P['button'], 1.6)
    case = body | guard | crown | button
    # concave fillets where the guard meets the body: close the outline with a 0.5 mm disc
    k = max(3, int(1.4*S)) | 1          # concave fillets where the guard swells out of the case side
    case = cv2.morphologyEx(case.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))).astype(bool)
    d_out = cv2.distanceTransform(case.astype(np.uint8), cv2.DIST_L2, 5) * px          # in from the outline
    g = cv2.distanceTransform((~glass).astype(np.uint8), cv2.DIST_L2, 5) * px          # out from the sapphire
    # ---- rim cross-section (heights in mm, relative) ----
    R = e['roll_R']
    roll = e['roll_h'] * np.sqrt(np.clip(1 - (1 - np.clip(d_out/R, 0, 1))**2, 0, 1))         # convex flank to the outline
    lip = 1.50 - e['lip_tilt']*np.clip(g - 0.14, 0, None)
    z = np.where(g < 1.60, lip, roll)
    groove = (g > 1.33) & (g < 1.60)
    z = z - e['groove']*np.exp(-((g-1.47)/0.07)**2)                                           # V groove
    z = z - 0.12*sstep(0.12, 0.0, g) * (g < 0.14)                                     # seam at the sapphire
    Z = np.where(case, z, 0.0)
    Z = np.where(glass, 1.40, Z)
    # crown: cylinder lying across the side (axis along x), ribbed; side button: rounded pill face
    cr = crown & (X > right - 1.0)                                # set into the guard, ~3.1 mm visible
    yc0, yc1 = P['crown'][0], P['crown'][1]; Rc = (yc1 - yc0)/2
    t = (yt - (yc0+yc1)/2)/Rc
    rib = 0.16*np.abs(np.sin((yt - yc0)/(yc1-yc0)*np.pi*6.5))**0.6
    xend = right + P['crown'][2]                                   # crown tip
    tip = np.sqrt(np.clip(1 - (np.clip(X - (xend - 0.55), 0, None)/0.55)**2, 0, 1))
    rib = 0.28*np.abs(np.sin((yt - yc0)/(yc1-yc0)*np.pi*6.5))**0.45
    zc = (1.5*np.sqrt(np.clip(1 - t**2, 0, 1)) + rib) * (0.35 + 0.65*tip)
    Z = np.where(cr, zc, Z)
    bt = button & (X > right + 1.30)                               # only the proud outer strip shows from the front
    yb0, yb1 = P['button'][0], P['button'][1]
    tb = np.minimum(yt - yb0, yb1 - yt)
    zb = Z + 0.06*np.sqrt(np.clip(1 - (1 - np.clip(tb/0.9, 0, 1))**2, 0, 1))
    Z = np.where(bt, zb, Z)
    Zs = cv2.GaussianBlur(Z.astype(np.float32), (0, 0), 0.055*S)
    gy, gx = np.gradient(Zs, px)
    nrm = np.dstack([-gx, -gy, np.ones_like(gx)]); nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
    ndv = nrm[...,2]
    r = 2*ndv[...,None]*nrm - np.array([0, 0, 1.0])
    # brushed: average the reflection over a small spread across the brushing direction
    Lb = sum(env_light(r + np.array([dx, dy, 0]), e) for dx, dy in [(0,0), (e['brush'],0), (-e['brush'],0), (0,e['brush']), (0,-e['brush'])]) / 5
    Lp = env_light(r, e)
    ridge = sstep(1.08, 1.16, g) * (1 - sstep(1.28, 1.36, g))
    L = np.where(ridge > 0, (1-ridge)*Lb + ridge*Lp*e['polish'], Lb)
    F0 = np.array(e['f0'])
    fres = F0 + (1-F0) * ((1-np.clip(ndv, 0, 1))**5)[...,None]
    metal = L[...,None] * fres
    ribn = np.clip(rib/0.28, 0, 1)
    crown_tone = (0.30 + 0.48*ribn**1.6) * (0.75 + 0.25*np.clip(1 - (X - right)/P['crown'][2], 0, 1))   # dark grooves, bright ribs, darker towards the tip
    metal = np.where(cr[...,None], metal*crown_tone[...,None], metal)                                  # crown: darker, bead-blasted
    # cavity shadows: the gap around the crown and the hairline around the side button
    def ring(m, wmm):
        k = max(3, int(wmm*S)) | 1
        dil = cv2.dilate(m.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))).astype(bool)
        return dil & ~m & case
    metal = np.where(ring(cr, 0.30)[...,None], metal*0.38, metal)
    metal = np.where(ring(bt, 0.10)[...,None], metal*0.70, metal)
    # Action button: anodised orange, visible only as the sliver on the outer left edge
    act = case & (X < -P['body_w']/2 + 0.6) & (yt > P['action'][0]) & (yt < P['action'][1])
    orange = np.array([0.80, 0.20, 0.035])
    metal = np.where(act[...,None], orange * (0.55 + 0.6*np.clip(L, 0, 1))[...,None], metal)
    vent = case & (X < -P['body_w']/2 + 0.35) & (yt > 17.6) & (yt < 20.4) & (np.abs(np.sin((yt-17.6)/2.8*np.pi*3)) > 0.55)
    metal = np.where(vent[...,None], metal*0.40, metal)
    img = metal
    # sapphire: black; screen if given
    glass_rgb = np.zeros((h, w, 3), np.float32)
    if screen is not None:
        sw, sh = int(round(P['disp_w']*S)), int(round(P['disp_h']*S))
        scr = (np.asarray(Image.open(screen).convert('RGB').resize((sw, sh), Image.LANCZOS), np.float32)/255)**2.2
        x0 = int(round((margin + P['body_w']/2 - P['disp_w']/2)*S)); y0 = int(round((margin + P['body_h']/2 - P['disp_h']/2)*S))
        canvas = np.zeros_like(glass_rgb); canvas[y0:y0+sh, x0:x0+sw] = scr
        dm = superrect(X, Y, P['disp_w'], P['disp_h'], 12.6, 2.87) <= 0               # corner sized to the 1245 mm2 active area
        glass_rgb = np.where(dm[...,None], canvas, glass_rgb)
    img = np.where(glass[...,None], glass_rgb, img)
    dm_win = superrect(X, Y, P['disp_w'], P['disp_h'], 12.6, 2.87) <= 0
    bgc = np.full(3, bg)**2.2
    back = np.broadcast_to(bgc, img.shape).copy()
    if shadow:
        sh = cv2.GaussianBlur(case.astype(np.float32), (0,0), 1.4*S)
        sh = np.roll(sh, int(0.8*S), axis=0)
        back = back * (1 - 0.22*sh[...,None])
    if frame:
        alpha = (case & ~dm_win).astype(np.float32)
        rgb = (np.clip(img, 0, 1)**(1/2.2)) * alpha[...,None]
        small = cv2.resize(np.dstack([rgb, alpha]), (w//ss, h//ss), interpolation=cv2.INTER_AREA)
        a = small[...,3:4]; col = np.where(a > 1e-4, small[...,:3]/np.maximum(a, 1e-4), 0)
        o = Image.fromarray((np.dstack([col, a])*255).round().clip(0, 255).astype(np.uint8), 'RGBA')
        if out: o.save(out)
        return o, case
    out_img = np.where(case[...,None], img, back)
    out_img = np.clip(out_img, 0, 1) ** (1/2.2)
    o = Image.fromarray((out_img*255).round().astype(np.uint8)).resize((w//ss, h//ss), Image.LANCZOS)
    if out: o.save(out)
    return o, case

if __name__ == '__main__':
    render(out=sys.argv[1] if len(sys.argv) > 1 else 'watch.png')
