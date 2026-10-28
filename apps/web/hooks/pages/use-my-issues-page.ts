'use client';

import { useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { parseAsString, parseAsStringEnum, useQueryState } from 'nuqs';

import { STATUS_ORDER } from '../../lib/issue-constants';
import type { IssueFilters } from '../../lib/issue-filters';
import { useIssueFilters } from '../use-issue-filters';
import {
  useMyIssuesBoard,
  useMyIssuesList,
  useMyIssuesProjects,
  type MyIssuesListParams,
} from '../use-my-issues';

const LIST_PAGE_SIZE = 25;

// Everything the my-issues page needs. Only the open view (board or list) loads its data.
export function useMyIssuesPage() {
  const [issueId, setIssueId] = useQueryState('issue', parseAsString);
  const [view, setView] = useQueryState(
    'view',
    parseAsStringEnum(['board', 'list']).withDefault('board'),
  );
  const { filters, setFilters } = useIssueFilters();

  const [listPage, setListPage] = useState(1);
  const [listSorting, setListSorting] = useState<SortingState>([{ id: 'updatedAt', desc: true }]);
  const sortBy = (listSorting[0]?.id ?? 'updatedAt') as NonNullable<MyIssuesListParams['sortBy']>;
  const sortOrder = listSorting[0]?.desc ? 'desc' : 'asc';

  const board = useMyIssuesBoard(filters, { enabled: view === 'board' });
  const list = useMyIssuesList(
    { ...filters, page: listPage, limit: LIST_PAGE_SIZE, sortBy, sortOrder },
    { enabled: view === 'list' },
  );
  const { data: projects } = useMyIssuesProjects();

  const changeFilters = (next: IssueFilters) => {
    setFilters(next);
    setListPage(1);
  };

  const boardTotal = board.data
    ? STATUS_ORDER.reduce((total, status) => total + board.data.columns[status].length, 0)
    : 0;

  return {
    view,
    setView,
    issueId,
    setIssueId,
    filters,
    changeFilters,
    hasFilters: Object.keys(filters).length > 0,
    // the workspace name tells apart projects that share a name
    projectOptions:
      projects?.map((p) => ({ label: `${p.name} · ${p.workspace.name}`, value: p.id })) ?? [],
    board,
    list,
    listPage,
    setListPage,
    listSorting,
    setListSorting,
    totalIssues: view === 'board' ? boardTotal : (list.data?.meta.total ?? 0),
    refresh: () => (view === 'board' ? board.refetch() : list.refetch()),
    isRefreshing: view === 'board' ? board.isFetching : list.isFetching,
  };
}
