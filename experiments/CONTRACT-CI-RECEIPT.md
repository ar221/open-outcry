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

**Contract behaviour is untouched.** `tokens.css`, `index.html`, `examples/`, and every
pre-existing `experiments/` file are byte-identical. Two files were added. `components.css`
carries exactly one **comment-only** edit — the `▲ TRAP` note now points at the check
(approved on review) — which alters no declaration and no computed style, so
`components.css` stays **v1.5** with no version bump.

**Post-review revision.** The first cut of this check was reviewed adversarially and
**four holes were found, three of them false PASSES** — for a guard, the worst failure
mode available, because a false PASS silently permits the exact bug the check exists to
catch. All four are closed and each is recorded with its adversarial input and its
post-fix output in §2.9. The scanner now also **refuses loudly** on constructs it cannot
analyse rather than guessing.

---

## 1. What shipped

### 1.1 `experiments/verify-contract.mjs`

One assertion, both directions:

| Failure | Meaning |
|---|---|
| `MISSING GUARD` | class declares a `display` other than `none` and is absent from the `[hidden]` rule — the v1.5 bug, reintroduced |
| `STALE GUARD` | class is named in the `[hidden]` rule but declares no non-`none` `display` — the rule rotted (renamed / deleted class) |
| `BAD GUARD` | a rule that *looks* like a guard but does not hold contract-wide: nested in an at-rule, descendant-scoped, type-qualified, compound-scoped, or narrowed by a functional pseudo-class |
| `UNSUPPORTED` | a construct the scanner cannot analyse — native CSS nesting, or `display: var(…)`. **Hard fail on purpose.** A check that refuses to answer is honest; one that answers wrongly is not |

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
- **A guard is accepted only in the shape `.class[hidden]`** (plus argument-less
  pseudo-classes). Nested in an at-rule, descendant-scoped (`.oo-pane .oo-x[hidden]`),
  type-qualified (`a.oo-x[hidden]`), compound-scoped (`.oo-x.oo-y[hidden]`), or narrowed
  by a functional pseudo-class — all `BAD GUARD`, never silently honoured. Each of those
  holds only in a context, and the contract-wide guard must hold everywhere.
- **The `[hidden]` test runs AFTER `:not()` stripping**, so `.oo-x:not([hidden])` — which
  applies precisely when the element is *not* hidden — cannot pose as a guard.
- **A `;` at bracket depth zero resets the prelude buffer**, so a top-level `@import` or
  `@charset` cannot swallow the rule that follows it.
- **Any rule containing a nested block, or an `&`, is refused outright.** Nesting support
  was deliberately not built; the scanner says what it cannot verify instead.
- **`:not(…)` arguments are dropped; `:is(…)` / `:where(…)` arguments are unwrapped.** A
  `:not()` argument is a negation and never the subject. An `:is()`/`:where()` argument
  *is* the subject — and zero specificity is irrelevant here, because this is a cascade
  *origin* contest, so `:where(.oo-x) { display: block }` defeats `hidden` exactly as
  hard as a bare class does. Getting this backwards would produce a false negative on
  precisely the idiom v1.3 used for `.oo-stat-value`.
- **`display: var(…)` is refused, not skipped.** It cannot be resolved statically, so
  neither verdict is available; skipping it would be a false PASS on a class that may well
  owe a guard. It now hard-fails with `UNSUPPORTED`. Zero such declarations exist today,
  so this cannot cry wolf on the current sheet.
- `tokens.css` is scanned too — and it is **not** dead weight, as review confirmed: it
  carries real class selectors (`.reg-broadcast` at `tokens.css:83` and siblings), so a
  `display` landing on a register alias would be caught rather than invisible.

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

`permissions: contents: read` (added on review). The repo default may be read-write, and a
checkout-only job has no business holding a writable `GITHUB_TOKEN`. `on: [push,
pull_request]` stays as-is — same-repo PRs run the check twice, which is fine for a first
check and cheaper than the conditional needed to avoid it.

The workflow file states in a comment that CI **does not** run `verify-lab.sh`, and why:
that harness needs a real Chrome with WebGL and a GPU, samples animated three.js frames,
and applies by-eye composition gates. On a headless runner it would be flaky, and a
flaky first check is a check that gets disabled. Lab verification stays local and manual.

---

## 2. Verification

### 2.1 Passes against the contract as shipped, and says what it measured

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

### 2.9 Adversarial review — four holes, three of them false PASSES, all closed

Review constructed inputs I had not tested. Every one below is quoted with the verdict
**before** the fix and the verbatim output **after**. All six regressions in §2.2–2.8 were
re-run against the fixed scanner and behave identically; `HEAD` still returns the same
`PASS [contract] 10/10`, so none of these fixes was bought with a false alarm.

**Finding 1 — descendant-scoped and type-qualified guards were accepted contract-wide,
and poisoned the reverse check.** Every class in any `[hidden]`-bearing compound was
registered as guarded, so a guard that only holds inside an ancestor satisfied the
assertion — and the ancestor itself got reported as rotted.

Input: `.oo-newx { display: grid; }` + `.oo-pane .oo-newx[hidden] { display: none; }`
Before: **FAIL for the wrong reason** — `.oo-newx` silently accepted, and
`STALE GUARD .oo-pane[hidden] …`, a spurious complaint about a class nobody guarded.
After:

```
FAIL [contract] 2 [hidden]-guard parity error(s) in components.css + tokens.css
  MISSING GUARD  .oo-newx declares `display: grid` at components.css:293 but is absent from the [hidden] rule — it will override the UA `[hidden] { display: none }`. Add `.oo-newx[hidden]` to that rule.
  BAD GUARD      components.css:294 `.oo-pane .oo-newx[hidden]` is not a contract-wide guard — it is scoped (descendant, type-qualified, compound, or narrowed by a functional pseudo-class), so it only holds in that context. Use a bare `.class[hidden]` entry.
```

Input: `.oo-newz { display: grid; }` + `a.oo-newz[hidden] { display: none; }`
Before: **PASS — false.** After:

```
  MISSING GUARD  .oo-newz declares `display: grid` at components.css:293 but is absent from the [hidden] rule — …
  BAD GUARD      components.css:294 `a.oo-newz[hidden]` is not a contract-wide guard — it is scoped …
```

The fix accepts a guard compound only in the shape `.class[hidden]` (plus argument-less
pseudo-classes) and takes its subject from that compound alone — the same discipline the
at-rule case already had, now applied to selector scope as well.

**Finding 2 — `:not([hidden])` counted as a guard.** The `[hidden]` test ran on the raw
compound, *before* `:not()` stripping, so a semantically inverted rule satisfied the
assertion.

Input: `.oo-newy { display: grid; }` + `.oo-newy:not([hidden]) { display: none; }`
Before: **PASS — false.** After:

```
FAIL [contract] 1 [hidden]-guard parity error(s) in components.css + tokens.css
  MISSING GUARD  .oo-newy declares `display: grid` at components.css:293 but is absent from the [hidden] rule — it will override the UA `[hidden] { display: none }`. Add `.oo-newy[hidden]` to that rule.
exit=1
```

The test now runs on the `:not()`-stripped selector. A rule that applies exactly when the
element is *not* hidden can no longer pose as the rule that hides it.

**Finding 3 — a top-level `@import` or `@charset` silently swallowed the next rule.**
`rules()` never reset its prelude buffer on `;`, so the leftover `@import …` text prefixed
the following selector, that selector read as an at-rule prelude and was pushed on the
stack, and its rule was never yielded. Not triggered by today's sheet — but a
zero-dependency repo is one `@import` away from it, and the failure mode is an invisible
class and exit 0.

Input: `@import url("x.css");` + `.oo-nw2 { display: grid; }`
Before: **PASS — false**, `.oo-nw2` invisible. After:

```
  MISSING GUARD  .oo-nw2 declares `display: grid` at components.css:294 but is absent from the [hidden] rule — …
```

Fixed by resetting the buffer on a `;` at bracket depth zero — `balanced()` keeps a `;`
inside a quoted string or attribute value from counting.

**Finding 4 — native CSS nesting gave a false pass.** My receipt called this "reasoned,
not measured"; it is now measured, and the reasoning was right — the inner block's
`display` was read as part of the outer body and attributed to nothing.

Input: `.oo-nwb { color: red; &.x { display: grid; } }`
Before: **PASS — false.** After:

```
FAIL [contract] 1 [hidden]-guard parity error(s) in components.css + tokens.css
  UNSUPPORTED    components.css:293 `.oo-nwb` uses nested rules — this scanner cannot verify nesting. Flatten the rule, or teach the check before shipping it.
exit=1
```

Nesting support was **not** built, by direction. The scanner refuses instead — and the
same treatment now covers `display: var(…)`, which was previously skipped in silence:

```
  UNSUPPORTED    components.css:293 .oo-nwv declares `display: var(--oo-x)` — a var() display cannot be resolved statically, so this check cannot tell whether a [hidden] guard is owed. Inline a literal `display`, or teach the check.
```

**Collateral surprise, found by the reviewer and worth recording:** a class whose only
`display` is `none` but which *defensively* carries its own `[hidden]` entry hard-fails
`STALE GUARD`. Demonstrated by appending `.oo-scanbeam[hidden] { display: none; }`:

```
  STALE GUARD    .oo-scanbeam[hidden] is listed at components.css:293 but .oo-scanbeam declares no `display` other than `none` — the guard rule has rotted (class renamed or removed?). Drop the entry or restore the class.
```

That entry is **harmless at runtime** — it duplicates what the UA sheet already does — but
it breaks CI. This is the deliberate cost of `STALE GUARD` being a hard failure (upheld on
review): the rule is a description of which classes contest `[hidden]`, and a belt-and-braces
entry makes that description false. The remedy is to delete the redundant entry, and the
failure message says which one and where. Anyone who reaches for a defensive guard should
expect to be told no.

Review also independently verified as already correct: `display :grid` spacing, duplicate
`display` declarations in either order, multi-selector rules, `.oo-btn.oo-nw8` compounds,
`@layer`, `initial`/`unset`/`revert` falling through conservatively, and comment blanking
with line numbers preserved.

### 2.10 Constraints honoured

`git diff` empty after every mutation revert; the required mutations were made on the real
`components.css` and reverted with `git checkout -- components.css`, all others on a
scratch copy under `/tmp`. Not modified: `tokens.css`, `index.html`, `examples/`,
`experiments/verify-lab.sh`, every lab `.html`/`.js`/receipt, `experiments/lab-chrome.css`.
`components.css` carries the one approved comment-only `▲ TRAP` edit and nothing else —
`git diff` on it is 2 insertions / 1 deletion, all inside the header comment, so it stays
v1.5. No `git add -A` — paths staged explicitly. Nothing pushed.

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

- **It refuses rather than guesses.** The four review findings were all cases where the
  scanner answered a question it was not equipped to answer, and three answered *PASS*. The
  structural lesson is not "parse more CSS" — it is that the set of constructs the scanner
  understands must be closed, with everything outside it a hard failure. `UNSUPPORTED`
  exists to make that boundary enforceable rather than aspirational.
- **Guard acceptance is shape-checked, not substring-checked.** The original `/\[hidden/`
  test was the root cause of findings 1 and 2 — three distinct false passes from one lazy
  predicate.

**Watch:**

- **It is a scanner, not a CSS-spec-complete parser.** Sized to this sheet: flat rules,
  `@media` / `@supports` / `@keyframes`, plain comments. `@container` and `@import`-ed
  sheets remain unexercised. `@layer` was verified correct on review. Anything genuinely
  outside the scanner's competence should now surface as `UNSUPPORTED` rather than as a
  quiet PASS — but that guarantee is only as good as the constructs anyone has thought to
  try, which is exactly how the first four holes were found.
- **`STALE GUARD` is a hard failure** (upheld on review). It caught the rename in §2.4 and
  is what makes the guard rule a truthful description of the sheet. Its cost is the
  collateral case in §2.9: a harmless defensive entry breaks CI. Intentional, not
  accidental — but it is a trap someone will hit, and the fix is to delete their entry.
- **`UNSUPPORTED` is a blocking failure with no escape hatch.** If a legitimate future
  contract change needs native nesting or a token-driven `display`, CI blocks it until the
  scanner is taught. That is the intended trade — a guard should not be bypassable by
  accident — but it does mean the check can stand between the author and a valid change, and
  the message has to be good enough to explain why. It names the file, line, selector, and
  the two ways out.
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
- **Native CSS nesting is not verified** — measured, not assumed (§2.9, finding 4). A
  nested rule is refused with `UNSUPPORTED`, so the gap cannot masquerade as a pass, but the
  check genuinely cannot analyse `& …` blocks. Same for `display: var(…)`. Both are
  refusals, not coverage.
- **`@container` and `@import`-ed stylesheets are unexercised.** A top-level `@import` no
  longer swallows the following rule (finding 3), but the *imported* sheet is never read —
  a `display` declared in another file is invisible to this check. The contract is two
  files today and imports nothing.
- **The other v1.5 owed items are untouched:** the `README.md` note about the general
  consumer-side hazard, the `.oo-stage` 1080px cap, the `--oo-vignette-*` knob, the dense
  `.oo-stat` variant, and `depth-tape`'s pre-existing `?render=fallback` assertion.
- **Closed since the first draft:** the `▲ TRAP` note at `components.css:10-17` now points
  at the check (`— CI enforces this parity (experiments/verify-contract.mjs; run it before
  you push)`). Approved on review as comment-only; it alters no declaration, changes no
  computed style, and needed no version bump — `components.css` remains v1.5.
