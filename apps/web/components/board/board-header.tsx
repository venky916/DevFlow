'use client';

import { Plus, RotateCw } from 'lucide-react';

import type { ISprint, IUserPublic } from '@devflow/types';
import { Badge } from '@devflow/ui/components/badge';
import { Button } from '@devflow/ui/components/button';
import { SearchBox } from '@devflow/ui/components/search-box';
import { cn } from '@devflow/ui/lib/cn';

import { useIssueAccess } from '../../hooks/use-issue-access';
import type { IssueFilters } from '../../lib/issue-filters';
import { FilterBar } from '../shared/filter-bar';
import { BOARD_VIEWS, ViewSwitch } from '../shared/view-switch';

interface BoardHeaderProps {
  activeSprint: ISprint | null;
  members: IUserPublic[];
  projectId: string;
  filters: IssueFilters;
  onFiltersChange: (f: IssueFilters) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onCreateIssue: () => void;
  view: 'board' | 'list';
  onViewChange: (v: 'board' | 'list') => void;
}

export function BoardHeader({
  activeSprint,
  members,
  projectId,
  filters,
  onFiltersChange,
  onRefresh,
  isRefreshing,
  onCreateIssue,
  view,
  onViewChange,
}: BoardHeaderProps) {
  const { canCreateIssue } = useIssueAccess();

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border-default px-6 py-3">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-[13px] font-medium text-text-primary">
          {activeSprint?.name ?? 'No active sprint'}
        </span>
        {activeSprint && <Badge variant="success">Active</Badge>}
        <div className="h-4 w-px bg-border-default" />
        <SearchBox
          value={filters.q ?? ''}
          onChange={(q) => onFiltersChange({ ...filters, q: q || undefined })}
        />
        <FilterBar
          fields={['assignee', 'label', 'priority', 'type', 'dueDate']}
          projectId={projectId}
          members={members}
          filters={filters}
          onChange={onFiltersChange}
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <ViewSwitch options={BOARD_VIEWS} value={view} onChange={onViewChange} />

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh"
        >
          <RotateCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
        </Button>

        {canCreateIssue && (
          <Button variant="primary" size="sm" onClick={onCreateIssue}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Issue
          </Button>
        )}
      </div>
    </div>
  );
}
