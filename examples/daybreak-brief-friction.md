# Consumer #4 friction log — daybreak-brief (2026-07-08)

Consumer: `~/Github/daybreak-brief` — generated weekday news + market-data
newspaper. Second *generated* consumer (same inline-at-build pattern as the
command-room dashboard). First consumer to run dual-register per plate at page
scale: Broadcast masthead + editorial news plates, Console index desk + ledger,
Tape carrying live Yahoo quotes. Register law held with zero strain — the
brand's core move fits a newspaper exactly.

Recurrence tally against known deferred candidates (this page re-hit, no new pain):

1. **`.oo-stage`** — FOURTH copy of the stage shell (index, inir, morning-brief,
   command-room dashboard… now five with this page). Promote in v1.4; the case
   is closed on evidence.
2. **4-up grid** (`.db-grid-4`) — recurred from morning-brief's `.mb-grid-4` (⑥).
   NEW EVIDENCE on the shape: `repeat(4, 1fr)` overflowed the stage when a
   40px-mono quote hit min-content width; the fix is `repeat(4, minmax(0, 1fr))`.
   If `.oo-grid-4` is promoted, bake `minmax(0, 1fr)` in — and consider
   retrofitting `.oo-grid-2/-3` the same way; they carry the identical latent bug.
3. **Stat delta third line** (`.db-delta`) — recurred verbatim from morning-brief
   (⑤). Second consumer to copy it. `.oo-stat-delta` earns promotion.
4. **Tape vertical padding** — third copy of `.oo-tape .oo-tickwrap { padding: 7px 0 }`.
5. **Headline/ledger rows** (`.db-head`) — cousin of morning-brief's `.mb-ledger`
   (⑦): age/label column + flexible content column, thin row strokes. Two
   consumers now want a generic "receipt row" primitive; still worth designing
   properly rather than rushing.

Worked with zero glue: `.oo-register-quote--block` (source ledger),
`.oo-rail--sticky` (header + footer tape), `:where()` stat ink (semantic
up/down directly on `.oo-stat-value`), `--oo-gutter` bleed coupling, per-plate
register flips (`.reg-console` sections inside a `.reg-broadcast` page).
