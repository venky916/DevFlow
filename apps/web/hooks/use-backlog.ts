'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { IApiResponse, IBacklogGrouped } from '@devflow/types';
import type { MoveIssueToSprintInput } from '@devflow/validators';

import { api } from '../lib/axios';
import { BACKLOG_ID, moveIssueInBacklog } from '../lib/backlog-utils';
import { toApiFilters, type IssueFilters } from '../lib/issue-filters';
import { showError } from '../lib/show-error';
import { issueKeys, refreshIssueViews } from './use-issues';

export function useBacklogGrouped(projectId: string, filters: IssueFilters = {}) {
  return useQuery({
    queryKey: issueKeys.backlog(projectId, filters),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IBacklogGrouped>>(
        `/projects/${projectId}/issues/backlog/grouped`,
        { params: toApiFilters(filters) },
      );
      return res.data.data;
    },
    enabled: !!projectId,
    placeholderData: (previous) => previous, // keep the old lists on screen while a filter loads
  });
}

// Moves an issue between sections, or reorders it inside one (same sprint, new position).
// The lists update at once and roll back if the server refuses. Every view refreshes afterwards.
export function useMoveToSprint() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ issueId, data }: { issueId: string; data: MoveIssueToSprintInput }) => {
      await api.patch(`/issues/${issueId}/move-to-sprint`, data);
    },
    onMutate: async ({ issueId, data }) => {
      const filter = {
        predicate: (query: { queryKey: readonly unknown[] }) => issueKeys.isBacklog(query.queryKey),
      };

      await qc.cancelQueries(filter);
      const snapshots = qc.getQueriesData<IBacklogGrouped>(filter);
      qc.setQueriesData<IBacklogGrouped>(filter, (backlog) =>
        backlog
          ? moveIssueInBacklog(backlog, issueId, data.sprintId ?? BACKLOG_ID, data.position)
          : backlog,
      );
      return { snapshots };
    },
    onError: (err, _vars, context) => {
      context?.snapshots.forEach(([key, backlog]) => qc.setQueryData(key, backlog));
      showError(err, 'Failed to move issue');
    },
    onSettled: () => refreshIssueViews(qc),
  });
}
