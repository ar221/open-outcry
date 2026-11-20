#!/usr/bin/env python
# Verify a rendered Open Outcry artifact in a real browser.
#
#   uv run --with playwright python experiments/verify-artifact.py <artifact.html> [options]
#
# This is the OTHER half of verification. experiments/verify-contract.mjs stays
# a static, zero-dependency assertion about the class contract itself; this
# script renders one artifact in system Chromium and checks what a reader
# actually receives. It exists because zero horizontal overflow is NOT visual
# sign-off: a `width:100%` image that keeps a stale HTML `height` attribute
# renders vertically stretched inside a perfectly overflow-free page (measured
# live on a production field manual, 2026-09-19).
#
# ALL behavioural checks run at EVERY viewport width (default 390 / 768 /
# 1440) — a phone reflow changes focus order, tap targets and reveal paths,
# so a desktop-only pass proves nothing about the phone:
#   · every <img> loads (decode forced; naturalWidth > 0)
#   · every rendered image content box matches its intrinsic proportions —
#     borders and padding subtracted, subpixel rounding tolerated; images
#     inside a declared crop host (.oo-media--crop or [data-qa-crop]) are the
#     one exemption, because there the crop is the stated intent
#   · no horizontal overflow (scrollWidth vs innerWidth, plus the offenders)
#   · no unintended clipping of instructional media (an <img> outside a crop
#     host must keep ≥ 98% of its area visible under every overflow ancestor)
#   · keyboard focus is visible — Tab walks the page, deduping by element
#     identity; every element that takes focus must show an outline
#   · interactions, auto-detected when present:
#       – #search filters sections, shows the empty state, and #clear
#         (activated by KEYBOARD, not click) restores every section;
#       – hidden-target navigation: with a filter active, keyboard-activating
#         an anchor whose target sits in a filtered-out section must reveal it;
#       – EVERY <details> toggles open and closed from the keyboard.
# Once per run: declared fonts reach "loaded" (none "error"), internal
# anchors resolve, zero console/page errors.
#
# A viewport screenshot is saved per width beside the artifact
# (<stem>.qa-<width>.png), and each --shot selector is captured at every
# width (<stem>.qa-<width>-<sel>.png). LOOK AT THEM — the receipt records
# numbers, only eyes catch a stretched face.
#
# --offline blocks every non-file request. Use it on a packaged export: a
# self-contained artifact must pass with the network gone, and any request it
# even ATTEMPTS is reported and fails the run.
#
# Exit 0 iff everything passed. Receipt JSON written to <stem>.qa.json.

import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ASPECT_TOLERANCE = 0.005  # 0.5% relative — subpixel rounding passes, stretch fails

PAGE_METRICS_JS = """
(tolerance) => {
  const out = { images: [], overflow: [], clipped: [] };
  const docW = document.documentElement.clientWidth;

  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > docW + 1 && getComputedStyle(el).position !== 'fixed')
      out.overflow.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
        (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\\s+/).filter(Boolean).slice(0,3).join('.') : ''));
  }

  for (const img of document.images) {
    const cs = getComputedStyle(img);
    if (cs.display === 'none') continue;
    const r = img.getBoundingClientRect();
    const bx = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)
             + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const by = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
             + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const w = r.width - bx, h = r.height - by;
    const cropped = !!img.closest('.oo-media--crop, [data-qa-crop]');
    const rec = {
      alt: img.getAttribute('alt'), src: (img.currentSrc || img.src).slice(0, 96),
      natural: [img.naturalWidth, img.naturalHeight],
      rendered: [Math.round(w * 100) / 100, Math.round(h * 100) / 100],
      loaded: img.complete && img.naturalWidth > 0,
      cropHost: cropped,
    };
    if (rec.loaded && !cropped && w > 1 && h > 1) {
      const relErr = Math.abs((w / h) - (img.naturalWidth / img.naturalHeight)) /
                     (img.naturalWidth / img.naturalHeight);
      rec.aspectError = Math.round(relErr * 1e6) / 1e6;
      rec.aspectPass = relErr <= tolerance;
    }
    out.images.push(rec);

    if (rec.loaded && !cropped && r.width > 0) {
      let vis = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      for (let a = img.parentElement; a; a = a.parentElement) {
        const ov = getComputedStyle(a);
        if (!/(hidden|clip|auto|scroll)/.test(ov.overflowX + ov.overflowY)) continue;
        const ar = a.getBoundingClientRect();
        vis.left = Math.max(vis.left, ar.left); vis.top = Math.max(vis.top, ar.top);
        vis.right = Math.min(vis.right, ar.right); vis.bottom = Math.min(vis.bottom, ar.bottom);
      }
      const visArea = Math.max(0, vis.right - vis.left) * Math.max(0, vis.bottom - vis.top);
      const frac = visArea / (r.width * r.height);
      if (frac < 0.98) out.clipped.push({ alt: rec.alt, visibleFraction: Math.round(frac * 1000) / 1000 });
    }
  }
  return out;
}
"""

SECTIONS_JS = "document.querySelectorAll('.fm-section, .chapter, section[id]')"


def focus_walk(page, failures, width, max_tabs):
    page.evaluate('document.activeElement.blur?.(); scrollTo(0,0); window.__qaSeen = new WeakSet()')
    walk = []
    for _ in range(max_tabs):
        page.keyboard.press('Tab')
        f = page.evaluate("""() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          if (window.__qaSeen.has(el)) return { repeat: true };  // wrapped around
          window.__qaSeen.add(el);
          const cs = getComputedStyle(el);
          return { desc: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
                         (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\\s+/)[0] : ''),
                   outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth };
        }""")
        if f is None:
            continue
        if f.get('repeat'):
            break
        visible = f['outlineStyle'] != 'none' and f['outlineWidth'] not in ('0px', '')
        walk.append({**f, 'visibleRing': visible})
        if not visible:
            failures.append(f'FOCUS       {width}px: {f["desc"]} focused with no visible outline '
                            f'({f["outlineStyle"]} / {f["outlineWidth"]})')
    return walk or 'no focusable elements'


def run_interactions(page, failures, width):
    ix: dict = {}
    has_search = page.locator('#search').count() and page.locator('#clear').count()
    if has_search:
        sections = page.evaluate(f'{SECTIONS_JS}.length')
        page.locator('#search').fill('zzz-no-such-term')
        page.wait_for_timeout(100)
        ix['emptyState'] = page.evaluate(
            f"[...{SECTIONS_JS}].every(s => s.hidden) && !document.getElementById('empty')?.hidden")
        # clear must work from the KEYBOARD, not just the pointer
        page.locator('#clear').focus()
        page.keyboard.press('Enter')
        page.wait_for_timeout(100)
        ix['clearRestoresViaKeyboard'] = page.evaluate(
            f'[...{SECTIONS_JS}].filter(s => !s.hidden).length') == sections
        page.locator('#search').fill('crop')
        page.wait_for_timeout(100)
        ix['searchMatches'] = page.evaluate(
            f'[...{SECTIONS_JS}].filter(s => !s.hidden).length')

        # hidden-target navigation: with the filter still active, an anchor
        # whose target sits inside a filtered-out section must reveal it.
        nav = page.evaluate("""() => {
          const hiddenAnchor = [...document.querySelectorAll('a[href^="#"]')].find(a => {
            const t = document.getElementById(a.hash.slice(1));
            return t && (t.closest('[hidden]') || t.hidden);
          });
          if (!hiddenAnchor) return { available: false };
          window.__qaNav = hiddenAnchor;
          return { available: true, hash: hiddenAnchor.hash };
        }""")
        if nav['available']:
            page.evaluate('window.__qaNav.focus()')
            page.keyboard.press('Enter')
            page.wait_for_timeout(150)
            revealed = page.evaluate("""() => {
              const t = document.getElementById(location.hash.slice(1));
              return !!t && !t.hidden && !t.closest('[hidden]');
            }""")
            ix['hiddenTargetNav'] = {'hash': nav['hash'], 'revealed': revealed}
            if not revealed:
                failures.append(f'INTERACT    {width}px: keyboard-activating {nav["hash"]} did not reveal its filtered-out section')
        else:
            ix['hiddenTargetNav'] = 'no anchor targeted a filtered-out section'
        page.locator('#clear').click()
        page.wait_for_timeout(100)

        if not ix['emptyState']:
            failures.append(f'INTERACT    {width}px: empty search state did not engage')
        if not ix['clearRestoresViaKeyboard']:
            failures.append(f'INTERACT    {width}px: keyboard-activated clear did not restore all sections')
        if not ix.get('searchMatches'):
            failures.append(f'INTERACT    {width}px: a real search term matched nothing')

    n_details = page.locator('details > summary').count()
    if n_details:
        toggled = []
        for i in range(n_details):
            d = page.locator('details').nth(i)
            s = d.locator('summary')
            was_open = d.get_attribute('open') is not None
            s.scroll_into_view_if_needed()
            s.focus()
            page.keyboard.press('Enter')
            page.wait_for_timeout(80)
            opened = (d.get_attribute('open') is not None) != was_open
            page.keyboard.press('Enter')  # restore
            page.wait_for_timeout(80)
            restored = (d.get_attribute('open') is not None) == was_open
            toggled.append(opened and restored)
            if not (opened and restored):
                failures.append(f'INTERACT    {width}px: <details> #{i} did not toggle open+closed from the keyboard')
        ix['detailsKeyboardToggles'] = f'{sum(toggled)}/{n_details}'
    return ix or 'none detected'


def main() -> int:
    ap = argparse.ArgumentParser(description='Browser-level Open Outcry artifact verification')
    ap.add_argument('artifact', type=Path)
    ap.add_argument('--widths', type=int, nargs='+', default=[390, 768, 1440])
    ap.add_argument('--offline', action='store_true',
                    help='block all non-file requests; any attempt is a failure')
    ap.add_argument('--shot', action='append', default=[],
                    help='CSS selector to screenshot at every width (repeatable)')
    ap.add_argument('--require-font', action='append', default=[],
                    help='font family that MUST reach status "loaded" (repeatable); '
                         'an empty FontFaceSet is a failure when any family is required')
    ap.add_argument('--chromium', default='/usr/bin/chromium')
    ap.add_argument('--max-tabs', type=int, default=60, help='Tab presses for each focus walk')
    args = ap.parse_args()

    artifact = args.artifact.resolve()
    if not artifact.exists():
        print(f'no such artifact: {artifact}', file=sys.stderr)
        return 2
    stem = artifact.with_suffix('')
    receipt: dict = {'artifact': str(artifact), 'offline': args.offline, 'viewports': [],
                     'toleranceRelative': ASPECT_TOLERANCE}
    failures: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chromium, headless=True,
                                    args=['--no-sandbox'])
        context = browser.new_context()
        blocked: list[str] = []
        if args.offline:
            def gate(route, request):
                if request.url.startswith('file://') or request.url.startswith('data:'):
                    route.continue_()
                else:
                    blocked.append(request.url)
                    route.abort()
            context.route('**/*', gate)
        page = context.new_page()
        errors: list[str] = []
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}')
                if m.type == 'error' else None)

        page.goto(artifact.as_uri())
        page.evaluate('document.fonts.ready')
        page.evaluate("Promise.all([...document.images].map(i => { i.loading = 'eager'; "
                      "return i.decode().catch(() => {}) }))")

        fonts = page.evaluate("[...document.fonts].map(f => ({family: f.family, status: f.status}))")
        receipt['fonts'] = fonts
        for f in fonts:
            if f['status'] == 'error':
                failures.append(f"FONT        {f['family']} failed to load")
        loaded_families = {f['family'].strip('"\'') for f in fonts if f['status'] == 'loaded'}
        receipt['loadedFontFamilies'] = sorted(loaded_families)
        # An empty FontFaceSet passes the error test vacuously — a page that
        # never registered its fonts at all would false-pass. Required
        # families are therefore asserted PRESENT AND LOADED by name.
        receipt['requiredFonts'] = args.require_font
        for fam in args.require_font:
            if fam not in loaded_families:
                failures.append(f'FONT MISSING {fam!r} never reached status "loaded" '
                                f'(loaded: {sorted(loaded_families) or "none"})')

        broken_anchors = page.evaluate(
            "[...document.querySelectorAll('a[href^=\"#\"]')]"
            ".filter(a => a.hash.length > 1 && !document.getElementById(decodeURIComponent(a.hash.slice(1))))"
            ".map(a => a.hash)")
        receipt['brokenAnchors'] = broken_anchors
        if broken_anchors:
            failures.append(f'ANCHORS     {broken_anchors}')

        for width in sorted(args.widths, reverse=True):
            page.set_viewport_size({'width': width, 'height': 950})
            page.wait_for_timeout(200)
            m = page.evaluate(PAGE_METRICS_JS, ASPECT_TOLERANCE)
            scroll_w = page.evaluate('document.documentElement.scrollWidth')
            inner_w = page.evaluate('innerWidth')

            if scroll_w > inner_w:
                failures.append(f'OVERFLOW    {width}px: scrollWidth {scroll_w} > innerWidth {inner_w}: {m["overflow"][:6]}')
            for img in m['images']:
                if not img['loaded']:
                    failures.append(f'IMG LOAD    {width}px: {img["alt"] or img["src"]}')
                elif img.get('aspectPass') is False:
                    failures.append(f'ASPECT      {width}px: {img["alt"] or img["src"]} — rendered '
                                    f'{img["rendered"]} vs natural {img["natural"]} '
                                    f'(relative error {img["aspectError"]:.4%} > {ASPECT_TOLERANCE:.1%})')
            for c in m['clipped']:
                failures.append(f'CLIPPED     {width}px: {c["alt"]} — only {c["visibleFraction"]:.1%} visible outside a declared crop host')

            vp = {'width': width, 'scrollWidth': scroll_w, 'innerWidth': inner_w,
                  'images': m['images'], 'overflowElements': m['overflow'],
                  'clipped': m['clipped'],
                  'focusWalk': focus_walk(page, failures, width, args.max_tabs),
                  'interactions': run_interactions(page, failures, width)}
            receipt['viewports'].append(vp)

            page.evaluate("location.hash = ''; scrollTo(0, 0)")
            page.wait_for_timeout(100)
            page.screenshot(path=f'{stem}.qa-{width}.png')
            for sel in args.shot:
                safe = ''.join(ch if ch.isalnum() else '-' for ch in sel).strip('-')
                loc = page.locator(sel).first
                loc.scroll_into_view_if_needed()
                page.wait_for_timeout(150)
                loc.screenshot(path=f'{stem}.qa-{width}-{safe}.png')

        receipt['consoleErrors'] = errors
        if errors:
            failures.append(f'ERRORS      {errors[:4]}')
        if args.offline:
            receipt['blockedRequests'] = blocked
            if blocked:
                failures.append(f'OFFLINE     artifact attempted {len(blocked)} network request(s): {blocked[:4]}')

        browser.close()

    receipt['failures'] = failures
    receipt['passed'] = not failures
    Path(f'{stem}.qa.json').write_text(json.dumps(receipt, indent=2, ensure_ascii=False))

    for f in failures:
        print(f'FAIL {f}')
    total_imgs = max((len(v['images']) for v in receipt['viewports']), default=0)
    verdict = 'PASS' if not failures else 'FAIL'
    print(f'{verdict} [artifact] {artifact.name}: {total_imgs} images, '
          f'{len(receipt["viewports"])} viewports (focus+interactions at each), '
          f'receipt {stem.name}.qa.json — screenshots saved; visual inspection still required')
    return 0 if not failures else 1


if __name__ == '__main__':
    sys.exit(main())
