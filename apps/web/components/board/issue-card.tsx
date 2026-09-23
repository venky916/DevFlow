"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LabelChip } from "@devflow/ui/components/label-chip";
import { PRIORITY_COLORS } from "../../lib/issue-constants";
import { useCanMoveIssue } from "../../hooks/use-can-move-issue";
import { cn } from "@devflow/ui/lib/cn";
import type { IIssueWithRelations } from "@devflow/types";
import { Circle, Layers, Lock } from "lucide-react";
import { Avatar } from "@devflow/ui/components/avatar";

// widened type — on the Board page this extra field simply isn't there,
// and that's fine: override then falls through to undefined → usePermissions
// falls back to useParams(), same as before
type CardIssue = IIssueWithRelations & {
  project?: { slug: string; workspace: { slug: string } };
};
interface Props {
  issue: CardIssue;
  onClick: (issueId: string) => void;
}

export function IssueCard({ issue, onClick }: Props) {
  const [hovered, setHovered] = useState(false);
  const override = issue.project
    ? {
        workspaceSlug: issue.project.workspace.slug,
        projectSlug: issue.project.slug,
      }
    : undefined;
  const { canMove } = useCanMoveIssue(override);
  const draggable = canMove({ assigneeId: issue.assigneeId ?? null });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    disabled: !draggable,
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
      {...(draggable ? { ...attributes, ...listeners } : {})}
      onClick={() => onClick(issue.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "flex flex-col p-[10px_12px] rounded-[4px] border border-border-default bg-bg-surface hover:border-border-emphasis transition-colors",
        draggable ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          {childCount > 0 ? (
            <Layers className="h-3 w-3 text-text-muted shrink-0" />
          ) : (
            <Circle className="h-3 w-3 text-text-muted shrink-0" />
          )}
          <p className="text-[13px] font-medium text-text-primary leading-snug flex-1">
            {issue.title}
          </p>
          {!draggable && (
            <Lock
              className="h-3 w-3 text-text-muted shrink-0"
              // title="You can't move this issue"
            />
          )}
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
            <Avatar
              name={issue.assignee.name ?? undefined}
              src={issue.assignee.avatarUrl ?? undefined}
              size="sm"
            />
          )}
        </div>
      </div>

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
                  <Avatar
                    name={child.assignee.name}
                    src={child.assignee.avatarUrl ?? undefined}
                    size="sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
