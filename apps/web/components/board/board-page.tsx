"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { KanbanBoard } from "./kanban-board";
import { BoardHeader } from "./board-header";
import { type IssueFilters } from "../shared/filter-bar";
import { useBoard } from "../../hooks/use-board";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import { useBoardStore } from "../../stores/board.store";
import type { IIssueWithRelations, IUserPublic } from "@devflow/types";
import { useProjectSprints, useProjectMembers } from "../../hooks/use-issues";
import { CreateIssueModal } from "../issue/create-issue-modal";
import { IssueSlideOver } from "../issue/issue-slide-over";

export function BoardPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [filters, setFilters] = useState<IssueFilters>({});
  const activeSprint = useBoardStore((s) => s.activeSprint);

  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);
  const { data: projects } = useProjects(workspace?.id ?? "");
  const project = projects?.find((p) => p.slug === projectSlug);

  const { isLoading, isFetching, refetch } = useBoard(
    project?.id ?? "",
    filters,
  );
  const { data: sprints } = useProjectSprints(project?.id ?? "");
  const { data: members } = useProjectMembers(project?.id ?? "");

  const memberUsers: IUserPublic[] =
    members?.map((m) => m.user!).filter(Boolean) ?? [];

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {project && (
        <BoardHeader
          activeSprint={activeSprint}
          members={memberUsers}
          projectId={project.id}
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
          onCreateIssue={() => setShowCreateIssue(true)}
        />
      )}

      <div className="flex-1 overflow-hidden px-6 py-4">
        {project && (
          <KanbanBoard
            projectId={project.id}
            onIssueClick={setSelectedIssueId}
          />
        )}
      </div>

      {project && (
        <CreateIssueModal
          open={showCreateIssue}
          onClose={() => setShowCreateIssue(false)}
          projectId={project.id}
          sprints={sprints ?? []}
          members={memberUsers}
          activeSprint={activeSprint}
        />
      )}

      {project && (
        <IssueSlideOver
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          projectId={project.id}
          workspaceSlug={workspaceSlug}
          projectSlug={projectSlug}
        />
      )}
    </div>
  );
}
