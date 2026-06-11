"use client";

import { useParams } from "next/navigation";
import { useProjects } from "../../../../../hooks/use-projects";
import { useWorkspaces } from "../../../../../hooks/use-workspaces";
import { Spinner } from "@devflow/ui/components/spinner";
import { BarChart2 } from "lucide-react";

export default function ProjectAnalyticsPage() {
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
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[18px] font-semibold text-text-primary mb-1">
          Analytics
        </h1>
        <p className="text-[13px] text-text-muted">{project.name}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {["Issues Completed", "Sprint Velocity", "Open Issues"].map((label) => (
          <div
            key={label}
            className="rounded-[6px] border border-border-default p-4"
          >
            <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono mb-2">
              {label}
            </p>
            <p className="text-[24px] font-semibold text-text-primary">—</p>
          </div>
        ))}
      </div>

      <div className="rounded-[6px] border border-border-default p-8 flex flex-col items-center justify-center gap-3 text-center">
        <BarChart2 className="h-8 w-8 text-text-muted" />
        <p className="text-[13px] font-medium text-text-primary">
          Analytics coming soon
        </p>
        <p className="text-[12px] text-text-muted max-w-xs">
          Sprint burndown, issue cycle time, and velocity charts will appear
          here once the analytics backend is ready.
        </p>
      </div>
    </div>
  );
}
