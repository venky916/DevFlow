import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-bg-app px-4 text-center">
      <h1 className="text-2xl font-semibold text-text-primary">Page not found</h1>
      <p className="max-w-sm text-sm text-text-muted">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link href="/" className="mt-2 text-sm text-accent transition-colors hover:text-accent-hover">
        Go back home
      </Link>
    </div>
  );
}
