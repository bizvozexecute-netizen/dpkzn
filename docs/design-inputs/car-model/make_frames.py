"""Собирает дизайн-кадры из пре-рендеров public/anatomy в docs/design-inputs/car-model/.
Запуск из корня репозитория: python3 -I docs/design-inputs/car-model/make_frames.py "$PWD"
Источник — только кадры public/anatomy (рендеры Blender купленного кроссовера)."""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

root = Path(sys.argv[1])
src = root / "public/anatomy"
out = root / "docs/design-inputs/car-model"
out.mkdir(parents=True, exist_ok=True)
W = 1280
BRASS = (201, 166, 107)  # --accent из src/styles/tokens.css
palette = json.loads((src / "zone_palette.json").read_text())


def fit(im):
    return im.convert("RGB").resize((W, round(im.height * W / im.width)), Image.LANCZOS)


def save(im, name):
    q = im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    p = out / name
    q.save(p, "PNG", optimize=True)
    print(f"{name}\t{im.width}x{im.height}\t{p.stat().st_size // 1024} KB")


def mask(station, zone):
    m = Image.open(src / f"mask_{station}_{zone}.png").convert("LA")
    l, a = m.split()
    return ImageChops.multiply(l, a)


def highlight(station, zones, fill):
    base = Image.open(src / f"still_{station}.webp").convert("RGB")
    m = Image.new("L", base.size, 0)
    for z in zones:
        m = ImageChops.lighter(m, mask(station, z))
    color = Image.new("RGB", base.size, BRASS)
    # заливка зоны латунью (как fill в anatomy.json → highlight.fillByStation)
    img = Image.composite(color, base, m.point(lambda v: round(v * fill)))
    # контур + свечение из той же маски (highlight.contour)
    edge = ImageChops.subtract(m.filter(ImageFilter.MaxFilter(5)), m.filter(ImageFilter.MinFilter(3)))
    glow = edge.filter(ImageFilter.GaussianBlur(6)).point(lambda v: min(255, v * 2))
    img = Image.composite(color, img, ImageChops.lighter(glow.point(lambda v: v * 0.7), edge))
    return fit(img)


def zone_map(station):
    base = Image.open(src / f"still_{station}.webp").convert("RGB")
    img = base
    for z, rgb in palette.items():
        f = src / f"mask_{station}_{z}.png"
        if f.exists():
            img = Image.composite(Image.new("RGB", base.size, tuple(rgb)), img,
                                  mask(station, z).point(lambda v: round(v * 0.55)))
    return fit(img)


frames = [
    ("01-3q-front.png", "still_S0.webp"),
    ("02-profile.png", "spin/beauty_18.webp"),
    ("03-3q-rear.png", "spin/beauty_26.webp"),
    ("04-top-closest-hood.png", "still_S1.webp"),
    ("05-closeup-headlight.png", "still_S2.webp"),
]
for name, f in frames:
    save(fit(Image.open(src / f)), name)

save(highlight("S0", ["hood", "front_bumper", "front_fenders", "headlights"], 0.5),
     "06-zones-ppf-front-S0.png")

sources = sorted({f for _, f in frames} | {"still_S0.webp"} |
                 {f"mask_S0_{z}.png" for z in ["hood", "front_bumper", "front_fenders", "headlights"]})
for f in sources:
    print(hashlib.sha256((src / f).read_bytes()).hexdigest(), "public/anatomy/" + f)
for p in sorted(out.glob("*.png")):
    print(hashlib.sha256(p.read_bytes()).hexdigest(), p.name)
