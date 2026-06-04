"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { IIssueWithRelations, IssuePriority } from "@devflow/types";

const PRIORITY_COLORS: Record<IssuePriority, string> = {
  URGENT: "#E24B4A",
  HIGH: "#EF9F27",
  MEDIUM: "#639922",
  LOW: "#555555",
  NO_PRIORITY: "#333333",
};

interface Props {
  issue: IIssueWithRelations;
  onClick: (issue: IIssueWithRelations) => void;
}

export function IssueCard({ issue, onClick }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(issue)}
      className="flex flex-col gap-2 p-[10px_12px] rounded-[4px] border border-border-default bg-bg-surface hover:border-border-emphasis cursor-pointer transition-colors"
    >
      {/* Title */}
      <p className="text-[13px] font-medium text-text-primary leading-snug">
        {issue.title}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Priority dot */}
          <div
            className="h-[5px] w-[5px] rounded-full shrink-0"
            style={{ backgroundColor: PRIORITY_COLORS[issue.priority] }}
          />
          {/* Issue ID */}
          <span className="text-[10px] font-mono text-accent">
            #{issue.id.slice(-6).toUpperCase()}
          </span>
        </div>

        {/* Assignee */}
        {issue.assignee && (
          <div className="h-[18px] w-[18px] rounded-full bg-accent-subtle flex items-center justify-center text-accent text-[9px] font-medium shrink-0">
            {issue.assignee.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>
    </div>
  );
}
