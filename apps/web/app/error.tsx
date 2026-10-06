'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // log to your error reporting service (Sentry, etc.) once wired up
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-bg-app px-4 text-center">
      <h1 className="text-2xl font-semibold text-text-primary">Something went wrong</h1>
      <p className="max-w-sm text-sm text-text-muted">
        An unexpected error occurred. You can try again, or head back home.
      </p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={reset}
          className="text-sm text-accent transition-colors hover:text-accent-hover"
        >
          Try again
        </button>
        <a href="/" className="text-sm text-text-muted transition-colors hover:text-text-primary">
          Go home
        </a>
      </div>
    </div>
  );
}
