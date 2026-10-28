'use client';

import { useState } from 'react';
import { closestCorners, DndContext, DragOverlay } from '@dnd-kit/core';
import { Play, Plus, RotateCw } from 'lucide-react';

import { Badge } from '@devflow/ui/components/badge';
import { Button } from '@devflow/ui/components/button';
import { SearchBox } from '@devflow/ui/components/search-box';
import { cn } from '@devflow/ui/lib/cn';

import { useBacklogPage } from '../../hooks/pages/use-backlog-page';
import { BACKLOG_ID } from '../../lib/backlog-utils';
import { PRIORITY_COLORS } from '../../lib/issue-constants';
import { CreateIssueModal } from '../issue/create-issue-modal';
import { IssueSlideOver } from '../issue/issue-slide-over';
import { FilterBar } from '../shared/filter-bar';
import { PageError } from '../shared/page-error';
import { PageLoading } from '../shared/page-loading';
import { BacklogGroup } from './backlog-group';

export function BacklogPage() {
  const page = useBacklogPage();
  const [showCreate, setShowCreate] = useState(false);
  const { project, data, backlog, drag } = page;

  // already loaded by the project guard
  if (!project) return <PageLoading />;

  const isEmpty = !!data && data.sprints.length === 0 && page.totalIssues === 0 && !page.hasFilters;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[13px] font-medium text-text-primary">
            Backlog
            <span className="ml-2 font-normal text-text-muted">{page.totalIssues} issues</span>
          </h1>
          <div className="h-4 w-px bg-border-default" />
          <SearchBox
            value={page.filters.q ?? ''}
            onChange={(q) => page.changeFilters({ ...page.filters, q: q || undefined })}
          />
          <FilterBar
            fields={['assignee', 'label', 'priority', 'type', 'dueDate']}
            projectId={project.id}
            members={page.members}
            filters={page.filters}
            onChange={page.changeFilters}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => backlog.refetch()}
            disabled={backlog.isFetching}
            aria-label="Refresh"
          >
            <RotateCw className={cn('h-3.5 w-3.5', backlog.isFetching && 'animate-spin')} />
          </Button>
          {page.canCreateIssue && (
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Issue
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {backlog.isLoading ? (
          <PageLoading />
        ) : backlog.isError || !data ? (
          <PageError message="Couldn't load backlog" onRetry={() => backlog.refetch()} />
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[4px] border border-border-default py-20">
            <p className="text-[13px] text-text-muted">No issues yet</p>
            {page.canCreateIssue && (
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
                Create an issue
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={drag.sensors}
            collisionDetection={closestCorners}
            onDragStart={drag.onDragStart}
            onDragEnd={drag.onDragEnd}
            onDragCancel={drag.onDragCancel}
          >
            <div className="flex flex-col gap-4">
              {data.sprints.map((sprint) => (
                <BacklogGroup
                  key={sprint.id}
                  id={sprint.id}
                  title={sprint.name}
                  badge={
                    <Badge variant={sprint.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {sprint.status === 'ACTIVE' ? 'Active' : 'Planned'}
                    </Badge>
                  }
                  action={
                    page.canStartSprint &&
                    sprint.status === 'PLANNED' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={page.startingId === sprint.id}
                        disabled={page.hasActiveSprint}
                        title={
                          page.hasActiveSprint ? 'Complete the active sprint first' : undefined
                        }
                        onClick={() => page.startSprint(sprint.id)}
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Start
                      </Button>
                    )
                  }
                  issues={sprint.issues}
                  draggable={page.canMoveToSprint}
                  emptyText="No issues — drag here to add"
                  onOpen={page.setIssueId}
                />
              ))}
              <BacklogGroup
                id={BACKLOG_ID}
                title="Backlog"
                issues={data.backlogIssues}
                draggable={page.canMoveToSprint}
                emptyText="No issues in backlog"
                onOpen={page.setIssueId}
              />
            </div>

            <DragOverlay>
              {drag.activeIssue && (
                <div className="flex items-center gap-3 rounded-[4px] border border-border-emphasis bg-bg-surface px-3 py-2 opacity-95 shadow-lg">
                  <div
                    className="h-[5px] w-[5px] shrink-0 rounded-full"
                    style={{
                      backgroundColor: PRIORITY_COLORS[drag.activeIssue.priority],
                    }}
                  />
                  <span className="flex-1 truncate text-[13px] text-text-primary">
                    {drag.activeIssue.title}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-accent">
                    #{drag.activeIssue.id.slice(-6).toUpperCase()}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <CreateIssueModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        projectId={project.id}
        sprints={page.openSprints}
        members={page.members}
        activeSprint={null}
        canSetSprint={page.canMoveToSprint}
      />
      <IssueSlideOver issueId={page.issueId} onClose={() => page.setIssueId(null)} />
    </div>
  );
}
