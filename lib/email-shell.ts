/**
 * The master email shell: everything around the body content.
 *
 * This reproduces the production Connect2Excel email — a 600px table-based
 * wrapper, MSO conditional comments for Outlook, mobile media queries, the
 * header banner, and the blue footer block with social icons, address, divider
 * and disclaimer.
 *
 * Head and footer are generated from `EmailShellConfig` so a different brand
 * only needs different config, not different HTML. `buildHeadHtml` and
 * `buildFooterHtml` are what get stored in the database.
 */

export interface SocialIcon {
  /** Accessible name, also the visible text when `showLabel` is true. */
  label: string
  href: string
  iconUrl: string
  /** Icon box size in px. The production email uses 22, 20 for the globe. */
  size?: number
  /** Render the label next to the icon (Visit Website / Email Us do this). */
  showLabel?: boolean
}

export interface EmailShellConfig {
  /** Token or literal used for <title>, the preheader and the header alt text. */
  subject: string
  faviconUrl: string
  headerImageUrl: string
  footerImageUrl: string
  /** Cache-buster appended to template images as `?v=`. */
  assetVersion: string
  addressIconUrl: string
  addressLines: string[]
  disclaimerLabel: string
  disclaimerText: string
  social: SocialIcon[]
  colors: {
    /** Page background outside the 600px card. */
    page: string
    /** The card itself. */
    card: string
    /** Blue footer block. */
    footer: string
    /** Hairline divider inside the footer. */
    footerDivider: string
    footerText: string
    bodyText: string
  }
  fontStack: string
}

/** Escapes text destined for HTML body content or attribute values. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Appends the cache-busting version to a template asset URL. */
function versioned(url: string, version: string): string {
  if (!version) return url
  return url.includes('?') ? `${url}&v=${version}` : `${url}?v=${version}`
}

/* ------------------------------------------------------------ default brand */

export const CONNECT2EXCEL_SHELL: EmailShellConfig = {
  subject: '#EMAIL_HEADER_SUBJECT#',
  faviconUrl: '#FAVICON#',
  headerImageUrl:
    'https://staging.connect2excel.org/static/theme2/images/template/Email_Header.png',
  footerImageUrl:
    'https://staging.connect2excel.org/static/theme2/images/template/Email_Footer.png',
  assetVersion: '123',
  addressIconUrl:
    'https://staging.connect2excel.org/static/theme2/images/template/Address.png',
  addressLines: ['111 Somerset Road,', 'Tripleone Somerset,', 'Singapore 238164'],
  disclaimerLabel: 'Disclaimer:',
  disclaimerText:
    'This email and its attachments are confidential and intended only for the ' +
    'recipient. If received in error, please delete it and notify the sender. ' +
    'Unauthorized use or distribution is strictly prohibited.',
  social: [
    {
      label: 'Facebook',
      // The production HTML carries SendGrid click-tracking URLs, which are
      // generated per send. The real destination belongs here instead.
      href: 'https://www.facebook.com/connect2excel',
      iconUrl:
        'https://staging.connect2excel.org/static/theme2/images/template/FB.png',
      size: 22,
    },
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/connect2excel',
      iconUrl:
        'https://staging.connect2excel.org/static/theme2/images/template/Insta.png',
      size: 22,
    },
    {
      label: 'Visit Website',
      href: 'https://www.connect2excel.org',
      iconUrl:
        'https://staging.connect2excel.org/static/theme2/images/template/Web.png',
      size: 20,
      showLabel: true,
    },
    {
      label: 'Email Us',
      href: 'mailto:support@connect2excel.org',
      iconUrl:
        'https://staging.connect2excel.org/static/theme2/images/template/Email.png',
      size: 22,
      showLabel: true,
    },
  ],
  colors: {
    page: '#f4f4f4',
    card: '#ffffff',
    footer: '#3299cd',
    footerDivider: '#6bb4da',
    footerText: '#ffffff',
    bodyText: '#333333',
  },
  fontStack: 'Lato,Arial,sans-serif',
}

/* -------------------------------------------------------------------- head */

/**
 * Everything from `<!doctype>` down to the open body-content cell. The body
 * content is appended straight after this.
 *
 * Note: the production template leaks a JSON blob of internal theme variables
 * (`{"rootcss":...}`) into its `<style>` element. It is invalid CSS, so clients
 * ignore it, but it ships internal configuration in every email. It is omitted
 * here deliberately.
 */
export function buildHeadHtml(config: EmailShellConfig): string {
  const { colors, fontStack, assetVersion } = config
  const subject = esc(config.subject)
  const headerImg = versioned(config.headerImageUrl, assetVersion)

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${subject}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
<link rel="icon" type="image/png" sizes="16x16" href="${esc(config.faviconUrl)}" />
<link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&amp;display=swap" rel="stylesheet">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>table, td, div, p, a { font-family: Arial, sans-serif !important; }table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; border-collapse: collapse !important; }img { -ms-interpolation-mode: bicubic; }</style><![endif]-->
<style>
html,body {margin: 0 !important;padding: 0 !important;width: 100% !important;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;}
* {-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;}
img {border: 0;line-height: 100%;outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;display: block;}
table {border-collapse: collapse !important;mso-table-lspace: 0pt;mso-table-rspace: 0pt;}
a {text-decoration: none;}
/* Fluid wrapper: 600 on desktop, 100% on mobile */
.email-wrapper {width: 100%;max-width: 600px;}
/* Responsive tweaks for phones (honored by Outlook mobile app / Apple Mail / Gmail app) */
@media only screen and (max-width:600px) {
.email-wrapper {width: 100% !important;max-width: 100% !important;}
.fluid-img {width: 100% !important;max-width: 100% !important;height: auto !important;}
.stack {display: block !important;width: 100% !important;box-sizing: border-box !important;}
.px {padding-left: 18px !important;padding-right: 18px !important;}
.detail-label {width: 40% !important;}
}
</style>
</head>
<body style="margin:0; padding:0; width:100%; background-color:${colors.page};">
<!-- Preheader (hidden preview text) -->
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${colors.page};">${subject}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${colors.page};"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" class="email-wrapper" style="width:100%; max-width:600px; margin:0 auto; background-color:${colors.card};">
<!-- HEADER LOGO -->
<tr><td align="center" style="padding:0; font-size:0; line-height:0;"><img src="${headerImg}" alt="${subject}" class="fluid-img" width="600" style="display:block; width:100%; max-width:600px; height:auto; border:0;" /></td></tr>
<!-- BODY CONTENT -->
<tr><td class="px" style="padding:22px 32px 8px; font-family:${fontStack}; font-size:15px; line-height:22px; color:${colors.bodyText};">
<div style="max-width:600px;margin:0 auto;padding:10px 20px 20px;">`
}

/* ------------------------------------------------------------------ footer */

/** One social entry: icon, optionally followed by its label. */
function socialAnchor(icon: SocialIcon, config: EmailShellConfig): string {
  const size = icon.size ?? 22
  const src = versioned(icon.iconUrl, config.assetVersion)
  const isMailto = icon.href.startsWith('mailto:')
  // mailto links do not need target/rel; external ones open in a new tab.
  const targetAttrs = isMailto ? '' : ' target="_blank"'

  if (icon.showLabel) {
    return `<a href="${esc(icon.href)}"${targetAttrs} style="font:normal 15px ${config.fontStack}; color:${config.colors.footerText}; text-decoration:none; display:inline-block; vertical-align:middle; margin:0 8px;"><img src="${src}" alt="" width="${size}" height="${size}" style="display:inline-block; vertical-align:middle; width:${size}px; height:${size}px; border:0; margin-right:4px;" /><span style="vertical-align:middle;">${esc(icon.label)}</span></a>`
  }

  return `<a href="${esc(icon.href)}"${targetAttrs} style="text-decoration:none; display:inline-block; vertical-align:middle; margin:0 8px;"><img src="${src}" alt="${esc(icon.label)}" width="${size}" height="${size}" style="display:inline-block; width:${size}px; height:${size}px; border:0;" /></a>`
}

/**
 * Closes the body cell, then the footer wave image and the blue footer block:
 * social row, address, hairline divider and disclaimer. Ends the document.
 */
export function buildFooterHtml(config: EmailShellConfig): string {
  const { colors, fontStack, assetVersion } = config
  const footerImg = versioned(config.footerImageUrl, assetVersion)
  const addressIcon = versioned(config.addressIconUrl, assetVersion)
  const social = config.social.map((i) => socialAnchor(i, config)).join('')
  // The original renders the address across real newlines inside one span.
  const address = config.addressLines.map(esc).join('\n')

  return `</div></td></tr>
<!-- FOOTER WAVE IMAGE -->
<tr><td align="center" style="padding:0; font-size:0; line-height:0;"><img src="${footerImg}" alt="" class="fluid-img" width="600" style="display:block; width:100%; max-width:600px; height:auto; border:0;" /></td></tr>
<!-- FOOTER BLUE BLOCK -->
<tr><td align="center" style="padding:0; background-color:${colors.footer};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background:${colors.footer};"><tbody>
<tr><td align="center" style="padding:14px 12px 6px;">${social}</td></tr>
<tr><td align="center" style="padding:0px 25px 10px; font:normal 15px ${fontStack}; line-height:22px; color:${colors.footerText};"><img src="${addressIcon}" alt="" width="12" height="12" style="display:inline-block; vertical-align:-2px; width:12px; height:12px; border:0; margin-right:5px;" /><span>&nbsp;${address}</span></td></tr>
<tr><td style="padding:0 15px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tbody><tr><td height="1" style="height:1px; font-size:1px; line-height:1px; background-color:${colors.footerDivider};">&nbsp;</td></tr></tbody></table></td></tr>
<tr><td align="center" style="padding:8px 20px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tbody><tr><td align="left" valign="top" style="width:75px; padding:0 8px 0 0; font:bold 12px ${fontStack}; line-height:20px; color:${colors.footerText};">${esc(config.disclaimerLabel)}</td><td align="left" valign="top" style="font:normal 10px ${fontStack}; line-height:16px; color:${colors.footerText}; text-align:left;">${esc(config.disclaimerText)}</td></tr></tbody></table></td></tr>
</tbody></table></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`
}

/** Drops body content into a stored head/footer pair. */
export function composeEmail(headHtml: string, bodyHtml: string, footerHtml: string): string {
  return `${headHtml}\n${bodyHtml}\n${footerHtml}`
}
