# feather-editor

[![npm version](https://img.shields.io/npm/v/feather-editor)](https://www.npmjs.com/package/feather-editor)
[![gzip size](https://img.shields.io/bundlephobia/minzip/feather-editor?label=core%20gzip)](https://bundlephobia.com/package/feather-editor)
[![license](https://img.shields.io/npm/l/feather-editor)](https://github.com/babanomania/feather-editor/blob/main/LICENSE)

A React rich-text editor that weighs almost nothing. The core build is about 440 bytes gzipped. The full build, with Markdown round-trip, is around 1.2 KB.

No dependencies. No build step on your side. No virtual document model. The browser already knows how to edit text; this is the thin layer on top.

```bash
npm i feather-editor
```

## Two modes

The package ships two entry points. Pick whichever matches what you actually need.

### Markdown mode — `feather-editor`

Markdown in, Markdown out. A hand-written converter handles headings, bold, italic, underline, lists, and links. Around 1.2 KB gzipped.

```jsx
import { useState } from "react";
import Editor from "feather-editor";
import "feather-editor/themes/light.css";

export default function Notes() {
  const [md, setMd] = useState("# Hello\n\nStart **writing**.");
  return <Editor markdown={md} onChange={setMd} />;
}
```

### Core mode — `feather-editor/core`

HTML in, HTML out. The bare editor: five toolbar buttons, a contenteditable region, nothing else. Around 440 bytes gzipped. Bring your own serializer if you need one.

```jsx
import { useState } from "react";
import Editor from "feather-editor/core";
import "feather-editor/themes/light.css";

export default function Notes() {
  const [html, setHtml] = useState("<p>Hello</p>");
  return <Editor value={html} onChange={setHtml} />;
}
```

## Props

### Markdown mode

| Prop        | Type                | Notes |
|-------------|---------------------|-------|
| `markdown`  | `string`            | Current Markdown value. |
| `onChange`  | `(md: string) => void` | Fires on every input event. |
| `theme`     | `string`            | Theme name, e.g. `"dark"`. Adds the class `feather-theme-<name>` to the wrapper. |
| `className` | `string`            | Extra classes on the wrapper. |
| `style`     | `object`            | Inline styles on the wrapper. |

### Core mode

| Prop        | Type                  | Notes |
|-------------|-----------------------|-------|
| `value`     | `string`              | Raw HTML. |
| `onChange`  | `(html: string) => void` | Fires on every input event. |

The core build is intentionally narrow. If you want themes with the core build, wrap it in a `div` with the theme class yourself, or use Markdown mode.

## 25 themes

Each theme is a small CSS file that sets a handful of `--fe-*` custom properties on the editor wrapper. Import the ones you want and switch with a single prop:

```jsx
import "feather-editor/themes/light.css";   // base — always import this
import "feather-editor/themes/dracula.css"; // any extras you want available

<Editor markdown={md} onChange={setMd} theme="dracula" />
```

The bundled themes:

`light` · `dark` · `sepia` · `midnight` · `forest` · `ocean` · `rose` · `slate` · `amber` · `lavender` · `mint` · `charcoal` · `paper` · `sunset` · `nordic` · `solarized-light` · `solarized-dark` · `dracula` · `mono` · `coffee` · `sage` · `cobalt` · `sand` · `plum` · `abyss`

### Roll your own

Every theme file is roughly twelve lines. Copy `themes/light.css` as a starting point and tweak the variables:

```css
.feather-theme-myown.feather-editor,
.feather-theme-myown .feather-editor {
  --fe-bg: #...;
  --fe-color: #...;
  --fe-bar-bg: #...;
  --fe-bar-border: #...;
  --fe-btn-color: #...;
  --fe-btn-hover-bg: #...;
  --fe-accent: #...;
  --fe-border: #...;
  --fe-heading-color: #...;
  --fe-selection-bg: rgba(...);
}
```

Then `<Editor theme="myown" />`.

## Why it's this small

The editor uses what the platform already gives you. `contentEditable` does the editing. `document.execCommand` does the formatting. The Selection API handles selections. There's no virtual document, no schema, no parser, no plugin runtime.

The contenteditable region stays uncontrolled. React reads from the DOM via a ref and never writes back to it once mounted. That's why the caret never jumps, and that's most of why the bundle is this small.

`execCommand` is technically deprecated, but it works in every browser shipping today and there's no replacement with the same coverage. If that changes, the editor changes.

## When not to use it

Reach for something heavier if you need any of:

- collaborative editing
- tables
- a real document model you can introspect
- bulletproof Markdown parsing for untrusted input
- mobile contenteditable quirks handled out of the box

[ProseMirror](https://prosemirror.net), [Tiptap](https://tiptap.dev), and [Lexical](https://lexical.dev) all do those things well, and ship the kilobytes for it. This package is for the common case: a clean, formatted text field that doesn't bloat your bundle.

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

## Size

| Build | gzipped |
|---|---|
| `feather-editor/core` (ESM) | ≈ 440 B |
| `feather-editor` (ESM) | ≈ 1.2 KB |

Measured from the actual `dist/*.esm.js` output. Sizes vary by bundler and tree-shaking; the figures above are the bytes that hit the wire when imported.

## Browser support

Anything that supports `contentEditable`, the Selection API, and `document.execCommand` — i.e. every browser in active use.

## Development

```bash
npm install
npm run build   # builds both bundles, prints gzipped sizes
npm test        # runs the markdown round-trip + bundle smoke tests
```

## License

MIT.
