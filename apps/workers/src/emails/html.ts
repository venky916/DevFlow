export class SafeHtml {
  constructor(readonly value: string) {}
}

export type Content = string | SafeHtml;

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// One line of plain text, no line breaks (safe for subjects and preview text)
export const oneLine = (value: string, max = 150): string => {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

// turns a string into escaped HTML, and leaves SafeHtml as it is
export const render = (value: unknown): string =>
  value instanceof SafeHtml ? value.value : escapeHtml(value);

// Tagged template: every value is escaped unless it is already SafeHtml.
// html`<p>${userText}</p>` can't inject anything.
export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0] ?? '';
  values.forEach((value, i) => {
    out += render(value) + (strings[i + 1] ?? '');
  });
  return new SafeHtml(out);
}

export const join = (items: SafeHtml[]): SafeHtml =>
  new SafeHtml(items.map((i) => i.value).join(''));
