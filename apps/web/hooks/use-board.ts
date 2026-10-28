'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { IApiResponse, IBoard, IIssue } from '@devflow/types';
import type { MoveIssueInput } from '@devflow/validators';

import { api } from '../lib/axios';
import { moveIssueInBoard } from '../lib/board-utils';
import { toApiFilters, type IssueFilters } from '../lib/issue-filters';
import { showError } from '../lib/show-error';
import { issueKeys, refreshIssueViews } from './use-issues';

export function useBoard(
  projectId: string,
  filters: IssueFilters = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    // filters are in the key, so each filter combination caches separately
    queryKey: issueKeys.board(projectId, filters),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IBoard>>(`/projects/${projectId}/issues/board`, {
        params: toApiFilters(filters),
      });
      return res.data.data;
    },
    enabled: !!projectId && (options?.enabled ?? true),
    placeholderData: (previous) => previous, // keep the old board visible while a new filter loads
  });
}

// Moves a card (drag, or the status field). Without a position the server puts it at the end of the column.
// The board updates at once and rolls back if the server refuses. Every view refreshes afterwards.
export function useMoveIssue() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ issueId, data }: { issueId: string; data: MoveIssueInput }) => {
      const res = await api.patch<IApiResponse<IIssue>>(`/issues/${issueId}/move`, data);
      return res.data.data;
    },
    onMutate: async ({ issueId, data }) => {
      const filter = {
        predicate: (query: { queryKey: readonly unknown[] }) => issueKeys.isBoard(query.queryKey),
      };

      await qc.cancelQueries(filter);
      const snapshots = qc.getQueriesData<IBoard>(filter);
      qc.setQueriesData<IBoard>(filter, (board) =>
        board ? moveIssueInBoard(board, issueId, data.status, data.position) : board,
      );
      return { snapshots };
    },
    onError: (err, _vars, context) => {
      context?.snapshots.forEach(([key, board]) => qc.setQueryData(key, board));
      showError(err, 'Failed to move issue');
    },
    onSettled: () => refreshIssueViews(qc),
  });
}
