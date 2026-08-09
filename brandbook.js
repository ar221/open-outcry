/* ═══════════════════════════════════════════════════════════
   OPEN OUTCRY — brand book behaviour (page-local)
   Dependency-free. No framework, no polyfill, no scroll polling.

   Four jobs, and nothing else:
     1. chrome measurement — the sticky rails publish their own height
     2. contract facts     — token/class counts read from the live CSSOM
     3. the Tape           — chapter state via IntersectionObserver
     4. quotation controls — one inset per plate, never a page repaint

   Everything degrades: over file:// the CSSOM is cross-origin-opaque and
   every derived fact reports `n/a` rather than a fabricated number.
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  /* ── 1 · chrome measurement ──
     The top rail wraps to two lines on narrow viewports and the Tape flips
     from a vertical rail to a horizontal strip, so the sticky offsets and
     every anchor's scroll-margin are measured rather than guessed. */
  const shell = $('.book-shell');
  const top   = $('.book-top');
  const nav   = $('#tape-nav');

  const horizontalTape = matchMedia('(max-width: 1099px)');

  function measureChrome() {
    if (!shell || !top || !nav) return;
    const topH = Math.round(top.getBoundingClientRect().height);
    // the Tape flips at the same breakpoint the stylesheet uses — asking the
    // media query is exact; comparing rects only guesses, and guessed 348px of
    // chrome on the desktop layout, where the rail is vertical and adds none
    const navH = horizontalTape.matches ? Math.round(nav.getBoundingClientRect().height) : 0;
    shell.style.setProperty('--book-top-h', topH + 'px');
    shell.style.setProperty('--book-chrome-h', (topH + navH) + 'px');
  }
  measureChrome();
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(measureChrome);
    if (top) ro.observe(top);
    if (nav) ro.observe(nav);
  }
  addEventListener('resize', measureChrome, { passive: true });
  horizontalTape.addEventListener('change', measureChrome);

  /* ── 2 · contract facts from the live CSSOM ──
     Counted from the stylesheets the browser actually parsed, so the numbers
     cannot drift from the files. Reading cssRules on a stylesheet the page
     could not same-origin load throws; that is the file:// case, and it
     reports `n/a` instead of a guess. */
  function sheetFor(name) {
    return [...document.styleSheets].find(s => (s.href || '').includes(name));
  }
  function rulesOf(sheet) {
    try { return sheet ? [...sheet.cssRules] : null; } catch { return null; }
  }
  function flatten(rules, out = []) {
    for (const r of rules) {
      out.push(r);
      if (r.cssRules) { try { flatten([...r.cssRules], out); } catch { /* opaque */ } }
    }
    return out;
  }

  const facts = { tokens: null, components: null };

  const tokenRules = rulesOf(sheetFor('tokens.css'));
  if (tokenRules) {
    const names = new Set();
    for (const r of flatten(tokenRules)) {
      if (!r.style) continue;
      for (const prop of r.style) if (prop.startsWith('--oo-')) names.add(prop);
    }
    facts.tokens = names.size;
  }

  const componentRules = rulesOf(sheetFor('components.css'));
  if (componentRules) {
    const names = new Set();
    for (const r of flatten(componentRules)) {
      if (!r.selectorText) continue;
      for (const m of r.selectorText.matchAll(/\.(oo-[a-z0-9-]+)/gi)) names.add(m[1]);
    }
    facts.components = names.size;
  }

  const pad = n => (n === null ? 'n/a' : String(n).padStart(2, '0'));
  setText('fact-tokens',        pad(facts.tokens));
  setText('fact-tokens-2',      pad(facts.tokens));
  setText('stat-tokens',        pad(facts.tokens));
  setText('fact-components',    pad(facts.components));
  setText('fact-components-2',  pad(facts.components));
  setText('stat-components',    pad(facts.components));

  /* ── the crawl: the same figures, moving. Decorative duplicate of the
     stat row above it, doubled so the loop has no gap. Never a control. ── */
  const crawl = $('#tape-crawl');
  if (crawl) {
    const seg =
      ` TOKENS <span class="voice">${pad(facts.tokens)}</span>` +
      ` · COMPONENTS <span class="voice">${pad(facts.components)}</span>` +
      ` · REGISTERS <span class="voice">02</span>` +
      ` · TOKENS.CSS <span class="up">v1.3</span>` +
      ` · COMPONENTS.CSS <span class="up">v1.5</span>` +
      ` · PLATE SOURCE <span class="up">VERIFIED</span>` +
      ` · CSS LABS <span class="voice">07</span>` +
      ` · FABRICATED METRICS <span class="down">00</span>` +
      ` · EASING CURVES <span class="down">00</span>` +
      ` · SQUARE CORNERS <span class="up">ALL</span> ·`;
    crawl.innerHTML = seg.repeat(4);
  }

  /* ── the token ledger ──
     Rendered from the values the browser resolved on :root, not from a table
     typed beside the stylesheet — a hand-written copy of tokens.css is a
     second source of truth that silently goes stale. Roles are authored here
     because a role is editorial: the stylesheet knows the value, only the
     spec knows what the value is for. */
  const LEDGER = [
    ['surfaces — two temperatures, one darkness', [
      ['--oo-void',            'the field behind every stage'],
      ['--oo-console-stage',   'console stage · green-black CRT'],
      ['--oo-console-pane',    'console card and pane fill'],
      ['--oo-console-smoke',   'smoky translucent pane'],
      ['--oo-broadcast-stage', 'broadcast stage · coffee-warm'],
      ['--oo-broadcast-pane',  'broadcast card and pane fill'],
    ]],
    ['voice — one warm ramp, two registers', [
      ['--oo-amber',       'console command ink'],
      ['--oo-amber-dim',   'console secondary ink'],
      ['--oo-amber-line',  'console hairline ink'],
      ['--oo-amber-glow',  'display glow and hover-arm'],
      ['--oo-peach',       'broadcast italic voice'],
      ['--oo-terracotta',  'broadcast strong accent'],
      ['--oo-peach-glow',  'broadcast glow'],
    ]],
    ['text — warm off-whites, never pure white', [
      ['--oo-fg',         'console primary · stamped white'],
      ['--oo-fg-warm',    'broadcast primary · creamier'],
      ['--oo-fg-dim',     'body prose in both registers'],
      ['--oo-muted',      'console metadata'],
      ['--oo-muted-warm', 'broadcast metadata'],
      ['--oo-ghost',      'disabled · rule · placeholder'],
    ]],
    ['semantics — the Tape', [
      ['--oo-green',      'live · up · safe · pass'],
      ['--oo-green-deep', 'candle bodies · seated fills'],
      ['--oo-red',        'down · footgun · failure'],
      ['--oo-blue',       'index / search', 'rare'],
      ['--oo-violet',     'external / provider', 'rare'],
    ]],
    ['lines', [
      ['--oo-line',        'console hairline'],
      ['--oo-line-warm',   'broadcast hairline'],
      ['--oo-pane-border', 'armed pane stroke'],
    ]],
  ];

  const ledger = $('#token-ledger');
  if (ledger) {
    const cs = getComputedStyle(document.documentElement);
    const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    let html = '';
    for (const [group, rows] of LEDGER) {
      html += `<div class="book-token-group book-ledger-head">${esc(group)}</div>`;
      for (const [name, role, rare] of rows) {
        const value = cs.getPropertyValue(name).trim() || 'MISSING';
        const chip = rare
          ? `<span class="book-chip book-chip--ink" style="color:${value}" aria-hidden="true">▮</span>`
          : `<span class="book-chip" style="background-color:${value}" aria-hidden="true"></span>`;
        const note = rare
          ? `${esc(role)} — <span class="down">INK ONLY / NEVER SURFACE</span>`
          : esc(role);
        html +=
          `<div class="book-token-row oo-frame${rare ? ' is-rare' : ''}">` +
            chip +
            `<span class="voice">${esc(name)}</span>` +
            `<span class="book-token-value">${esc(value)}</span>` +
            `<span class="book-ledger-role">${note}</span>` +
          `</div>`;
      }
    }
    ledger.innerHTML = html;
      }

  /* ── the receipt's self-observed checks. Each reports what was measured
     in this session, or `n/a`. There is no compliance score. ── */
  function reportEnvironment() {
    const de = document.documentElement;
    setText('fact-motion', reduced.matches
      ? 'REDUCE — crawl, beam and reveal disabled; all information still rendered'
      : 'NO-PREFERENCE — sanctioned motion running');
    setText('fact-viewport', `${Math.round(innerWidth)} × ${Math.round(innerHeight)} CSS px · DPR ${devicePixelRatio}`);
    const over = de.scrollWidth - de.clientWidth;
    const el = document.getElementById('fact-overflow');
    if (el) {
      el.textContent = `${over}px observed at this viewport`;
      el.className = over > 0 ? 'down' : 'up';
    }
    /* local sheets by filename, remote ones by host — the Google Fonts href
       is a 200-character query string and printing it verbatim turned the
       receipt's most factual row into noise */
    const files = [...new Set([...document.styleSheets].map(s => {
      if (!s.href) return null;
      const u = new URL(s.href, location.href);
      return u.origin === location.origin ? u.pathname.split('/').pop() : u.host;
    }).filter(Boolean))];
    setText('fact-files', files.concat('brandbook.js').join(' · ') || 'n/a');
  }
  reportEnvironment();
  addEventListener('resize', reportEnvironment, { passive: true });
  reduced.addEventListener('change', reportEnvironment);

  /* ── 3 · the Tape carries chapter state ──
     IntersectionObserver, not a scroll handler. The marker is never colour
     alone — ink, dot and glyph all change together. */
  const links = $$('#tape-nav a');
  const acts  = links
    .map(a => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter(Boolean);

  if (acts.length && 'IntersectionObserver' in window) {
    let current = null;

    const mark = act => {
      if (!act || act === current) return;
      current = act;
      let active = null;
      for (const a of links) {
        const on = a.hash.slice(1) === act.id;
        if (on) { a.setAttribute('aria-current', 'location'); active = a; }
        else a.removeAttribute('aria-current');
        const glyph = a.querySelector('.book-tape-mark');
        if (glyph) glyph.textContent = on ? '▶' : '▸';
      }
      /* As a horizontal strip the Tape is a scroll container, so the active
         chapter can sit off its right edge and the reader loses their place.
         scrollLeft is set directly rather than via scrollIntoView, which
         would also move the page and fight the anchor that just landed. */
      if (active && horizontalTape.matches) {
        const want = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
        nav.scrollLeft = Math.max(0, want);
      }
    };

    const chromeH = () => {
      const v = getComputedStyle(shell || document.documentElement).getPropertyValue('--book-chrome-h');
      return parseInt(v, 10) || 80;
    };

    /* Resolve the active chapter from geometry, not from set membership.
       Taking the first intersecting act is wrong: an anchored act lands 12px
       BELOW the band start (its own scroll-margin), so the act above still
       overlaps the band by those 12px and, being earlier in the DOM, wins
       every time — the marker lagged exactly one chapter behind every click.
       The last act whose top has crossed the line is the one being read.
       Rects are measured only when an intersection event fires; there is no
       scroll listener. */
    const resolve = () => {
      const de = document.documentElement;
      if (innerHeight + Math.ceil(scrollY) >= de.scrollHeight - 2) return acts[acts.length - 1];
      const line = chromeH() + 24;
      let best = acts[0];
      for (const a of acts) if (a.getBoundingClientRect().top <= line) best = a;
      return best;
    };

    let io;
    const build = () => {
      if (io) io.disconnect();
      io = new IntersectionObserver(() => mark(resolve()), {
        rootMargin: `-${chromeH()}px 0px -40% 0px`, threshold: 0
      });
      for (const a of acts) io.observe(a);
    };
    build();
    // the band depends on measured chrome, which changes when the Tape flips
    horizontalTape.addEventListener('change', () => { measureChrome(); build(); });

    // a click is an explicit answer; do not wait for the observer to agree
    for (const a of links) {
      a.addEventListener('click', () => {
        const target = document.getElementById(a.hash.slice(1));
        if (target) mark(target);
      });
    }
  }

  /* ── plate reveal · once per chapter ──
     Opacity to the authored strength plus a 24px mask shift. No scale, no
     blur, no repeated fade-up. Under reduced motion the CSS already paints
     the plate at full strength, so this observer simply never runs. */
  const plates = $$('.oo-plate-figure[data-reveal]');
  if (plates.length && !reduced.matches && 'IntersectionObserver' in window) {
    const po = new IntersectionObserver((entries, obs) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-revealed');
        obs.unobserve(e.target);
      }
    }, { threshold: 0.05 });
    for (const p of plates) po.observe(p);
  } else {
    for (const p of plates) p.classList.add('is-revealed');
  }

  /* ── the SVG path draws when the diagram it explains comes into view ── */
  const paths = $$('.oo-draw-path');
  if (paths.length && 'IntersectionObserver' in window) {
    const so = new IntersectionObserver((entries, obs) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-drawing');
        obs.unobserve(e.target);
      }
    }, { threshold: 0.4 });
    for (const p of paths) so.observe(p);
  }

  /* ── 4 · quotation controls ──
     The old whole-page register toggle is retired: it taught the reader that
     register is a skin. Each control reveals ONE inset from the other
     register and never touches the dominant register of the page. Hidden
     content is genuinely removed with the `hidden` attribute — which the
     contract's own classes have to restate, because an author `display`
     declaration outranks the user-agent `[hidden]` rule. */
  for (const btn of $$('[aria-controls][aria-expanded]')) {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) continue;
    const shown = btn.textContent.replace(/^Show\b/, 'Hide');
    const hiddenLabel = btn.textContent;
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
      btn.textContent = open ? hiddenLabel : shown;
    });
  }
})();
