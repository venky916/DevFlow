'use client';

import { useParams } from 'next/navigation';

import type { IProjectAccess } from '@devflow/types';

import { useProjectBySlug } from './use-projects';
import { useWorkspaceBySlug } from './use-workspaces';

export function usePermissions(override?: { workspaceSlug?: string; projectSlug?: string }) {
  const params = useParams<{ workspaceSlug?: string; projectSlug?: string }>();
  const workspaceSlug = override?.workspaceSlug ?? params.workspaceSlug ?? '';
  const projectSlug = override?.projectSlug ?? params.projectSlug ?? '';

  const { data: workspace, isLoading: wsLoading } = useWorkspaceBySlug(workspaceSlug);
  const workspaceRole = workspace?.currentUserWorkspaceRole ?? null;

  // Only fetches inside a project, because enabled needs both slugs
  const { data: project, isLoading: projLoading } = useProjectBySlug(workspaceSlug, projectSlug);

  const access: IProjectAccess = project?.currentUserAccess ?? {
    isWorkspaceAdmin: workspaceRole === 'ADMIN',
    projectRole: null,
  };

  return {
    workspaceRole,
    access,
    isWorkspaceAdmin: access.isWorkspaceAdmin,
    isViewer: access.projectRole === 'VIEWER' && !access.isWorkspaceAdmin,
    isLoading: wsLoading || (!!projectSlug && projLoading),
  };
}