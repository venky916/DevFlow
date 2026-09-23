import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-bg-app text-center px-4">
      <h1 className="text-2xl font-semibold text-text-primary">
        Page not found
      </h1>
      <p className="text-sm text-text-muted max-w-sm">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link
        href="/"
        className="mt-2 text-sm text-accent hover:text-accent-hover transition-colors"
      >
        Go back home
      </Link>
    </div>
  );
}
