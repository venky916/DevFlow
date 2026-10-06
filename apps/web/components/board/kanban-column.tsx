'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import type { IIssueWithRelations, IssueStatus } from '@devflow/types';
import { cn } from '@devflow/ui/lib/cn';

import { IssueCard } from './issue-card';

const COLUMN_LABELS: Record<IssueStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

interface Props {
  status: IssueStatus;
  issues: IIssueWithRelations[];
  onIssueClick: (issueId: string) => void;
}

export function KanbanColumn({ status, issues, onIssueClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex min-w-[240px] flex-1 flex-col gap-2">
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[11px] tracking-[0.04em] text-text-muted uppercase">
          {COLUMN_LABELS[status]}
        </span>
        <span className="font-mono text-[11px] text-text-disabled">{issues.length}</span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[100px] flex-col gap-2 rounded-[4px] p-1 transition-colors',
          isOver && 'bg-bg-hover',
        )}
      >
        <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onClick={onIssueClick} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
