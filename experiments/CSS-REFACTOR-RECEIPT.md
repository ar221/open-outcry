# CSS de-duplication refactor — Labs 02–05

Branch `labs-css`, worktree `open-outcry-css`. Goal: extract the genuinely shared
page-local glue out of four lab `<style>` blocks into one stylesheet, **changing no
pixels**. The frozen contract (`tokens.css` v1.3, `components.css` v1.4) was not
touched, nor was any `.js`, nor `lab-shell.js`, nor `verify-lab.sh`, nor any
`depth-tape.*` file.

---

## 1. What shipped

**New file: `experiments/lab-chrome.css`** — 137 total lines, **62 normalized CSS
lines**. Its opening comment states plainly that it is page-local chrome shared by
Labs 02–05, that it is *not* part of the frozen v1.4 contract and must not be
confused with `tokens.css`/`components.css`, and that Lab 01 deliberately does not
consume it.

The four labs each gained one `<link rel="stylesheet" href="lab-chrome.css">` after
`components.css`, so the shared sheet loads **before** each page's own `<style>` —
page-local rules of equal specificity still win, which is what keeps the
per-lab overrides working.

## 2. Line counts, before → after

`<style>` lines counts both the main block and the `<noscript>` block, tags included
(the 125/125/129/189 convention from the brief). Normalized counts strip comments and
blank lines.

| Lab | `<style>` before | after | removed | normalized before | after | removed |
|---|---|---|---|---|---|---|
| `candle-field` (02) | 125 | 67 | 58 | 93 | 39 | **54** |
| `crt-volume` (03) | 125 | 66 | 59 | 93 | 39 | **54** |
| `blueprint` (04) | 129 | 73 | 56 | 93 | 39 | **54** |
| `tape-ribbon` (05) | 189 | 134 | 55 | 115 | 61 | **54** |
| **TOTAL** | **568** | **340** | **228** | **394** | **178** | **216** |

`lab-chrome.css`: **62** normalized lines added.
Net normalized CSS across the five files: **394 → 240** (178 page-local + 62 shared),
a **154-line** reduction.

The removed count is **exactly 54 for every one of the four labs**. That uniformity is
the useful signal: it is what a genuinely four-way-common surface looks like. Nothing
Console-specific or Broadcast-specific was pushed into the shared file to inflate the
number — had I done that, the per-lab figures would have diverged.

### Why 62 shared lines and not the ~69 measured as four-way common

The brief measured 69 normalized lines common to all four. I shared 62. The seven-line
gap is deliberate and is the most important judgement call in this refactor:

- **`@media (max-width: 720px) .lab-head { gap: 12px; padding: 20px 0 16px }`** (1 line)
  and **`@media (max-width: 720px) .lab-readout { padding: 14px 0 16px }`** (1 line) are
  four-way identical, but their *base* rules are not (`.lab-head` is flex in Labs 02–04
  and grid in Lab 05; `.lab-readout` padding is `18px 0 20px` in Labs 02–03 and
  `16px 0 16px` in Labs 04–05). Splitting a property between this file's `@media` and a
  page-local base rule of **equal specificity** would let the page-local base win at
  ≤720px and silently invert the breakpoint. So where the base differs, the base **and**
  its responsive override both stayed page-local. This is a real regression I avoided,
  not a stylistic preference.
- **`@media (max-width: 900px) .lab-head { padding-top: 24px }`** (1 line) — same hazard;
  Lab 05 combines it with `grid-template-columns`.
- **`.lab-note { font-size: 13px }`** (1 line) — the font-size is four-way common but
  `max-width` is not (46/46/52/44ch). Not worth fragmenting a two-property rule.
- **The `<noscript>` block** (2 lines, four-way identical) **cannot** move: an external
  stylesheet has no meaning inside `<noscript>`.

## 3. What I deliberately did NOT share, and why

**The vignette gradient — verified, and they genuinely differ.** I checked before
assuming, and the brief's suspicion was right. All four values are distinct, and one
was tuned in the opposite direction from the others:

| Lab | `.lab-viewport::after` gradient |
|---|---|
| 02 `candle-field` | `ellipse 76% 68% at 50% 50%`, stop `40%`, `rgba(2,3,2,.66)` |
| 03 `crt-volume` | `ellipse 98% 94% at 50% 50%`, stop `52%`, `rgba(2,3,2,.5)` |
| 04 `blueprint` | `ellipse 99% 96% at 50% 50%`, stop `56%`, `rgba(2,3,2,.46)` |
| 05 `tape-ribbon` | two layers — a top-weighted `linear-gradient` scrim **plus** `ellipse 98% 96% at 50% 56%`, stop `58%`, `rgba(2,3,2,.42)` |

Lab 02 is a tight spotlight window because a candle field is mostly void; Labs 03–05
run reading matter to the frame edges and so use wide, late, weaker falloff. Lab 05
additionally seats its band back under the headline. **Only the positioning scaffold**
(`content`, `position`, `inset`, `z-index`, `pointer-events`) is shared; every stop
stays with its plate, with the reasoning kept next to the value.

**Register colour**, all page-local: `body` `color` (`--oo-fg` vs `--oo-fg-warm`),
`.lab-path`, `.lab-meta`, `.lab-static` background, and `.lab-stage`'s
`background-color` / `border-inline`. Labs 02–04 are Console; Lab 05 is Broadcast
(warm stage, film grain, one radial bloom, **no scanlines**). Collapsing these would
have destroyed the register distinction the labs were reviewed for.

**Lab 05's whole composition layer**, page-local: `.lab-stage::before` (the one warm
bloom), the `.lab-stage > *:not(.oo-overlay)` grain host, the grid `.lab-head`, the
capped `.lab-title` clamp, `.lab-aside`, `.lab-source`, and the two-still
`.tr-still--wide` / `.tr-still--narrow` swap. This is exactly the work that took two
fix rounds to pass the composition gate; none of it is shared surface.

**Per-plate vertical budgets**, page-local: `.lab-readout` padding and `.lab-viewport`
`min-height` are each budgeted against `verify-lab.sh`'s 1440×900 readout-rail
assertion.

## 4. The two recurring frictions — both folded in

- **`[hidden]` restatement.** `components.css:209`'s `.oo-btn { display: inline-flex }`
  outranks the UA `[hidden] { display: none }` rule that `lab-shell.js` relies on, so
  `.oo-btn[hidden] { display: none }` plus `.lab-canvas[hidden], .lab-static[hidden]`
  had to be restated in every lab. Now declared **once** in `lab-chrome.css`. The
  frozen contract was not touched to achieve this, which was the point.
- **The vignette.** Verified and kept page-local per §3 — sharing it would have changed
  pixels on three of four labs.

I also amended three now-stale entries in `experiments/README.md` "Known limitations"
that my change falsified (the "six copies of the stage boilerplate" count, the
"restated page-locally in all four shell labs" `[hidden]` claim, and the canvas/still
entry). Each amendment keeps the underlying contract-side recommendation intact —
deduplicating page-local glue does **not** retire those, and the notes now say so.

## 5. `index.html` decision — **not linked**

Leave it alone. Measured, not assumed:

- It carries **zero `.lab-*` classes**. It uses a `.sheet-*` namespace throughout. The
  seven `lab-` hits in the file are prose (filenames in row descriptions). So roughly
  51 of `lab-chrome.css`'s 62 lines would be dead selectors.
- It has **no `<canvas>`, no viewport, no `.lab-static`, no `[hidden]` toggling**
  (its only `hidden` hits are `overflow: hidden` and `aria-hidden`) and **no `<button>`
  and no `.oo-btn`**. Both frictions this file exists to resolve are *structurally
  absent* — 0% of the file's actual purpose applies.
- What genuinely overlaps is only the ~9-line generic reset (`*`, `:root`,
  `html, body`, `body`'s three non-colour properties) plus one `@media` `.oo-rail` line
  — and `index.html` already declares all of it verbatim. Linking would remove nothing
  unless I also stripped its reset, coupling a different page type to a lab-scoped
  stylesheet for a ~9-line win.
- `lab-chrome.css` also carries `button { font: inherit }`, which `index.html` does not
  declare. Harmless today (no buttons) but it is a rule for elements the page lacks.
- The real risk: importing a lab-scoped file into a non-lab page is precisely how a
  dedup file mutates into the second de-facto contract the brief forbids. `index.html`
  is a different page type and stays independent.

## 6. Verification

### 6a. Declaration-set equivalence (structural proof)

Before screenshots, I flattened every declaration (`@media` context, selector,
property, value) out of each lab's original committed `<style>` blocks and compared it
as a multiset against `lab-chrome.css` + the lab's new `<style>` blocks:

```
candle-field   old_decls=89   new_decls=89   identical declaration set
crt-volume     old_decls=89   new_decls=89   identical declaration set
blueprint      old_decls=89   new_decls=89   identical declaration set
tape-ribbon    old_decls=107  new_decls=107  identical declaration set
PROBLEMS: 0
```

Not one declaration lost, gained, or altered. I then audited every property appearing
in both the shared sheet and a page-local block for cascade-order inversion (see §2);
no property is split between a shared `@media` and a page-local base rule.

### 6b. `verify-lab.sh` — the five lines

```
PASS [candle-field] desktop + phone + fallback
PASS [crt-volume] desktop + phone + fallback
PASS [blueprint] desktop + phone + fallback
PASS [tape-ribbon] desktop + phone + fallback
FAIL [depth-tape] ?render=fallback did not force fallback, got 'webgl'
```

Lab 01 is correct: it passed every live check — `node --check` on both scripts,
`data-renderer=webgl`, no horizontal overflow at 1440 or 390, canvas sized, the
readout-rail vertical assertion — and reached `verify-lab.sh:110` before failing on
its single pre-existing `?render=fallback` assertion. It produced its desktop and
phone captures normally. Harness intact, Lab 01 untouched.

`?render=fallback` is asserted by the harness on all four labs (step 5, line 110) and
`?reveal=full` on all four (step 3, line 60) — both still work. I additionally
confirmed `?render=fallback` at 390 on Lab 05, where the narrow-still media rule is
the one page-local rule with genuine cascade risk: `renderer=fallback`,
`.tr-still--narrow` → `display: block`, `.tr-still--wide` → `display: none`, and the
capture is **byte-identical** to the recorded baseline (`8a4864db6985`).

### 6c. Screenshot comparison, `/tmp/oo-verify/` vs `/tmp/oo-baseline/`

Baseline (33 files) was not overwritten. Byte comparison of all 12 harness captures:

| Capture | desktop | phone | fallback |
|---|---|---|---|
| `candle-field` | differs | differs | **byte-identical** |
| `crt-volume` | **byte-identical** | **byte-identical** | **byte-identical** |
| `blueprint` | **byte-identical** | **byte-identical** | **byte-identical** |
| `tape-ribbon` | differs | differs | **byte-identical** |
| `depth-tape` (untouched) | differs | differs | n/a (pre-existing fail) |

8 of 12 are byte-identical, including **all four deterministic fallback captures**.
The four that differ needed explaining rather than dismissing, so I ran it down three
ways:

**(i) `depth-tape` — which I never touched — also differs.** That establishes the
noise floor immediately: these live WebGL captures are frame-nondeterministic.

**(ii) Run-to-run noise on identical code exceeds the baseline delta.** I re-ran the
harness with no code change between runs:

| Capture | run1 vs run2 (same code) | baseline vs new |
|---|---|---|
| `candle-field-desktop` | 11575 px (0.89%) | 10842 px (0.84%) |
| `candle-field-phone` | 4956 px (1.51%) | 4467 px (1.36%) |
| `tape-ribbon-desktop` | 17415 px (1.34%) | 13975 px (1.08%) |
| `tape-ribbon-phone` | 7073 px (2.15%) | 5549 px (1.69%) |
| `depth-tape-desktop` | 8560 px (0.66%) | — (untouched) |

In every case the *identical-code* variance is **larger** than the
baseline-vs-refactor delta, in the same bounding boxes. The residual is animation
phase, not CSS.

**(iii) Every differing pixel is inside the canvas; the CSS-drawn chrome is
pixel-perfect.** I measured the live `.lab-viewport` rect for each lab at each width
and confirmed every diff bbox falls strictly inside it. Then I masked the canvas
region out and compared **only the chrome** — head, title, note, stat rail, footer
rail, stage borders, gutters:

```
candle-field desktop   diffpx=0  maxdelta=0  bbox=None
candle-field phone     diffpx=0  maxdelta=0  bbox=None
tape-ribbon  desktop   diffpx=0  maxdelta=0  bbox=None
tape-ribbon  phone     diffpx=0  maxdelta=0  bbox=None
```

Zero. I then narrowed to the viewport border ring and split it by depth: on
`candle-field` the border row itself (`k=0`) has **0** differing pixels at both
widths, with all residual one pixel further in, on the canvas side. `tape-ribbon`'s
viewport is deliberately unbordered, so its ring is canvas content by definition.
Border geometry and colour are independently confirmed by the four byte-identical
fallback captures, which render the same viewport box with deterministic SVG content.

**Visual read.** I opened the `candle-field` and `tape-ribbon` desktop pairs with the
Read tool side by side. Indistinguishable: same pixel headline and amber, same
vignette weight, same four stat cards and figures, same rails and borders. On Lab 05
the Broadcast register is fully intact — warm stage, the single up-left bloom,
unbordered viewport, no scanlines, Fraunces headline holding the first read with the
contract's peach `<em>`. The only differences visible under diff are a few candle
wicks and ribbon glyph edges shifted by animation phase.

### 6d. Conclusion

**No pixel changed.** Every CSS-drawn pixel is identical across all four labs at both
widths and on every fallback. The only differing pixels are animated WebGL canvas
content in two labs, and those labs differ from *themselves* by more, run to run, on
unmodified code — as does Lab 01, which I never touched. No regression was found, so
nothing was reverted.

## 7. Files changed

| File | Change |
|---|---|
| `experiments/lab-chrome.css` | **new**, 137 lines / 62 normalized |
| `experiments/candle-field.html` | `<link>` added; `<style>` 125 → 67 |
| `experiments/crt-volume.html` | `<link>` added; `<style>` 125 → 66 |
| `experiments/blueprint.html` | `<link>` added; `<style>` 129 → 73 |
| `experiments/tape-ribbon.html` | `<link>` added; `<style>` 189 → 134 |
| `experiments/README.md` | 3 stale "Known limitations" entries corrected |

Untouched, confirmed by `git diff --stat`: `tokens.css`, `components.css`,
`experiments/lab-shell.js`, `experiments/verify-lab.sh`, all `depth-tape.*`,
`experiments/index.html`, and all four labs' `.js`. No `#5aa7ff`, no `#b77aff`, no
border-radius introduced.

---

## 8. Addendum — review follow-up, 2026-07-26 (documentation only)

Review returned Spec ✅ with no Critical and no Important findings. The visual-no-op claim
was independently reproduced: declaration multisets re-derived with a separate parser
(89/89/89/107 equal), pixel diffs matched exactly (10842 / 4467 / 13975 / 5549), untouched
`depth-tape` confirmed the run-to-run noise floor, and the vignette-differs claim was
verified against `main`. The reviewer additionally ran a cascade-order analysis that a
multiset check cannot catch — **zero `(media, selector, property)` triples appear in both
`lab-chrome.css` and any lab's page-local block**, and the four cross-selector cases resolve
correctly by specificity or document order. Under-extraction (62 < 69) accepted with
reasons.

Three Minors closed in a follow-up commit. **No CSS, HTML or JS was touched** — the
refactor is verified and was not re-opened. No re-verification run was required.

1. **Nine falsified receipt passages stamped.** My change made passages in the four lab
   receipts read as false: they assert the duplication still exists per-lab. I had amended
   `README.md` but not the receipts, which was an inconsistent policy — and these receipts
   are the evidence a future promotion decision rests on. Applied the **per-passage stamp**
   uniformly (the reviewer's preferred option, since it keeps the friction history readable
   while making current state unambiguous): a one-line
   `> **Superseded 2026-07-26 by experiments/lab-chrome.css**` note under each affected
   item — `CANDLE-FIELD-RECEIPT.md` ×3, `CRT-VOLUME-RECEIPT.md` ×3,
   `BLUEPRINT-RECEIPT.md` ×2, `TAPE-RIBBON-RECEIPT.md` ×2. `DEPTH-TAPE-RECEIPT.md` is
   untouched and correctly so: Lab 01 does not consume the sheet.

   **Every stamp keeps the contract-side ask alive.** `components.css:209`'s
   `.oo-btn { display: inline-flex }` defeating the UA `[hidden]` rule is still a real,
   unfixed defect; `lab-chrome.css` only stops it recurring per-lab inside `experiments/`.
   Likewise the canvas/still promotion candidate stands — sharing page-local glue is not a
   contract primitive.

2. **`lab-chrome.css` introduced as architecture, not a footnote.** It previously appeared
   only under "Known limitations". Added a full **"Shared page chrome — `lab-chrome.css`,
   Labs 02–05"** section immediately after the shared-Three.js-runtime section (load order,
   what it carries, what it deliberately does not and why, the not-contract warning, and
   both non-consumers), plus a pointer in the top-of-file Labs material so a reader meets
   the file while reading the lab anatomy.

3. **Report relocated.** `CLAUDE.md` enumerates the repo root as `tokens.css`,
   `components.css`, `index.html`, `examples/` and category folders; a refactor log is not
   in that set, and root `DESIGN.md` is an undocumented squatter rather than precedent.
   Moved via `git mv` so history follows: root `CSS-REFACTOR-REPORT.md` →
   `experiments/CSS-REFACTOR-RECEIPT.md`, where it sits with its five sibling receipts and
   inside the directory it describes. The root no longer carries it.
