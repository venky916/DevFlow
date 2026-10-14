"use client";

import { X } from "lucide-react";

import type { WorkspaceRole } from "@devflow/types";
import { Avatar } from "@devflow/ui/components/avatar";
import { Select } from "@devflow/ui/components/select";
import { Spinner } from "@devflow/ui/components/spinner";

import {
  useRemoveMember,
  useUpdateMemberRole,
  useWorkspaceMembers,
} from "../../../hooks/use-workspaces";
import { formatTimeAgo } from "../../../lib/format-date";
import { displayName, WORKSPACE_ROLE_OPTIONS } from "../../../lib/roles";
import { useAuthStore } from "../../../stores/auth.store";
import {PageError} from "../../shared/page-error";
import { SectionHeading } from "../../shared/section-heading";
import { RoleBadge } from "../../shared/role-badge";

export function MembersTab({ workspaceId }: { workspaceId: string }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const {
    data: members,
    isLoading,
    isError,
    refetch,
  } = useWorkspaceMembers(workspaceId);
  const {
    mutate: updateRole,
    isPending: updatingRole,
    variables,
  } = useUpdateMemberRole(workspaceId);
  const { mutate: removeMember } = useRemoveMember(workspaceId);

  if (isLoading) {
    return (
      <div className="flex justify-center pt-8">
        <Spinner size="sm" />
      </div>
    );
  }
  if (isError || !members) {
    return (
      <PageError message="Couldn't load members" onRetry={() => refetch()} />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <SectionHeading
        title="Workspace members"
        description="Manage who has access to this workspace and their roles."
      />
      <div className="flex flex-col gap-2">
        {members.map((member) => {
          const isMe = member.userId === currentUserId;
          const isUpdating =
            updatingRole && variables?.userId === member.userId;

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
                  <p className="truncate text-body text-text-primary">
                    {displayName(member.user)}
                  </p>
                  {isMe && (
                    <span className="shrink-0 font-mono text-2xs text-text-muted">
                      you
                    </span>
                  )}
                </div>
                <p className="truncate text-2xs text-text-muted">
                  {member.user.email}
                  <span className="ml-1.5">
                    · joined {formatTimeAgo(member.joinedAt)}
                  </span>
                </p>
              </div>

              <div className="shrink-0">
                {isMe ? (
                  <RoleBadge role={member.role} />
                ) : (
                  <div className="w-32">
                    <Select
                      options={WORKSPACE_ROLE_OPTIONS}
                      value={member.role}
                      disabled={isUpdating}
                      onValueChange={(role) =>
                        updateRole({
                          userId: member.userId,
                          role: role as WorkspaceRole,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              {isMe ? (
                <div className="w-3.5 shrink-0" />
              ) : (
                <button
                  type="button"
                  onClick={() => removeMember(member.userId)}
                  className="shrink-0 text-text-muted transition-colors hover:text-danger-text"
                  aria-label="Remove from workspace"
                  title="Remove from workspace"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
