# UNIT & FRAME — CSS Lab 06 receipt

**File:** `experiments/unit-frame.html` (single file, no JS, no WebGL, no dependencies)
**Date:** 2026-08-08
**Contract touched:** none. `tokens.css` stays v1.3, `components.css` stays v1.5.
`node experiments/verify-contract.mjs` → `PASS [contract] 10/10 display-declaring classes carry a [hidden] guard`.

## What this is

Four CSS mechanisms observed on <https://portal.nousresearch.com/> and re-expressed in
Open Outcry Console, as candidates for the frozen contract. Every one is declared
page-locally under a `--lab6-*` / `.lab6-*` prefix so it cannot be consumed by accident.

**Nothing about the source's appearance was imported, and that is deliberate.** Nous Portal
is `#0000f2` on `#0000f2` with `border-radius: 9999px` pills and a serif display face —
which is the spec's hard-dislike list ("no rounded corners, no blue backgrounds") almost
word for word. What crosses over is engineering: how it computes a size, how it draws a
line, how it fits a headline, and how it seats a semantic colour.

## Extraction

```bash
# playwright's browser was not present; designlang's error text ("Playwright is not
# installed") is misleading — the npm package IS installed, only the binary was missing
cd ~/.local/share/npm/lib/node_modules/designlang
node node_modules/playwright-core/cli.js install chromium   # revision 1223

designlang https://portal.nousresearch.com/ -o /tmp/dl-nous \
  --dark --interactions --deep-interact --screenshots --responsive --verbose
```

designlang 12.15.0. It wrote 33 artifacts, then crashed in its own summary printer
(`Buffer.byteLength(undefined)` at `bin/design-extract.js:592`) — after all files were
already on disk, so the extraction itself is complete.

**The extraction alone was not sufficient.** Its `DESIGN.md` reports the site as a
`material-you` landing page with a `#0000f2` primary and a 4/16/24/9999px radius scale —
accurate, and useless. It missed every mechanism below, because those live in the *shape*
of the CSS, not in the token values. The four candidates came from reading the live
stylesheets in a browser: 579 custom properties resolved on `:root`, plus a CSSOM walk for
`@keyframes`, `::selection` and utility-class bodies.

## The four candidates

### A · one unit drives every dimension

Source: `.hermes-web { --u-anchor: .58px; --u: max(calc(100cqw / 2360), var(--u-anchor));
--u-text: max(var(--u), .75px) }`, with a narrow flip to a 500px artboard capped at 1.2×
the anchor, and per-role backstops like
`--hw-text-body: max(calc(21 * var(--u)), .92rem)`.

Every dimension on that site is `calc(N * var(--u))` where N is the literal pixel value on
a 2360px artboard. Three details are the actual engineering:

1. **`cqw`, not `vw`.** The unit resolves against its *container*, so a pane in a narrow
   column shrinks its own contents. `vw` only ever knows about the window.
2. **`--u-anchor` is a floor, not a minimum font size.** `max()` means layout stops
   shrinking at a chosen container width and then wraps or overflows, rather than
   degrading at every scale.
3. **`--u-text` is a second, higher floor.** Chrome and type do not share a legibility
   budget, and the source refuses to conflate them.

Contract today: `--oo-display-console: clamp(36px, 7vw, 112px)` plus five unrelated
constants (`.oo-plate` 88px, `.oo-specimen` 48px, `.oo-stat` 24/28px, grids 16px), and a
spacing scale that has been on the deferred list since **v1.3** ("the 14/20/24/28/32px
margin-top rhythm"). `7vw` reads the window even though `.oo-stage` is 1080px capped, so on
a 2560px monitor the display pins to its 112px ceiling and stops relating to its plate.

**A fourth detail, learned the hard way in this lab.** The first pass implemented only
`--u` and `--u-text` and body copy computed to **11.1px** on a 1068px container. The source
pairs the unit with a per-role *absolute* `rem` backstop and it is not decoration — three
floors are needed, doing three different jobs. Measured in the lab at a 1068px container:

| viewport | tile padding | tile title | tile body |
|---|---|---|---|
| 1920 | 20.77 / 23.73px | 32.63px | 14.83px |
| 1440 | 20.77 / 23.73px | 32.63px | 14.83px |
| 1100 | 19.21 / 21.96px | 30.19px | 14px *(rem floor)* |
| 900 | 16.24 / 18.56px | 27.28px *(u-text floor)* | 14px *(rem floor)* |
| 390 | 19.49 / 22.27px | 30.62px *(460 artboard)* | 14px |

1920 and 1440 are identical because `.lab6-stage` caps at 1180px — which is the point of
`cqw`: the unit tracks the *plate*, not the monitor.

### B · the frame is a shadow, not a border

Source: `--hermes-outline-inset: 2px 0 0 0 C, -2px 0 0 0 C, 0 2px 0 0 C, 0 -2px 0 0 C`,
plus a `-divider` sibling at 20% alpha, consumed as `.shadow-hermes-outline`.

Four zero-blur zero-spread box-shadows, one per side. Why it beats `border` for a
square-hardware system:

- **Zero layout cost.** Measured in the lab, two 2×2 fields with identical padding and
  content: `border: 2px solid` tiles are **68px** tall, shadow-framed tiles are **64px**.
- **Abutting tiles do not double.** At `gap: 0` the border field shows a 4px seam; the
  shadow field shows 2px, because each tile's sliver overlaps its neighbour's instead of
  stacking. This is what lets the source lay out a dense tile field and keep a uniform
  graph-paper rule.
- **It sidesteps this repo's oldest documented trap.** The `background:` shorthand erases
  `.oo-scanlines` (see the `components.css` header — a real bug that shipped). It cannot
  erase a `box-shadow`.
- **It composes.** Frame + glow + press-state are entries in one list; a border is one
  property with one value.

Known cost, in the lab as a `lab6-readout`: a box-shadow is neither clipped nor
hit-tested, so a framed tile at the stage edge paints one stroke into the gutter.

### C · the masthead fits its measure

Source ships Roman Komarov's `text-fit` (<https://kizu.dev/fit-to-width/>, 2024) as
`.fit-text`. `tan(atan2(a, a - c))` == `a / c`; css-values-4 says length division should
work and no engine implements it, so this is the workaround (credited to Jane Ori).

Three parts, **all required**:

1. `@property --cap { syntax: "<length>"; initial-value: 0px; inherits: true }`. An
   unregistered custom property is a token stream resolved at the *use* site, so `100cqi`
   would resolve against the wrong container. Registration makes the value *compute* on
   the element that declares it — the "captured length" idea, and what lets a grandchild
   read a grandparent container's width.
2. A duplicated `aria-hidden` / `visibility: hidden` copy of the string. An element with
   `container-type` is forbidden by containment from measuring its own contents, so the
   technique measures the **remaining** space beside the copy and gets the text width by
   subtraction. Contained from its children, sized by its sibling.
3. The ratio applied through `clamp(1em, 1em * ratio, max - sentinel)`.

**First-pass failure worth recording:** the lab initially shipped only part 3. Every
masthead silently pinned to `--fit-max` — `available - captured` was 0, `atan2(a, 0)` is
90°, and `tan(90°)` is infinity. It looked like a styling choice, not a bug.

Why this matters here specifically: the Console display move is specified as "ALL CAPS
Pixelify, short phrases, trailing period" — mastheads meant to hold the plate edge to edge.
A `clamp()` cannot do that, because the correct size depends on the string. Measured at a
1440 viewport, one rule and four strings: **132px** (hero, capped), **222.4px**, **69.5px**,
**39.5px**.

Costs: the string is in the DOM twice (fine for a masthead, wrong for body copy — this is a
display-type primitive, not a text one), and below the floor a long string overruns, so
`.lab6-fit` carries `overflow: clip` rather than let a display line tear the stage.

### D · seated semantics, and selection ink

`--success: color-mix(in srgb, #8cc4a7 88%, var(--background))` — the source tints every
status colour *into* its surface so it never floats free.

`--oo-green` `#48dc7d` is tuned as **ink** on `#070807` and is right there. As a **fill** —
chart band, highlighted ledger row, heat cell — it is a neon slab that breaks the void law
("black space is electrical depth"). `color-mix(in srgb, var(--oo-green) 18%,
var(--oo-console-stage))` derives a seated fill ramp from the existing token instead of
making a new colour decision. The lab shows raw-as-fill beside seated, and the v1.4
zero-state rule is held in both columns: the `0.0R` row keeps base ink.

Second half: the source tokenises `::selection` (`--selection-bg` / `--selection-fg`). Open
Outcry never has, so every artifact inherits the OS blue-grey highlight on an amber
console. Two declarations.

## Observed and *not* implemented

- **`--vsq: calc(.5vw + .5vh)`** — a viewport-square unit, geometric rather than
  width-only. Genuinely clever for chrome that must survive short-and-wide viewports, but
  it is a *viewport* unit and therefore in direct competition with candidate A's
  container-relative unit. Two sizing philosophies is already the risk with A; three is
  not a decision worth taking on one lab's evidence.
- **`noise.png` overlay** — the source's paper grain. Already covered by `.oo-grain`.
- **Dithered/halftone photography** — the source's answer to imagery in a two-colour
  system. Open Outcry has no photography answer at all (§5 covers glyphs and monoline SVG
  only), so this is a real gap, but it is a *spec* gap, not a token gap, and out of scope
  for a CSS lab.

## Trap found while building this

A CSS comment in the lab's own `<style>` contained the string `--oo-*/.oo-*`. The `*/`
inside it **closed the comment**, so the following lines were parsed as CSS and the
`* { box-sizing: border-box }` reset never applied. `.lab6-stage` rendered 1292px wide
against `max-width: 1180px`, and every `cqw`-derived number in candidate A was silently
6% off. Nothing errored; the page just looked slightly wrong.

Worth knowing in this repo specifically, because `components.css` and `tokens.css` carry
long prose comments that talk about `--oo-*` and `.oo-*` classes by name. Write
`--oo- / .oo-`, or any form without the adjacent `*` and `/`.

## Promotion recommendation

Per the freeze rule, none of this enters the contract on one lab's evidence. Ranked by
what each still owes:

| # | Candidate | Cost to adopt | Recommendation |
|---|---|---|---|
| **B** | shadow frame | one token, reversible, no layout consequence | strongest case. Needs one production consumer with an abutting tile field to confirm the seam behaviour outside a demo. |
| **D1** | `::selection` | two declarations, no naming authority | drop-in. Arguably documentation, not a primitive. |
| **D2** | seated fills | three `color-mix` tokens derived from existing ones | needs a consumer that actually fills with a semantic — a heat grid or a ledger. `.oo-stat` and `.oo-tape` only ever ink. |
| **C** | fit-to-measure | one `@property`, three rules, duplicated markup per use | highest value, additive, opt-in per element, and it answers a spec requirement the contract cannot currently meet. The markup duplication is the thing to argue about. |
| **A** | the unit | a second sizing philosophy beside the existing one | **do not promote on this evidence.** It is not one token, it is a discipline: three floors, an artboard constant, a narrow-width artboard flip, and a per-role backstop on every text rule. This is precisely "where design systems quietly become layout frameworks" (Oracle, v1.2). It needs friction from at least two production consumers hand-tuning the same spacing rhythm — the v1.3 deferral note is one data point, not two. |

## Verification performed

- Served over `python -m http.server`; loaded at 1920 / 1440 / 1100 / 900 / 390 CSS px.
- Zero `pageerror`s and zero console errors at every width.
- `document.scrollWidth - clientWidth == 0` at every width (no horizontal tear).
- Candidate A: computed padding / title / body measured at all five widths (table above);
  both floors observed engaging in the expected order.
- Candidate B: measured tile heights 68px (border) vs 64px (shadow) at identical padding;
  seam thickness confirmed visually at `deviceScaleFactor: 2`.
- Candidate C: four strings, one rule, four distinct computed sizes; ceiling and floor both
  observed clamping.
- Candidate D: computed `background-color` confirmed as `color(srgb …)` mixes on the seated
  rows and raw token values on the control rows.
- `node experiments/verify-contract.mjs` → PASS.
