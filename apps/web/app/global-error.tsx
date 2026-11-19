'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Shown when the whole app fails to render. It replaces the root layout, so it has its own
// <html> and inline styles (the app's CSS is not loaded here).
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#e5e5e5',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 360, padding: 24 }}>
          <h1 style={{ fontSize: 18, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 13, color: '#a3a3a3', margin: '0 0 16px' }}>
            The error was reported. Reloading the page usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', borderRadius: 6, border: 0, cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
