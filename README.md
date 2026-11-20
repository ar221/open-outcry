# Open Outcry

**Live:** https://ar221.github.io/open-outcry/

Open Outcry is one identity expressed through two registers and one Tape. **Broadcast** is the human voice: judgment, thesis, and editorial direction. **Console** is the machine voice: mechanism, evidence, and receipt. **The Tape** binds both to state and provenance.

The repository is static: no build, framework, or package manager. Google Fonts are the public artifact's one external dependency.

## The reusable contract

Consumers need two files:

1. `tokens.css` v1.4 — variables, the `--r-*` register alias layer, and seated semantic fills.
2. `components.css` v1.7 — the `.oo-*` class contract.

Import `tokens.css` first, then `components.css`. Everything else in this repository is evidence: a public reference surface, consumer examples, experiments, or receipts.

Set the dominant register explicitly on the consumer root so register aliases and selection ink resolve together:

```html
<body class="reg-broadcast"> <!-- or reg-console -->
```

Do not rely on the Console fallback at `:root`; the root class is part of the consumer setup.

The contract stays frozen until two independent production consumers exhibit the same friction. A primitive enters the contract on repeated use, not because one page wants it.

Consumers must load Fraunces variable, Pixelify Sans, and JetBrains Mono. The contract declares fallbacks but does not fetch the fonts. Controls use mono chrome in either register, keep a visible focus ring, and have a 44px minimum height. Use `--oo-muted` (`#91877f`) or `--oo-muted-warm` (`#a08b7b`) for readable secondary copy; `--oo-ghost` is decorative-only, never text or essential metadata.

Imagery is two classes with opposite laws. `.oo-plate-figure` is decorative atmosphere: masked, register-tinted, `aria-hidden`, opacity-capped. `.oo-media` is instructional content — screenshots, native assets, diagrams — with original colors and intrinsic proportions preserved (`height: auto` + `aspect-ratio: auto` beat stale width/height attributes), alt text and captions required, contain by default, `--crop` as explicit editorial opt-in, and `--pixel` for integer-scale sprite upscaling. Never apply the engraving-mask rules to instructional images.

## The public brand book

The living brand book consists of:

- `index.html` — semantic content and specimens, with six numbered acts plus the unnumbered **Use Open Outcry** adoption stop, and Ledger jumps to tokens, seated fills, type, hardware, states, and motion;
- `brandbook.css` — page-local `--book-` / `.book-` brand-book composition and interactions, including navigation, adoption guidance, receipts, grids, the container-relative unit, and four fit-to-measure chapter mastheads;
- `brandbook.js` — dependency-free `IntersectionObserver` chapter state, register-quotation reveal controls, CSSOM-derived contract facts, and plate reveal, with no scroll polling loop;
- `PRODUCT.md` — audience, actions, success test, and publication boundary;
- `assets/plates/` — the canonical public-domain engraving masks.

The book consumes the promoted `.oo-frame`, seated `--r-seat-*` fills, register-scoped selection, and `.oo-plate-figure` from the reusable contract; those are not page-local inventions. `brandbook.css` and `brandbook.js` remain composition for this page only and are not part of the reusable contract. Use the book navigation to inspect a rule in context; use its early source links when adopting the contract.

## Examples and composition recipes

The artifact examples use one deliberately illustrative subject — choosing static provenance for a published research note — so format changes can be compared without inventing a new primitive:

- [`examples/editorial-report.html`](examples/editorial-report.html) — **quiet report:** start with a Broadcast `.oo-stage`, use restrained `.oo-plate` sections and sustained-reading prose, then attach static provenance in a Console quotation pane.
- [`examples/decision-brief.html`](examples/decision-brief.html) — **decision brief:** Broadcast recommendation, concise consequence paragraphs and alternative rows, then a Console evidence quotation. Prints on one A4 page.
- [`examples/presentation.html`](examples/presentation.html) — **presentation:** five consumer-local `.art-slide` sections, each with one dominant first read; the evidence slide speaks Console, the others Broadcast. Prints one slide per landscape A4 page.
- [`examples/field-manual.html`](examples/field-manual.html) — **illustrated manual:** a Console reference manual with desktop section navigation and phone reflow, `.oo-media` explanatory imagery with captions and provenance, sprite/name/mechanic rows, labeled responsive tables, section search, and `<details>` disclosures.

Their shared artifact layout lives in consumer-local [`examples/artifact-compositions.css`](examples/artifact-compositions.css). Receipt rows also remain consumer-local pending repeated, independently agreed shape; neither the stylesheet nor those rows extend the v1.4/v1.7 contract.

Existing references remain:

- `examples/inir.html` — a Broadcast-led desktop-shell reference surface.
- `examples/morning-brief.html` — a dual-register command-board specimen.
- `examples/command-room-dashboard-friction.md` and `examples/daybreak-brief-friction.md` — production-consumer evidence recorded beside the examples.

## Experiments

`experiments/` holds WebGL labs and CSS labs, with receipts recording intent, constraints, and promotion gates. Lab 06 is `experiments/unit-frame.html`; Lab 07 is `experiments/plate-figure.html`. Labs are evidence, not contract.

## Run locally

From the repository root:

```sh
python -m http.server
```

Open `index.html` over HTTP. Under `file://`, stylesheet CSSOM introspection fails and the Tape reports `n/a`.

## Verify the contract

```sh
node experiments/verify-contract.mjs
```

The script statically asserts that every contract class declaring a non-`none` `display` value appears in the top-level `[hidden] { display: none }` guard, and that the guard has no stale entries. `.github/workflows/contract.yml` runs the same command on pushes and pull requests in an Ubuntu checkout-only job, using the runner's preinstalled Node and no install step. It does not render pages or verify tokens, accessibility, HTML, links, or examples.

## Verify an artifact

```sh
uv run --with playwright python experiments/verify-artifact.py examples/field-manual.html --require-font "Pixelify Sans" --require-font "JetBrains Mono"
```

Browser-level verification of a rendered artifact in system Chromium. At every width (390/768/1440): every image loads and its rendered content-box proportions match `naturalWidth`/`naturalHeight` (borders subtracted, subpixel rounding tolerated), zero horizontal overflow, no unintended clipping of instructional media, keyboard focus is visible on every tabbable control, and interactions are exercised from the keyboard where present — search filter/empty/clear, navigation into a filtered-out section, and every `<details>` disclosure. Once per run: each `--require-font` family must be present and `loaded` (an empty FontFaceSet is a failure, not a pass), internal anchors resolve, zero console errors. It saves viewport screenshots (plus each `--shot` selector) at every width and writes a QA receipt JSON. Zero overflow alone is not visual sign-off: inspect the screenshots. `experiments/media-distortion-fixture.html` is a deliberately broken fixture the script must fail.

## Package an artifact

```sh
uv run --with playwright python experiments/package-artifact.py examples/field-manual.html dist/field-manual.html
```

Exports a self-contained single-file HTML: local stylesheets inlined, images embedded as data URIs, and the declared Google fonts fetched as WOFF2 and embedded. Each embedded family's authoritative copyright notice and full SIL OFL 1.1 text (the Google Fonts distribution `OFL.txt`, hashed) are embedded in the exported file itself, as OFL condition 2 requires; a sidecar `.provenance.json` records every resource's origin, bytes and sha256. The packager then re-runs the artifact checks on the export with all network access blocked, so the file is proven portable, not assumed portable.

## Plate credit

Schell and Hogan, “The Panic — Scenes in Wall Street Wednesday Morning, May 14,” *Harper's Weekly*, 24 May 1884. Library of Congress, LCCN 00651213. Public domain.
