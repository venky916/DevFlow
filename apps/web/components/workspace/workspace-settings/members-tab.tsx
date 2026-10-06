'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import type { WorkspaceRole } from '@devflow/types';
import { Avatar } from '@devflow/ui/components/avatar';
import { Select } from '@devflow/ui/components/select';
import { Spinner } from '@devflow/ui/components/spinner';

import {
  useRemoveMember,
  useUpdateMemberRole,
  useWorkspaceMembers,
} from '../../../hooks/use-workspace-settings';
import { displayName, WORKSPACE_ROLE_OPTIONS } from '../../../lib/roles';
import { useAuthStore } from '../../../stores/auth.store';
import { RoleBadge } from '../../shared/role-badge';
import { SectionHeading } from '../../shared/section-heading';

interface Props {
  workspaceId: string;
  isAdmin: boolean;
}

export function MembersTab({ workspaceId, isAdmin }: Props) {
  const user = useAuthStore((s) => s.user);
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);
  const { mutate: updateRole, isPending: updatingRole } = useUpdateMemberRole(workspaceId);
  const { mutate: removeMember } = useRemoveMember(workspaceId);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center pt-8">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <SectionHeading
        title="Workspace members"
        description="Manage who has access to this workspace and their roles."
      />
      <div className="flex flex-col gap-2">
        {members?.map((member: any) => {
          const isMe = member.userId === user?.id;
          const canChangeRole = isAdmin && !isMe;
          const canRemove = isAdmin && !isMe;

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-[4px] border border-border-default px-3 py-2.5 transition-colors hover:border-border-emphasis"
            >
              <Avatar
                name={displayName(member.user)}
                src={member.user?.avatarUrl ?? undefined}
                size="sm"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[13px] text-text-primary">
                    {displayName(member.user)}
                  </p>
                  {isMe && (
                    <span className="shrink-0 font-mono text-[10px] text-text-muted">you</span>
                  )}
                </div>
                <p className="truncate text-[11px] text-text-muted">
                  {member.user?.email}
                  {member.joinedAt && (
                    <span className="ml-1.5">
                      · joined{' '}
                      {formatDistanceToNow(new Date(member.joinedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </p>
              </div>

              <div className="shrink-0">
                {canChangeRole ? (
                  <div className="w-[130px]">
                    <Select
                      options={WORKSPACE_ROLE_OPTIONS}
                      value={member.role}
                      disabled={updatingId === member.userId && updatingRole}
                      onValueChange={(role) => {
                        setUpdatingId(member.userId);
                        updateRole(
                          {
                            userId: member.userId,
                            role: role as WorkspaceRole,
                          },
                          {
                            onSuccess: () => {
                              toast.success(`Role updated to ${role}`);
                              setUpdatingId(null);
                            },
                            onError: () => {
                              toast.error('Failed to update role');
                              setUpdatingId(null);
                            },
                          },
                        );
                      }}
                    />
                  </div>
                ) : (
                  <RoleBadge role={member.role as WorkspaceRole} />
                )}
              </div>

              {canRemove ? (
                <button
                  onClick={() =>
                    removeMember(member.userId, {
                      onSuccess: () => toast.success('Member removed'),
                      onError: () => toast.error('Failed to remove member'),
                    })
                  }
                  className="shrink-0 text-text-muted transition-colors hover:text-danger-text"
                  title="Remove from workspace"
                >
                  <X className="h-3.5 w-3.5" />
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
