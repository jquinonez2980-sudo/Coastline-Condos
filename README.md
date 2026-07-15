# Coastline Condos

**Oceanfront Living, Elevated.**
Premium 3-story ocean-view condominiums — one block from the beach in Playas, Ecuador.

A bilingual (EN/ES), award-caliber luxury real estate experience: cinematic canvas effects,
an interactive WebGL 3D building explorer, a live residence configurator, a lead-gen quiz,
a concierge chat with WhatsApp hand-off, and PWA install support — all with **no build step**.

## Quick start

Serve locally (a server is required for the 3D explorer and PWA; opening `index.html`
directly still works for everything else):

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

Then visit `http://localhost:8080` — or just run `start.bat`.

## Structure

```
├── index.html            # Full page structure + SEO + PWA meta
├── css/styles.css        # Design system, components, motion, experience layer
├── js/
│   ├── i18n-extra.js     # EN/ES strings for the experience layer (loads first)
│   ├── main.js           # Core: i18n, theme, nav, gallery, floor plans, form
│   ├── effects.js        # Ocean canvas, panorama, count-ups, tilt, magnetic, cursor
│   ├── experience.js     # Quiz, Design Studio, concierge chat, PWA install
│   └── building3d.js     # 3D explorer (lazy-loads Three.js from CDN, SVG fallback)
├── sw.js                 # Service worker (offline + instant repeat visits)
├── manifest.webmanifest  # PWA manifest
├── assets/
│   ├── icon.svg / icon-maskable.svg   # App icons
│   ├── images/           # Placeholders (replace with photography)
│   └── README.md         # Asset replacement guide
└── README.md
```

## Feature highlights

- **Living ocean hero** — procedural wave + light-glitter canvas behind the hero
  (swaps seamlessly under your drone video when you add `assets/videos/ocean-hero.mp4`)
- **Interactive 3D building explorer** — drag-to-orbit WebGL model, clickable floors,
  day/night lighting; degrades to an interactive SVG elevation offline / no WebGL
- **Design Studio** — live configurator (palette, flooring, level); selections write
  into the VIP contact form
- **"Find Your Perfect Unit" quiz** — 60-second match that recommends a residence and
  pre-fills the form
- **Esmi AI concierge** — live bilingual chat (SSE) powered by the Esmi AI receptionist,
  with Esmi logo branding and WhatsApp hand-off for sales
- **Drag-to-look panorama** — procedural Playas seascape; drop in a real 360 photo via
  `data-pano-src`, or replace the block with a Matterport iframe
- **Count-up stats strip, scroll progress, magnetic buttons, 3D tilt cards, cursor aura**
- **PWA** — installable, offline-capable (bump `CACHE_VERSION` in `sw.js` on each deploy)
- **Bilingual EN/ES** with browser auto-detect; dark mode; full a11y + reduced-motion support

## Customize

1. **Media** — see `assets/README.md` (photos, `ocean-hero.mp4`, OG image).
2. **Contact** — WhatsApp numbers/email/IG in `index.html`; chat number in `js/experience.js` (`WHATSAPP`).
3. **Copy** — core strings in `js/main.js` (`i18n`); experience-layer strings in `js/i18n-extra.js`;
   quiz/chat content in `js/experience.js`.
4. **Esmi chat (Vercel env)** — set on the Coastline Vercel project:
   - `ESMI_API_URL` = Railway Esmi URL (default is production `-5375`)
   - `CHAT_PROXY_SECRET` = same secret as Railway `CHAT_PROXY_SECRET`
   - `ESMI_TENANT_ID` = `coastline-condos` (optional; proxy already defaults to this)
   Backend tenant lives in the `ai-receptionist` repo under `tenants/coastline-condos/`.
5. **Form backend** — in `js/main.js`, replace the `localStorage` lead save with a `fetch()`
   to Formspree, Netlify Forms, or your CRM.
6. **3D model** — `js/building3d.js` builds the model procedurally; swap in a real `.glb`
   (instructions in the file header).
7. **Deploy** — Vercel (required for `/api/chat` proxy). After each deploy,
   bump `CACHE_VERSION` in `sw.js` so returning visitors get the new files.

## Stack

- Tailwind CSS (CDN) + custom design-system CSS (with no-CDN fallbacks)
- Vanilla JS modules — zero dependencies, no build step
- Three.js (lazy-loaded from CDN only when the 3D section is viewed)

## License

Site template for Coastline Condos project use. Replace all placeholder media before
public launch. Renderings and specs are conceptual until finalized.
