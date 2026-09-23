"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderKanban, Users } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { CreateProjectModal } from "../projects/create-project-modal";
import { ProjectCard } from "../projects/project-card";
import { IProjectWithMembers, IWorkspaceWithMembers } from "@devflow/types";
import { usePermissions } from "../../hooks/use-permissions";
import { canWorkspace } from "../../lib/permissions";

interface WorkspaceHomeProps {
  workspace: IWorkspaceWithMembers | undefined;
  workspaceSlug: string;
  projects: IProjectWithMembers[];
}

export function WorkspaceHome({
  workspace,
  workspaceSlug,
  projects,
}: WorkspaceHomeProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const { workspaceRole, isLoading: permLoading } = usePermissions();
  const canCreateProject =
    !permLoading && canWorkspace(workspaceRole, "CREATE_PROJECT");

  return (
    <div className="flex flex-col w-full p-8 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-text-primary">
            {workspace?.name}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Users className="h-3 w-3 text-text-muted" />
            <span className="text-[12px] text-text-muted">
              {workspace?._count?.members ?? 0} members
            </span>
          </div>
        </div>
        {canCreateProject && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New project
          </Button>
        )}
      </div>
      <div className="h-px bg-border-default" />
      {!projects.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-border-default rounded-[4px]">
          <div className="h-10 w-10 rounded-[5px] bg-accent-subtle flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-accent" />
          </div>
          <p className="text-[13px] text-text-muted">No projects yet</p>
          {canCreateProject && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowModal(true)}
            >
              Create your first project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() =>
                router.push(`/${workspaceSlug}/${project.slug}/board`)
              }
            />
          ))}
        </div>
      )}
      {canCreateProject && (
        <CreateProjectModal
          open={showModal}
          onClose={() => setShowModal(false)}
          workspaceId={workspace?.id ?? ""}
          workspaceSlug={workspaceSlug}
        />
      )}
    </div>
  );
}
