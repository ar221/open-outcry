# Contract v1.5 — `[hidden]` guard — Receipt

**Track:** contract change (freeze lifted for this scope only)
**Artifact:** `components.css` v1.4 → **v1.5**
**Shipped:** 2026-07-26
**Branch / worktree:** `contract-v15` / `open-outcry-v15`
**Design system:** Open Outcry — `tokens.css` **v1.3, unchanged** / `components.css` **v1.5**

This is the first change to the contract since v1.4. The freeze was lifted by friction
evidence from four independent consumers, in the same way v1.3 and v1.4 were earned.
Scope was one defect and its whole class; nothing else was promoted, and no new
primitive, token, class, or modifier was added.

---

## 1. The defect

`[hidden] { display: none }` ships in the **user-agent** stylesheet. Every author
declaration beats the UA origin regardless of selector weight, so any contract class
declaring `display` silently defeated the platform's own hiding mechanism: markup set
the attribute, the DOM and assistive tech agreed the element was hidden, and it stayed
on screen.

`:where()` is **not** a fix here, and this is worth stating because v1.3 used exactly
that trick for `.oo-stat-value`. That was a *specificity* problem between two author
declarations. This is a *cascade-origin* problem, and origin outranks specificity
entirely — a zero-specificity author `display` still beats the UA sheet. The contract
therefore has to name `[hidden]` explicitly.

## 2. Scope was wider than the reported instance — ten classes, not one, and not five

The bug was reported against `.oo-btn`. The pre-brief survey identified four more
(`.oo-tickwrap`, `.oo-grid-2/-3/-4`). **I measured, and it is ten.** Five further
classes carry the identical trap and were missing from the survey:

| Class | `display` | In survey? | Verified pre-fix |
|---|---|---|---|
| `.oo-btn` | `inline-flex` | reported | ignored `hidden` |
| `.oo-tickwrap` | `inline-block` | yes | ignored `hidden` |
| `.oo-grid-2` | `grid` | yes | ignored `hidden` |
| `.oo-grid-3` | `grid` | yes | ignored `hidden` |
| `.oo-grid-4` | `grid` | yes | ignored `hidden` |
| `.oo-rail` | `flex` | **no** | ignored `hidden` |
| `.oo-dot` | `inline-block` | **no** | ignored `hidden` |
| `.oo-cursor` | `inline-block` | **no** | ignored `hidden` |
| `.oo-stat-value` | `block` | **no** | ignored `hidden` |
| `.oo-stat-delta` | `block` | **no** | ignored `hidden` |

Fixing only `.oo-btn` would have left nine landmines and made the v1.5 changelog a lie.
`.oo-rail` is the one that would have bitten next: it is the header/footer chrome
primitive, and hiding a rail by attribute is the obvious thing a consumer reaches for.

## 3. The fix

One rule at the foot of `components.css`, plus a `▲ TRAP` entry in the file header
telling the next author that a new `display`-declaring class must be added to it:

```css
.oo-rail[hidden], .oo-dot[hidden], .oo-cursor[hidden], .oo-tickwrap[hidden],
.oo-grid-2[hidden], .oo-grid-3[hidden], .oo-grid-4[hidden],
.oo-stat-value[hidden], .oo-stat-delta[hidden],
.oo-btn[hidden] { display: none; }
```

One coherent rule rather than ten scattered ones, because the defect is one defect.

**What it deliberately is not:** a global `[hidden] { display: none }` reset. The
contract styles the classes it owns and no bare elements; a global reset would make
`components.css` start styling the whole document, and a consumer's own
display-declaring classes stay the consumer's problem. That boundary is written into
the rule's comment so it is not "simplified" later.

`tokens.css` needed no change and stays **v1.3**. Rendered `v1.3 / v1.4` pairs are now
`v1.3 / v1.5`.

## 4. Class count is unchanged at 38

Blueprint's plate renders `38 CLASSES`. The figure is the count of unique `.oo-*` class
selectors in `components.css`; re-run against v1.5 it is still **38**, because
`[hidden]` selectors attach to existing classes and introduce no new class name. Every
surface printing 38 was left alone.

```
$ python3 -c "…set(re.findall(r'\.(oo-[\w-]*)', decommented_css))…"
oo-* classes: 38
```

## 5. Workaround retired

`experiments/lab-chrome.css` carried `.oo-btn[hidden] { display: none; }` — the deduped
fourth copy of a restatement four labs each wrote independently. **Removed**, with a
`RETIRED v1.5` note in its place, per the convention `examples/morning-brief.html` uses
throughout.

`.lab-canvas[hidden]` / `.lab-static[hidden]` in the same file were checked and **stay**.
They are page-local classes whose `display: block` is declared in `lab-chrome.css`
itself; the contract does not own them and must not style them. Their comment now says
so, instead of pointing at "the same trap as `.oo-btn` below" — which no longer exists.

Also closed, because they asserted in the present tense that the guard was still owed:
six `still unfixed` / `A contract-side [hidden] guard is still owed` blocks across the
four lab receipts (stamped `Closed 2026-07-26 by components.css v1.5`, appended rather
than rewritten, matching the existing `Superseded` stamp convention), and the
`.oo-btn defeats the hidden attribute` known-limitation bullet in `experiments/README.md`.
The `.oo-stage` 1080px-cap ask in that same list is a **different**, still-open friction
and was left untouched.

## 6. Version strings updated

Changed — each was a statement about the present that a bump would have falsified:

| File | Was | Now |
|---|---|---|
| `components.css:2` | `components v1.4` | `components v1.5` |
| `index.html:52` | `brand-book · v1.4` | `brand-book · v1.5` |
| `index.html:168` | `v1.3 / v1.4 CONTRACT NOTES` | `v1.3 / v1.5 CONTRACT NOTES` + a `[hidden]` v1.5 entry |
| `experiments/blueprint.html:175` | `v1.4 · 38 CLASSES` | `v1.5 · 38 CLASSES` |
| `experiments/blueprint.html:205` | `SHEET 04 · REV v1.4` | `REV v1.5` |
| `experiments/blueprint.html:215` | `v1.3 / v1.4` | `v1.3 / v1.5` |
| `experiments/blueprint.html:236` | `v1.4 CONTRACT` | `v1.5 CONTRACT` |
| `experiments/index.html:354` | `v1.4 · 38 CLASSES` | `v1.5 · 38 CLASSES` |
| `experiments/index.html:384` | `SHEET 04 · REV v1.4` | `REV v1.5` |
| `experiments/index.html:463` | `CONTRACT v1.4 UNCHANGED` | `CONTRACT v1.5 · [hidden] FIX PROMOTED` |
| `experiments/lab-chrome.css:13` | `../components.css (v1.4)` | `(v1.5)` |
| `experiments/README.md:26,112` | `components.css (v1.4)` is the contract | `v1.5` |

`experiments/index.html:463` read **`CONTRACT v1.4 UNCHANGED`**. Renumbering alone would
have produced "v1.5 unchanged", which is false twice over, so the claim was reworded.

`blueprint.html:174` / `index.html:353` (`v1.3 · 59 PROPS`) are token-side and correctly
stay v1.3. `experiments/blueprint.js` contains no version strings — verified.

**Deliberately left alone as dated historical record**, per "a statement about the past
stays": every `PROMOTED v1.3` / `RETIRED v1.4` / `CODIFIED v1.3` marker in
`examples/morning-brief.html` and `examples/inir.html`; `morning-brief`'s "second
consumer of open-outcry v1.3"; the `Design system: … components.css v1.4` headers on the
five lab receipts (what each lab was built against); `LABS-02-05-PLAN.md` /
`-DESIGN.md` / `CSS-REFACTOR-RECEIPT.md` (dated plans and receipts); the in-file
`(promoted v1.4 — …)` annotations in `components.css`, which are that file's changelog
convention and record when each rule arrived; `index.html:160`'s
`CONTROLS — .oo-btn · v1.3` (when `.oo-btn` was promoted); and
`tape-ribbon.html:53`'s citation of the contract version it was verified against.

## 7. Verification

### 7.1 `./verify-lab.sh`, all five labs

```
PASS [candle-field] desktop + phone + fallback
PASS [crt-volume]   desktop + phone + fallback
PASS [blueprint]    desktop + phone + fallback
PASS [tape-ribbon]  desktop + phone + fallback
FAIL [depth-tape] ?render=fallback did not force fallback, got 'webgl'
```

`depth-tape`'s failure is its single pre-existing `?render=fallback` assertion; its live
checks pass. Confirmed pre-existing by running the same command on the stashed clean
tree — **byte-identical failure message**. No `depth-tape.*` file was touched.

### 7.2 Observed proof the fix works

Chrome DevTools, `http://127.0.0.1:8801/index.html`, setting `el.hidden = true` and
reading computed `display` + `getClientRects().length`.

**Before the fix** — every one of the ten kept its author `display` and stayed laid out:

```
.oo-btn         display: flex         → flex          rects: 1
.oo-grid-2/3/4  display: grid         → grid          rects: 1
.oo-tickwrap    display: inline-block → inline-block  rects: 1
.oo-rail        display: flex         → flex          rects: 1
.oo-dot         display: inline-block → inline-block  rects: 1
.oo-cursor      display: inline-block → inline-block  rects: 1
.oo-stat-value  display: block        → block         rects: 1
.oo-stat-delta  display: block        → block         rects: 1
```

**After the fix** — all ten collapse, zero client rects, zero box:

```
.oo-btn (real anchor on page)  flex         → none   rects: 0   w×h: 0×0
.oo-grid-2                     grid         → none   rects: 0   w×h: 0×0
.oo-grid-3                     grid         → none   rects: 0   w×h: 0×0
.oo-grid-4                     grid         → none   rects: 0   w×h: 0×0
.oo-tickwrap                   inline-block → none   rects: 0   w×h: 0×0
.oo-rail                       flex         → none   rects: 0   w×h: 0×0
.oo-dot                        inline-block → none   rects: 0   w×h: 0×0
.oo-cursor                     inline-block → none   rects: 0   w×h: 0×0
.oo-stat-value                 block        → none   rects: 0   w×h: 0×0
.oo-stat-delta                 block        → none   rects: 0   w×h: 0×0
```

**In the real consumer path** — `candle-field.html?render=fallback`, where
`lab-shell.js` genuinely sets the attribute and the `lab-chrome.css` workaround is now
gone, so only the contract can be doing the work:

```
renderer: "fallback"      buttonHiddenAttr: true
buttonComputedDisplay: "none"     buttonClientRects: 0
labChromeStillHasOoBtnRule: false
sheets: [tokens.css, components.css, lab-chrome.css]
```

### 7.3 Proof it is a no-op for pages that were fine

Full-page screenshot diffing on these pages is dominated by noise that has nothing to do
with CSS — two looping `setTimeout` typewriters, `:hover` state left under the mouse
pointer, and `.oo-scanlines`' 4px-period background rephasing whenever page height
changes. I chased all three down and then used a strictly stronger test for the actual
question: **hold the DOM constant and swap only the stylesheet** (`components.css` v1.5 ↔
the committed v1.4), comparing *every* computed property and layout box of *every*
element. Animations frozen, `pointer-events: none` so `:hover` can never match,
typewriters pinned.

| Page | Elements | Differing properties | Differing layout boxes |
|---|---|---|---|
| `index.html` | 409 | **0** | **0** |
| `examples/inir.html` | 124 | **0** | **0** |
| `examples/morning-brief.html` | 194 | **0** | **0** |
| `experiments/index.html` | 354 | **0** | **0** |

The anchors specifically: `morning-brief`'s three `.oo-btn` are `<a>`, `hidden: false`,
`display: flex` under both v1.4 and v1.5 — the no-op for anchors is measured, not assumed.
Root `index.html`'s two `<a>` specimens likewise sit inside the 0-difference sweep.

**Positive control**, same method on `blueprint.html?render=fallback` where the button
*is* hidden — exactly 6 of 112 elements differ, and every one is the button or an
ancestor whose layout depends on it:

```
BUTTON .oo-btn.oo-pane.oo-hover.lab-control  [hidden]  display: v1.5=none | v1.4=flex
                                                       box: 0,0,0,0 | 1233,911,135,36
FOOTER .oo-rail.oo-rail--foot                          height: 40.19 | 57
SPAN   .lab-meta                                       y: 910.66 | 919.06  (re-centred)
MAIN/BODY/HTML                                         height: 939.84 | 956.66
```

Nothing unrelated moves. (The v1.4 column here is v1.4-contract *with the workaround
already removed* — a state that never shipped. The shipped v1.4 baseline hid the button
via `lab-chrome.css` and produced the same 40.19px rail, which is why §7.4's lab shots
are unchanged.)

### 7.4 Lab screenshots vs `/tmp/oo-v15-baseline/` (33 files, not overwritten)

| Capture | Differing pixels | Cause |
|---|---|---|
| `crt-volume` desktop / phone / fallback | **0 / 0 / 0** | — |
| `candle-field-fallback` | **0** | — |
| `tape-ribbon-fallback` | **0** | — |
| `blueprint-desktop` | 9×14 box | the `4`→`5` glyph in `v1.5 CONTRACT` |
| `blueprint-phone` | 8×13 box | same glyph, narrow layout |
| `blueprint-fallback` | 165 px, 3 tiny clusters | the three version digits in the SVG |
| `candle-field-desktop` | 21,961 — **21,649 inside the WebGL viewport** | animated three.js frame |
| `tape-ribbon-desktop` | 4,542 — **4,515 inside the WebGL viewport** | animated three.js frame |

Only Blueprint differs in chrome, and only in version-string glyphs — confirmed by
rendering the difference masks and reading them. The two live WebGL diffs were traced
into the instrument itself (candle geometry and wick lines drawn a frame apart); the
handful of pixels initially classed "outside the viewport" were candle bodies at the
frame edge, not chrome. The deterministic fallback captures of those same two labs are
pixel-identical, and all four passed `verify-lab.sh`'s composition and frame assertions.

### 7.5 Intended, reported layout change

Root `index.html` grew **6560 → 6666 px** tall (+106). Sole cause: the added `[hidden]`
row in the `v1.3 / v1.5 CONTRACT NOTES` plate, which is a deliberate content edit — the
plate is the brand book's public changelog and v1.5 is a behavioural change consumers
need to know about. Above the plate the pages are identical but for the one version
glyph (6×9 px diff box); below it, content shifts down 106px, which also rephases the
stage scanlines. No unintended change: §7.3 proves the *stylesheet* moves nothing at all.

## 8. Constraints honoured

Not modified: `tokens.css` (no change needed), `lab-shell.js`, `verify-lab.sh`, every
`depth-tape.*` file, every lab `.js`. No `#5aa7ff`, no `#b77aff`. No `git add -A` —
paths staged explicitly. Nothing pushed. `/tmp/oo-v15-baseline/` untouched (33 files).
One temporary `components-v14-TEMP.css` was created for the §7.3 A/B swap and removed;
`git status` is clean of it.

## 9. Concerns / owed

- **The rule is a manual list.** A future class declaring `display` and not added to it
  reintroduces the bug silently. Mitigated by the `▲ TRAP` header note, but a real guard
  would be a check in CI that greps `components.css` for `display:` declarations and
  asserts each class appears in the `[hidden]` rule. Cheap, and not built here — this
  worktree has no test harness for the contract, only for the labs.
- **`.oo-scanbeam` is not in the rule.** It declares no base `display` (only
  `display: none` inside the reduced-motion query), so it needs no guard today; if it
  ever gains one it must be added.
- **Consumers are still on their own.** A consumer class with its own `display` still
  defeats `hidden`. That is the correct boundary, but it is not documented anywhere a
  consumer will read — the brand book entry explains the contract's fix, not the general
  hazard. A one-line note in `README.md`'s class list would close it.
- **Still open, untouched:** the `.oo-stage` 1080px cap (`--oo-stage-max` /
  `.oo-stage--wide`), the `--oo-vignette-*` knob, a dense `.oo-stat` variant, and
  `depth-tape`'s `?render=fallback` assertion. None are in this scope.
