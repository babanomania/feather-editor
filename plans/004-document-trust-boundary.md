# Plan 004: Document the editor's trust boundary in README and CLAUDE.md

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 67d9297..HEAD -- README.md CLAUDE.md`
> If either file has changed since this plan was written, re-read the current copy to make sure the new section integrates cleanly; on a meaningful structural change, treat as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: XS
- **Risk**: LOW
- **Depends on**: plan 003 (so the wording can accurately say "we sanitize URLs in toolbar input and Markdown links, but the HTML `value` and Markdown `markdown` props are still developer-trusted")
- **Category**: docs
- **Planned at**: commit `67d9297`, 2026-06-17

## Why this matters

Even after plan 003 ships, the editor still accepts arbitrary HTML via `value` (core mode) and arbitrary Markdown via `markdown` (full mode), and renders them with `dangerouslySetInnerHTML`. A developer reading the README's `<Editor value={savedHtml} ... />` example might reasonably wire it up against database content, paste-from-server data, or any other source they don't control. The library is not a sanitizer; it never claimed to be, but it also doesn't say it isn't. Stating the trust boundary explicitly — once, in the right section — closes the surprise gap.

## Current state

`README.md` "When not to use it" section currently lists *feature* gaps (collaborative editing, tables, document model, mobile quirks) but not the *trust* boundary. Most of the section reads:

```
## When not to use it

Reach for something heavier if you need any of:

- collaborative editing
- tables
- a real document model you can introspect
- bulletproof Markdown parsing for untrusted input
- mobile contenteditable quirks handled out of the box
```

The line "bulletproof Markdown parsing for untrusted input" hints at the issue but undersells it — the same concern applies to the HTML `value` prop in core mode, which isn't parsed by us at all.

`CLAUDE.md` "Things not to do" section lists conventions for contributors but does not warn against future contributions that would make the editor *appear* to sanitize when it doesn't.

## Commands you will need

| Purpose       | Command                                     | Expected                            |
|---------------|---------------------------------------------|-------------------------------------|
| Inspect       | `grep -n -A 2 "trust" README.md CLAUDE.md`  | new sections present after edit     |
| Build (opt)   | `npm run build`                             | exit 0                              |

No test changes.

## Scope

**In scope** (the only files you should modify):
- `README.md` — add a new `## Security` section between "When not to use it" and "Size".
- `CLAUDE.md` — append one bullet to "Things not to do".

**Out of scope** (do NOT touch):
- Code under `src/`. This plan is documentation only.
- The landing page `index.html`. The README is the source of truth for users; a future plan can mirror to the landing page.

## Git workflow

- Branch: stay on the current branch.
- One commit covering both files.
- Commit style: `docs: state the trust boundary for value and markdown props`.

## Steps

### Step 1: Add the README "Security" section

Insert this block immediately after the "## When not to use it" section and immediately before "## Size":

```markdown
## Security

`feather-editor` renders the `value` (core mode) or the result of `toHtml(markdown)` (full mode) directly into the editor via `dangerouslySetInnerHTML`. **It is not a sanitizer.** Treat both props as developer-trusted strings — the same trust level you'd apply to a string you're about to inject into the page with `innerHTML`.

If your application stores user-authored content and renders it back through this editor (a notes app, a CMS, a comment system), sanitize on the server before persisting or on the way out before rendering. [DOMPurify](https://github.com/cure53/DOMPurify) is the usual choice for HTML; for Markdown, render with a parser that escapes raw HTML by default (most do).

What we do guarantee:

- The toolbar's *link* button rejects URLs whose scheme is `javascript:`, `data:`, or `vbscript:`. Same for `[text](url)` links in the Markdown input to `toHtml`. A blocked link renders as plain text with no `href`.
- The library has zero runtime dependencies, so there is no transitive supply-chain surface.

What we do not do:

- Strip `<script>` tags from the HTML you pass in.
- Strip event-handler attributes (`onerror`, `onclick`, etc.) from elements you pass in.
- Run any general-purpose sanitization.

If you need any of the above, sanitize before handing the string to the editor.
```

### Step 2: Add the CLAUDE.md bullet

In the "Things not to do" section, append this bullet after the existing list:

```markdown
- Don't claim or imply the editor sanitizes input. We deliberately scope URL-scheme blocking (in `safeUrl`) narrowly to the toolbar prompt and Markdown link parser. The HTML `value` prop and the Markdown `markdown` prop pass through unchanged. Any change that adds general-purpose sanitization is a product decision, not a polish change — it adds bytes, runtime cost, and complexity, and it changes the documented contract.
```

### Step 3: Verify

```
grep -q "^## Security$" README.md && echo "README OK"
grep -q "sanitize" CLAUDE.md && echo "CLAUDE OK"
```

Both should print their `OK` line.

### Step 4: Commit

```
docs: state the trust boundary for value and markdown props

Adds a Security section to README clarifying that the editor renders
its inputs via dangerouslySetInnerHTML and is not a sanitizer, with
DOMPurify pointed at as the standard answer. Notes the narrow URL-
scheme blocking we do guarantee (after plan 003) and what we don't.

Adds a CLAUDE.md bullet so future contributors don't accidentally
expand the sanitization scope without a deliberate decision.
```

## Test plan

No tests. This is a documentation change.

## Done criteria

- [ ] `README.md` contains a `## Security` section between "## When not to use it" and "## Size".
- [ ] The section names `dangerouslySetInnerHTML`, points at DOMPurify, and lists what `safeUrl` does and does not cover.
- [ ] `CLAUDE.md` has the sanitization bullet appended to "Things not to do".
- [ ] `git status` shows only `README.md` and `CLAUDE.md` modified.
- [ ] `plans/README.md` status row for plan 004 updated to `DONE`.

## STOP conditions

Stop and report if:

- Plan 003 has not landed and the wording about `safeUrl` would mislead.
- The README has been restructured significantly since this plan was written and the proposed insertion point no longer exists.

## Maintenance notes

- If a `feather-editor/safe` subpath (direction option C from the audit) is ever added, update both files to mention it as the opt-in safe variant.
- Keep the Security section before the Size section deliberately — users reading top-to-bottom hit the safety guidance before they get excited about the size number.
