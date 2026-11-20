#!/usr/bin/env python
# Package an Open Outcry artifact into one self-contained HTML file.
#
#   uv run --with playwright python experiments/package-artifact.py \
#       examples/field-manual.html dist/field-manual.html
#
# The recipe the private production guides already use, made repeatable:
#   1. local stylesheets are inlined (tokens.css → components.css → consumer
#      sheets, in document order, so the cascade is unchanged);
#   2. Google Fonts stylesheet links become embedded @font-face rules — the
#      css2 response is fetched with a Chromium UA so it serves woff2, each
#      font file is downloaded and base64-embedded, and every family's license
#      (SIL OFL 1.1) plus source URL and sha256 goes into the provenance
#      sidecar;
#   3. every local <img src> and every url(...) still referenced from inlined
#      CSS is embedded as a data URI, hashed, and recorded;
#   4. relative document links (../tokens.css, PROVENANCE.md, …) are rewritten
#      against --link-base so the portable file still points at real sources;
#   5. a <output>.provenance.json sidecar records the source file hash and
#      every embedded resource: type, origin, bytes, sha256, license;
#   6. unless --no-verify, experiments/verify-artifact.py re-runs on the
#      export with --offline: all network access blocked, any attempted
#      request fails the run. Portable is proven, not assumed.
#
# Network is used at PACKAGE time only (for the fonts). The exported artifact
# is verified with the network gone. This is deliberately not a general-purpose
# bundler: no JS module graphs, no crawling — one HTML file, its stylesheets,
# fonts and images.

import argparse
import base64
import hashlib
import json
import re
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/126.0 Safari/537.36')  # css2 serves woff2 to modern UAs only
MIME = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2', '.woff': 'font/woff'}
OFL = 'SIL Open Font License 1.1'
FONT_LICENSES = {'Fraunces': OFL, 'Pixelify Sans': OFL, 'JetBrains Mono': OFL}
# Authoritative per-family license file: the Google Fonts distribution copy,
# which carries the family's own copyright notice on its first line followed
# by the full OFL text. OFL condition 2 requires BOTH to accompany any
# redistribution of the Font Software — a bare license label is not enough,
# so packaging hard-fails if this cannot be fetched.
OFL_TEXT_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/{slug}/OFL.txt'


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def data_uri(data: bytes, mime: str) -> str:
    return f'data:{mime};base64,' + base64.b64encode(data).decode()


def html_escape(text: str) -> str:
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def main() -> int:
    ap = argparse.ArgumentParser(description='Self-contained Open Outcry artifact export')
    ap.add_argument('source', type=Path)
    ap.add_argument('output', type=Path)
    ap.add_argument('--link-base', default='https://ar221.github.io/open-outcry/',
                    help='base URL for rewriting relative document links')
    ap.add_argument('--no-verify', action='store_true')
    args = ap.parse_args()

    src = args.source.resolve()
    src_dir = src.parent
    html = src.read_text()
    embedded: list[dict] = []
    font_slugs: set[str] = set()

    def record(kind: str, origin: str, data: bytes, license_: str | None = None):
        entry = {'type': kind, 'origin': origin, 'bytes': len(data), 'sha256': sha256(data)}
        if license_:
            entry['license'] = license_
        embedded.append(entry)

    # ── 1+2. <link rel=stylesheet>: inline local sheets, embed Google fonts ──
    def replace_link(m: re.Match) -> str:
        tag = m.group(0)
        href_m = re.search(r'href="([^"]+)"', tag)
        if not href_m or 'stylesheet' not in tag:
            return '' if 'fonts.g' in tag else tag  # drop preconnect hints
        href = href_m.group(1)
        if href.startswith('https://fonts.googleapis.com/'):
            css = fetch(href).decode()
            record('font-stylesheet', href, css.encode())

            def embed_font(fm: re.Match) -> str:
                url = fm.group(1)
                blob = fetch(url)
                fam = re.search(r'/s/([a-z]+)/', url)
                slug = fam.group(1) if fam else None
                family = next((k for k in FONT_LICENSES
                               if k.lower().replace(' ', '') == slug), slug or url)
                if slug:
                    font_slugs.add(slug)
                record('font', url, blob, FONT_LICENSES.get(family, OFL))
                return f'url({data_uri(blob, "font/woff2")})'

            css = re.sub(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', embed_font, css)
            return f'<style>/* embedded: {href} · fonts under {OFL} */\n{css}</style>'
        if href.startswith(('http://', 'https://', 'data:')):
            print(f'refusing to package external stylesheet: {href}', file=sys.stderr)
            sys.exit(2)
        path = (src_dir / href).resolve()
        css = path.read_text()
        record('stylesheet', str(path.relative_to(ROOT)), css.encode())
        return f'<style>/* inlined: {href} */\n{css}</style>'

    html = re.sub(r'<link\b[^>]*>', replace_link, html)

    # ── 3a. local <img src> → data URI ──
    def replace_img_src(m: re.Match) -> str:
        srcv = m.group(1)
        if srcv.startswith(('data:', 'http://', 'https://')):
            return m.group(0)
        path = (src_dir / srcv).resolve()
        blob = path.read_bytes()
        record('image', str(path.relative_to(ROOT)), blob)
        return f'src="{data_uri(blob, MIME[path.suffix.lower()])}"'

    html = re.sub(r'src="([^"]+)"', replace_img_src, html)

    # ── 3b. url(...) survivors inside inlined CSS ──
    def replace_css_url(m: re.Match) -> str:
        ref = m.group(1).strip('\'"')
        if ref.startswith(('data:', 'http://', 'https://', '#')):
            return m.group(0)
        path = (src_dir / ref).resolve()
        blob = path.read_bytes()
        record('css-asset', str(path.relative_to(ROOT)), blob)
        return f'url({data_uri(blob, MIME[path.suffix.lower()])})'

    html = re.sub(r'url\(([^)]+)\)', replace_css_url, html)

    # ── 4. relative document links → --link-base ──
    def replace_href(m: re.Match) -> str:
        href = m.group(1)
        if href.startswith(('#', 'data:', 'http://', 'https://', 'mailto:')):
            return m.group(0)
        rel = (src_dir / href).resolve().relative_to(ROOT)
        return f'href="{args.link_base.rstrip("/")}/{rel}"'

    html = re.sub(r'href="([^"]+)"', replace_href, html)
    # ── 5. font licenses: OFL condition 2 requires each family's copyright
    #      notice AND the full license text to accompany the embedded fonts.
    #      The authoritative Google Fonts distribution copy of each OFL.txt is
    #      fetched, hashed, and embedded IN the standalone file — a visible
    #      disclosure at the document foot, not just a sidecar label. ──
    font_licenses: list[dict] = []
    if font_slugs:
        blocks = []
        for slug in sorted(font_slugs):
            url = OFL_TEXT_URL.format(slug=slug)
            try:
                text = fetch(url).decode()
            except Exception as e:
                print(f'cannot fetch authoritative license for "{slug}" ({url}): {e}\n'
                      f'refusing to package with an incomplete font license.', file=sys.stderr)
                return 2
            family = next((k for k in FONT_LICENSES if k.lower().replace(' ', '') == slug), slug)
            copyright_line = next((ln.strip() for ln in text.splitlines() if ln.strip()), '')
            record('font-license', url, text.encode(), OFL)
            font_licenses.append({'family': family, 'slug': slug, 'source': url,
                                  'sha256': sha256(text.encode()), 'copyright': copyright_line})
            blocks.append(f'<details>\n<summary>{html_escape(family)} — {OFL}</summary>\n'
                          f'<pre>{html_escape(text)}</pre>\n</details>')
        licenses_html = (
            '\n<!-- embedded font licenses: OFL condition 2 — copyright notice and full '
            'license text accompany the embedded Font Software -->\n'
            '<section class="oo-pkg-licenses" aria-label="Embedded font licenses" '
            'style="max-width:72ch;margin:0 auto;padding:20px;font:12px/1.6 monospace;color:#91877f;">\n'
            '<style>\n'
            '.oo-pkg-licenses summary{cursor:pointer;min-height:44px;display:flex;align-items:center;color:#aaa39a;}\n'
            '.oo-pkg-licenses summary:focus-visible{outline:2px solid #f2a51f;outline-offset:2px;}\n'
            '.oo-pkg-licenses pre{white-space:pre-wrap;overflow-wrap:anywhere;color:#91877f;}\n'
            '</style>\n'
            '<p>Embedded font software and its licenses (sources and hashes in the '
            '.provenance.json sidecar):</p>\n' + '\n'.join(blocks) + '\n</section>')
        html = html.replace('</body>', licenses_html + '\n</body>', 1)

    src_hash = sha256(src.read_bytes())
    stamp = (f'<!-- self-contained export · packaged {datetime.now(timezone.utc).date()} by '
             f'experiments/package-artifact.py · source {src.relative_to(ROOT)} '
             f'sha256 {src_hash} · font copyright notices + full OFL texts embedded at the '
             f'document foot · resource hashes in the .provenance.json sidecar -->')
    html = html.replace('<head>', f'<head>\n{stamp}', 1)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(html)
    out_hash = sha256(args.output.read_bytes())

    sidecar = args.output.with_suffix('.provenance.json')
    sidecar.write_text(json.dumps({
        'source': str(src.relative_to(ROOT)), 'sourceSha256': src_hash,
        'output': str(args.output), 'outputSha256': out_hash,
        'generated': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'linkBase': args.link_base,
        'fontLicenses': font_licenses,
        'embedded': embedded,
        'note': 'Each embedded font family\u2019s copyright notice and full SIL Open Font '
                'License 1.1 text are embedded in the exported HTML itself (document foot) '
                'and hashed above, as OFL condition 2 requires. Images are original to the '
                'repository (see examples/field-manual-assets/PROVENANCE.md).',
    }, indent=2))

    total = sum(e['bytes'] for e in embedded)
    print(f'packaged {args.output} ({args.output.stat().st_size} bytes; '
          f'{len(embedded)} resources, {total} embedded bytes; sidecar {sidecar.name})')

    if args.no_verify:
        return 0
    print('re-verifying export with network access blocked …')
    families = sorted({next((k for k in FONT_LICENSES if k.lower().replace(' ', '') == s), s)
                       for s in font_slugs})
    return subprocess.call([sys.executable, str(ROOT / 'experiments/verify-artifact.py'),
                            str(args.output), '--offline',
                            *[a for f in families for a in ('--require-font', f)]])


if __name__ == '__main__':
    sys.exit(main())
