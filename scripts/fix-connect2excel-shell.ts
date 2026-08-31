/**
 * Fix Connect2excel (vendor 3) header/footer so header + body + footer combine
 * into one valid <body> fragment.
 *
 * Header: opens the email wrapper table + header image + opens the body cell.
 * Footer: closes the body cell + footer image + blue footer block + closes table.
 * No <!doctype>/<head>/<style>/MSO chrome — only inbox-rendering markup.
 */
import { updateVendorShell, initAuthDB, authPool } from '../lib/auth-db'

const V = '123'
const IMG = 'https://staging.connect2excel.org/static/theme2/images/template'

const HEADER = `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" class="email-wrapper" style="width:100%; max-width:600px; margin:0 auto; background-color:#ffffff;">
  <!-- HEADER IMAGE -->
  <tr>
    <td align="center" style="padding:0; font-size:0; line-height:0;"><img src="${IMG}/Email_Header.png?v=${V}" alt="#EMAIL_HEADER_SUBJECT#" class="fluid-img" width="600" style="display:block; width:100%; max-width:600px; height:auto; border:0;" /></td>
  </tr>
  <!-- BODY CONTENT -->
  <tr>
    <td class="px" style="padding:22px 32px 8px; font-family:Lato,Arial,sans-serif; font-size:15px; line-height:22px; color:#333333;">`

const FOOTER = `    </td>
  </tr>
  <!-- FOOTER WAVE IMAGE -->
  <tr>
    <td align="center" style="padding:0; font-size:0; line-height:0;"><img src="${IMG}/Email_Footer.png?v=${V}" alt="" class="fluid-img" width="600" style="display:block; width:100%; max-width:600px; height:auto; border:0;" /></td>
  </tr>
  <!-- FOOTER BLUE BLOCK -->
  <tr>
    <td align="center" style="padding:0; background-color:#3299cd;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background:#3299cd;">
        <tbody>
          <tr>
            <td align="center" style="padding:14px 12px 6px;"><a href="https://www.facebook.com/connect2excel" target="_blank" style="text-decoration:none; display:inline-block; vertical-align:middle; margin:0 8px;"><img src="${IMG}/FB.png?v=${V}" alt="Facebook" width="22" height="22" style="display:inline-block; width:22px; height:22px; border:0;" /></a><a href="https://www.instagram.com/connect2excel" target="_blank" style="text-decoration:none; display:inline-block; vertical-align:middle; margin:0 8px;"><img src="${IMG}/Insta.png?v=${V}" alt="Instagram" width="22" height="22" style="display:inline-block; width:22px; height:22px; border:0;" /></a><a href="https://www.connect2excel.org" target="_blank" style="font:normal 15px Lato,Arial,sans-serif; color:#ffffff; text-decoration:none; display:inline-block; vertical-align:middle; margin:0 8px;"><img src="${IMG}/Web.png?v=${V}" alt="" width="20" height="20" style="display:inline-block; vertical-align:middle; width:20px; height:20px; border:0; margin-right:4px;" /><span style="vertical-align:middle;">Visit Website</span></a><a href="mailto:support@connect2excel.org" style="font:normal 15px Lato,Arial,sans-serif; color:#ffffff; text-decoration:none; display:inline-block; vertical-align:middle; margin:0 8px;"><img src="${IMG}/Email.png?v=${V}" alt="" width="22" height="22" style="display:inline-block; vertical-align:middle; width:22px; height:22px; border:0; margin-right:4px;" /><span style="vertical-align:middle;">Email Us</span></a></td>
          </tr>
          <tr>
            <td align="center" style="padding:0px 25px 10px; font:normal 15px Lato,Arial,sans-serif; line-height:22px; color:#ffffff;"><img src="${IMG}/Address.png?v=${V}" alt="" width="12" height="12" style="display:inline-block; vertical-align:-2px; width:12px; height:12px; border:0; margin-right:5px;" /><span>&nbsp;111 Somerset Road, Tripleone Somerset, Singapore 238164</span></td>
          </tr>
          <tr>
            <td style="padding:0 15px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tbody><tr><td height="1" style="height:1px; font-size:1px; line-height:1px; background-color:#6bb4da;">&nbsp;</td></tr></tbody></table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 20px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tbody><tr><td align="left" valign="top" style="width:75px; padding:0 8px 0 0; font:bold 12px Lato,Arial,sans-serif; line-height:20px; color:#ffffff;">Disclaimer:</td><td align="left" valign="top" style="font:normal 10px Lato,Arial,sans-serif; line-height:16px; color:#ffffff; text-align:left;">This email and its attachments are confidential and intended only for the recipient. If received in error, please delete it and notify the sender. Unauthorized use or distribution is strictly prohibited.</td></tr></tbody></table>
            </td>
          </tr>
        </tbody>
      </table>
    </td>
  </tr>
</table>`

async function main() {
  await initAuthDB()
  await updateVendorShell({ id: 3, headerHtml: HEADER, footerHtml: FOOTER })
  console.log(`Connect2excel header/footer fixed (header ${HEADER.length}b, footer ${FOOTER.length}b).`)
  await authPool.end()
}
main().catch((e) => { console.error(e); process.exit(1) })
