"""Fit the environment and rim parameters to Apple's reference profiles (top, left, bottom rim lines)."""
import numpy as np, json, watch
from PIL import Image
ref = np.asarray(Image.open('../ref/box.jpg').convert('RGB')).astype(float).mean(2)
OX, OY = 133, 109
lines = [[(331, y) for y in range(153, 175)], [(x, 280) for x in range(181, 199)], [(331, y) for y in range(493, 515)]]
def err(e):
    im, _ = watch.render(ss=2, e=e)
    r = np.asarray(im.convert('RGB')).astype(float).mean(2)
    return np.mean([np.abs(ref[y, x] - r[y-OY, x-OX]) for L in lines for (x, y) in L])
keys = {'front': (0.5, 1.0), 'front_pow': (0.2, 1.5), 'soft': (0.0, 0.8), 'soft_el': (0.3, 1.2), 'soft_w': (0.15, 0.6),
        'below': (0.0, 0.9), 'side': (0.0, 0.7), 'back': (0.0, 0.35), 'lip_tilt': (0.0, 0.2), 'roll_R': (0.8, 1.6), 'groove': (0.0, 0.2)}
e = dict(watch.ENV); best = err(e); print('start', round(best, 2))
step = {k: (hi-lo)/6 for k, (lo, hi) in keys.items()}
for it in range(5):
    for k, (lo, hi) in keys.items():
        for sgn in (1, -1):
            trial = dict(e); trial[k] = float(np.clip(e[k] + sgn*step[k], lo, hi))
            v = err(trial)
            if v < best - 0.05: best, e = v, trial; break
    step = {k: v*0.55 for k, v in step.items()}
    print('iter', it, round(best, 2))
json.dump({k: e[k] for k in keys}, open('env_fit.json', 'w'), indent=1); print(json.dumps({k: round(e[k], 3) for k in keys}))
