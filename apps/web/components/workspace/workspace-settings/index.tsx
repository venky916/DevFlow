"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { Tabs } from "@devflow/ui/components/tabs";
import { useWorkspaces } from "../../../hooks/use-workspaces";
import { usePermissions } from "../../../hooks/use-permissions";
import { canWorkspace } from "../../../lib/permissions";
import PageLoading from "../../shared/page-loading";
import PageError from "../../shared/page-error";
import { GeneralTab } from "./general-tab";
import { MembersTab } from "./members-tab";
import { SendInviteTab } from "./send-invite-tab";
import { PendingInvitesTab } from "./pending-invites-tab";

export function WorkspaceSettings() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const router = useRouter();
  const {
    data: workspaces,
    isLoading: wsLoading,
    isError,
    refetch,
  } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);

  const { workspaceRole, isLoading: permLoading } = usePermissions();
  const isAdmin = canWorkspace(workspaceRole, "UPDATE_WORKSPACE");

  const [tab, setTab] = useQueryState("tab", { defaultValue: "general" });

  useEffect(() => {
    if (wsLoading || permLoading || !workspace) return;
    if (!isAdmin) {
      router.replace(
        `/no-access?reason=insufficient-role&workspace=${workspaceSlug}`,
      );
    }
  }, [wsLoading, permLoading, isAdmin, workspace, router, workspaceSlug]);

  if (wsLoading || permLoading) {
    return <PageLoading />;
  }

  if (isError) {
    return (
      <PageError
        message="Couldn't load workspace settings"
        onRetry={() => refetch()}
      />
    );
  }

  if (!workspace || !isAdmin) {
    // workspace missing → WorkspaceAccessGuard should've already caught this, this is a safety net
    // !isAdmin → redirect effect above is in flight
    return <PageLoading />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] px-8 py-6">
          <h1 className="text-[16px] font-medium text-text-primary mb-6">
            Workspace Settings
          </h1>
          <Tabs
            value={tab}
            onValueChange={setTab}
            tabs={[
              {
                label: "General",
                value: "general",
                content: (
                  <GeneralTab
                    workspaceId={workspace.id}
                    workspaceName={workspace.name}
                    workspaceLogoUrl={workspace.logoUrl ?? null}
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
