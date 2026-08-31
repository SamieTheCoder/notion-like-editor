/**
 * A fresh, clean email header/footer for the default "Platform" vendor
 * (used by the super admin). Table-based and inline-styled so it renders in
 * email clients. Stored as raw HTML strings so header + body + footer can be
 * concatenated into a full email later.
 */

const PLATFORM_PRIMARY = '#4F46E5' // indigo
const PLATFORM_TEXT = '#111827'
const PLATFORM_MUTED = '#6B7280'
const PLATFORM_PAGE = '#F3F4F6'

/** Everything from <!doctype> down to the open body-content cell. */
export const ADMIN_HEADER_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Platform</title>
  <style>
    @media only screen and (max-width:600px) {
      .container { width:100% !important; }
      .px { padding-left:20px !important; padding-right:20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${PLATFORM_PAGE};">
  <span style="display:none; font-size:1px; color:${PLATFORM_PAGE}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">Platform notification</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PLATFORM_PAGE};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:${PLATFORM_PRIMARY}; padding:24px 32px;" class="px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif; font-size:20px; font-weight:700; color:#ffffff; letter-spacing:0.2px;">
                    Platform
                  </td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:rgba(255,255,255,0.85);">
                    Admin
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.6; color:${PLATFORM_TEXT};" class="px">`

/** Closes the body cell, adds the footer block, and closes the document. */
export const ADMIN_FOOTER_HTML = `          </td>
          </tr>
          <tr>
            <td style="padding:24px 32px; border-top:1px solid #E5E7EB; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.6; color:${PLATFORM_MUTED};" class="px">
              <p style="margin:0 0 8px;">Sent by the Platform team.</p>
              <p style="margin:0;">You are receiving this email because you have an account on our platform.</p>
              <p style="margin:12px 0 0; color:#9CA3AF;">&copy; Platform. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

/** A starter body for the default template. */
export const ADMIN_BODY_HTML = `<h1 style="margin:0 0 16px; font-size:22px; font-weight:700; color:${PLATFORM_TEXT};">Welcome 👋</h1>
<p style="margin:0 0 16px;">This is the default email template for the Platform vendor. Edit the header, footer, and body from the dashboard.</p>
<p style="margin:0;"><a href="#" style="display:inline-block; background-color:${PLATFORM_PRIMARY}; color:#ffffff; text-decoration:none; padding:10px 20px; border-radius:8px; font-weight:600;">Get started</a></p>`
