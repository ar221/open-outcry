// Lab 05 — Tape Ribbon (Broadcast). Fourth consumer of lab-shell.js, and the
// only Broadcast plate of Labs 02-05.
// three.js arrives as a global from vendor/three.iife.js — never imported here.
//
// ── What the register law actually constrains here ───────────────────────
// The plate is Broadcast: the Fraunces headline in tape-ribbon.html is the
// voice and it holds the first read. This file builds the QUOTATION — a machine
// artefact quoted inside a human-voiced plate — so everything it draws is mono,
// dim relative to the headline, seated below it in the layout and behind it in
// depth. Nothing in this file may become a second voice. Concretely that means:
// no serif face reaches the canvas texture, the band carries no display type,
// and the framing solve below deliberately targets the VIEWPORT (the lower
// band of the plate), not the plate.

import { createLab } from './lab-shell.js';

const SNAPSHOT = 'data/market-2026-07-26.json';

const response = await fetch(SNAPSHOT);
const data = await response.json();

// ── The tape sheet ───────────────────────────────────────────────────────
// 4096 wide, and a power of two on purpose: this texture is RepeatWrapping'd,
// and NPOT + REPEAT is undefined in WebGL1, which lab-shell.js will still hand
// us if webgl2 is unavailable. A silently black ribbon on old hardware is not a
// fallback the plate has.
const TEX_W = 4096;
const TEX_H = 128;
const FACE = '700 44px "JetBrains Mono", monospace';   // mono, and only mono
const TRACK = '3px';
const SYM_GAP = 18;      // symbol -> figure
const QUOTE_GAP = 46;    // figure -> next symbol, and the wrap gap (see below)

const surface = document.createElement('canvas');
surface.width = TEX_W;
surface.height = TEX_H;
const ctx2d = surface.getContext('2d');

// One pass over the tape, measured in the face it will actually be drawn in.
// The array is iterated generically and `q.symbol` is printed verbatim — the
// snapshot carries VIXY, not VIX (VIX proved unobtainable and a real VIXY quote
// was substituted and labelled honestly), and a hardcoded symbol list would
// quietly reintroduce the fiction.
function measureCycle(quotes) {
  ctx2d.setTransform(1, 0, 0, 1, 0, 0);
  ctx2d.font = FACE;
  ctx2d.letterSpacing = TRACK;
  const runs = [];
  let cycle = 0;
  for (const q of quotes) {
    const up = q.change >= 0;
    const figure = `${q.last.toFixed(2)} ${up ? '+' : ''}${q.changePercent.toFixed(2)}%`;
    const symW = ctx2d.measureText(q.symbol).width;
    const figW = ctx2d.measureText(figure).width;
    runs.push({ symbol: q.symbol, figure, up, at: cycle, symW });
    cycle += symW + SYM_GAP + figW + QUOTE_GAP;
  }
  // `cycle` ends on a QUOTE_GAP, so the gap is inside the repeating unit.
  return { runs, cycle };
}

// ── Bounding the wrap seam ───────────────────────────────────────────────
// The brief's draft filled the sheet by pushing 24 quotes at a fixed 24px start
// and letting the ink run off the right edge. That is Lab 02's wrap-seam bug in
// a new medium: the seam then falls in the middle of whichever run happened to
// straddle x = TEX_W, so the scrolling ribbon shows `QQ 684.` butted against
// `SPY` — a symbol and a price that do not exist, fabricated by the texture
// wrap rather than by the data.
//
// The fix is structural rather than a nudge: fit a WHOLE number of cycles into
// the sheet and scale x so the last one terminates exactly on the right edge.
// The painted content is then perfectly tileable, so for every offset the seam
// lands inside an inter-quote gap and can never bisect a symbol, a price or a
// percentage. Horizontal scale lands within ~2% of 1, which is invisible.
function paintTape(quotes) {
  const { runs, cycle } = measureCycle(quotes);
  const cycles = Math.max(1, Math.round(TEX_W / cycle));
  const scaleX = TEX_W / (cycles * cycle);

  ctx2d.setTransform(1, 0, 0, 1, 0, 0);
  ctx2d.fillStyle = '#0d0d0b';                    // --oo-console-pane
  ctx2d.fillRect(0, 0, TEX_W, TEX_H);
  // Tape hardware: the two rules that make this read as a strip of machine
  // output rather than as text floating on a dark band. Amber, because the
  // quotation's own register is Console — see tokens.css .oo-register-quote.
  ctx2d.fillStyle = '#9b6822';                    // --oo-amber-line
  ctx2d.fillRect(0, 5, TEX_W, 2);
  ctx2d.fillRect(0, TEX_H - 7, TEX_W, 2);

  ctx2d.setTransform(scaleX, 0, 0, 1, 0, 0);
  ctx2d.font = FACE;
  ctx2d.letterSpacing = TRACK;
  ctx2d.textBaseline = 'middle';
  for (let c = 0; c < cycles; c += 1) {
    for (const run of runs) {
      const x = c * cycle + run.at;
      ctx2d.fillStyle = '#eee8df';                              // --oo-fg
      ctx2d.fillText(run.symbol, x, TEX_H / 2);
      ctx2d.fillStyle = run.up ? '#48dc7d' : '#e0455a';         // green / red
      ctx2d.fillText(run.figure, x + run.symW + SYM_GAP, TEX_H / 2);
    }
  }
  ctx2d.setTransform(1, 0, 0, 1, 0, 0);
}

// ── The two ribbons ──────────────────────────────────────────────────────
// Same tape, two authored sweeps. Composition gate (e): a narrow plate has to
// RE-CENTRE the aim, not merely dolly — but a 30-unit-wide shallow sweep cannot
// be re-centred into a 1:1 frame without either cropping quotes off both ends
// or shrinking the tape under reading size. So the shape changes with the
// aspect and the solver re-centres whichever shape is live. Snapped, not
// interpolated: the two sweeps have different depth ranges and lerping them
// would pass the band through the camera.
//
// WIDE — a long shallow rise across a ~3.3:1 band.
// NARROW — a short steep descent, y-dominant, so a near-square frame is filled
// by the ribbon's own travel rather than by dollying in.
//
// ── Depth range is a legibility budget, not a style choice ──
// A first pass ran the sweep from z = 6 to z = -17. fitDistance has to contain
// the near end, which perspective magnifies, so it dollied the eye back until
// the far half of the tape was 4px per glyph — a grey smear where prices are
// supposed to be. Gate (g): cropping is fine when what remains is legible;
// shrinking glyphs under readability is not. So the depth range is shallow on
// both plates (near:far magnification ~1.8x, not ~3x), and `repeat` — how many
// tape cycles are wrapped along the band — is authored per layout instead. The
// narrow plate shows about two and a half quotes at readable size rather than
// all seven illegibly.
const LAYOUTS = {
  wide: {
    aspectFloor: 1.6,
    aimZ: -2.4,
    halfWidth: 0.80,
    twist: 1.4,
    repeat: 1.0,
    spine: [[-17, -4.4, 1.4], [-6, 1.0, -1.2], [6, -0.8, -3.8], [17, 4.8, -6.2]],
  },
  narrow: {
    aspectFloor: 0,
    aimZ: -1.8,
    halfWidth: 1.0,
    twist: 0.8,
    repeat: 0.22,
    spine: [[-3.9, 5.6, 0.6], [-1.8, 1.6, -0.8], [1.4, -1.4, -2.4], [3.9, -5.6, -4.2]],
  },
};

const SEGMENTS = 220;
const FOV = 46;
const HALF_TAN = Math.tan((FOV * Math.PI) / 360);
// Short of 1 on both axes so the pointer drift below cannot swing the band's
// MIDDLE — the part the fit is responsible for — against an edge. The two ends
// are outside the fit by design; see FIT_TRIM.
const FILL_X = 0.94;
const FILL_Y = 0.86;
const FEED = 0.085;      // texture cycles per second; linear, no easing
// Share of the band's length at each end held OUT of the framing fit, so the
// tape runs off the viewport instead of terminating inside it. See buildBand.
const FIT_TRIM = 0.07;

// Sweep the spline into a flat band.
//
// ── Why not computeFrenetFrames ──
// The brief's draft took the band's width direction from the curve's Frenet
// normal. That is fine for the wide sweep, which has real curvature, and it is
// degenerate for the narrow one, which is very nearly a straight line: with
// curvature near zero three.js has to seed the frame off an arbitrary axis, and
// it picked one pointing down the view axis. The narrow plate rendered the tape
// EDGE-ON — a 6px thread where a readable band should be, which is a legibility
// failure dressed up as a geometry choice.
//
// So the width direction is derived instead: cross(tangent, view axis) is
// perpendicular to the tangent AND to the line of sight, which is exactly the
// orientation that presents the widest band at every point of any curve,
// straight ones included. The twist then rotates that frame about the tangent so
// the ribbon still turns its face through the sweep — bounded at ±0.5 rad, well
// short of the 90° that would turn the tape edge-on again.
function buildBand(THREE, layout, texture) {
  const viewAxis = new THREE.Vector3(0, 0, 1);
  const curve = new THREE.CatmullRomCurve3(
    layout.spine.map(([x, y, z]) => new THREE.Vector3(x, y, z))
  );
  const positions = [];
  const uvs = [];
  const fitPoints = [];

  for (let i = 0; i <= SEGMENTS; i += 1) {
    const t = i / SEGMENTS;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const twist = Math.sin(t * Math.PI * layout.twist) * 0.5;
    const offset = new THREE.Vector3()
      .crossVectors(tangent, viewAxis)
      .normalize()
      .applyAxisAngle(tangent, twist)
      .multiplyScalar(layout.halfWidth);

    positions.push(
      point.x - offset.x, point.y - offset.y, point.z - offset.z,
      point.x + offset.x, point.y + offset.y, point.z + offset.z
    );
    // v runs 1 -> 0 across the band, not 0 -> 1. CanvasTexture ships
    // flipY = true, so the naive (t,0)/(t,1) pair lands the sheet upside down
    // on the mesh: the first build rendered every price vertically mirrored —
    // decimal points sitting at cap height, `DIA` reading as `DIV`. A mirrored
    // price is a fabricated price, which is the one thing the tape may not do.
    uvs.push(t, 1, t, 0);
    // Every eighth rib is enough to bound the silhouette for the framing solve
    // and keeps the per-frame fit cheap.
    //
    // The outer FIT_TRIM of each end is deliberately NOT offered to the fit, so
    // the solver frames the band's middle and lets its ends run off the edges of
    // the viewport. This is the geometric sibling of the wrap-seam bound above:
    // the tape scrolls under a band that is fixed in world space, so whatever
    // the band's ends happen to be cutting through changes every frame, and a
    // framed end guillotines a live quote — the first pass showed
    // `291.17 -0.31%` with its IWM sheared off, a price with no symbol. Running
    // the ends past the frame instead is what a real tape does: quotes enter and
    // leave, and nothing on screen is ever a severed figure.
    if ((i % 8 === 0 || i === SEGMENTS) && t > FIT_TRIM && t < 1 - FIT_TRIM) {
      fitPoints.push(
        [point.x - offset.x, point.y - offset.y, point.z - offset.z],
        [point.x + offset.x, point.y + offset.y, point.z + offset.z]
      );
    }
  }

  const indices = [];
  for (let i = 0; i < SEGMENTS; i += 1) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // Opaque on purpose. A twisting DoubleSide band with transparency sorts its
  // own front and back faces against each other and flickers; the ribbon is
  // pushed back by fog and by the CSS scrim over the viewport instead, which is
  // where the register balance belongs anyway.
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    toneMapped: false,
  }));
  // Only one object in the scene, so nothing shares an axis with anything and
  // the depth test is left alone — no depthTest:false / renderOrder needed here.
  return { mesh, fitPoints };
}

// ── Framing ──────────────────────────────────────────────────────────────
// The camera sits on the +z axis through the aim point, so each sampled rib
// projects in closed form and the fit is exact rather than a dolly table.
// Bisection because the binding point moves with distance: near ribs shrink
// faster than far ones.
function fitDistance(points, aim, aspect) {
  const fits = (d) => {
    const cz = aim[2] + d;
    for (const [x, y, z] of points) {
      const viewZ = cz - z;
      if (viewZ < 0.6) return false;
      const halfH = viewZ * HALF_TAN;
      if (Math.abs(y - aim[1]) > halfH * FILL_Y) return false;
      if (Math.abs(x - aim[0]) > halfH * aspect * FILL_X) return false;
    }
    return true;
  };
  let lo = 2;
  let hi = 120;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

// Where the fitted band actually lands in NDC, and how far off centre it is.
function measure(points, aimX, aimY, cz, aspect) {
  let xlo = Infinity, xhi = -Infinity, ylo = Infinity, yhi = -Infinity, invSum = 0;
  for (const [x, y, z] of points) {
    const inv = 1 / Math.max(0.6, cz - z) / HALF_TAN;
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
    meanInv: invSum / points.length,
  };
}

// Containment is not composition: dollying until the single binding extreme
// clears an edge leaves the opposite side of that axis empty. So the aim is
// re-centred against the measured projection and the fit re-run, until both
// settle. This is the lookAt actually moving between aspects — gate (e).
function solveFraming(points, aimZ, aspect) {
  let aimX = 0;
  let aimY = 0;
  let distance = 24;
  for (let pass = 0; pass < 4; pass += 1) {
    distance = fitDistance(points, [aimX, aimY, aimZ], aspect);
    if (pass === 3) break;
    const m = measure(points, aimX, aimY, aimZ + distance, aspect);
    aimX += (m.centreX * aspect) / m.meanInv;
    aimY += m.centreY / m.meanInv;
  }
  return { distance, aimX, aimY };
}

const bands = {};        // layout key -> { mesh, fitPoints }
let tapeTexture = null;
let activeKey = 'wide';

function buildRibbon(ctx) {
  const { THREE, scene } = ctx;

  paintTape(ctx.data.tape);
  tapeTexture = new THREE.CanvasTexture(surface);
  tapeTexture.colorSpace = THREE.SRGBColorSpace;
  tapeTexture.wrapS = THREE.RepeatWrapping;
  tapeTexture.wrapT = THREE.ClampToEdgeWrapping;
  // repeat.x is set per layout in update(). Any value works, fractional
  // included: paintTape leaves the sheet holding a whole number of cycles, so
  // the wrapped sheet is a seamless infinite tape and every window onto it is a
  // contiguous slice of one.
  tapeTexture.repeat.set(LAYOUTS.wide.repeat, 1);
  tapeTexture.minFilter = THREE.LinearFilter;
  tapeTexture.generateMipmaps = false;

  // Webfonts can land after this module runs, in which case the sheet above was
  // painted in the fallback monospace. measureCycle re-measures in whatever
  // face is live, so a repaint restores both the metrics and the seam bound.
  document.fonts?.ready?.then(() => {
    paintTape(ctx.data.tape);
    tapeTexture.needsUpdate = true;
  });

  for (const [key, layout] of Object.entries(LAYOUTS)) {
    const band = buildBand(THREE, layout, tapeTexture);
    band.mesh.name = `ribbon-${key}`;
    band.mesh.visible = key === activeKey;
    scene.add(band.mesh);
    bands[key] = band;
  }
}

function updateRibbon(ctx, dt) {
  const { camera, pointer } = ctx;

  const key = camera.aspect >= LAYOUTS.wide.aspectFloor ? 'wide' : 'narrow';
  if (key !== activeKey) {
    bands[activeKey].mesh.visible = false;
    bands[key].mesh.visible = true;
    activeKey = key;
    tapeTexture.repeat.x = LAYOUTS[key].repeat;
  }
  const layout = LAYOUTS[key];

  // Linear feed, right to left. INCREASING offset is what moves the ink toward
  // the ribbon's origin: a feature at texture coordinate T renders where
  // u = (T - offset) / repeat, so u falls as offset rises. The brief's draft
  // decremented it, which ran the tape backwards — every real tape runs the
  // other way, so the sign is corrected here rather than copied.
  tapeTexture.offset.x = (tapeTexture.offset.x + dt * FEED) % 1;

  const framing = solveFraming(bands[key].fitPoints, layout.aimZ, camera.aspect);
  camera.position.set(
    framing.aimX + pointer.x * 0.7,
    framing.aimY + pointer.y * 0.35,
    layout.aimZ + framing.distance,
  );
  // The shell aims the camera once at init and never re-aims. Mutating
  // camera.position without this leaves the rotation stale.
  camera.lookAt(framing.aimX, framing.aimY, layout.aimZ);
}

createLab({
  data,
  clearColor: 'broadcastStage',
  // Enough atmosphere to seat the far end of the ribbon back into the plate —
  // part of how the quotation stays behind the voice — without greying out the
  // figures at the near end, which are the reason the tape is legible at all.
  fogDensity: 0.014,
  pointer: true,
  camera: {
    fov: FOV,
    position: [0, 0, LAYOUTS.wide.aimZ + 22],
    lookAt: [0, 0, LAYOUTS.wide.aimZ],
  },
  build: buildRibbon,
  update: updateRibbon,
});
