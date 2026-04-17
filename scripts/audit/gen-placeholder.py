#!/usr/bin/env python3
"""Brand-aligned preview placeholder generator.

Usage:
    python3 gen-placeholder.py <output-path> <title> [subtitle]

Outputs a 800×500 .webp with:
  - warm paper bg (#F5F1E8)
  - network-of-nodes decoration (variable per title hash)
  - PŘIPRAVUJEME tag
  - Title (Georgia/Times serif)
  - Optional subtitle
"""
from __future__ import annotations

import hashlib
import os
import sys
from PIL import Image, ImageDraw, ImageFont


W, H = 800, 500
BG = (245, 241, 232)           # warm paper
INK = (17, 17, 17)             # near-black text
MUTED = (115, 109, 100)        # muted text

# Pool of brand-friendly accent colors (rotated per title hash)
ACCENTS = [
    (27, 125, 138),    # petrol — main brand
    (91, 75, 138),     # soft plum
    (14, 116, 144),    # cyan-teal
    (180, 83, 9),      # warm amber
    (27, 42, 74),      # deep navy
    (120, 53, 15),     # sienna
]


def accent_for(title: str) -> tuple[int, int, int]:
    h = int(hashlib.md5(title.encode("utf-8")).hexdigest(), 16)
    return ACCENTS[h % len(ACCENTS)]


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates += [
            "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
            "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        ]
    else:
        candidates += [
            "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
            "/System/Library/Fonts/Supplemental/Georgia.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def generate(output_path: str, title: str, subtitle: str = "") -> None:
    accent = accent_for(title)
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img, "RGBA")

    # Top color wash
    for y in range(80):
        a = int(40 * (1 - y / 80))
        draw.line([(0, y), (W, y)], fill=(*accent, a))

    # Deterministic node positions (stable per title)
    rng_seed = int(hashlib.md5(title.encode("utf-8")).hexdigest(), 16)
    import random
    rnd = random.Random(rng_seed)
    circles = []
    for _ in range(5):
        cx = rnd.randint(100, 700)
        cy = rnd.randint(140, 320)
        r = rnd.randint(45, 80)
        circles.append((cx, cy, r))

    for cx, cy, r in circles:
        draw.ellipse(
            (cx - r, cy - r, cx + r, cy + r),
            fill=(*accent, 35),
            outline=(*accent, 120),
            width=2,
        )

    # Edges between nearby circles
    for i, a in enumerate(circles):
        for j, b in enumerate(circles[i + 1:], i + 1):
            dx, dy = b[0] - a[0], b[1] - a[1]
            if dx * dx + dy * dy < 240 * 240:
                draw.line(
                    [(a[0], a[1]), (b[0], b[1])],
                    fill=(*MUTED, 110),
                    width=1,
                )

    # Tag + title + subtitle
    tag_font = load_font(18)
    title_font = load_font(54, bold=True)
    sub_font = load_font(22)

    draw.text((60, 360), "PŘIPRAVUJEME", font=tag_font, fill=accent)
    draw.text((60, 385), title, font=title_font, fill=INK)
    if subtitle:
        draw.text((60, 455), subtitle, font=sub_font, fill=MUTED)

    img.save(output_path, "WEBP", quality=88)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: gen-placeholder.py <output-path> <title> [subtitle]", file=sys.stderr)
        sys.exit(2)
    out = sys.argv[1]
    t = sys.argv[2]
    sub = sys.argv[3] if len(sys.argv) > 3 else ""
    generate(out, t, sub)
    print(f"Saved: {out} ({os.path.getsize(out)} bytes)")
