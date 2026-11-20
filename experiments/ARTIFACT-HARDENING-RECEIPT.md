# Artifact hardening — implementation receipt

**Date:** 2026-09-19 · **Scope:** instructional media contract (v1.7), artifact
browser verification, illustrated-manual example, portable delivery.
**Identity preserved:** existing palette, faces, registers, square hardware.
No new visual system; tokens.css stays v1.4.

## 1 · Instructional media contract — components.css v1.6 → v1.7

New: `.oo-media` (+ `--crop`, `--pixel`, `.oo-media-caption`). The opposite of
`.oo-plate-figure` on every axis: original colors (no mask/tint/filter),
intrinsic proportions, alt + caption + provenance required, never aria-hidden.
Sizing law: `height: auto` + `aspect-ratio: auto` — width/height attributes
keep reserving layout but never win over the loaded image's real ratio.
Contain is the default; `--crop` is a declared editorial opt-in, never for
evidence; `--pixel` upscales sprites at integer multiples, never down.

**Promotion evidence (two independent production consumers, same friction —
selectors verified by grep against the shipped HTML):**

- *Chef RPG — White Ash Field Manual* (2026-09-19, private wiki): `width:100%`
  screenshots kept HTML `height="1080"`; every illustration stretched and the
  cover cropped **while overflow checks stayed green**. Accepted correction:
  `.illustration img,.cover img{height:auto;aspect-ratio:auto}` (line 544 of
  the shipped guide) — exactly the law promoted here. Its Image Aspect QA
  compares rendered content-box ratios against natural dimensions, borders
  subtracted, subpixel tolerated.
- *Project Zomboid — Survivor Field Guide* (2026-09-14, private wiki): rebuilt
  the same recipe consumer-locally — `.mast img` / `.towns img`
  (`width:100%; display:block`, captioned figures) and `.moodle-strip img`
  (32px sprites, `image-rendering:pixelated`) — with CSS `width:100%` over
  fixed `width="480" height="270"` attributes and **no `height:auto`
  anywhere**. Matching attributes do not protect: the height presentational
  hint stays 270px while CSS width flexes. **Measured live in the shipped
  guide** (read-only, headless Chromium, rendered content box vs intrinsic
  ratio): `.towns img` 52.5% relative aspect error at 768px, 30.4% at 390px,
  6.9% at 1440px; `.mast img` 39.0% at 768px, 16.9% at 1440px. Only the
  square 32px moodle icons render true (0% at all widths). The second
  consumer's defect is observed, not inferred.

Guard parity kept: `.oo-media[hidden]` added to the v1.5 guard rule;
`node experiments/verify-contract.mjs` → `PASS 11/11`. That script is
deliberately unchanged — it stays the static contract check.

Docs: DESIGN.md (Instructional media bullet + "zero overflow is not visual
sign-off" trap), README (imagery paragraph, tooling sections). Current-contract
version claims bumped in README, DESIGN.md, index.html `#ver-components`
(brandbook.js mirrors that node), brandbook.css and artifact-compositions.css
headers. Dated example footers keep their frozen v1.6 stamps — they are
receipts of when those artifacts were verified.

## 2 · Artifact browser verification — experiments/verify-artifact.py

`uv run --with playwright python experiments/verify-artifact.py <artifact>` —
system Chromium. **At every width** (390/768/1440): image load (decode
forced), rendered content-box vs `naturalWidth/naturalHeight` (0.5% relative
tolerance; crop hosts exempt by declaration), horizontal overflow with
offenders named, unintended clipping (≥98% of a non-crop image must stay
visible), a keyboard focus walk deduped by element identity (every focused
element must show an outline), and keyboard-driven interactions where present:
search filter/empty state, `#clear` activated by Enter (not click),
hidden-target navigation (with a filter active, keyboard-activating an anchor
into a filtered-out section must reveal it), and **every** `<details>` toggled
open and closed from the keyboard. Once per run: font status — including
`--require-font`, which asserts each named family is PRESENT and `loaded`
(an empty FontFaceSet would otherwise pass the error test vacuously) —
broken anchors, console errors. Viewport screenshots plus each `--shot`
selector are saved at every width; `--offline` blocks all non-file requests
and fails on any attempt. The packager propagates `--require-font` for every
family it embeds. Negative demo: the fixture run with
`--require-font "Pixelify Sans"` fails `FONT MISSING … (loaded: none)`.

**Demonstrated both directions:**

- `experiments/media-distortion-fixture.html` (committed, must-fail): same
  data-URI test card twice — raw `width:100%` + stale `height="1080"` vs the
  identical markup under `.oo-media`. Result: exit 1, ASPECT failures at all
  three widths on the raw copy only (68.5% / 83.8% relative error), zero
  overflow throughout — proving overflow-green ≠ correct.
- `examples/field-manual.html`: PASS — per width: 10 images proportion-true,
  zero overflow, zero clipping, 17 focusable controls all with visible rings,
  search empty/clear-via-keyboard/match, hidden-target navigation to a
  filtered-out `#signals` revealed it, and 2/2 disclosures keyboard-toggled —
  identically at 390, 768 and 1440. Screenshots inspected visually at all
  widths, including the phone/tablet hardware table (labeled-row reflow at
  390, real table at 768) and phone signal rows (sprites crisp at 3×):
  `examples/field-manual.qa-{390,768,1440}[-{signals,media,hardware}].png`.

## 3 · Illustrated-manual example — examples/field-manual.html

Reusable Console-register manual composition modeled on the two production
guides, not a game framework: masthead with action anchors, desktop sticky
section nav reflowing to a grid strip on phone, section search with live
count/empty/clear, sprite/name/mechanic signal rows (`.oo-media--pixel`, 16px
originals at 3×), labeled responsive table (header visually removed below
720px, each cell restates its column), `.oo-media` figures with captions and
`.art-cite` provenance, contain-vs-crop specimen pair, `<details>` disclosures,
static provenance tape. Reuses the quiet-reading recipe and rails/ledgers/
citations from `examples/artifact-compositions.css` (header updated to record
the fourth consumer); manual-specific layout stays page-local `.fm-*`.

**Content custody:** no proprietary art, no vault content. Screenshots depict
this repository's own brand book; sprites are original 16×16 specimens on the
token palette. Sources, hashes and licenses in
`examples/field-manual-assets/PROVENANCE.md`.

## 4 · Portable delivery — experiments/package-artifact.py

`uv run --with playwright python experiments/package-artifact.py
examples/field-manual.html dist/field-manual.html` — inlines local stylesheets
in document order, embeds the Google Fonts css2 response with each woff2
base64-embedded, embeds local images and surviving CSS `url()` assets,
rewrites relative document links against `--link-base`, stamps the export head
with source hash, and writes a `.provenance.json` sidecar (source/output
sha256 + every embedded resource: origin, bytes, sha256, license).

**License-complete, not license-labeled:** OFL condition 2 requires each
family's copyright notice AND the full license text to accompany the Font
Software. The packager fetches the authoritative Google Fonts distribution
`OFL.txt` per family, hashes it, and embeds copyright line + full text
visibly in the exported file (document-foot disclosures with focus rings and
wrap-safe `<pre>`); packaging hard-fails if a license cannot be fetched.
Verified embedded: JetBrains Mono ("Copyright 2020 The JetBrains Mono Project
Authors") and Pixelify Sans ("Copyright 2021 The Pixelify Sans Project
Authors"), sha256 in the sidecar's `fontLicenses`.

Then verify-artifact re-runs on the export **with network blocked**.
Exercised: `dist/field-manual.html` — 1.93 MB, 40 resources (3 stylesheets,
1 font stylesheet, 24 woff2, 2 license texts, 10 images). Offline PASS:
`blockedRequests: []` (the export never even attempts the network), both
fonts loaded from embedded data, all per-width checks green including 4/4
disclosures (the two license details included), license foot inspected
visually at 390. `dist/` is gitignored — the export is a build product; the
recipe is the deliverable.

## Boundaries honored

Private guides referenced read-only; nothing copied into this repository.
No unrelated consumer restyled; no speculative components (the one promotion
carries the verified two-consumer evidence above). Not pushed or deployed.
