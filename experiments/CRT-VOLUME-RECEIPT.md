# CRT Volume — Experiment Receipt

**Track:** fun; no promotion proposed  
**Artifact:** `experiments/crt-volume.html`  
**Built:** 2026-07-26  
**Design system:** Open Outcry — `tokens.css` v1.3 / `components.css` v1.4, Console register

## What shipped

- A 16 × 6 Three.js slab barrel-displaced into a CRT tube, carrying eight real commit lines from this repository's own history plus an idle prompt row.
- A 1280 × 480 canvas texture sheet at 24px glyphs, sized to the real 81-column log line, with the scanlines and the phosphor bleed painted *into* the sheet (canvas-2D `shadowBlur`) rather than applied as a post-processing pass.
- Amber wireframe bezel at `depthTest: false` + `renderOrder: 2`, so the front rail is not swallowed by the surface it frames.
- A typing reveal that starts finished, holds 9s, clears, and retypes at 240 chars/sec — floored to whole characters, plus a 950ms boolean cursor blink. No easing curve anywhere.
- One fixed camera distance derived from `FRAME_H = 7.8` — `camera.position.z` is the constant `DIST` on every frame, so nothing dollies along the view axis. The aim slides to the left bezel rail as the frame narrows (`aimX = Math.min(0, LEFT_EDGE + frameW / 2)`) with `lookAt` re-issued every frame.
- **Pointer drift — second motion channel, disclosed.** This lab passes `pointer: true` and `crt-volume.js:230` offsets the eye laterally by the cursor: `±0.42` units on x, `±0.26` on y, `z` untouched. The shell lerps toward the cursor at `0.055`/frame and suppresses the channel entirely under `prefers-reduced-motion`. So the typing reveal and the blink are not the only motion on this plate, and an earlier draft of this receipt said "nothing dollies" in a way that read as "the camera does not move" — it does move, on x and y, just never in depth. This was recorded as a spec deviation when the receipt was written: §2.1 then scoped pointer drift to Labs 01 and 05, and Labs 02, 03 and 04 all diverged from that in build. **§2.1 was amended on 2026-07-26** to permit drift on any lab, subject to boundedness, linear smoothing, reduced-motion suppression, and disclosure — the amendment followed the code rather than asking three verified plates to change for conformance. So this channel is now sanctioned, not a deviation. It is still disclosed here, because the amendment requires disclosure and because the drift is genuinely a second motion channel alongside the typing reveal and the blink.
- Flat, uncurved static SVG fallback carrying the same nine lines, letterboxed.
- `paintTexture()` skipped on frames where neither the floored character count nor the blink state changed, so the sheet is not re-uploaded for nothing.

## Verification

- `./verify-lab.sh crt-volume` → `PASS [crt-volume] desktop + phone + fallback`. Run three times during the build (at `BARREL = 0.7`, at `1.0` with the bezel fix, and after syncing the readout figure) and **re-run fresh at Task 10** against HEAD `c1dc796`; still passes.
- Asserted by that script: `node --check`; live `data-renderer="webgl"`; sized canvas; zero horizontal overflow at 1440×900 and 390×844; readout rail inside the 900px frame (measured 868px); `?render=fallback` → `data-renderer="fallback"` with `[data-lab-static]` taller than 200px.
- On-screen glyph scale measured, not estimated: ~21px at 1440×900, ~17.5px at 390×844 with 28 columns visible.
- Barrel displacement read by eye at three values across both aspects — `0.70`, `1.00`, and the trend toward `1.15+` — with the verdict for each recorded in the task report.
- The eight log lines were captured verbatim via `git log --oneline -8` on this branch on 2026-07-26. Nothing invented, truncated or reworded.
- The `8 / 46` readout was checked against `git rev-list --count HEAD` rather than assumed.
- `grep` for `#5aa7ff` / `#b77aff`: zero hits (re-checked at Task 10). `border-radius` is 0 throughout.
- **Not verified:** `1.15+` was never shipped or captured; its verdict is extrapolated from the 0.7 → 1.0 trend, not measured.
- **Not verified:** compressed transfer size, and behaviour on real phone hardware. All captures are headless Chromium on this machine.

## Critique

### Keep

- All nine lines resolve cleanly at 1440×900, including the 81-column first line. The bow is unmistakable without being pointed out: centre rows sit proud and slightly magnified, outer rows fall away and lean.
- The slab holds the frame edge to edge and the amber housing frames it as hardware rather than as a floating card. It holds the first read.
- The phone plate is arguably the better of the two: left bezel rail pinned to the frame edge, hashes and message openings fully readable at ~17.5px, and the log running off the right edge reading as a wide tube seen close up rather than as broken layout.
- The substantive finding of the build is worth keeping on the record: **the plan tried to buy legibility with displacement, and displacement was the wrong currency.** The sheet was.
- The only motion is the reveal of real captured text, progressive left-to-right with a trailing cursor. A half-printed line reads as mid-print, not as a truncated commit message. There is no wrap and no seam, so nothing can paint structure the log does not have.

### Watch

- **Barrel displacement settled at 1.00.** The plan started at `1.15` and authorised walking it *down* toward `0.7`. It moved *up* from the plan's fallback direction instead. The plan assumed a `PlaneGeometry(16, 10)`; the real slab is **16 × 6**, so `1.15` of centre bulge is a proportionally much tighter tube than the plan intended — the same displacement over 60% of the vertical extent. `0.70` was fully legible at both aspects but the curve barely registered: the plate read as a flat sheet with a slight bow and did not clearly beat its own flat SVG on presence. The legibility budget was recovered in the texture sheet instead — 1280 × 480 at 24px, sized to the real 81-column line (the plan's 1024 × 640 at 22px clipped that line off the right edge of the sheet and left the bottom 45% of it empty).
- **The phone plate shows ~28 of 81 columns and never a full commit subject.** Accepted property by controller ruling — deliberate, not a defect, do not "fix" it in code. The rejected alternative was fitting the whole 16 × 6 slab by width at aspect 0.77, which requires pushing the camera to roughly **2.8× the shipped distance** and shrinks 24px sheet glyphs to about **6px on screen** — below any readability floor. Partial legible content beats complete illegible content; the full log stays available via the static fallback and the desktop plate. This set the precedent Labs 04 and 05 then leaned on.
- **The flat SVG fallback is sharper than the live plate on pure character legibility.** Vector text at native resolution beats a barrel-warped 1280 × 480 raster sampled at ~0.89. The live slab wins decisively on presence — larger, glowing, curved, moving, against a pillarboxed still with dead margins — and the composition gate is met on first read. But a reviewer who defines "beats its fallback" as "renders text more clearly" would come to the opposite conclusion. Said out loud here rather than left to be discovered. It was judged **not** a first-read inversion, and that judgement is a judgement.
- **The `8 / 46` readout is stale, and by more than it was.** It was accurate at capture: HEAD was `c65292d` and `git rev-list --count HEAD` returned 46. Committing the lab itself made it stale by one (47 at `fb75890`). Measured again at Task 10: HEAD `c1dc796`, `git rev-list --count HEAD` → **54**, so the plate now reads `8 / 46` against a true `8 / 54` — **stale by eight**. Same mechanism as the eight rendered log lines: the lab renders its own repository, and every commit to the branch ages the plate. Documented in-source as a dated snapshot; the honest fix is re-capture, not a live `git log` shell-out, which a static page with no network and no build step cannot do. **Closed in the final fix wave:** the figure was printed with no date qualifier at all while its sibling `> HEAD` stat carried one, so the plate read as current. Its caption is now `on the slab / on the branch · at c65292d` (`crt-volume.html:199`), which makes the plate self-dating — the number is pinned to the commit it was true at instead of silently drifting. The live count at the time of this wave is 55; the plate deliberately does **not** chase it, because re-capturing on every commit is the thing this lab cannot do.
- The bezel was rebuilt from the plan's `2.4`-deep box at `z = -0.6` to `1.0` at `z = -0.15`: at this camera distance the plan's depth splayed into an open crate whose diagonals cut across the top and bottom log lines. Caught by eye on the first verify plate, not by the script.
- Scanline alpha was pulled from the plan's `0.22` to `0.18` because at this sheet scale 0.22 eats a visible slice of the 24px glyph stems.
- The plan's `typed = 0` start was replaced with `typed = TOTAL_CHARS`, hold-then-retype: at the plan's 46 chars/sec the 630-char log takes ~13.7s to print, so the verify script's 1200ms settle — and any human's first two seconds — would have landed on a near-empty slab.
- Page weight is roughly **753 KiB uncompressed** — `crt-volume.html` 10.0 KB + `crt-volume.js` 10.5 KB + `lab-shell.js` 8.3 KB + `vendor/three.iife.js` 726.6 KB + `tokens.css` 3.7 KB + `components.css` 11.8 KB. The Three.js runtime is 96% of it, and this is the lightest of the four labs. Compressed transfer is unmeasured.

## Contract friction

`tokens.css` and `components.css` were not modified. The page-local block is Lab 02's near-verbatim with one substantive change. Recorded as evidence only — no contract change is proposed.

1. **The vignette gradient is hand-tuned, and this is where it became a pattern.** `.lab-viewport::after` here is `radial-gradient(ellipse 98% 94% at 50% 50%, transparent 0 52%, rgba(2,3,2,.5) 100%)` against Lab 02's `ellipse 76% 68% … 0 40% … .66`. Lab 02 can afford a tight window because a candle field is mostly void; here the subject is text running to the frame edges at every aspect, and a 40%-stop vignette dims the very glyphs the lab exists to make readable. **Two labs, two hand-derived values, in opposite directions, from the same starting rule — this wants a `--oo-vignette-*` token (stop position and opacity at minimum).**
2. **`.oo-btn[hidden]` needs a page-local `[hidden] { display: none }` restatement.** `.oo-btn`'s author `display: inline-flex` (`components.css:209`) outranks the UA `[hidden]` rule the shell uses to retire the pause control, so the contract's own primitive silently defeats the platform's hiding mechanism. **Two-for-two across labs at this point and four-for-four by Lab 05 — it reads as a `components.css` defect, not a lab quirk.**
3. **`.lab-canvas[hidden]` / `.lab-static[hidden]`** need the same restatement.
4. **`.oo-stage` caps at 1080px** and the labs are 1440px instruments, so `.lab-stage` re-declares the stage anatomy. Second lab in a row to pay it.
5. **No canvas/still swap primitive** — `.lab-viewport`, `.lab-canvas`, `.lab-static` are page-local, inherited from Lab 02.
6. **Readout density overrides** — `.lab-readout .oo-stat` padding and the smaller value/delta sizes, because `.oo-stat-value` clamps to 28–40px and competes with the display title. No compact `.oo-stat` variant exists.
7. **The shell exposes no resize/aspect hook**, so the aspect-driven aim is hand-rolled per frame.
8. **`data-lab-static` cannot sit on an `<svg>`** — `hidden` is an `HTMLElement` IDL attribute and `SVGElement` lacks it, so the shell's `el.static.hidden = false` writes a dead expando. Solved with a wrapper `<div>`, inherited from Lab 02 rather than rediscovered. This is a shell-interface constraint that no lab can express any other way.

### Shared harness changes this lab inherited

`lab-shell.js` and `verify-lab.sh` were modified mid-build under explicit authorisation during Task 7, and this lab was re-verified against both:

- **`?reveal=full` seam in `lab-shell.js`** — added because a fixed 1200ms wait was sampling an ~8s draw cycle and banking a frame with four false dangling edges on Lab 04. This lab has a reveal clock but does not read the seam; it re-rendered identically, which was confirmed by re-reading the capture rather than assumed.
- **Vertical-overflow assertion in `verify-lab.sh` step 3b** — lowest `.oo-stat` bottom against `innerHeight`. This lab measured 868px in a 900px frame. **The assertion carries roughly 45px of slack** (the `.lab-viewport` flex floor absorbs the first ~15px of readout growth, on top of ~31px of headroom), so a regression smaller than that passes silently.

## Serious-track gate

Fun-track. No promotion proposed. Promote only if Ayaz likes the live feel **and** the experiment earns a specific public role, and then as one scoped hero/plate, not a global Open Outcry primitive. Two conditions specific to this lab would have to be met first: the fallback-sharper-than-live comparison has to be settled by someone other than the implementer, and any public surface would need a re-capture discipline — a plate that renders its own repository is stale on the day it ships and is already stale by eight commits. Do not change `tokens.css` or `components.css` before that evidence exists.
