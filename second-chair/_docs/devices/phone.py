"""iPhone 18 Pro (Burgundy aluminium), front orthographic render.

Geometry in millimetres.
  documented (apple.com/iphone-18-pro/specs): 150.0 x 71.9 x 8.75 mm; display 2622 x 1206 px at 460 ppi
      -> active area 144.78 x 66.59 mm, centred: 2.66 mm to the outline at the sides, 2.61 at top and bottom
  measured from Apple's front-on product image (tech-specs, 4.386 px/mm, calibrated on the 150 mm height;
      mirrored width 71.66 mm vs 71.9 published):
      outline corner = superellipse quadrant, extent 15.88, n 2.53
      edge cross-section from the outline: aluminium frame 0-1.14, a rounded bead cresting ~70% in;
        dark gap, glass edge line ~1.3, black border to 2.66 (frame width refined by profile fitting)
      Dynamic Island 15.50 x 5.93 (stadium), top 5.12 below the phone top
      side button (right) 47.3-64.1 from the top, proud 0.46
      Action 31.0-37.5, volume up 43.2-53.5, volume down 57.5-67.8 (left; read from the rear-view phone, +-0.5)
  derived: display corner concentric with the outline (extent 15.88 - 2.66 = 13.22, n 2.53)
  assumed: left buttons proud by the same 0.46 as the side button
Lighting: the studio environment fitted to Apple's Watch photo (watch.ENV), so both devices are lit alike.
"""
import numpy as np, cv2, sys
from PIL import Image
from watch import superrect, sstep, env_light, ENV

P = dict(w=71.9, h=150.0, a=15.88, n=2.53,
         disp_w=1206/460*25.4, disp_h=2622/460*25.4,
         frame=1.14, glass_line=1.30,
         island=(15.50, 5.93, 5.12),
         right=[(47.3, 64.1)], left=[(31.0, 37.5), (43.2, 53.5), (57.5, 67.8)], proud=0.46,
         f0=(0.76, 0.36, 0.40), roll_h=2.4, crest=0.70)   # fitted to the frame cross-section in Apple's image          # Burgundy anodised aluminium, from the measured frame colour

def render(scale=4.386, ss=3, margin=4.0, screen=None, e=None, out=None, shadow=False, bg=None, landscape=False, frame=False):
    e = dict(ENV, **(e or {}))
    S = scale*ss
    w, h = int((P['w'] + 2*margin)*S), int((P['h'] + 2*margin)*S)
    xs = (np.arange(w)+0.5)/S - (margin + P['w']/2); ys = (np.arange(h)+0.5)/S - (margin + P['h']/2)
    X, Y = np.meshgrid(xs, ys); px = 1/S
    yt = Y + P['h']/2
    body = superrect(X, Y, P['w'], P['h'], P['a'], P['n']) <= 0
    # buttons: thin proud strips beyond the outline, rounded ends
    btn = np.zeros_like(body)
    for side, spans in ((1, P['right']), (-1, P['left'])):
        for y0, y1 in spans:
            cx = side*(P['w']/2 + P['proud']/2 - 0.4); cy = (y0+y1)/2 - P['h']/2
            btn |= superrect(X - cx, Y - cy, P['proud'] + 0.8, y1-y0, 0.45, 2.0) <= 0
    case = body | btn
    d_out = cv2.distanceTransform(case.astype(np.uint8), cv2.DIST_L2, 5) * px
    d_body = cv2.distanceTransform(body.astype(np.uint8), cv2.DIST_L2, 5) * px
    # ---- heights: frame rolls from the outline to its flat inner band; the glass sits just below ----
    fr = P['frame']
    t = np.clip(d_body/fr, 0, 1)
    # the frame's front is a rounded bead: crest ~70% in from the outline, curving down to the outline and to the glass
    tp = P['crest']
    z = np.where(t < tp, np.sqrt(np.clip(1 - ((tp - t)/tp)**2, 0, 1)),
                 np.sqrt(np.clip(1 - ((t - tp)/(1 - tp))**2 * 0.55, 0, 1)))
    z = P['roll_h'] * z
    Z = np.where(body, z, 0.0)
    # buttons: rounded profile across their protrusion
    tb = np.clip(d_out/0.35, 0, 1)
    Z = np.where(btn & ~body, 0.5*np.sqrt(np.clip(1 - (1-tb)**2, 0, 1)), Z)
    Zs = cv2.GaussianBlur(Z.astype(np.float32), (0, 0), 0.04*S)
    gy, gx = np.gradient(Zs, px)
    nrm = np.dstack([-gx, -gy, np.ones_like(gx)]); nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
    ndv = nrm[...,2]
    r = 2*ndv[...,None]*nrm - np.array([0, 0, 1.0])
    if landscape:
        # the image is turned 90 degrees anticlockwise afterwards (island to the left); light it in that final frame
        r = np.stack([r[...,1], -r[...,0], r[...,2]], axis=-1)
    L = sum(env_light(r + np.array([dx, dy, 0]), e) for dx, dy in [(0,0), (0.06,0), (-0.06,0), (0,0.06), (0,-0.06)]) / 5
    F0 = np.array(P['f0'])
    fres = F0 + (1-F0) * ((1-np.clip(ndv, 0, 1))**5)[...,None]
    img = L[...,None] * fres
    # a dark hairline where the frame meets the glass, then the glass edge (neutral, from the rounded cover glass)
    hair = (d_body > fr - 0.05) & (d_body < fr + 0.03)
    gline = np.exp(-((d_body - P['glass_line'])/0.06)**2)
    inside = d_body >= fr
    glass_rgb = np.zeros((h, w, 3), np.float32)
    gap = (d_body >= fr) & (d_body < fr + 0.45)                    # dark gap between the frame and the glass edge
    glass_rgb = glass_rgb + (0.016*gap + 0.012*gline)[...,None]
    # display
    if screen is not None:
        sw, sh = int(round(P['disp_w']*S)), int(round(P['disp_h']*S))
        scr = (np.asarray(Image.open(screen).convert('RGB').resize((sw, sh), Image.LANCZOS), np.float32)/255)**2.2
        x0 = int(round((margin + P['w']/2 - P['disp_w']/2)*S)); y0 = int(round((margin + P['h']/2 - P['disp_h']/2)*S))
        canvas = np.zeros_like(glass_rgb); canvas[y0:y0+sh, x0:x0+sw] = scr
        dm = superrect(X, Y, P['disp_w'], P['disp_h'], P['a'] - 2.66, P['n']) <= 0
        glass_rgb = np.where(dm[...,None], canvas, glass_rgb)
    dm_win = superrect(X, Y, P['disp_w'], P['disp_h'], P['a'] - 2.66, P['n']) <= 0
    # Dynamic Island: black stadium (drawn over the display)
    iw, ih, itop = P['island']
    isl = superrect(X, Y - (itop + ih/2 - P['h']/2), iw, ih, ih/2 - 1e-3, 2.0) <= 0
    glass_rgb = np.where(isl[...,None], 0.0, glass_rgb)
    img = np.where(inside[...,None], glass_rgb, img)
    img = np.where(hair[...,None], img*0.35, img)
    bgc = np.full(3, 0.965 if bg is None else bg)**2.2
    back = np.broadcast_to(bgc, img.shape).copy()
    if shadow:
        shd = cv2.GaussianBlur(case.astype(np.float32), (0,0), 2.2*S); shd = np.roll(shd, int(1.2*S), axis=0)
        back = back*(1 - 0.24*shd[...,None])
    if frame:
        alpha = (case & ~(dm_win & ~isl)).astype(np.float32)
        rgb = (np.clip(img, 0, 1)**(1/2.2)) * alpha[...,None]                    # premultiplied for clean downsampling
        rgba = np.dstack([rgb, alpha])
        small = cv2.resize(rgba, (w//ss, h//ss), interpolation=cv2.INTER_AREA)
        a = small[...,3:4]; col = np.where(a > 1e-4, small[...,:3]/np.maximum(a, 1e-4), 0)
        o = Image.fromarray((np.dstack([col, a])*255).round().clip(0, 255).astype(np.uint8), 'RGBA')
        if out: o.save(out)
        return o, case
    out_img = np.where(case[...,None], img, back)
    out_img = np.clip(out_img, 0, 1)**(1/2.2)
    o = Image.fromarray((out_img*255).round().astype(np.uint8)).resize((w//ss, h//ss), Image.LANCZOS)
    if out: o.save(out)
    return o, case

if __name__ == '__main__':
    render(out=sys.argv[1] if len(sys.argv) > 1 else 'phone.png')
