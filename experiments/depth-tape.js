import * as THREE from './vendor/three.module.min.js';

const stage = document.getElementById('depth-stage');
const viewport = document.getElementById('depth-viewport');
const canvas = document.getElementById('depth-canvas');
const staticField = document.getElementById('depth-static');
const status = document.getElementById('render-status');
const control = document.getElementById('motion-control');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let renderer;
let scene;
let camera;
let tapeGroup;
let gridGroup;
let markerGroup;
let animationFrame = 0;
let resizeObserver;
let visible = true;
let pausedByUser = false;
let lastTime = 0;

const pointer = new THREE.Vector2(0, 0);
const targetPointer = new THREE.Vector2(0, 0);
const palette = {
  amber: new THREE.Color(0xf2a51f),
  amberDim: new THREE.Color(0xb57b24),
  amberLine: new THREE.Color(0x9b6822),
  peach: new THREE.Color(0xe8927c),
  green: new THREE.Color(0x48dc7d),
  red: new THREE.Color(0xe0455a),
  fog: new THREE.Color(0x070807),
};

function supportsWebGL() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (probe.getContext('webgl2') || probe.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

function setFallback(reason = 'static fallback') {
  stopLoop();
  stage.dataset.renderer = 'fallback';
  canvas.hidden = true;
  staticField.hidden = false;
  status.innerHTML = `renderer / <strong>${reason}</strong>`;
  control.hidden = true;
}

function setLive() {
  stage.dataset.renderer = 'webgl';
  canvas.hidden = false;
  staticField.hidden = true;
  status.innerHTML = 'renderer / <strong>webgl live</strong>';
  control.hidden = false;
}

function makeLine(points, color, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.Line(geometry, material);
}

function makeTextSprite(text, color, scale = 1) {
  const surface = document.createElement('canvas');
  surface.width = 512;
  surface.height = 64;
  const context = surface.getContext('2d');
  context.clearRect(0, 0, surface.width, surface.height);
  context.font = '700 23px "JetBrains Mono", monospace';
  context.letterSpacing = '2px';
  context.fillStyle = color;
  context.fillText(text, 8, 39);

  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.78, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.8 * scale, 0.6 * scale, 1);
  return sprite;
}

function buildPerspectiveGrid() {
  gridGroup = new THREE.Group();
  const nearZ = 12;
  const farZ = -64;
  const widthNear = 24;
  const widthFar = 4.2;

  for (let i = -5; i <= 5; i += 1) {
    const t = i / 5;
    gridGroup.add(makeLine([
      new THREE.Vector3(t * widthNear, -5.4, nearZ),
      new THREE.Vector3(t * widthFar, -1.2, farZ),
    ], palette.amberLine, i === 0 ? 0.48 : 0.25));
  }

  for (let z = nearZ; z >= farZ; z -= 4) {
    const depth = (nearZ - z) / (nearZ - farZ);
    const halfWidth = THREE.MathUtils.lerp(widthNear, widthFar, depth);
    const y = THREE.MathUtils.lerp(-5.4, -1.2, depth);
    gridGroup.add(makeLine([
      new THREE.Vector3(-halfWidth, y, z),
      new THREE.Vector3(halfWidth, y, z),
    ], palette.amberLine, THREE.MathUtils.lerp(0.36, 0.1, depth)));
  }
  scene.add(gridGroup);
}

function createTapeSegment({ z, lane, width, color, label, signal }) {
  const group = new THREE.Group();
  group.userData.baseZ = z;
  group.userData.speed = 2.25 + Math.abs(lane) * 0.08;

  const depth = 0.16;
  const geometry = new THREE.BoxGeometry(width, 0.12, depth);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82 });
  const slab = new THREE.Mesh(geometry, material);
  slab.position.set(lane * 3.3, -4.68, 0);
  group.add(slab);

  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  const edge = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }));
  edge.position.copy(slab.position);
  group.add(edge);

  if (signal) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ color: signal })
    );
    bulb.position.set(lane * 3.3 - width / 2 + 0.28, -4.45, 0);
    group.add(bulb);
  }

  const sprite = makeTextSprite(label, `#${color.getHexString()}`, 0.62);
  sprite.position.set(lane * 3.3 + 0.2, -4.22, 0);
  group.add(sprite);

  group.position.z = z;
  tapeGroup.add(group);
}

function buildTape() {
  tapeGroup = new THREE.Group();
  const labels = [
    ['BROADCAST / HUMAN VOICE', palette.peach, palette.peach],
    ['CONSOLE / MACHINE VOICE', palette.amber, palette.green],
    ['TAPE / LIVE SIGNAL', palette.amberDim, palette.amber],
    ['STATE / RISK BOUNDARY', palette.red, palette.red],
    ['DATA EARNS COLOR', palette.amber, palette.green],
    ['ONE INSTRUMENT', palette.peach, palette.peach],
  ];

  for (let i = 0; i < 22; i += 1) {
    const [label, color, signal] = labels[i % labels.length];
    createTapeSegment({
      z: 10 - i * 3.6,
      lane: (i % 3) - 1,
      width: 2.3 + (i % 4) * 0.42,
      color,
      label,
      signal,
    });
  }
  scene.add(tapeGroup);
}

function buildMarkers() {
  markerGroup = new THREE.Group();
  const markers = [
    { text: 'OPEN', x: -8.2, y: -1.2, z: -22, color: '#e8927c' },
    { text: 'OUTCRY', x: 4.8, y: -1.8, z: -36, color: '#f2a51f' },
    { text: 'LIVE DESK', x: -1.8, y: -2.35, z: -52, color: '#48dc7d' },
  ];
  for (const marker of markers) {
    const sprite = makeTextSprite(marker.text, marker.color, 0.8);
    sprite.position.set(marker.x, marker.y, marker.z);
    markerGroup.add(sprite);
  }
  scene.add(markerGroup);
}

function resize() {
  if (!renderer || !camera) return;
  const width = Math.max(1, viewport.clientWidth);
  const height = Math.max(1, viewport.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updateScene(delta) {
  pointer.lerp(targetPointer, 0.055);
  camera.position.x = pointer.x * 1.1;
  camera.position.y = 3.3 + pointer.y * 0.48;
  camera.lookAt(0, -2.5, -28);

  tapeGroup.rotation.y = pointer.x * -0.025;
  gridGroup.rotation.y = pointer.x * -0.018;
  markerGroup.rotation.y = pointer.x * -0.02;

  for (const segment of tapeGroup.children) {
    segment.position.z += segment.userData.speed * delta;
    if (segment.position.z > 13) segment.position.z -= 79.2;
  }
}

function frame(time) {
  animationFrame = requestAnimationFrame(frame);
  if (!visible || pausedByUser) return;
  const delta = Math.min((time - lastTime) / 1000 || 0, 0.05);
  lastTime = time;
  updateScene(delta);
  renderer.render(scene, camera);
}

function startLoop() {
  if (animationFrame) return;
  lastTime = performance.now();
  animationFrame = requestAnimationFrame(frame);
}

function stopLoop() {
  if (!animationFrame) return;
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
}

function onPointerMove(event) {
  if (reducedMotion.matches) return;
  targetPointer.x = THREE.MathUtils.clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1);
  targetPointer.y = THREE.MathUtils.clamp(1 - (event.clientY / window.innerHeight) * 2, -1, 1);
}

function toggleMotion() {
  pausedByUser = !pausedByUser;
  control.setAttribute('aria-pressed', String(pausedByUser));
  control.textContent = pausedByUser ? '[ RESUME FEED ]' : '[ PAUSE FEED ]';
  if (!pausedByUser) lastTime = performance.now();
}

function initialize() {
  if (reducedMotion.matches) {
    setFallback('reduced-motion still');
    return;
  }
  if (!supportsWebGL()) {
    setFallback('webgl unavailable');
    return;
  }

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(palette.fog, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    scene.background = palette.fog;
    scene.fog = new THREE.FogExp2(palette.fog, 0.026);

    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(0, 3.3, 18);
    camera.lookAt(0, -2.5, -28);

    buildPerspectiveGrid();
    buildTape();
    buildMarkers();
    resize();
    setLive();
    startLoop();

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    control.addEventListener('click', toggleMotion);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) lastTime = performance.now();
    }, { threshold: 0.02 });
    visibilityObserver.observe(viewport);

    document.addEventListener('visibilitychange', () => {
      visible = !document.hidden;
      if (visible) lastTime = performance.now();
    });
  } catch (error) {
    console.error('Depth Tape WebGL initialization failed.', error);
    setFallback('renderer fault');
  }
}

reducedMotion.addEventListener('change', () => window.location.reload());
window.addEventListener('pagehide', () => {
  stopLoop();
  resizeObserver?.disconnect();
  renderer?.dispose();
});

initialize();
