/**
 * HTML export helpers.
 *
 * `editor.getHTML()` returns one unbroken line, which is correct but unreadable
 * and unusable as a copy target. And a bare fragment full of Tailwind class
 * names renders completely unstyled anywhere Tailwind is not already compiled,
 * which is why pasting the export into a plain HTML file shows browser-default
 * serif text. These helpers fix both.
 */

/** Elements that never have children or a closing tag. */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

/**
 * Elements that flow inside a line of text. An element containing only these
 * stays on a single line, so sentences are never broken mid-phrase.
 */
const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'button', 'cite', 'code', 'data',
  'dfn', 'em', 'i', 'img', 'input', 'kbd', 'label', 'mark', 'q', 'rp', 'rt',
  'ruby', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'svg', 'time',
  'u', 'var', 'wbr',
])

/** Elements whose inner text is significant and must not be reindented. */
const PRESERVE_TAGS = new Set(['pre', 'textarea', 'script', 'style'])

type Token =
  | { kind: 'open'; name: string; raw: string; selfClosing: boolean }
  | { kind: 'close'; name: string; raw: string }
  | { kind: 'text'; raw: string }
  | { kind: 'comment'; raw: string }

interface ElementNode {
  kind: 'element'
  name: string
  open: string
  children: TreeNode[]
  /** Raw inner HTML, set only for preserve tags. */
  raw?: string
}

type TreeNode = ElementNode | { kind: 'text'; raw: string } | { kind: 'comment'; raw: string }

/**
 * Splits markup into tags and text. Quote-aware, so a `>` inside an attribute
 * value does not terminate a tag early.
 */
function tokenize(html: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < html.length) {
    if (html[i] !== '<') {
      const next = html.indexOf('<', i)
      const end = next === -1 ? html.length : next
      tokens.push({ kind: 'text', raw: html.slice(i, end) })
      i = end
      continue
    }

    // Comments and doctype run to their own terminator.
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i)
      const stop = end === -1 ? html.length : end + 3
      tokens.push({ kind: 'comment', raw: html.slice(i, stop) })
      i = stop
      continue
    }

    let j = i + 1
    let quote: string | null = null
    while (j < html.length) {
      const ch = html[j]
      if (quote) {
        if (ch === quote) quote = null
      } else if (ch === '"' || ch === "'") {
        quote = ch
      } else if (ch === '>') {
        break
      }
      j++
    }

    const raw = html.slice(i, Math.min(j + 1, html.length))
    i = j + 1

    if (raw.startsWith('</')) {
      tokens.push({ kind: 'close', name: tagName(raw), raw })
    } else if (raw.startsWith('<!')) {
      tokens.push({ kind: 'comment', raw })
    } else {
      const name = tagName(raw)
      tokens.push({
        kind: 'open',
        name,
        raw,
        selfClosing: raw.endsWith('/>') || VOID_TAGS.has(name),
      })
    }
  }

  return tokens
}

function tagName(raw: string): string {
  const match = /^<\/?\s*([a-zA-Z0-9:-]+)/.exec(raw)
  return match ? match[1].toLowerCase() : ''
}

/** Builds a tree, tolerating unclosed tags rather than throwing. */
function buildTree(tokens: Token[]): TreeNode[] {
  const root: TreeNode[] = []
  const stack: ElementNode[] = []

  const push = (node: TreeNode) => {
    const parent = stack[stack.length - 1]
    if (parent) parent.children.push(node)
    else root.push(node)
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.kind === 'text' || token.kind === 'comment') {
      push(token)
      continue
    }

    if (token.kind === 'open') {
      const element: ElementNode = {
        kind: 'element',
        name: token.name,
        open: token.raw,
        children: [],
      }

      if (token.selfClosing) {
        push(element)
        continue
      }

      // Capture preserve-tag bodies verbatim.
      if (PRESERVE_TAGS.has(token.name)) {
        let depth = 1
        let body = ''
        i++
        for (; i < tokens.length; i++) {
          const inner = tokens[i]
          if (inner.kind === 'open' && inner.name === token.name && !inner.selfClosing) depth++
          if (inner.kind === 'close' && inner.name === token.name) {
            depth--
            if (depth === 0) break
          }
          body += inner.raw
        }
        element.raw = body
        push(element)
        continue
      }

      push(element)
      stack.push(element)
      continue
    }

    // Close: unwind to the matching open, ignoring strays.
    const index = stack.map((n) => n.name).lastIndexOf(token.name)
    if (index !== -1) stack.length = index
  }

  return root
}

/** True when the subtree can be printed on one line. */
function isInlineOnly(nodes: TreeNode[]): boolean {
  return nodes.every((node) => {
    if (node.kind === 'text') return true
    if (node.kind === 'comment') return false
    if (!INLINE_TAGS.has(node.name)) return false
    if (node.raw !== undefined) return false
    return isInlineOnly(node.children)
  })
}

function isWhitespace(node: TreeNode): boolean {
  return node.kind === 'text' && node.raw.trim() === ''
}

function print(nodes: TreeNode[], indent: number, pad: string): string[] {
  const prefix = pad.repeat(indent)
  const lines: string[] = []

  for (const node of nodes) {
    if (node.kind === 'text') {
      if (node.raw.trim() === '') continue
      lines.push(prefix + node.raw.trim())
      continue
    }

    if (node.kind === 'comment') {
      lines.push(prefix + node.raw)
      continue
    }

    const closeTag = VOID_TAGS.has(node.name) || node.open.endsWith('/>')
      ? ''
      : `</${node.name}>`

    // Preserve tags: keep the body exactly as authored.
    if (node.raw !== undefined) {
      lines.push(prefix + node.open + node.raw + closeTag)
      continue
    }

    if (!closeTag) {
      lines.push(prefix + node.open)
      continue
    }

    const children = node.children.filter((child) => !isWhitespace(child))

    if (children.length === 0) {
      lines.push(prefix + node.open + closeTag)
      continue
    }

    // A run of text and inline elements reads better unbroken.
    if (isInlineOnly(children)) {
      const inner = children
        .map((child) => (child.kind === 'element' ? printInline(child) : child.raw))
        .join('')
      lines.push(prefix + node.open + inner + closeTag)
      continue
    }

    lines.push(prefix + node.open)
    lines.push(...print(children, indent + 1, pad))
    lines.push(prefix + closeTag)
  }

  return lines
}

function printInline(node: ElementNode): string {
  const closeTag = VOID_TAGS.has(node.name) || node.open.endsWith('/>')
    ? ''
    : `</${node.name}>`
  if (node.raw !== undefined) return node.open + node.raw + closeTag
  const inner = node.children
    .map((child) => (child.kind === 'element' ? printInline(child) : child.raw))
    .join('')
  return node.open + inner + closeTag
}

/**
 * Indents a one-line HTML string into readable, copy-pasteable markup.
 * Text content is never reflowed, so no sentence is broken.
 */
export function formatHTML(html: string, indentWith = '  '): string {
  if (!html.trim()) return ''
  const tree = buildTree(tokenize(html))
  return print(tree, 0, indentWith).join('\n')
}

/* ------------------------------------------------------ standalone document */

/** Tailwind v4's browser build compiles utilities from the live DOM. */
const TAILWIND_BROWSER_CDN =
  'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'

const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap'

/**
 * The handful of rules the export needs that are not Tailwind utilities:
 * the toggle chevron, table internals, and the code-block token colors.
 * Utilities themselves come from the Tailwind browser build.
 */
const SUPPORT_CSS = `
:root { --font-sans: "Geist", system-ui, sans-serif; --font-mono: "Geist Mono", ui-monospace, monospace; }
body { font-family: var(--font-sans); }
code, pre, kbd { font-family: var(--font-mono); }

/* Reset: prevent browser defaults from fighting Tailwind utilities. */
*, *::before, *::after { box-sizing: border-box; }
ul, ol { margin: 0; padding: 0; }
ul[data-type="taskList"] { list-style: none; padding: 0; margin: 1rem 0; }
ul[data-type="taskList"] li[data-type="taskItem"] { list-style: none; display: flex; flex-direction: row; align-items: baseline; gap: 8px; margin-bottom: 4px; }
ul[data-type="taskList"] li[data-type="taskItem"] > input[type="checkbox"] { width: 16px; height: 16px; margin: 0; flex-shrink: 0; }
ul[data-type="taskList"] li[data-type="taskItem"] > span { flex: 1; min-width: 0; }
ul[data-type="taskList"] li[data-type="taskItem"] > span > p { margin: 0; display: inline; }

/* Callout styling reinforcement. The Tailwind browser CDN should handle this
   but we reinforce it in case the CDN loads slowly or fails. */
[data-type="callout"][data-variant="info"] { background-color: #eff6ff; color: #1e3a5f; }
[data-type="callout"][data-variant="warning"] { background-color: #fffbeb; color: #78350f; }
[data-type="callout"][data-variant="success"] { background-color: #f0fdf4; color: #14532d; }
[data-type="callout"][data-variant="error"] { background-color: #fef2f2; color: #7f1d1d; }
[data-type="callout"][data-variant="note"] { background-color: #f9fafb; color: #111827; }
[data-type="callout"] { border-radius: 0.5rem; padding: 0.75rem 1rem; margin: 1rem 0; }

/* Toggle: replace the native marker with a rotating chevron. */
details[data-type="toggleBlock"] > summary { list-style: none; }
details[data-type="toggleBlock"] > summary::-webkit-details-marker { display: none; }
details[data-type="toggleBlock"] > summary::before {
  content: ""; display: inline-block; width: .5rem; height: .5rem;
  margin-right: .5rem; vertical-align: middle;
  border-right: 1.5px solid #9ca3af; border-bottom: 1.5px solid #9ca3af;
  transform: rotate(-45deg);
  transition: transform 150ms cubic-bezier(.23,1,.32,1);
}
details[data-type="toggleBlock"][open] > summary::before { transform: rotate(45deg); }

/* Tables */
table { table-layout: fixed; width: 100%; }
td, th { position: relative; min-width: 6rem; }

/* Code block token colors (one-dark-ish), matching the editor. */
pre code .hljs-comment, pre code .hljs-quote { color: #7f848e; font-style: italic; }
pre code .hljs-keyword, pre code .hljs-selector-tag, pre code .hljs-literal, pre code .hljs-type { color: #c678dd; }
pre code .hljs-string, pre code .hljs-regexp, pre code .hljs-addition { color: #98c379; }
pre code .hljs-number, pre code .hljs-symbol, pre code .hljs-bullet { color: #d19a66; }
pre code .hljs-title, pre code .hljs-section { color: #61afef; }
pre code .hljs-attr, pre code .hljs-attribute, pre code .hljs-variable { color: #e06c75; }
pre code .hljs-built_in { color: #e6c07b; }
pre code .hljs-emphasis { font-style: italic; }
pre code .hljs-strong { font-weight: 700; }

@media (prefers-reduced-motion: reduce) {
  details[data-type="toggleBlock"] > summary::before { transition: none; }
}
`.trim()

export interface StandaloneOptions {
  title?: string
  /** Indent width for the embedded body markup. */
  indentWith?: string
}

/**
 * Wraps a fragment in a complete HTML document that renders correctly on its
 * own: Tailwind v4 browser build, Geist fonts, and the support CSS above.
 *
 * The browser build compiles utilities at runtime. It is the right tool for a
 * preview or a quick share, not for production, where you want a real Tailwind
 * build step and a static stylesheet.
 */
export function wrapStandaloneHTML(
  bodyHTML: string,
  options: StandaloneOptions = {}
): string {
  const { title = 'Document', indentWith = '  ' } = options

  // Indent the body two levels to sit correctly inside <article>.
  const body = formatHTML(bodyHTML, indentWith)
    .split('\n')
    .map((line) => (line ? indentWith.repeat(3) + line : line))
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
${indentWith}<meta charset="utf-8">
${indentWith}<meta name="viewport" content="width=device-width, initial-scale=1">
${indentWith}<title>${escapeHTML(title)}</title>
${indentWith}<link rel="preconnect" href="https://fonts.googleapis.com">
${indentWith}<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${indentWith}<link rel="stylesheet" href="${GOOGLE_FONTS}">
${indentWith}<script src="${TAILWIND_BROWSER_CDN}"></script>
${indentWith}<style>
${SUPPORT_CSS.split('\n').map((l) => (l ? indentWith.repeat(2) + l : l)).join('\n')}
${indentWith}</style>
</head>
<body class="bg-white text-gray-900 antialiased">
${indentWith}<main class="mx-auto max-w-3xl px-6 py-12">
${indentWith.repeat(2)}<article>
${body}
${indentWith.repeat(2)}</article>
${indentWith}</main>
</body>
</html>`
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
