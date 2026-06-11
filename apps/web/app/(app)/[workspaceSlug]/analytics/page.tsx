"use client";

import { useParams } from "next/navigation";
import { useWorkspaces } from "../../../../hooks/use-workspaces";
import { Spinner } from "@devflow/ui/components/spinner";
import { BarChart2 } from "lucide-react";

export default function WorkspaceAnalyticsPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();

  const { data: workspaces, isLoading } = useWorkspaces();
  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!currentWorkspace) return null;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[18px] font-semibold text-text-primary mb-1">
          Analytics
        </h1>
        <p className="text-[13px] text-text-muted">{currentWorkspace.name}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {["Total Projects", "Total Members", "Active Sprints"].map((label) => (
          <div
            key={label}
            className="rounded-[6px] border border-border-default p-4"
          >
            <p className="text-[11px] text-text-muted uppercase tracking-[0.06em] font-mono mb-2">
              {label}
            </p>
            <p className="text-[24px] font-semibold text-text-primary">
              {label === "Total Projects"
                ? (currentWorkspace._count?.projects ?? "—")
                : label === "Total Members"
                  ? (currentWorkspace._count?.members ?? "—")
                  : "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-[6px] border border-border-default p-8 flex flex-col items-center justify-center gap-3 text-center">
        <BarChart2 className="h-8 w-8 text-text-muted" />
        <p className="text-[13px] font-medium text-text-primary">
          Analytics coming soon
        </p>
        <p className="text-[12px] text-text-muted max-w-xs">
          Workspace-level charts and activity trends will appear here once the
          analytics backend is ready.
        </p>
      </div>
    </div>
  );
}
