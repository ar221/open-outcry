#!/usr/bin/env bash
# Verify one Open Outcry WebGL lab. Usage: ./verify-lab.sh candle-field
set -euo pipefail

LAB="${1:?usage: verify-lab.sh <lab-basename>}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHOTS="/tmp/oo-verify"
PORT=8731
BASE="http://127.0.0.1:${PORT}/experiments/${LAB}.html"
# Live captures pin any one-shot reveal to completion (lab-shell.js `?reveal=full`).
# A fixed `wait` against a multi-second draw+hold cycle otherwise samples an
# arbitrary mid-animation frame, and the by-eye composition gate then gets
# applied to a frame that is not the finished plate. Labs with no reveal clock
# ignore the param. The fallback capture below deliberately does NOT carry it —
# `?render=fallback` is asserted exactly as before.
LIVE="${BASE}?reveal=full"

mkdir -p "$SHOTS"

fail() { echo "FAIL [$LAB] $*" >&2; exit 1; }

# 1. Syntax
node --check "${DIR}/${LAB}.js" || fail "node --check"
[ -f "${DIR}/lab-shell.js" ] && { node --check "${DIR}/lab-shell.js" || fail "node --check lab-shell"; }

# 2. Serve the repo root so ../tokens.css resolves
python -m http.server "$PORT" --directory "${DIR}/.." >/dev/null 2>&1 &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null || true' EXIT
sleep 1

# chrome-devtools-axi eval prints `result: <double-JSON-encoded value>` followed
# by a help footer; the footer means the raw value is never the last line, and
# the value itself is JSON-stringified twice (once by the page, once by the
# CLI's own display encoding), so grab the `result:` line and unwrap it twice.
probe() {
  local raw
  raw="$(chrome-devtools-axi eval "$1" 2>/dev/null | sed -n 's/^result: //p')"
  raw="${raw#\"}"; raw="${raw%\"}"
  raw="${raw//\\\"/\"}"
  raw="${raw#\"}"; raw="${raw%\"}"
  printf '%s' "$raw"
}

# 3. Desktop: live renderer + no horizontal overflow
chrome-devtools-axi open "$LIVE" >/dev/null
chrome-devtools-axi resize 1440 900 >/dev/null
chrome-devtools-axi wait 1200 >/dev/null
RENDERER="$(probe "document.querySelector('[data-renderer]').dataset.renderer")"
echo "$RENDERER" | grep -q webgl || fail "expected data-renderer=webgl, got '$RENDERER'"
OVERFLOW="$(probe "document.documentElement.scrollWidth - window.innerWidth")"
[ "${OVERFLOW//[^0-9-]/}" -le 0 ] 2>/dev/null || fail "horizontal overflow at 1440: ${OVERFLOW}px"
CANVAS="$(probe "document.querySelector('canvas').width")"
[ "${CANVAS//[^0-9]/}" -gt 0 ] || fail "canvas not sized"
chrome-devtools-axi screenshot "${SHOTS}/${LAB}-desktop.png" >/dev/null

# 4. Phone: no overflow, composition stacks.
# No re-open — the page is still the `?reveal=full` document from step 3, so the
# phone capture is a finished plate too. Resizing is what re-solves the layout.
chrome-devtools-axi resize 390 844 >/dev/null
chrome-devtools-axi wait 800 >/dev/null
OVERFLOW="$(probe "document.documentElement.scrollWidth - window.innerWidth")"
[ "${OVERFLOW//[^0-9-]/}" -le 0 ] 2>/dev/null || fail "horizontal overflow at 390: ${OVERFLOW}px"
chrome-devtools-axi screenshot "${SHOTS}/${LAB}-phone.png" >/dev/null

# 5. Fallback path is a real composition, not a blank frame
chrome-devtools-axi open "${BASE}?render=fallback" >/dev/null
chrome-devtools-axi resize 1440 900 >/dev/null
chrome-devtools-axi wait 600 >/dev/null
RENDERER="$(probe "document.querySelector('[data-renderer]').dataset.renderer")"
echo "$RENDERER" | grep -q fallback || fail "?render=fallback did not force fallback, got '$RENDERER'"
STATIC_H="$(probe "document.querySelector('[data-lab-static]').getBoundingClientRect().height")"
[ "${STATIC_H%%.*}" -gt 200 ] 2>/dev/null || fail "fallback composition too small: ${STATIC_H}px"
chrome-devtools-axi screenshot "${SHOTS}/${LAB}-fallback.png" >/dev/null

echo "PASS [$LAB] desktop + phone + fallback"
