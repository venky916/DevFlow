"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { IssueCard } from "./issue-card";
import { cn } from "@devflow/ui/lib/cn";
import type { IIssueWithRelations, IssueStatus } from "@devflow/types";

const COLUMN_LABELS: Record<IssueStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

interface Props {
  status: IssueStatus;
  issues: IIssueWithRelations[];
  onIssueClick: (issueId: string) => void;
}

export function KanbanColumn({ status, issues, onIssueClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col gap-2 min-w-[260px] w-[260px]">
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted">
          {COLUMN_LABELS[status]}
        </span>
        <span className="text-[11px] text-text-disabled font-mono">
          {issues.length}
        </span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 min-h-[100px] rounded-[4px] p-1 transition-colors",
          isOver && "bg-bg-hover",
        )}
      >
        <SortableContext
          items={issues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onClick={onIssueClick} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
