'use client';

import { useAuthGuard } from '../../hooks/use-auth';
import { PageLoading } from '../shared/page-loading';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isReady } = useAuthGuard();

  // covers both "still checking" and "redirecting to sign-in"
  if (!isReady) {
    return (
      <div className="h-screen w-full bg-bg-app">
        <PageLoading />
      </div>
    );
  }

  return <>{children}</>;
}
