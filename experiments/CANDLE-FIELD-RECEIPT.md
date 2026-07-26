# Candle Field — Experiment Receipt

**Track:** fun; no promotion proposed  
**Artifact:** `experiments/candle-field.html`  
**Built:** 2026-07-26  
**Design system:** Open Outcry — `tokens.css` v1.3 / `components.css` v1.4, Console register

## What shipped

- Three.js field of 90 real SPY daily sessions extruded as solid bodies, framed near-side-on (17° off the price plane, FOV 40) so history runs left and the newest bar runs right.
- One amber dashed close rail annotating `CLOSE 738.93` / `2026-07-24`, drawn with `depthTest:false` + `renderOrder: 2` so it is not buried inside the column it names.
- One linear pan, bounded to a scan over `z ∈ [53.0, 64.6]` with instantaneous reversal at the ends; pointer drift ±0.8 units; no easing, no orbit, no particles, no post-processing.
- Aspect-driven camera orbit about a computed target with `lookAt` re-issued every frame, so desktop and phone re-centre structurally rather than by a dolly table.
- Static SVG fallback: a complete axis-labelled 90-session candle chart with price grid, date axis, the same close rail, and a `50 UP / 40 DOWN` header strip.
- Four readout figures traced to `experiments/data/market-2026-07-26.json` — no invented numbers.
- HTML skeleton that Labs 03–05 inherited (six shell hooks, `data-lab-static` on a wrapper `<div>`, `[hidden]` restatements, `<noscript>` reveal).

## Verification

- `./verify-lab.sh candle-field` → `PASS [candle-field] desktop + phone + fallback`. Re-run fresh at Task 10 against HEAD `c1dc796`; still passes.
- Asserted by that script: `node --check` on both modules; `data-renderer="webgl"` at 1440×900; sized canvas; zero horizontal overflow at 1440×900 and 390×844; readout rail inside the 900px frame; `?render=fallback` → `data-renderer="fallback"` with `[data-lab-static]` taller than 200px.
- Bar-mass fill measured in NDC across a full scan at both aspects, not asserted by eye: 1440×900 fill 0.59–0.91 (mean ≈ 0.78), off-centre −0.12…+0.11; 390×844 fill 0.67–0.87 (mean ≈ 0.76), off-centre −0.06…+0.12.
- Wrap-junction position projected to NDC across the whole scan at both aspects: NDC x ≥ 2.17 (desktop), ≥ 9.5 (phone) — always off the right edge.
- Four desktop frames captured at 9-second intervals across the scan, so the composition claim covers every pan phase rather than whichever frame the verify run caught.
- `grep` for `#5aa7ff` / `#b77aff` in both files: zero hits (re-checked at Task 10).
- **Not verified:** compressed transfer size and first render on real hardware. Everything here was measured in headless Chromium on this machine; no phone, no throttled network, no Lighthouse run.
- **Not verified:** the fallback SVG cannot be regenerated (see Watch), so it was read rather than diffed against a generator.

## Critique

### Keep

- The re-framed plate holds the first read. Against `candle-field-fallback.png` the live scene is the stronger composition — edge to edge, ~three-quarters of frame height, centred, the rail cutting through as the single annotation.
- Every figure on the plate is traceable to one dated snapshot file. `LAST CLOSE 738.93`, `WINDOW +10.16%`, `RANGE 629.28 – 760.40`, `DIRECTION 50 / 40` were each derived from the series, not estimated.
- Direction colour carries direction and nothing else; amber is the only voice accent; no blue, no violet, no glass, no bloom stack.
- Phone stacks the composition (rail → title → note → viewport → 2×2 readout → foot rail) instead of shrinking the desktop scene.
- The fallback is a real fallback: a complete chart, letterboxed rather than cropped, with the pause control correctly retired and the status reading `forced still`.

### Watch

- **Second motion channel, disclosed by ruling.** The price axis auto-scales: `windowTable()` precomputes the mid and extent of the sliding window and `update()` drives `plate.scale.y` and the camera aim from it. This is a second motion channel beyond the single linear pan the plan asked for. The controller **accepted** it — piecewise-linear, no easing, reads as a chart pane rescaling — on condition it be disclosed here. It exists because sliding-window extents over this series are bimodal: p25 ≈ 44 points, p75 ≈ 115 points out of a 131.12-point full range, with almost nothing between, so a fixed scale is correct for two pan phases and leaves two-thirds of the plate empty for the rest.
- **`fog: false` on the rail is a deliberate depth-consistency exception.** The rail is an annotation layer, not a solid in the field, so it holds full amber along its run instead of dimming with the bars it measures. Deferred as a minor, recorded here so it is not read as an oversight.
- **The 90-bar fallback SVG is unregenerable.** It was emitted by a throwaway `node` script in the session scratchpad and the generator was deliberately not shipped per the brief. Any future change to the snapshot means hand-editing the SVG or rebuilding the generator from scratch. This is the single largest maintenance liability in the lab.
- **The phone date caption can sit grey-on-red at low contrast.** The muted `2026-07-24` sprite draws on top of the bodies but occasionally lands over a red body, and grey-on-red is a weak pairing. Not a first-read failure; not fixed.
- **The scan does not cover the whole series.** The bounded scan covers roughly bars 20–88, so the oldest ~20 sessions are off-frame at desktop. Every figure on the plate still describes all 90 sessions. This is the cost of bounding the pan to keep the copy junction (738.93 → 670.79, a 68-point discontinuity that painted a false gap-down) off screen — a fix that traded a truthful frame for coverage, correctly.
- **Wick tips clip past the frame edge at the widest pan phases** (worst measured NDC −1.14), inside the vignette's darkest band. Bodies never clip.
- **Phone reads as a detail, not a chart.** With only ~10 bars on screen the plate is a zoomed detail of a chart. Honest consequence of a 3:4 frame; not softened.
- **The still is still the more *informative* frame.** It has price and date axes and shows all 90 sessions. The live plate wins composition, presence and motion; the still wins information. Both statements are true and neither should be dropped.
- Page weight is roughly **779 KiB uncompressed** — `candle-field.html` 16.4 KB + `candle-field.js` 14.5 KB + `lab-shell.js` 8.3 KB + `vendor/three.iife.js` 726.6 KB + `tokens.css` 3.7 KB + `components.css` 11.8 KB + the 16.2 KB snapshot. The Three.js runtime is 93% of it. Fine for fun-track test-driving; a serious promotion would have to measure compressed transfer and first paint on a real device.

## Contract friction

`tokens.css` and `components.css` were not modified. Everything below is page-local glue written because the contract could not express the need. Recorded as evidence only — no contract change is proposed.

1. **`.oo-stage` caps at `max-width: 1080px`.** The labs are 1440px instruments, so `.lab-stage` rebuilds the stage anatomy verbatim minus the ceiling. This was the sixth copy of that boilerplate; `components.css` v1.4 promoted `.oo-stage` precisely because it was the fifth.
2. **`.oo-btn[hidden]` needs a page-local `[hidden] { display: none }` restatement.** `.oo-btn` declares `display: inline-flex` (`components.css:209`), an author declaration that outranks the UA `[hidden]` rule the shell uses to retire the pause control, so the contract's own button primitive defeats the platform's hiding mechanism. **This recurs in all four labs and reads as a `components.css` defect rather than a lab quirk.**
3. **`.lab-canvas[hidden]` / `.lab-static[hidden]`** need the same restatement, for the same reason.
4. **No canvas/still swap primitive.** `.lab-viewport`, `.lab-canvas`, `.lab-static` and the vignette are page-local, and are byte-for-byte the same in all four labs apart from the vignette stop.
5. **The vignette gradient is hand-tuned.** `.lab-viewport::after` here is `ellipse 76% 68% at 50% 50%, transparent 0 40% … .66`, hand-derived by screenshot. **Labs 03 and 04 hand-tuned the same rule in the opposite direction from the same starting point — this recurs and wants a `--oo-vignette-*` token.**
6. **`.oo-stat-value` clamps to 28–40px**, which competes with the display title for first read under a hero. Overridden page-locally to 19px value / 10px delta with tighter padding. No dense `.oo-stat` variant exists.
7. **`.lab-status strong` colour is per-consumer.** The shell writes raw `<strong>` status text, so the contract's `.up` / `.voice` classes cannot be applied and the green-live / amber-fallback / muted-pending semantics are page-local.
8. **`.oo-rail` is fixed at 12px** and its two children collide at 390px; a page-local 10px rule under 720px was needed.
9. **The shell exposes no resize/aspect hook.** `lab-shell.js` owns `resize()`, so the lab reads `camera.aspect` per frame and hand-rolls its portrait framing. All four labs do this.

### Shared harness changes this lab inherited

`lab-shell.js` and `verify-lab.sh` were modified mid-build under explicit authorisation during Task 7, and this lab was re-verified against both:

- **`?reveal=full` seam in `lab-shell.js`.** A fixed 1200ms screenshot wait was sampling an ~8s draw cycle and banking a frame that showed four false dangling edges on Lab 04. The seam pins reveal clocks to completion for the live capture only; it does not touch the renderer path, and `?render=fallback` is untouched. This lab has no reveal clock and does not read it — it re-rendered identically.
- **Vertical-overflow assertion in `verify-lab.sh` step 3b.** Asserts the lowest `.oo-stat` bottom is inside `innerHeight`. This lab's rail sits at 867px against a 900px frame. **The assertion has roughly 45px of slack** — `.lab-viewport` is `flex: 1 1 auto` with `min-height: 62svh`, so it absorbs the first ~15px of readout growth before the rail moves at all, on top of ~31px of headroom. A regression smaller than that passes silently.

## Serious-track gate

Fun-track. No promotion proposed. Promote only if Ayaz likes the live feel **and** the experiment earns a specific public role, and then as one scoped hero/plate, not a global Open Outcry primitive. Two things would have to be closed first that are not closed now: the fallback SVG must be regenerable from the snapshot, and the second motion channel must be re-argued on its merits rather than carried on a controller ruling. Do not change `tokens.css` or `components.css` before that evidence exists.
