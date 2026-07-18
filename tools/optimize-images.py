#!/usr/bin/env python3
"""Generate WebP + responsive JPEG variants for site images."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "assets" / "images"
OUT = IMG  # write alongside originals

# Site-facing photos (not the full playas/ source mirror)
TARGETS = [
    "hero-poster.jpg",
    "og-hero.jpg",
    "lifestyle-balcony.jpg",
    "lifestyle-beach.jpg",
    "lifestyle-interior.jpg",
    "playas-beach.jpg",
    "playas-dining.jpg",
    "gallery-01.jpg",
    "gallery-02.jpg",
    "gallery-03.jpg",
    "gallery-04.jpg",
    "gallery-05.jpg",
    "gallery-06.jpg",
    "unit-101.jpg",
    "unit-102.jpg",
    "unit-103.jpg",
    "unit-201.jpg",
    "unit-202.jpg",
    "unit-203.jpg",
    "unit-301.jpg",
    "unit-302.jpg",
]

# Widths for responsive srcset (skip widths larger than source)
WIDTHS = [480, 768, 1200, 1600]


def save_jpeg(im: Image.Image, path: Path, quality: int = 78) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = im.convert("RGB")
    rgb.save(path, "JPEG", quality=quality, optimize=True, progressive=True)


def save_webp(im: Image.Image, path: Path, quality: int = 72) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = im.convert("RGB")
    rgb.save(path, "WEBP", quality=quality, method=6)


def resize_width(im: Image.Image, width: int) -> Image.Image:
    if im.width <= width:
        return im.copy()
    h = max(1, round(im.height * (width / im.width)))
    return im.resize((width, h), Image.Resampling.LANCZOS)


def process(rel: str) -> None:
    src = IMG / rel
    if not src.exists():
        print(f"skip missing: {rel}")
        return

    im = Image.open(src)
    stem = src.stem
    parent = src.parent

    # Full-size optimized WebP (for simple picture fallback)
    full_webp = parent / f"{stem}.webp"
    save_webp(im, full_webp, quality=74 if stem == "hero-poster" else 70)
    print(f"  {full_webp.relative_to(ROOT)}  {full_webp.stat().st_size/1024:.0f}KB  ({im.width}x{im.height})")

    # Responsive widths
    for w in WIDTHS:
        if im.width < w * 0.95:
            continue
        resized = resize_width(im, w)
        # Prefer WebP for srcset; also write small JPEG for ancient browsers
        webp_path = parent / f"{stem}-w{w}.webp"
        jpg_path = parent / f"{stem}-w{w}.jpg"
        q_webp = 76 if w <= 768 else 70
        q_jpg = 80 if w <= 768 else 75
        if stem == "hero-poster":
            q_webp = 78
            q_jpg = 82
        save_webp(resized, webp_path, quality=q_webp)
        save_jpeg(resized, jpg_path, quality=q_jpg)
        print(
            f"  {webp_path.name}: {webp_path.stat().st_size/1024:.0f}KB  "
            f"{jpg_path.name}: {jpg_path.stat().st_size/1024:.0f}KB  ({w}w)"
        )

    # Also re-compress the original JPEG in place if oversized (>250KB) and not OG
    # Keep originals for max quality fallbacks — only touch hero poster for LCP
    if stem == "hero-poster" and src.stat().st_size > 120_000:
        # Write optimized full JPEG (overwrite) at reasonable quality for LCP
        opt = resize_width(im, min(1920, im.width))
        save_jpeg(opt, src, quality=82)
        print(f"  recompressed {rel}: {src.stat().st_size/1024:.0f}KB")


def main() -> None:
    print("Optimizing images…")
    for rel in TARGETS:
        print(rel)
        process(rel)
    print("Done.")


if __name__ == "__main__":
    main()
