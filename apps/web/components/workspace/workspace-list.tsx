'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FolderKanban, Plus, Users } from 'lucide-react';

import type { IWorkspaceSummary } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';

import { ROUTES } from '../../constants/routes';
import { useWorkspaces } from '../../hooks/use-workspaces';
import { EmptyState } from '../shared/empty-state';
import { PageContainer } from '../shared/page-container';
import { PageError } from '../shared/page-error';
import { PageHeading } from '../shared/page-heading';
import { PageLoading } from '../shared/page-loading';
import { RoleBadge } from '../shared/role-badge';
import { WorkspaceLogo } from '../shared/workspace-logo';
import { CreateWorkspaceModal } from './create-workspace-modal';

function WorkspaceRow({ workspace }: { workspace: IWorkspaceSummary }) {
  return (
    <Link
      href={ROUTES.workspace(workspace.slug)}
      className="flex w-full items-center gap-3 rounded-base border border-border-default bg-bg-surface p-4 text-left transition-colors hover:border-border-emphasis hover:bg-bg-hover"
    >
      <WorkspaceLogo name={workspace.name} logoUrl={workspace.logoUrl} size="md" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body font-medium text-text-primary">{workspace.name}</span>
        <span className="font-mono text-2xs text-text-muted">{workspace.slug}</span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-1 text-2xs text-text-muted">
          <Users className="size-3" />
          {workspace._count.members}
        </div>
        <div className="flex items-center gap-1 text-2xs text-text-muted">
          <FolderKanban className="size-3" />
          {workspace._count.projects}
        </div>
        <RoleBadge role={workspace.currentUserWorkspaceRole} />
      </div>
    </Link>
  );
}

export function WorkspacesList() {
  const { data: workspaces, isLoading, isError, refetch } = useWorkspaces();
  const [showModal, setShowModal] = useState(false);

  if (isLoading) return <PageLoading />;
  if (isError || !workspaces) {
    return <PageError message="Couldn't load your workspaces" onRetry={() => refetch()} />;
  }

  return (
    <PageContainer size="narrow" className="py-12">
      <PageHeading
        title="Workspaces"
        description="Select a workspace to continue"
        actions={
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="mr-1.5 size-3.5" />
            New workspace
          </Button>
        }
      />

      {workspaces.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-5" />}
          message="No workspaces yet"
          action={
            <Button variant="secondary" size="sm" onClick={() => setShowModal(true)}>
              Create your first workspace
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {workspaces.map((workspace) => (
            <WorkspaceRow key={workspace.id} workspace={workspace} />
          ))}
        </div>
      )}

      <CreateWorkspaceModal open={showModal} onClose={() => setShowModal(false)} />
    </PageContainer>
  );
}
