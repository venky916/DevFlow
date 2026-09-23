"use client";

import { useEffect } from "react";

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
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-bg-app text-center px-4">
      <h1 className="text-2xl font-semibold text-text-primary">
        Something went wrong
      </h1>
      <p className="text-sm text-text-muted max-w-sm">
        An unexpected error occurred. You can try again, or head back home.
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="text-sm text-accent hover:text-accent-hover transition-colors"
        >
          Try again
        </button>
        <a
          href="/"
          className="text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
