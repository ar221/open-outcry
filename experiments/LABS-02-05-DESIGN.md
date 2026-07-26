# WebGL Labs 02–05 — Design Spec

**Date:** 2026-07-26
**Track:** fun — prototypes only, behind the Lab 01 promotion gate
**Design system:** Open Outcry v1.4 (`../tokens.css`, `../components.css`)
**Baseline:** Lab 01 Depth Tape, committed at `eab412e`
**Authors:** Ayaz, Oracle

---

## 1. Intent

Four more three.js instruments in `experiments/`, each a standalone plate. Three.js
supplies spatial machinery for things the brand already claims — the tape, candle
fields as backdrop art, the monoline blueprint, the console voice — not decorative
3D on top of an unrelated page.

**Governing test is unchanged:** does it feel like a serious operator broadcasting
from a live desk?

**Non-goals.** These labs do not modify `tokens.css` or `components.css`. The
contract stays frozen at v1.4. No lab is a design-system primitive, a public
surface, or a promotion candidate on delivery. Lab 01's files are not touched;
its verified bundle SHA stays valid.

---

## 2. Architecture

```
experiments/
├── index.html               ← contact sheet, Console-led, links all five labs
├── lab-shell.js             ← shared harness extracted from Lab 01
├── vendor/three.iife.js     ← one shared runtime, exposes global THREE
├── vendor/three.module.min.js   ← existing, Lab 01's source module
├── data/market-<date>.json  ← baked Alpha Vantage snapshot
├── depth-tape.*             ← Lab 01, unchanged
├── candle-field.{html,js}   ← Lab 02
├── crt-volume.{html,js}     ← Lab 03
├── blueprint.{html,js}      ← Lab 04
└── tape-ribbon.{html,js}    ← Lab 05
```

### 2.1 `lab-shell.js` — the shared harness

Lab 01 proved a set of machinery that all five labs need identically. Copying it
four more times is the failure mode this extraction prevents. The shell owns:

| Concern | Behavior |
|---|---|
| Renderer setup | `WebGLRenderer`, `setPixelRatio(min(devicePixelRatio, 1.5))` |
| Sizing | `ResizeObserver` on the viewport; camera aspect + renderer size |
| Visibility pause | `IntersectionObserver` on the stage + `visibilitychange`; loop stops when hidden |
| User pause | Pause/resume chrome button; toggles the loop and the status text, no transition |
| Capability gate | `supportsWebGL()`; on false, or on `prefers-reduced-motion`, or on any `initialize()` throw → static fallback |
| Status reporting | `stage.dataset.renderer = 'webgl' \| 'fallback'`, status text |
| Teardown | `pagehide` cancels the frame and disposes the renderer |

**Interface.** A lab module supplies one object and nothing else:

```js
createLab({
  build(ctx),      // ctx: { scene, camera, palette, data, THREE } → void
  update(ctx, dt), // per-frame mutation, linear only
})
```

The shell never reads lab internals; a lab never touches the renderer, the loop,
or the DOM chrome. Either side can be rewritten without breaking the other. Each
lab file should stay comfortably readable on its own — if one grows past roughly
300 lines, its geometry construction is doing too much and should be split.

**Pointer input** is opt-in per lab (`ctx.pointer`) and available to **any** lab.
No lab gets orbit controls.

*Amended 2026-07-26.* This clause originally scoped drift to Depth Tape and Tape
Ribbon, on the assumption that only they wanted it. The build falsified that:
all four new labs opted in, and in two of them the drift became load-bearing
rather than decorative — Blueprint sizes its node margins around it
(`blueprint.js:235`) so the framing solve already accounts for the offset, and
CRT Volume uses it to move the eye across the phosphor surface. Four out of four
consumers diverging from a rule is evidence about the rule, not four mistakes.
The amendment follows the code rather than asking two verified plates to change
for conformance.

Drift is permitted subject to the constraints the labs actually hold to:

- **Bounded, and inside the framing solve's margins.** A lab that solves its own
  framing must account for the offset so drift can never push its subject off an
  edge. Observed magnitudes: ±0.42/±0.26 (CRT Volume), ±0.55/±0.28 (Blueprint),
  ±0.8 x (Candle Field), ±0.7/±0.35 (Tape Ribbon).
- **Smoothed linearly** — the shell lerps toward the cursor at `0.055`/frame. No
  easing curve, consistent with §6.
- **Suppressed entirely under `prefers-reduced-motion`**, which the shell handles.
- **Re-aimed, not just translated.** The shell calls `camera.lookAt()` once at
  init, so a lab that mutates `camera.position` in `update()` must re-issue
  `lookAt()` there or its rotation goes stale.
- **Still never orbit controls.** Drift is a parallax nudge, not camera control
  handed to the viewer.

A lab that takes drift discloses it in its receipt as a motion channel. The
constraint that matters is boundedness and disclosure, not which labs are on the
list.

### 2.2 Shared runtime

New labs load one `vendor/three.iife.js` and read the global `THREE`. Four
separate bundles would ship roughly 2 MiB of duplicated Three.js. Lab 01 keeps
its own self-contained bundle so the SHA-256 recorded in its receipt remains a
valid verification artifact — the duplication is one copy, and it buys a frozen
baseline.

Rebuild recipe for the shared runtime is documented in `README.md` alongside Lab
01's, with its own SHA-256 recorded on commit.

### 2.3 Contact sheet — `experiments/index.html`

Console-led plate. Top rail `> experiments/webgl`, live dot, one row per lab:
index, name, register, one-line intent, static thumbnail, link. Bottom tape
carries the real lab count and the data snapshot date. No WebGL on this page —
it must load instantly and survive a dead GPU.

---

## 3. Data

One Alpha Vantage fetch, frozen to `data/market-YYYY-MM-DD.json` (the ISO fetch
date, fixed at build time) and committed:

- ~90 daily OHLC bars for the candle field
- a bulk-quote set (symbol, last, change, change %) for the ribbon tape

**Rules.**

- Fetched once at build time through the Alpha Vantage MCP, never at runtime.
  No API key reaches client code; labs stay static-host-safe and work offline.
- The snapshot's fetch date is printed on every plate that consumes it. Numbers
  are real and dated, never invented — §7 of the design language bans fake
  metrics outright.
- The same JSON feeds each lab's static SVG fallback, so a fallback is a
  complete composition rather than a degraded one.
- If the fetch fails, the labs that need it are not built. No placeholder data
  ships, not even temporarily.

Labs 03 and 04 take no market data — their content is real local material (git
log output, the actual token→component→consumer pipeline).

---

## 4. The four instruments

### Lab 02 — Candle Field · Console

Roughly 90 real OHLC bars as extruded bodies receding along a time axis into the
void. Bodies `--oo-green-deep` / `--oo-red`, 1px wicks as line segments, one
amber horizontal price rail carrying a mono label. Camera fixed at slight
elevation. Motion: a linear pan along time, nothing else. Sanctioned directly by
§5 — candlestick fields as backdrop art, real-data shapes preferred.

**Fallback:** static SVG candle field from the same bars.

### Lab 03 — CRT Volume · Console

The console voice made physical. A barrel-warped plane (displaced vertices, not
a post-processing effect) carrying a `CanvasTexture` of live-typed terminal
output — real `git log` lines and spec fragments, never lorem. Scanlines are
drawn into the texture, so they curve with the surface instead of sitting flat in
CSS. Amber emissive, vignette from geometry falloff. Motion: `steps()` typing
plus the 950ms cursor blink — §6.1's brand heartbeat, made spatial.

**Fallback:** static SVG of the same terminal frame, uncurved.

### Lab 04 — Blueprint Schematic · Console

§5's monoline SVG language extended into depth. A 2px amber wireframe of a real
flow — `tokens.css → components.css → consumers` — with miter joints, semantic
dots at nodes, and JetBrains Mono sprite labels. Motion: `stroke-dashoffset`
line-draw revealing the graph in depth order. This is the one lab whose motion is
explicitly sanctioned as non-chrome, because the drawing explains a flow.

**Fallback:** the same schematic as flat inline SVG — arguably the strongest
fallback of the five, since the source language is already SVG.

### Lab 05 — Tape Ribbon · Broadcast

The only Broadcast plate of the four. Fraunces headline with exactly one peach
italic accent phrase in DOM text; behind and beside it, a ribbon mesh — an
extruded spline — carrying a `CanvasTexture` of the real quote tape scrolling
linearly. The ribbon is the machine quotation inside a broadcast plate, which is
precisely what §1's register law permits and nothing more.

**Fallback:** static SVG ribbon with the tape text laid along it.

### Register balance

Three Console, one Broadcast. With Lab 01 (Broadcast) the set reads 3/2 across
the contact sheet, so neither register dominates the collection.

---

## 5. Constraints — inherited from Lab 01, non-negotiable

- One dominant first-read object per plate.
- No particles, orbit controls, bloom or post-processing stack, glass cards,
  parallax soup, or animated gradients as decoration.
- No blue as atmosphere, surface, or decoration. Semantic ink only.
- Square hardware: `border-radius: 0–2px`.
- Linear and `steps()` motion only. No easing curves.
- Device pixel ratio capped at 1.5.
- Rendering pauses when the document or the viewport is not visible.
- Reduced motion, absent WebGL, and initialization failure all resolve to a
  complete static composition.
- Essential content never lives inside the canvas. Canvas typography is always
  secondary.

---

## 6. Verification

Per lab, before its receipt is written:

1. `node --check` on the lab module and the shared shell.
2. Headless Chromium at **1440×900** and **390×844**.
3. Assert `data-renderer="webgl"` and a resized canvas.
4. Assert no horizontal overflow at either width.
5. Confirm the phone composition stacks rather than shrinking the desktop scene.
6. Force the fallback path (reduced-motion emulation) and screenshot it too —
   Lab 01's receipt flags fallback completeness as a promotion gate, so it gets
   verified rather than assumed.
7. `git diff --check`.

Each lab ships a receipt beside Lab 01's, with a keep/watch critique in the same
shape.

---

## 7. Promotion

All five labs remain fun-track on delivery. Lab 01's gate stands unchanged: a lab
is considered for serious/public promotion only if it reads as Open Outcry before
it reads as a Three.js demo, survives desktop and phone crops with the editorial
first-read intact, has a compositionally complete fallback, stays smooth at capped
DPR, and earns a specific public role rather than novelty.

Promotion, if it ever happens, starts as one scoped hero on one surface. Not a
global primitive, and not a contract change.
