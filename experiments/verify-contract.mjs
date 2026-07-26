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
//   BAD GUARD     — a rule that LOOKS like a guard but does not hold
//                   contract-wide: nested in an at-rule, descendant-scoped
//                   (`.oo-pane .oo-x[hidden]`), type-qualified (`a.oo-x[hidden]`),
//                   or otherwise narrowed. Never silently accepted as one.
//   UNSUPPORTED   — a construct this scanner cannot analyse. HARD FAIL, on
//                   purpose. For a guard, a false PASS is the worst failure
//                   available: it silently permits the exact bug the check
//                   exists to catch. A check that refuses to answer is honest;
//                   one that answers wrongly is not.
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
// Is every bracket/paren/quote in `s` closed? Used so a `;` inside an attribute
// value or a quoted string is not mistaken for a statement terminator.
function balanced(s) {
  let depth = 0, quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
  }
  return depth === 0 && quote === null;
}

function* rules(css, lineOf) {
  const stack = [];
  let buf = '', bufStart = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    // A statement-terminating `;` ends a prelude that never opened a block —
    // `@import url("x.css");`, `@charset "utf-8";`. Without this reset the
    // leftover `@import …` text prefixes the NEXT selector, that selector reads
    // as an at-rule prelude, gets pushed on the stack, and the rule it belongs
    // to is never yielded — an invisible class and a silent false PASS. This
    // repo is zero-dependency and one `@import` away from that.
    if (c === ';' && balanced(buf)) { buf = ''; bufStart = i + 1; continue; }
    if (c === '{') {
      const prelude = buf.trim();
      const preludePos = bufStart + (buf.length - buf.trimStart().length);
      if (prelude.startsWith('@')) {
        stack.push(prelude);
        buf = ''; bufStart = i + 1;
        continue;
      }
      // Read the balanced declaration block, noting any block nested inside it.
      let depth = 1, j = i + 1, nested = false;
      for (; j < css.length && depth > 0; j++) {
        if (css[j] === '{') { depth++; nested = true; }
        else if (css[j] === '}') depth--;
      }
      const body = css.slice(i + 1, j - 1);
      if (!stack.some((a) => a.startsWith('@keyframes'))) {
        yield {
          selector: prelude, selectorLine: lineOf(preludePos),
          body, bodyStart: i + 1, at: [...stack], nested,
        };
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
function subjectSelector(compound) {
  let s = compound;
  for (let pass = 0; pass < 8; pass++) {
    const before = s;
    s = s.replace(/:not\(([^()]*)\)/gi, ' ');
    s = s.replace(/:(?:is|where|matches|any)\(([^()]*)\)/gi, ' $1 ');
    if (s === before) break;
  }
  return s;
}

function subjectClasses(compound) {
  return [...subjectSelector(compound).matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
}

// Does this compound test the `hidden` attribute AS A REQUIREMENT?
// The test runs on the :not()-stripped selector, so `.oo-x:not([hidden])` — which
// applies precisely when the element is NOT hidden — cannot pose as a guard.
function requiresHidden(compound) {
  return /\[\s*hidden\s*\]/i.test(subjectSelector(compound));
}

// The one class a compound guards, or null if the compound does not guard
// contract-wide. Accepted shape: exactly ONE class + `[hidden]`, plus optional
// argument-less pseudo-classes. Rejected, and reported as BAD GUARD rather than
// silently honoured:
//   `.oo-pane .oo-x[hidden]`  descendant-scoped — only holds inside .oo-pane, and
//                             under the old code also poisoned the reverse check
//                             by registering .oo-pane as guarded.
//   `a.oo-newz[hidden]`       type-qualified — only holds on <a>.
//   `.oo-x.oo-y[hidden]`      compound-scoped — only holds when both are present.
//   `.oo-x:not(.y)[hidden]`   narrowed by a functional pseudo-class.
// This is the same discipline the at-rule case already had: a guard that holds
// only under a condition is not the contract-wide guard.
function guardSubject(compound) {
  let s = compound.trim();
  const attrs = s.match(/\[[^\]]*\]/g) || [];
  if (attrs.length !== 1 || !/^\[\s*hidden\s*\]$/i.test(attrs[0])) return null;
  s = s.replace(/\[[^\]]*\]/g, '');
  s = s.replace(/::?[a-zA-Z-]+(?![\w(-])/g, ''); // argument-less pseudos only
  if (/[\s>+~*|(),]/.test(s)) return null;       // combinators, functional pseudos, type/universal
  const m = s.match(/^\.(-?[_a-zA-Z][\w-]*)$/);
  return m ? m[1] : null;
}

/* ── Collect ────────────────────────────────────────────────────────────── */

const guarded = new Map();   // class -> "file:line" of the guard entry
const declares = new Map();  // class -> {value, file, line} first non-none display
const badGuards = [];
const unsupported = [];

for (const file of FILES) {
  const raw = readFileSync(join(ROOT, file), 'utf8');
  const css = decomment(raw);
  const lineOf = lineIndex(css);

  for (const rule of rules(css, lineOf)) {
    // ── Refusals, before any analysis ──
    // Native CSS nesting. Measured: `.oo-x { color: red; &.y { display: grid } }`
    // used to PASS, because the inner block's `display` was read as part of the
    // outer body and attributed to nothing. Nesting support is NOT built here;
    // instead the scanner says out loud that it cannot verify the rule.
    if (rule.nested || /(^|[\s;{])&/.test(rule.body)) {
      unsupported.push(`${file}:${rule.selectorLine} \`${rule.selector.split('\n')[0].trim()}\` uses nested rules — this scanner cannot verify nesting. Flatten the rule, or teach the check before shipping it.`);
      continue;
    }

    const decls = displayDecls(rule, lineOf);
    if (decls.length === 0) continue;

    const compounds = splitTop(rule.selector, ',').map((s) => s.trim()).filter(Boolean);
    const guardish = decls.some((d) => d.value === 'none') && compounds.some(requiresHidden);

    if (guardish) {
      // A guard nested in an at-rule only holds under that condition, so it is
      // NOT accepted as the contract-wide guard. Reported, never silent.
      if (rule.at.length > 0) {
        badGuards.push(`${file}:${rule.selectorLine} guard nested in \`${rule.at.join(' > ')}\` — conditional, not accepted contract-wide.`);
      } else {
        for (const c of compounds) {
          if (!requiresHidden(c)) continue;
          const cls = guardSubject(c);
          if (cls === null) {
            badGuards.push(`${file}:${rule.selectorLine} \`${c}\` is not a contract-wide guard — it is scoped (descendant, type-qualified, compound, or narrowed by a functional pseudo-class), so it only holds in that context. Use a bare \`.class[hidden]\` entry.`);
            continue;
          }
          if (!guarded.has(cls)) guarded.set(cls, `${file}:${rule.selectorLine}`);
        }
      }
    }

    for (const d of decls) {
      if (d.value === 'none' || d.value === '') continue;
      // `display: var(--x)` cannot be resolved statically, so neither verdict is
      // available. Refuse loudly rather than skip silently — a skip here is a
      // false PASS on a class that may well need a guard.
      if (/var\(/.test(d.value)) {
        for (const c of compounds) {
          for (const cls of subjectClasses(c)) {
            unsupported.push(`${file}:${d.line} .${cls} declares \`display: ${d.value}\` — a var() display cannot be resolved statically, so this check cannot tell whether a [hidden] guard is owed. Inline a literal \`display\`, or teach the check.`);
          }
        }
        continue;
      }
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
for (const note of badGuards) failures.push(`BAD GUARD      ${note}`);
for (const note of [...new Set(unsupported)]) failures.push(`UNSUPPORTED    ${note}`);

if (failures.length) {
  console.error(`FAIL [contract] ${failures.length} [hidden]-guard parity error(s) in ${FILES.join(' + ')}`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`PASS [contract] ${guarded.size}/${declares.size} display-declaring classes carry a [hidden] guard`);
