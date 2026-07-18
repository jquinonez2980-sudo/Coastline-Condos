# Coastline Condos — Media Assets

## Current status

**Playas lifestyle / location photos** are installed from free **Wikimedia Commons** sources (beach, malecón, plaza, market, dining exterior, Engabao).  
See `images/playas/` (archive + `CREDITS.md`) and the wired site filenames below.

**Still replace before launch:**
- Unit card renderings (`unit-*.jpg`)
- Real condo interiors / project exterior
- Hero video remains your own (not replaced)

Contact numbers on the site match Instagram `@coastline_condos` public posts:
- WhatsApp: `+593 96 994 3941` and `+593 99 484 3667`
- Location: Km 5 Vía Data, Playas, Ecuador

---

Keep filenames the same (or update paths in `index.html`) for a drop-in swap.

## Video

| Path | Specs | Notes |
|------|--------|--------|
| `videos/ocean-hero.mp4` | 1920×1080 or 4K, H.264, muted loop, 10–30s | Hero background. Compress with HandBrake/FFmpeg. Add WebM optional for size. |
| Poster | `images/hero-poster.jpg` | First frame / still of hero (used before video loads) |
| `videos/coastline-drone.mp4` | 848×480, 13s seamless loop, ~2 MB | "Experience the View" section — real drone orbit of the building + Playas surf (from clip c587fc94). Poster: `images/drone-poster.jpg/.webp`. |
| `videos/playas-beach-cam.mp4` | 480×270, 8s loop, ~170 KB | "Live from Playas" webcam slot — real beach footage (from clip d0fa2261). Poster: `images/playas-cam-poster.jpg`. |
| `videos/residence-reel.mp4` | 608×1080 portrait, 26s loop at 0.5x speed, ~3 MB | Design Studio — finished model residence walkthrough (from Drive clip IMG_1529.MOV, 2026-07-18): marble kitchen + green-stone island, cooktop, green-tile rain shower, dusk glass wall, sunset terrace. Slowed 2x with motion interpolation. Poster: `images/residence-reel-poster.jpg/.webp`. |

All three section videos lazy-load via `video[data-lazy-src]` (js/main.js `initLazyVideos`) — they fetch and play only near the viewport, and never fetch on save-data / 2G / reduced-motion.

## Images — Lifestyle & Story

| Path | Suggested content | Alt text idea |
|------|-------------------|---------------|
| `images/lifestyle-balcony.jpg` | Sunrise from private balcony | Ocean view condo balcony in Playas Ecuador at sunrise |
| `images/lifestyle-beach.jpg` | Beach walk near building | Golden sand beach near Coastline Condos Playas |
| `images/lifestyle-interior.jpg` | Bright open living room | Modern luxury condo interior with ocean light |
| `images/playas-beach.jpg` | Playas lifestyle / surf | Playas Ecuador beach lifestyle |
| `images/playas-dining.jpg` | Local dining / ceviche | Coastal dining in Playas Ecuador |
| `images/og-hero.jpg` | 1200×630 social share | Open Graph / Twitter card |

## Unit photos

| Path | Unit |
|------|------|
| `images/unit-101.jpg` | 101 — 2BR, Planta Baja |
| `images/unit-102.jpg` | 102 — 2BR, Planta Baja |
| `images/unit-103.jpg` | 103 — 3BR, Planta Baja |
| `images/unit-201.jpg` | 201 — 2BR, 1er Piso Alto |
| `images/unit-202.jpg` | 202 — 2BR, 1er Piso Alto |
| `images/unit-203.jpg` | 203 — 3BR, 1er Piso Alto |
| `images/unit-301.jpg` | 301 — 3BR, 2do Piso Alto |
| `images/unit-302.jpg` | 302 — 4BR flagship, 2do Piso Alto |

## Gallery (masonry)

| Path |
|------|
| `images/gallery-01.jpg` … `gallery-06.jpg` |

Use high-quality JPEGs (WebP preferred if you update the HTML `src`). Lazy loading is already enabled.

## Embeds to replace in HTML

1. **Google Map** — Update the iframe `src` in `#location` with your exact pin (Google Maps → Share → Embed).
2. **Matterport / 360** — Replace the `.tour-placeholder` block in `#tour` with your iframe.
3. **Instagram** — Replace `.ig-embed-placeholder` with Elfsight / SnapWidget / official embed for `@coastline_condos`.
4. **Contact form backend** — Wire `js/main.js` form submit to Formspree, Netlify Forms, or your API (leads currently save to `localStorage` for demo).

## Optimization tips

- Resize images to max ~2000px wide for full-bleed; ~1200px for cards.
- Use `loading="lazy"` (already on non-hero images).
- Prefer WebP + JPEG fallback for production builds.
- Keep hero video under ~5–8 MB if possible.
