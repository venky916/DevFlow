'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { IApiResponse, ISprint, ISprintCompletion, ISprintWithCount } from '@devflow/types';
import type { CreateSprintOutput, UpdateSprintOutput } from '@devflow/validators';

import { getAuthErrorMessage } from '../lib/auth-errors';
import { api } from '../lib/axios';
import { refreshIssueViews } from './use-issues';
import { projectKeys } from './use-projects';

export const sprintKeys = {
  all: ['sprints'] as const,
  list: (projectId: string) => [...sprintKeys.all, projectId] as const,
};

function showError(err: unknown, fallback: string) {
  const message = getAuthErrorMessage(err, fallback);
  if (message) toast.error(message);
}

// Sprint changes move issues, so the board, issue list and backlog refresh too.
// TODO(S10): replace these three with boardKeys / issueKeys when those modules are refactored.

function useRefreshSprints(projectId: string) {
  const qc = useQueryClient();

  return () => {
    qc.invalidateQueries({ queryKey: sprintKeys.list(projectId) });
    qc.invalidateQueries({ queryKey: projectKeys.all }); // overview (active sprint) and sprint counts
    refreshIssueViews(qc); // board, list, backlog and open issue panels
  };
}

// ─── Fetch ────────────────────────────────────────────────────
export function useSprints(projectId: string) {
  return useQuery({
    queryKey: sprintKeys.list(projectId),
    queryFn: async () => {
      const res = await api.get<IApiResponse<ISprintWithCount[]>>(`/projects/${projectId}/sprints`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

// ─── Change ───────────────────────────────────────────────────
export function useCreateSprint(projectId: string) {
  const refresh = useRefreshSprints(projectId);

  return useMutation({
    mutationFn: async (input: CreateSprintOutput) => {
      const res = await api.post<IApiResponse<ISprint>>(`/projects/${projectId}/sprints`, input);
      return res.data.data;
    },
    onSuccess: () => {
      refresh();
      toast.success('Sprint created!');
    },
    onError: (err) => showError(err, 'Failed to create sprint'),
  });
}

export function useUpdateSprint(projectId: string) {
  const refresh = useRefreshSprints(projectId);

  return useMutation({
    mutationFn: async ({ sprintId, data }: { sprintId: string; data: UpdateSprintOutput }) => {
      const res = await api.patch<IApiResponse<ISprint>>(`/sprints/${sprintId}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      refresh();
      toast.success('Sprint updated!');
    },
    onError: (err) => showError(err, 'Failed to update sprint'),
  });
}

export function useDeleteSprint(projectId: string) {
  const refresh = useRefreshSprints(projectId);

  return useMutation({
    mutationFn: async (sprintId: string) => {
      await api.delete(`/sprints/${sprintId}`);
    },
    onSuccess: () => {
      refresh();
      toast.success('Sprint deleted');
    },
    onError: (err) => showError(err, 'Failed to delete sprint'),
  });
}

export function useStartSprint(projectId: string) {
  const refresh = useRefreshSprints(projectId);

  return useMutation({
    mutationFn: async (sprintId: string) => {
      const res = await api.post<IApiResponse<ISprint>>(`/sprints/${sprintId}/start`);
      return res.data.data;
    },
    onSuccess: () => {
      refresh();
      toast.success('Sprint started!');
    },
    onError: (err) => showError(err, 'Failed to start sprint'),
  });
}

export function useCompleteSprint(projectId: string) {
  const refresh = useRefreshSprints(projectId);

  return useMutation({
    mutationFn: async (sprintId: string) => {
      const res = await api.post<IApiResponse<ISprintCompletion>>(`/sprints/${sprintId}/complete`);
      return res.data.data;
    },
    onSuccess: ({ incompleteCount }) => {
      refresh();
      toast.success(
        incompleteCount === 0
          ? 'Sprint completed!'
          : `Sprint completed! ${incompleteCount} unfinished ${
              incompleteCount === 1 ? 'issue' : 'issues'
            } moved to the backlog.`,
      );
    },
    onError: (err) => showError(err, 'Failed to complete sprint'),
  });
}
