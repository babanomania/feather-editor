# Plan 003: Sanitize URLs in the link toolbar prompt and Markdown link parser

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 67d9297..HEAD -- src/index.jsx src/markdown.js tests/`
> If any in-scope file has changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plan 001 (tests are needed to verify the fix; this plan adds new test cases to the harness 001 establishes)
- **Category**: security
- **Planned at**: commit `67d9297`, 2026-06-17

## Why this matters

Two code paths emit `<a href="…">` from values the editor's caller cannot easily control:

1. **Toolbar createLink button** (`src/index.jsx:13-22`) calls `window.prompt("Link URL", "https://")` and passes whatever the user types to `document.execCommand("createLink", false, url)`. Browsers do not sanitize the URL — entering `javascript:alert(1)` produces an anchor that executes script when clicked.
2. **Markdown `[text](url)` parser** (`src/markdown.js:5`) matches the URL with a greedy regex and substitutes it verbatim into `<a href="$2">$1</a>`. The same `javascript:` payload in source Markdown becomes a working XSS vector.

Both paths share the same root cause: there is no URL-scheme check. The fix is a single, very small helper applied at both sites. It introduces no dependencies and changes no public API. It cannot ship safely without plan 001's test harness — that's the dependency.

## Current state

`src/index.jsx:13-22` (the createLink branch of the toolbar button handler):

```jsx
onMouseDown={(e) => {
  e.preventDefault();
  ref.current?.focus();
  if (c === "createLink") {
    const url = window.prompt("Link URL", "https://");
    if (url) cmd(c, url);
  } else {
    cmd(c, v);
  }
  sync();
}}
```

`src/markdown.js:3-8` (the `inline` substitutions):

```js
const inline = (s) =>
  esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/__([^_]+)__/g, "<u>$1</u>");
```

Note: `src/core.jsx` does NOT include a link button (intentional — it's the byte-minimal variant). No createLink path exists there. Only `src/index.jsx` and `src/markdown.js` are affected.

The repo conventions (from CLAUDE.md): "every prop adds bytes," identifiers are short for byte reasons, no dependencies. The helper must be small and inline; do not import a URL parser library.

## Commands you will need

| Purpose       | Command            | Expected on success                                                                |
|---------------|--------------------|------------------------------------------------------------------------------------|
| Install       | `npm install`      | exit 0                                                                             |
| Build         | `npm run build`    | exit 0, sizes still within plan 002 budgets if 002 has landed                       |
| Tests         | `npm test`         | exit 0; pre-existing assertions from plan 001 still pass, new ones from this plan also pass |

## Scope

**In scope** (the only files you should modify):
- `src/markdown.js` — add `safeUrl` helper, call it in the link replacement
- `src/index.jsx` — call `safeUrl` on the prompt result before `cmd("createLink", ...)`. Import the helper from `markdown.js` (it's the natural home; no extra file).
- `tests/markdown.test.mjs` — add assertions covering the new behavior

**Out of scope** (do NOT touch):
- `src/core.jsx` — has no link button; touching it would expand bundle size unnecessarily.
- The toolbar prompt UX (no toast on rejection, no error message). A future plan can improve UX once the security floor is in place.
- README copy — plan 004 handles the trust-boundary documentation.

## Git workflow

- Branch: stay on the current branch (`audit/improve-2026-06-17`).
- One commit covering all three files.
- Commit style: `fix(security): block javascript:/data:/vbscript: URLs in link inputs`.

## Steps

### Step 1: Add `safeUrl` to `src/markdown.js`

At the top of `src/markdown.js`, above `esc`, add:

```js
// Block URL schemes that execute script when followed.
// Matches the trimmed input case-insensitively against a fixed list.
// Anything that isn't dangerous is returned unchanged — relative URLs,
// fragments, https, mailto, tel all pass through.
const UNSAFE_SCHEME = /^(javascript|data|vbscript):/i;
export const safeUrl = (u) => (UNSAFE_SCHEME.test(String(u).trim()) ? "" : u);
```

Two design notes the executor must preserve:

- The regex anchors to start-of-string after `trim()`. Do not allow embedded whitespace to bypass it (`" javascript:..."` must still be blocked — `trim()` handles that).
- Returning `""` rather than throwing keeps the existing call sites' control flow (`if (url) cmd(...)`) working: an empty string is falsy and the call is skipped.

### Step 2: Use `safeUrl` in the markdown link substitution

Change `src/markdown.js:5` from:

```js
.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
```

to:

```js
.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
  const safe = safeUrl(url);
  return safe ? `<a href="${safe}">${text}</a>` : text;
})
```

Behavior:
- Dangerous URL → the link is stripped, the visible text is preserved. No href attribute is emitted, so there is nothing to click.
- Safe URL → identical output to today.

### Step 3: Use `safeUrl` in the toolbar prompt

Edit `src/index.jsx`:

1. Add `safeUrl` to the existing import: `import { toHtml, toMd, safeUrl } from "./markdown.js";`
2. Replace lines 16–18 (the `if (c === "createLink")` block) with:

```jsx
if (c === "createLink") {
  const raw = window.prompt("Link URL", "https://");
  const url = raw && safeUrl(raw);
  if (url) cmd(c, url);
} else {
  cmd(c, v);
}
```

Same outcome shape: empty/blocked URL → no `cmd` call. The toolbar visibly does nothing on a rejected URL (acceptable; UX polish is a separate plan).

### Step 4: Add tests

Append to `tests/markdown.test.mjs`:

```js
import { safeUrl } from "../src/markdown.js";

test("safeUrl: blocks javascript:", () => {
  assert.equal(safeUrl("javascript:alert(1)"), "");
});

test("safeUrl: blocks JavaScript: (case-insensitive)", () => {
  assert.equal(safeUrl("JaVaScRiPt:alert(1)"), "");
});

test("safeUrl: blocks data: URLs", () => {
  assert.equal(safeUrl("data:text/html,<script>alert(1)</script>"), "");
});

test("safeUrl: blocks vbscript:", () => {
  assert.equal(safeUrl("vbscript:msgbox()"), "");
});

test("safeUrl: blocks with leading whitespace", () => {
  assert.equal(safeUrl("  javascript:alert(1)"), "");
});

test("safeUrl: allows https", () => {
  assert.equal(safeUrl("https://example.com"), "https://example.com");
});

test("safeUrl: allows relative URLs", () => {
  assert.equal(safeUrl("/path/to/page"), "/path/to/page");
});

test("safeUrl: allows mailto", () => {
  assert.equal(safeUrl("mailto:a@b.com"), "mailto:a@b.com");
});

test("toHtml: strips javascript: link but keeps the text", () => {
  const out = toHtml("[click me](javascript:alert(1))");
  assert.equal(out, "<p>click me</p>");
  assert.ok(!out.includes("javascript:"), "javascript: leaked through");
  assert.ok(!out.includes("href"), "href emitted for unsafe URL");
});

test("toHtml: keeps safe link", () => {
  assert.equal(
    toHtml("[click](https://example.com)"),
    '<p><a href="https://example.com">click</a></p>',
  );
});
```

### Step 5: Verify

```
npm run build && npm test
```

**Expected**:
- Build exits 0; sizes within budget (per plan 002, if landed). The added helper is roughly 80 bytes raw, ~30 bytes gzipped — well within the 15–20% headroom budgets in plan 002.
- All previous tests still pass (10 from plan 001 + 2 from plan 002 smoke).
- All 10 new assertions from this plan pass.
- Total test count: ≥22 passing, 0 failing.

> If `dist/index.esm.js` now exceeds its budget, STOP and report. Do not bump the budget to compensate — investigate first; the helper should be small enough that this shouldn't happen.

### Step 6: Commit

```
fix(security): block javascript:/data:/vbscript: URLs in link inputs

Adds a small safeUrl() helper used by both the toolbar createLink
prompt (src/index.jsx) and the Markdown [text](url) parser
(src/markdown.js). Dangerous schemes return "" so the existing
falsy-skip control flow drops the link cleanly; visible text is kept.

Tests cover the helper directly and the toHtml integration.

No deps added; helper is ~30 B gzipped.
```

## Test plan

- New assertions live in `tests/markdown.test.mjs` (10 assertions added).
- They follow the same structural pattern as plan 001's tests.
- Verification: `npm test` exits 0; all assertions pass.

## Done criteria

ALL must hold:

- [ ] `safeUrl` exported from `src/markdown.js`.
- [ ] Markdown link regex uses `safeUrl`; an unsafe URL produces plain text (no `<a>` tag).
- [ ] `src/index.jsx` calls `safeUrl` before `cmd("createLink", ...)`.
- [ ] `npm test` exits 0 with ≥22 passing assertions.
- [ ] `npm run build` exits 0; sizes still within budgets (plan 002).
- [ ] `git status` shows only the in-scope files modified.
- [ ] `plans/README.md` status row for plan 003 updated to `DONE`.

## STOP conditions

Stop and report if:

- Adding the helper pushes `dist/index.esm.js` above its budget (plan 002). The helper is intentionally tiny; if it bloats, esbuild or React JSX runtime changed behavior and the issue is upstream.
- `src/core.jsx` ends up modified. This plan must not touch it; if you find yourself wanting to, you've misread the scope.
- The repo gains a `src/index.test.jsx` (full React component test). That's a desirable follow-up but is its own plan with its own dep on (e.g.) `@testing-library/react` — not in scope here.

## Maintenance notes

- The blocklist is intentionally narrow: only schemes that execute script. We deliberately do NOT block FTP, file:, or unknown schemes — that's a different threat model (link integrity, not script execution).
- If a future plan introduces an HTML pasting flow (currently the editor uses `dangerouslySetInnerHTML` with the prop, which is the consumer's responsibility), revisit whether to also `safeUrl`-filter pasted anchors. Plan 004 documents the trust boundary for that case.
- A reviewer should scrutinize: case-sensitivity of `UNSAFE_SCHEME`, behavior on `null`/`undefined` (handled by `String(u)`), and that `core.jsx` is unchanged.
