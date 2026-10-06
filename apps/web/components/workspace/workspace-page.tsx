'use client';

import { useParams } from 'next/navigation';

import { useProjects } from '../../hooks/use-projects';
import { useWorkspaces } from '../../hooks/use-workspaces';
import PageError from '../shared/page-error';
import PageLoading from '../shared/page-loading';
import { WorkspaceHome } from './workspace-home';

export function WorkspacePage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
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

  if (wsLoading || projLoading) {
    return <PageLoading />;
  }
  if (wsError) {
    return <PageError message="Couldn't load your workspace" onRetry={() => refetchWorkspaces()} />;
  }
  if (projError) {
    return <PageError message="Couldn't load projects" onRetry={() => refetchProjects()} />;
  }
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <main className="flex-1 overflow-auto bg-bg-app">
        <WorkspaceHome
          workspace={currentWorkspace}
          workspaceSlug={workspaceSlug}
          projects={projects ?? []}
        />
      </main>
    </div>
  );
}
