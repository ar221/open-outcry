# Depth Tape — Experiment Receipt

**Track:** fun; possible serious/public promotion only after test-driving  
**Artifact:** `experiments/depth-tape.html`  
**Built:** 2026-07-24  
**Design system:** Open Outcry v1.4, Broadcast-led with one Console instrument

## What shipped

- Three.js perspective grid with moving signal slabs and sparse semantic markers.
- Pointer drift without orbit controls or camera theatrics.
- Pause/resume chrome, capped device pixel ratio, and offscreen/document visibility pausing.
- Static SVG fallback for reduced motion, missing WebGL, or renderer faults.
- Responsive desktop and phone compositions.
- Local Three.js source + license and a static-host-safe browser bundle.

## Verification

- `node --check` passed for source and bundle.
- HTML parser and local-asset assertions passed.
- `git diff --check` passed.
- Headless Chromium reported `data-renderer="webgl"`, status `WEBGL LIVE`, and a resized WebGL canvas.
- Headless Chromium rendered screenshots at `1440×900` and `390×844` without horizontal overflow.
- Runtime dependency is local; no CDN is required after the Google-hosted fonts.

## Critique

### Keep

- Editorial headline remains the first read while the spatial machinery occupies the right/back field.
- Perspective grid and segmented lanes read as a market desk rather than a generic particle scene.
- Amber/peach/green/red stay functional; no blue atmosphere, bloom soup, or glass cards.
- Phone composition stacks the instrument beneath the copy instead of shrinking the desktop scene.

### Watch

- The bundled experiment is roughly 528 KiB uncompressed. Fine for fun-track test-driving; serious promotion should measure compressed transfer and first render on a real phone.
- Canvas typography is intentionally secondary and may soften at oblique depth. Do not move essential content into WebGL.
- Visual review used rendered screenshots and terminal image inspection because the configured browser vision model was unavailable.

## Serious-track gate

Promote only if Ayaz likes the live feel **and** the experiment earns a specific public role. Promotion should start as one scoped hero/plate, not a global Open Outcry primitive. Do not change `tokens.css` or `components.css` before that evidence exists.