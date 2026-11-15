# Device hardware

The Apple Watch and iPhone hardware on the site are pre-rendered frames (`assets/img/devices/*.webp`) with a transparent display window; the live, interactive screens sit beneath them. Rendered 16 November 2026.

- **Apple Watch Ultra 4**, 49 mm, Natural titanium (`watch.py`)
- **iPhone 18 Pro**, Burgundy, portrait and landscape (`phone.py`)

Geometry is in millimetres: overall sizes and display resolutions from Apple's published specifications; corner curves, rim and frame cross-sections, crown, buttons and Dynamic Island measured from Apple's front-on product images; lighting fitted to Apple's Watch photo (`fit.py`, `env_fit.json`). Each script's docstring says which values are documented, measured, derived or estimated. `compare.py` scores a render against the reference photo.

To regenerate the frames (needs numpy, scipy, opencv-python, Pillow; and `cwebp`):

```python
import phone, watch
phone.render(scale=12, ss=2, margin=0.7, frame=True, out='iphone18pro-portrait.png')
im, _ = phone.render(scale=12, ss=2, margin=0.7, frame=True, landscape=True); im.rotate(90, expand=True).save('iphone18pro-landscape.png')
watch.render(scale=14, ss=2, margin=0.4, margin_x=2.6, frame=True, out='watch-ultra4.png')
```

then `cwebp -q 90 -alpha_q 100 -m 6 X.png -o X.webp`. The display windows' positions in `assets/css/base.css` come from `apertures.json`; change both together.

The reference photos Apple's images were measured from aren't stored here.
