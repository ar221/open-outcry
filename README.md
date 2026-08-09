# Open Outcry

**Live:** https://ar221.github.io/open-outcry/

Open Outcry is one identity expressed through two registers and one Tape. **Broadcast** is the human voice: judgment, thesis, and editorial direction. **Console** is the machine voice: mechanism, evidence, and receipt. **The Tape** binds both to state and provenance.

The repository is static: no build, framework, or package manager. Google Fonts are the public artifact's one external dependency.

## The reusable contract

Consumers need two files:

1. `tokens.css` v1.4 — variables, the `--r-*` register alias layer, and seated semantic fills.
2. `components.css` v1.6 — the `.oo-*` class contract.

Import `tokens.css` first, then `components.css`. Everything else in this repository is evidence: a public reference surface, consumer examples, experiments, or receipts.

The contract stays frozen until two independent production consumers exhibit the same friction. A primitive enters the contract on repeated use, not because one page wants it.

Consumers must load Fraunces variable, Pixelify Sans, and JetBrains Mono. The contract declares fallbacks but does not fetch the fonts.

## The public brand book

The living brand book consists of:

- `index.html` — semantic content and specimens;
- `brandbook.css` — page-local `--book-` / `.book-` composition: a container-relative unit, fit-to-measure mastheads, four-shadow frames, seated `color-mix()` fills, selection ink, and plate masks;
- `brandbook.js` — dependency-free `IntersectionObserver` chapter state, register-quotation reveal controls, CSSOM-derived contract facts, and plate reveal, with no scroll polling loop;
- `PRODUCT.md` — audience, actions, success test, and publication boundary;
- `assets/plates/` — the canonical public-domain engraving masks.

`brandbook.css` and `brandbook.js` are composition for this page only. They are not part of the reusable contract.

## Examples

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

## Plate credit

Schell and Hogan, “The Panic — Scenes in Wall Street Wednesday Morning, May 14,” *Harper's Weekly*, 24 May 1884. Library of Congress, LCCN 00651213. Public domain.
