"use client";

import { useParams } from "next/navigation";
import { useProjects } from "../../../../hooks/use-projects";
import { useWorkspaces } from "../../../../hooks/use-workspaces";
import { Spinner } from "@devflow/ui/components/spinner";

export default function ProjectOverviewPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();

  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);
  const { data: projects, isLoading } = useProjects(currentWorkspace?.id ?? "");
  const project = projects?.find((p) => p.slug === projectSlug);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[18px] font-semibold text-text-primary mb-1">
          {project.name}
        </h1>
        {project.description && (
          <p className="text-[13px] text-text-muted">{project.description}</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-[6px] border border-border-default p-4">
          <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono mb-3">
            Overview
          </p>
          <p className="text-[13px] text-text-muted">
            Sprint summary and issue counts coming soon.
          </p>
        </div>
        <div className="rounded-[6px] border border-border-default p-4">
          <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono mb-3">
            Recent Activity
          </p>
          <p className="text-[13px] text-text-muted">
            Activity log coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
