"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, ShieldCheck } from "lucide-react";
import { Badge } from "@devflow/ui/components/badge";
import { Avatar } from "@devflow/ui/components/avatar";
import { Select } from "@devflow/ui/components/select";
import { Spinner } from "@devflow/ui/components/spinner";
import { SectionHeading } from "../../shared/section-heading";
import {
  useProjectMembers,
  useUpdateProjectMemberRole,
  useRemoveProjectMember,
} from "../../../hooks/use-project-settings";
import { useAuthStore } from "../../../stores/auth.store";
import {
  PROJECT_ROLE_OPTIONS,
  projectRoleVariant,
  displayName,
} from "../../../lib/roles";
import type { ProjectRole } from "@devflow/types";

interface Props {
  projectId: string;
  isLead: boolean;
}

export function MembersTab({ projectId, isLead }: Props) {
  const user = useAuthStore((s) => s.user);
  const { data: members, isLoading } = useProjectMembers(projectId);
  const { mutate: updateRole, isPending: updatingRole } =
    useUpdateProjectMemberRole(projectId);
  const { mutate: removeMember } = useRemoveProjectMember(projectId);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (isLoading)
    return (
      <div className="flex justify-center pt-8">
        <Spinner size="sm" />
      </div>
    );

  return (
    <div className="flex flex-col gap-2">
      <SectionHeading
        title="Project members"
        description="Manage who has access to this project and their roles."
      />
      <div className="flex flex-col gap-2">
        {members?.map((member: any) => {
          const isMe = member.userId === user?.id;
          const canChangeRole = isLead && !isMe;
          const canRemove = isLead && !isMe;

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[4px] border border-border-default hover:border-border-emphasis transition-colors"
            >
              <Avatar
                name={displayName(member.user)}
                src={member.user?.avatarUrl ?? undefined}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] text-text-primary truncate">
                    {displayName(member.user)}
                  </p>
                  {isMe && (
                    <span className="text-[10px] text-text-muted font-mono shrink-0">
                      you
                    </span>
                  )}
                  {member.role === "LEAD" && (
                    <ShieldCheck className="h-3 w-3 text-success-text shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-text-muted truncate">
                  {member.user?.email}
                </p>
              </div>

              <div className="shrink-0">
                {canChangeRole ? (
                  <div className="w-[130px]">
                    <Select
                      options={PROJECT_ROLE_OPTIONS}
                      value={member.role}
                      disabled={updatingId === member.userId && updatingRole}
                      onValueChange={(role) => {
                        setUpdatingId(member.userId);
                        updateRole(
                          { userId: member.userId, role: role as ProjectRole },
                          {
                            onSuccess: () => {
                              toast.success(`Role updated to ${role}`);
                              setUpdatingId(null);
                            },
                            onError: () => {
                              toast.error("Failed to update role");
                              setUpdatingId(null);
                            },
                          },
                        );
                      }}
                    />
                  </div>
                ) : (
                  <Badge
                    variant={projectRoleVariant(member.role as ProjectRole)}
                  >
                    {member.role}
                  </Badge>
                )}
              </div>

              {canRemove ? (
                <button
                  onClick={() =>
                    removeMember(member.userId, {
                      onSuccess: () => toast.success("Member removed"),
                      onError: () => toast.error("Failed to remove member"),
                    })
                  }
                  className="text-text-muted hover:text-danger-text transition-colors shrink-0"
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
