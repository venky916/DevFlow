"use client";

import { toast } from "sonner";
import { Clock, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@devflow/ui/components/badge";
import { Spinner } from "@devflow/ui/components/spinner";
import {
  useWorkspaceInvites,
  useCancelInvite,
} from "../../../hooks/use-workspace-settings";
import { SectionHeading } from "../../shared/section-heading";
import { workspaceRoleVariant } from "../../../lib/roles";
import type { WorkspaceRole } from "@devflow/types";

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
        <div className="flex flex-col items-center justify-center py-12 gap-2 border border-border-default rounded-[4px]">
          <Clock className="h-5 w-5 text-text-muted" />
          <p className="text-[13px] text-text-muted">No pending invites</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[4px] border border-border-default"
            >
              <div className="h-6 w-6 rounded-full bg-bg-surface border border-border-default flex items-center justify-center shrink-0">
                <span className="text-[10px] text-text-muted">
                  {invite?.email?.[0]?.toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-text-primary truncate">
                  {invite.email}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge
                    variant={workspaceRoleVariant(invite.role as WorkspaceRole)}
                  >
                    {invite.role}
                  </Badge>
                  <span className="text-[11px] text-text-muted">
                    expires{" "}
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
                    onSuccess: () => toast.success("Invite cancelled"),
                    onError: () => toast.error("Failed to cancel invite"),
                  })
                }
                className="text-text-muted hover:text-danger-text transition-colors shrink-0"
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
