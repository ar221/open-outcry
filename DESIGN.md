---
version: alpha
name: Open Outcry
description: "Ayaz's personal design language: Broadcast editorial voice, Console machine voice, and the Tape as live market connective tissue."
colors:
  primary: "#f2a51f"
  on-primary: "#020302"
  primary-dim: "#b57b24"
  primary-line: "#9b6822"
  secondary: "#e8927c"
  secondary-dim: "#d67c50"
  on-secondary: "#181210"
  surface: "#070807"
  surface-void: "#020302"
  surface-console-stage: "#070807"
  surface-console-pane: "#0d0d0b"
  surface-console-smoke: "rgba(21, 18, 11, 0.72)"
  surface-broadcast-stage: "#181210"
  surface-broadcast-pane: "#221813"
  on-surface: "#eee8df"
  on-surface-warm: "#efe6dc"
  on-surface-dim: "#aaa39a"
  muted: "#686564"
  muted-warm: "#7a6a5f"
  ghost: "#3f3e3d"
  success: "#48dc7d"
  success-deep: "#1f9d55"
  danger: "#e0455a"
  evidence: "#5aa7ff"
  provider: "#b77aff"
  line: "#1c1a14"
  line-warm: "#241c18"
  pane-border: "rgba(242, 165, 31, 0.42)"
typography:
  display-broadcast:
    fontFamily: Fraunces
    fontSize: 96px
    fontWeight: 560
    lineHeight: 1.08
    letterSpacing: -0.01em
  display-console:
    fontFamily: Pixelify Sans
    fontSize: 112px
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: -0.02em
  body:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  meta:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.04em
  kicker:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.18em
  control:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.08em
  ticker:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.04em
rounded:
  none: 0px
  sm: 1px
  md: 2px
spacing:
  rail-y: 10px
  button-x: 16px
  button-y: 11px
  pane-sm: 20px
  pane-md: 28px
  pane-lg: 48px
  grid-gap: 16px
  grid-gap-wide: 24px
  plate-y: 88px
  plate-bleed-y: 120px
  stage-gutter: 56px
  stage-gutter-narrow: 20px
components:
  pane:
    backgroundColor: "{colors.surface-console-smoke}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.pane-md}"
  pane-armed:
    backgroundColor: "{colors.surface-console-smoke}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.pane-md}"
  button:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "{spacing.button-x}"
    height: 42px
  button-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "{spacing.button-x}"
    height: 42px
  rail:
    backgroundColor: "{colors.surface-console-stage}"
    textColor: "{colors.muted}"
    typography: "{typography.ticker}"
    rounded: "{rounded.none}"
    padding: "{spacing.rail-y}"
  tape:
    backgroundColor: "{colors.surface-console-stage}"
    textColor: "{colors.muted}"
    typography: "{typography.ticker}"
    rounded: "{rounded.none}"
  display-console:
    textColor: "{colors.primary}"
    typography: "{typography.display-console}"
  display-broadcast:
    textColor: "{colors.on-surface-warm}"
    typography: "{typography.display-broadcast}"
  stat:
    backgroundColor: "{colors.surface-console-smoke}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.pane-md}"
  warning:
    backgroundColor: "{colors.surface-console-smoke}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "{spacing.pane-sm}"
  register-quote:
    backgroundColor: "{colors.surface-console-pane}"
    textColor: "{colors.on-surface-dim}"
    typography: "{typography.ticker}"
    rounded: "{rounded.md}"
    padding: "{spacing.button-x}"
---

## Overview

Open Outcry is Ayaz's personal brand language: a serious operator broadcasting from a live desk. It has one identity expressed through two registers and one connective tape.

**Broadcast** is the human voice: coffee-dark editorial surfaces, Fraunces display type, grain, rhetoric, theses, openings, landing pages, and one italic peach accent phrase per plate.

**Console** is the machine voice: green-black CRT surfaces, Pixelify display type, JetBrains Mono chrome, amber command ink, scanlines, panes, rails, warnings, dashboards, and terminal-like receipts.

**The Tape** is the connective tissue: ticker rails, live status dots, market green/red semantics, real counts, and data-as-backdrop art. It runs through both registers and gives the system its aliveness.

The governing test is: **does it feel like a serious operator broadcasting from a live desk?**

## Colors

Open Outcry is 90% darkness, warm off-white text, and one voice accent. Color is earned by function, not decoration.

- **Primary / Console voice (`#f2a51f`):** amber command ink. Use for console headlines, active chrome, live affordances, and the cursor heartbeat.
- **Primary dim / line (`#b57b24`, `#9b6822`):** subdued amber for borders, underlines, and hardware details.
- **Secondary / Broadcast voice (`#e8927c`, `#d67c50`):** peach and terracotta. Use for broadcast italic phrases, identity marks, editorial emphasis, and warm blooms.
- **Surface void (`#020302`):** outer electrical black. Void is atmosphere, not empty space.
- **Console surfaces (`#070807`, `#0d0d0b`, `rgba(21, 18, 11, 0.72)`):** CRT stage, pane, and smoky translucent hardware.
- **Broadcast surfaces (`#181210`, `#221813`):** coffee-warm editorial stage and pane.
- **Text (`#eee8df`, `#efe6dc`, `#aaa39a`):** warm stamped whites. Never use pure white as default body text.
- **Tape semantics:** green is live/up/safe; red is down/footgun/warning; blue is evidence/search ink only; violet is provider/external ink only.

Rules:

1. A plate is surface + text + one voice accent.
2. Semantic colors encode state only. Data visualizations may go polychrome because data earns color.
3. Blue is never a background, surface, or decorative glow.
4. Glow belongs to display titles, live dots, hover-arm panes, and the cursor — not generic decoration.

## Typography

Open Outcry uses three faces, but never all three as equal peers on a plate.

- **Fraunces** is Broadcast display: sentence case, large optical size, editorial gravity. The italic carries the peach accent phrase.
- **Pixelify Sans** is Console display: all caps, short phrases, trailing period, amber glow.
- **JetBrains Mono** is everything else: body, rails, tickers, kickers, controls, metadata, receipts, and captions in both registers.

Type rules:

1. Max two faces per plate: the register display face plus JetBrains Mono.
2. The opposite register can appear only as a quotation pane.
3. Controls are always mono chrome, even inside Broadcast.
4. Metadata is uppercase, letter-spaced, and dim.
5. Emphasis uses color, weight, and italic — not a fourth face.
6. Rejected alternates stay rejected unless a new design spec explicitly reopens them: Playfair Display, Instrument Serif, Silkscreen.

## Layout

Every Open Outcry surface is a captured plate: top rail, content plane, bottom rail or tape. The first viewport should have one dominant first-read object.

- **Stage:** centered, dark, bordered left/right, with a fixed horizontal gutter.
- **Plate:** one section of meaning, separated by thin strokes and generous vertical rhythm.
- **Pane:** smoky square hardware with 1px borders and 0–2px radius.
- **Rail:** mono path on the left, state on the right.
- **Tape:** ticker strip with real numbers, doubled for gapless scroll when animated.
- **Grid:** two or three columns on desktop; one column below narrow widths.
- **Void:** leave dark space visible. Do not fill every corner.

Mobile/fold adaptation: one column, tighter gutter, reduced display sizes, scanlines reduced or removed when they impair legibility, and controls remain large enough to tap.

## Elevation & Depth

Depth is not soft SaaS shadow. It is hardware layering:

- Console depth comes from scanlines, smoky pane fill, amber border ignition, and a slow scanbeam.
- Broadcast depth comes from coffee-dark stage, film grain, warm radial bloom, and editorial negative space.
- Interactive depth is the hover-arm: border ignites, inset glow appears, the pane lifts 1px, and active state inverts to black-on-voice.
- Diagrams use monoline SVG blueprint strokes, square joints, and semantic node dots.

Never use heavy blur-card glassmorphism, elastic parallax, decorative animated gradients, or chromatic aberration on instructional text.

## Shapes

Open Outcry is square hardware.

- Corners are `0px–2px` maximum.
- Strokes are thin and explicit.
- Panes, buttons, rails, and cards should feel bolted into a console, not pill-shaped.
- Live dots may be circular because they represent signal lights.
- Decorative rounded-card SaaS language is off-brand.

## Components

Components are a contract, not a full framework.

- **Pane:** base smoky hardware. Use for cards, receipts, warnings, stats, and quoted machine output.
- **Armed pane:** a pane with stronger amber border; reserve for primary actions or active mechanism states.
- **Button:** compose pane + hover-arm + mono uppercase control text. Controls are chrome; chrome is always mono.
- **Rail:** path/state chrome. Sticky rails must use `background-color`, not the `background` shorthand.
- **Tape:** ticker chrome. Use real document, task, market, or system counts; do not invent fake metrics.
- **Kicker:** uppercase mono eyebrow with glyph syntax: `//`, `>`, or `< key = "value" >` depending on register.
- **Display console:** Pixelify, amber, uppercase, trailing period, glow.
- **Display broadcast:** Fraunces, warm white, one italic peach phrase.
- **Register quote:** the opposite register quoted inside the dominant register. It is a quotation, not a 50/50 mix.
- **Stats:** mono big-number lockups. Semantic `.up` and `.down` ink must win over base stat ink.
- **Warnings:** red boundary ink on square hardware, not modal panic styling.

Implementation trap: never use the CSS `background:` shorthand on an element carrying scanlines. It resets `background-image` and silently erases the scanline layer. Use `background-color:`.

## Do's and Don'ts

- Do choose one dominant register per plate.
- Do let the other register appear only as a quotation.
- Do use amber for Console function and peach/terracotta for Broadcast identity.
- Do use cyan/blue only as rare evidence/search ink.
- Do preserve the Tape: rails, live dots, real counts, market green/red semantics.
- Do make glyphs syntax, not decoration.
- Do use linear or `steps()` motion only.
- Do keep copy compressed: mechanism + consequence.
- Don't use rounded SaaS cards, pills, or soft generic dashboards.
- Don't use blue or purple as background atmosphere.
- Don't fake live metrics.
- Don't use icon packs or emoji as the visual language.
- Don't mix three fonts on a plate unless the third is a visibly labeled quotation.
- Don't say seamless, powerful, delightful, unlock, revolutionary, or supercharge when a mechanism should be named.
