import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { IActivityLog, IIssueWithRelations, IProjectMember, ISprint } from '@devflow/types';
import type { CreateIssueInput, UpdateIssueInput } from '@devflow/validators';

import type { IssueFilters } from '../components/shared/filter-bar';
import { api } from '../lib/axios';

export function useCreateIssue(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateIssueInput) => {
      const res = await api.post(`/projects/${projectId}/issues`, data);
      return res.data.data as IIssueWithRelations;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backlog-grouped', projectId] });
      qc.invalidateQueries({ queryKey: ['board', projectId] });
      qc.invalidateQueries({ queryKey: ['issue-list', projectId] });
    },
  });
}

export function useIssueById(issueId: string) {
  return useQuery<IIssueWithRelations>({
    queryKey: ['issue', issueId],
    queryFn: async () => {
      const res = await api.get(`/issues/${issueId}`);
      return res.data.data;
    },
    enabled: !!issueId,
  });
}

export function useUpdateIssue(issueId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateIssueInput) => {
      const res = await api.patch(`/issues/${issueId}`, data);
      return res.data.data as IIssueWithRelations;
    },
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['activities', issueId] });
      qc.invalidateQueries({ queryKey: ['issue', issueId] });
      qc.invalidateQueries({ queryKey: ['board', projectId] });
      qc.invalidateQueries({ queryKey: ['issue-list', projectId] });
      qc.invalidateQueries({ queryKey: ['backlog-grouped', projectId] });
    },
  });
}

export function useDeleteIssue(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (issueId: string) => {
      await api.delete(`/issues/${issueId}`);
    },
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['board', projectId] });
      qc.invalidateQueries({ queryKey: ['backlog-grouped', projectId] });
    },
  });
}

export function useDuplicateIssue(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      issue: Pick<CreateIssueInput, 'title' | 'description' | 'type' | 'priority' | 'labelIds'>,
    ) => {
      const payload: CreateIssueInput = {
        ...issue,
        title: `${issue.title} (copy)`,
      };

      const res = await api.post(`/projects/${projectId}/issues`, payload);
      return res.data.data as { id: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['backlog-grouped', projectId] });
      qc.invalidateQueries({ queryKey: ['board', projectId] });
      qc.invalidateQueries({ queryKey: ['issue-list', projectId] });
      return data.id;
    },
  });
}

export function useProjectSprints(projectId: string) {
  return useQuery<ISprint[]>({
    queryKey: ['sprints', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/sprints`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useProjectMembers(projectId: string) {
  return useQuery<IProjectMember[]>({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/members`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

interface ActivityPage {
  items: IActivityLog[]; // whatever your Activity type is
  meta: { nextCursor: string | null; hasMore: boolean };
}

export function useIssueActivities(issueId: string, limit = 10) {
  return useInfiniteQuery({
    queryKey: ['activities', issueId],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const res = await api.get(`/issues/${issueId}/activities`, {
        params: { limit, ...(pageParam ? { cursor: pageParam } : {}) },
      });
      return res.data.data as ActivityPage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? (lastPage.meta.nextCursor ?? undefined) : undefined,
    enabled: !!issueId,
  });
}

export function useCreateSubIssue(parentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateIssueInput) => {
      const res = await api.post(`/issues/${parentId}/children`, data);
      return res.data.data as IIssueWithRelations;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issue', parentId] });
    },
  });
}

export function useAttachChildIssue(parentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (issueId: string) => {
      const res = await api.post(`/issues/${parentId}/children/attach`, { issueId });
      return res.data.data as IIssueWithRelations;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issue', parentId] });
    },
  });
}

export function useDetachChildIssue(parentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (childId: string) => {
      const res = await api.delete(`/issues/${parentId}/children/${childId}`);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issue', parentId] });
    },
  });
}

export interface IIssueSearchResult {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: string;
}

export function useSearchProjectIssues(
  projectId: string,
  query: string,
  options?: { excludeId?: string; mode?: 'child'; enabled?: boolean },
) {
  return useQuery<IIssueSearchResult[]>({
    queryKey: ['issue-search', projectId, query, options?.excludeId, options?.mode],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/issues/search`, {
        params: { q: query || undefined, excludeId: options?.excludeId, mode: options?.mode },
      });
      return res.data.data;
    },
    enabled: !!projectId && (options?.enabled ?? true),
  });
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface IssueListParams extends IssueFilters {
  page?: number;
  limit?: number;
  sortBy?: 'position' | 'priority' | 'dueDate' | 'createdAt' | 'updatedAt' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export function useIssueList(projectId: string, params: IssueListParams = {}) {
  const { page = 1, limit = 25, sortBy = 'position', sortOrder = 'asc', ...filters } = params;

  return useQuery<PaginatedResponse<IIssueWithRelations>>({
    // page/limit/sort in the key too — every distinct combo caches separately,
    // matches how useBoard keys on filters
    queryKey: ['issue-list', projectId, filters, page, limit, sortBy, sortOrder],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/issues/list`, {
        params: {
          assigneeId: filters.assigneeId,
          labelId: filters.labelId,
          priority: filters.priority,
          type: filters.type,
          dueDateFrom: filters.dueDateFrom,
          dueDateTo: filters.dueDateTo,
          noDueDate: filters.noDueDate,
          q: filters.q,
          page,
          limit,
          sortBy,
          sortOrder,
        },
      });
      return res.data.data;
    },
    enabled: !!projectId,
    placeholderData: (prev) => prev, // keep old page's rows visible while next page loads — avoids table flicker
  });
}
