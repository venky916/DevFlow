"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/axios";
import { KanbanColumn } from "../../components/board/kanban-column";
import { IssueSlideOver } from "../../components/issue/issue-slide-over";
import type { IIssueWithRelations, IssueStatus } from "@devflow/types";
import { useMyIssues } from "../../hooks/use-my-issues";

const STATUSES: IssueStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
];

export function MyIssuesPage() {
  const { data, isLoading } = useMyIssues();
  const [selectedIssue, setSelectedIssue] =
    useState<IIssueWithRelations | null>(null);

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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-6 py-3 border-b border-border-default shrink-0">
        <h1 className="text-[13px] font-medium text-text-primary">
          My Issues
          <span className="ml-2 text-text-muted font-normal">
            {totalIssues} issues
          </span>
        </h1>
      </div>

      {/* Board */}
      {totalIssues === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-[13px] text-text-muted">
            No issues assigned to you
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
                onIssueClick={setSelectedIssue}
              />
            ))}
          </div>
        </div>
      )}

      {/* Slide-over — projectId comes from the issue itself */}
      <IssueSlideOver
        issueId={selectedIssue?.id ?? null}
        onClose={() => setSelectedIssue(null)}
        projectId={selectedIssue?.project?.id ?? selectedIssue?.projectId ?? ""}
        workspaceSlug={selectedIssue?.project?.workspace?.slug ?? ""}
        projectSlug={selectedIssue?.project?.slug ?? ""}
      />
    </div>
  );
}
