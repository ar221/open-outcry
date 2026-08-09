# PLATE FIGURE — CSS Lab 07 receipt

**File:** `experiments/plate-figure.html`
**Assets:** `assets/plates/panic-{crowd,portico}-1884.png` — canonical, shared. Relocated out of
`experiments/plates/` on 2026-08-09 when the public brand book became the second consumer; the lab
references `../assets/plates/`. One copy in the repo, never duplicated.
**Date:** 2026-08-08
**Contract touched:** none. `tokens.css` stays v1.3; `components.css` stays v1.5.

## Decision

**Open Outcry should have a large recurring figure language, but not a mascot.**

A mascot is a named personality that becomes a logo obligation: once it appears on one hero,
every later surface either carries it or conspicuously omits it. That conflicts with the
governing test — “does it feel like a serious operator broadcasting from a live desk?” — and
with the user’s hard dislike for AI-generic visual language.

What Nous Portal actually uses is not a mascot either. Its large classical figure is an
**allegorical plate**: dithered, `pointer-events:none`, ghosted into the field, and sized with
the same container-relative unit as the rest of the page. It behaves as atmospheric texture,
not character IP. Lab 07 adopts that mechanism and replaces the generic allegory with the
subject already encoded in the name **Open Outcry**.

## Source image

**“The Panic — Scenes in Wall Street Wednesday Morning, May 14”**, drawn by Schell and
Hogan, Harper’s Weekly, 24 May 1884. One print, wood engraving. Library of Congress catalog
record [LCCN 00651213](https://lccn.loc.gov/00651213). Public domain.

The source is preferable to generated art:

- It is literally a scene from the era when markets ran on human voices.
- It satisfies the same provenance rule Open Outcry already applies to market numbers:
  real, dated, auditable.
- It cannot read as prompted trading-floor slop.
- It creates no licensing or commissioning dependency.

The 5709×8186 source scan was cropped into two alpha masks:

| Asset | Role | Size | Bytes | SHA-256 |
|---|---|---:|---:|---|
| `panic-crowd-1884.png` | human density / the outcry itself | 1600×871 | 274,485 | `276e3fe4ac5465357d3ad7334e051943e0c80f3b6d671a127d5121efa46fcf40` |
| `panic-portico-1884.png` | architecture / institutional memory | 625×1500 | 100,802 | `a234a80d7c7b64ede7ee93cce9238c36a7554efaabecfdba67aa13d5c9afcc9a` |

Processing is deterministic in concept: crop → autocontrast → Atkinson 1-bit dither →
white luminance plus binary alpha. The 8.9 MB source becomes 375 KB of runtime assets.

## The primitive under test

The image is delivered as an **alpha mask**, never a coloured PNG:

```css
.oo-plate-figure {
  position: absolute;
  pointer-events: none;
  background-color: var(--r-voice);
  mask-image: var(--oo-plate-image);
  mask-size: auto;
  mask-repeat: no-repeat;
  mask-position: center;
  opacity: var(--oo-plate-strength, .14);
}
```

That buys four things:

1. The figure carries no colour of its own. One file renders amber under Console and peach
   under Broadcast through `--r-voice`; browser measurement confirmed exact computed inks
   `rgb(242, 165, 31)` and `rgb(232, 146, 124)`.
2. The asset obeys register law without separate variants.
3. Opacity remains the only dial.
4. The figure is explicitly non-content: `aria-hidden`, no pointer events, never a link.

## Native-scale rule — and the first-pass failure

A 1-bit dither must be rendered near native pixel scale and **cropped**, not shrunk to fit.

The first ladder implementation scaled the 1600px crowd plate into 204px cells — a 7.8×
downscale. The browser averaged neighbouring dots into flat grey, destroyed the engraving
character, collapsed effective contrast, and made the initially recommended opacity band
wrong by roughly a factor of two. It looked plausible; it was not the same rendering
mechanism.

The corrected primitive uses `mask-size:auto` with host overflow clipping. Five ladder cells
share the same native-scale crop and differ only in opacity. Correct observed band:

- `.06` — too faint
- `.14` — atmosphere
- `.26` — ceiling
- `.42` — competing with the text
- `.70` — illustration is now the subject

**Recommendation:** default `.14`, hard ceiling `.26`.

## Scope law

Sanction only:

- Broadcast heroes
- Covers
- Section openers
- Editorial transitions where the plate is the second read

Prohibit:

- Dashboards and dense Console UI
- Behind live data, charts, stats, or execution controls
- Morning briefs where the number must be read immediately
- Faces or named recurring characters
- Generated pseudo-historical scenes
- Multiple unrelated illustration families

One sourced family is texture. Six unrelated plates become an illustration library,
commissioning burden, and a new visual authority beside the register system.

## Contract recommendation

Do **not** promote from this lab alone. If a second real consumer asks for it, add:

- `--oo-plate-strength: .14`
- `--oo-plate-strength-max: .26` as documented law, not necessarily a runtime token
- `.oo-plate-figure` with native-scale masking, register ink, pointer-event suppression
- A short §5 imagery clause: sourced 1-bit engravings, second-read only, one family

No “mascot” token, character name, alternate poses, sticker set, or iconography.

## Verification

Served over the persistent `open-outcry-web` process and driven in Chromium.

- 1440×1000 and 390×844: zero console/page errors
- Both widths: `scrollWidth - clientWidth == 0`
- 9/9 figure hosts resolved their mask image
- Hero opacity: `.14`
- Ladder computed opacities: `.06`, `.14`, `.26`, `.42`, `.70`
- Every plate uses native `mask-size:auto`
- Console and Broadcast cells resolve amber/peach from one identical mask file
- `node experiments/verify-contract.mjs` → `PASS [contract] 10/10 display-declaring classes carry a [hidden] guard`
