# Open Outcry Experiments

Fun-track prototypes live here until they earn promotion into the stable design-system contract.

Start at `index.html` — the contact sheet. It indexes all five labs, uses each lab's own
static fallback SVG as its thumbnail, and deliberately carries **no WebGL of its own**, so
it loads instantly and survives a dead GPU.

```bash
cd ~/Github/open-outcry
python -m http.server 8000
# http://localhost:8000/experiments/index.html
```

## Labs

| # | Lab | Register | Intent | Runtime |
|---|---|---|---|---|
| 01 | [Depth Tape](depth-tape.html) | Broadcast | Perspective market lanes receding into the desk | own bundle `depth-tape.bundle.js` |
| 02 | [Candle Field](candle-field.html) | Console | 90 real sessions as extruded bodies along time | shared `vendor/three.iife.js` + `lab-shell.js` |
| 03 | [CRT Volume](crt-volume.html) | Console | The console voice as a curved phosphor slab | shared `vendor/three.iife.js` + `lab-shell.js` |
| 04 | [Blueprint](blueprint.html) | Console | The repo's own pipeline drawn in depth | shared `vendor/three.iife.js` + `lab-shell.js` |
| 05 | [Tape Ribbon](tape-ribbon.html) | Broadcast | The quote tape swept into a physical band | shared `vendor/three.iife.js` + `lab-shell.js` |

Snapshot date across the data-driven labs: **2026-07-26** (`data/market-2026-07-26.json`,
Alpha Vantage, baked — never fetched live). Neither `tokens.css` (v1.3) nor
`components.css` (v1.4) was modified by any lab; the contract is unchanged.

### Two runtimes, on purpose

Labs 02–05 share one `vendor/three.iife.js`. Lab 01 keeps its own
`depth-tape.bundle.js` and was **not** migrated onto the shared runtime, because that
bundle's SHA-256 is a recorded verification artifact — it is pinned in the Lab 01
dependency section below and the bundle is checked in alongside `DEPTH-TAPE-RECEIPT.md`,
so re-pointing the page at a different file would silently invalidate the recorded hash.
The cost is two checked-in copies of the same Three.js `0.185.1`: 540,603 bytes for Lab
01's experiment-plus-Three bundle and 726,603 bytes for the shared runtime.

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
- source module retained at `vendor/three.module.min.js` — **but see the warning below: that
  file is a split build and is not importable standalone.** Lab 01 is unaffected, because
  `depth-tape.html` loads its own self-contained bundle rather than the module.
- rebuild: copy `depth-tape.js` to a scratch directory, replace its local Three.js import with `import * as THREE from 'three'`, then bundle with `esbuild --bundle --minify --format=iife --platform=browser --legal-comments=eof`
- current bundle SHA-256: `3fd33dce43ef7070550167568ea02d6fb44825b530fd937f8556780891f64bb1`

## Shared Three.js runtime — Labs 02–05

`vendor/three.iife.js` is a classic script that sets `window.THREE`. Each of Labs 02–05
loads it before its own ES module, so a lab's scene code never performs runtime module
resolution and cannot fail silently on a static host.

- Three.js `0.185.1`, MIT license at `vendor/THREE-LICENSE.txt` (the same license covers
  this build — no second license file was added).
- Bundle SHA-256: `a86eec659703fb7b53fd06b0edfb4532b0032adc24e09bc441f1998f33ec2de7`
- Bundle size: 726,603 bytes.

### ⚠ `vendor/three.module.min.js` is NOT importable standalone

Three.js `0.185.1` ships a **split build**: `three.module.min.js` re-exports from a sibling
`three.core.min.js` via a relative import. Only the module file was ever vendored here, so
any bundle attempted from `vendor/three.module.min.js` alone fails outright:

```
✘ [ERROR] Could not resolve "./three.core.min.js"
    three.js:6:4426: ...from"./three.core.min.js";...
```

The missing sibling must be fetched from the matching upstream package and placed beside
the module in the build directory. It is deliberately **not** committed — it only ever
exists in a scratch dir.

### Rebuild recipe (as it actually ran)

```bash
# 1. Scratch workspace
mkdir -p /tmp/oo-build
cat > /tmp/oo-build/entry.js <<'EOF'
import * as THREE from 'three';
window.THREE = THREE;
EOF
cp experiments/vendor/three.module.min.js /tmp/oo-build/three.js

# 2. Fetch the split-build sibling three.core.min.js — this step is mandatory,
#    see the warning above. Verify the tarball's module file is byte-identical to
#    the vendored one before trusting its core file.
cd /tmp/oo-build
npm pack three@0.185.1
tar xzf three-0.185.1.tgz
diff -q package/build/three.module.min.js three.js   # must be identical (exit 0)
cp package/build/three.core.min.js /tmp/oo-build/three.core.min.js

# 3. Bundle to IIFE
npx --yes esbuild@0.25.0 entry.js \
  --bundle --minify --format=iife --platform=browser \
  --legal-comments=eof \
  --alias:three=/tmp/oo-build/three.js \
  --outfile=three.iife.js

# 4. Install
cp three.iife.js experiments/vendor/three.iife.js

# 5. Verify
node --check experiments/vendor/three.iife.js
node -e "
  global.window = global;
  require('./experiments/vendor/three.iife.js');
  if (!global.THREE || !global.THREE.WebGLRenderer) throw new Error('THREE global missing');
  console.log('THREE global OK, revision', global.THREE.REVISION);
"
sha256sum experiments/vendor/three.iife.js   # must match the SHA above
```

## Verification — `verify-lab.sh`

```bash
cd ~/Github/open-outcry/experiments
./verify-lab.sh candle-field        # → PASS [candle-field] desktop + phone + fallback
```

It resolves its own directory, serves the repo root on port `8731` so `../tokens.css`
resolves, and drives headless Chrome through `chrome-devtools-axi`. What it asserts:

1. **Syntax** — `node --check` on `<lab>.js` and on `lab-shell.js`.
2. **Live WebGL** — `data-renderer` is `webgl` at 1440×900.
3. **Sized canvas** — `canvas.width > 0`.
4. **Horizontal overflow** — `scrollWidth - innerWidth <= 0` at **both** 1440×900 and
   390×844.
5. **Vertical overflow** — at 1440×900 only, and deliberately not the literal mirror of
   the horizontal probe. Every lab from 02 on lets its *footer rail* sit below the fold at
   1440×900 (44 px on `candle-field`, 45 px on `crt-volume`), so
   `scrollHeight - innerHeight <= 0` would fail shipped pages for a deliberate choice.
   What must not fall below the fold is the **readout rail** — the four `.oo-stat` figures
   are the page's data. The probe takes the lowest `.oo-stat` bottom minus `innerHeight`
   and asserts `<= 0`; labs with no such rail (Lab 01 predates it) report `none` and skip.
6. **A compositionally complete fallback** — `?render=fallback` yields
   `data-renderer=fallback` and a `[data-lab-static]` element taller than 200 px.

Screenshots land in `/tmp/oo-verify/<lab>-{desktop,phone,fallback}.png`.

`./verify-lab.sh depth-tape` **is expected to fail** at step 6 — Lab 01 predates the
`?render=fallback` seam and has no `[data-lab-static]`. It clears steps 1–5. Do not use
Lab 01 as the template for the fallback seam.

`verify-lab.sh` does not apply to `index.html`: there is no canvas and no `<lab>.js`.
That page is verified by link count, horizontal overflow at both widths, and a click-through
of all five rows.

No `CHROME_DEVTOOLS_AXI_CHROME_ARGS="--enable-unsafe-swiftshader"` workaround was needed —
headless Chrome rendered WebGL here without extra flags. Don't add it pre-emptively.

### Parsing `chrome-devtools-axi eval` output

`verify-lab.sh`'s `probe()` is written against `chrome-devtools-axi` **v0.1.26**
specifically, and any other script shelling out to `eval` needs the same handling:

- `eval` prints a `result:` line **followed by a help footer**, so the value is never the
  last line and naive `tail -n1` returns the footer text;
- the value is **double-JSON-encoded** (once by the page, once by the CLI's display layer),
  so `"webgl"` arrives as `result: "\"webgl\""` and `1440` as `result: "1440"`.

`probe()` therefore extracts the `result:` line with `sed` and unwraps the quoting twice.
An earlier `tail -n1` version made every probe silently return garbage and the very first
assertion fail spuriously.

## Verification seams

Both are **verification affordances, not user-facing features.** Neither is linked from any
page, and both are inert unless explicitly present in the query string.

- **`?render=fallback`** — forces the static still: `lab-shell.js` short-circuits
  initialization, sets `data-renderer="fallback"`, reveals `[data-lab-static]` and retires
  the pause control. This is how the fallback is asserted without disabling the GPU.
- **`?reveal=full`** — pins a lab's one-shot reveal clock to completion so screenshots are
  deterministic. Deliberately the weaker sibling: it does **not** touch the renderer path,
  the scene stays live WebGL, and everything else keeps animating. Labs with no reveal clock
  never read it. It exists because `verify-lab.sh`'s fixed `wait 1200` was sampling an ~8 s
  draw-and-hold cycle on Lab 04 and banked a frame with four apparently-dangling edges — a
  capture artifact that read as a geometry defect. The clock still advances; only the value
  fed to the strokes is pinned. The fallback capture deliberately does **not** carry
  `?reveal=full`, so `?render=fallback` is asserted against exactly the same URL as before.

## Fallbacks

Every lab from 02 on keeps a hand-authored or generator-emitted static SVG that is
compositionally complete rather than degraded — it is the reduced-motion path, the
no-WebGL path and the no-JS path, so it has to read on its own. Two conventions worth
knowing before editing one:

- `data-lab-static` sits on a wrapper `<div>`, **never on the `<svg>`**. `hidden` is an
  `HTMLElement` IDL attribute and `SVGElement` does not implement it, so
  `el.static.hidden = false` would write a dead expando and leave the still
  `display: none` forever.
- Stills are letterboxed (`preserveAspectRatio="xMidYMid meet"`), never cropped. A sliced
  fallback is a degraded fallback.

**Lab 05's still has a narrow variant.** Below 900 px a CSS gate swaps the swept band for a
legible column of all seven quotes. The swept form is simply the wrong shape for a 350 px
box: one fixed `viewBox` scaled into it puts 15 px type at ~4 px per glyph, and not one
figure is readable. The reduced-motion path is the reason this is not cosmetic — a reader
with `prefers-reduced-motion: reduce` never sees the animation, so on a phone the still is
their *entire* view of the plate, and phone is the commonest viewport. The precedent set at
Labs 03/04 allows **cropping** when what remains reads and forbids **shrinking** glyphs
under readability; this was the forbidden half. Both variants carry the same seven figures,
character for character, from the same snapshot. The trade: at 390 px the fallback delivers
the plate's data faithfully and its *form* not at all.

## Known limitations

Recorded so nobody re-derives them.

- **`verify-lab.sh`'s vertical assertion has ~45 px of slack.** `.lab-viewport` is
  `flex: 1 1 auto` with `min-height: 62svh`, so the plate absorbs the first ~15 px of
  readout growth by shrinking to its floor before the rail moves at all; add ~31 px of
  headroom on the shipped pages and the guard is not knife-edge. It catches the class of
  regression that actually happened (a draft reached 906 px against a 900 px frame), but a
  single extra wrapped line will not always trip it.
- **The vertical assertion runs at 1440×900 only.** There is no 390×844 sibling.
- **`.oo-stage` is capped at 1080 px** and the labs are 1440 px instruments, so every lab
  page — and now the contact sheet — re-declares the stage anatomy locally with a wider
  ceiling: six copies inside `experiments/` alone (`.depth-stage`, `.lab-stage` ×4,
  `.sheet-stage`), of exactly the boilerplate `components.css` v1.4 promoted `.oo-stage` to
  retire. A `--oo-stage-max` token or an `.oo-stage--wide` modifier would fix it.
- **`.oo-btn` defeats the `hidden` attribute.** It declares `display: inline-flex`, which
  outranks the UA `[hidden] { display: none }` rule that `lab-shell.js` uses to retire the
  pause control, so `.oo-btn[hidden] { display: none }` is restated page-locally in all four
  shell labs. Same for `.lab-canvas[hidden]` / `.lab-static[hidden]`. A contract-side
  `[hidden]` guard would retire it for every consumer.
- **No canvas/still swap primitive exists.** `.lab-viewport`, `.lab-canvas`, `.lab-static`
  and the viewport vignette are page-local in all four shell labs, byte-for-byte apart from
  the vignette stop. Strongest promotion candidate.
- **The viewport vignette is a per-lab magic gradient**, hand-tuned in opposite directions
  across labs from the same starting rule. Wants a `--oo-vignette-*` knob.
- **`.oo-stat-value` clamps to 28–40 px**, which competes with the display title when a stat
  strip sits *under* a hero; every lab re-derives a dense variant. `.oo-tape` is likewise
  `white-space: nowrap; overflow: hidden` because it is built for a scrolling
  `.oo-tickwrap`, so a static line in it must opt back into wrapping or be silently
  truncated at 390 px.
- **Lab 03 renders a history it changes.** Its eight log lines and its `8 / 46` commit stat
  are a dated snapshot of this branch, labelled as such in-source; committing the lab made
  them stale by one. A live `git log` shell-out is not available to a static page. Re-capture
  is the only honest fix.
- **Lab 03's phone plate shows ~28 of 81 columns.** Accepted: crop, do not retreat. Fitting
  the 16 × 6 slab by width at aspect 0.77 needs ~2.8× the camera distance, which puts 24 px
  sheet glyphs at ~6 px on screen.
- **Lab 02's scan covers roughly bars 20–88** at desktop, so the oldest ~20 of the 90
  sessions are off-frame. This is the price of bounding the two-copy wrap seam off the right
  edge; every figure in the readout still describes all 90.
- **Lab 04 is at its type floor** (~6.3 px per glyph on desktop) and relative type size in
  that plate is zero-sum: the fit is bound by label ink on both axes, so enlarging a caption
  only increases the solved camera distance and hands the pixels straight back. There is no
  room for another ink box without pushing a file name under reading size.
- **Lab 04 is scoped to the CSS contract only.** The labs' real dependencies on
  `vendor/three.iife.js`, `lab-shell.js` and `depth-tape.bundle.js` are deliberately not
  drawn — a second subsystem in a plate that announces one.
- **Lab 05's narrow-still guarantee is structural, not exhaustive.** The in-frame span
  exceeds two quote widths, backed by six samples across a full sheet cycle. Shortening the
  narrow band or raising `FIT_TRIM` erodes that margin first.
- **On every lab the still wins on annotation density and the live plate wins the first
  read.** That is the intended split, not a defect — but it means no lab's live plate
  dominates its own fallback on information.
