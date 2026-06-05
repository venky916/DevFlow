"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { Badge } from "@devflow/ui/components/badge";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import { useBacklog, useMoveToSprint } from "../../hooks/use-backlog";
import { useSprints } from "../../hooks/use-sprints";
import { CreateIssueModal } from "../board/create-issue-modal";
import { IssueSlideOver } from "../issue/issue-slide-over";
import { toast } from "sonner";
import type { IIssueWithRelations, IssuePriority } from "@devflow/types";

const PRIORITY_COLORS: Record<IssuePriority, string> = {
  URGENT: "#E24B4A",
  HIGH: "#EF9F27",
  MEDIUM: "#639922",
  LOW: "#555555",
  NO_PRIORITY: "#333333",
};

export function BacklogPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedIssue, setSelectedIssue] =
    useState<IIssueWithRelations | null>(null);

  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);
  const { data: projects } = useProjects(workspace?.id ?? "");
  const project = projects?.find((p) => p.slug === projectSlug);

  const { data: issues, isLoading } = useBacklog(project?.id ?? "");
  const { data: sprints } = useSprints(project?.id ?? "");
  const { mutate: moveToSprint } = useMoveToSprint(project?.id ?? "");

  const plannedSprints = sprints?.filter((s) => s.status !== "COMPLETED") ?? [];

  const handleMoveToSprint = (issueId: string, sprintId: string | null) => {
    moveToSprint(
      { issueId, data: { sprintId } },
      {
        onSuccess: () =>
          toast.success(sprintId ? "Moved to sprint!" : "Moved to backlog!"),
        onError: () => toast.error("Failed to move issue"),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-default shrink-0">
        <h1 className="text-[13px] font-medium text-text-primary">
          Backlog
          <span className="ml-2 text-text-muted font-normal">
            {issues?.length ?? 0} issues
          </span>
        </h1>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Issue
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!issues?.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 border border-border-default rounded-[4px]">
            <p className="text-[13px] text-text-muted">Backlog is empty</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCreate(true)}
            >
              Create an issue
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[4px] border border-transparent hover:border-border-default hover:bg-bg-surface transition-colors group"
              >
                {/* Priority dot */}
                <div
                  className="h-[6px] w-[6px] rounded-full shrink-0"
                  style={{ backgroundColor: PRIORITY_COLORS[issue.priority] }}
                />

                {/* Title */}
                <button
                  className="flex-1 text-[13px] text-text-primary text-left truncate"
                  onClick={() => setSelectedIssue(issue)}
                >
                  {issue.title}
                </button>

                {/* ID */}
                <span className="text-[11px] font-mono text-accent shrink-0">
                  #{issue.id.slice(-6).toUpperCase()}
                </span>

                {/* Move to sprint dropdown */}
                {plannedSprints.length > 0 && (
                  <select
                    className="text-[11px] text-text-muted bg-transparent border border-border-default rounded-[3px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    defaultValue=""
                    onChange={(e) =>
                      handleMoveToSprint(issue.id, e.target.value || null)
                    }
                  >
                    <option value="">Move to sprint...</option>
                    {plannedSprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Assignee */}
                {issue.assignee && (
                  <div className="h-[18px] w-[18px] rounded-full bg-accent-subtle flex items-center justify-center text-accent text-[9px] font-medium shrink-0">
                    {issue.assignee.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {project && (
        <>
          <CreateIssueModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            projectId={project.id}
            sprints={sprints ?? []}
            members={[]}
            activeSprint={null}
          />
          <IssueSlideOver
            issueId={selectedIssue?.id ?? null}
            onClose={() => setSelectedIssue(null)}
            projectId={project.id}
          />
        </>
      )}
    </div>
  );
}
