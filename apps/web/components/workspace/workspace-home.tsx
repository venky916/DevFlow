"use client";

import { useState } from "react";
import { FolderKanban, Plus } from "lucide-react";

import type { IProjectWithMembers, IWorkspaceSummary } from "@devflow/types";
import { Button } from "@devflow/ui/components/button";

import { ROUTES } from "../../constants/routes";
import { canWorkspace } from "../../lib/permissions";
import { CreateProjectModal } from "../projects/create-project-modal";
import { ProjectCard } from "./project-card";
import { EmptyState } from "../shared/empty-state";
import { PageContainer } from "../shared/page-container";
import { PageHeading } from "../shared/page-heading";

interface WorkspaceHomeProps {
  workspace: IWorkspaceSummary;
  projects: IProjectWithMembers[];
}

export function WorkspaceHome({ workspace, projects }: WorkspaceHomeProps) {
  const [showModal, setShowModal] = useState(false);
  const canCreateProject = canWorkspace(
    workspace.currentUserWorkspaceRole,
    "CREATE_PROJECT",
  );

  const newProjectButton = canCreateProject && (
    <Button size="sm" onClick={() => setShowModal(true)}>
      <Plus className="mr-1.5 size-3.5" />
      New project
    </Button>
  );

  return (
    <PageContainer size="full">
      <PageHeading
        title={workspace.name}
        description={`${workspace._count.members} members`}
        actions={newProjectButton}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-5" />}
          message="No projects yet"
          action={
            canCreateProject && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowModal(true)}
              >
                Create your first project
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              href={ROUTES.projectBoard(workspace.slug, project.slug)}
            />
          ))}
        </div>
      )}

      {canCreateProject && (
        <CreateProjectModal
          open={showModal}
          onClose={() => setShowModal(false)}
          workspaceId={workspace.id}
          workspaceSlug={workspace.slug}
        />
      )}
    </PageContainer>
  );
}
