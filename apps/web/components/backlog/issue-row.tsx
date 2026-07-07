"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Circle, Layers } from "lucide-react";
import { LabelChip } from "@devflow/ui/components/label-chip";
import { PRIORITY_COLORS } from "../../lib/issue-constants";
import type { IIssueWithRelations } from "@devflow/types";

interface Props {
  issue: IIssueWithRelations;
  onOpen: (issueId: string) => void;
}

export function IssueRow({ issue, onOpen }: Props) {
  const [hovered, setHovered] = useState(false);
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
  const labels = issue.labels?.map((l: any) => l.label) ?? [];
  const children = issue.children ?? [];
  const childCount = children.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col rounded-[4px] border border-transparent hover:border-border-default hover:bg-bg-surface transition-colors group"
    >
      <div
        className="flex items-center gap-3 px-3 py-2 cursor-pointer"
        onClick={() => onOpen(issue.id)}
      >
        <div
          className="h-[5px] w-[5px] rounded-full shrink-0"
          style={{ backgroundColor: PRIORITY_COLORS[issue.priority] }}
        />
        {childCount > 0 ? (
          <Layers className="h-3 w-3 text-text-muted shrink-0" />
        ) : (
          <Circle className="h-3 w-3 text-text-muted shrink-0" />
        )}
        <span className="flex-1 text-[13px] text-text-primary truncate">
          {issue.title}
        </span>
        {labels.length > 0 && (
          <div className="flex gap-1 shrink-0">
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
        {childCount > 0 && (
          <span className="text-[10px] font-mono text-text-muted shrink-0">
            {childCount} sub
          </span>
        )}
        <span className="text-[11px] font-mono text-accent shrink-0">
          #{issue.id.slice(-6).toUpperCase()}
        </span>
        {issue.assignee && (
          <div className="h-[18px] w-[18px] rounded-full bg-accent-subtle flex items-center justify-center text-accent text-[9px] font-medium shrink-0">
            {issue.assignee.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: hovered && childCount > 0 ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pl-8 pr-3 pb-2 flex flex-col gap-1">
            {children.map((child: any) => (
              <div
                key={child.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(child.id);
                }}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded-[4px] hover:bg-bg-hover transition-colors"
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
