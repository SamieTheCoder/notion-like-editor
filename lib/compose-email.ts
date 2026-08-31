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
