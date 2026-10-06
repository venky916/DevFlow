'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useWorkspaces } from '../../hooks/use-workspaces';
import PageLoading from '../shared/page-loading';

export function WorkspaceAccessGuard({ children }: { children: React.ReactNode }) {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const router = useRouter();
  const { data: workspaces, isLoading } = useWorkspaces();

  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);

  useEffect(() => {
    if (isLoading) return;
    if (!currentWorkspace) {
      router.replace('/no-access?reason=not-a-member');
    }
  }, [isLoading, currentWorkspace, router]);

  if (isLoading || !currentWorkspace) {
    return <PageLoading />;
  }

  return <>{children}</>;
}
