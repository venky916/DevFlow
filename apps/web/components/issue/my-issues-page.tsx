"use client";

import { useMemo, useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { KanbanColumn } from "../../components/board/kanban-column";
import { IssueSlideOver } from "../../components/issue/issue-slide-over";
import { FilterBar } from "../../components/shared/filter-bar";
import { useMyIssues, type MyIssuesFilters } from "../../hooks/use-my-issues";
import type { IssueStatus } from "@devflow/types";

const STATUSES: IssueStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
];

export function MyIssuesPage() {
  const [filters, setFilters] = useState<MyIssuesFilters>({});
  const { data, isLoading, isFetching, refetch } = useMyIssues(filters);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // derived from whatever's currently loaded — narrows as filters narrow,
  // widens back out the moment filters are cleared and the full set refetches
  const projectOptions = useMemo(() => {
    if (!data) return [];
    const all = STATUSES.flatMap((s) => data.columns[s] ?? []);
    const unique = new Map(all.map((i) => [i.project.id, i.project.name]));
    return Array.from(unique, ([value, label]) => ({ label, value }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const totalIssues = data
    ? STATUSES.reduce((acc, s) => acc + (data.columns[s]?.length ?? 0), 0)
    : 0;

  // find the selected issue across all columns so the slideover gets
  // its workspaceSlug/projectSlug/projectId from IMyIssue's `project` field
  const selectedIssue = selectedIssueId
    ? STATUSES.flatMap((s) => data?.columns[s] ?? []).find(
        (i) => i.id === selectedIssueId,
      )
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[13px] font-medium text-text-primary">
            My Issues
            <span className="ml-2 text-text-muted font-normal">
              {totalIssues} issues
            </span>
          </h1>
          <div className="h-4 w-px bg-border-default" />
          <FilterBar
            fields={["project", "sprint", "priority", "type", "dueDate"]}
            projectOptions={projectOptions}
            filters={filters}
            onChange={setFilters}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RotateCw
            className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {totalIssues === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-[13px] text-text-muted">
            No issues match these filters
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden px-6 py-4">
          <div className="flex gap-4 h-full overflow-x-auto pb-4">
            {STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                issues={data?.columns[status] ?? []}
                onIssueClick={setSelectedIssueId}
              />
            ))}
          </div>
        </div>
      )}

      <IssueSlideOver
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        projectId={selectedIssue?.project.id ?? ""}
        workspaceSlug={selectedIssue?.project.workspace.slug ?? ""}
        projectSlug={selectedIssue?.project.slug ?? ""}
      />
    </div>
  );
}
