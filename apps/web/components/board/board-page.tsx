// board-page.tsx
"use client";

import { useParams } from "next/navigation";
import {
  useQueryState,
  useQueryStates,
  parseAsString,
  parseAsBoolean,
} from "nuqs";
import { KanbanBoard } from "./kanban-board";
import { BoardHeader } from "./board-header";
import { useBoard } from "../../hooks/use-board";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import { useBoardStore } from "../../stores/board.store";
import type { IIssueWithRelations, IUserPublic } from "@devflow/types";
import { useProjectSprints, useProjectMembers } from "../../hooks/use-issues";
import { CreateIssueModal } from "../issue/create-issue-modal";
import { IssueSlideOver } from "../issue/issue-slide-over";
import { useState } from "react";
import { IssueFilters } from "../shared/filter-bar";

const filterParsers = {
  assigneeId: parseAsString,
  labelId: parseAsString,
  priority: parseAsString,
  type: parseAsString,
  dueDateFrom: parseAsString,
  dueDateTo: parseAsString,
  noDueDate: parseAsBoolean,
  dueDatePreset: parseAsString,
  q: parseAsString,
};

export function BoardPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();

  const [issueId, setIssueId] = useQueryState("issue", parseAsString);
  const [rawFilters, setRawFilters] = useQueryStates(filterParsers);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const activeSprint = useBoardStore((s) => s.activeSprint);

  // strip nulls so downstream consumers (useBoard's queryKey, FilterBar) see
  // the same "absent = undefined" shape they already expect
  const filters = Object.fromEntries(
    Object.entries(rawFilters).filter(([, v]) => v !== null),
  );

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

  const handleFiltersChange = (f: IssueFilters) => {
    const normalized = Object.fromEntries(
      Object.keys(filterParsers).map((key) => [
        key,
        (f as any)[key] ?? null, // undefined (or missing) → null, so nuqs removes the param
      ]),
    );
    setRawFilters(normalized);
  };

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
          onFiltersChange={handleFiltersChange}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
          onCreateIssue={() => setShowCreateIssue(true)}
        />
      )}

      <div className="flex-1 overflow-hidden px-6 py-4">
        {project && (
          <KanbanBoard projectId={project.id} onIssueClick={setIssueId} />
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
          issueId={issueId}
          onClose={() => setIssueId(null)}
          projectId={project.id}
          workspaceSlug={workspaceSlug}
          projectSlug={projectSlug}
        />
      )}
    </div>
  );
}
