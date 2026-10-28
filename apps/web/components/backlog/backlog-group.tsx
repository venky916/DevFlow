'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight } from 'lucide-react';

import type { IIssueCard } from '@devflow/types';
import { cn } from '@devflow/ui/lib/cn';

import { IssueRow } from './issue-row';

interface BacklogGroupProps {
  id: string; // the sprint id, or BACKLOG: what a dragged issue is dropped on
  title: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  issues: IIssueCard[];
  draggable: boolean;
  emptyText: string;
  onOpen: (issueId: string) => void;
}

export function BacklogGroup({
  id,
  title,
  badge,
  action,
  issues,
  draggable,
  emptyText,
  onOpen,
}: BacklogGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 rounded-[4px] px-2 py-2 transition-colors hover:bg-bg-hover">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          className="flex flex-1 items-center gap-2"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          )}
          <span className="text-[13px] font-medium text-text-primary">{title}</span>
          {badge}
          <span className="ml-1 font-mono text-[11px] text-text-muted">{issues.length} issues</span>
        </button>
        {action}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'ml-5 flex flex-col rounded-[4px] transition-colors',
          isOver && 'bg-bg-hover',
          collapsed ? 'min-h-0' : 'min-h-[32px]',
        )}
      >
        <div className={collapsed ? 'hidden' : 'flex flex-col'}>
          <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {issues.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-text-disabled">{emptyText}</p>
            ) : (
              issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} draggable={draggable} onOpen={onOpen} />
              ))
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  );
}
