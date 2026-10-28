'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Circle, Layers, Lock } from 'lucide-react';

import type { IIssueCard } from '@devflow/types';
import { Avatar } from '@devflow/ui/components/avatar';
import { LabelChip } from '@devflow/ui/components/label-chip';
import { cn } from '@devflow/ui/lib/cn';

import { useIssueAccess } from '../../hooks/use-issue-access';
import { PRIORITY_COLORS } from '../../lib/issue-constants';

interface IssueCardBodyProps {
  issue: IIssueCard;
  locked?: boolean;
  lockReason?: string;
  projectLabel?: string;
  onChildClick?: (issueId: string) => void;
}

// The card's look. No drag logic.
export function IssueCardBody({
  issue,
  locked = false,
  lockReason,
  projectLabel,
  onChildClick,
}: IssueCardBodyProps) {
  const [hovered, setHovered] = useState(false);
  const childCount = issue.children.length;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'flex flex-col rounded-[4px] border border-border-default bg-bg-surface p-[10px_12px] transition-colors hover:border-border-emphasis',
        locked ? 'cursor-default' : 'cursor-pointer',
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          {childCount > 0 ? (
            <Layers className="h-3 w-3 shrink-0 text-text-muted" />
          ) : (
            <Circle className="h-3 w-3 shrink-0 text-text-muted" />
          )}
          <p className="flex-1 text-[13px] leading-snug font-medium text-text-primary">
            {issue.title}
          </p>
          {locked && (
            <span title={lockReason}>
              <Lock className="h-3 w-3 shrink-0 text-text-muted" />
            </span>
          )}
        </div>

        {issue.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {issue.labels.map((label) => (
              <LabelChip key={label.id} name={label.name} color={label.color} size="sm" />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-[5px] w-[5px] shrink-0 rounded-full"
              style={{ backgroundColor: PRIORITY_COLORS[issue.priority] }}
            />
            <span className="font-mono text-[10px] text-accent">
              #{issue.id.slice(-6).toUpperCase()}
            </span>
            {childCount > 0 && (
              <span className="font-mono text-[10px] text-text-muted">{childCount} sub</span>
            )}
            {projectLabel && (
              <span className="max-w-24 truncate font-mono text-[10px] text-text-muted">
                {projectLabel}
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

      {/* sub-issues are not cards: they open under their parent on hover */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: hovered && childCount > 0 ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="mt-2 flex flex-col gap-1 border-t border-border-default pt-2">
            {issue.children.map((child) => (
              <div
                key={child.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onChildClick?.(child.id);
                }}
                className="flex items-center justify-between gap-2 rounded-[4px] px-1.5 py-1 transition-colors hover:bg-bg-hover"
              >
                <span className="truncate text-[11px] text-text-secondary">{child.title}</span>
                {child.assignee && (
                  <Avatar
                    name={child.assignee.name ?? undefined}
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

interface IssueCardProps {
  issue: IIssueCard;
  onClick: (issueId: string) => void;
}

export function IssueCard({ issue, onClick }: IssueCardProps) {
  const { canMove } = useIssueAccess();

  // a parent can't be dragged: its status follows its sub-issues
  const hasSubIssues = issue.children.length > 0;
  const draggable = canMove({ assigneeId: issue.assigneeId ?? null }) && !hasSubIssues;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      onClick={() => onClick(issue.id)}
    >
      <IssueCardBody
        issue={issue}
        locked={!draggable}
        lockReason={
          hasSubIssues ? 'Its status follows its sub-issues' : "You can't move this issue"
        }
        onChildClick={onClick}
      />
    </div>
  );
}
