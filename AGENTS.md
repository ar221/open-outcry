# Open Outcry

Ayaz's personal design language, published as a living brand book. Dual register: **Broadcast** (editorial serif, coffee-dark) × **Console** (pixel amber CRT), glued by **the Tape** (ticker rails, market semantics). Live at https://ar221.github.io/open-outcry/

## Stack
- Static CSS + HTML. No build, no framework, no dependencies.
- Consumer must load fonts: Fraunces (variable), Pixelify Sans, JetBrains Mono.

## Layout
- `tokens.css` — design variables (`--oo-*`) + `.reg-console`/`.reg-broadcast` register alias layer (`--r-*`). Import first.
- `components.css` — the class contract (`.oo-*`: panes, rails/tape, scanlines, plates, stats, grids). Import after tokens.
- `index.html` — living brand book; demonstrates its own rules. Serve over http for live token count.
- `examples/` — reference usages.

## Entrypoint
- Serve locally: `python -m http.server` then open `index.html` (`file://` breaks stylesheet introspection — tape shows `TOKENS n/a`).
- Deploy: GitHub Pages from `main` (ar221.github.io/open-outcry/).

## Status
- Branch: `main`. Live/published, stable design system.
- Supersedes Terminal Masterclass Brandbook (2026-05-21), absorbed as the Console register.

## Conventions
Inherits ~/CLAUDE.md (Alfred). Spec of record in vault: `03 Projects/System/01 Specs/™ Open Outcry Design Language Spec 2026-06-09.md`. Repo-specific overrides here.
