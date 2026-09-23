"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import {
  useQueryState,
  useQueryStates,
  parseAsString,
  parseAsBoolean,
  parseAsStringEnum,
} from "nuqs";
import type { SortingState } from "@tanstack/react-table";
import { KanbanBoard } from "./kanban-board";
import { BoardHeader } from "./board-header";
import { ListView } from "../shared/list-view";
import { useBoard } from "../../hooks/use-board";
import { useIssueList, type IssueListParams } from "../../hooks/use-issues";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import { useBoardStore } from "../../stores/board.store";
import type { IUserPublic } from "@devflow/types";
import { useProjectSprints, useProjectMembers } from "../../hooks/use-issues";
import { CreateIssueModal } from "../issue/create-issue-modal";
import { IssueSlideOver } from "../issue/issue-slide-over";
import { IssueFilters } from "../shared/filter-bar";
import PageLoading from "../shared/page-loading";
import PageError from "../shared/page-error";
import { useCanMoveIssue } from "../../hooks/use-can-move-issue";

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
  const [view, setView] = useQueryState(
    "view",
    parseAsStringEnum(["board", "list"]).withDefault("board"),
  );
  const [rawFilters, setRawFilters] = useQueryStates(filterParsers);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const activeSprint = useBoardStore((s) => s.activeSprint);
  const { canMoveToSprint } = useCanMoveIssue();

  const [listPage, setListPage] = useState(1);
  const [listSorting, setListSorting] = useState<SortingState>([
    { id: "position", desc: false },
  ]);

  const filters = Object.fromEntries(
    Object.entries(rawFilters).filter(([, v]) => v !== null),
  ) as IssueFilters;

  const {
    data: workspaces,
    isLoading: wsLoading,
    isError: wsError,
    refetch: refetchWorkspaces,
  } = useWorkspaces();
  const workspace = workspaces?.find((w) => w.slug === workspaceSlug);

  const {
    data: projects,
    isLoading: projLoading,
    isError: projError,
    refetch: refetchProjects,
  } = useProjects(workspace?.id ?? "");
  const project = projects?.find((p) => p.slug === projectSlug);

  // Board view's data — only meaningfully used when view === "board"
  const {
    isLoading: boardLoading,
    isFetching,
    refetch,
    isError: boardError,
  } = useBoard(project?.id ?? "", filters);

  // List view's data — only meaningfully used when view === "list"
  const listSortBy = (listSorting[0]?.id ??
    "position") as IssueListParams["sortBy"];
  const listSortOrder: "asc" | "desc" = listSorting[0]?.desc ? "desc" : "asc";

  const {
    data: listData,
    isLoading: listLoading,
    isFetching: listFetching,
    isError: listError,
    refetch: refetchList,
  } = useIssueList(project?.id ?? "", {
    ...filters,
    page: listPage,
    limit: 25,
    sortBy: listSortBy,
    sortOrder: listSortOrder,
  });

  const { data: sprints } = useProjectSprints(project?.id ?? "");
  const { data: members } = useProjectMembers(project?.id ?? "");

  const memberUsers: IUserPublic[] =
    members?.map((m) => m.user!).filter(Boolean) ?? [];

  const handleFiltersChange = (f: IssueFilters) => {
    const normalized = Object.fromEntries(
      Object.keys(filterParsers).map((key) => [key, (f as any)[key] ?? null]),
    );
    setRawFilters(normalized);
    setListPage(1);
  };

  if (wsLoading || projLoading) {
    return <PageLoading />;
  }

  if (wsError) {
    return (
      <PageError
        message="Couldn't load workspace"
        onRetry={() => refetchWorkspaces()}
      />
    );
  }

  if (projError) {
    return (
      <PageError
        message="Couldn't load project"
        onRetry={() => refetchProjects()}
      />
    );
  }

  if (!project) {
    return <PageLoading />; // ProjectAccessGuard safety net
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <BoardHeader
        activeSprint={activeSprint}
        members={memberUsers}
        projectId={project.id}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={() => (view === "board" ? refetch() : refetchList())}
        isRefreshing={view === "board" ? isFetching : listFetching}
        onCreateIssue={() => setShowCreateIssue(true)}
        view={view}
        onViewChange={setView}
      />

      <div className="flex-1 overflow-hidden">
        {view === "board" ? (
          boardLoading ? (
            <PageLoading />
          ) : boardError ? (
            <PageError
              message="Couldn't load issues"
              onRetry={() => refetch()}
            />
          ) : (
            <div className="h-full px-6 py-4">
              <KanbanBoard projectId={project.id} onIssueClick={setIssueId} />
            </div>
          )
        ) : (
          <ListView
            data={listData}
            isLoading={listLoading}
            isFetching={listFetching}
            isError={listError}
            refetch={refetchList}
            page={listPage}
            onPageChange={setListPage}
            sorting={listSorting}
            onSortingChange={setListSorting}
            onIssueClick={setIssueId}
          />
        )}
      </div>

      <CreateIssueModal
        open={showCreateIssue}
        onClose={() => setShowCreateIssue(false)}
        projectId={project.id}
        sprints={sprints ?? []}
        members={memberUsers}
        activeSprint={activeSprint}
        canSetSprint={canMoveToSprint}
      />

      <IssueSlideOver
        issueId={issueId}
        onClose={() => setIssueId(null)}
        projectId={project.id}
        workspaceSlug={workspaceSlug}
        projectSlug={projectSlug}
      />
    </div>
  );
}
