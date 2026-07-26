// Lab 03 — CRT Volume (Console). Second consumer of lab-shell.js.
// The console voice made physical: a barrel-warped phosphor slab carrying a
// canvas texture of real local `git log --oneline -8` output.
// three.js arrives as a global from vendor/three.iife.js — never imported here.

import { createLab } from './lab-shell.js';

// ── Content ──────────────────────────────────────────────────────────────
// Captured verbatim on 2026-07-26 from this repo, branch labs-02-05:
//   git log --oneline -8
// Nothing on the slab is invented. If the history moves, this array is stale
// until it is re-captured — it is a dated snapshot, exactly like Lab 02's bars.
const LINES = [
  '> git log --oneline -8',
  'c65292d experiments: re-frame Candle Field so the live plate holds the first read',
  '19c8322 experiments: add Candle Field — WebGL Lab 02 (Console)',
  '87c39c1 experiments: document stale-lookAt trap in lab-shell.js',
  '50d6f06 experiments: extract lab-shell.js harness from Lab 01',
  '8122e1b experiments: bake dated Alpha Vantage snapshot for Labs 02 and 05',
  '6d12f68 experiments: add shared Three.js IIFE runtime for Labs 02-05',
  '8084321 experiments: add verify-lab.sh — repeatable lab verification',
  '12fe872 experiments: implementation plan for WebGL Labs 02-05',
];

// ── Texture ──────────────────────────────────────────────────────────────
// The plan's 1024×640 sheet was sized for a 68-column terminal. The real log
// runs to 81 columns (the Candle Field re-frame subject), so 1024 clipped the
// longest line and 640 left the bottom 45% of the sheet empty — wasted texel
// budget on a lab whose entire subject is legible text. The sheet is sized to
// the content instead: wide enough for 81 columns at 24px, tall enough for
// exactly nine lines plus an idle prompt row, and no taller. Sheet aspect and
// slab aspect are equal (2.667), so glyphs are never stretched.
const TEX_W = 1280;
const TEX_H = 480;
const PAD_X = 40;
const TOP = 34;
const PITCH = 46;
const GLYPH = 24;

const AMBER = '#f2a51f';   // --oo-amber
const FG = '#eee8df';      // --oo-fg
const STAGE = '#070807';   // --oo-console-stage

const surface = document.createElement('canvas');
surface.width = TEX_W;
surface.height = TEX_H;
const ctx2d = surface.getContext('2d');

const TOTAL_CHARS = LINES.join('').length;

let typed = TOTAL_CHARS;   // characters revealed so far
let holdClock = 0;
let blinkOn = true;
let blinkClock = 0;
let painted = -1;          // last painted char count, so the sheet is not re-uploaded per frame
let paintedBlink = null;

function paintTexture() {
  ctx2d.fillStyle = STAGE;
  ctx2d.fillRect(0, 0, TEX_W, TEX_H);

  ctx2d.font = `400 ${GLYPH}px "JetBrains Mono", monospace`;
  ctx2d.textBaseline = 'top';
  // Phosphor bleed, drawn into the sheet with the glyph. This is a canvas 2D
  // shadow on the text itself, not a post-processing bloom pass over the
  // frame — there is no render target stack in this lab.
  ctx2d.shadowBlur = 6;

  let remaining = Math.floor(typed);
  let y = TOP;
  let cursorX = PAD_X;
  let cursorY = TOP;

  for (const line of LINES) {
    if (remaining <= 0) break;
    const shown = line.slice(0, remaining);
    remaining -= line.length;
    const color = line.startsWith('>') ? AMBER : FG;
    ctx2d.fillStyle = color;
    ctx2d.shadowColor = color;
    ctx2d.fillText(shown, PAD_X, y);
    cursorX = PAD_X + ctx2d.measureText(shown).width + 5;
    cursorY = y;
    y += PITCH;
  }

  // Fully printed: the cursor drops to the idle prompt row under the output,
  // which is where a real shell leaves it. Mid-reveal it trails the last glyph.
  if (typed >= TOTAL_CHARS) {
    cursorX = PAD_X;
    cursorY = y;
  }

  if (blinkOn) {
    ctx2d.fillStyle = AMBER;
    ctx2d.shadowColor = AMBER;
    ctx2d.fillRect(cursorX, cursorY + 2, 13, GLYPH + 2);   // ▌ cursor block
  }
  ctx2d.shadowBlur = 0;

  // Scanlines drawn into the texture so they curve with the surface instead of
  // sitting flat in CSS over a curved object. 0.18 rather than 0.22: at this
  // sheet scale the darker value eats a visible slice of the 24px glyphs.
  ctx2d.fillStyle = 'rgba(0,0,0,0.18)';
  for (let sy = 0; sy < TEX_H; sy += 3) ctx2d.fillRect(0, sy, TEX_W, 1);
}

// ── Geometry ─────────────────────────────────────────────────────────────
const SLAB_W = 16;
const SLAB_H = 6;
// Barrel displacement: metres of forward bulge at the centre of the slab.
// Settled by reading the 1440×900 and 390×844 verify plates, not by taste.
// The plan's 1.15 was written for a 10-unit-tall slab; this one is 6 tall, so
// the same number is a much tighter tube. Read at 0.7 first — legible, but the
// curve barely registered and the plate lost to its own flat fallback on
// presence. 1.0 is where the bow is unmistakable (centre rows sit proud, the
// outer rows fall away and lean) and all nine lines still resolve at both
// aspects. Above this the top and bottom rows start to smear.
const BARREL = 1.0;

const FOV = 38;
const HALF_TAN = Math.tan((FOV * Math.PI) / 360);

// ── Framing ──────────────────────────────────────────────────────────────
// Height always fills: the camera sits at the one distance that holds FRAME_H
// world units vertically, at every aspect. Nothing dollies. What changes with
// aspect is the AIM.
//
// A 16×6 slab cannot fit a 0.77 portrait frame and stay readable — fitting it
// by width would push the camera back to ~2.8× this distance and shrink 24px
// glyphs to about 6px on a 390px plate, which fails the lab's own premise.
// So the narrow plate crops instead of retreating: the frame is pinned to the
// LEFT bezel edge and the rest of the slab runs off the right, which is what
// standing close to a wide tube actually looks like. LOOK_AT moves with it —
// dollying alone would leave the subject off-centre, which is the failure Lab
// 02 was reviewed for.
const FRAME_H = 7.8;                       // bezel is 6.8 tall; 0.5 of margin each side
const DIST = FRAME_H / (2 * HALF_TAN);
const LEFT_EDGE = -(SLAB_W / 2 + 0.45);    // just outside the bezel's left rail
const DRIFT_X = 0.42;
const DRIFT_Y = 0.26;

const TYPE_RATE = 240;   // chars/sec — a fast terminal, not a typewriter
const HOLD_S = 9;        // seconds the finished log holds before it clears

function buildSlab(ctx) {
  const { THREE, scene, palette } = ctx;

  paintTexture();
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  // Barrel-warped plane: displace vertices toward the viewer at the centre.
  // Displacement is geometry — vertices, computed once at build — not a screen
  // -space distortion pass.
  const geometry = new THREE.PlaneGeometry(SLAB_W, SLAB_H, 64, 28);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i) / (SLAB_W / 2);
    const y = pos.getY(i) / (SLAB_H / 2);
    pos.setZ(i, (1 - x * x) * (1 - y * y) * BARREL);
  }
  geometry.computeVertexNormals();

  const slab = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
  );
  slab.name = 'slab';
  slab.userData.texture = texture;
  scene.add(slab);

  // Amber bezel: square hardware framing the phosphor. Depth-tested off and
  // ordered above the slab — the box straddles the bulge, so a depth-tested
  // front rail is swallowed by the very surface it is meant to frame. Same
  // failure mode as Lab 02's price rail, same fix.
  const bezel = new THREE.LineSegments(
    // 2.4 deep read as an open crate: at this camera distance the near rails
    // splayed a long way past the far ones and the diagonals cut across the
    // top and bottom log lines. 1.0 keeps the housing legible as a housing.
    new THREE.EdgesGeometry(new THREE.BoxGeometry(SLAB_W + 0.8, SLAB_H + 0.8, 1.0)),
    new THREE.LineBasicMaterial({
      color: palette.amberLine, transparent: true, opacity: 0.55, depthTest: false,
    })
  );
  bezel.position.z = -0.15;
  bezel.renderOrder = 2;
  scene.add(bezel);
}

function updateSlab(ctx, dt) {
  const { scene, camera, pointer } = ctx;
  const slab = scene.getObjectByName('slab');

  // The reveal starts FINISHED and holds. A terminal that has already run its
  // command is the resting state; the retype is the flourish, not the subject.
  // Starting at zero would also mean every screenshot of this lab — including
  // the verify plate — catches a mostly empty slab.
  if (typed >= TOTAL_CHARS) {
    holdClock += dt;
    if (holdClock >= HOLD_S) {
      holdClock = 0;
      typed = 0;
    }
  } else {
    typed = Math.min(TOTAL_CHARS, typed + dt * TYPE_RATE);   // steps-style reveal
  }

  blinkClock += dt * 1000;
  if (blinkClock >= 950) { blinkOn = !blinkOn; blinkClock = 0; }   // §6.1 cursor

  const chars = Math.floor(typed);
  if (chars !== painted || blinkOn !== paintedBlink) {
    paintTexture();
    slab.userData.texture.needsUpdate = true;
    painted = chars;
    paintedBlink = blinkOn;
  }

  // Aspect compensation. The shell owns resize and exposes no hook, so it
  // lives here. `aimX` is 0 whenever the whole slab fits the frame width and
  // slides left as the plate narrows, pinning the left bezel rail to the frame
  // edge. Continuous in aspect — no step, no snap.
  const frameW = FRAME_H * camera.aspect;
  const aimX = Math.min(0, LEFT_EDGE + frameW / 2);

  camera.position.set(aimX + pointer.x * DRIFT_X, pointer.y * DRIFT_Y, DIST);
  // The shell aims the camera once at init and never re-aims. Mutating
  // camera.position without this leaves the rotation stale.
  camera.lookAt(aimX, 0, 0);
}

createLab({
  clearColor: 'consoleStage',
  fogDensity: 0.012,
  pointer: true,
  camera: { fov: FOV, position: [0, 0, DIST], lookAt: [0, 0, 0] },
  build: buildSlab,
  update: updateSlab,
});
