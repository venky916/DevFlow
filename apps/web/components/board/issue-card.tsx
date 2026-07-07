"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LabelChip } from "@devflow/ui/components/label-chip";
import { PRIORITY_COLORS } from "../../lib/issue-constants";
import type { IIssueWithRelations } from "@devflow/types";
import { Circle, Layers } from "lucide-react";

interface Props {
  issue: IIssueWithRelations;
  onClick: (issueId: string) => void;
}

export function IssueCard({ issue, onClick }: Props) {
  const [hovered, setHovered] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const labels = issue.labels?.map((l: any) => l.label) ?? [];
  const children = issue.children ?? [];
  const childCount = children.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(issue.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col p-[10px_12px] rounded-[4px] border border-border-default bg-bg-surface hover:border-border-emphasis cursor-pointer transition-colors"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          {childCount > 0 ? (
            <Layers className="h-3 w-3 text-text-muted shrink-0" />
          ) : (
            <Circle className="h-3 w-3 text-text-muted shrink-0" />
          )}
          <p className="text-[13px] font-medium text-text-primary leading-snug">
            {issue.title}
          </p>
        </div>

        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {labels.map((label: any) => (
              <LabelChip
                key={label.id}
                name={label.name}
                color={label.color}
                size="sm"
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-[5px] w-[5px] rounded-full shrink-0"
              style={{ backgroundColor: PRIORITY_COLORS[issue.priority] }}
            />
            <span className="text-[10px] font-mono text-accent">
              #{issue.id.slice(-6).toUpperCase()}
            </span>
            {childCount > 0 && (
              <span className="text-[10px] font-mono text-text-muted">
                {childCount} sub
              </span>
            )}
          </div>

          {issue.assignee && (
            <div className="h-[18px] w-[18px] rounded-full bg-accent-subtle flex items-center justify-center text-accent text-[9px] font-medium shrink-0">
              {issue.assignee.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
      </div>

      {/* hover expand — grid-rows trick animates height without knowing content size upfront */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: hovered && childCount > 0 ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border-default mt-2 pt-2 flex flex-col gap-1">
            {children.map((child: any) => (
              <div
                key={child.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(child.id);
                }}
                className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-[4px] hover:bg-bg-hover transition-colors"
              >
                <span className="text-[11px] text-text-secondary truncate">
                  {child.title}
                </span>
                {child.assignee && (
                  <div className="h-[16px] w-[16px] rounded-full bg-accent-subtle flex items-center justify-center text-accent text-[8px] font-medium shrink-0">
                    {child.assignee.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
