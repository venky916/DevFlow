"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, FolderKanban, Users, Zap } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import { CreateProjectModal } from "../projects/create-project-modal";
import { ProjectCard } from "../projects/project-card";

export function WorkspaceHome() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);
  const { data: projects, isLoading } = useProjects(workspace?.id ?? "");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full p-8 gap-6">
      {/* Header */}
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
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New project
        </Button>
      </div>

      {/* Divider */}
      <div className="h-px bg-border-default" />

      {/* Projects grid */}
      {!projects?.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-border-default rounded-[4px]">
          <div className="h-10 w-10 rounded-[5px] bg-accent-subtle flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-accent" />
          </div>
          <p className="text-[13px] text-text-muted">No projects yet</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            Create your first project
          </Button>
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

      <CreateProjectModal
        open={showModal}
        onClose={() => setShowModal(false)}
        workspaceId={workspace?.id ?? ""}
        workspaceSlug={workspaceSlug}
      />
    </div>
  );
}
