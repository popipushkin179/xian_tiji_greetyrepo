# xian_tiji_greetyrepo

A small, soft birthday page with a scroll-driven film. Built with Astro, GSAP ScrollTrigger and Lenis.

- Scroll scrubs three video clips as AVIF frame sequences drawn on canvas (decoded in a sliding window to bound memory).
- GPU petals, hearts and sparkles in raw WebGL2.
- Heart and flower "magic circles" on double-click or double-tap, with a rare cake every 6th to 8th cast.
- A scrapbook act with photos, a video, draggable stickers and a blow-out-the-candles moment.

```bash
npm install
npm run dev      # local dev
npm run build    # static output in dist/
```

Frame sequences are produced by `tools/make_frames.py` (needs ffmpeg and Pillow). See `ATTRIBUTIONS.md` for credits.
