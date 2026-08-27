# Notion-like Editor

A free, open-source Notion-style block editor built with Next.js, Tiptap, and
Tailwind CSS. Content is stored as ProseMirror JSON and exported as HTML with
Tailwind utility classes baked into the tags — no paid Tiptap plans required.

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000/editor
```

## Features

**Blocks** — paragraph, headings H1–H6, bulleted list, numbered list, to-do list
(nested), toggle list (collapsible), quote, callout (info / warning / success /
error / note), code block with syntax highlighting and a language picker,
divider, image, YouTube embed, resizable table with header row/column and cell
merging.

**Inline formatting** — bold, italic, underline, strikethrough, inline code,
link, highlight (6 colors), text color (8 colors), subscript, superscript.

**Editing experience**
- Slash menu (`/`) with grouped, searchable blocks
- Bubble menu on text selection
- Drag handle in the gutter to reorder blocks, plus a `+` to insert below.
  Blocks nested in a callout, quote, toggle or list get their own handle,
  anchored to the same gutter column as top-level blocks and centered on the
  block's first line. A container's first line grabs the whole container, so a
  callout still moves as one unit
- Sticky toolbar with a "turn into" block converter
- Markdown input rules (`# `, `- `, `1. `, `> `, ``` ``` ``, `**bold**`, …)
- Smart typography, trailing-node click target, word/character count
- Undo/redo, keyboard shortcuts, save/load to `localStorage`

**Output** — identical HTML from the client (`editor.getHTML()`) and the server
(`generateHTML()`), because both import the same extension array.

## Architecture

```
app/
  editor/page.tsx              Editor page
  api/render/route.ts          POST { json } -> { html }
  globals.css                  Editor styles: placeholders, tables,
                               toggles, hljs theme
components/editor/
  TiptapEditor.tsx             Editor shell, output panel, persistence
  Toolbar.tsx                  Sticky formatting toolbar
  TableToolbar.tsx             Contextual table controls
  SelectionBubbleMenu.tsx      Floating menu on selection
  SlashMenu.tsx                Grouped `/` command palette
  BlockDragHandle.tsx          Gutter drag + insert controls
  extensions/                  One file per node/mark, each overriding
                               renderHTML to emit Tailwind classes
lib/
  tiptap-extensions.ts         Shared schema (client + server)
  block-commands.ts            Block registry used by slash menu + toolbar
scripts/
  verify-render.ts             Asserts every node renders its Tailwind classes
```

### Why extensions are declared once

`lib/tiptap-extensions.ts` is imported by both the client editor and the
`/api/render` route. Since every Tailwind class lives in each extension's
`renderHTML`, the two render paths cannot drift. `npm run verify:render`
asserts this for 33 node and mark variations.

### Data flow

1. User edits; the editor holds a ProseMirror document.
2. Persist `editor.getJSON()` — JSON is the source of truth, never HTML.
3. Render either on the client with `editor.getHTML()` or on the server with
   `generateHTML(json, extensions)`.

The editor's "Render on server" button round-trips the document through the API
and reports whether the two outputs are identical.

## Scripts

```bash
npm run dev             # dev server
npm run build           # production build (also type-checks)
npm run lint            # eslint
npm run verify:render   # assert Tailwind classes in server-rendered HTML
npm run verify:nested   # browser check: drag handle on nested blocks (needs dev server)
```

## Notes and caveats

- `@tiptap/html/server` is required in the Node runtime; the default
  `@tiptap/html` entry is browser-only and throws in a route handler.
- `/api/render` is unauthenticated. It only transforms request-body JSON and
  touches no stored data, but add auth and a body-size limit before exposing it
  publicly.
- Images and video are embedded by URL. There is no upload pipeline; wire one to
  your own storage if you need it.
- Tailwind v4 scans the extension files, so classes used only inside
  `renderHTML` strings are included in the compiled CSS. If you move those
  strings outside the scanned source tree, safelist them.

## Not included

These need infrastructure beyond the editor and are deliberately out of scope:
real-time multiplayer, comments and mentions, database/table views with
filters and sorts, page trees and permissions, and AI assistance. The
document model is standard ProseMirror JSON, so any of these can be layered on.

## References

- [Tiptap docs](https://tiptap.dev/)
- [slash-tiptap](https://github.com/harshtalks/tiptap-plugins) — free slash menu
- [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) — UX reference
# notion-like-editor
