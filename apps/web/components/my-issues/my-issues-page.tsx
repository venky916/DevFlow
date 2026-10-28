'use client';

import { RotateCw } from 'lucide-react';

import { Button } from '@devflow/ui/components/button';
import { SearchBox } from '@devflow/ui/components/search-box';
import { cn } from '@devflow/ui/lib/cn';

import { useMyIssuesPage } from '../../hooks/pages/use-my-issues-page';
import { STATUS_ORDER } from '../../lib/issue-constants';
import { IssueSlideOver } from '../issue/issue-slide-over';
import { FilterBar } from '../shared/filter-bar';
import { ListView } from '../shared/list-view';
import { PageError } from '../shared/page-error';
import { PageLoading } from '../shared/page-loading';
import { BOARD_VIEWS, ViewSwitch } from '../shared/view-switch';
import { MyIssuesColumn } from './my-issues-column';

export function MyIssuesPage() {
  const page = useMyIssuesPage();
  const { board, list } = page;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[13px] font-medium text-text-primary">
            My Issues
            <span className="ml-2 font-normal text-text-muted">{page.totalIssues} issues</span>
          </h1>
          <div className="h-4 w-px bg-border-default" />
          <SearchBox
            value={page.filters.q ?? ''}
            onChange={(q) => page.changeFilters({ ...page.filters, q: q || undefined })}
          />
          <FilterBar
            fields={['project', 'sprint', 'priority', 'type', 'dueDate']}
            projectOptions={page.projectOptions}
            filters={page.filters}
            onChange={page.changeFilters}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ViewSwitch options={BOARD_VIEWS} value={page.view} onChange={page.setView} />
          <Button
            variant="ghost"
            size="sm"
            onClick={page.refresh}
            disabled={page.isRefreshing}
            aria-label="Refresh"
          >
            <RotateCw className={cn('h-3.5 w-3.5', page.isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {page.view === 'board' ? (
          board.isLoading ? (
            <PageLoading />
          ) : board.isError || !board.data ? (
            <PageError message="Couldn't load your issues" onRetry={() => board.refetch()} />
          ) : page.totalIssues === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] text-text-muted">
                {page.hasFilters ? 'No issues match these filters' : 'Nothing is assigned to you'}
              </p>
            </div>
          ) : (
            <div className="h-full px-6 py-4">
              <div className="flex h-full gap-4 overflow-x-auto pb-4">
                {STATUS_ORDER.map((status) => (
                  <MyIssuesColumn
                    key={status}
                    status={status}
                    issues={board.data.columns[status]}
                    onIssueClick={page.setIssueId}
                  />
                ))}
              </div>
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
            showProjectColumn
            flat
          />
        )}
      </div>

      <IssueSlideOver issueId={page.issueId} onClose={() => page.setIssueId(null)} />
    </div>
  );
}
