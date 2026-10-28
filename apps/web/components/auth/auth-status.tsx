import Link from 'next/link';

import { AuthHeader } from './auth-header';

interface AuthStatusProps {
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export function AuthStatus({ title, description, action }: AuthStatusProps) {
  return (
    <div className="flex flex-col gap-8">
      <AuthHeader title={title} description={description} />
      {action && (
        <Link
          href={action.href}
          className="text-center text-sm text-accent transition-colors hover:text-accent-hover"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
