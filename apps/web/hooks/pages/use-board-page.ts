'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import type { SortingState } from '@tanstack/react-table';
import { parseAsString, parseAsStringEnum, useQueryState } from 'nuqs';

import type { IssueFilters } from '../../lib/issue-filters';
import { useBoard } from '../use-board';
import { useIssueAccess } from '../use-issue-access';
import { useIssueFilters } from '../use-issue-filters';
import { useIssueList, type IssueListParams } from '../use-issue-list';
import { useProjectBySlug, useProjectMembers } from '../use-projects';
import { useSprints } from '../use-sprints';

const LIST_PAGE_SIZE = 25;

// Everything the board page needs. Only the open view (board or list) loads its data.
export function useBoardPage() {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  // already cached by the project guard, so this makes no request
  const { data: project } = useProjectBySlug(workspaceSlug, projectSlug);
  const projectId = project?.id ?? '';

  const [issueId, setIssueId] = useQueryState('issue', parseAsString);
  const [view, setView] = useQueryState(
    'view',
    parseAsStringEnum(['board', 'list']).withDefault('board'),
  );
  const { filters, setFilters } = useIssueFilters();
  const { canMoveToSprint } = useIssueAccess();

  const [listPage, setListPage] = useState(1);
  const [listSorting, setListSorting] = useState<SortingState>([{ id: 'position', desc: false }]);
  const sortBy = (listSorting[0]?.id ?? 'position') as NonNullable<IssueListParams['sortBy']>;
  const sortOrder = listSorting[0]?.desc ? 'desc' : 'asc';

  const board = useBoard(projectId, filters, { enabled: view === 'board' });
  const list = useIssueList(
    projectId,
    { ...filters, page: listPage, limit: LIST_PAGE_SIZE, sortBy, sortOrder },
    { enabled: view === 'list' },
  );

  const { data: members } = useProjectMembers(projectId);
  const { data: sprints } = useSprints(projectId);

  const changeFilters = (next: IssueFilters) => {
    setFilters(next);
    setListPage(1);
  };

  return {
    workspaceSlug,
    projectSlug,
    project,
    view,
    setView,
    issueId,
    setIssueId,
    filters,
    changeFilters,
    members: members?.map((m) => m.user) ?? [],
    sprints: sprints ?? [],
    // from the sprints list, so it is known in both views
    activeSprint: sprints?.find((s) => s.status === 'ACTIVE') ?? null,
    canMoveToSprint,
    board,
    list,
    listPage,
    setListPage,
    listSorting,
    setListSorting,
    refresh: () => (view === 'board' ? board.refetch() : list.refetch()),
    isRefreshing: view === 'board' ? board.isFetching : list.isFetching,
  };
}
