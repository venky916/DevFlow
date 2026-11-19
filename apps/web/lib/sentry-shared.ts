import type { ErrorEvent } from '@sentry/nextjs';

// Options shared by every Sentry setup in the web app. Only errors are collected, and as little
// as possible about people: no user, no cookies, no request bodies, no query strings, no breadcrumbs.

const MAX_EVENTS_PER_MINUTE = 20;
let windowStartedAt = Date.now();
let sentInWindow = 0;

// A bug that fails in a loop must not use up the monthly quota (it is shared with the backend).
function allowEvent(): boolean {
  const now = Date.now();
  if (now - windowStartedAt > 60_000) {
    windowStartedAt = now;
    sentInWindow = 0;
  }
  sentInWindow += 1;
  return sentInWindow <= MAX_EVENTS_PER_MINUTE;
}

// An error message can contain what a user typed. Emails and sign-in tokens are cut out of it.
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;
function scrubText(text: string): string {
  return text.replace(EMAIL, '[email]').replace(JWT, '[token]');
}

// keeps the page, drops ?filters=...#and-hash (they can hold search text)
function pathOnly(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    return url;
  }
}

export const sharedSentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // production on Vercel, preview for branches, development on a laptop
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.NODE_ENV,
  tracesSampleRate: 0,
  // browser noise that tells us nothing
  ignoreErrors: [
    'ResizeObserver loop completed with undelivered notifications.',
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'AbortError',
    // the API being unreachable is what the uptime monitor is for
    'Network Error',
    'Failed to fetch',
    'Load failed',
  ],
  // collect nothing about people or requests
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
  },
  beforeSend(event: ErrorEvent) {
    if (!allowEvent()) return null;
    delete event.user;
    delete event.breadcrumbs;
    if (event.request) {
      event.request = event.request.url ? { url: pathOnly(event.request.url) } : {};
    }
    for (const exception of event.exception?.values ?? []) {
      if (exception.value) exception.value = scrubText(exception.value);
    }
    return event;
  },
};
