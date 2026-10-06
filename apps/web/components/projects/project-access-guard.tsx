'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useProjects } from '../../hooks/use-projects';
import { useWorkspaces } from '../../hooks/use-workspaces';
import PageError from '../shared/page-error';
import PageLoading from '../shared/page-loading';

export function ProjectAccessGuard({ children }: { children: React.ReactNode }) {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const router = useRouter();

  const {
    data: workspaces,
    isLoading: wsLoading,
    isError: wsError,
    refetch: refetchWorkspaces,
  } = useWorkspaces();
  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);

  const {
    data: projects,
    isLoading: projLoading,
    isError: projError,
    refetch: refetchProjects,
  } = useProjects(currentWorkspace?.id ?? '');
  const currentProject = projects?.find((p) => p.slug === projectSlug);

  const hasAccess =
    !!currentProject &&
    (currentProject.currentUserAccess.isWorkspaceAdmin ||
      !!currentProject.currentUserAccess.projectRole);

  useEffect(() => {
    if (wsLoading || projLoading) return;
    if (!hasAccess) {
      router.replace(`/no-access?reason=not-a-member&workspace=${workspaceSlug}`);
    }
  }, [wsLoading, projLoading, hasAccess, router, workspaceSlug]);

  if (wsLoading || projLoading) {
    return <PageLoading />;
  }

  if (wsError) {
    return <PageError message="Couldn't load workspace" onRetry={() => refetchWorkspaces()} />;
  }

  if (projError) {
    return <PageError message="Couldn't load projects" onRetry={() => refetchProjects()} />;
  }

  if (!hasAccess) {
    return <PageLoading />; // redirect effect above is in flight
  }

  return <>{children}</>;
}
