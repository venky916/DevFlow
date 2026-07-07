"use client";

import { useParams } from "next/navigation";
import { Tabs } from "@devflow/ui/components/tabs";
import { Spinner } from "@devflow/ui/components/spinner";
import { useWorkspaces } from "../../../hooks/use-workspaces";
import { useProjects } from "../../../hooks/use-projects";
import { useProjectMembers } from "../../../hooks/use-project-settings";
import { useAuthStore } from "../../../stores/auth.store";
import { GeneralTab } from "./general-tab";
import { MembersTab } from "./members-tab";
import { AddMemberTab } from "./add-member-tab";
import { LabelsTab } from "./labels-tab";

export function ProjectSettings() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const user = useAuthStore((s) => s.user);

  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);
  const { data: projects } = useProjects(workspace?.id ?? "");
  const project = projects?.find((p) => p.slug === projectSlug);
  const { data: members } = useProjectMembers(project?.id ?? "");

  if (!project || !workspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  const isLead =
    members?.find((m: any) => m.userId === user?.id)?.role === "LEAD";
  const isAdmin =
    workspace.members?.find((m: any) => m.userId === user?.id)?.role ===
    "ADMIN";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] px-8 py-6">
          <h1 className="text-[16px] font-medium text-text-primary mb-6">
            Project Settings
          </h1>
          <Tabs
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
                    canDelete={isAdmin}
                  />
                ),
              },
              {
                label: "Members",
                value: "members",
                content: <MembersTab projectId={project.id} isLead={isLead} />,
              },
              ...(isLead || isAdmin
                ? [
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
                  ]
                : []),
            ]}
          />
        </div>
      </div>
    </div>
  );
}
