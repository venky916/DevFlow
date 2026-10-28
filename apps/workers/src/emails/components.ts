import { emailConfig, safeLink } from './config';
import { html, type Content } from './html';

const FONT = 'Arial, Helvetica, sans-serif';

export const strong = (value: string) => html`<strong style="color:#18181b;">${value}</strong>`;

export const heading = (value: string) =>
  html`<h1
    style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:700;color:#18181b;"
  >
    ${value}
  </h1>`;

export const paragraph = (content: Content) =>
  html`<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:#3f3f46;">
    ${content}
  </p>`;

export const note = (value: string) =>
  html`<p style="margin:0 0 16px;font-family:${FONT};font-size:13px;line-height:1.6;color:#71717a;">
    ${value}
  </p>`;

// a grey box with a title and one line of detail (the issue and its project)
export const detailsBox = (title: string, meta: string) =>
  html`<table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="margin:0 0 20px;"
  >
    <tr>
      <td style="background:#f4f4f5;border-radius:6px;padding:14px 16px;">
        <p
          style="margin:0 0 4px;font-family:${FONT};font-size:15px;line-height:1.4;font-weight:700;color:#18181b;"
        >
          ${title}
        </p>
        <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.4;color:#71717a;">
          ${meta}
        </p>
      </td>
    </tr>
  </table>`;

// a button that renders the same in Gmail and Outlook
export const button = (label: string, url: string) =>
  html`<table
    role="presentation"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="margin:8px 0 24px;"
  >
    <tr>
      <td bgcolor="${emailConfig.brand}" style="border-radius:6px;">
        <a
          href="${safeLink(url)}"
          style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1;color:${emailConfig.onBrand};text-decoration:none;border-radius:6px;"
          >${label}</a
        >
      </td>
    </tr>
  </table>`;
