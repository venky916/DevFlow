'use client';

import { formatDistanceToNow } from 'date-fns';
import { Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import type { WorkspaceRole } from '@devflow/types';
import { Spinner } from '@devflow/ui/components/spinner';

import { useCancelInvite, useWorkspaceInvites } from '../../../hooks/use-workspace-settings';
import { RoleBadge } from '../../shared/role-badge';
import { SectionHeading } from '../../shared/section-heading';

interface Props {
  workspaceId: string;
}

export function PendingInvitesTab({ workspaceId }: Props) {
  const { data: invites, isLoading } = useWorkspaceInvites(workspaceId);
  const { mutate: cancelInvite } = useCancelInvite(workspaceId);

  if (isLoading) {
    return (
      <div className="flex justify-center pt-8">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading
        title="Pending invitations"
        description="Invites that have been sent but not yet accepted."
      />
      {!invites?.length ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-[4px] border border-border-default py-12">
          <Clock className="h-5 w-5 text-text-muted" />
          <p className="text-[13px] text-text-muted">No pending invites</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-3 rounded-[4px] border border-border-default px-3 py-2.5"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface">
                <span className="text-[10px] text-text-muted">
                  {invite?.email?.[0]?.toUpperCase()}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-text-primary">{invite.email}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <RoleBadge role={invite.role as WorkspaceRole} />
                  <span className="text-[11px] text-text-muted">
                    expires{' '}
                    {formatDistanceToNow(new Date(invite.expiresAt), {
                      addSuffix: true,
                    })}
                  </span>
                  {invite.inviter && (
                    <span className="text-[11px] text-text-muted">
                      · by {invite.inviter.name ?? invite.inviter.email}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() =>
                  cancelInvite(invite.id, {
                    onSuccess: () => toast.success('Invite cancelled'),
                    onError: () => toast.error('Failed to cancel invite'),
                  })
                }
                className="shrink-0 text-text-muted transition-colors hover:text-danger-text"
                title="Cancel invite"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
