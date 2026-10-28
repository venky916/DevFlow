const siteUrl = process.env.BASE_WEB_URL?.replace(/\/$/, '');
if (!siteUrl) {
  throw new Error('BASE_WEB_URL is required: the workers use it to check the links in emails');
}

export const emailConfig = {
  siteUrl,
  siteHost: new URL(siteUrl).host,
  // set EMAIL_LOGO_URL to change the logo without touching code
  logoUrl:
    process.env.EMAIL_LOGO_URL ??
    'https://pub-91f60774fdfd4f8db590df7a6eaa0b85.r2.dev/public/devflow-logo-light.png',
  brand: '#00E599',
  onBrand: '#04170f', // dark text on the green button
};

// Links in an email must point at our own site. Anything else falls back to the site itself.
export function safeLink(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.origin === new URL(emailConfig.siteUrl).origin) return parsed.toString();
  } catch {
    // not a valid URL
  }
  return emailConfig.siteUrl;
}
