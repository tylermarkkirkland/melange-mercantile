#!/usr/bin/env python3
"""Grade a brand photograph for the site, so new images sit with the existing set.

    python3 tools/grade-photo.py "brand-assets/photos/originals/<name>.png" site/public/photos/<slug>.webp

The look: colour pulled back to 80%, blacks crushed slightly, a cool slate cast in
the shadows and a touch of warmth in the highlights. Output is 1672 x 941 WebP,
centre-cropped, like the other photos in site/public/photos.
"""
import sys

import numpy as np
from PIL import Image

SIZE = (1672, 941)


def grade(src_path, out_path):
    img = Image.open(src_path).convert("RGB")
    # fill the frame, then centre-crop to the site's size
    scale = max(SIZE[0] / img.width, SIZE[1] / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left, top = (img.width - SIZE[0]) // 2, (img.height - SIZE[1]) // 2
    img = img.crop((left, top, left + SIZE[0], top + SIZE[1]))

    a = np.asarray(img).astype(np.float32) / 255.0
    luminance = lambda x: (0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2])[..., None]

    lum = luminance(a)
    a = lum + (a - lum) * 0.80  # desaturate: keep 80% of the colour
    a = np.clip((a - 0.025) / (1 - 0.025), 0, 1)  # crush the blacks a little

    # split tone: cool slate in the shadows, warmth only where the light lands
    lum = luminance(a)
    shadow = np.clip(1 - lum / 0.45, 0, 1) ** 1.5
    high = np.clip((lum - 0.55) / 0.45, 0, 1)
    cool = np.array([0.90, 1.00, 1.10])
    warm = np.array([1.06, 1.00, 0.92])
    a = a * (1 + (cool - 1) * shadow * 0.6) * (1 + (warm - 1) * high * 0.5)

    Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).save(out_path, quality=82, method=6)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    grade(sys.argv[1], sys.argv[2])
