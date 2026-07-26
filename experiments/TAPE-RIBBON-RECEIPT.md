# Tape Ribbon — Experiment Receipt

**Track:** fun; no promotion proposed  
**Artifact:** `experiments/tape-ribbon.html`  
**Built:** 2026-07-26  
**Design system:** Open Outcry — `tokens.css` v1.3 / `components.css` v1.4, Broadcast register

## What shipped

- A Three.js ribbon sweeping seven real quotes from a dated Alpha Vantage snapshot across the lower band of a Broadcast plate, the ribbon carrying the machine quotation while a Fraunces headline holds the voice.
- A 4096 × 128 texture sheet painted so that a whole number of quote cycles fits exactly, each cycle ending on a `QUOTE_GAP` — the sheet is perfectly tileable, so for *every* offset the wrap seam falls inside an inter-quote gap and can never bisect a symbol, a price or a percentage.
- Two authored spines snapped at `camera.aspect >= 1.6`, and a four-pass solver alternating `fitDistance` bisection with an aim re-centre measured off actual NDC projection.
- A width direction derived as `cross(tangent, viewAxis)` with authored twist bounded at ±0.5 rad, replacing `computeFrenetFrames`.
- Register discipline: exactly one serif consumer (`.oo-display-broadcast` on the `<h1>`), exactly one `<em>`, no `.oo-scanlines` anywhere, all chrome mono, one warm radial bloom, film grain on an `.oo-grain.oo-overlay` host.
- Two static SVG fallbacks in one `.lab-static` wrapper, gated by CSS at 900px: a wide swept band, and a narrow stacked column of all seven quotes.

## Verification

- `./verify-lab.sh tape-ribbon` → `PASS [tape-ribbon] desktop + phone + fallback`. Re-run fresh at Task 10 against HEAD `c1dc796`; still passes.
- Asserted by that script: `node --check` on `tape-ribbon.js` and `lab-shell.js`; `data-renderer="webgl"` at 1440×900; sized canvas; no horizontal overflow at 1440 or 390; `.oo-stat` rail inside the 900px frame with all four deltas on one line at both widths; `?render=fallback` forcing `fallback` with a 419px-tall still.
- Register law asserted in the browser, not by eye: `document.querySelectorAll('.lab-title em').length === 1`; `.lab-path` and `[data-lab-control]` both compute to `"JetBrains Mono", ui-monospace, monospace`.
- Console clean; one headless-only software-WebGL deprecation warning. Pause control round-trips `[ PAUSE FEED ]` → `[ RESUME FEED ]` → back.
- **Phone completeness verified across a full sheet cycle, not on one frame.** The offset traverses the sheet in ~11.8s at `FEED = 0.085`; six captures at ~1.3–1.5s intervals spanning that cycle, complete symbol+price+percent triplets counted by eye in each: 2, 1, 1, 2, 1, 2 — plus 1 in the verify-run capture. **Never zero.** Worst observed in-frame span ~2.4 quote widths against a 2.0 floor.
- **Figure parity checked character-for-character** on all seven quotes across the snapshot JSON, the live `paintTape` formatting rules, the wide still and the narrow still — including the three traps named by hand: `371.9` → `371.90`, `changePercent: 0.1` → `+0.10%`, and VIXY not VIX.
- The narrow fallback gate was verified to resolve both ways in the browser: at 390×844 `wide: "none" / narrow: "block"`; at 1440×900 `wide: "block" / narrow: "none"`.
- **`verify-lab.sh` captures the fallback at 1440 only, so it structurally cannot see the narrow still.** That evidence is a manual capture: `chrome-devtools-axi open '…?render=fallback'` at 390×844 → `renderer=fallback · tr-still--wide display:none · tr-still--narrow display:block · static box 348×253 · horizontal overflow 0`. Stated plainly because the harness pass line does not cover it.
- **Not verified by proof:** the phone completeness guarantee is *structural* (in-frame span > 2 quote widths) backed by six samples, not exhaustive over every offset. If a future change shortens the narrow band or raises `FIT_TRIM`, that margin erodes first and the finding comes straight back.
- **Not verified:** compressed transfer size, real-device rendering, and whether the grain reads as a register signal at all outside a full-size capture.

## Critique

### Keep

- The headline holds the first read, and it does so compositionally rather than by a filter: the ribbon is *below* the voice in layout, *behind* it in depth (fog plus a top-weighted scrim), and the viewport is unbordered and filled with the renderer's own clear colour so the tape reads as running *through* the plate rather than as a second framed window.
- The wrap seam is bounded **by construction**, not by tuning. The brief's draft pushed quotes from a fixed origin and let ink run off the sheet edge, which would have shown `QQ 684.` butted against `SPY` — a symbol and price that do not exist in the snapshot, invented by the wrap.
- Three separate seams were identified and handled: the texture wrap, the webfont race (`document.fonts.ready` re-measures and repaints, so both metrics and seam bound survive a late font), and the band's own ends (`FIT_TRIM = 0.07` holds the outer 7% out of the framing solve so the ends run off the viewport instead of guillotining a figure).
- No `.oo-register-quote` pane was added, deliberately: the ribbon *is* the quotation, and a second console pane would be quoting twice on a plate whose premise is that it quotes once.
- Three real bugs in the plan's own code were caught rather than shipped: `uvs.push(t, 0, t, 1)` rendered every price **vertically mirrored** (`DIA` reading as `DIV`) because `CanvasTexture` ships `flipY = true`; `computeFrenetFrames` is degenerate on a near-straight narrow spine and seeded its frame down the view axis, rendering the phone plate edge-on as a ~6px thread; and the plan's feed sign ran the tape backwards.
- The reviewer's suggested lever (`repeat` 0.22 → 0.15) was rejected **with the math**: `repeat` is the fraction of the sheet mapped across the band, so lowering it enlarges glyphs but puts *fewer* quotes on screen — the opposite of what completeness needed. The real lever was the spine shape.

### Watch

- **At 390px the fallback is a legible column of seven quotes, not a ribbon.** The reduced-motion phone reader gets the plate's *data* faithfully and its *form* not at all — no sweep, no twist, no diagonal. Accepted trade by controller ruling under the Lab 03/04 legibility-over-form precedent, with figure parity verified character-for-character on all seven quotes. It is a trade, and a reviewer who wanted the form preserved at all widths would have to reject it rather than tune it. The severity that justified the work: the still is the reduced-motion and no-WebGL path, so on a phone the previously illegible surface (one 1400 × 340 `viewBox` scaled into 348 × 253, ~4px per glyph, a grey thread with coloured smudges, **not one figure readable**) was that reader's entire view of the plate.
- **The wide sweep's far tail reaches ~5–6px per glyph.** At the top-right corner the last fragment (`TLT`, wrapping round) compresses hard. Accepted as foreshortening — explicitly **not** Lab 04's failure class, where type was uniformly small — and left alone: dropping wide `repeat` to ~0.85 would retire it at the cost of shortening an approved plate's tape for no gate. By the letter of the legibility gate it is the weakest thing on the plate, and that is said rather than softened.
- **Mid-figure quote entry on desktop is accepted as authentic ticker behaviour.** The near-left edge shows a partial figure sliding in (`…7  -0.31%`) — a figure without its symbol on screen. A reviewer could reasonably call it the same failure class as a seam. The position taken: a tape that never showed a quote mid-entry would be a static list, not a tape. It is only defensible while whole quotes are also on screen, which is exactly why the phone finding was real.
- **`tape-ribbon.js` is over the size guidance.** 401 lines against the ~300 guidance at review, and **442 lines as shipped** — the growth is the two notes explaining why the narrow spine is a wave, which is the part of the file a later reader will otherwise undo. The overage is the framing solver and its commentary, not geometry sprawl. Left per the review; recorded here because it is the largest module of the four Console/Broadcast labs after `blueprint.js`.
- **One tape symbol is VIXY, not VIX.** VIX was unobtainable on the available Alpha Vantage key, so a **real VIXY quote was substituted and labelled honestly** — the readout delta reads `VIXY 21.44 · VIX itself unobtainable`, the tape array is iterated generically with `q.symbol` printed verbatim, and no symbol list is hardcoded anywhere in either file. Both stills print `VIXY`.
- **Alpha Vantage's `REALTIME_BULK_QUOTES` returned a payload explicitly flagged as artificial sample data, and it was discarded rather than shipped.** The snapshot fell back to per-symbol `GLOBAL_QUOTE`. Recorded because a lab whose entire premise is quoting real figures would have been silently falsified by shipping that payload.
- **Dead air in two viewport corners.** A diagonal ribbon cannot fill a 3.3:1 rectangle; roughly 30% of the narrow frame is void between the upper-left triangle and the lower-right corner, measured after the round-1 fix took the projected bbox from ~42% to ~74% of frame area. On a Broadcast plate this reads as air around the voice, but that is a judgement call and the Console labs would not get away with it. An earlier "roughly a quarter" claim was withdrawn as unmeasured.
- **The narrow live plate's figures sit at 40–55° in places.** Legible, and diagonal type is this plate's language, but it asks more of the reader than the desktop tape does.
- **The still wins on completeness at desktop.** It shows all seven quotes complete and legible; the live plate wins on depth, scale variation and a band undulating across the full viewport. "Not a landslide" is the honest verdict at 1440. At 390 the live plate wins for the opposite reason — basic legibility, one to two complete triplets at ~13px.
- **Grain is very subtle** at `.oo-grain`'s stock `opacity: .5` over a `#181210` stage — visible on close inspection, not a strong register signal. Left at the component default.
- **The narrow still's top meta label is brightened page-locally** (`#b4a291` against the wide still's `#7a6a5f`) because the viewport scrim's densest band lands on the top ~14px of it and `#7a6a5f` went near-black. If the scrim is ever re-tuned, that label is the first thing to go dark again.
- Page weight is roughly **790 KiB uncompressed** — `tape-ribbon.html` 22.2 KB + `tape-ribbon.js` 20.7 KB + `lab-shell.js` 8.3 KB + `vendor/three.iife.js` 726.6 KB + `tokens.css` 3.7 KB + `components.css` 11.8 KB + the 16.2 KB snapshot. The HTML is the largest of the four because it carries two inline stills. Compressed transfer is unmeasured.

## Contract friction

`tokens.css` and `components.css` were not modified. Recorded as evidence only; no contract change is proposed.

1. **`.oo-btn[hidden]` needs a page-local `[hidden] { display: none }` restatement** — third and fourth recurrence across the four labs. `.oo-btn` declares `display: inline-flex` (`components.css:209`), which outranks the UA `[hidden]` rule the shell uses to retire the pause control. `.lab-canvas[hidden]` and `.lab-static[hidden]` need the same. **Four-for-four across the labs; it reads as a `components.css` defect rather than a lab quirk.** The narrow-still `display` gate hit the same class of trap from the other direction: `.lab-static > svg { display: block }` (0,1,1) outranks a bare `.tr-still--narrow` (0,1,0), so both gate selectors carry the element qualifier — and `hidden` could not be used at all, because these are `SVGElement`s.

   > **Superseded 2026-07-26 by `experiments/lab-chrome.css`.** The restatement is no longer page-local per lab — it is declared once in the shared lab chrome. **The underlying defect is unchanged and still unfixed:** `components.css:209`'s `.oo-btn { display: inline-flex }` still outranks the UA `[hidden]` rule, and `lab-chrome.css` only stops it recurring per-lab inside `experiments/`. A contract-side `[hidden]` guard is still owed.
2. **The `.lab-viewport::after` scrim is hand-rolled.** Here it is a two-layer top-weighted gradient, because pushing the quotation back under the voice is *how* this plate holds its first read. **The vignette/scrim rule has now been hand-tuned in every lab, in different directions, from the same starting rule — it wants a `--oo-vignette-*` token.** This one is also register-specific in a way a single token may not cover, which is itself part of the evidence.
3. **`--oo-display-broadcast` clamps to 96px**, right for a 4–8 word headline and wrong for a 58-character sentence: at 96px it set five lines and ate the ribbon's whole band. Capped page-locally at `clamp(34px, 4.3vw, 62px)` / `24ch`. Not a contract bug — a display token cannot know the string length — but recorded as friction because every long-headline Broadcast plate will re-derive it.
4. **`.oo-stage` caps at 1080px** and the labs are 1440px instruments, so `.lab-stage` re-declares the stage anatomy. Fourth lab to pay it.
5. **`.oo-content` cannot lift a flex-column stage.** The `.oo-grain.oo-overlay` host sits at `z-index: 0`; `components.css` offers `.oo-content` for the lift, but wrapping every child of a flex-column stage in one `.oo-content` div collapses the layout. Solved with `.lab-stage > *:not(.oo-overlay) { position: relative; z-index: 1 }` — one selector instead of a wrapper.
6. **No bloom primitive.** `.lab-stage::before` hand-rolls the warm radial that Lab 01 also hand-rolls; `.oo-vignette` is the inverse treatment. Two Broadcast plates have now written the same gradient.
7. **No canvas/still swap primitive** — `.lab-viewport`, `.lab-canvas`, `.lab-static` page-local in all four labs.

   > **Superseded 2026-07-26 by `experiments/lab-chrome.css`.** `.lab-viewport`, `.lab-canvas` and `.lab-static` are now shared rather than restated per lab. **The promotion ask is unchanged:** that is deduplication of page-local glue, not a contract primitive — Lab 01 does not consume it and nothing outside `experiments/` can. The vignette stayed page-local because all four values genuinely differ.
8. **The shell does not hand `build()` the renderer.** Anisotropy therefore had to be requested flat (`8`) rather than read off the hardware maximum; three.js clamps the request on upload, so 8 is a ceiling and never an unsupported value. A narrow shell interface is the deliberate design, so this is recorded as a consequence, not a complaint.

### Shared harness changes this lab inherited

Both were made during Task 7 under explicit authorisation, and this lab was built and verified against them:

- **`?reveal=full` seam in `lab-shell.js`** — added because a fixed 1200ms screenshot wait was sampling an ~8s draw cycle and banking a frame with four false dangling edges on Lab 04. This lab inherited a deterministic capture seam rather than a fixed wait; it has no reveal clock of its own, so the seam is inert here and the feed keeps running.
- **Vertical-overflow assertion in `verify-lab.sh` step 3b** — the `.oo-stat` rail must sit inside `innerHeight`; this lab passes it at both widths with all four deltas on one line. **The assertion carries roughly 45px of slack** (the `.lab-viewport` flex floor absorbs the first ~15px of readout growth, on top of ~31px of headroom), so a regression smaller than that passes silently. This lab leaned on the guard and the caveat applies to it.
- `verify-lab.sh` was off-limits during this lab's own fix rounds, which is why the 390-width fallback evidence is a manual capture rather than a script assertion.

## Serious-track gate

Fun-track. No promotion proposed. Promote only if Ayaz likes the live feel **and** the experiment earns a specific public role, and then as one scoped hero/plate, not a global Open Outcry primitive. Three conditions specific to this lab would have to be closed first: the phone completeness guarantee needs to be an assertion rather than six samples; the VIXY substitution needs a data source that can supply what the plate claims; and the narrow fallback's form/data trade needs a reviewer who did not build it to agree that a column is an acceptable tape. Do not change `tokens.css` or `components.css` before that evidence exists.
