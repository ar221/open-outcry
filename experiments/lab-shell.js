// lab-shell.js — shared harness for Open Outcry WebGL labs 02-05.
// Owns renderer lifecycle only. Knows nothing about any specific scene.
// Extracted from Lab 01 (depth-tape.js) after it proved the pattern.

const PALETTE_HEX = {
  amber: 0xf2a51f,          // --oo-amber
  amberDim: 0xb57b24,       // --oo-amber-dim
  amberLine: 0x9b6822,      // --oo-amber-line
  peach: 0xe8927c,          // --oo-peach
  terracotta: 0xd67c50,     // --oo-terracotta
  green: 0x48dc7d,          // --oo-green
  greenDeep: 0x1f9d55,      // --oo-green-deep
  red: 0xe0455a,            // --oo-red
  fg: 0xeee8df,             // --oo-fg
  muted: 0x686564,          // --oo-muted
  consoleStage: 0x070807,   // --oo-console-stage
  broadcastStage: 0x181210, // --oo-broadcast-stage
};

export function createLab(config) {
  const THREE = window.THREE;
  const el = {
    stage: document.querySelector('[data-renderer]'),
    viewport: document.querySelector('[data-lab-viewport]'),
    canvas: document.querySelector('[data-lab-canvas]'),
    static: document.querySelector('[data-lab-static]'),
    status: document.querySelector('[data-lab-status]'),
    control: document.querySelector('[data-lab-control]'),
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(window.location.search);
  const forced = params.get('render');
  // `?reveal=full` — deterministic full-reveal seam, same query-param idiom as
  // `?render=fallback` but a strictly weaker one: it does NOT touch the renderer
  // path. The scene stays live WebGL and everything else keeps animating; the
  // flag is simply handed to the lab as `ctx.revealFull`, and a lab that runs a
  // one-shot draw-in reads it to pin its own reveal clock to completion.
  //
  // Why the shell owns it: a screenshot harness firing a fixed wait against an
  // ~8s draw+hold cycle samples an arbitrary frame, so the by-eye composition
  // gate gets applied to something that is not the finished plate. Labs that
  // have no reveal clock ignore the flag and are unaffected.
  const revealFull = params.get('reveal') === 'full';

  const palette = {};
  for (const [name, hex] of Object.entries(PALETTE_HEX)) {
    palette[name] = new THREE.Color(hex);
  }

  const pointer = new THREE.Vector2(0, 0);
  const targetPointer = new THREE.Vector2(0, 0);

  let renderer, scene, camera, resizeObserver, visibilityObserver;
  let animationFrame = 0;
  // Set by teardown() when the page is being discarded rather than cached. A
  // restored page whose renderer was disposed cannot honestly claim it is live.
  let disposed = false;
  let visible = true;
  let pausedByUser = false;
  let lastTime = 0;

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

  function stopLoop() {
    if (!animationFrame) return;
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function startLoop() {
    if (animationFrame) return;
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(frame);
  }

  function setFallback(reason) {
    stopLoop();
    el.stage.dataset.renderer = 'fallback';
    el.canvas.hidden = true;
    el.static.hidden = false;
    el.status.innerHTML = `renderer / <strong>${reason}</strong>`;
    el.control.hidden = true;
  }

  function setLive() {
    el.stage.dataset.renderer = 'webgl';
    el.canvas.hidden = false;
    el.static.hidden = true;
    el.status.innerHTML = 'renderer / <strong>webgl live</strong>';
    el.control.hidden = false;
  }

  function resize() {
    if (!renderer || !camera) return;
    const width = Math.max(1, el.viewport.clientWidth);
    const height = Math.max(1, el.viewport.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function frame(time) {
    animationFrame = requestAnimationFrame(frame);
    if (!visible || pausedByUser) return;
    const delta = Math.min((time - lastTime) / 1000 || 0, 0.05);
    lastTime = time;
    if (config.pointer) pointer.lerp(targetPointer, 0.055);
    config.update({ THREE, scene, camera, palette, pointer, revealFull, data: config.data }, delta);
    renderer.render(scene, camera);
  }

  function onPointerMove(event) {
    if (reducedMotion.matches) return;
    targetPointer.x = THREE.MathUtils.clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1);
    targetPointer.y = THREE.MathUtils.clamp(1 - (event.clientY / window.innerHeight) * 2, -1, 1);
  }

  function toggleMotion() {
    pausedByUser = !pausedByUser;
    el.control.setAttribute('aria-pressed', String(pausedByUser));
    el.control.textContent = pausedByUser ? '[ RESUME FEED ]' : '[ PAUSE FEED ]';
    if (!pausedByUser) lastTime = performance.now();
  }

  function onVisibilityChange() {
    visible = !document.hidden;
    if (visible) lastTime = performance.now();
  }

  function onReducedMotionChange() {
    window.location.reload();
  }

  function initialize() {
    if (forced === 'fallback') return setFallback('forced still');
    // A lab that could not assemble its own inputs (a missing or unreadable
    // data snapshot) hands the reason in and gets the shell's one fallback
    // route, rather than dying at module scope and leaving `data-lab-static`
    // hidden behind a blank plate. Checked after `?render=fallback` so the
    // forced-still seam keeps reporting its own reason.
    if (config.fallbackReason) return setFallback(config.fallbackReason);
    if (reducedMotion.matches) return setFallback('reduced-motion still');
    if (!supportsWebGL()) return setFallback('webgl unavailable');

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: el.canvas,
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
      });
      const clear = palette[config.clearColor];
      renderer.setClearColor(clear, 1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene = new THREE.Scene();
      scene.background = clear;
      if (config.fogDensity) scene.fog = new THREE.FogExp2(clear, config.fogDensity);

      camera = new THREE.PerspectiveCamera(config.camera.fov, 1, 0.1, 160);
      camera.position.set(...config.camera.position);
      // Aims the camera once, here, at init. If a lab mutates camera.position
      // in its own update(ctx, dt), it must re-issue camera.lookAt(...) there
      // itself — the shell does not re-aim per frame, so rotation goes stale.
      camera.lookAt(...config.camera.lookAt);

      config.build({ THREE, scene, camera, palette, pointer, revealFull, data: config.data });
      resize();
      setLive();
      startLoop();

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(el.viewport);
      el.control.addEventListener('click', toggleMotion);
      if (config.pointer) {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
      }

      visibilityObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) lastTime = performance.now();
      }, { threshold: 0.02 });
      visibilityObserver.observe(el.viewport);

      document.addEventListener('visibilitychange', onVisibilityChange);
    } catch (error) {
      console.error('Lab WebGL initialization failed.', error);
      setFallback('renderer fault');
    }
  }

  // Full teardown: every observer disconnected and every listener removed, not
  // just the loop and the renderer. The earlier version dropped the frame and
  // disposed the context but left the IntersectionObserver, `visibilitychange`,
  // `pointermove`, reduced-motion and control-click listeners attached, all of
  // them still holding this closure — and that shape is now on five pages.
  function teardown() {
    stopLoop();
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    reducedMotion.removeEventListener('change', onReducedMotionChange);
    window.removeEventListener('pointermove', onPointerMove);
    el.control.removeEventListener('click', toggleMotion);
    renderer?.dispose();
    disposed = true;
  }

  reducedMotion.addEventListener('change', onReducedMotionChange);

  // `pagehide` fires for BOTH a discard and a bfcache entry, and the two want
  // opposite handling. Back-navigation from experiments/index.html is the
  // intended browsing flow, so a bfcache hit is the common case: disposing the
  // GL context there left a restored plate with a dead canvas still reporting
  // `renderer / webgl live`, which is the one thing a status rail must never do.
  // On a cached exit we only idle the loop and keep the context; on a real
  // discard we tear the whole thing down.
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) {
      stopLoop();
      return;
    }
    teardown();
  });

  // Restore path. Resume only if there is genuinely something live to resume;
  // otherwise route to the fallback and say so, rather than leaving a stale
  // "webgl live" over a canvas that cannot paint another frame.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    if (el.stage.dataset.renderer !== 'webgl') return;
    const gl = renderer?.getContext?.();
    if (disposed || !renderer || !gl || gl.isContextLost()) {
      return setFallback('context lost on restore');
    }
    resize();
    lastTime = performance.now();
    if (!pausedByUser) startLoop();
  });

  initialize();
}

// Shared builders. Labs use these instead of re-deriving line and label helpers.

export function makeLine(THREE, points, color, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.Line(geometry, material);
}

export function makeTextSprite(THREE, text, color, scale = 1) {
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
  const material = new THREE.SpriteMaterial({
    map: texture, transparent: true, opacity: 0.78, depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.8 * scale, 0.6 * scale, 1);
  return sprite;
}
