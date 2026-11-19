# Device hardware

The Apple Watch and iPhone hardware on the site are pre-rendered frames (`assets/img/devices/*.webp`) with a transparent display window; the live, interactive screens sit beneath them. Rendered 16 November 2026.

- **Apple Watch Ultra**, 49 mm, Natural titanium, tan Alpine Loop (`watch-ultra-alpine.webp`, 20 November 2026): Apple's front-on product photo, not a render. Calibrated on its black sapphire (36.0 x 43.3 mm = 793 x 953 px, 22.02 px/mm; the case then measures 44.0 mm with its crown, as documented); the transparent window is the 32.88 x 40.05 mm active display (422 x 514 px at 326 ppi) centred on the sapphire, with the model's display corner (superellipse, extent 12.6 mm, n 2.87), padded sideways to the 46.9 mm frame the screen's cqw sizes assume. Its shadow silhouette is `watch-ultra-alpine-shadow.webp`. The earlier render (`watch.py`, `band.py`, `watch-ultra4*.webp`, `watch-band-*.webp`) is no longer used on the site. The case's drop-shadow silhouette (`watch-ultra4-shadow.webp`) is the frame's outline with the display filled, eroded 3 px, at quarter size.
- **StandBy stand** for the home page slide (`stand.py`)
- **iPhone 18 Pro**, portrait and landscape (`phone.py`), coloured to match the Watch: rendered with `phone.P['f0'] = watch.ENV['f0']` (natural titanium). Not a real 18 Pro finish (it's aluminium: Black, Silver, Glacier, Burgundy); the script's default is the measured Burgundy

Geometry is in millimetres: overall sizes and display resolutions from Apple's published specifications; corner curves, rim and frame cross-sections, crown, buttons and Dynamic Island measured from Apple's front-on product images; lighting fitted to Apple's Watch photo (`fit.py`, `env_fit.json`). Each script's docstring says which values are documented, measured, derived or estimated. `compare.py` scores a render against the reference photo.

To regenerate the frames (needs numpy, scipy, opencv-python, Pillow; and `cwebp`):

```python
import phone, watch
phone.render(scale=12, ss=2, margin=0.7, frame=True, out='iphone18pro-portrait.png')
im, _ = phone.render(scale=12, ss=2, margin=0.7, frame=True, landscape=True); im.rotate(90, expand=True).save('iphone18pro-landscape.png')
watch.render(scale=14, ss=2, margin=4.4, margin_x=2.6, frame=True, out='watch-ultra4.png')   # margin 4.4: room for the band lugs
```

The live screens' corner radii in `base.css` are set just inside the largest circle that still fills each window (iPhone 10.8 mm, Watch 9.2 mm), so the frame's black border hides their corners.

then `cwebp -q 90 -alpha_q 100 -m 6 X.png -o X.webp`. The display windows' positions in `assets/css/base.css` come from `apertures.json`; change both together.

The reference photos Apple's images were measured from aren't stored here.
