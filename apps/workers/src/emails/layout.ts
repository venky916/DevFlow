import { emailConfig } from './config';
import { html, type SafeHtml } from './html';

const FONT = 'Arial, Helvetica, sans-serif';

// The same frame for every email: logo, white card, footer.
// `preheader` is the grey preview text next to the subject in the inbox.
export function renderLayout(preheader: string, body: SafeHtml): string {
  return html`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>DevFlow</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f5;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
          ${preheader}
        </div>
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="background:#f4f4f5;"
        >
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table
                role="presentation"
                width="560"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-top:3px solid ${emailConfig.brand};border-radius:8px;"
              >
                <tr>
                  <td style="padding:24px 28px 0;">
                    <img
                      src="${emailConfig.logoUrl}"
                      width="130"
                      height="29"
                      alt="DevFlow"
                      style="display:block;border:0;width:130px;height:29px;"
                    />
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 28px 8px;font-family:${FONT};">${body}</td>
                </tr>
              </table>
              <table
                role="presentation"
                width="560"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="width:100%;max-width:560px;"
              >
                <tr>
                  <td
                    align="center"
                    style="padding:16px 12px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#a1a1aa;"
                  >
                    Sent by DevFlow &middot;
                    <a href="${emailConfig.siteUrl}" style="color:#a1a1aa;"
                      >${emailConfig.siteHost}</a
                    >
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`.value;
}
