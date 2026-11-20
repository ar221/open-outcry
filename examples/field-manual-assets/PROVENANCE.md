# Field manual assets — provenance

All assets in this directory are original to the Open Outcry repository. Nothing
here is third-party art; nothing was copied from a private vault or a game.

## Screenshots (content imagery)

Captured 2026-09-19 from this repository's own `index.html` (the public brand
book) served over `http://127.0.0.1` in headless Chromium 153.0.8010.36, viewport
1280×720, deviceScaleFactor 1. Repository state: commit `0b352bc` plus the
in-flight v1.7 instructional-media working tree (the tape's CSSOM-derived
`COMPONENTS 45` count in the captures reflects it).

| file | subject | sha256 |
|---|---|---|
| `brandbook-contract-1280.png` | Act I opening bell: identity lockup, Tape navigation, `> cat CONTRACT` block | `c67ec40799d5189e84239f3b7a80eb384c5b4133f166d0408cf665cc0fb9a3a0` |
| `brandbook-ledger-1280.png` | Act IV the ledger: Console masthead, jump rail, token ledger under `.oo-frame` | `ea147511c3ddf95005d3f7f45b5f0fafd9207a54107c302cdf106e8d8eea58ef` |

License: same as the repository they depict. Screenshots of our own published
surface; no third-party rights involved beyond the fonts rendered in them
(Fraunces, Pixelify Sans, JetBrains Mono — all SIL OFL 1.1).

## Sprites (original pixel specimens)

Six 16×16 signal sprites drawn 2026-09-19 for this example with PIL, on the
token palette only (`--oo-green/-deep`, `--oo-red`, `--oo-amber/-dim`,
`--oo-peach`/`--oo-terracotta`, `--oo-blue`, `--oo-violet`, `--oo-fg`, plus two
darkened shades mixed toward the void). Original artwork, published with the
repository. They are deliberately simple recognition glyphs, not an icon pack:
each one names a Tape semantic already in the design language.

| file | signal | sha256 |
|---|---|---|
| `signal-live.png` | live / up / safe | `c41b6554dc30f8254d00683f4f5450861b5343ad0a239fba70544e436c1eb168` |
| `signal-halt.png` | down / footgun / warning | `488da07a840e94833ed544aa20b38c5faa9621e0ae1544635bb0f66517ea8f50` |
| `signal-armed.png` | armed / primary action | `6249426f01e73d38647183f61b5652d793c27c8637fdc46e65b681e6b24ae489` |
| `signal-quote.png` | register quotation | `0b6daf20ae9794f279039665b3f983e4dc72a25f9ad9ed0361079d6ad121c039` |
| `signal-evidence.png` | evidence / search ink | `1eccef7b6a531faecb7075465c1d5544aad02946a22c2924e1670a77cb88b168` |
| `signal-provider.png` | provider / external ink | `24fbb03fe8956f1cdcc79c042a25ec41bb167a0e72f19c0526e5582ca9b47998` |
