'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Circle, GripVertical, Layers, Lock } from 'lucide-react';

import type { IIssueCard } from '@devflow/types';
import { Avatar } from '@devflow/ui/components/avatar';
import { LabelChip } from '@devflow/ui/components/label-chip';
import { cn } from '@devflow/ui/lib/cn';

import { PRIORITY_COLORS } from '../../lib/issue-constants';

// shown when the assignee is missing
function NoAssignee() {
  return (
    <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-[9px] text-text-muted">
      ?
    </div>
  );
}

interface IssueRowProps {
  issue: IIssueCard;
  draggable: boolean; // only leads and admins move issues on this page
  onOpen: (issueId: string) => void;
}

export function IssueRow({ issue, draggable, onOpen }: IssueRowProps) {
  const [hovered, setHovered] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    disabled: !draggable,
  });

  const childCount = issue.children.length;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col rounded-[4px] transition-colors hover:bg-bg-hover"
    >
      <div className="flex items-center gap-2 py-[7px] pr-2.5 pl-1">
        <span
          {...(draggable ? { ...attributes, ...listeners } : {})}
          className={cn(
            'flex h-5 w-4 shrink-0 items-center justify-center',
            draggable
              ? 'cursor-grab text-text-disabled hover:text-text-muted active:cursor-grabbing'
              : 'text-text-disabled opacity-30',
          )}
          title={draggable ? undefined : 'Only leads and admins can move issues here'}
        >
          {draggable ? <GripVertical className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
        </span>

        <div
          onClick={() => onOpen(issue.id)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
        >
          <div
            className="h-[6px] w-[6px] shrink-0 rounded-full"
            style={{ backgroundColor: PRIORITY_COLORS[issue.priority] }}
          />

          {childCount > 0 ? (
            <Layers className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          ) : (
            <Circle className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          )}

          <span className="flex-1 truncate text-[13px] text-text-primary">{issue.title}</span>

          {issue.labels.map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} size="sm" />
          ))}

          {childCount > 0 && (
            <span className="shrink-0 font-mono text-[10px] text-text-muted">{childCount} sub</span>
          )}

          <span className="shrink-0 font-mono text-[11px] text-accent">
            #{issue.id.slice(-6).toUpperCase()}
          </span>

          {issue.assignee ? (
            <Avatar
              name={issue.assignee.name ?? undefined}
              src={issue.assignee.avatarUrl ?? undefined}
              size="sm"
            />
          ) : (
            <NoAssignee />
          )}
        </div>
      </div>

      {/* sub-issues are not rows: they open under their parent on hover */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: hovered && childCount > 0 ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1 pr-3 pb-2 pl-8">
            {issue.children.map((child) => (
              <div
                key={child.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(child.id);
                }}
                className="flex items-center justify-between gap-2 rounded-[4px] px-2 py-1 transition-colors hover:bg-bg-hover"
              >
                <span className="truncate text-[11px] text-text-secondary">{child.title}</span>
                {child.assignee ? (
                  <Avatar
                    name={child.assignee.name ?? undefined}
                    src={child.assignee.avatarUrl ?? undefined}
                    size="sm"
                  />
                ) : (
                  <NoAssignee />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
