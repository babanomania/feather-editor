# CLAUDE.md

Project context for Claude Code. Read this before making changes.

## What this is

`feather-editor` — an ultra-lightweight React WYSIWYG editor published to npm. The defining constraint is **bundle size**. There are two entry points:

- `feather-editor` (full) — Markdown round-trip, target ≈ 1.2 KB gzipped
- `feather-editor/core` — HTML in/out, target ≈ 440 B gzipped (the "400-byte" hero claim)

If a change pushes either bundle above its target, surface that explicitly before merging — it's the single most important property of the package.

## Layout

```
src/
  index.jsx     full editor (uses markdown.js)
  core.jsx     bare editor — HTML in/out, no markdown
  markdown.js   hand-written toHtml / toMd round-trip
themes/         25 CSS files; light.css is the base+default palette,
                the other 24 are variable-override files
dist/           build output (committed; rebuilt by prepublishOnly)
build.js        esbuild script — builds both entry points, ESM + CJS,
                and prints raw + gzipped size for each
index.html      landing page (served by GitHub Pages from repo root)
package.json    `files: ["dist","themes","src"]` — landing page and
                build script are NOT in the published tarball
README.md       shown on GitHub and on npm
```

## Common commands

| Action | Command |
|---|---|
| Install | `npm install` |
| Build both bundles | `npm run build` |
| Publish | `NPM_TOKEN=<token> npm publish --access public` (needs 2FA bypass token or `--otp=XXXXXX`) |

There are no tests. Verification is: run the build, check the size report, and (for non-trivial changes) drop the package into a React app and confirm the editor renders.

## Conventions

- **No dependencies.** `peerDependencies.react` is the only declared dep. Do not add runtime deps without explicit user approval.
- **CSS theme contract.** All themes set the same `--fe-*` variables on the editor wrapper. `themes/light.css` carries the structural styles + light palette; the other 24 are short override files scoped to `.feather-theme-NAME.feather-editor, .feather-theme-NAME .feather-editor`. Importing `light.css` is required for any theme to work; the others are additive.
- **Core mode is deliberately narrow.** No theme/className passthrough, no link prompt — every prop adds bytes. If you find yourself adding props to `core.jsx`, push them to `index.jsx` instead.
- **The contenteditable region is uncontrolled.** React reads from the DOM via a ref; we never write the prop back into it after mount. That's why the caret never jumps — preserve this invariant.
- **`execCommand` is deprecated but used intentionally.** It's the smallest path to formatting that works everywhere shipping today. Don't replace it without checking the byte cost.
- **No comments in source unless the *why* is non-obvious.** Identifiers in `src/` are intentionally one-letter (e.g. `B`, `r`, `s`) in `core.jsx` to shave bytes — leave them alone.

## Distribution

- **npm:** https://www.npmjs.com/package/feather-editor — published from `main`. Bump `version` in `package.json` before publishing; npm rejects re-publishing the same version.
- **GitHub:** https://github.com/babanomania/feather-editor — `main` is the only branch.
- **Landing page:** https://babanomania.github.io/feather-editor/ — served by GitHub Pages from `main` → `/` (root). Editing `index.html` and pushing is enough to update it.

## Things not to do

- Don't commit `.npmrc` or any file containing an npm token (`.npmrc` is gitignored — keep it that way).
- Don't ship `landing.html`/`index.html`, `PLAN.md`, `build.js`, or `node_modules/` in the npm tarball. The allowlist in `package.json` already enforces this; don't widen it.
- Don't add a build step for themes — CSS files ship as-is.
- Don't add a markdown parser library to `markdown.js`. The whole point is the hand-written round-trip.
