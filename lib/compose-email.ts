/**
 * Compose the final email body that actually renders in an inbox.
 *
 * Email clients (Gmail especially) strip <!doctype>, <html>, <head>, <meta>,
 * <link>, <style>, <title>, and MSO conditional <!--[if mso]>…<![endif]-->
 * blocks. Only the markup inside <body> survives. So the stored "final body"
 * is: inner(header <body>) + template body + inner(footer <body>), with all the
 * document chrome removed.
 */

/** Remove document chrome that email clients discard. */
function stripEmailChrome(html: string): string {
  if (!html) return ''
  let out = html

  // Drop MSO / IE conditional comments entirely (incl. their content).
  out = out.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
  // Drop any remaining HTML comments.
  out = out.replace(/<!--[\s\S]*?-->/g, '')
  // Drop <style>, <script>, <head>…</head> blocks (content included).
  out = out.replace(/<head[\s\S]*?<\/head>/gi, '')
  out = out.replace(/<style[\s\S]*?<\/style>/gi, '')
  out = out.replace(/<script[\s\S]*?<\/script>/gi, '')
  // Drop the doctype and singleton head-ish tags anywhere.
  out = out.replace(/<!doctype[^>]*>/gi, '')
  out = out.replace(/<meta[^>]*>/gi, '')
  out = out.replace(/<link[^>]*>/gi, '')
  out = out.replace(/<title[\s\S]*?<\/title>/gi, '')

  // If a <body> exists, keep only its inner content.
  const bodyMatch = out.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    out = bodyMatch[1]
  }
  // Remove any stray <body>/<html> open/close tags (split fragments where the
  // <body> opens in the header and closes in the footer).
  out = out.replace(/<\/?body[^>]*>/gi, '')
  out = out.replace(/<\/?html[^>]*>/gi, '')

  return out.trim()
}

/**
 * Build the final, inbox-ready body: header + body + footer, all with document
 * chrome stripped so it can be dropped inside a real <body> when sending.
 */
export function composeFinalBody(
  headerHtml: string,
  bodyHtml: string,
  footerHtml: string
): string {
  const head = stripEmailChrome(headerHtml)
  const foot = stripEmailChrome(footerHtml)
  // The template body comes from the editor and is already body-level markup.
  const body = (bodyHtml || '').trim()
  const composed = [head, body, foot].filter(Boolean).join('\n')
  // Convert every <table>/<tr>/<td> — header, body and footer — into a
  // div-based grid so the whole email is div-based (no <table> elements).
  return tablesToDivs(composed)
}

export { stripEmailChrome }

/** Table-only attributes that are meaningless on a div and get dropped. */
const DROP_ATTRS = new Set([
  'colspan',
  'rowspan',
  'align',
  'valign',
  'border',
  'cellpadding',
  'cellspacing',
  'role',
  'data-borders',
  'data-density',
])

/** Table-layout CSS declarations that don't apply to a flex/div grid. */
const DROP_CSS_PROPS = new Set(['border-collapse', 'vertical-align'])

/** Table-specific utility classes that must not survive on a div. */
const DROP_CLASSES = new Set(['border-collapse', 'align-top'])

/**
 * Convert ALL tables (`<table>/<tr>/<td>/<th>`) in a composed email into a
 * div-based grid with ARIA table roles. Table layout is rendered inconsistently
 * across browsers and email clients; divs with `role="table"/"row"/"cell"` keep
 * the semantics for screen readers while giving predictable box rendering.
 *
 * - table  -> div role="table"        (display:block)
 * - tr     -> div role="row"          (display:flex so cells sit side by side)
 * - th     -> div role="columnheader" (flex:1 so columns share width)
 * - td     -> div role="cell"         (flex:1)
 * - tbody/thead/tfoot are unwrapped.
 */
export function tablesToDivs(html: string): string {
  let out = html

  out = out.replace(/<table\b([^>]*)>/gi, (_m, attrs: string) => {
    return `<div role="table"${buildDivAttrs(attrs, 'display:block;width:100%;')}>`
  })
  out = out.replace(/<\/table>/gi, '</div>')

  out = out.replace(/<\/?(?:tbody|thead|tfoot)\b[^>]*>/gi, '')

  out = out.replace(/<tr\b([^>]*)>/gi, (_m, attrs: string) => {
    return `<div role="row"${buildDivAttrs(attrs, 'display:flex;width:100%;')}>`
  })
  out = out.replace(/<\/tr>/gi, '</div>')

  out = out.replace(/<th\b([^>]*)>/gi, (_m, attrs: string) => {
    return `<div role="columnheader"${buildDivAttrs(attrs, 'flex:1 1 0%;')}>`
  })
  out = out.replace(/<\/th>/gi, '</div>')

  out = out.replace(/<td\b([^>]*)>/gi, (_m, attrs: string) => {
    return `<div role="cell"${buildDivAttrs(attrs, 'flex:1 1 0%;')}>`
  })
  out = out.replace(/<\/td>/gi, '</div>')

  return out
}

/**
 * Rebuild a table tag's attributes for its div replacement: drop table-only
 * attributes, strip table-layout classes and CSS, dedupe declarations, and
 * append the layout CSS. Returns a leading-space string ready to drop after the
 * tag name.
 */
function buildDivAttrs(attrsRaw: string, extraCss: string): string {
  const attrs = attrsRaw || ''
  const kept: string[] = []
  let styleValue = ''

  const attrRe = /([a-zA-Z][a-zA-Z0-9-]*)(?:="([^"]*)")?/g
  let m: RegExpExecArray | null
  while ((m = attrRe.exec(attrs)) !== null) {
    const name = m[1].toLowerCase()
    const value = m[2] ?? ''
    if (name === 'style') {
      styleValue = value
    } else if (name === 'width' || name === 'height') {
      // Numeric width/height attrs (e.g. width="600") become a CSS px value;
      // percentage stays percentage. Fold into style rather than keep as attr.
      const v = value.trim()
      if (v) {
        const css = /%$/.test(v) ? v : `${v.replace(/px$/, '')}px`
        styleValue = `${styleValue.replace(/;?\s*$/, styleValue ? ';' : '')}${name}:${css};`
      }
    } else if (name === 'class') {
      const remaining = value
        .split(/\s+/)
        .filter((c) => c && !DROP_CLASSES.has(c))
        .join(' ')
      if (remaining) kept.push(`class="${remaining}"`)
    } else if (!DROP_ATTRS.has(name)) {
      kept.push(m[2] !== undefined ? `${m[1]}="${value}"` : m[1])
    }
  }

  const decls = new Map<string, string>()
  const pushDecls = (css: string) => {
    for (const part of css.split(';')) {
      const seg = part.trim()
      if (!seg) continue
      const idx = seg.indexOf(':')
      if (idx === -1) continue
      const prop = seg.slice(0, idx).trim().toLowerCase()
      const val = seg.slice(idx + 1).trim()
      if (DROP_CSS_PROPS.has(prop)) continue
      decls.set(prop, val)
    }
  }
  pushDecls(styleValue)
  pushDecls(extraCss)

  const styleStr = Array.from(decls.entries())
    .map(([p, v]) => `${p}:${v};`)
    .join('')

  const parts: string[] = []
  if (kept.length) parts.push(kept.join(' '))
  if (styleStr) parts.push(`style="${styleStr}"`)
  return parts.length ? ` ${parts.join(' ')}` : ''
}

/**
 * Merge-field substitution.
 *
 * Templates carry placeholders in the form `#TOKEN#`. Given a map of provided
 * values, replace every matching placeholder and report which placeholders were
 * left unfilled.
 *
 * The `keys` map is forgiving about the `#` delimiters: a key may be written as
 * `#USER_NAME#`, `USER_NAME`, or `#USER_NAME` — all normalize to the same token.
 *
 * Returns the substituted string and the list of tokens still present (missing
 * a value), formatted with their `#…#` delimiters so the caller can echo them
 * back verbatim.
 */
export function substituteTokens(
  html: string,
  keys: Record<string, string> | null | undefined
): { output: string; missing: string[] } {
  const source = html || ''

  // Normalize provided keys: strip surrounding '#', uppercase for a
  // case-insensitive match against tokens.
  const provided = new Map<string, string>()
  if (keys && typeof keys === 'object') {
    for (const [rawKey, rawVal] of Object.entries(keys)) {
      const token = rawKey.replace(/^#+|#+$/g, '').trim().toUpperCase()
      const value = rawVal == null ? '' : String(rawVal)
      // An empty value counts as "not provided": leave the placeholder in place
      // and report it as missing, rather than blanking the token out.
      if (token && value !== '') provided.set(token, value)
    }
  }

  // A token is #NAME# where NAME is letters, digits, or underscores.
  const TOKEN_RE = /#([A-Z0-9_]+)#/gi

  const missingSet = new Set<string>()
  const output = source.replace(TOKEN_RE, (whole, name: string) => {
    const key = name.toUpperCase()
    if (provided.has(key)) return provided.get(key) as string
    // No value supplied — leave the placeholder in place and record it.
    missingSet.add(`#${name}#`)
    return whole
  })

  return { output, missing: Array.from(missingSet) }
}

/**
 * Return the unique `#TOKEN#` placeholders present in a string, in first-seen
 * order, each with its `#…#` delimiters. Used to build a test form of every
 * variable a template needs.
 */
export function extractTokens(html: string): string[] {
  const source = html || ''
  const TOKEN_RE = /#([A-Z0-9_]+)#/gi
  const seen = new Set<string>()
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = TOKEN_RE.exec(source)) !== null) {
    const token = `#${m[1]}#`
    if (!seen.has(token)) {
      seen.add(token)
      out.push(token)
    }
  }
  return out
}

