/**
 * Only allow same-site paths. Anything else (full URLs, protocol-relative
 * "//evil.com", backslash tricks, control characters) returns the fallback.
 * Prevents open-redirect phishing via ?redirect=...
 */

export function getSafeRedirect(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  if (value.includes('\\')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
