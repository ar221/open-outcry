# Contract CI — `[hidden]`-guard parity check — Receipt

**Track:** tooling (first test harness and first CI in this repo)
**Artifacts:** `experiments/verify-contract.mjs` · `.github/workflows/contract.yml`
**Shipped:** 2026-07-26
**Branch / worktree:** `contract-ci` / `open-outcry-ci`
**Design system:** Open Outcry — `tokens.css` **v1.3, unchanged** / `components.css` **v1.5, unchanged**

This closes the first "Concerns / owed" bullet of `CONTRACT-V15-RECEIPT.md`, which
named exactly this gap: *"The rule is a manual list. A future class declaring `display`
and not added to it reintroduces the bug silently. Mitigated by the `▲ TRAP` header
note, but a real guard would be a check in CI … not built here — this worktree has no
test harness for the contract, only for the labs."*

**No contract file was touched.** `tokens.css`, `components.css`, `index.html`,
`examples/`, and everything pre-existing under `experiments/` are byte-identical. Two
files were added and nothing else.

---

## 1. What shipped

### 1.1 `experiments/verify-contract.mjs`

One assertion, both directions:

| Failure | Meaning |
|---|---|
| `MISSING GUARD` | class declares a `display` other than `none` and is absent from the `[hidden]` rule — the v1.5 bug, reintroduced |
| `STALE GUARD` | class is named in the `[hidden]` rule but declares no non-`none` `display` — the rule rotted (renamed / deleted class) |
| `BAD GUARD` | a `[hidden]` guard found nested inside an at-rule, so it only holds under that condition and is not accepted as the contract-wide guard |

**The exemption is derived, not listed.** There is no allow-list in the file, because a
maintained allow-list would recreate the original problem one level up — the same
hand-maintained-list rot, just moved into the checker. The derived principle is: *a class
needs a `[hidden]` guard only if it declares a `display` value other than `none`.* A
`display: none` declaration is not in contest with the UA `[hidden]` rule; it agrees with
it. `.oo-scanbeam` therefore needs no guard and is never named anywhere in the check.

**Verified before relying on it** rather than assumed: `.oo-scanbeam` appears at
`components.css:135` (base rule — `position`, `left`, `right`, `height`,
`pointer-events`, `background`, `opacity`, `animation`; **no `display`**), at `:279`
(`animation: none`), and at `:281` (`display: none`, inside
`@media (prefers-reduced-motion: reduce)`). Enumerating every `display:` declaration in
the sheet and printing the ones in `.oo-scanbeam` context returns exactly one value:
`none`. The principle holds for the one class it has to hold for.

**Parsing decisions that matter, and why:**

- **Comments are blanked, not stripped** — each comment byte becomes a space, newlines
  kept, so byte offsets and therefore reported line numbers stay exact. Necessary
  because the `components.css` header carries a class inventory in prose
  (`· layout — .oo-stage · .oo-grid-2 · …`) that a naive scanner reads as selectors.
- **`@media` / `@supports` children are real rules and ARE scanned.** A `display`
  declared only inside a media query still defeats `hidden` at those widths, so it still
  needs the top-level guard. `@keyframes` children are not rules and are skipped.
- **A guard nested in an at-rule is not accepted.** It would only hold under that
  condition. Reported as `BAD GUARD` rather than silently ignored.
- **`:not(…)` arguments are dropped; `:is(…)` / `:where(…)` arguments are unwrapped.** A
  `:not()` argument is a negation and never the subject. An `:is()`/`:where()` argument
  *is* the subject — and zero specificity is irrelevant here, because this is a cascade
  *origin* contest, so `:where(.oo-x) { display: block }` defeats `hidden` exactly as
  hard as a bare class does. Getting this backwards would produce a false negative on
  precisely the idiom v1.3 used for `.oo-stat-value`.
- **`display: var(…)` is skipped**, not guessed at. It cannot be resolved statically and
  a fabricated verdict is worse than an honest gap (recorded in §4).
- `tokens.css` is scanned too. It declares no `display` today; scanning it is free and
  means a `display` landing there is not invisible.

Zero dependencies — `node:fs`, `node:url`, `node:path` only. No `package.json`, no
install step. Executable (`#!/usr/bin/env node`), so it runs as
`./experiments/verify-contract.mjs`, the same shape as `./verify-lab.sh`. `--list` prints
the guarded/unguarded inventory; otherwise it is quiet on success — one `PASS` line, the
discipline `verify-lab.sh` follows.

**Why `experiments/`.** `CLAUDE.md` keeps the repo root thin (`CLAUDE.md`, `README.md`,
`DESIGN.md`, `tokens.css`, `components.css`, `index.html`, `examples/`, `experiments/`),
so a new top-level file or a new top-level `tools/` directory is out. `experiments/` is
already where this repo's verification harness lives — `verify-lab.sh` is there, and this
is its `verify-*` sibling, discovered by anyone who has ever run the existing one. The
alternative, hiding the script inside `.github/`, would have made the local and CI paths
diverge in feel and buried the one file a contract author needs to know exists.

### 1.2 `.github/workflows/contract.yml`

`on: [push, pull_request]`. One job, two steps: `actions/checkout@v4`, then
`node experiments/verify-contract.mjs`. No matrix, no cache, and no `actions/setup-node`
— the check imports only `node:fs` and the runner's preinstalled `node` covers it;
adding `setup-node` would imply a toolchain this repo does not have.

The workflow file states in a comment that CI **does not** run `verify-lab.sh`, and why:
that harness needs a real Chrome with WebGL and a GPU, samples animated three.js frames,
and applies by-eye composition gates. On a headless runner it would be flaky, and a
flaky first check is a check that gets disabled. Lab verification stays local and manual.

---

## 2. Verification

### 2.1 Passes at `HEAD` (182f1fc), and says what it measured

```
$ ./experiments/verify-contract.mjs
PASS [contract] 10/10 display-declaring classes carry a [hidden] guard
```

`--list` enumerates them — the same ten the v1.5 receipt's §2 table names, independently
derived from the stylesheet rather than copied from the table:

```
guarded  .oo-btn         display: inline-flex   (components.css:217)
guarded  .oo-cursor      display: inline-block  (components.css:96)
guarded  .oo-dot         display: inline-block  (components.css:92)
guarded  .oo-grid-2      display: grid          (components.css:176)
guarded  .oo-grid-3      display: grid          (components.css:178)
guarded  .oo-grid-4      display: grid          (components.css:179)
guarded  .oo-rail        display: flex          (components.css:61)
guarded  .oo-stat-delta  display: block         (components.css:205)
guarded  .oo-stat-value  display: block         (components.css:190)
guarded  .oo-tickwrap    display: inline-block  (components.css:134)
```

### 2.2 Mutation A — a new contract class that declares `display` (the real failure mode)

Added `.oo-toolbar { display: flex; gap: 12px; align-items: center; }` after `.oo-prose`
and did **not** add it to the `[hidden]` rule — exactly the mistake the check exists to
catch.

```
FAIL [contract] 1 [hidden]-guard parity error(s) in components.css + tokens.css
  MISSING GUARD  .oo-toolbar declares `display: flex` at components.css:228 but is absent from the [hidden] rule — it will override the UA `[hidden] { display: none }`. Add `.oo-toolbar[hidden]` to that rule.
exit=1
```

`grep -n oo-toolbar components.css` → `228:` — the reported line is the right line, not
an approximation. Reverted with `git checkout -- components.css`; `git status --porcelain`
then showed only the untracked new script, and the check returned to `PASS`.

### 2.3 Mutation B — reverse direction, a class removed from the guard rule

Deleted the `.oo-rail[hidden],` line from the guard:

```
FAIL [contract] 1 [hidden]-guard parity error(s) in components.css + tokens.css
  MISSING GUARD  .oo-rail declares `display: flex` at components.css:61 but is absent from the [hidden] rule — it will override the UA `[hidden] { display: none }`. Add `.oo-rail[hidden]` to that rule.
exit=1
```

Reverted; `git status --porcelain` clean but for the untracked script.

### 2.4 Mutation C — rot detection (`STALE GUARD`), on a scratch copy

Renamed `.oo-dot` → `.oo-pip` and left the guard rule alone. Both halves of the parity
fire, which is what a rename should produce:

```
FAIL [contract] 2 [hidden]-guard parity error(s) in components.css + tokens.css
  MISSING GUARD  .oo-pip declares `display: inline-block` at components.css:92 but is absent from the [hidden] rule — …
  STALE GUARD    .oo-dot[hidden] is listed at components.css:266 but .oo-dot declares no `display` other than `none` — the guard rule has rotted (class renamed or removed?). …
```

### 2.5 Mutation D — `display` declared only inside `@media`

Added `display: flow-root` to `.oo-plate-card` inside the `max-width: 720px` query:

```
  MISSING GUARD  .oo-plate-card declares `display: flow-root` at components.css:291 but is absent from the [hidden] rule — …
```

Caught, and at the in-query line. Media-query declarations are neither missed nor
mis-attributed to the base rule.

### 2.6 Mutation E — the comment block does not fool it (both directions)

Injected into a comment: a fake rule `.oo-fake-in-comment { display: grid; }`, a prose
class list `.oo-stage · .oo-grid-2`, and a guard **lookalike**
`.oo-btn[hidden] { display: none; }`.

```
PASS [contract] 10/10 display-declaring classes carry a [hidden] guard
```

`.oo-fake-in-comment` was not demanded — comments are not read as rules. And the
stronger half: with that commented guard lookalike still sitting in the file, the *real*
`.oo-btn[hidden]` entry was replaced with `.oo-tape[hidden]`, and the check still failed:

```
  MISSING GUARD  .oo-btn declares `display: inline-flex` at components.css:217 but is absent from the [hidden] rule — …
  STALE GUARD    .oo-tape[hidden] is listed at components.css:268 but .oo-tape declares no `display` other than `none` — …
```

So a commented-out guard cannot satisfy the assertion either. The pre-existing header
inventory (lines 18–32) is proof by default: `.oo-stage`, `.oo-plate`, `.oo-specimen`,
`.oo-overlay` and the rest are listed there in prose and appear in no output.

### 2.7 Mutation F/G — selector-subject handling

- `:where(.oo-ghost) { display: block }` → **caught** (`MISSING GUARD … components.css:201`).
  A zero-specificity author `display` still beats the UA origin, so it must be caught,
  and it is.
- `.oo-plate-card:not(.oo-scanbeam) { … display: flow-root }` → **`.oo-plate-card`
  reported, `.oo-scanbeam` not**. The negation argument is not treated as a subject.

### 2.8 `.oo-scanbeam` produces no false failure

It appears in **no** output of any run above, including the clean `PASS` and `--list`.
Not by exemption — it is simply not in the required set, because its only `display` in
the sheet is `none`. A check that cries wolf on day one gets disabled; this one does not
name the class at all.

### 2.9 Constraints honoured

`git diff` empty after every mutation revert; the two required mutations were made on the
real file and reverted with `git checkout -- components.css`, the other five on a scratch
copy under `/tmp`. Not modified: `tokens.css`, `components.css`, `index.html`,
`examples/`, `experiments/verify-lab.sh`, every lab `.html`/`.js`/receipt,
`experiments/lab-chrome.css`. No `git add -A` — paths staged explicitly. Nothing pushed.

---

## 3. Critique — keep / watch

**Keep:**

- **Derived exemption, no allow-list.** The single most important property. If the check
  had shipped with `const EXEMPT = ['oo-scanbeam']`, the next `display: none`-only class
  would either fail spuriously or get appended to a second hand-maintained list, and the
  v1.5 lesson would have been re-learned at one remove.
- **Both directions asserted.** `MISSING GUARD` alone would let the rule accumulate
  entries for classes that no longer exist and quietly stop describing the sheet.
- **Named class + exact line on failure.** The reported line is the `display` declaration
  itself, verified against `grep -n` in §2.2, so the message points at the fix site.
- **`node:fs` only.** The repo's whole claim is "no build, no framework, no
  dependencies"; a CI that installed a CSS parser would have made that claim false to
  add a check that protects it.

**Watch:**

- **It is a scanner, not a CSS-spec-complete parser.** Sized to this sheet: flat rules,
  `@media` / `@supports` / `@keyframes`, plain comments. Native CSS nesting, `@layer`,
  `@container`, or `@import`-ed sheets are unexercised territory. The failure mode is
  believed to be a missed rule (false pass) rather than a false alarm, but that is
  reasoned, not measured — nothing in this repo uses those features yet.
- **`display: var(--x)` is skipped.** Currently unused in the contract. If a token-driven
  `display` ever ships, this check goes quiet on it without saying so — the one place the
  script is deliberately silent rather than loud, and the one worth revisiting first.
- **`STALE GUARD` is a hard failure.** Correct for a contract that guards only classes it
  owns, and it is what caught the rename in §2.4. But it would also fire if someone
  deliberately guarded a class defined outside these two files — which the v1.5 scope
  discipline forbids, so the strictness is intentional rather than accidental.
- **One assertion is one assertion.** A green check on this workflow says the `[hidden]`
  parity holds. It says nothing else about the contract, and the workflow comment says so
  in the file so nobody reads the badge as broader coverage.

---

## 4. What this does NOT cover

- **Nothing visual.** No rendering, no screenshots, no computed-style comparison. The
  v1.5 fix was proved correct by DevTools measurement (`CONTRACT-V15-RECEIPT.md` §7.2);
  this check only proves the *list* stays complete. It would happily pass a guard rule
  whose declaration had been corrupted to something other than `display: none` — it
  requires a `display: none` to recognise the rule as a guard at all, so a corrupted
  guard degrades into "not a guard" and surfaces as `MISSING GUARD`, but the check never
  confirms the rule actually hides anything in a browser.
- **`verify-lab.sh` is not run in CI**, by decision — real Chrome, WebGL, GPU, animated
  frames, by-eye gates. The five labs are still verified locally and manually.
- **Consumers are still on their own.** A consumer's own `display`-declaring class still
  defeats `hidden`, and this check does not look at `examples/`, `index.html`,
  `experiments/lab-chrome.css`, or any consumer page. That boundary is the contract's
  documented scope discipline, not an oversight — but it also means the check protects
  the contract only.
- **The other v1.5 owed items are untouched:** the `README.md` note about the general
  consumer-side hazard, the `.oo-stage` 1080px cap, the `--oo-vignette-*` knob, the dense
  `.oo-stat` variant, and `depth-tape`'s pre-existing `?render=fallback` assertion.
- **The `▲ TRAP` note at `components.css:10-16` still says "must be added to that rule
  too" with no mention of the check.** That is now an incomplete instruction — the author
  who violates it will be told by CI, and the note is where they would look for that
  fact. Not edited here: `components.css` is out of scope for this branch by constraint.
  **Flagged for Ayaz's decision**, not assumed.
