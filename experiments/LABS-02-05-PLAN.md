# WebGL Labs 02–05 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four standalone three.js instruments — Candle Field, CRT Volume, Blueprint Schematic, Tape Ribbon — plus a shared harness, a baked market-data snapshot, and a contact sheet, all as fun-track experiments that leave the Open Outcry v1.4 contract untouched.

**Architecture:** A shared `lab-shell.js` owns every renderer concern Lab 01 proved (DPR cap, visibility pause, fallback, resize, teardown) and exposes a two-method interface — `build(ctx)` and `update(ctx, dt)` — that each lab implements and nothing more. Labs load one shared `vendor/three.iife.js` global build. Market numbers come from a single Alpha Vantage fetch frozen to a dated JSON at build time, so nothing calls an API at runtime.

**Tech Stack:** Three.js 0.185.1 (vendored, MIT), plain ES modules, no framework, no bundler for lab code, `esbuild` via `npx` for the shared runtime only. Verification through `node --check` and headless Chrome driven by `chrome-devtools-axi`.

**Spec:** `experiments/LABS-02-05-DESIGN.md`
**Baseline:** Lab 01 Depth Tape at commit `eab412e` — read `experiments/depth-tape.js` before Task 3; it is the reference implementation the shell is extracted from.

## Global Constraints

Every task inherits these. They come from `../` design-language spec §2, §5, §6 and from the Lab 01 receipt.

- **Never modify `../tokens.css` or `../components.css`.** The contract is frozen at v1.4. A lab that needs a new primitive logs friction in its receipt instead.
- **Never modify Lab 01** (`depth-tape.html`, `depth-tape.js`, `depth-tape.bundle.js`). Its bundle SHA-256 `3fd33dce43ef7070550167568ea02d6fb44825b530fd937f8556780891f64bb1` is a recorded verification artifact.
- **Colors come from tokens only.** Hex literals allowed in JS only where they mirror a token, with the token named in a comment. Palette: `--oo-amber #f2a51f`, `--oo-amber-dim #b57b24`, `--oo-amber-line #9b6822`, `--oo-peach #e8927c`, `--oo-terracotta #d67c50`, `--oo-green #48dc7d`, `--oo-green-deep #1f9d55`, `--oo-red #e0455a`, `--oo-console-stage #070807`, `--oo-broadcast-stage #181210`, `--oo-fg #eee8df`, `--oo-muted #686564`.
- **Blue (`#5aa7ff`) and violet (`#b77aff`) are forbidden** in every lab — no atmosphere, no surface, no decoration.
- **Banned entirely:** particles, orbit controls, post-processing/bloom, glass cards, parallax layers, animated gradients as decoration, bounce/elastic easing, glitch as a default state.
- **Motion is `linear` or `steps()` only.** No easing curves anywhere.
- **`renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))`** — never uncapped.
- **Square hardware:** `border-radius` 0–2px, via `var(--oo-radius)`.
- **No fake numbers.** Every figure on a plate is real and traceable to `data/market-<date>.json` or to real local output. No lorem, no placeholder metrics, not even temporarily.
- **Fonts:** JetBrains Mono everywhere; Pixelify Sans for Console display; Fraunces for Broadcast display only. Max two faces per plate plus the quotation exception.
- **Copy:** never use seamless, powerful, delightful, unlock, revolutionary, supercharge.
- **Commit after every task.** Never `git add -A`; stage the exact paths listed.

---

## File Structure

| Path | Responsibility |
|---|---|
| `experiments/verify-lab.sh` | Repeatable verification: syntax, live render, fallback render, overflow, screenshots. Generic over labs. |
| `experiments/vendor/three.iife.js` | Shared Three.js runtime exposing global `THREE`. Built once. |
| `experiments/lab-shell.js` | Renderer lifecycle, pause, fallback, resize, teardown. Knows nothing about any specific scene. |
| `experiments/data/market-<date>.json` | Frozen Alpha Vantage snapshot: daily OHLC bars + quote tape. |
| `experiments/candle-field.{html,js}` | Lab 02, Console. |
| `experiments/crt-volume.{html,js}` | Lab 03, Console. |
| `experiments/blueprint.{html,js}` | Lab 04, Console. |
| `experiments/tape-ribbon.{html,js}` | Lab 05, Broadcast. |
| `experiments/index.html` | Contact sheet. No WebGL. |
| `experiments/*-RECEIPT.md` | One receipt per lab, shaped like `DEPTH-TAPE-RECEIPT.md`. |

Each lab `.js` should stay under ~300 lines. If geometry construction pushes past that, the lab is doing too much — split the builders into a sibling module rather than growing the file.

---

## Task 1: Verification harness

The harness comes first and is proven against Lab 01, which is known-good and committed. If the harness passes a lab that is actually broken, every later task inherits a false green.

**Files:**
- Create: `experiments/verify-lab.sh`

**Interfaces:**
- Produces: `./verify-lab.sh <lab-basename>` — exits 0 on pass, non-zero with a named failure on any check. Writes screenshots to `/tmp/oo-verify/<lab>-{desktop,phone,fallback}.png`.

- [ ] **Step 1: Write the harness**

```bash
#!/usr/bin/env bash
# Verify one Open Outcry WebGL lab. Usage: ./verify-lab.sh candle-field
set -euo pipefail

LAB="${1:?usage: verify-lab.sh <lab-basename>}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHOTS="/tmp/oo-verify"
PORT=8731
BASE="http://127.0.0.1:${PORT}/experiments/${LAB}.html"

mkdir -p "$SHOTS"

fail() { echo "FAIL [$LAB] $*" >&2; exit 1; }

# 1. Syntax
node --check "${DIR}/${LAB}.js" || fail "node --check"
[ -f "${DIR}/lab-shell.js" ] && { node --check "${DIR}/lab-shell.js" || fail "node --check lab-shell"; }

# 2. Serve the repo root so ../tokens.css resolves
python -m http.server "$PORT" --directory "${DIR}/.." >/dev/null 2>&1 &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null || true' EXIT
sleep 1

probe() { chrome-devtools-axi eval "$1" 2>/dev/null | tail -n 1; }

# 3. Desktop: live renderer + no horizontal overflow
chrome-devtools-axi open "$BASE" >/dev/null
chrome-devtools-axi resize 1440 900 >/dev/null
chrome-devtools-axi wait 1200 >/dev/null
RENDERER="$(probe "document.querySelector('[data-renderer]').dataset.renderer")"
echo "$RENDERER" | grep -q webgl || fail "expected data-renderer=webgl, got '$RENDERER'"
OVERFLOW="$(probe "document.documentElement.scrollWidth - window.innerWidth")"
[ "${OVERFLOW//[^0-9-]/}" -le 0 ] 2>/dev/null || fail "horizontal overflow at 1440: ${OVERFLOW}px"
CANVAS="$(probe "document.querySelector('canvas').width")"
[ "${CANVAS//[^0-9]/}" -gt 0 ] || fail "canvas not sized"
chrome-devtools-axi screenshot "${SHOTS}/${LAB}-desktop.png" >/dev/null

# 4. Phone: no overflow, composition stacks
chrome-devtools-axi resize 390 844 >/dev/null
chrome-devtools-axi wait 800 >/dev/null
OVERFLOW="$(probe "document.documentElement.scrollWidth - window.innerWidth")"
[ "${OVERFLOW//[^0-9-]/}" -le 0 ] 2>/dev/null || fail "horizontal overflow at 390: ${OVERFLOW}px"
chrome-devtools-axi screenshot "${SHOTS}/${LAB}-phone.png" >/dev/null

# 5. Fallback path is a real composition, not a blank frame
chrome-devtools-axi open "${BASE}?render=fallback" >/dev/null
chrome-devtools-axi resize 1440 900 >/dev/null
chrome-devtools-axi wait 600 >/dev/null
RENDERER="$(probe "document.querySelector('[data-renderer]').dataset.renderer")"
echo "$RENDERER" | grep -q fallback || fail "?render=fallback did not force fallback, got '$RENDERER'"
STATIC_H="$(probe "document.querySelector('[data-lab-static]').getBoundingClientRect().height")"
[ "${STATIC_H%%.*}" -gt 200 ] 2>/dev/null || fail "fallback composition too small: ${STATIC_H}px"
chrome-devtools-axi screenshot "${SHOTS}/${LAB}-fallback.png" >/dev/null

echo "PASS [$LAB] desktop + phone + fallback"
```

- [ ] **Step 2: Make it executable and run it against Lab 01 to verify it fails correctly**

Lab 01 has no `?render=fallback` seam and no `data-lab-static` attribute, so it must fail at the fallback check. That failure proves the harness actually asserts rather than rubber-stamping.

Run:
```bash
cd ~/Github/open-outcry/experiments
chmod +x verify-lab.sh
./verify-lab.sh depth-tape
```

Expected: passes steps 1–4, then `FAIL [depth-tape] ?render=fallback did not force fallback, got 'webgl'`.

If it instead fails at step 3 with `expected data-renderer=webgl`, headless Chrome has no GPU available — re-run with `CHROME_DEVTOOLS_AXI_CHROME_ARGS="--enable-unsafe-swiftshader"` exported, and record that requirement in the README in Task 9.

- [ ] **Step 3: Commit**

```bash
cd ~/Github/open-outcry
git add experiments/verify-lab.sh
git commit -m "experiments: add verify-lab.sh — repeatable lab verification

Asserts syntax, live WebGL render, capped-DPR canvas sizing, absence of
horizontal overflow at 1440x900 and 390x844, and a compositionally
complete fallback via the ?render=fallback seam.

Proven against Lab 01: passes the live checks and correctly fails the
fallback check, which Lab 01 predates."
```

---

## Task 2: Shared Three.js runtime

**Files:**
- Create: `experiments/vendor/three.iife.js`

**Interfaces:**
- Produces: global `THREE` on `window`, loaded by every Lab 02–05 HTML file via a plain `<script src="vendor/three.iife.js"></script>` before the lab module.

- [ ] **Step 1: Build the IIFE bundle from the vendored module**

```bash
cd ~/Github/open-outcry/experiments
mkdir -p /tmp/oo-build
cat > /tmp/oo-build/entry.js <<'EOF'
import * as THREE from 'three';
window.THREE = THREE;
EOF
cp vendor/three.module.min.js /tmp/oo-build/three.js
cd /tmp/oo-build
npx --yes esbuild@0.25.0 entry.js \
  --bundle --minify --format=iife --platform=browser \
  --legal-comments=eof \
  --alias:three=/tmp/oo-build/three.js \
  --outfile=three.iife.js
cp three.iife.js ~/Github/open-outcry/experiments/vendor/three.iife.js
```

- [ ] **Step 2: Verify it parses and exposes the global**

Run:
```bash
cd ~/Github/open-outcry/experiments
node --check vendor/three.iife.js
node -e "
  global.window = global;
  require('./vendor/three.iife.js');
  if (!global.THREE || !global.THREE.WebGLRenderer) throw new Error('THREE global missing');
  console.log('THREE global OK, revision', global.THREE.REVISION);
"
sha256sum vendor/three.iife.js
```

Expected: `THREE global OK, revision 185` and a SHA-256 to record in the commit message.

- [ ] **Step 3: Confirm the license file already covers this build**

Run: `head -3 vendor/THREE-LICENSE.txt`

Expected: the MIT text is already present from Lab 01. The new bundle is the same library — no new license file needed. If `--legal-comments=eof` produced a license banner in the bundle, that is expected and stays.

- [ ] **Step 4: Commit**

```bash
cd ~/Github/open-outcry
git add experiments/vendor/three.iife.js
git commit -m "experiments: add shared Three.js IIFE runtime for Labs 02-05

One global build shared by four labs instead of four self-contained
bundles, which would ship roughly 2 MiB of duplicated Three.js. Lab 01
keeps its own bundle so the SHA-256 in its receipt stays a valid
verification artifact.

Three.js 0.185.1, MIT, license preserved at vendor/THREE-LICENSE.txt.
Rebuild recipe recorded in experiments/README.md.
Bundle SHA-256: <paste from step 2>"
```

---

## Task 3: Market data snapshot

**Files:**
- Create: `experiments/data/market-<YYYY-MM-DD>.json` (the ISO fetch date)

**Interfaces:**
- Produces: a JSON document with this exact shape, consumed by Labs 02 and 05 and by the contact sheet's tape:

```json
{
  "fetched": "2026-07-26",
  "source": "Alpha Vantage",
  "bars": {
    "symbol": "SPY",
    "series": [
      { "date": "2026-07-25", "open": 0, "high": 0, "low": 0, "close": 0, "volume": 0 }
    ]
  },
  "tape": [
    { "symbol": "SPY", "last": 0, "change": 0, "changePercent": 0 }
  ]
}
```

- [ ] **Step 1: Fetch the daily bars**

Call the Alpha Vantage MCP tool `TIME_SERIES_DAILY` with `symbol: "SPY"`, `outputsize: "compact"` (returns the last 100 trading days; the lab uses the most recent 90).

- [ ] **Step 2: Fetch the quote tape**

Call the Alpha Vantage MCP tool `REALTIME_BULK_QUOTES` with `symbol: "SPY,QQQ,IWM,DIA,GLD,TLT,VIX"`. If `REALTIME_BULK_QUOTES` is unavailable on the current plan, fall back to seven individual `GLOBAL_QUOTE` calls and merge them.

- [ ] **Step 3: Write the normalized snapshot**

Transform both responses into the shape above and write to `experiments/data/market-<today>.json`. Take exactly the most recent 90 bars, oldest-first. Round prices to 2 decimals, percentages to 2 decimals. Do not invent, pad, or interpolate any missing field.

**If either fetch fails, stop here.** Do not write a partial or synthetic file, and do not proceed to Task 5 or Task 8 — those labs cannot be built without real data. Tasks 4, 6, and 7 do not depend on this file and may proceed.

- [ ] **Step 4: Verify the snapshot**

Run:
```bash
cd ~/Github/open-outcry/experiments
node -e "
  const fs = require('fs');
  const f = fs.readdirSync('data').find(n => n.startsWith('market-'));
  const d = JSON.parse(fs.readFileSync('data/' + f));
  if (d.bars.series.length !== 90) throw new Error('expected 90 bars, got ' + d.bars.series.length);
  if (!d.tape.length) throw new Error('empty tape');
  for (const b of d.bars.series) {
    for (const k of ['date','open','high','low','close','volume']) {
      if (b[k] === undefined || b[k] === null) throw new Error('missing ' + k + ' on ' + b.date);
    }
    if (b.high < b.low) throw new Error('high < low on ' + b.date);
  }
  const dates = d.bars.series.map(b => b.date);
  if (dates.join() !== [...dates].sort().join()) throw new Error('bars not oldest-first');
  console.log('snapshot OK:', f, d.bars.series.length, 'bars,', d.tape.length, 'quotes');
"
```

Expected: `snapshot OK: market-<date>.json 90 bars, 7 quotes`

- [ ] **Step 5: Commit**

```bash
cd ~/Github/open-outcry
git add experiments/data/
git commit -m "experiments: bake dated Alpha Vantage snapshot for Labs 02 and 05

90 daily SPY bars plus a seven-symbol quote tape, fetched once and frozen
so labs stay static-host-safe, work offline, and never put an API key in
client code. Every figure a lab renders traces back to this file, and the
fetch date is printed on each plate that consumes it."
```

---

## Task 4: The shared lab shell

Read `experiments/depth-tape.js` first. This task extracts lines 35–62 (capability gate, fallback/live state), 191–199 (resize), 217–249 (loop, pause), and 251–312 (init, observers, teardown), and generalizes them. The scene builders in that file stay behind — they are Lab 01's content, not harness.

**Files:**
- Create: `experiments/lab-shell.js`

**Interfaces:**
- Consumes: global `THREE` from Task 2.
- Produces:
  - `createLab(config)` where `config` is `{ data, clearColor, fogDensity, camera: {fov, position: [x,y,z], lookAt: [x,y,z]}, pointer: boolean, build(ctx), update(ctx, dt) }`
  - The shell finds its DOM itself via the `data-renderer`, `data-lab-viewport`, `data-lab-canvas`, `data-lab-static`, `data-lab-status`, and `data-lab-control` attributes. Labs pass no element references — every lab page carries the same six hooks, which is also what makes `verify-lab.sh` generic.
  - `clearColor` is a palette key string (`'consoleStage'` or `'broadcastStage'`), not a color value
  - `ctx` passed to `build` and `update` is `{ THREE, scene, camera, palette, pointer, data }`
  - `palette` is `{ amber, amberDim, amberLine, peach, terracotta, green, greenDeep, red, fg, muted, consoleStage, broadcastStage }`, all `THREE.Color`
  - `pointer` is a `THREE.Vector2` in `[-1, 1]`, already smoothed; it stays at `(0,0)` when `config.pointer` is false
  - `config.data` is whatever the lab HTML passed in — Labs 02 and 05 pass the parsed snapshot

- [ ] **Step 1: Write the shell**

```js
// lab-shell.js — shared harness for Open Outcry WebGL labs 02-05.
// Owns renderer lifecycle only. Knows nothing about any specific scene.
// Extracted from Lab 01 (depth-tape.js) after it proved the pattern.

const PALETTE_HEX = {
  amber: 0xf2a51f,          // --oo-amber
  amberDim: 0xb57b24,       // --oo-amber-dim
  amberLine: 0x9b6822,      // --oo-amber-line
  peach: 0xe8927c,          // --oo-peach
  terracotta: 0xd67c50,     // --oo-terracotta
  green: 0x48dc7d,          // --oo-green
  greenDeep: 0x1f9d55,      // --oo-green-deep
  red: 0xe0455a,            // --oo-red
  fg: 0xeee8df,             // --oo-fg
  muted: 0x686564,          // --oo-muted
  consoleStage: 0x070807,   // --oo-console-stage
  broadcastStage: 0x181210, // --oo-broadcast-stage
};

export function createLab(config) {
  const THREE = window.THREE;
  const el = {
    stage: document.querySelector('[data-renderer]'),
    viewport: document.querySelector('[data-lab-viewport]'),
    canvas: document.querySelector('[data-lab-canvas]'),
    static: document.querySelector('[data-lab-static]'),
    status: document.querySelector('[data-lab-status]'),
    control: document.querySelector('[data-lab-control]'),
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const forced = new URLSearchParams(window.location.search).get('render');

  const palette = {};
  for (const [name, hex] of Object.entries(PALETTE_HEX)) {
    palette[name] = new THREE.Color(hex);
  }

  const pointer = new THREE.Vector2(0, 0);
  const targetPointer = new THREE.Vector2(0, 0);

  let renderer, scene, camera, resizeObserver;
  let animationFrame = 0;
  let visible = true;
  let pausedByUser = false;
  let lastTime = 0;

  function supportsWebGL() {
    try {
      const probe = document.createElement('canvas');
      return Boolean(
        window.WebGLRenderingContext &&
        (probe.getContext('webgl2') || probe.getContext('webgl'))
      );
    } catch {
      return false;
    }
  }

  function stopLoop() {
    if (!animationFrame) return;
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function startLoop() {
    if (animationFrame) return;
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(frame);
  }

  function setFallback(reason) {
    stopLoop();
    el.stage.dataset.renderer = 'fallback';
    el.canvas.hidden = true;
    el.static.hidden = false;
    el.status.innerHTML = `renderer / <strong>${reason}</strong>`;
    el.control.hidden = true;
  }

  function setLive() {
    el.stage.dataset.renderer = 'webgl';
    el.canvas.hidden = false;
    el.static.hidden = true;
    el.status.innerHTML = 'renderer / <strong>webgl live</strong>';
    el.control.hidden = false;
  }

  function resize() {
    if (!renderer || !camera) return;
    const width = Math.max(1, el.viewport.clientWidth);
    const height = Math.max(1, el.viewport.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function frame(time) {
    animationFrame = requestAnimationFrame(frame);
    if (!visible || pausedByUser) return;
    const delta = Math.min((time - lastTime) / 1000 || 0, 0.05);
    lastTime = time;
    if (config.pointer) pointer.lerp(targetPointer, 0.055);
    config.update({ THREE, scene, camera, palette, pointer, data: config.data }, delta);
    renderer.render(scene, camera);
  }

  function onPointerMove(event) {
    if (reducedMotion.matches) return;
    targetPointer.x = THREE.MathUtils.clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1);
    targetPointer.y = THREE.MathUtils.clamp(1 - (event.clientY / window.innerHeight) * 2, -1, 1);
  }

  function toggleMotion() {
    pausedByUser = !pausedByUser;
    el.control.setAttribute('aria-pressed', String(pausedByUser));
    el.control.textContent = pausedByUser ? '[ RESUME FEED ]' : '[ PAUSE FEED ]';
    if (!pausedByUser) lastTime = performance.now();
  }

  function initialize() {
    if (forced === 'fallback') return setFallback('forced still');
    if (reducedMotion.matches) return setFallback('reduced-motion still');
    if (!supportsWebGL()) return setFallback('webgl unavailable');

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: el.canvas,
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
      });
      const clear = palette[config.clearColor];
      renderer.setClearColor(clear, 1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene = new THREE.Scene();
      scene.background = clear;
      if (config.fogDensity) scene.fog = new THREE.FogExp2(clear, config.fogDensity);

      camera = new THREE.PerspectiveCamera(config.camera.fov, 1, 0.1, 160);
      camera.position.set(...config.camera.position);
      camera.lookAt(...config.camera.lookAt);

      config.build({ THREE, scene, camera, palette, pointer, data: config.data });
      resize();
      setLive();
      startLoop();

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(el.viewport);
      el.control.addEventListener('click', toggleMotion);
      if (config.pointer) {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
      }

      const visibilityObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) lastTime = performance.now();
      }, { threshold: 0.02 });
      visibilityObserver.observe(el.viewport);

      document.addEventListener('visibilitychange', () => {
        visible = !document.hidden;
        if (visible) lastTime = performance.now();
      });
    } catch (error) {
      console.error('Lab WebGL initialization failed.', error);
      setFallback('renderer fault');
    }
  }

  reducedMotion.addEventListener('change', () => window.location.reload());
  window.addEventListener('pagehide', () => {
    stopLoop();
    resizeObserver?.disconnect();
    renderer?.dispose();
  });

  initialize();
}

// Shared builders. Labs use these instead of re-deriving line and label helpers.

export function makeLine(THREE, points, color, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.Line(geometry, material);
}

export function makeTextSprite(THREE, text, color, scale = 1) {
  const surface = document.createElement('canvas');
  surface.width = 512;
  surface.height = 64;
  const context = surface.getContext('2d');
  context.clearRect(0, 0, surface.width, surface.height);
  context.font = '700 23px "JetBrains Mono", monospace';
  context.letterSpacing = '2px';
  context.fillStyle = color;
  context.fillText(text, 8, 39);

  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture, transparent: true, opacity: 0.78, depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.8 * scale, 0.6 * scale, 1);
  return sprite;
}
```

- [ ] **Step 2: Verify it parses**

Run: `cd ~/Github/open-outcry/experiments && node --check lab-shell.js`
Expected: no output, exit 0.

The shell is not independently runnable — it has no scene. Task 5 is its first consumer and the real proof. Do not attempt to test it in a browser before then.

- [ ] **Step 3: Commit**

```bash
cd ~/Github/open-outcry
git add experiments/lab-shell.js
git commit -m "experiments: extract lab-shell.js harness from Lab 01

Renderer lifecycle, capped DPR, viewport and document visibility pausing,
pause/resume chrome, resize, fallback routing, and teardown — the
machinery Lab 01 proved and four more labs would otherwise each copy.

Labs supply build(ctx) and update(ctx, dt) and nothing else; the shell
never reads lab internals and no lab touches the renderer or the loop.
Adds a ?render=fallback seam so the static composition is verifiable
rather than assumed.

Lab 01 is untouched and keeps its own inlined copy."
```

---

## Task 5: Lab 02 — Candle Field (Console)

First consumer of the shell. If the shell's interface is wrong, it surfaces here.

**Files:**
- Create: `experiments/candle-field.html`, `experiments/candle-field.js`

**Interfaces:**
- Consumes: `createLab`, `makeLine`, `makeTextSprite` from `lab-shell.js`; the snapshot from Task 3.
- Produces: nothing consumed by later tasks except the HTML skeleton, which Labs 03–05 copy.

- [ ] **Step 1: Write the page skeleton**

Model the chrome on `depth-tape.html`: same font links, same `../tokens.css` + `../components.css` imports, same rail structure. Console register this time — `--oo-console-stage` background, Pixelify Sans display, amber ink, `.oo-scanlines` on the stage.

Required structural hooks, because `verify-lab.sh` and `lab-shell.js` both query them:

```html
<section class="lab-stage oo-scanlines" data-renderer="pending">
  <header class="lab-rail">
    <span class="lab-path">&gt; experiments/candle-field</span>
    <span class="lab-status" data-lab-status>renderer / <strong>starting</strong></span>
  </header>

  <h1 class="lab-title">CANDLE FIELD.</h1>

  <div class="lab-viewport" data-lab-viewport>
    <canvas data-lab-canvas></canvas>
    <svg class="lab-static" data-lab-static hidden viewBox="0 0 1200 640" role="img"
         aria-label="Static candle field: 90 daily SPY bars">
      <!-- populated in Step 3 -->
    </svg>
  </div>

  <footer class="lab-rail lab-rail--foot">
    <span>SPY · 90 SESSIONS · SNAPSHOT 2026-07-26 · ALPHA VANTAGE</span>
    <button class="lab-control" type="button" data-lab-control aria-pressed="false">[ PAUSE FEED ]</button>
  </footer>
</section>

<script src="vendor/three.iife.js"></script>
<script type="module" src="candle-field.js"></script>
```

Replace the snapshot date in the footer with the real filename date from Task 3. The stage must set `overflow: hidden` and `max-width: 1440px`, and the viewport must have an explicit height (`min-height: 62svh`) so `clientHeight` is never 0 at first resize.

- [ ] **Step 2: Write the scene**

```js
import { createLab, makeLine, makeTextSprite } from './lab-shell.js';

const SNAPSHOT = 'data/market-2026-07-26.json'; // update to the real filename

const response = await fetch(SNAPSHOT);
const data = await response.json();

function buildCandles(ctx) {
  const { THREE, scene, palette, data } = ctx;
  const bars = data.bars.series;

  const closes = bars.map(b => b.close);
  const lo = Math.min(...bars.map(b => b.low));
  const hi = Math.max(...bars.map(b => b.high));
  const toY = v => THREE.MathUtils.mapLinear(v, lo, hi, -4.2, 4.2);

  const field = new THREE.Group();
  const spacing = 0.72;
  const startZ = 6;

  bars.forEach((bar, i) => {
    const rising = bar.close >= bar.open;
    const color = rising ? palette.greenDeep : palette.red;
    const z = startZ - i * spacing;

    const bodyTop = toY(Math.max(bar.open, bar.close));
    const bodyBottom = toY(Math.min(bar.open, bar.close));
    const height = Math.max(0.06, bodyTop - bodyBottom);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, height, 0.42),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.86 })
    );
    body.position.set(0, (bodyTop + bodyBottom) / 2, z);
    field.add(body);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(body.geometry),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
    );
    edges.position.copy(body.position);
    field.add(edges);

    field.add(makeLine(THREE, [
      new THREE.Vector3(0, toY(bar.low), z),
      new THREE.Vector3(0, toY(bar.high), z),
    ], color, 0.62));
  });

  field.name = 'field';
  scene.add(field);

  // One amber price rail at the latest close — the plate's single annotation.
  const last = bars[bars.length - 1];
  const railY = toY(last.close);
  const rail = new THREE.Group();
  rail.add(makeLine(THREE, [
    new THREE.Vector3(0, railY, startZ + 1),
    new THREE.Vector3(0, railY, startZ - bars.length * spacing),
  ], palette.amber, 0.4));
  const label = makeTextSprite(THREE, `CLOSE ${last.close.toFixed(2)}`, '#f2a51f', 0.9);
  label.position.set(2.4, railY + 0.5, startZ - 2);
  rail.add(label);
  scene.add(rail);

  const dateLabel = makeTextSprite(THREE, last.date, '#686564', 0.66);
  dateLabel.position.set(2.4, railY - 0.5, startZ - 2);
  scene.add(dateLabel);
}

let panned = 0;
const SPAN = 90 * 0.72;

function updateField(ctx, dt) {
  const { scene, camera, pointer } = ctx;
  const field = scene.getObjectByName('field');
  panned = (panned + dt * 1.6) % SPAN;   // linear pan along the time axis
  field.position.z = panned;
  camera.position.x = pointer.x * 0.8;
  camera.lookAt(0, 0, -18);
}

createLab({
  data,
  clearColor: 'consoleStage',
  fogDensity: 0.03,
  pointer: true,
  camera: { fov: 40, position: [7.5, 2.4, 14], lookAt: [0, 0, -18] },
  build: buildCandles,
  update: updateField,
});
```

- [ ] **Step 3: Build the static fallback from the same bars**

Generate the `<svg data-lab-static>` contents as literal SVG in the HTML — one `<rect>` per body and one `<line>` per wick, using the same 90 bars, the same green/red split, and the same amber close rail. Write a throwaway node script to emit the markup and paste the result; do not hand-author 90 bars, and do not ship the generator.

The fallback must read as a complete candle chart, not a degraded one. `verify-lab.sh` asserts its rendered height exceeds 200px.

- [ ] **Step 4: Verify**

Run: `cd ~/Github/open-outcry/experiments && ./verify-lab.sh candle-field`
Expected: `PASS [candle-field] desktop + phone + fallback`

Then open the three screenshots in `/tmp/oo-verify/` and check by eye: one dominant first-read object, no horizontal overflow, phone composition stacks rather than shrinking, no blue anywhere.

- [ ] **Step 5: Commit**

```bash
cd ~/Github/open-outcry
git add experiments/candle-field.html experiments/candle-field.js
git commit -m "experiments: add Candle Field — WebGL Lab 02 (Console)

90 real daily SPY bars extruded as bodies receding along a time axis,
green-deep and red per direction, with one amber close rail as the single
annotation. Linear pan, restrained pointer drift, no orbit controls.

First consumer of lab-shell.js. Static SVG fallback drawn from the same
bars, so the reduced-motion path is a complete chart rather than a
degraded frame.

Sanctioned by design-language §5: candlestick fields as backdrop art,
real-data shapes preferred."
```

---

## Task 6: Lab 03 — CRT Volume (Console)

**Files:**
- Create: `experiments/crt-volume.html`, `experiments/crt-volume.js`

**Interfaces:**
- Consumes: `createLab` from `lab-shell.js`. No market data.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Capture the real terminal content**

The slab renders actual local output, never invented lines. Run:

```bash
cd ~/Github/open-outcry
git log --oneline -8
```

Take those eight lines verbatim into a `LINES` array in the lab. Prefix the array with `> git log --oneline -8` as the typed command. Real output, real repo, real history.

- [ ] **Step 2: Write the page skeleton**

Copy `candle-field.html`'s structure. Change the path rail to `> experiments/crt-volume`, the title to `CRT VOLUME.`, the footer to `PHOSPHOR SLAB · LOCAL GIT LOG · NO NETWORK`, and the static SVG's aria-label. Same required hooks — `data-renderer`, `data-lab-viewport`, `data-lab-canvas`, `data-lab-static`, `data-lab-status`, `data-lab-control`.

- [ ] **Step 3: Write the scene**

```js
import { createLab } from './lab-shell.js';

const LINES = [
  '> git log --oneline -8',
  // paste the eight real lines from Step 1 here
];

const COLS = 68;
const TEX_W = 1024;
const TEX_H = 640;

const surface = document.createElement('canvas');
surface.width = TEX_W;
surface.height = TEX_H;
const ctx2d = surface.getContext('2d');

let typed = 0;          // characters revealed so far
let blinkOn = true;
let blinkClock = 0;

function paintTexture(palette) {
  ctx2d.fillStyle = '#070807';                 // --oo-console-stage
  ctx2d.fillRect(0, 0, TEX_W, TEX_H);

  ctx2d.font = '400 22px "JetBrains Mono", monospace';
  ctx2d.textBaseline = 'top';

  let remaining = Math.floor(typed);
  let y = 48;
  for (const line of LINES) {
    if (remaining <= 0) break;
    const shown = line.slice(0, remaining);
    remaining -= line.length;
    ctx2d.fillStyle = line.startsWith('>') ? '#f2a51f' : '#eee8df';  // amber / fg
    ctx2d.fillText(shown, 56, y);
    if (remaining <= 0 && blinkOn) {
      const w = ctx2d.measureText(shown).width;
      ctx2d.fillStyle = '#f2a51f';
      ctx2d.fillRect(56 + w + 4, y + 2, 11, 24);                     // ▌ cursor block
    }
    y += 34;
  }

  // Scanlines drawn into the texture so they curve with the surface.
  ctx2d.fillStyle = 'rgba(0,0,0,0.22)';
  for (let sy = 0; sy < TEX_H; sy += 3) ctx2d.fillRect(0, sy, TEX_W, 1);
}

function buildSlab(ctx) {
  const { THREE, scene, palette } = ctx;

  paintTexture(palette);
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;

  // Barrel-warped plane: displace vertices toward the viewer at the centre.
  const geometry = new THREE.PlaneGeometry(16, 10, 48, 32);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i) / 8;
    const y = pos.getY(i) / 5;
    pos.setZ(i, (1 - x * x) * (1 - y * y) * 1.15);
  }
  geometry.computeVertexNormals();

  const slab = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
  );
  slab.name = 'slab';
  slab.userData.texture = texture;
  scene.add(slab);

  // Amber bezel: square hardware framing the phosphor.
  const bezel = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(16.8, 10.8, 2.4)),
    new THREE.LineBasicMaterial({ color: palette.amberLine, transparent: true, opacity: 0.55 })
  );
  bezel.position.z = -0.6;
  scene.add(bezel);
}

const TOTAL_CHARS = LINES.join('').length;

function updateSlab(ctx, dt) {
  const { scene, camera, pointer } = ctx;
  const slab = scene.getObjectByName('slab');

  typed += dt * 46;                          // steps-style reveal, ~46 chars/sec
  if (typed > TOTAL_CHARS + 90) typed = 0;   // hold, then retype

  blinkClock += dt * 1000;
  if (blinkClock >= 950) { blinkOn = !blinkOn; blinkClock = 0; }

  paintTexture();
  slab.userData.texture.needsUpdate = true;

  camera.position.x = pointer.x * 0.5;
  camera.position.y = pointer.y * 0.3;
  camera.lookAt(0, 0, 0);
}

createLab({
  clearColor: 'consoleStage',
  fogDensity: 0.012,
  pointer: true,
  camera: { fov: 38, position: [0, 0, 17], lookAt: [0, 0, 0] },
  build: buildSlab,
  update: updateSlab,
});
```

- [ ] **Step 4: Build the static fallback**

The `<svg data-lab-static>` shows the same terminal frame fully typed and uncurved: a bordered rect in `--oo-console-stage`, the amber command line, the eight real log lines in `--oo-fg`, a static amber cursor block, and horizontal scanline strokes at 3px intervals. Hand-authoring this one is fine — it is nine lines of text.

- [ ] **Step 5: Verify**

Run: `cd ~/Github/open-outcry/experiments && ./verify-lab.sh crt-volume`
Expected: `PASS [crt-volume] desktop + phone + fallback`

Then check the desktop screenshot specifically for legibility: if the log text is unreadable at 1440×900, reduce the barrel displacement from `1.15` toward `0.7` and re-verify. Canvas typography is secondary by design, but this lab's whole subject is text — if it cannot be read, the lab has failed its own premise. Record whichever value you land on in the receipt.

- [ ] **Step 6: Commit**

```bash
cd ~/Github/open-outcry
git add experiments/crt-volume.html experiments/crt-volume.js
git commit -m "experiments: add CRT Volume — WebGL Lab 03 (Console)

The console voice made physical: a barrel-warped phosphor slab carrying a
canvas texture of real local git log output, typed at steps() cadence with
the 950ms cursor blink from design-language §6.1. Scanlines are drawn into
the texture so they curve with the surface instead of sitting flat in CSS.

Displacement is geometry, not post-processing — no bloom stack. Content is
real repo history; nothing on the slab is invented."
```

---

## Task 7: Lab 04 — Blueprint Schematic (Console)

**Files:**
- Create: `experiments/blueprint.html`, `experiments/blueprint.js`

**Interfaces:**
- Consumes: `createLab`, `makeTextSprite` from `lab-shell.js`. No market data.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Write the page skeleton**

Copy the Task 5 skeleton. Path rail `> experiments/blueprint`, title `BLUEPRINT.`, footer `TOKENS -> COMPONENTS -> CONSUMERS · v1.4 CONTRACT`.

- [ ] **Step 2: Write the scene**

The graph is the repo's real dependency flow. Nodes and edges below are not illustrative — they are what `tokens.css`, `components.css`, `index.html`, `examples/inir.html`, `examples/morning-brief.html`, and the labs actually do.

```js
import { createLab, makeTextSprite } from './lab-shell.js';

// The real Open Outcry pipeline. Every edge exists in the repo.
const NODES = [
  { id: 'tokens',     label: 'tokens.css',      pos: [0, 3.4, 0],     tier: 'amber' },
  { id: 'components', label: 'components.css',  pos: [0, 0.6, -6],    tier: 'amber' },
  { id: 'book',       label: 'index.html',      pos: [-7, -2.2, -13], tier: 'green' },
  { id: 'inir',       label: 'examples/inir',   pos: [-2.4, -2.6, -16], tier: 'green' },
  { id: 'brief',      label: 'examples/brief',  pos: [2.4, -2.6, -16], tier: 'green' },
  { id: 'labs',       label: 'experiments/*',   pos: [7, -2.2, -13],  tier: 'peach' },
];

const EDGES = [
  ['tokens', 'components'],
  ['components', 'book'],
  ['components', 'inir'],
  ['components', 'brief'],
  ['components', 'labs'],
  ['tokens', 'labs'],
];

function nodeById(id) {
  return NODES.find(n => n.id === id);
}

function buildSchematic(ctx) {
  const { THREE, scene, palette } = ctx;
  const group = new THREE.Group();
  group.name = 'schematic';

  for (const [fromId, toId] of EDGES) {
    const a = new THREE.Vector3(...nodeById(fromId).pos);
    const b = new THREE.Vector3(...nodeById(toId).pos);
    const geometry = new THREE.BufferGeometry().setFromPoints([a, b]);
    const material = new THREE.LineDashedMaterial({
      color: palette.amber,
      transparent: true,
      opacity: 0.72,
      dashSize: 1000,      // effectively solid once revealed
      gapSize: 1000,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    const length = a.distanceTo(b);
    line.userData.length = length;
    material.dashSize = 0;
    material.gapSize = length;
    group.add(line);
  }

  for (const node of NODES) {
    const color = palette[node.tier === 'amber' ? 'amber' : node.tier === 'green' ? 'green' : 'peach'];
    const dot = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.34, 0.34),   // square hardware, not spheres
      new THREE.MeshBasicMaterial({ color })
    );
    dot.position.set(...node.pos);
    group.add(dot);

    const hex = `#${color.getHexString()}`;
    const label = makeTextSprite(THREE, node.label, hex, 0.72);
    label.position.set(node.pos[0] + 1.5, node.pos[1] + 0.55, node.pos[2]);
    group.add(label);
  }

  scene.add(group);
}

let drawClock = 0;
const DRAW_SECONDS = 4.2;
const HOLD_SECONDS = 3;

function updateSchematic(ctx, dt) {
  const { THREE, scene, camera, pointer } = ctx;
  const group = scene.getObjectByName('schematic');

  drawClock += dt;
  const cycle = DRAW_SECONDS + HOLD_SECONDS;
  if (drawClock > cycle) drawClock = 0;
  const progress = Math.min(1, drawClock / DRAW_SECONDS);   // linear draw

  let index = 0;
  for (const child of group.children) {
    if (child.userData.length === undefined) continue;
    // Stagger edges so the graph reveals in dependency order.
    const start = index / EDGES.length;
    const local = THREE.MathUtils.clamp((progress - start) * EDGES.length, 0, 1);
    child.material.dashSize = child.userData.length * local;
    child.material.gapSize = child.userData.length * (1 - local) + 0.0001;
    index += 1;
  }

  group.rotation.y = pointer.x * 0.12;
  camera.lookAt(0, 0, -8);
}

createLab({
  clearColor: 'consoleStage',
  fogDensity: 0.018,
  pointer: true,
  camera: { fov: 44, position: [0, 1.2, 15], lookAt: [0, 0, -8] },
  build: buildSchematic,
  update: updateSchematic,
});
```

- [ ] **Step 3: Build the static fallback**

This lab's fallback is the strongest of the five: the same graph as flat inline SVG, fully drawn, with 2px amber strokes, `stroke-linejoin: miter`, square node dots, and mono labels. Six nodes and six edges — hand-author it.

- [ ] **Step 4: Verify**

Run: `cd ~/Github/open-outcry/experiments && ./verify-lab.sh blueprint`
Expected: `PASS [blueprint] desktop + phone + fallback`

Then confirm from the desktop screenshot that every node label is legible and no edge crosses a label. If labels collide at 1440×900, adjust the `pos` z-values rather than shrinking the type.

- [ ] **Step 5: Commit**

```bash
cd ~/Github/open-outcry
git add experiments/blueprint.html experiments/blueprint.js
git commit -m "experiments: add Blueprint Schematic — WebGL Lab 04 (Console)

Design-language §5's monoline SVG language extended into depth: the repo's
real tokens -> components -> consumers pipeline as an amber wireframe with
miter joints, square node markers, and mono sprite labels.

Line-draw motion is sanctioned here rather than borrowed — §5 permits
stroke-dashoffset animation when the drawing explains a flow, and this one
does. Flat inline SVG fallback carries the identical graph."
```

---

## Task 8: Lab 05 — Tape Ribbon (Broadcast)

The only Broadcast plate of the four. The register law applies strictly: Fraunces headline with exactly one peach italic phrase, and the ribbon is the machine quotation — it does not become a second voice.

**Files:**
- Create: `experiments/tape-ribbon.html`, `experiments/tape-ribbon.js`

**Interfaces:**
- Consumes: `createLab` from `lab-shell.js`; the snapshot from Task 3.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Write the page skeleton — Broadcast chrome**

Differences from the Console labs, all required by §1 and §3:

- Stage background `--oo-broadcast-stage`, not console stage.
- No `.oo-scanlines` on the stage. Broadcast gets grain and one warm radial bloom instead — copy the `::before` radial-gradient treatment from `depth-tape.html`.
- Headline in Fraunces, sentence case, with exactly one `<em>` carrying `font-style: italic; color: var(--oo-peach)`. Suggested copy, which names a mechanism rather than selling one:
  `The tape was always the product. <em>Everything else is chrome.</em>`
- Rails, status, footer, and the pause control stay mono — controls are chrome, and chrome is always mono, regardless of the plate's register (v1.3 register-law corollary).
- Path rail uses the Broadcast kicker form: `< lab = "tape-ribbon" >`.
- Same required data hooks as every other lab.

- [ ] **Step 2: Write the scene**

```js
import { createLab } from './lab-shell.js';

const SNAPSHOT = 'data/market-2026-07-26.json'; // update to the real filename

const response = await fetch(SNAPSHOT);
const data = await response.json();

const TEX_W = 2048;
const TEX_H = 128;

const surface = document.createElement('canvas');
surface.width = TEX_W;
surface.height = TEX_H;
const ctx2d = surface.getContext('2d');

function paintTape(quotes) {
  ctx2d.fillStyle = '#0d0d0b';                  // --oo-console-pane
  ctx2d.fillRect(0, 0, TEX_W, TEX_H);
  ctx2d.font = '700 44px "JetBrains Mono", monospace';
  ctx2d.textBaseline = 'middle';
  ctx2d.letterSpacing = '3px';

  let x = 24;
  for (const q of quotes) {
    const up = q.change >= 0;
    ctx2d.fillStyle = '#eee8df';                // --oo-fg
    ctx2d.fillText(q.symbol, x, TEX_H / 2);
    x += ctx2d.measureText(q.symbol).width + 18;

    const figure = `${q.last.toFixed(2)}  ${up ? '+' : ''}${q.changePercent.toFixed(2)}%`;
    ctx2d.fillStyle = up ? '#48dc7d' : '#e0455a';   // --oo-green / --oo-red
    ctx2d.fillText(figure, x, TEX_H / 2);
    x += ctx2d.measureText(figure).width + 46;
  }
}

function buildRibbon(ctx) {
  const { THREE, scene, palette, data } = ctx;

  // Repeat the tape until it fills the texture, so the scroll never shows a gap.
  const quotes = [];
  while (quotes.length < 24) quotes.push(...data.tape);
  paintTape(quotes);

  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(3, 1);
  texture.minFilter = THREE.LinearFilter;

  // A ribbon: a spline swept into a flat band, twisting through depth.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-16, -3.4, 6),
    new THREE.Vector3(-6, 0.4, -2),
    new THREE.Vector3(4, -1.6, -9),
    new THREE.Vector3(14, 2.2, -17),
  ]);

  const SEGMENTS = 220;
  const HALF_WIDTH = 0.62;
  const positions = [];
  const uvs = [];
  const frames = curve.computeFrenetFrames(SEGMENTS, false);

  for (let i = 0; i <= SEGMENTS; i += 1) {
    const t = i / SEGMENTS;
    const point = curve.getPointAt(t);
    const normal = frames.normals[i];
    const twist = Math.sin(t * Math.PI * 1.4) * 0.5;
    const offset = normal.clone().applyAxisAngle(
      curve.getTangentAt(t), twist
    ).multiplyScalar(HALF_WIDTH);

    positions.push(
      point.x - offset.x, point.y - offset.y, point.z - offset.z,
      point.x + offset.x, point.y + offset.y, point.z + offset.z
    );
    uvs.push(t, 0, t, 1);
  }

  const indices = [];
  for (let i = 0; i < SEGMENTS; i += 1) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const ribbon = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    toneMapped: false,
  }));
  ribbon.name = 'ribbon';
  ribbon.userData.texture = texture;
  scene.add(ribbon);
}

function updateRibbon(ctx, dt) {
  const { scene, camera, pointer } = ctx;
  const ribbon = scene.getObjectByName('ribbon');
  ribbon.userData.texture.offset.x -= dt * 0.09;   // linear feed, right to left
  camera.position.x = 2 + pointer.x * 0.7;
  camera.position.y = 0.6 + pointer.y * 0.35;
  camera.lookAt(0, -0.6, -6);
}

createLab({
  data,
  clearColor: 'broadcastStage',
  fogDensity: 0.02,
  pointer: true,
  camera: { fov: 46, position: [2, 0.6, 13], lookAt: [0, -0.6, -6] },
  build: buildRibbon,
  update: updateRibbon,
});
```

- [ ] **Step 3: Build the static fallback**

An SVG ribbon: one `<path>` band following roughly the same sweep, with the real quote text laid along it via `<textPath>`, green/red per direction. Generate the text runs from the same snapshot so the figures match the live version exactly.

- [ ] **Step 4: Verify**

Run: `cd ~/Github/open-outcry/experiments && ./verify-lab.sh tape-ribbon`
Expected: `PASS [tape-ribbon] desktop + phone + fallback`

Then check the register discipline explicitly on the desktop screenshot: the Fraunces headline must be the first read, not the ribbon. If the ribbon wins the eye, push it further back and down — this is a Broadcast plate with a machine quotation, and the balance is the whole point. Confirm exactly one italic peach phrase appears, and that no serif type has leaked onto the ribbon or the rails.

- [ ] **Step 5: Commit**

```bash
cd ~/Github/open-outcry
git add experiments/tape-ribbon.html experiments/tape-ribbon.js
git commit -m "experiments: add Tape Ribbon — WebGL Lab 05 (Broadcast)

The brand's connective tissue made into the object: a swept spline band
carrying the real quote tape as a scrolling texture, behind a Fraunces
headline with one peach italic phrase.

The only Broadcast plate of Labs 02-05. The ribbon is the machine
quotation permitted by register law, not a second voice — controls and
rails stay mono, and the headline keeps the first read. Linear feed only.
Figures come from the dated snapshot and match the SVG fallback exactly."
```

---

## Task 9: Contact sheet and README

**Files:**
- Create: `experiments/index.html`
- Modify: `experiments/README.md`

**Interfaces:**
- Consumes: nothing at runtime. Deliberately contains no WebGL — it must load instantly and survive a dead GPU.

- [ ] **Step 1: Write the contact sheet**

Console-led plate using `../tokens.css` + `../components.css`. Top rail `> experiments/webgl` with a live dot. One row per lab in a `.oo-grid`-based layout:

| # | Lab | Register | Intent |
|---|---|---|---|
| 01 | Depth Tape | Broadcast | Perspective market lanes receding into the desk |
| 02 | Candle Field | Console | 90 real sessions as extruded bodies along time |
| 03 | CRT Volume | Console | The console voice as a curved phosphor slab |
| 04 | Blueprint | Console | The repo's own pipeline drawn in depth |
| 05 | Tape Ribbon | Broadcast | The quote tape swept into a physical band |

Each row links to its lab and shows its fallback SVG as the thumbnail — reuse the markup, do not screenshot. Bottom tape carries real counts and the snapshot date: `5 LABS · 4 ON SHARED RUNTIME · SNAPSHOT <date> · CONTRACT v1.4 UNCHANGED`.

- [ ] **Step 2: Update the README**

Add, without disturbing the existing Depth Tape section:

- A "Labs" index table matching the contact sheet.
- The shared-runtime rebuild recipe from Task 2, with the recorded SHA-256.
- The `verify-lab.sh` usage line and, if Task 1 Step 2 required it, the `CHROME_DEVTOOLS_AXI_CHROME_ARGS="--enable-unsafe-swiftshader"` note.
- The `?render=fallback` seam, documented as a verification affordance rather than a user-facing feature.
- A line stating that Labs 02–05 share `vendor/three.iife.js` while Lab 01 keeps its own bundle, and why.

- [ ] **Step 3: Verify the contact sheet**

`verify-lab.sh` does not apply — there is no canvas. Instead run:

```bash
cd ~/Github/open-outcry
python -m http.server 8731 >/dev/null 2>&1 &
SERVER=$!
chrome-devtools-axi open "http://127.0.0.1:8731/experiments/index.html"
chrome-devtools-axi resize 1440 900
chrome-devtools-axi eval "document.querySelectorAll('a[href$=\".html\"]').length"
chrome-devtools-axi eval "document.documentElement.scrollWidth - window.innerWidth"
chrome-devtools-axi screenshot /tmp/oo-verify/index-desktop.png
chrome-devtools-axi resize 390 844
chrome-devtools-axi eval "document.documentElement.scrollWidth - window.innerWidth"
chrome-devtools-axi screenshot /tmp/oo-verify/index-phone.png
kill $SERVER
```

Expected: link count `5`, both overflow values `0` or negative.

Then click through all five links in the headed browser and confirm each lab loads.

- [ ] **Step 4: Commit**

```bash
cd ~/Github/open-outcry
git add experiments/index.html experiments/README.md
git commit -m "experiments: add lab contact sheet and document Labs 02-05

Console-led index of all five WebGL labs with register, intent, and each
lab's own fallback SVG as its thumbnail. No WebGL on this page — it loads
instantly and survives a dead GPU.

README gains the labs table, the shared-runtime rebuild recipe and SHA,
verify-lab.sh usage, and the ?render=fallback verification seam."
```

---

## Task 10: Receipts

**Files:**
- Create: `experiments/CANDLE-FIELD-RECEIPT.md`, `experiments/CRT-VOLUME-RECEIPT.md`, `experiments/BLUEPRINT-RECEIPT.md`, `experiments/TAPE-RIBBON-RECEIPT.md`

- [ ] **Step 1: Write one receipt per lab**

Match `DEPTH-TAPE-RECEIPT.md`'s structure exactly: front matter (track, artifact, built date, design system), **What shipped**, **Verification**, **Critique** split into *Keep* and *Watch*, and **Serious-track gate**.

Rules for honesty, since these receipts are the evidence any future promotion decision rests on:

- Under **Verification**, list only checks that actually ran, with their real results. If a check was skipped, say so and say why.
- Under **Watch**, record the real numbers: uncompressed page weight, the CRT displacement value settled on in Task 6, any label collisions adjusted in Task 7, and whether the Task 8 register balance needed tuning.
- If any lab failed its own premise on inspection — CRT text illegible, ribbon stealing the first read from the headline — say that plainly in **Watch** rather than softening it. A receipt that only praises is worthless as a gate.

- [ ] **Step 2: Record friction against the contract**

Each receipt gets a short **Contract friction** section listing anything the lab wanted from `components.css` and had to solve with page-local glue instead. This is the evidence a future contract version would be built from — the v1.3 and v1.4 promotions both came from exactly this kind of log. Do not propose contract changes here; only record the friction.

- [ ] **Step 3: Commit**

```bash
cd ~/Github/open-outcry
git add experiments/*-RECEIPT.md
git commit -m "experiments: receipts for Labs 02-05

One receipt per lab in the Depth Tape shape: what shipped, what was
actually verified, keep/watch critique with real numbers, and the
serious-track gate.

Each records contract friction — what the lab wanted from components.css
and solved with page-local glue instead — as evidence for any future
contract version. No promotions proposed; all five stay fun-track."
```

- [ ] **Step 4: Final sweep**

Run:
```bash
cd ~/Github/open-outcry
git diff --check
git status --short
git log --oneline -12
sha256sum experiments/depth-tape.bundle.js
git diff eab412e --stat -- tokens.css components.css examples/ index.html
```

Expected: clean tree; Lab 01's SHA still `3fd33dce43ef7070550167568ea02d6fb44825b530fd937f8556780891f64bb1`; the final diff **empty** — nothing outside `experiments/` was touched.

Do not push. Ayaz reviews the labs live first.

---

## Notes for the implementer

- **The screenshots are not the verification.** `verify-lab.sh` proves a lab rendered and did not overflow. It cannot tell you whether the plate reads as Open Outcry. Every lab has a by-eye check written into its verify step — do it, and let it change the work.
- **When a lab fights the shell, fix the lab.** The shell's interface is deliberately narrow. If a lab wants renderer access, DOM control, or its own loop, that is a signal the lab is overreaching, not that the shell is too small. The one legitimate exception is a lab needing per-frame texture updates, which Labs 03 and 05 already do through `userData`.
- **Fallbacks are not a formality.** Lab 01's receipt names fallback completeness as a promotion gate and then never tested it. That gap is the reason the `?render=fallback` seam exists. A fallback that is a blank frame fails the task even if the harness passes it.
- **Nothing here is a promotion.** Five labs, all fun-track. If one turns out to be genuinely good, that earns a separate conversation about one scoped surface — not a contract change.
