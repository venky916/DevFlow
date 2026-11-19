import * as Sentry from '@sentry/node';

import { getRequestId } from './request-context';

// Error tracking with Sentry. It is switched on by SENTRY_DSN, and stays off when that is empty.
// Errors are captured by hand (captureError), at the few places that matter. There is no tracing
// and no automatic instrumentation, so it adds almost no memory or CPU.

const MAX_EVENTS_PER_MINUTE = 20;
let windowStartedAt = Date.now();
let sentInWindow = 0;

// A bug that fails in a loop must not use up the whole monthly quota in an hour.
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

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,
    // the events say which app they came from, not which container
    serverName: process.env.SERVICE_NAME || undefined,
    tracesSampleRate: 0,
    // no default integrations: we capture by hand, and crashes are handled by registerGracefulShutdown
    defaultIntegrations: false,
    integrations: [Sentry.dedupeIntegration(), Sentry.linkedErrorsIntegration()],
    // collect nothing about people or requests
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
    },
    beforeSend(event) {
      if (!allowEvent()) return null;
      delete event.request;
      delete event.user;
      for (const exception of event.exception?.values ?? []) {
        if (exception.value) exception.value = scrubText(exception.value);
      }
      return event;
    },
  });
}

export const isErrorTrackingOn = Boolean(dsn);

interface CaptureContext {
  // small, flat facts about the error: ids and names, never personal data
  [key: string]: string | number | boolean | undefined;
}

// Reports an error to Sentry. It never throws, and it does nothing when Sentry is off.
export function captureError(err: unknown, context: CaptureContext = {}): void {
  if (!dsn) return;
  try {
    const requestId = getRequestId();
    Sentry.captureException(err, {
      tags: { service: process.env.SERVICE_NAME ?? 'unknown', ...(requestId ? { requestId } : {}) },
      extra: context,
    });
  } catch {
    // reporting an error must never cause one
  }
}

// Sends the errors that are still waiting. Call it before the process exits.
export async function flushErrors(): Promise<void> {
  if (!dsn) return;
  try {
    await Sentry.flush(2000);
  } catch {
    // nothing more can be done
  }
}
