'use client';

import { useState } from 'react';

import { useBoardPage } from '../../hooks/pages/use-board-page';
import { CreateIssueModal } from '../issue/create-issue-modal';
import { IssueSlideOver } from '../issue/issue-slide-over';
import { ListView } from '../shared/list-view';
import { PageError } from '../shared/page-error';
import { PageLoading } from '../shared/page-loading';
import { BoardHeader } from './board-header';
import { KanbanBoard } from './kanban-board';

export function BoardPage() {
  const page = useBoardPage();
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const { project, board, list } = page;

  // already loaded by the project guard
  if (!project) return <PageLoading />;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <BoardHeader
        activeSprint={page.activeSprint}
        members={page.members}
        projectId={project.id}
        filters={page.filters}
        onFiltersChange={page.changeFilters}
        onRefresh={page.refresh}
        isRefreshing={page.isRefreshing}
        onCreateIssue={() => setShowCreateIssue(true)}
        view={page.view}
        onViewChange={page.setView}
      />

      <div className="flex-1 overflow-hidden">
        {page.view === 'board' ? (
          board.isLoading ? (
            <PageLoading />
          ) : board.isError || !board.data ? (
            <PageError message="Couldn't load issues" onRetry={() => board.refetch()} />
          ) : (
            <div className="h-full px-6 py-4">
              <KanbanBoard columns={board.data.columns} onIssueClick={page.setIssueId} />
            </div>
          )
        ) : (
          <ListView
            data={list.data}
            isLoading={list.isLoading}
            isFetching={list.isFetching}
            isError={list.isError}
            refetch={list.refetch}
            page={page.listPage}
            onPageChange={page.setListPage}
            sorting={page.listSorting}
            onSortingChange={page.setListSorting}
            onIssueClick={page.setIssueId}
          />
        )}
      </div>

      <CreateIssueModal
        open={showCreateIssue}
        onClose={() => setShowCreateIssue(false)}
        projectId={project.id}
        sprints={page.sprints}
        members={page.members}
        activeSprint={page.activeSprint}
        canSetSprint={page.canMoveToSprint}
      />

      <IssueSlideOver issueId={page.issueId} onClose={() => page.setIssueId(null)} />
    </div>
  );
}
