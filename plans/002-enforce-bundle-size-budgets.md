# Plan 002: Enforce bundle-size budgets in the publish gate

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 67d9297..HEAD -- build.js package.json src/`
> If `build.js`, `package.json`, or any `src/*` file has changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plan 001 (so the size guard can be smoke-tested via `npm test` if desired; not strictly required to ship plan 002)
- **Category**: dx
- **Planned at**: commit `67d9297`, 2026-06-17

## Why this matters

`CLAUDE.md` calls bundle size "the single most important property of the package." Yet `build.js` only *prints* sizes and exits 0 regardless of result. `prepublishOnly` runs the build and proceeds even on a regression: a 5 KB jump would ship unnoticed, breaking the load-bearing promise on the package's npm page. Adding a fail-on-budget check costs ~15 lines and means the only way to publish a too-large bundle is to consciously bump the budget. The budget itself becomes a reviewable change.

## Current state

`build.js:18-36` builds both targets and reports sizes:

```js
async function run() {
  await Promise.all(
    targets.flatMap((t) => [
      esbuild.build({ ...shared, entryPoints: [t.entry], format: "esm", outfile: `${t.out}.esm.js` }),
      esbuild.build({ ...shared, entryPoints: [t.entry], format: "cjs", outfile: `${t.out}.js` }),
    ])
  );

  const report = (file) => {
    const raw = readFileSync(file);
    const gz = gzipSync(raw).length;
    console.log(`  ${file.padEnd(28)} raw ${raw.length} B   gzip ${gz} B`);
  };
  console.log("built:");
  targets.forEach((t) => {
    report(`${t.out}.esm.js`);
    report(`${t.out}.js`);
  });
}
```

Last measured sizes (commit `67d9297`):

| File | gzipped |
|---|---|
| `dist/index.esm.js` | 1164 B |
| `dist/index.js` | 1388 B |
| `dist/core.esm.js` | 436 B |
| `dist/core.js` | 648 B |

`README.md` advertises ≈ 440 B for the core ESM bundle and ≈ 1.2 KB for the full ESM bundle. CJS sizes are larger because esbuild's CJS wrapper adds bytes; consumers using a modern bundler will get the ESM build, so the budget pressure is on ESM.

Conventions: the repo uses CommonJS in `build.js` (`require(...)`). Match that — don't switch to ESM here.

## Commands you will need

| Purpose       | Command            | Expected on success                                            |
|---------------|--------------------|----------------------------------------------------------------|
| Install       | `npm install`      | exit 0                                                         |
| Build         | `npm run build`    | exit 0 on within-budget, exit 1 with a clear error on overage  |
| Tests (opt)   | `npm test`         | exit 0 (from plan 001)                                         |

## Scope

**In scope** (the only files you should modify):
- `build.js`

**Out of scope** (do NOT touch):
- `src/*` — this plan does not change any shipped code.
- `package.json` — the existing `prepublishOnly` already invokes `build`; once `build` fails on overage, `prepublishOnly` inherits the gate. No script changes needed.
- `themes/*.css` — CSS is shipped as-is and isn't size-budgeted here.

## Git workflow

- Branch: stay on the current branch.
- One commit covering the build.js change.
- Commit style: match existing log; suggest `chore: enforce bundle-size budgets on build`.

## Steps

### Step 1: Define the budgets in `build.js`

At the top of `build.js`, after the existing `require`s, add:

```js
const BUDGETS = {
  "dist/index.esm.js": 1400,
  "dist/index.js":     1600,
  "dist/core.esm.js":   500,
  "dist/core.js":       800,
};
```

Rationale for these specific numbers (write this as a one-line comment above the constant): each budget is ≈ 15–20% above the size at commit `67d9297`. That gives genuine wiggle room for a small feature add, while still failing on the kind of accidental bloat (a dep, a big helper) that would matter.

### Step 2: Make the report return whether it passed

Refactor `report` to return `{ file, gz, budget, ok }` and accumulate results:

```js
const report = (file) => {
  const raw = readFileSync(file);
  const gz = gzipSync(raw).length;
  const budget = BUDGETS[file];
  const ok = gz <= budget;
  const marker = ok ? "OK " : "OVER";
  console.log(`  ${marker}  ${file.padEnd(22)} raw ${raw.length} B   gzip ${gz} B   budget ${budget} B`);
  return { file, gz, budget, ok };
};

console.log("built:");
const results = targets.flatMap((t) => [report(`${t.out}.esm.js`), report(`${t.out}.js`)]);

const over = results.filter((r) => !r.ok);
if (over.length) {
  console.error(`\nBUDGET FAIL: ${over.length} bundle(s) over budget:`);
  over.forEach((r) => console.error(`  ${r.file}: ${r.gz} B > ${r.budget} B (+${r.gz - r.budget} B)`));
  console.error(
    "\nTo proceed: either reduce bundle size, or consciously bump the budget in build.js with a one-line rationale comment in the same diff."
  );
  process.exit(1);
}
```

The "consciously bump the budget" message is part of the gate. Reviewers should be able to grep for budget changes in PRs.

### Step 3: Verify pass case

```
npm run build
```

**Expected**: all four lines start with `OK ` and the script exits 0.

### Step 4: Verify fail case (manual, temporary)

Drop one of the budgets so the gate fires:

1. Edit `build.js`: change `"dist/core.esm.js": 500` → `"dist/core.esm.js": 100`.
2. Run `npm run build`.

**Expected output ends with**:

```
BUDGET FAIL: 1 bundle(s) over budget:
  dist/core.esm.js: 436 B > 100 B (+336 B)
```

and the exit code is non-zero (`echo $?` → `1`).

3. Revert the budget edit. Re-run `npm run build`. All `OK`, exit 0.

> If the script exits 0 in the fail case, the gate is not firing. STOP and report — the most common cause is using `return` instead of `process.exit(1)` inside `run()`.

### Step 5: Commit

```
chore: enforce bundle-size budgets on build

build.js now fails with a non-zero exit code when any gzipped bundle
exceeds its budget. Budgets are ~15-20% above the sizes measured at
67d9297 — explicit bumps are reviewable. prepublishOnly inherits the
gate, so a regression cannot reach npm without a conscious budget edit.
```

## Test plan

This plan has no new unit tests. Verification is the manual fail/pass cycle in Step 4. (If plan 001 has landed, a future plan can add an `npm run build` invocation under the test runner that captures exit codes; not in scope here.)

## Done criteria

ALL must hold:

- [ ] `npm run build` exits 0 with four `OK` lines.
- [ ] Lowering any budget below the current size causes a non-zero exit with a clear error naming the over-budget file and the overage.
- [ ] `grep -q "BUDGET FAIL" build.js` → matches (the gate exists).
- [ ] `git status` shows only `build.js` modified.
- [ ] `plans/README.md` status row for plan 002 updated to `DONE`.

## STOP conditions

Stop and report if:

- The current sizes already exceed the proposed budgets (e.g. `dist/core.esm.js` has crept above 500 B since planning). Don't increase the budget to make the gate pass on first run; report the size growth as a separate finding so the maintainer can decide.
- esbuild's output format changes between the planning commit and execution and the file paths in `BUDGETS` no longer match what the build emits.

## Maintenance notes

- The budget is a contract with users (the README advertises sizes). Bumping a budget is a *product* change, not just a build change — call it out in the commit message.
- If a future plan adds a third entry point, add it to `BUDGETS`. The gate iterates over `targets`, so a missing budget would silently skip enforcement; a future improvement is to fail when a built file has no budget entry.
- If anyone proposes removing this gate, the only valid reason is replacing it with a CI-based size-diff comment that fails on regression instead. Don't remove it because "it's annoying."
