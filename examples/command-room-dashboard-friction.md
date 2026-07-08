# Consumer #3 friction log — command-room dashboard (2026-07-08)

Consumer: `~/Github/dotfiles/scripts/command-room-dashboard` — generated read-only
HTML projection over the command-room ledger. Console register, live counts on the
tape. First consumer that is *generated* (Python inlines tokens.css + components.css
at build time) rather than hand-authored — inlining worked cleanly; no drift risk
since regeneration re-reads the contract.

Glue the consumer had to write (v1.4 promotion candidates, in observed-pain order):

1. **`.oo-stage`** — every consumer so far rebuilds the same stage container:
   max-width, centered, `padding: 0 var(--oo-gutter)`, stage background,
   1px side borders, min-height 100vh. Third rebuild. Strongest candidate.
2. **`.oo-table`** — mono data table: 12px cells, kicker-style `th`, `--r-line`
   row strokes, last-row stroke removal, dim title cells, muted nowrap timestamps.
   Dashboards will keep needing this; currently 20 lines of consumer CSS.
3. **`.oo-plate-head`** — the `kicker-left / kicker-right` flex row heading a
   plate (label left, count/meta right). Appeared 4× in one surface.
4. Zero-state ink is unspecified: when a stat is 0 ("nothing pending"), semantic
   ink reads wrong (red 0 = false alarm) — consumer used neutral ink for zeros,
   semantic ink only when count > 0. Worth one line in the spec.
5. Tape needed `padding: 10px 0` glue to breathe — `.oo-tape` carries no
   vertical padding of its own. Minor.

No traps hit: `background-color` discipline held, `:where()` stat ink override
worked as documented (`.up`/`.down` on `.oo-stat-value` won cleanly).
