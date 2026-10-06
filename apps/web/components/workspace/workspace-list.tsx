'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderKanban, Plus, Users } from 'lucide-react';

import type { IWorkspaceWithMembers } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';

import { useWorkspaces } from '../../hooks/use-workspaces';
import PageError from '../shared/page-error';
import PageLoading from '../shared/page-loading';
import { RoleBadge } from '../shared/role-badge';
import { CreateWorkspaceModal } from './create-workspace-modal';

function WorkspaceEmpty({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[4px] border border-border-default py-16">
      <div className="flex h-10 w-10 items-center justify-center rounded-[5px] bg-accent-subtle">
        <FolderKanban className="h-5 w-5 text-accent" />
      </div>
      <p className="text-[13px] text-text-muted">No workspaces yet</p>
      <Button variant="secondary" size="sm" onClick={onCreateClick}>
        Create your first workspace
      </Button>
    </div>
  );
}

function WorkspaceRow({ ws }: { ws: IWorkspaceWithMembers }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/${ws.slug}`)}
      className="flex w-full items-center gap-3 rounded-[4px] border border-border-default bg-bg-surface p-4 text-left transition-colors hover:border-border-emphasis hover:bg-bg-hover"
    >
      {ws.logoUrl ? (
        <img
          src={ws.logoUrl}
          alt={ws.name}
          className="h-[38px] w-[38px] rounded-[5px] object-cover"
        />
      ) : (
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[5px] bg-accent-subtle">
          <span className="font-mono text-[16px] font-bold text-accent">
            {ws.name?.[0]?.toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-medium text-text-primary">{ws.name}</span>
        <span className="font-mono text-[11px] text-text-muted">{ws.slug}</span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-1 text-[11px] text-text-muted">
          <Users className="h-3 w-3" />
          {ws._count?.members ?? 0}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-text-muted">
          <FolderKanban className="h-3 w-3" />
          {ws._count?.projects ?? 0}
        </div>
        <RoleBadge role={ws.currentUserWorkspaceRole} />
      </div>
    </button>
  );
}

export function WorkspacesList() {
  const { data: workspaces, isLoading, isError, refetch } = useWorkspaces();
  const [showModal, setShowModal] = useState(false);

  if (isLoading) {
    return <PageLoading />;
  }

  if (isError) {
    return <PageError message="Couldn't load your workspaces" onRetry={() => refetch()} />;
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center overflow-auto px-4 py-12">
      <div className="flex w-full max-w-[520px] flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-text-primary">Workspaces</h1>
            <p className="mt-0.5 text-[13px] text-text-muted">Select a workspace to continue</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New workspace
          </Button>
        </div>

        {workspaces?.length === 0 ? (
          <WorkspaceEmpty onCreateClick={() => setShowModal(true)} />
        ) : (
          <div className="flex flex-col gap-2">
            {workspaces?.map((ws) => (
              <WorkspaceRow key={ws.id} ws={ws} />
            ))}
          </div>
        )}
      </div>

      <CreateWorkspaceModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
