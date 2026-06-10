# Open Outcry

**Live:** https://ar221.github.io/open-outcry/

Ayaz's personal design language. Dual register: **Broadcast** (editorial serif, coffee-dark)
× **Console** (pixel amber CRT), glued by **the Tape** (ticker rails, market semantics).

- `tokens.css` — design variables (`--oo-*`) + the `.reg-console`/`.reg-broadcast` register
  alias layer (`--r-*`) — nothing else. Import this into any project.
  Requires fonts loaded by the consumer: [Fraunces (variable)](https://fonts.google.com/specimen/Fraunces), [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono). A `.reg-console`/`.reg-broadcast` class on an ancestor selects the register; console is the default.
- `components.css` — the class contract. Import after tokens.css. Main classes:
  - `.oo-scanlines` / `.oo-grain` / `.oo-vignette` — CRT and film textures
  - `.oo-pane` / `.oo-pane--armed` / `.oo-warning` — smoky bordered plate hardware
  - `.oo-rail` / `.oo-tape` — top rail and ticker tape chrome
  - `.oo-rail--foot` — footer rail variant (border on top, not bottom)
  - `.oo-link` — anchor treatment: voice ink, dim underline that ignites on hover
  - `.oo-kicker` / `.oo-dot` / `.oo-cursor` — glyph syntax: eyebrow, live dot, heartbeat
  - `.up` / `.down` / `.voice` — market ink (green / red / register voice accent)
  - `.oo-display-console` / `.oo-display-broadcast` — the two display voices
  - `.oo-tickwrap` / `.oo-scanbeam` / `.oo-hover` / `.oo-draw-path` — sanctioned motion
  - `.oo-plate` / `.oo-plate--bleed` / `.oo-plate-card` / `.oo-specimen` — section plates and specimen cards
  - `.oo-stat` / `.oo-stat-value` — stat lockup: kicker + big mono number (compose with `.oo-pane`)
  - `.oo-prose` — body-paragraph measure (dim ink, 54ch)
  - `.oo-grid-2` / `.oo-grid-2--wide` / `.oo-grid-3` — layout grids (collapse to 1 column under 720px)
  - `.oo-overlay` / `.oo-content` — texture-overlay host and z-lifted content
  - `.oo-register-quote` — one machine pane quoted inside broadcast; self-registering — the one class carries pane hardware, scanlines, and the console register. `--block` variant for multi-line quotes
- `index.html` — the living brand book / documentation. Open it; it demonstrates its own rules.
  Serve over http (`python -m http.server`) for the live token count — `file://` blocks stylesheet introspection and the tape shows `TOKENS n/a`.

Spec of record: vault → `03 Projects/System/01 Specs/™ Open Outcry Design Language Spec 2026-06-09.md`
Supersedes: Terminal Masterclass Brandbook (2026-05-21), absorbed as the Console register.
