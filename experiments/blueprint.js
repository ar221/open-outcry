// Lab 04 — Blueprint Schematic (Console). Third consumer of lab-shell.js.
// The repo's own dependency pipeline drawn as a monoline amber wireframe.
// three.js arrives as a global from vendor/three.iife.js — never imported here.
//
// ── The graph is audited, not illustrative ───────────────────────────────
// Every edge below was checked against the files on 2026-07-26:
//
//   grep -n '@import' tokens.css components.css **/*.html   -> no hits
//   grep -oE 'var\(--oo-[a-z0-9-]+' components.css | sort -u -> 18 unique, 30 refs
//   grep -oE 'var\(--r-[a-z0-9-]+'  components.css | sort -u ->  9 unique, 28 refs
//   grep -cE '^\s*--oo-[a-z0-9-]+\s*:' tokens.css           -> 37 declarations
//   grep -cE '^\s*--r-[a-z0-9-]+\s*:'  tokens.css           -> 22 declarations
//                                                              (11 names x 2 registers)
//   grep -cE '^\s*--(oo|r)-[a-z0-9-]+\s*:' components.css   ->  0 (declares none)
//   grep -n 'rel="stylesheet"' index.html examples/*.html experiments/*.html
//
// The coupling is 27 names, not 18. components.css reads 18 `var(--oo-*)` AND 9
// `var(--r-*)` register aliases, and the alias layer is the load-bearing half —
// the .oo-* classes consume --r-* so that one class works in both registers.
// All 9 alias names are defined only in tokens.css (:root/.reg-console and
// .reg-broadcast). An earlier pass of this plate said `var(--oo-*) x 18` alone,
// which is true but under-reports the very thing the plate exists to draw, so
// both the drawing and the readout now carry both halves.
//
// Two facts that the plan's edge list got wrong, corrected here:
//
//   1. tokens -> components is NOT an @import. There is no @import anywhere in
//      the repo. components.css declares no custom properties of its own and
//      resolves 18 distinct `var(--oo-*)` names that only tokens.css defines.
//      The dependency is real; the mechanism is cascade inheritance, and the
//      consumer is responsible for loading both sheets in order.
//   2. Every consumer <link>s tokens.css DIRECTLY, not just components.css.
//      The plan drew `tokens -> labs` but omitted the identical direct links
//      from index.html, examples/inir.html and examples/morning-brief.html.
//      Six edges became nine. A schematic of this repo that shows tokens
//      reaching index.html only through components.css is a schematic that
//      lies about the one thing it exists to draw.
//
// Stage 2 (the four direct token links) is drawn as the dimmer strand, so the
// primary contract chain still carries the first read while the bypass stays
// visible and true.

import { createLab, makeTextSprite } from './lab-shell.js';

// ── The graph, and the two layouts of it ─────────────────────────────────
// LAYOUTS holds the SAME six nodes and nine edges arranged twice. The choice
// is a snapped breakpoint on viewport aspect, not a lerp, because `side` — the
// half-plane a label is allowed to occupy — genuinely differs between the two
// and cannot be interpolated. A label crossfading from one side of its dot to
// the other passes straight through the dot at the midpoint.
//
// ── Why `side`, and why the shapes differ ──
// Step 4 of the brief wants no edge crossing a label. Nudging z until the
// collisions happen to go away is a fix that lasts until the next aspect, so
// both arrangements make crossings structurally impossible instead. In each
// one, every label sits in a half-plane that contains no edge geometry:
//
//   WIDE — a fan. Two source sheets at the left, the four consumers in a
//   column at the right, every edge descending left to right. Consumer labels
//   go RIGHT: the consumer column is where every edge terminates, so nothing
//   is drawn right of it. Source labels go LEFT: upstream of the whole fan.
//   components.css is the one node needing care, because it sits inside
//   tokens.css's fan.
//
//   ── y-ordering (review fix) ──
//   An earlier pass parked components.css ABOVE tokens.css, so the primary
//   chain rose before the fan descended. It cleared the fan, but it also made
//   the two surfaces of the same graph disagree about which sheet is upstream:
//   the fallback SVG descends tokens -> components -> consumers, and so does
//   every pipeline diagram anyone draws. The invariant ("no label shares a
//   half-plane with edge geometry") wants the label OUT of the fan, not UP —
//   a fan has two exteriors. So tokens.css is now the topmost node, the whole
//   graph descends monotonically, and components.css escapes DOWNWARD: its
//   `lift` is negative, seating its ink below the lowest tokens -> consumer
//   stroke instead of above the highest one. Same argument, other exterior.
//
//   NARROW — a convex arc. Six nodes descending leftward with the leftward
//   step growing each tier, which puts every chord to the LEFT of every node
//   it passes. That frees the entire right half-plane, so all six labels go
//   RIGHT with one rule and no special cases. The fan reading is weaker here
//   and the longest chords crowd (see the report), but the alternative on a
//   0.76:1 plate is either cropped nodes or type below reading size.
//
// In both, the consumer tier is also the FAR tier: a source close to the eye
// binds the frame at a small y offset because perspective magnifies it, so the
// spread belongs on the far tier. updateNodeScales handles the other half.
//
// Per-layout `aim` is the SEED for solveFraming, which re-centres it against
// the measured projection every frame. The aim genuinely moves between layouts;
// it does not merely dolly. `labelScale` is authored rather than derived,
// because the fit reads label ink extents as inputs and deriving the scale from
// the fit's own output would close a loop with no fixed point worth having.
// Optional per-node `lift` / `noteDrop` override the shared LIFT / NOTE_DROP
// seats, in label-scale units, signed the same way (+ is up off the dot). Only
// components.css needs them, and only on the wide plate.
const LAYOUTS = {
  wide: {
    aim: [-8.0, -0.5, -9],
    labelScale: 2.4,
    aspectFloor: 1.35,
    nodes: {
      // Monotone descent: tokens (top) -> components -> the consumer column.
      tokens:     { pos: [-30.0, 9.0, -3],   side: 'left' },
      // Its ink hangs below the node, clear of the tokens fan overhead.
      components: { pos: [-15.0, 3.4, -7],   side: 'left', lift: -1.30, noteDrop: 2.10 },
      book:       { pos: [12.0, 1.6, -12],   side: 'right' },
      inir:       { pos: [12.0, -2.4, -13],  side: 'right' },
      brief:      { pos: [12.0, -6.4, -13],  side: 'right' },
      labs:       { pos: [12.0, -10.4, -12], side: 'right' },
    },
  },
  narrow: {
    aim: [-1.5, 0.0, -6],
    labelScale: 2.1,
    aspectFloor: 0,
    nodes: {
      // x = 3.5 - 0.05 * (8 - y)^2 — the convexity is the whole safety
      // argument, so the arc is generated rather than eyeballed.
      tokens:     { pos: [3.50, 8.0, -1],     side: 'right' },
      components: { pos: [3.00, 4.8, -4],     side: 'right' },
      book:       { pos: [1.45, 1.6, -6],     side: 'right' },
      inir:       { pos: [-1.11, -1.6, -7.5], side: 'right' },
      brief:      { pos: [-4.69, -4.8, -9],   side: 'right' },
      labs:       { pos: [-9.30, -8.0, -10.5], side: 'right' },
    },
  },
};

// `note` is a second, smaller caption under the file name. For the consumers it
// says what the file IS; for components.css it carries the figure that makes the
// coupling honest. Every note sits in the same half-plane as its own label, so
// it is exactly as safe as the label: the consumers' is free of edges by
// construction, and components.css escapes downward (see LAYOUTS).
//
// components.css reads 27 names — 18 `var(--oo-*)` AND 9 `var(--r-*)` — and
// declares none of its own. Saying only the 18, as an earlier pass did, hides
// the load-bearing half: the .oo-* classes consume the --r-* aliases, which
// tokens.css re-points per register so one class serves both. tokens.css gets
// no note: its 37 + 22 declaration split is in the page readout and on the
// fallback plate, and its caption was the widest ink box in the frame, dollying
// the camera out far enough to cost every label a pixel of cap height.
//
// Sprite sheets are 512px wide with a 23px mono face at 2px tracking and origin
// x = 8, so a note has ~31 characters before the ink runs off the texture.
const NODES = [
  { id: 'tokens',     label: 'tokens.css',     tier: 'amber', stage: 0 },
  { id: 'components', label: 'components.css', tier: 'amber', stage: 1,
    note: 'READS 18 --oo-* + 9 --r-*' },
  { id: 'book',       label: 'index.html',     tier: 'green', stage: 2, note: 'BRAND BOOK' },
  { id: 'inir',       label: 'examples/inir',  tier: 'green', stage: 2, note: 'EXAMPLE' },
  { id: 'brief',      label: 'examples/brief', tier: 'green', stage: 2, note: 'EXAMPLE' },
  { id: 'labs',       label: 'experiments/*',  tier: 'peach', stage: 2, note: '4 LABS' },
];

// stage 0: the contract chain's own link.
// stage 1: components.css reaching each consumer.
// stage 2: the direct tokens.css <link> every consumer also carries.
const EDGES = [
  { from: 'tokens',     to: 'components', stage: 0, strand: 'primary' },
  { from: 'components', to: 'book',       stage: 1, strand: 'primary' },
  { from: 'components', to: 'inir',       stage: 1, strand: 'primary' },
  { from: 'components', to: 'brief',      stage: 1, strand: 'primary' },
  { from: 'components', to: 'labs',       stage: 1, strand: 'primary' },
  { from: 'tokens',     to: 'book',       stage: 2, strand: 'direct' },
  { from: 'tokens',     to: 'inir',       stage: 2, strand: 'direct' },
  { from: 'tokens',     to: 'brief',      stage: 2, strand: 'direct' },
  { from: 'tokens',     to: 'labs',       stage: 2, strand: 'direct' },
];

const STAGES = 3;
const TIER_HEX = { amber: '#f2a51f', green: '#48dc7d', peach: '#e8927c' };

// ── Framing ──────────────────────────────────────────────────────────────
// FOV is fixed; the camera sits on the +z axis through the aim point, so the
// projection of any world point is closed-form and the fit below is exact
// rather than a guessed dolly table.
const FOV = 44;
const HALF_TAN = Math.tan((FOV * Math.PI) / 360);

// Fraction of the frame the fitted content is allowed to occupy. Short of 1
// on both axes so the pointer drift below can never push a node off an edge.
const FILL_X = 0.93;
const FILL_Y = 0.90;

// makeTextSprite bakes 23px JetBrains Mono with 2px letter-spacing onto a
// 512x64 sheet, text origin x = 8. Advance is 0.6em + tracking.
const ADVANCE_PX = 23 * 0.6 + 2;
const SHEET_PX = 512;
const SPRITE_W = 4.8;                       // world units at scale 1
const PX_TO_WORLD = SPRITE_W / SHEET_PX;    // per unit of label scale

// Clear air between the node dot and the nearest ink, in label-scale units.
const INK_GAP = 0.60;
// Vertical lift of the ink off the dot, per side. Source labels ride higher:
// they sit upstream of the fan, and the extra air keeps them off the shallowest
// edge leaving the node. An earlier arrangement with components.css inside the
// fan had the tokens -> examples/inir edge missing its ink by four pixels; the
// fix was the node's position, not this number.
const LIFT = { left: 0.90, right: 0.50 };
// Sub-caption: smaller, muted, seated below the dot on the same side.
//
// Measured, not guessed: raising this to 0.92 to make the coupling caption
// readable on the 390px plate did nothing. The fit is bound by label ink on both
// axes, so a bigger note sheet only dollies the camera out and hands the pixels
// straight back — the note grew, every file name shrank, the note's rendered
// width was unchanged. Relative type size here is zero-sum; the only real levers
// are fewer ink boxes or shorter strings. Left at 0.80, which favours the file
// names. Consequence recorded honestly: on the narrow plate the coupling caption
// is ~3.4 px per glyph — present, not comfortably readable. It reads on the
// desktop plate and on the fallback, and the page readout carries it in HTML
// type at every width.
const NOTE_SCALE = 0.80;
const NOTE_DROP = 0.36;
const INK_HALF_H = 0.15;                    // cap height half, in scale units

const DOT_SIZE = 0.17;                      // scale units; square hardware

const DRAW_SECONDS = 4.8;
const HOLD_SECONDS = 3.2;

const pickLayout = aspect => (aspect >= LAYOUTS.wide.aspectFloor ? LAYOUTS.wide : LAYOUTS.narrow);

// Which layout the current frame is using; labelBox needs its `side` rule.
let active = LAYOUTS.wide;

// Seats for one node's two ink lines, in label-scale units, signed + = up off
// the dot. A per-node override wins, so a node whose safe exterior is DOWNWARD
// flips both its label and its note with one authored number instead of a
// special case in the layout loop. `noteDrop` is measured from the dot, not
// from the label, so a node with a negative lift authors a drop large enough to
// clear its own label — checked in fitPoints, which frames every ink box.
const seatLift = node => active.nodes[node.id].lift ?? LIFT[active.nodes[node.id].side];
const seatNoteDrop = node => active.nodes[node.id].noteDrop ?? NOTE_DROP;

// Ink geometry for one label at one scale. makeTextSprite draws left-aligned
// from x = 8 on a 512-wide sheet whose centre is the sprite's origin, so the
// ink centre is offset from the sprite position by a fixed amount and the
// sprite has to be counter-shifted to seat the ink where `side` wants it.
function labelBox(node, text, x, inkY, scale) {
  const side = active.nodes[node.id].side;
  const widthPx = text.length * ADVANCE_PX;
  const halfW = (widthPx / 2) * PX_TO_WORLD * scale;
  const reach = INK_GAP * scale + halfW;
  const inkX = side === 'left' ? x - reach : x + reach;
  const inkOffset = (8 + widthPx / 2 - SHEET_PX / 2) * PX_TO_WORLD * scale;
  return {
    spriteX: inkX - inkOffset,
    spriteY: inkY,
    left: inkX - halfW,
    right: inkX + halfW,
    top: inkY + INK_HALF_H * scale,
    bottom: inkY - INK_HALF_H * scale,
  };
}

// Live per-frame state. `base` is the authored layout at the current aspect;
// `pos` is that layout after the solver's fill gains. Everything downstream —
// edges, dots, labels, the fit — reads `pos`.
const base = new Map();    // id -> [x, y, z]
const pos = new Map();     // id -> [x, y, z]
let lineObjs = [];
let dotObjs = [];
let labelObjs = [];
let noteObjs = [];
let drawClock = 0;

function layout(chosen) {
  active = chosen;
  for (const node of NODES) {
    base.set(node.id, chosen.nodes[node.id].pos.slice());
  }
}

// Spread the authored layout about the AUTHORED aim. Because ndc is linear in
// (x - aim.x) at fixed depth, scaling the offsets scales the projection by the
// same factor exactly — which is what makes the fill loop below converge in a
// handful of passes instead of needing a search.
//
// The anchor is deliberately aimBase and not the solved aim. Anchoring the
// spread on the aim while the same loop is also moving the aim couples the two
// corrections: the content chases the aim, the aim re-centres on the moved
// content, and five passes of that walked the layout 25 units off and dollied
// the camera out to 63 — which is exactly how the first pass of this lab ended
// up with five-pixel labels. Content stays put in world space; only the eye
// moves.
function applyGains(gx, gy, aimBase) {
  for (const node of NODES) {
    const b = base.get(node.id);
    pos.set(node.id, [
      aimBase[0] + gx * (b[0] - aimBase[0]),
      aimBase[1] + gy * (b[1] - aimBase[1]),
      b[2],
    ]);
  }
}

// ── Depth-compensated annotation ─────────────────────────────────────────
// A sprite of fixed world size shrinks with depth, and the consumer tier is
// twice as far from the eye as the source tier — which rendered `index.html`
// at about five pixels while `tokens.css` read cleanly. Perspective belongs to
// the geometry; a schematic's callouts are drawing-office annotation and are
// the same size wherever they sit. So each label's world scale is multiplied by
// its own depth over the aim-plane depth, which cancels the projection exactly
// and puts every label on screen at one size. Node markers take the same
// correction at a 0.75 power, keeping a trace of depth in the hardware while
// staying legible. The remaining depth cues are line convergence and fog —
// which is what a perspective drawing actually runs on.
const labelScale = new Map();
const dotScale = new Map();

function updateNodeScales(scale, aimZ, distance) {
  const cz = aimZ + distance;
  for (const node of NODES) {
    const ratio = Math.max(0.3, (cz - base.get(node.id)[2]) / distance);
    labelScale.set(node.id, scale * ratio);
    dotScale.set(node.id, DOT_SIZE * scale * Math.pow(ratio, 0.75));
  }
}

// Every point the frame has to contain: the dot's silhouette and the label's
// ink box, both at the node's own depth. Labels are the reason the fit exists
// — the dots alone would fit inside a fraction of this frame.
function fitPoints() {
  const points = [];
  for (const node of NODES) {
    const [x, y, z] = pos.get(node.id);
    const half = dotScale.get(node.id) / 2;
    points.push([x - half, y - half, z], [x + half, y + half, z]);
    const s = labelScale.get(node.id);
    const box = labelBox(node, node.label, x, y + seatLift(node) * s, s);
    points.push([box.left, box.bottom, z], [box.right, box.top, z]);
    if (node.note) {
      const nb = labelBox(node, node.note, x, y - seatNoteDrop(node) * s, s * NOTE_SCALE);
      points.push([nb.left, nb.bottom, z], [nb.right, nb.top, z]);
    }
  }
  return points;
}

// Smallest camera distance along +z from `aim` that holds every point inside
// FILL_X / FILL_Y. Bisection rather than algebra: the binding point changes
// with distance because nearer nodes shrink faster than far ones, so there is
// no single closed-form term to solve.
function fitDistance(points, aim, aspect) {
  const fits = d => {
    const cz = aim[2] + d;
    for (const [x, y, z] of points) {
      const viewZ = cz - z;
      if (viewZ < 0.5) return false;
      const halfH = viewZ * HALF_TAN;
      if (Math.abs(y - aim[1]) > halfH * FILL_Y) return false;
      if (Math.abs(x - aim[0]) > halfH * aspect * FILL_X) return false;
    }
    return true;
  };
  let lo = 3;
  let hi = 90;
  for (let i = 0; i < 24; i += 1) {
    const midDist = (lo + hi) / 2;
    if (fits(midDist)) hi = midDist;
    else lo = midDist;
  }
  return hi;
}

// Where the fitted content actually lands in NDC, and how far off centre.
function measure(points, aimX, aimY, cz, aspect) {
  let xlo = Infinity, xhi = -Infinity, ylo = Infinity, yhi = -Infinity, invSum = 0;
  for (const [x, y, z] of points) {
    const inv = 1 / Math.max(0.5, cz - z) / HALF_TAN;
    invSum += inv;
    const nx = ((x - aimX) * inv) / aspect;
    const ny = (y - aimY) * inv;
    if (nx < xlo) xlo = nx;
    if (nx > xhi) xhi = nx;
    if (ny < ylo) ylo = ny;
    if (ny > yhi) yhi = ny;
  }
  return {
    centreX: (xlo + xhi) / 2,
    centreY: (ylo + yhi) / 2,
    halfX: Math.max(1e-4, (xhi - xlo) / 2),
    halfY: Math.max(1e-4, (yhi - ylo) / 2),
    meanInv: invSum / points.length,
  };
}

// ── The composition gate, as code ────────────────────────────────────────
// fitDistance alone only guarantees containment, and containment is not
// composition: it dollies until the single binding extreme clears an edge and
// leaves the other axis — and the far side of the binding axis — empty. That is
// precisely the weak plate a passing verify script will happily wave through.
//
// So each frame the solver alternates two corrections until both settle:
//   re-centre the AIM so the content's projected extent is symmetric, then
//   spread the layout so both axes reach FILL_X / FILL_Y.
// Gains only ever expand: the fit runs first, so neither axis can be over
// target when the gain is computed. Clamped so a freak aspect cannot stretch
// the drawing into a caricature of itself.
const GAIN_MAX = 2.1;
const PASSES = 5;

function solveFraming(aimBase, scale, aspect) {
  let aimX = aimBase[0];
  let aimY = aimBase[1];
  let gx = 1;
  let gy = 1;
  let distance = 18;
  for (let pass = 0; pass < PASSES; pass += 1) {
    applyGains(gx, gy, aimBase);
    // Label sizes depend on the distance and the distance depends on the label
    // sizes; the loop is the fixed-point solve. Ratios tend to 1 as distance
    // grows, so it settles rather than running away.
    updateNodeScales(scale, aimBase[2], distance);
    const points = fitPoints();
    distance = fitDistance(points, [aimX, aimY, aimBase[2]], aspect);
    if (pass === PASSES - 1) break;
    const m = measure(points, aimX, aimY, aimBase[2] + distance, aspect);
    aimX += (m.centreX * aspect) / m.meanInv;
    aimY += m.centreY / m.meanInv;
    gx = Math.min(GAIN_MAX, gx * (FILL_X / m.halfX));
    gy = Math.min(GAIN_MAX, gy * (FILL_Y / m.halfY));
  }
  return { distance, aimX, aimY };
}

function buildSchematic(ctx) {
  const { THREE, scene, palette } = ctx;
  const group = new THREE.Group();
  group.name = 'schematic';
  lineObjs = [];
  dotObjs = [];
  labelObjs = [];
  noteObjs = [];

  // Seed `pos` so build-time geometry is in the right postcode. update() runs
  // before the first render and overwrites all of it.
  layout(LAYOUTS.wide);
  updateNodeScales(LAYOUTS.wide.labelScale, LAYOUTS.wide.aim[2], 26);
  applyGains(1, 1, LAYOUTS.wide.aim);

  for (const edge of EDGES) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3(),
    ]);
    // LineDashedMaterial with one dash and one gap is the line-draw: dashSize
    // grows from 0 to the segment's own length, so the stroke walks from its
    // source node to its target. Same idea as stroke-dashoffset in §5, which
    // is why this motion is sanctioned here — it is the flow being explained,
    // not decoration bolted onto a static picture.
    const material = new THREE.LineDashedMaterial({
      color: edge.strand === 'primary' ? palette.amber : palette.amberLine,
      transparent: true,
      opacity: edge.strand === 'primary' ? 0.9 : 0.62,
      dashSize: 0,
      gapSize: 1,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.renderOrder = edge.strand === 'primary' ? 2 : 1;
    line.userData.edge = edge;
    group.add(line);
    lineObjs.push(line);
  }

  for (const node of NODES) {
    const hex = TIER_HEX[node.tier];
    const dot = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),          // square hardware, not spheres
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: true })
    );
    dot.renderOrder = 3;
    group.add(dot);
    dotObjs.push(dot);

    const label = makeTextSprite(THREE, node.label, hex, 1);
    // Lab 02's lesson, and the one this lab was warned about: an annotation
    // sharing an axis with other geometry loses the depth test and is buried
    // INSIDE it. These labels sit on the same z as their dots and are crossed
    // by four edges apiece. depthTest:false + renderOrder is the fix; near
    // plane and frustum are not involved. Fog is off for the same reason —
    // the far consumers are the labels most at risk of going unreadable.
    label.material.depthTest = false;
    label.material.fog = false;
    label.renderOrder = 4;
    group.add(label);
    labelObjs.push(label);

    if (!node.note) {
      noteObjs.push(null);
      continue;
    }
    const note = makeTextSprite(THREE, node.note, '#686564', 1);
    note.material.depthTest = false;
    note.material.fog = false;
    note.renderOrder = 4;
    group.add(note);
    noteObjs.push(note);
  }

  scene.add(group);
}

function updateSchematic(ctx, dt) {
  const { THREE, camera, pointer, revealFull } = ctx;

  // ── Aspect ──
  // t = 0 is the 2.4:1 desktop plate, t = 1 the phone. The crossover band is
  // wide so no realistic window snaps between layouts.
  const chosen = pickLayout(camera.aspect);
  layout(chosen);
  const framing = solveFraming(chosen.aim, chosen.labelScale, camera.aspect);
  const aim = [framing.aimX, framing.aimY, chosen.aim[2]];

  // ── Reveal ──
  // `?reveal=full` (lab-shell.js) pins the clock at completion. The geometry at
  // progress = 1 is what the plate IS — stage 2 yields dashSize = length below,
  // so every chord terminates on its node — and a screenshot harness sampling a
  // fixed wait against this 8s cycle otherwise catches an arbitrary frame of the
  // draw and gates the composition on something that is not the plate. Pointer
  // drift and the camera solve are untouched: this pins the reveal, not the lab.
  drawClock += dt;
  if (drawClock > DRAW_SECONDS + HOLD_SECONDS) drawClock = 0;
  const progress = revealFull ? 1 : Math.min(1, drawClock / DRAW_SECONDS);   // linear draw

  for (const line of lineObjs) {
    const { from, to, stage } = line.userData.edge;
    const a = pos.get(from);
    const b = pos.get(to);
    const attr = line.geometry.attributes.position;
    attr.setXYZ(0, a[0], a[1], a[2]);
    attr.setXYZ(1, b[0], b[1], b[2]);
    attr.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    // Distances have to be recomputed because the endpoints move with aspect,
    // and LineDashedMaterial reads the baked attribute, not the positions.
    line.computeLineDistances();

    const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    // Edges within a stage draw together: the fan out of components.css is
    // one act, not four. Sequencing them individually would imply an ordering
    // among the consumers that the repo does not have.
    const local = THREE.MathUtils.clamp((progress - stage / STAGES) * STAGES, 0, 1);
    line.material.dashSize = length * local;
    line.material.gapSize = length * (1 - local) + 0.0001;
  }

  NODES.forEach((node, i) => {
    const [x, y, z] = pos.get(node.id);
    // A node inks in when the stage that reaches it has finished drawing.
    // Before that it holds as an underlay, so the plate reads as a blueprint
    // being inked over its own ghost rather than as objects popping in.
    //
    // The underlay is deliberately close to full strength. Two thirds of every
    // cycle has some tier un-inked, so a faint ghost would mean the plate's
    // first read depends on when you happen to look at it — the earlier 0.12
    // version rendered the four consumers as barely-there smudges for five
    // seconds out of eight. The reveal lives in the strokes; the file names are
    // legible at every instant of the cycle.
    const inked = progress >= node.stage / STAGES - 1e-6;

    const dot = dotObjs[i];
    dot.position.set(x, y, z);
    dot.scale.setScalar(dotScale.get(node.id));
    dot.material.opacity = inked ? 1 : 0.55;

    const s = labelScale.get(node.id);
    const box = labelBox(node, node.label, x, y + seatLift(node) * s, s);
    const label = labelObjs[i];
    label.position.set(box.spriteX, box.spriteY, z);
    label.scale.set(SPRITE_W * s, 0.6 * s, 1);
    label.material.opacity = inked ? 0.85 : 0.62;

    const note = noteObjs[i];
    if (note) {
      const ns = s * NOTE_SCALE;
      const nb = labelBox(node, node.note, x, y - seatNoteDrop(node) * s, ns);
      note.position.set(nb.spriteX, nb.spriteY, z);
      note.scale.set(SPRITE_W * ns, 0.6 * ns, 1);
      note.material.opacity = inked ? 0.8 : 0.55;
    }
  });

  // ── Camera ──
  camera.position.set(
    aim[0] + pointer.x * 0.55,
    aim[1] + pointer.y * 0.28,
    aim[2] + framing.distance,
  );
  // The shell aims once at init and never re-aims. Mutating camera.position
  // without this leaves the rotation stale.
  camera.lookAt(aim[0], aim[1], aim[2]);
}

createLab({
  clearColor: 'consoleStage',
  // Light fog only. This is a drawing, not a room: enough falloff to seat the
  // consumer tier behind the contract tier, not enough to grey out a stroke
  // the plate exists to let you follow end to end.
  fogDensity: 0.011,
  pointer: true,
  camera: {
    fov: FOV,
    position: [LAYOUTS.wide.aim[0], LAYOUTS.wide.aim[1], LAYOUTS.wide.aim[2] + 28],
    lookAt: LAYOUTS.wide.aim,
  },
  build: buildSchematic,
  update: updateSchematic,
});
