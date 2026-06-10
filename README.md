# Open Outcry

**Live:** https://ar221.github.io/open-outcry/

Ayaz's personal design language. Dual register: **Broadcast** (editorial serif, coffee-dark)
× **Console** (pixel amber CRT), glued by **the Tape** (ticker rails, market semantics).

- `tokens.css` — design tokens + utilities. Import this into any project.
  Requires fonts loaded by the consumer: [Fraunces (variable)](https://fonts.google.com/specimen/Fraunces), [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono). A `.reg-console`/`.reg-broadcast` class on an ancestor selects the register; console is the default.
- `index.html` — the living brand book. Open it; it demonstrates its own rules.
  Serve over http (`python -m http.server`) for the live token count — `file://` blocks stylesheet introspection and the tape shows `TOKENS n/a`.

Spec of record: vault → `03 Projects/System/01 Specs/™ Open Outcry Design Language Spec 2026-06-09.md`
Supersedes: Terminal Masterclass Brandbook (2026-05-21), absorbed as the Console register.
