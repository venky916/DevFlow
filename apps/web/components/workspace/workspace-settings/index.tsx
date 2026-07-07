"use client";

import { useParams } from "next/navigation";
import { Tabs } from "@devflow/ui/components/tabs";
import { Spinner } from "@devflow/ui/components/spinner";
import { useAuthStore } from "../../../stores/auth.store";
import { useWorkspaces } from "../../../hooks/use-workspaces";
import { GeneralTab } from "./general-tab";
import { MembersTab } from "./members-tab";
import { SendInviteTab } from "./send-invite-tab";
import { PendingInvitesTab } from "./pending-invites-tab";

export function WorkspaceSettings() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  // compute isAdmin once here, pass down as prop
  const isAdmin =
    workspace.members?.find((m) => m.userId === user?.id)?.role === "ADMIN";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center px-5 h-[38px] border-b border-border-default shrink-0">
        <div className="flex items-center gap-1.5 text-[12px] font-mono">
          <span className="text-text-muted">{workspace.name}</span>
          <span className="text-text-muted">/</span>
          <span className="text-text-secondary">Settings</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] px-8 py-6">
          <h1 className="text-[16px] font-medium text-text-primary mb-6">
            Workspace Settings
          </h1>
          <Tabs
            tabs={[
              {
                label: "General",
                value: "general",
                content: (
                  <GeneralTab
                    workspaceId={workspace.id}
                    workspaceName={workspace.name}
                    isAdmin={isAdmin}
                  />
                ),
              },
              {
                label: "Members",
                value: "members",
                content: (
                  <MembersTab workspaceId={workspace.id} isAdmin={isAdmin} />
                ),
              },
              {
                label: "Send Invite",
                value: "send-invite",
                content: <SendInviteTab workspaceId={workspace.id} />,
              },
              {
                label: "Pending",
                value: "pending",
                content: <PendingInvitesTab workspaceId={workspace.id} />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
