/**
 * HTML render helpers.
 *
 * Two output modes:
 *  - `renderTailwindHTML`: Utility classes, identical to `editor.getHTML()`.
 *  - `renderEmailHTML`: Every Tailwind class replaced with inline `style`
 *    attributes. No stylesheet needed. Works in Gmail, Outlook, Apple Mail.
 */
import { generateHTML } from '@tiptap/html/server'
import type { JSONContent } from '@tiptap/core'
import { extensions } from '@/lib/tiptap-extensions'

/* ---------------------------------------------------------------- tailwind */

export function renderTailwindHTML(json: JSONContent): string {
  return generateHTML(json, extensions)
}

/* ------------------------------------------------------------------- email */

/**
 * Map of Tailwind utility classes to their CSS equivalents.
 * Only the classes actually emitted by our extensions are listed.
 */
const CLASS_TO_CSS: Record<string, string> = {
  // Typography
  'text-base': 'font-size:16px;',
  'text-sm': 'font-size:14px;',
  'text-xs': 'font-size:12px;',
  'text-lg': 'font-size:18px;',
  'text-xl': 'font-size:20px;',
  'text-2xl': 'font-size:24px;',
  'text-3xl': 'font-size:30px;',
  'text-4xl': 'font-size:36px;',
  'leading-7': 'line-height:28px;',
  'leading-relaxed': 'line-height:1.625;',
  'tracking-tight': 'letter-spacing:-0.025em;',
  'tracking-wide': 'letter-spacing:0.025em;',
  'font-bold': 'font-weight:700;',
  'font-semibold': 'font-weight:600;',
  'font-medium': 'font-weight:500;',
  'font-mono': 'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;',
  italic: 'font-style:italic;',
  uppercase: 'text-transform:uppercase;',

  // Spacing
  'mb-1': 'margin-bottom:4px;',
  'mb-2': 'margin-bottom:8px;',
  'mb-3': 'margin-bottom:12px;',
  'mb-4': 'margin-bottom:16px;',
  'mt-4': 'margin-top:16px;',
  'mt-5': 'margin-top:20px;',
  'mt-6': 'margin-top:24px;',
  'mt-7': 'margin-top:28px;',
  'mt-8': 'margin-top:32px;',
  'my-4': 'margin-top:16px;margin-bottom:16px;',
  'my-6': 'margin-top:24px;margin-bottom:24px;',
  'pl-4': 'padding-left:16px;',
  'pl-6': 'padding-left:24px;',
  'px-3': 'padding-left:12px;padding-right:12px;',
  'px-4': 'padding-left:16px;padding-right:16px;',
  'py-2': 'padding-top:8px;padding-bottom:8px;',
  'py-3': 'padding-top:12px;padding-bottom:12px;',
  'p-4': 'padding:16px;',
  'px-1.5': 'padding-left:6px;padding-right:6px;',
  'py-0.5': 'padding-top:2px;padding-bottom:2px;',
  'px-0.5': 'padding-left:2px;padding-right:2px;',
  'py-px': 'padding-top:1px;padding-bottom:1px;',
  'pt-0.5': 'padding-top:2px;',
  'gap-2': 'gap:8px;',
  'space-y-1': '', // handled by margin on children in email

  // Colors
  'text-gray-100': 'color:#f3f4f6;',
  'text-gray-400': 'color:#9ca3af;',
  'text-gray-500': 'color:#6b7280;',
  'text-gray-900': 'color:#111827;',
  'text-pink-600': 'color:#db2777;',
  'text-blue-600': 'color:#2563eb;',
  'text-blue-900': 'color:#1e3a5f;',
  'text-amber-900': 'color:#78350f;',
  'text-green-900': 'color:#14532d;',
  'text-red-900': 'color:#7f1d1d;',
  'bg-gray-50': 'background-color:#f9fafb;',
  'bg-gray-100': 'background-color:#f3f4f6;',
  'bg-gray-900': 'background-color:#111827;',
  'bg-blue-50': 'background-color:#eff6ff;',
  'bg-amber-50': 'background-color:#fffbeb;',
  'bg-green-50': 'background-color:#f0fdf4;',
  'bg-red-50': 'background-color:#fef2f2;',
  'bg-yellow-200': 'background-color:#fef08a;',

  // Borders
  'border-l-4': 'border-left:4px solid;',
  'border-gray-200': 'border-color:#e5e7eb;',
  'border-gray-300': 'border-color:#d1d5db;',
  'border-gray-600': 'border-color:#4b5563;',
  'border-t': 'border-top:1px solid #e5e7eb;',
  'border-l': 'border-left:1px solid #e5e7eb;',
  border: 'border:1px solid #e5e7eb;',
  'border-b': 'border-bottom:1px solid #e5e7eb;',
  'border-collapse': 'border-collapse:collapse;',
  'rounded-lg': 'border-radius:8px;',
  'rounded-md': 'border-radius:6px;',
  rounded: 'border-radius:4px;',

  // Layout
  flex: 'display:flex;',
  'items-center': 'align-items:center;',
  'items-start': 'align-items:flex-start;',
  'flex-1': 'flex:1 1 0%;',
  'min-w-0': 'min-width:0;',
  'shrink-0': 'flex-shrink:0;',
  'w-full': 'width:100%;',
  'max-w-full': 'max-width:100%;',
  'h-auto': 'height:auto;',
  'overflow-x-auto': 'overflow-x:auto;',

  // List
  'list-disc': 'list-style-type:disc;',
  'list-decimal': 'list-style-type:decimal;',
  'list-outside': 'list-style-position:outside;',
  'list-none': 'list-style-type:none;',
  'pl-0': 'padding-left:0;',

  // Text decoration
  underline: 'text-decoration:underline;',
  'underline-offset-2': 'text-underline-offset:2px;',
  'line-through': 'text-decoration:line-through;',
  'decoration-blue-300': '', // not relevant for email
  'hover:decoration-blue-600': '', // not relevant for email
  'cursor-pointer': '', // not relevant for email
  'select-none': '', // not relevant for email

  // Shadows / effects (skip in email)
  'shadow-sm': '',
  'shadow-xl': '',

  // Display / misc
  'text-left': 'text-align:left;',
  'align-top': 'vertical-align:top;',
  relative: 'position:relative;',
}

/**
 * Classes that contain dynamic values or use arbitrary Tailwind syntax.
 * These are handled with regex patterns instead of exact matches.
 */
const PATTERN_CLASSES: [RegExp, (match: string) => string][] = [
  // [&>p:last-child]:mb-0 and similar bracket classes - skip
  [/^\[&[^\]]*\]:.+$/, () => ''],
  // justify-start/center/end
  [/^justify-(start|center|end)$/, (m) => {
    const v = m.replace('justify-', '')
    const map: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end' }
    return `justify-content:${map[v] || v};`
  }],
]

/**
 * Convert a space-separated list of Tailwind classes into an inline style string.
 */
function classesToInlineStyle(classes: string): string {
  const parts = classes.split(/\s+/).filter(Boolean)
  const styles: string[] = []

  for (const cls of parts) {
    // Exact match first
    if (cls in CLASS_TO_CSS) {
      const css = CLASS_TO_CSS[cls]
      if (css) styles.push(css)
      continue
    }
    // Pattern match
    let matched = false
    for (const [pattern, handler] of PATTERN_CLASSES) {
      if (pattern.test(cls)) {
        const css = handler(cls)
        if (css) styles.push(css)
        matched = true
        break
      }
    }
    if (!matched) {
      // Unknown class - skip silently. This is deliberate:
      // email clients ignore unknown CSS anyway, and logging
      // would be noisy during normal operation.
    }
  }

  return styles.join('')
}

/** Email font config: Lato from Google Fonts, bold 17px base. */
const EMAIL_FONT_FAMILY = "'Lato', Helvetica, Arial, sans-serif"
const EMAIL_BASE_FONT_SIZE = '17px'
const EMAIL_BASE_FONT_WEIGHT = '700'

const EMAIL_FONT_LINKS = [
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap" rel="stylesheet">',
].join('\n')

/**
 * Produces a complete email-ready HTML document:
 * - All Tailwind classes converted to inline `style` attributes
 * - Lato font loaded via Google Fonts (falls back to Helvetica/Arial)
 * - Base font: bold 17px
 * - <details>/<summary> replaced with div/p (unsupported in email)
 * - Wrapped in a proper HTML document with head/body
 *
 * Works in Gmail, Outlook, Apple Mail, Yahoo Mail.
 */
export function renderEmailHTML(json: JSONContent): string {
  let html = generateHTML(json, extensions)

  // Structural replacements for unsupported elements
  html = html.replace(/<details([^>]*)>/g, '<div$1>')
  html = html.replace(/<\/details>/g, '</div>')
  html = html.replace(/<summary([^>]*)>/g, '<p$1>')
  html = html.replace(/<\/summary>/g, '</p>')

  // Convert class → style on every tag
  html = html.replace(
    /(<[a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z][a-zA-Z0-9-]*(?:="[^"]*"|='[^']*'|=[^\s>]*)?)*)\s*\/?>/g,
    (fullMatch, tagStart: string, attrsRaw: string) => {
      if (!attrsRaw) return fullMatch

      let classValue = ''
      let existingStyle = ''
      let otherAttrs = ''

      const attrRegex = /\s+([a-zA-Z][a-zA-Z0-9-]*)(?:="([^"]*)")?/g
      let attrMatch: RegExpExecArray | null
      while ((attrMatch = attrRegex.exec(attrsRaw)) !== null) {
        const [raw, name, value] = attrMatch
        if (name === 'class') {
          classValue = value || ''
        } else if (name === 'style') {
          existingStyle = value || ''
        } else {
          otherAttrs += raw
        }
      }

      const inlineFromClasses = classValue ? classesToInlineStyle(classValue) : ''
      const combinedStyle = (existingStyle ? existingStyle.replace(/;?\s*$/, ';') : '') + inlineFromClasses

      let result = tagStart + otherAttrs
      if (combinedStyle) {
        result += ` style="${combinedStyle}"`
      }

      if (fullMatch.endsWith('/>')) {
        result += '/>'
      } else {
        result += '>'
      }

      return result
    }
  )

  // Post-process: kill paragraph margins inside task items so checkbox
  // and text are on the same visual line. The `[&>p]:mb-0` Tailwind class
  // gets stripped since it uses bracket syntax, leaving the paragraph with
  // its default `margin-bottom:8px` which pushes text below the checkbox.
  html = html.replace(
    /(<li[^>]*data-type="taskItem"[^>]*>[\s\S]*?<p\s+style="[^"]*?)margin-bottom:\d+px;/g,
    '$1margin-bottom:0;'
  )

  // Wrap in a complete email document
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${EMAIL_FONT_LINKS}
</head>
<body style="margin:0;padding:24px;background-color:#ffffff;font-family:${EMAIL_FONT_FAMILY};font-size:${EMAIL_BASE_FONT_SIZE};font-weight:${EMAIL_BASE_FONT_WEIGHT};color:#111827;line-height:1.6;">
<div style="max-width:600px;margin:0 auto;">
${html}
</div>
</body>
</html>`
}
