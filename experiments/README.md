# Open Outcry Experiments

Fun-track prototypes live here until they earn promotion into the stable design-system contract.

## Depth Tape — WebGL Lab 01

Open `depth-tape.html` through an HTTP server:

```bash
cd ~/Github/open-outcry
python -m http.server 8000
# http://localhost:8000/experiments/depth-tape.html
```

### Intent

A Broadcast-led hero with one Console instrument behind it: perspective market lanes and signal slabs recede into the desk. Three.js supplies spatial machinery, not decorative 3D.

### Constraints

- one dominant first-read object;
- no particles, orbit controls, bloom stack, glass cards, or fake market metrics;
- linear feed motion and restrained pointer drift only;
- render pixel ratio capped at `1.5`;
- rendering pauses when the document or viewport is not visible;
- reduced-motion, unavailable WebGL, and initialization failure retain a static SVG instrument;
- `depth-tape.bundle.js` is a browser-ready IIFE bundle containing the experiment and Three.js, so runtime module loading cannot fail silently on static hosts.

### Promotion gate

The experiment remains fun-track and does **not** alter `tokens.css` or `components.css`. Consider serious/public promotion only if:

1. the visual reads as Open Outcry before it reads as “Three.js demo”;
2. desktop and phone hero crops preserve the editorial first-read;
3. static fallback is compositionally complete rather than degraded;
4. the effect stays smooth with capped DPR and no post-processing;
5. it earns a real public surface or explanatory role, not merely novelty.

### Dependency

- Three.js `0.185.1`
- MIT license preserved at `vendor/THREE-LICENSE.txt`
- source module retained at `vendor/three.module.min.js`; MIT license at `vendor/THREE-LICENSE.txt`
- rebuild: copy `depth-tape.js` to a scratch directory, replace its local Three.js import with `import * as THREE from 'three'`, then bundle with `esbuild --bundle --minify --format=iife --platform=browser --legal-comments=eof`
- current bundle SHA-256: `3fd33dce43ef7070550167568ea02d6fb44825b530fd937f8556780891f64bb1`
