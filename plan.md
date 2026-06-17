# Resume here

This branch (`audit/improve-2026-06-17`) was created by an `/improve` audit on 2026-06-17 against `main` at commit `67d9297`. Four implementation plans are queued under `plans/`. The advisor (`/improve`) is not allowed to write the implementation — that's the executor's job. This file is the entry point for that executor (you, in Claude Code Desktop or wherever).

## Picking up

1. From this branch, open `plans/README.md` for the order, status table, and dependency notes.
2. Read the next plan with status `TODO`, in plan-number order. Each plan is self-contained — you do not need any context from the audit conversation.
3. Run the **Drift check** at the top of the plan before doing anything else.
4. Follow the plan's Steps; every step ends with a verification command and an expected result.
5. When the Done criteria are all checked, update the plan's row in `plans/README.md` to `DONE` and commit.
6. Move on to the next `TODO`.

## The plans, in order

| # | What lands | Why it's first |
|---|---|---|
| 001 | `npm test` exists; markdown round-trip and bundle smoke tests pass | Nothing else can be safely verified without a test runner |
| 002 | `build.js` fails the build on bundle-size regression; budgets ~15-20% above current sizes | Protects the load-bearing property (CLAUDE.md calls bundle size "the single most important property") |
| 003 | `safeUrl` helper blocks `javascript:`/`data:`/`vbscript:` URLs in the toolbar link prompt and Markdown link parser | Closes a real XSS vector reachable in both build modes |
| 004 | README has a `## Security` section explaining the trust boundary; CLAUDE.md gains a matching contributor note | Closes the docs gap once 003 makes the wording accurate |

## Quick start commands

```bash
# verify branch and starting state
git status                 # should be clean on audit/improve-2026-06-17
git log --oneline -3       # most recent commit should be the plan-files commit

# run the drift check for the plan you're about to execute (example: 001)
git diff --stat 67d9297..HEAD -- src/ build.js package.json

# the executor loop (per plan)
#   1. read plans/NNN-*.md fully
#   2. follow Steps section
#   3. verify each step
#   4. when Done criteria hold, commit
#   5. update plans/README.md status row
#   6. commit the README update (can be folded into the implementation commit)
```

## What NOT to do as the executor

- Don't merge to `main`. The advisor branch stays open until the maintainer reviews and merges (or runs `/improve execute <plan>` style review).
- Don't change anything outside a plan's "In scope" file list. If you find yourself needing to, the plan's STOP condition applies — stop and report.
- Don't write the four plans differently because you'd phrase something differently. They're calibrated for the executor model; if a plan has a gap, fix the plan first (or run `/improve review-plan plans/NNN-*.md`), then execute.

## If something is wrong with a plan

The advisor (`/improve`) provides two refinement paths:

- `/improve review-plan plans/NNN-<slug>.md` — critiques and tightens a plan.
- `/improve plan "<new finding description>"` — adds a new plan for something the audit missed.

## Audit context (light)

The full audit summary lives in the commit message of the plan-files commit and in this conversation's transcript. The condensed version:

- Codebase is tiny: ~236 LOC of JS, 25 short CSS files, one landing page.
- Defining constraint per `CLAUDE.md`: bundle size (core ≤ 500 B gzipped, full ≤ 1.4 KB).
- No tests, no lint, no typecheck, no CI before this branch.
- Published as `feather-editor@0.1.1` on npm.
- Two real security issues (both addressed by plan 003).
- A few direction options (single bundled CSS, vanilla build, safe-subpath wrapper) intentionally left as maintainer decisions, not planned.

Everything else is in `plans/`.
