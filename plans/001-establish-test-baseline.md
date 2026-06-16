# Plan 001: Establish a verification baseline with `node --test`

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 67d9297..HEAD -- src/ build.js package.json`
> If any in-scope file has changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `67d9297`, 2026-06-17

## Why this matters

There is currently no way to know the editor works other than running the build and visually checking the landing page. CLAUDE.md names bundle size as "the single most important property," but bundle size only matters if the code in those bytes is correct. Plans 002, 003, and the eventual size-guard work all become safer once we can run a one-line check that says "yes, the editor still works." This plan adds the smallest possible verification layer: pure-function unit tests for the Markdown round-trip and a smoke test that confirms the built bundle imports without error.

## Current state

- `package.json:42-45` has only `build` and `prepublishOnly` scripts; no `test`. No test directory exists.
- `src/markdown.js` exports `toHtml(md)` and `toMd(html)`. `toMd` calls `new DOMParser().parseFromString(...)` — Node has no `DOMParser` natively, so tests that touch `toMd` need `jsdom`.
- `src/index.jsx` and `src/core.jsx` are React components — full render testing is out of scope for this plan; we will only verify the built bundle can be `require`d / imported.

Relevant code excerpt — `src/markdown.js:10-31`:

```js
export function toHtml(md) {
  if (!md) return "";
  return md
    .split(/\n{2,}/)
    .map((block) => {
      const b = block.trim();
      if (!b) return "";
      if (b.startsWith("## ")) return `<h2>${inline(b.slice(3))}</h2>`;
      ...
    })
    .filter(Boolean)
    .join("");
}
```

Conventions: the repo has no existing tests, so there is no exemplar to match. Use `node:test` (built-in, no Jest/Vitest dep). Use `node:assert/strict`. Test files live under `tests/` and end in `.test.mjs` so Node's loader treats them as ESM.

## Commands you will need

| Purpose         | Command                              | Expected on success                |
|-----------------|--------------------------------------|------------------------------------|
| Install         | `npm install`                        | exit 0                             |
| Build           | `npm run build`                      | prints "built:" + four size lines  |
| Test (new)      | `npm test`                           | exit 0, all tests pass             |

## Scope

**In scope** (the only files you should modify):
- `package.json` — add `test` script, add `jsdom` to `devDependencies`
- `tests/markdown.test.mjs` (create)
- `tests/bundle-smoke.test.mjs` (create)
- `tests/_jsdom-setup.mjs` (create — small helper that installs `DOMParser` from jsdom onto `globalThis`)
- `README.md` — append "Tests" subsection under the "## Size" or "## License" area documenting `npm test`

**Out of scope** (do NOT touch, even though they look related):
- Anything under `src/` — this plan adds tests against the *current* behavior; it does not change behavior. If a test fails because of a real bug, file it as a STOP and write a separate plan.
- `build.js` — size enforcement is plan 002.
- `themes/*.css` — CSS not under test in this baseline.
- `index.html` — landing page is not the published artifact.

## Git workflow

- Branch: already on `audit/improve-2026-06-17` (created during planning). Stay on it.
- Commit per logical unit. Match the repo's existing style (see `git log --oneline`): short imperative subject, `feat:` / `chore:` / `test:` prefix, body explains the why, trailer `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` when produced by Claude.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add `jsdom` and the `test` script

Edit `package.json`:

- Add `"test": "node --test tests/"` to `scripts`.
- Add `"jsdom": "^25.0.0"` to `devDependencies`.

Run `npm install`.

**Verify**: `npm test` → exits 0 with "0 tests" output (no tests exist yet). It is acceptable if Node prints "tests: 0".

### Step 2: Create the jsdom setup helper

Create `tests/_jsdom-setup.mjs`:

```js
import { JSDOM } from "jsdom";
const { window } = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.DOMParser = window.DOMParser;
globalThis.document = window.document;
globalThis.window = window;
```

This file has no tests; it is imported by tests that need a DOM.

### Step 3: Markdown round-trip tests

Create `tests/markdown.test.mjs`. Cover at minimum these cases — each `assert.equal` is its own test:

```js
import "./_jsdom-setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { toHtml, toMd } from "../src/markdown.js";

test("toHtml: heading", () => {
  assert.equal(toHtml("## Hello"), "<h2>Hello</h2>");
});

test("toHtml: paragraph with bold and italic", () => {
  assert.equal(toHtml("a **b** c *d* e"), "<p>a <strong>b</strong> c <em>d</em> e</p>");
});

test("toHtml: unordered list", () => {
  assert.equal(toHtml("- one\n- two"), "<ul><li>one</li><li>two</li></ul>");
});

test("toHtml: link", () => {
  assert.equal(toHtml("[t](https://x.com)"), '<p><a href="https://x.com">t</a></p>');
});

test("toHtml: empty input", () => {
  assert.equal(toHtml(""), "");
});

test("toMd: heading", () => {
  assert.equal(toMd("<h2>Hello</h2>"), "## Hello");
});

test("toMd: bold", () => {
  assert.equal(toMd("<p>a <strong>b</strong> c</p>"), "a **b** c");
});

test("toMd: list", () => {
  assert.equal(toMd("<ul><li>one</li><li>two</li></ul>"), "- one\n- two");
});

test("toMd: empty input", () => {
  assert.equal(toMd(""), "");
});

test("round-trip stability: paragraph + bold", () => {
  const md = "Hello **world**";
  assert.equal(toMd(toHtml(md)), md);
});
```

**Verify**: `npm test` → all tests pass.

> If any of the assertions fail, the test has caught real behavior that doesn't match the assertion. STOP and report which assertion failed and what the actual output was — do not "fix" the test until you've checked whether the *code* or the *assertion* is wrong.

### Step 4: Bundle smoke test

Create `tests/bundle-smoke.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

test("dist artifacts exist after build", () => {
  assert.ok(existsSync("dist/index.esm.js"), "missing dist/index.esm.js");
  assert.ok(existsSync("dist/index.js"), "missing dist/index.js");
  assert.ok(existsSync("dist/core.esm.js"), "missing dist/core.esm.js");
  assert.ok(existsSync("dist/core.js"), "missing dist/core.js");
});

test("dist/core.js is a valid CJS module", async () => {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const mod = require("../dist/core.js");
  assert.equal(typeof mod.default, "function", "Editor default export should be a function");
});
```

> The smoke test deliberately uses the CJS bundle because importing the ESM bundle would resolve `react` from the project root, which isn't installed at runtime in the published consumer's environment. CJS `require` keeps the test self-contained — esbuild externalises `react`, so requiring `dist/core.js` from Node fails fast with a clear error if the bundle structure changes in a way that breaks consumers.

Run `npm run build` first so the artifacts exist, then `npm test`.

**Verify**: `npm run build && npm test` → all tests pass, including the four-existence checks and the require-and-typeof check.

> If `require("../dist/core.js")` throws `Cannot find module 'react'`, this is expected behavior of the externalised React peer dep — but the test as written should still pass because it only `require`s the file from a path where `react` resolves via the project's `node_modules`. If it fails with that error, STOP and report; the published bundle structure has changed.

### Step 5: Document the test command

Append to `README.md` under a new `## Development` heading (place it just above `## License`):

```markdown
## Development

```bash
npm install
npm run build   # builds both bundles, prints gzipped sizes
npm test        # runs the markdown round-trip + bundle smoke tests
```
```

**Verify**: `grep -q "npm test" README.md && echo OK` → prints `OK`.

### Step 6: Commit

Commit message:

```
test: establish verification baseline with node:test

Adds markdown round-trip unit tests and a bundle smoke test, plus a
jsdom helper so toMd can run in Node. No source-code changes; this only
adds the harness that lets future changes ship with confidence.
```

(Single commit covering all four created files plus `package.json` and `README.md`.)

## Test plan

- New tests live at `tests/markdown.test.mjs` (10 assertions) and `tests/bundle-smoke.test.mjs` (2 assertions).
- No existing test to use as a structural pattern (this is the baseline).
- Verification: `npm run build && npm test` → 12 assertions pass.

## Done criteria

ALL must hold:

- [ ] `npm install` exits 0 with `jsdom` resolved.
- [ ] `npm run build` exits 0 and produces all four `dist/*.js` files.
- [ ] `npm test` exits 0 with 12 passing assertions and 0 failures.
- [ ] `git status` shows only the in-scope files modified or created.
- [ ] `plans/README.md` status row for plan 001 updated to `DONE`.

## STOP conditions

Stop and report back if:

- Any of the markdown round-trip assertions in Step 3 fail. The assertion documents current behavior — a failure means the code does something other than expected, which is a finding for a separate plan, not a test-fix.
- `jsdom` install fails on Node 18 or older. The project's `package.json` does not currently pin an `engines` field; if jsdom needs a newer Node, that's its own decision and worth surfacing.
- `npm test` exits with a Node deprecation warning that breaks parsing. The `node --test` runner is stable since Node 20; if you are on Node 18, switch to `node --test --experimental-vm-modules` and report.

## Maintenance notes

For the human/agent who owns this code after the change lands:

- This is the **verification floor**, not full coverage. Plans 002 (size guard) and 003 (XSS sanitization) build on it. When 003 lands, its tests will sit alongside `markdown.test.mjs`.
- The bundle smoke test will catch a class of bundling regressions (missing default export, accidentally inlining React) but won't catch behavioral regressions of the React component itself. A future plan should add a `react-dom/server.renderToString` test once we have a concrete failure mode to assert against.
- `node:test` parallelizes test files by default. If a future test file needs serial execution (e.g. modifies `globalThis`), use `node --test --test-concurrency=1`.
