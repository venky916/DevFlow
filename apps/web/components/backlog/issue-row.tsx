"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lock, Circle, Layers } from "lucide-react";
import { LabelChip } from "@devflow/ui/components/label-chip";
import { PRIORITY_COLORS } from "../../lib/issue-constants";
import { useCanMoveIssue } from "../../hooks/use-can-move-issue";
import { cn } from "@devflow/ui/lib/cn";
import type { IIssueWithRelations } from "@devflow/types";
import { Avatar } from "@devflow/ui/components/avatar";

interface Props {
  issue: IIssueWithRelations;
  onOpen: (issueId: string) => void;
}

export function IssueRow({ issue, onOpen }: Props) {
  const [hovered, setHovered] = useState(false);

  const { canMove } = useCanMoveIssue();
  const draggable = canMove({ assigneeId: issue.assigneeId ?? null });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id, disabled: !draggable });

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col rounded-[4px] hover:bg-bg-hover transition-colors"
    >
      <div className="flex items-center gap-2 py-[7px] pl-1 pr-2.5">
        <span
          {...(draggable ? { ...attributes, ...listeners } : {})}
          className={cn(
            "w-4 h-5 flex items-center justify-center shrink-0",
            draggable
              ? "text-text-disabled hover:text-text-muted cursor-grab active:cursor-grabbing"
              : "text-text-disabled opacity-30",
          )}
          title={draggable ? undefined : "You can't move this issue"}
        >
          {draggable ? (
            <GripVertical className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3 w-3" />
          )}
        </span>

        <div
          onClick={() => onOpen(issue.id)}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
        >
          <div
            className="h-[6px] w-[6px] rounded-full shrink-0"
            style={{ backgroundColor: PRIORITY_COLORS[issue.priority] }}
          />

          {childCount > 0 ? (
            <Layers className="h-3.5 w-3.5 text-text-muted shrink-0" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-text-muted shrink-0" />
          )}

          <span className="text-[13px] text-text-primary truncate flex-1">
            {issue.title}
          </span>

          {labels.map((label: any) => (
            <LabelChip
              key={label.id}
              name={label.name}
              color={label.color}
              size="sm"
            />
          ))}

          {childCount > 0 && (
            <span className="text-[10px] font-mono text-text-muted shrink-0">
              {childCount} sub
            </span>
          )}

          <span className="text-[11px] font-mono text-accent shrink-0">
            #{issue.id.slice(-6).toUpperCase()}
          </span>

          {issue.assignee ? (
            <Avatar
              name={issue.assignee.name ?? undefined}
              src={issue.assignee.avatarUrl ?? undefined}
              size="sm"
            />
          ) : (
            <div className="h-[18px] w-[18px] rounded-full bg-bg-surface border border-border-default flex items-center justify-center text-text-muted text-[9px] shrink-0">
              ?
            </div>
          )}
        </div>
      </div>

      {/* Child issues - shown on hover */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{
          gridTemplateRows: hovered && childCount > 0 ? "1fr" : "0fr",
        }}
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

                {child.assignee ? (
                  <Avatar
                    name={child.assignee.name ?? undefined}
                    src={child.assignee.avatarUrl ?? undefined}
                    size="sm"
                  />
                ) : (
                  <div className="h-[18px] w-[18px] rounded-full bg-bg-surface border border-border-default flex items-center justify-center text-text-muted text-[9px] shrink-0">
                    ?
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
