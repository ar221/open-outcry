#!/usr/bin/env node
// Verify the Open Outcry class contract. Usage: ./verify-contract.mjs [--list]
//
// ONE assertion, and it is the one the v1.5 receipt said was owed:
//
//   Every contract class that declares a `display` value other than `none` must
//   appear in the top-level `[hidden] { display: none }` guard rule.
//
// Why it has to exist: `[hidden] { display: none }` ships in the USER-AGENT
// sheet, and any author `display` beats the UA origin regardless of selector
// weight — a cascade ORIGIN contest, which `:where()` cannot lower. So a
// contract class declaring `display` silently defeats the `hidden` attribute:
// markup sets it, the DOM and assistive tech agree the element is hidden, and it
// stays on screen. v1.5 fixed ten such classes with one hand-maintained rule.
// A hand-maintained list rots; this file is the assertion that replaces the hope
// that the next author reads the `▲ TRAP` note.
//
// The exemption is DERIVED, not listed. There is no allow-list here, because a
// maintained allow-list would recreate the original problem one level up. A
// class needs a guard only if it declares a `display` other than `none` — so
// `.oo-scanbeam`, whose only `display` is `none` inside
// `@media (prefers-reduced-motion: reduce)`, is not reported and never has to be
// exempted by name.
//
// Both directions are asserted:
//   MISSING GUARD — declares display, absent from the guard rule (the v1.5 bug).
//   STALE GUARD   — named in the guard rule but declares no non-none display,
//                   i.e. the class was renamed or removed and the rule rotted.
//
// Zero dependencies, `node:fs` only. Runs identically here and in CI
// (.github/workflows/contract.yml). Not a CSS-spec-complete parser — it is a
// declaration/selector scanner sized to this contract, deliberately preferring a
// hard failure it can explain over a clever inference it cannot.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['components.css', 'tokens.css'];

/* ── Lexing helpers ─────────────────────────────────────────────────────── */

// Blank out /* … */ comments in place, preserving every byte offset (and so
// every line number) by substituting spaces and keeping newlines. The class
// inventory in the components.css header lists class names in prose
// (`· layout — .oo-stage · .oo-grid-2 · …`); without this the scanner would read
// those as selectors.
function decomment(css) {
  let out = '';
  for (let i = 0; i < css.length; ) {
    if (css[i] === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? css.length : end + 2;
      for (let j = i; j < stop; j++) out += css[j] === '\n' ? '\n' : ' ';
      i = stop;
    } else {
      out += css[i++];
    }
  }
  return out;
}

function lineIndex(css) {
  const starts = [0];
  for (let i = 0; i < css.length; i++) if (css[i] === '\n') starts.push(i + 1);
  return (pos) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= pos) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };
}

// Split on `sep` at nesting depth zero, respecting (), [] and quotes.
function splitTop(str, sep) {
  const parts = [];
  let buf = '', depth = 0, quote = null;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (quote) {
      buf += c;
      if (c === '\\') { buf += str[++i] ?? ''; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; buf += c; continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (c === sep && depth === 0) { parts.push(buf); buf = ''; continue; }
    buf += c;
  }
  parts.push(buf);
  return parts;
}

/* ── Rule scanner ───────────────────────────────────────────────────────── */

// Walk the sheet with a brace stack, yielding every non-at-rule block together
// with the at-rules enclosing it. `@media` / `@supports` children are real
// rules and are yielded (a `display` inside a media query still defeats
// `hidden` at those widths, so it still needs a top-level guard); `@keyframes`
// children are not rules at all and are skipped.
function* rules(css, lineOf) {
  const stack = [];
  let buf = '', bufStart = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '{') {
      const prelude = buf.trim();
      const preludePos = bufStart + (buf.length - buf.trimStart().length);
      if (prelude.startsWith('@')) {
        stack.push(prelude);
        buf = ''; bufStart = i + 1;
        continue;
      }
      // Read the balanced declaration block.
      let depth = 1, j = i + 1;
      for (; j < css.length && depth > 0; j++) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
      }
      const body = css.slice(i + 1, j - 1);
      if (!stack.some((a) => a.startsWith('@keyframes'))) {
        yield { selector: prelude, selectorLine: lineOf(preludePos), body, bodyStart: i + 1, at: [...stack] };
      }
      i = j - 1;
      buf = ''; bufStart = i + 1;
      continue;
    }
    if (c === '}') { stack.pop(); buf = ''; bufStart = i + 1; continue; }
    if (buf === '') bufStart = i;
    buf += c;
  }
}

// `display` declarations in a block, with the line each sits on.
function displayDecls(rule, lineOf) {
  const out = [];
  let pos = rule.bodyStart;
  for (const chunk of splitTop(rule.body, ';')) {
    const colon = splitTop(chunk, ':');
    if (colon.length >= 2 && colon[0].trim().toLowerCase() === 'display') {
      const value = colon.slice(1).join(':').replace(/!\s*important/i, '').trim().toLowerCase();
      const at = pos + (chunk.length - chunk.trimStart().length);
      out.push({ value, line: lineOf(at) });
    }
    pos += chunk.length + 1;
  }
  return out;
}

// Classes this compound selector actually SUBJECTS.
//   `:not(…)` args are negations — never subjects — so they are dropped.
//   `:is(…)` / `:where(…)` args ARE subjects (zero specificity is still author
//   origin, so `:where(.oo-x){display:block}` defeats `hidden` too) and are
//   unwrapped rather than dropped.
function subjectClasses(compound) {
  let s = compound;
  for (let pass = 0; pass < 8; pass++) {
    const before = s;
    s = s.replace(/:not\(([^()]*)\)/gi, ' ');
    s = s.replace(/:(?:is|where|matches|any)\(([^()]*)\)/gi, ' $1 ');
    if (s === before) break;
  }
  return [...s.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
}

/* ── Collect ────────────────────────────────────────────────────────────── */

const guarded = new Map();   // class -> "file:line" of the guard entry
const declares = new Map();  // class -> {value, file, line} first non-none display
const skippedGuards = [];

for (const file of FILES) {
  const raw = readFileSync(join(ROOT, file), 'utf8');
  const css = decomment(raw);
  const lineOf = lineIndex(css);

  for (const rule of rules(css, lineOf)) {
    const decls = displayDecls(rule, lineOf);
    if (decls.length === 0) continue;

    const compounds = splitTop(rule.selector, ',').map((s) => s.trim()).filter(Boolean);
    const isGuard = decls.some((d) => d.value === 'none') && compounds.some((c) => /\[\s*hidden/i.test(c));

    if (isGuard) {
      // A guard nested in an at-rule only holds under that condition, so it is
      // NOT accepted as the contract-wide guard. Reported so it is never silent.
      if (rule.at.length > 0) {
        skippedGuards.push(`${file}:${rule.selectorLine} guard nested in ${rule.at.join(' > ')} — conditional, not accepted`);
      } else {
        for (const c of compounds) {
          if (!/\[\s*hidden/i.test(c)) continue;
          for (const cls of subjectClasses(c)) {
            if (!guarded.has(cls)) guarded.set(cls, `${file}:${rule.selectorLine}`);
          }
        }
      }
    }

    for (const d of decls) {
      if (d.value === 'none' || d.value === '' || d.value.startsWith('var(')) continue;
      for (const c of compounds) {
        for (const cls of subjectClasses(c)) {
          if (!declares.has(cls)) declares.set(cls, { value: d.value, where: `${file}:${d.line}` });
        }
      }
    }
  }
}

/* ── Assert ─────────────────────────────────────────────────────────────── */

if (process.argv.includes('--list')) {
  for (const [cls, d] of [...declares].sort()) {
    console.log(`${guarded.has(cls) ? 'guarded' : 'UNGUARDED'}  .${cls}  display: ${d.value}  (${d.where})`);
  }
}

const failures = [];
for (const [cls, d] of [...declares].sort()) {
  if (!guarded.has(cls)) {
    failures.push(`MISSING GUARD  .${cls} declares \`display: ${d.value}\` at ${d.where} but is absent from the [hidden] rule — it will override the UA \`[hidden] { display: none }\`. Add \`.${cls}[hidden]\` to that rule.`);
  }
}
for (const [cls, where] of [...guarded].sort()) {
  if (!declares.has(cls)) {
    failures.push(`STALE GUARD    .${cls}[hidden] is listed at ${where} but .${cls} declares no \`display\` other than \`none\` — the guard rule has rotted (class renamed or removed?). Drop the entry or restore the class.`);
  }
}
for (const note of skippedGuards) failures.push(`BAD GUARD      ${note}`);

if (failures.length) {
  console.error(`FAIL [contract] ${failures.length} [hidden]-guard parity error(s) in ${FILES.join(' + ')}`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`PASS [contract] ${guarded.size}/${declares.size} display-declaring classes carry a [hidden] guard`);
