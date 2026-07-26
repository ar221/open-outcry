// Lab 02 — Candle Field (Console). First consumer of lab-shell.js.
// 90 real daily SPY bars extruded as bodies receding along a time axis.
// three.js arrives as a global from vendor/three.iife.js — never imported here.

import { createLab, makeLine, makeTextSprite } from './lab-shell.js';

const SNAPSHOT = 'data/market-2026-07-26.json';

const response = await fetch(SNAPSHOT);
const data = await response.json();

const SPACING = 0.72;
const START_Z = 16;
const SPAN = 90 * SPACING;

// Camera x is authored, not zeroed. The shell aims once at init from
// config.camera.position; update() then owns camera.position.x, so the base
// offset has to be restated here or the plate collapses to a dead-on axial
// view down the corridor and the field reads as one stacked column.
const CAMERA_X = 8.4;
const CAMERA_POS = [CAMERA_X, 5.4, 8.0];
// Portrait viewports crop the corridor horizontally, so the plate dollies in
// and drops its shoulder rather than shrinking the desktop scene.
const NARROW = { x: 5.4, y: 4.3, z: 2.6, fov: 60 };
const LOOK_AT = [0.4, 1.0, -26];
const LABEL_Z = -7.0;
const DRIFT = 0.8;
const BASE_FOV = 54;
const RAIL_NEAR_Z = 0.6;
const mix = (a, b, t) => a + (b - a) * t;

function buildCandles(ctx) {
  const { THREE, scene, palette, data } = ctx;
  const bars = data.bars.series;

  const lo = Math.min(...bars.map(b => b.low));
  const hi = Math.max(...bars.map(b => b.high));
  const toY = v => THREE.MathUtils.mapLinear(v, lo, hi, -6.0, 6.0);

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
  scene.add(field);

  // One amber price rail at the latest close — the plate's single annotation.
  // It lives outside `field`, so it holds still in price space while time pans.
  const last = bars[bars.length - 1];
  const railY = toY(last.close);
  const rail = new THREE.Group();
  // Both endpoints must sit IN FRONT of the camera. A line segment whose near
  // vertex is behind the camera plane is dropped outright here rather than
  // near-plane clipped, and the rail silently never draws.
  // depthTest off: the rail shares x=0 with the bodies, so a depth-tested line
  // is buried inside the column it is supposed to annotate.
  const railLine = makeLine(THREE, [
    new THREE.Vector3(0, railY, RAIL_NEAR_Z),
    new THREE.Vector3(0, railY, START_Z - 2 * SPAN),
  ], palette.amber, 0.7);
  railLine.material.depthTest = false;
  railLine.material.fog = false;
  railLine.renderOrder = 2;
  rail.add(railLine);
  const label = makeTextSprite(THREE, `CLOSE ${last.close.toFixed(2)}`, '#f2a51f', 1.25);
  label.position.set(7.2, railY - 3.4, LABEL_Z);
  rail.add(label);
  scene.add(rail);

  const dateLabel = makeTextSprite(THREE, last.date, '#686564', 0.95);
  dateLabel.position.set(7.2, railY - 4.15, LABEL_Z);
  scene.add(dateLabel);
}

let panned = 0;

function updateField(ctx, dt) {
  const { scene, camera, pointer } = ctx;
  const field = scene.getObjectByName('field');
  panned = (panned + dt * 1.6) % SPAN;   // linear pan along the time axis
  field.position.z = panned;

  // The shell owns resize and exposes no hook, so aspect compensation lives
  // here. Both endpoints of the rail stay ahead of RAIL_NEAR_Z through the
  // whole dolly range — a line vertex behind the camera drops the segment.
  const t = Math.min(1, Math.max(0, (1.35 - camera.aspect) / 0.55));
  camera.position.x = mix(CAMERA_X, NARROW.x, t) + pointer.x * DRIFT;
  camera.position.y = mix(CAMERA_POS[1], NARROW.y, t);
  camera.position.z = mix(CAMERA_POS[2], NARROW.z, t);
  const fov = mix(BASE_FOV, NARROW.fov, t);
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  // The shell aims the camera once at init and never re-aims. Mutating
  // camera.position without this leaves the rotation stale.
  camera.lookAt(...LOOK_AT);
}

createLab({
  data,
  clearColor: 'consoleStage',
  fogDensity: 0.0145,
  pointer: true,
  camera: { fov: BASE_FOV, position: CAMERA_POS, lookAt: LOOK_AT },
  build: buildCandles,
  update: updateField,
});
