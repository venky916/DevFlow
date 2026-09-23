"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { Tabs } from "@devflow/ui/components/tabs";
import { useWorkspaces } from "../../../hooks/use-workspaces";
import { useProjects } from "../../../hooks/use-projects";
import { usePermissions } from "../../../hooks/use-permissions";
import { canProject } from "../../../lib/permissions";
import PageLoading from "../../shared/page-loading";
import PageError from "../../shared/page-error";
import { GeneralTab } from "./general-tab";
import { MembersTab } from "./members-tab";
import { AddMemberTab } from "./add-member-tab";
import { LabelsTab } from "./labels-tab";

export function ProjectSettings() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const router = useRouter();

  const {
    data: workspaces,
    isLoading: wsLoading,
    isError: wsError,
    refetch: refetchWorkspaces,
  } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);

  const {
    data: projects,
    isLoading: projLoading,
    isError: projError,
    refetch: refetchProjects,
  } = useProjects(workspace?.id ?? "");
  const project = projects?.find((p) => p.slug === projectSlug);

  const { access, isWorkspaceAdmin, isLoading: permLoading } = usePermissions();
  const canAccessSettings = canProject(access, "UPDATE_PROJECT");
  const isLead = access.projectRole === "LEAD";

  // Set of userIds who are workspace ADMINs — used so a project Lead can't
  // change/remove a workspace admin's role even if that admin happens to
  // also have a real ProjectMember row (e.g. the project's creator).
  const workspaceAdminIds = new Set(
    workspace?.members
      ?.filter((m: any) => m.role === "ADMIN")
      .map((m: any) => m.userId) ?? [],
  );

  const [tab, setTab] = useQueryState("tab", { defaultValue: "general" });

  useEffect(() => {
    if (wsLoading || projLoading || permLoading || !project) return;
    if (!canAccessSettings) {
      router.replace(
        `/no-access?reason=insufficient-role&workspace=${workspaceSlug}`,
      );
    }
  }, [
    wsLoading,
    projLoading,
    permLoading,
    canAccessSettings,
    project,
    router,
    workspaceSlug,
  ]);

  if (wsLoading || projLoading || permLoading) {
    return <PageLoading />;
  }

  if (wsError) {
    return (
      <PageError
        message="Couldn't load workspace"
        onRetry={() => refetchWorkspaces()}
      />
    );
  }

  if (projError) {
    return (
      <PageError
        message="Couldn't load project"
        onRetry={() => refetchProjects()}
      />
    );
  }

  if (!project || !workspace || !canAccessSettings) {
    return <PageLoading />; // !project → ProjectAccessGuard safety net; !canAccessSettings → redirect in flight
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] px-8 py-6">
          <h1 className="text-[16px] font-medium text-text-primary mb-6">
            Project Settings
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
                    projectId={project.id}
                    workspaceId={workspace.id}
                    projectName={project.name}
                    projectDescription={project.description}
                    projectColor={project.color}
                    canDelete={isWorkspaceAdmin}
                  />
                ),
              },
              {
                label: "Members",
                value: "members",
                content: (
                  <MembersTab
                    projectId={project.id}
                    isLead={isLead || isWorkspaceAdmin}
                    workspaceAdminIds={workspaceAdminIds}
                  />
                ),
              },
              {
                label: "Add Member",
                value: "add-member",
                content: (
                  <AddMemberTab
                    projectId={project.id}
                    workspaceId={workspace.id}
                  />
                ),
              },
              {
                label: "Labels",
                value: "labels",
                content: <LabelsTab projectId={project.id} />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
