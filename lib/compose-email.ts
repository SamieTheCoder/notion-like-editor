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
  return [head, body, foot].filter(Boolean).join('\n')
}

export { stripEmailChrome }

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

