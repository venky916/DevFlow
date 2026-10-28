'use client';

import { Clock, Trash2 } from 'lucide-react';

import { Spinner } from '@devflow/ui/components/spinner';

import { useCancelInvite, useWorkspaceInvites } from '../../../hooks/use-workspaces';
import { formatTimeAgo } from '../../../lib/format-date';
import { PageError } from '../../shared/page-error';
import { RoleBadge } from '../../shared/role-badge';
import { SectionHeading } from '../../shared/section-heading';

export function PendingInvitesTab({ workspaceId }: { workspaceId: string }) {
  const { data: invites, isLoading, isError, refetch } = useWorkspaceInvites(workspaceId);
  const { mutate: cancelInvite } = useCancelInvite(workspaceId);

  if (isLoading) {
    return (
      <div className="flex justify-center pt-8">
        <Spinner size="sm" />
      </div>
    );
  }
  if (isError || !invites) {
    return <PageError message="Couldn't load invites" onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading
        title="Pending invitations"
        description="Invites that have been sent but not yet accepted."
      />
      {invites.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-base border border-border-default py-12">
          <Clock className="size-5 text-text-muted" />
          <p className="text-body text-text-muted">No pending invites</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-3 rounded-base border border-border-default px-3 py-2.5"
            >
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface">
                <span className="text-2xs text-text-muted">
                  {invite.email.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-body text-text-primary">{invite.email}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <RoleBadge role={invite.role} />
                  <span className="text-2xs text-text-muted">
                    expires {formatTimeAgo(invite.expiresAt)}
                  </span>
                  {invite.inviter && (
                    <span className="text-2xs text-text-muted">
                      · by {invite.inviter.name ?? invite.inviter.email}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => cancelInvite(invite.id)}
                className="shrink-0 text-text-muted transition-colors hover:text-danger-text"
                aria-label="Cancel invite"
                title="Cancel invite"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
