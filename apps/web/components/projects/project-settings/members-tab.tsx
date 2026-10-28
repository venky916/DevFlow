'use client';

import { ShieldCheck, X } from 'lucide-react';

import type { ProjectRole } from '@devflow/types';
import { Avatar } from '@devflow/ui/components/avatar';
import { Select } from '@devflow/ui/components/select';
import { Spinner } from '@devflow/ui/components/spinner';

import {
  useProjectMembers,
  useRemoveProjectMember,
  useUpdateProjectMemberRole,
} from '../../../hooks/use-projects';
import { displayName, PROJECT_ROLE_OPTIONS } from '../../../lib/roles';
import { useAuthStore } from '../../../stores/auth.store';
import { PageError } from '../../shared/page-error';
import { RoleBadge } from '../../shared/role-badge';
import { SectionHeading } from '../../shared/section-heading';

export function MembersTab({ projectId }: { projectId: string }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: members, isLoading, isError, refetch } = useProjectMembers(projectId);
  const {
    mutate: updateRole,
    isPending: updatingRole,
    variables,
  } = useUpdateProjectMemberRole(projectId);
  const { mutate: removeMember } = useRemoveProjectMember(projectId);

  if (isLoading) {
    return (
      <div className="flex justify-center pt-8">
        <Spinner size="sm" />
      </div>
    );
  }
  if (isError || !members) {
    return <PageError message="Couldn't load members" onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col gap-2">
      <SectionHeading
        title="Project members"
        description="Manage who has access to this project and their roles."
      />
      <div className="flex flex-col gap-2">
        {members.map((member) => {
          const isMe = member.userId === currentUserId;
          // a workspace admin's access comes from the workspace, so it isn't edited here
          const canManage = !isMe && !member.isWorkspaceAdmin;
          const isUpdating = updatingRole && variables?.userId === member.userId;

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-base border border-border-default px-3 py-2.5 transition-colors hover:border-border-emphasis"
            >
              <Avatar
                name={displayName(member.user)}
                src={member.user.avatarUrl ?? undefined}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-body text-text-primary">{displayName(member.user)}</p>
                  {isMe && <span className="shrink-0 font-mono text-2xs text-text-muted">you</span>}
                  {(member.role === 'LEAD' || member.isWorkspaceAdmin) && (
                    <ShieldCheck className="size-3 shrink-0 text-success-text" />
                  )}
                </div>
                <p className="truncate text-2xs text-text-muted">{member.user.email}</p>
              </div>

              <div className="shrink-0">
                {canManage ? (
                  <div className="w-32">
                    <Select
                      options={PROJECT_ROLE_OPTIONS}
                      value={member.role}
                      disabled={isUpdating}
                      onValueChange={(role) =>
                        updateRole({
                          userId: member.userId,
                          role: role as ProjectRole,
                        })
                      }
                    />
                  </div>
                ) : (
                  <RoleBadge role={member.isWorkspaceAdmin ? 'ADMIN' : member.role} />
                )}
              </div>

              {canManage ? (
                <button
                  type="button"
                  onClick={() => removeMember(member.userId)}
                  className="shrink-0 text-text-muted transition-colors hover:text-danger-text"
                  aria-label="Remove from project"
                  title="Remove from project"
                >
                  <X className="size-3.5" />
                </button>
              ) : (
                <div className="w-3.5 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
