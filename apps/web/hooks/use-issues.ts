'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  IActivityLog,
  IApiResponse,
  ICursorPaginatedData,
  IIssue,
  IIssueDetail,
  IIssueSearchResult,
} from '@devflow/types';
import type { CreateIssueInput, CreateSubIssueInput, UpdateIssueInput } from '@devflow/validators';

import { api } from '../lib/axios';
import type { IssueFilters } from '../lib/issue-filters';
import { showError } from '../lib/show-error';
import { projectKeys } from './use-projects';

// ─── Query keys ───────────────────────────────────────────────
// Every issue screen's key starts with 'issues', so one invalidate refreshes all of them.
export const issueKeys = {
  all: ['issues'] as const,
  detail: (issueId: string) => [...issueKeys.all, 'detail', issueId] as const,
  activities: (issueId: string) => [...issueKeys.all, 'activities', issueId] as const,
  board: (projectId: string, filters: IssueFilters) =>
    [...issueKeys.all, 'board', projectId, filters] as const,
  list: (projectId: string, params: object) =>
    [...issueKeys.all, 'list', projectId, params] as const,
  search: (projectId: string, query: string, excludeId?: string, mode?: string) =>
    [...issueKeys.all, 'search', projectId, query, excludeId, mode] as const,
  isBoard: (key: readonly unknown[]) => key[0] === 'issues' && key[1] === 'board',
  backlog: (projectId: string, filters: IssueFilters) =>
    [...issueKeys.all, 'backlog', projectId, filters] as const,
  isBacklog: (key: readonly unknown[]) => key[0] === 'issues' && key[1] === 'backlog',
  myBoard: (filters: IssueFilters) => [...issueKeys.all, 'my', 'board', filters] as const,
  myList: (params: object) => [...issueKeys.all, 'my', 'list', params] as const,
  myProjects: () => [...issueKeys.all, 'my', 'projects'] as const,
};

// Any issue change can show up on the board, the list, the backlog, my issues and an open issue
// panel. Only queries that are on screen refetch, the rest are just marked stale.
export function refreshIssueViews(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: issueKeys.all });
}

export function useRefreshIssues() {
  const qc = useQueryClient();
  return () => refreshIssueViews(qc);
}

// ─── One issue: fetch ─────────────────────────────────────────
export function useIssueById(issueId: string) {
  return useQuery({
    queryKey: issueKeys.detail(issueId),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IIssueDetail>>(`/issues/${issueId}`);
      return res.data.data;
    },
    enabled: !!issueId,
  });
}

export function useSearchProjectIssues(
  projectId: string,
  query: string,
  options?: { excludeId?: string; mode?: 'child'; enabled?: boolean },
) {
  return useQuery({
    queryKey: issueKeys.search(projectId, query, options?.excludeId, options?.mode),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IIssueSearchResult[]>>(
        `/projects/${projectId}/issues/search`,
        { params: { q: query || undefined, excludeId: options?.excludeId, mode: options?.mode } },
      );
      return res.data.data;
    },
    enabled: !!projectId && (options?.enabled ?? true),
  });
}

// ─── One issue: activity feed (read-only, paged) ──────────────
export function useIssueActivities(issueId: string, limit = 10) {
  return useInfiniteQuery({
    queryKey: issueKeys.activities(issueId),
    queryFn: async ({ pageParam }) => {
      const res = await api.get<IApiResponse<ICursorPaginatedData<IActivityLog>>>(
        `/issues/${issueId}/activities`,
        { params: { limit, cursor: pageParam } },
      );
      return res.data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    enabled: !!issueId,
  });
}

// ─── One issue: change ────────────────────────────────────────
export function useCreateIssue(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateIssueInput) => {
      const res = await api.post<IApiResponse<IIssue>>(`/projects/${projectId}/issues`, input);
      return res.data.data;
    },
    onSuccess: () => {
      refreshIssueViews(qc);
      qc.invalidateQueries({ queryKey: projectKeys.all }); // issue counts on the project overview
      toast.success('Issue created!');
    },
    onError: (err) => showError(err, 'Failed to create issue'),
  });
}

// `_projectId` is kept so existing callers still compile. Remove it in the cleanup pass.
export function useUpdateIssue(issueId: string, _projectId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateIssueInput) => {
      const res = await api.patch<IApiResponse<IIssue>>(`/issues/${issueId}`, input);
      return res.data.data;
    },
    onSuccess: async () => {
      // the activity feed shows the new line right away
      await qc.refetchQueries({ queryKey: issueKeys.activities(issueId) });
      refreshIssueViews(qc);
    },
    onError: (err) => showError(err, 'Failed to update issue'),
  });
}

// `_projectId` is kept so existing callers still compile. Remove it in the cleanup pass.
export function useDeleteIssue(_projectId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (issueId: string) => {
      await api.delete(`/issues/${issueId}`);
    },
    onSuccess: (_data, issueId) => {
      qc.removeQueries({ queryKey: issueKeys.detail(issueId) }); // a refetch would return 404
      refreshIssueViews(qc);
      qc.invalidateQueries({ queryKey: projectKeys.all });
      toast.success('Issue deleted');
    },
    onError: (err) => showError(err, 'Failed to delete issue'),
  });
}

export function useDuplicateIssue(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      issue: Pick<CreateIssueInput, 'title' | 'description' | 'type' | 'priority' | 'labelIds'>,
    ) => {
      const res = await api.post<IApiResponse<IIssue>>(`/projects/${projectId}/issues`, {
        ...issue,
        title: `${issue.title} (copy)`,
      });
      return res.data.data;
    },
    onSuccess: () => {
      refreshIssueViews(qc);
      qc.invalidateQueries({ queryKey: projectKeys.all });
      toast.success('Issue duplicated');
    },
    onError: (err) => showError(err, 'Failed to duplicate issue'),
  });
}

// ─── Sub-issues ───────────────────────────────────────────────
// A sub-issue changes the parent's status and shows on the board, so every view refreshes.
export function useCreateSubIssue(parentId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSubIssueInput) => {
      const res = await api.post<IApiResponse<IIssue>>(`/issues/${parentId}/children`, input);
      return res.data.data;
    },
    onSuccess: () => refreshIssueViews(qc),
    onError: (err) => showError(err, 'Failed to create sub-issue'),
  });
}

export function useAttachChildIssue(parentId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (issueId: string) => {
      const res = await api.post<IApiResponse<IIssue>>(`/issues/${parentId}/children/attach`, {
        issueId,
      });
      return res.data.data;
    },
    onSuccess: () => refreshIssueViews(qc),
    onError: (err) => showError(err, 'Failed to attach issue'),
  });
}

export function useDetachChildIssue(parentId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (childId: string) => {
      await api.delete(`/issues/${parentId}/children/${childId}`);
    },
    onSuccess: () => {
      refreshIssueViews(qc);
      toast.success('Sub-issue detached');
    },
    onError: (err) => showError(err, 'Failed to detach sub-issue'),
  });
}
