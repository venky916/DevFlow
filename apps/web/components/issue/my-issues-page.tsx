'use client';

import { useMemo, useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { RotateCw } from 'lucide-react';
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from 'nuqs';

import type { IssueStatus } from '@devflow/types';
import { Button } from '@devflow/ui/components/button';
import { SearchBox } from '@devflow/ui/components/search-box';

import {
  useMyIssuesBoard,
  useMyIssuesList,
  type MyIssuesFilters,
  type MyIssuesListParams,
} from '../../hooks/use-my-issues';
import { KanbanColumn } from '../board/kanban-column';
import { IssueSlideOver } from '../issue/issue-slide-over';
import { FilterBar } from '../shared/filter-bar';
import { ListView } from '../shared/list-view';
import PageError from '../shared/page-error';
import PageLoading from '../shared/page-loading';

const STATUSES: IssueStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const filterParsers = {
  projectId: parseAsString,
  sprintId: parseAsString,
  priority: parseAsString,
  type: parseAsString,
  dueDateFrom: parseAsString,
  dueDateTo: parseAsString,
  noDueDate: parseAsBoolean,
  dueDatePreset: parseAsString,
  q: parseAsString,
};

export function MyIssuesPage() {
  const [view, setView] = useQueryState(
    'view',
    parseAsStringEnum(['board', 'list']).withDefault('board'),
  );
  const [rawFilters, setRawFilters] = useQueryStates(filterParsers);
  const [selectedIssueId, setSelectedIssueId] = useQueryState('issue', parseAsString);

  const [listPage, setListPage] = useState(1);
  const [listSorting, setListSorting] = useState<SortingState>([{ id: 'updatedAt', desc: true }]);

  const filters = Object.fromEntries(
    Object.entries(rawFilters).filter(([, v]) => v !== null),
  ) as MyIssuesFilters;

  const handleFiltersChange = (f: MyIssuesFilters) => {
    const normalized = Object.fromEntries(
      Object.keys(filterParsers).map((key) => [key, (f as any)[key] ?? null]),
    );
    setRawFilters(normalized);
    setListPage(1);
  };

  // Board view's data — only meaningfully used when view === "board"
  const {
    data: boardData,
    isLoading: boardLoading,
    isFetching: boardFetching,
    isError: boardError,
    refetch: refetchBoard,
  } = useMyIssuesBoard(filters);

  // List view's data
  const listSortBy = (listSorting[0]?.id ?? 'updatedAt') as MyIssuesListParams['sortBy'];
  const listSortOrder: 'asc' | 'desc' = listSorting[0]?.desc ? 'desc' : 'asc';

  const {
    data: listData,
    isLoading: listLoading,
    isFetching: listFetching,
    isError: listError,
    refetch: refetchList,
  } = useMyIssuesList({
    ...filters,
    page: listPage,
    limit: 25,
    sortBy: listSortBy,
    sortOrder: listSortOrder,
  });

  const projectOptions = useMemo(() => {
    if (!boardData) return [];
    const all = STATUSES.flatMap((s) => boardData.columns[s] ?? []);
    const unique = new Map(all.map((i) => [i.project.id, i.project.name]));
    return Array.from(unique, ([value, label]) => ({ label, value }));
  }, [boardData]);

  const totalIssues = boardData
    ? STATUSES.reduce((acc, s) => acc + (boardData.columns[s]?.length ?? 0), 0)
    : 0;

  // selected issue lookup — board data has full project info attached;
  // list data (IMyIssue) also carries it, so check both depending on active view
  const selectedIssue = selectedIssueId
    ? view === 'board'
      ? STATUSES.flatMap((s) => boardData?.columns[s] ?? []).find((i) => i.id === selectedIssueId)
      : listData?.items.find((i) => i.id === selectedIssueId)
    : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[13px] font-medium text-text-primary">
            My Issues
            <span className="ml-2 font-normal text-text-muted">{totalIssues} issues</span>
          </h1>
          <div className="h-4 w-px bg-border-default" />
          <SearchBox
            value={filters.q ?? ''}
            onChange={(q) => handleFiltersChange({ ...filters, q: q || undefined })}
          />
          <FilterBar
            fields={['project', 'sprint', 'priority', 'type', 'dueDate']}
            projectOptions={projectOptions}
            filters={filters}
            onChange={handleFiltersChange}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-[4px] border border-border-default">
            <button
              onClick={() => setView('board')}
              className={`h-7 px-2.5 text-[12px] transition-colors ${
                view === 'board'
                  ? 'bg-bg-active text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setView('list')}
              className={`h-7 px-2.5 text-[12px] transition-colors ${
                view === 'list'
                  ? 'bg-bg-active text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              List
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => (view === 'board' ? refetchBoard() : refetchList())}
            disabled={view === 'board' ? boardFetching : listFetching}
          >
            <RotateCw
              className={`h-3.5 w-3.5 ${(view === 'board' ? boardFetching : listFetching) ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === 'board' ? (
          boardLoading ? (
            <PageLoading />
          ) : boardError ? (
            <PageError message="Couldn't load your issues" onRetry={() => refetchBoard()} />
          ) : totalIssues === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] text-text-muted">No issues match these filters</p>
            </div>
          ) : (
            <div className="h-full px-6 py-4">
              <div className="flex h-full gap-4 overflow-x-auto pb-4">
                {STATUSES.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    issues={boardData?.columns[status] ?? []}
                    onIssueClick={setSelectedIssueId}
                  />
                ))}
              </div>
            </div>
          )
        ) : (
          <ListView
            data={listData}
            isLoading={listLoading}
            isFetching={listFetching}
            isError={listError}
            refetch={refetchList}
            page={listPage}
            onPageChange={setListPage}
            sorting={listSorting}
            onSortingChange={setListSorting}
            onIssueClick={setSelectedIssueId}
            showProjectColumn
          />
        )}
      </div>

      <IssueSlideOver
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        projectId={selectedIssue?.project.id ?? ''}
        workspaceSlug={selectedIssue?.project.workspace.slug ?? ''}
        projectSlug={selectedIssue?.project.slug ?? ''}
      />
    </div>
  );
}
