// Lab 02 — Candle Field (Console). First consumer of lab-shell.js.
// 90 real daily SPY bars extruded as bodies receding along a time axis.
// three.js arrives as a global from vendor/three.iife.js — never imported here.

import { createLab, makeLine, makeTextSprite } from './lab-shell.js';

const SNAPSHOT = 'data/market-2026-07-26.json';

// Guarded, because everything below this point is derived from the snapshot at
// module scope. Unguarded, a missing or renamed file rejects the module, so
// createLab() never runs, [data-lab-static] stays `hidden`, and the plate is
// blank — with `?render=fallback` unreachable in exactly the state that needs
// it. Instead: route through the shell's one fallback path first, then rethrow
// to abort the rest of this module. The console error is the diagnostic; the
// plate the reader gets is the complete static composition.
let data;
try {
  const response = await fetch(SNAPSHOT);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${SNAPSHOT}`);
  data = await response.json();
} catch (error) {
  console.error(`Candle Field: snapshot ${SNAPSHOT} unavailable.`, error);
  createLab({ fallbackReason: 'snapshot unavailable' });
  throw error;
}

const BARS = data.bars.series;
const SPACING = 0.72;
const START_Z = 16;
const SPAN = BARS.length * SPACING;
const PRICE_HALF = 5.8;

// ── Framing ──────────────────────────────────────────────────────────────
// The field is read near-side-on, not down its own corridor. Aiming along the
// time axis makes 90 bars converge to a vanishing point: the mass collapses
// into a diagonal smear that occupies a quarter of the frame and leaves the
// rest void. A 17° yaw off the price plane keeps the extruded box faces
// visible — the whole reason these are solids and not sprites — while holding
// the depth spread across the frame small enough that near bars never blow
// past the top and bottom edges. Time runs left (history) to right (newest),
// which is also the reading order of the static fallback.
const YAW = (17 * Math.PI) / 180;
const TARGET_Z = -16;
const FOV = 40;

// The camera ORBITS a fixed target rather than moving to authored absolute
// positions. Aspect compensation that moves the eye without moving the aim
// rotates the subject off-centre — that was the phone failure. Radius and eye
// height are the only spatial knobs, and the aim is recomputed from the same
// numbers, so the subject is centred by construction at every aspect.
//
// `win` is the bar count each aspect actually shows, which is what the price
// axis is scaled and aimed against below. `fill` is the share of frame height
// the visible window is scaled to occupy — measured in NDC off the built
// scene, not guessed, and lower on the wide plate because a 2.38:1 frame gives
// the near end of the tape more room to magnify into.
// `bias` trims the residual off-centring measured in NDC across a full pan
// cycle: perspective magnifies the near end of the tape away from the aim
// point and that magnification is not symmetric about the window mid, so the
// geometric aim alone leaves the mass a few percent off centre.
const WIDE = { radius: 16.6, height: 2.6, win: 40, fill: 0.72, bias: -0.02 };
const NARROW = { radius: 13.0, height: 2.0, win: 10, fill: 0.82, bias: -0.03 };
const LABEL_Z = TARGET_Z + 2.2;
const DRIFT = 0.8;
const mix = (a, b, t) => a + (b - a) * t;

// Eye position for a given orbit radius. Exported shape matches what the
// shell wants at init; update() re-derives it every frame from live aspect.
const eye = (radius, height) => [
  -radius * Math.cos(YAW),
  height,
  TARGET_Z + radius * Math.sin(YAW),
];
// Price mapping lives at module scope because the aim tables below are derived
// from it, not just the geometry.
const LO = Math.min(...BARS.map(b => b.low));
const HI = Math.max(...BARS.map(b => b.high));
const toY = v => ((v - LO) / (HI - LO)) * 2 * PRICE_HALF - PRICE_HALF;

// What is actually on screen, per bar index: the mid and the extent of the
// window centred on that bar, both in price-space y.
//
// This exists because a sliding window over a trending series is neither
// centred on nor proportional to the series as a whole. These 90 SPY sessions
// run +10.16% with a sharp March low, so window extents are bimodal — a window
// is either ~33% or ~95% of the full 131.12-point range, nothing between. A
// fixed aim and a fixed price scale therefore leave the plate correct for a
// couple of pan phases and two-thirds empty for the rest, which is the void
// the review flagged. Aim and scale both read off these tables instead, so the
// frame holds the bars the way a chart pane holds them. Every value is
// measured from the real bars; the mapping changes, no figure does.
//
// Measured mostly on BODIES rather than on high/low. Wicks are one-pixel
// lines; scaling the plate to fit them leaves the solid mass that carries the
// first read sitting well inside the frame with dead space under it. Scaling
// purely on bodies goes the other way and runs a lone deep wick off the bottom
// edge. WICK_WEIGHT is the settled blend, checked in NDC across a full pan
// cycle at both aspects.
const WICK_WEIGHT = 0.3;
function windowTable(width) {
  const half = width / 2;
  return BARS.map((_, i) => {
    let lo = Infinity;
    let hi = -Infinity;
    let wickLo = Infinity;
    let wickHi = -Infinity;
    for (let k = Math.ceil(i - half); k <= Math.floor(i + half); k += 1) {
      const bar = BARS[((k % BARS.length) + BARS.length) % BARS.length];
      lo = Math.min(lo, bar.open, bar.close);
      hi = Math.max(hi, bar.open, bar.close);
      wickLo = Math.min(wickLo, bar.low);
      wickHi = Math.max(wickHi, bar.high);
    }
    const top = mix(hi, wickHi, WICK_WEIGHT);
    const bottom = mix(lo, wickLo, WICK_WEIGHT);
    return { mid: toY((top + bottom) / 2), extent: toY(top) - toY(bottom) };
  });
}
const WINDOW = { wide: windowTable(WIDE.win), narrow: windowTable(NARROW.win) };

// Linear interpolation between adjacent table entries, so aim and scale are
// piecewise-linear and continuous rather than stepping as bars cross the edge.
function sampleWindow(table, index) {
  const i = Math.floor(index) % BARS.length;
  const j = (i + 1) % BARS.length;
  const f = index - Math.floor(index);
  return {
    mid: mix(table[i].mid, table[j].mid, f),
    extent: mix(table[i].extent, table[j].extent, f),
  };
}

// Guard rails on the auto-scale, so a freak window can never flatten the tape
// into a line or blow it off both edges at once.
const SCALE_LIMITS = [0.85, 5.2];
const frameHeight = radius => 2 * radius * Math.tan((FOV * Math.PI) / 360);

// Seed pose for the shell's one-shot lookAt. update() runs before the first
// render and overwrites all of it; this only has to be in the right postcode.
const CAMERA_POS = eye(WIDE.radius, WIDE.height + WINDOW.wide[45].mid);
const LOOK_AT = [0, WINDOW.wide[45].mid, TARGET_Z];

// Price-space y of the last close, filled in at build and read by update() to
// re-seat the caption on the scaled rail.
let railY = 0;

function buildCandles(ctx) {
  const { THREE, scene, palette, data } = ctx;
  const bars = data.bars.series;

  // Everything measured in price sits under `plate`, whose y scale is the
  // portrait exaggeration. Field and rail have to share it or the rail stops
  // marking the close it is named after.
  const plate = new THREE.Group();
  plate.name = 'plate';
  scene.add(plate);

  const field = new THREE.Group();

  // Two copies, the second parked one SPAN deeper. The pan below is a single
  // group translate over [0, SPAN); with one copy the finite field slides
  // behind the camera for half the cycle and the corridor empties out. The
  // trailing copy is what makes a linear pan read as an endless tape.
  const pass = (bar, i, offset) => {
    const rising = bar.close >= bar.open;
    const color = rising ? palette.greenDeep : palette.red;
    // Newest session nearest the camera; history recedes into the fog.
    const z = START_Z - (bars.length - 1 - i) * SPACING - offset;

    const bodyTop = toY(Math.max(bar.open, bar.close));
    const bodyBottom = toY(Math.min(bar.open, bar.close));
    const height = Math.max(0.06, bodyTop - bodyBottom);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, height, 0.42),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.86 })
    );
    body.position.set(0, (bodyTop + bodyBottom) / 2, z);
    field.add(body);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(body.geometry),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
    );
    edges.position.copy(body.position);
    field.add(edges);

    field.add(makeLine(THREE, [
      new THREE.Vector3(0, toY(bar.low), z),
      new THREE.Vector3(0, toY(bar.high), z),
    ], color, 0.62));
  };

  bars.forEach((bar, i) => pass(bar, i, 0));
  bars.forEach((bar, i) => pass(bar, i, SPAN));

  field.name = 'field';
  plate.add(field);

  // One amber price rail at the latest close — the plate's single annotation.
  // It lives outside `field`, so it holds still in price space while time pans.
  const last = bars[bars.length - 1];
  railY = toY(last.close);
  // The rail spans the full two-copy field, so it reads as a price level cut
  // through the whole instrument rather than a stub.
  //
  // Why depthTest is off: the rail shares x = 0 with 0.42-wide bodies, so a
  // depth-tested line is buried *inside* the column it is supposed to
  // annotate — it draws, then loses the depth test to the box in front of it.
  // That, not near-plane behaviour, is the whole failure. gl.LINES primitives
  // are near-plane clipped like anything else: a segment straddling the near
  // plane draws its front portion, so no minimum-z guard is needed and none
  // is kept here. Labs 04/05 drawing long axial lines want depthTest:false +
  // renderOrder, and nothing else.
  const railLine = makeLine(THREE, [
    new THREE.Vector3(0, railY, START_Z),
    new THREE.Vector3(0, railY, START_Z - 2 * SPAN),
  ], palette.amber, 0.7);
  railLine.material.depthTest = false;
  // Deliberate depth-consistency exception: the rail is an annotation layer,
  // not a solid in the field, so it holds full amber along its whole run
  // instead of dimming into the fog with the bars it measures.
  railLine.material.fog = false;
  railLine.renderOrder = 2;
  plate.add(railLine);

  // Caption rides the rail rather than floating in a corner: same x = 0 plane,
  // parked just above the level it names, with the same depthTest escape so it
  // is never swallowed by a body passing through. It sits OUTSIDE `plate`,
  // because a y scale on a sprite's parent stretches the glyphs; update()
  // re-seats it on the scaled rail each frame instead.
  const caption = new THREE.Group();
  caption.name = 'caption';
  const label = makeTextSprite(THREE, `CLOSE ${last.close.toFixed(2)}`, '#f2a51f', 1.0);
  label.position.set(0, 1.35, LABEL_Z);
  label.material.depthTest = false;
  label.renderOrder = 3;
  caption.add(label);

  const dateLabel = makeTextSprite(THREE, last.date, '#686564', 0.8);
  dateLabel.position.set(0, 0.62, LABEL_Z);
  dateLabel.material.depthTest = false;
  dateLabel.renderOrder = 3;
  caption.add(dateLabel);

  scene.add(caption);
}

// ── Pan range ────────────────────────────────────────────────────────────
// The tape is 90 real sessions, not a periodic signal: bar 89 closes at 738.93
// and bar 0 opens near 670.79, so wherever the two copies butt together there
// is a 68-point discontinuity. The old corridor framing buried that junction in
// fog at the vanishing point. Side-on, it cannot be buried — it paints a false
// gap-down straight across the middle of the plate, with a dead band where the
// tape should be, for roughly 40% of a full wrap. So the pan no longer traverses
// a whole SPAN; it scans a window that keeps the junction off the right edge at
// both aspects. `field.position.z` stays in [PAN_MIN, PAN_MAX], across which the
// visible tape is the trailing copy and the leading copy holds the right margin
// — both copies are still load-bearing, and with only one the frame is empty.
// Direction flips at the ends: constant speed, instantaneous reversal, no easing.
const PAN_MIN = 53.0;
const PAN_MAX = 64.6;
const PAN_SPEED = 1.6;

let panned = PAN_MAX;
let panDir = -1;

function updateField(ctx, dt) {
  const { scene, camera, pointer } = ctx;
  const plate = scene.getObjectByName('plate');
  const field = scene.getObjectByName('field');
  const caption = scene.getObjectByName('caption');
  panned += dt * PAN_SPEED * panDir;      // linear scan along the time axis
  if (panned <= PAN_MIN) {
    panned = PAN_MIN;
    panDir = 1;
  } else if (panned >= PAN_MAX) {
    panned = PAN_MAX;
    panDir = -1;
  }
  // Falling z means bars travel screen-left and newer sessions sit to the right,
  // which is the reading order of the static fallback.
  field.position.z = panned;

  // The shell owns resize and exposes no hook, so aspect compensation lives
  // here. Radius, eye height, price scale and aim all interpolate off one t,
  // so the subject stays centred and frame-filling as the plate narrows
  // instead of sliding out of it.
  const t = Math.min(1, Math.max(0, (1.35 - camera.aspect) / 0.55));
  const radius = mix(WIDE.radius, NARROW.radius, t);

  // Which bar is at frame centre right now. field.position.z shifts the whole
  // tape, so the centre index falls straight out of the same arithmetic that
  // placed the bars; no per-frame search.
  const centre =
    (((BARS.length - 1 - (START_Z + field.position.z - TARGET_Z) / SPACING) % BARS.length) +
      BARS.length) % BARS.length;
  const wide = sampleWindow(WINDOW.wide, centre);
  const narrow = sampleWindow(WINDOW.narrow, centre);
  const mid = mix(wide.mid, narrow.mid, t);
  const extent = mix(wide.extent, narrow.extent, t);

  // Auto-scale the price axis so the visible window fills the frame at every
  // pan phase and every aspect. Field and rail share `plate`, so the rail keeps
  // marking the close it names.
  const fill = mix(WIDE.fill, NARROW.fill, t);
  const priceScale = Math.min(
    SCALE_LIMITS[1],
    Math.max(SCALE_LIMITS[0], (fill * frameHeight(radius)) / extent),
  );
  plate.scale.y = priceScale;

  const aim =
    mid * priceScale + (mix(WIDE.bias, NARROW.bias, t) * frameHeight(radius)) / 2;
  const [ex, ey, ez] = eye(radius, aim + mix(WIDE.height, NARROW.height, t));
  camera.position.set(ex + pointer.x * DRIFT, ey, ez);

  // The shell aims the camera once at init and never re-aims. Mutating
  // camera.position without this leaves the rotation stale.
  camera.lookAt(0, aim, TARGET_Z);

  caption.position.y = railY * priceScale;
}

createLab({
  data,
  clearColor: 'consoleStage',
  fogDensity: 0.0145,
  pointer: true,
  camera: { fov: FOV, position: CAMERA_POS, lookAt: LOOK_AT },
  build: buildCandles,
  update: updateField,
});
