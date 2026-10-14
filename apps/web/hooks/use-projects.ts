'use client';

import { useEffect } from 'react';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  IActivityLog,
  IApiResponse,
  IAvailableProjectMember,
  ICursorPaginatedData,
  IProject,
  IProjectAnalytics,
  IProjectDetail,
  IProjectLabel,
  IProjectMember,
  IProjectMemberListItem,
  IProjectSummary,
} from '@devflow/types';
import type {
  AddProjectMemberInput,
  CreateLabelInput,
  CreateProjectInput,
  UpdateLabelInput,
  UpdateProjectInput,
  UpdateProjectMemberRoleInput,
} from '@devflow/validators';

import { ROUTES } from '../constants/routes';
import { getAuthErrorMessage } from '../lib/auth-errors';
import { api } from '../lib/axios';
import { canProject, type ProjectAction } from '../lib/permissions';
import { workspaceKeys } from './use-workspaces';

export const projectKeys = {
  all: ['projects'] as const,
  list: (workspaceId: string) => [...projectKeys.all, 'list', workspaceId] as const,
  bySlug: (workspaceSlug: string, projectSlug: string) =>
    [...projectKeys.all, 'slug', workspaceSlug, projectSlug] as const,
  detail: (projectId: string) => [...projectKeys.all, 'detail', projectId] as const,
  activities: (projectId: string) => [...projectKeys.all, 'activities', projectId] as const,
  analytics: (projectId: string) => [...projectKeys.all, 'analytics', projectId] as const,
  members: (projectId: string) => [...projectKeys.all, 'members', projectId] as const,
  availableMembers: (projectId: string) =>
    [...projectKeys.all, 'available-members', projectId] as const,
  labels: (projectId: string) => [...projectKeys.all, 'labels', projectId] as const,
};

const ACTIVITY_PAGE_SIZE = 10;

function showError(err: unknown, fallback: string) {
  const message = getAuthErrorMessage(err, fallback);
  if (message) toast.error(message);
}

// ─── Project: fetch ───────────────────────────────────────────
// Lean list: workspace home and the sidebar. No member lists.
export function useProjects(workspaceId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectKeys.list(workspaceId),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IProjectSummary[]>>(
        `/workspaces/${workspaceId}/projects/summary`,
      );
      return res.data.data;
    },
    enabled: !!workspaceId && (options?.enabled ?? true),
  });
}

// One project + my access. The guard, every project page and usePermissions share this cache entry.
export function useProjectBySlug(workspaceSlug: string, projectSlug: string) {
  return useQuery({
    queryKey: projectKeys.bySlug(workspaceSlug, projectSlug),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IProjectSummary>>(
        `/projects/by-slug/${workspaceSlug}/${projectSlug}`,
      );
      return res.data.data;
    },
    enabled: !!workspaceSlug && !!projectSlug,
    // a 404 means "no access", so retrying won't help
    retry: (count, err) => !(isAxiosError(err) && err.response?.status === 404) && count < 1,
  });
}

// Heavy detail (members + sprints). Only pages that need it call this.
export function useProjectById(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IProjectDetail>>(`/projects/${projectId}`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

// Newest first, loaded in pages (matches getProjectActivities)
export function useProjectActivities(projectId: string) {
  const query = useInfiniteQuery({
    queryKey: projectKeys.activities(projectId),
    queryFn: async ({ pageParam }) => {
      const res = await api.get<IApiResponse<ICursorPaginatedData<IActivityLog>>>(
        `/projects/${projectId}/activities`,
        { params: { cursor: pageParam, limit: ACTIVITY_PAGE_SIZE } },
      );
      return res.data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    enabled: !!projectId,
  });

  return {
    activities: query.data?.pages.flatMap((page) => page.items) ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    hasMore: query.hasNextPage,
    loadMore: () => query.fetchNextPage(),
    isLoadingMore: query.isFetchingNextPage,
  };
}

export function useProjectAnalytics(projectId: string) {
  return useQuery({
    queryKey: projectKeys.analytics(projectId),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IProjectAnalytics>>(
        `/projects/${projectId}/analytics`,
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

// ─── Guards ───────────────────────────────────────────────────
// Loading, error (retry), or ready. A 404 means "no such project, or not yours".
export function useProjectGuard(workspaceSlug: string, projectSlug: string) {
  const router = useRouter();
  const { isLoading, isError, error, refetch } = useProjectBySlug(workspaceSlug, projectSlug);
  const isNoAccess = isAxiosError(error) && error.response?.status === 404;

  useEffect(() => {
    if (isNoAccess) router.replace(ROUTES.noAccess('not-a-member', workspaceSlug));
  }, [isNoAccess, router, workspaceSlug]);

  const status = isLoading || isNoAccess ? 'loading' : isError ? 'error' : 'ready';
  return { status, refetch } as const;
}

// For project pages only some roles may open (settings, analytics).
export function useRequireProjectAccess(
  workspaceSlug: string,
  projectSlug: string,
  action: ProjectAction,
) {
  const router = useRouter();
  const { data: project } = useProjectBySlug(workspaceSlug, projectSlug);
  const isAllowed = project ? canProject(project.currentUserAccess, action) : null;

  useEffect(() => {
    if (isAllowed === false) router.replace(ROUTES.noAccess('insufficient-role', workspaceSlug));
  }, [isAllowed, router, workspaceSlug]);

  return { project, isAllowed: isAllowed === true };
}

// ─── Project: change ──────────────────────────────────────────
export function useCreateProject(workspaceId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const res = await api.post<IApiResponse<IProject>>(
        `/workspaces/${workspaceId}/projects`,
        input,
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
      qc.invalidateQueries({ queryKey: workspaceKeys.all }); // workspace project count changed
      toast.success('Project created!');
    },
    onError: (err) => showError(err, 'Failed to create project'),
  });
}

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      const res = await api.patch<IApiResponse<IProject>>(`/projects/${projectId}`, input);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
      toast.success('Project updated');
    },
    onError: (err) => showError(err, 'Failed to update project'),
  });
}

export function useDeleteProject(projectId: string, workspaceSlug: string) {
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete(`/projects/${projectId}`);
    },
    onSuccess: () => {
      // mark stale without refetching, because the deleted project would return 404
      qc.invalidateQueries({ queryKey: projectKeys.all, refetchType: 'none' });
      qc.invalidateQueries({ queryKey: workspaceKeys.all });
      toast.success('Project deleted');
      router.push(ROUTES.workspace(workspaceSlug));
    },
    onError: (err) => showError(err, 'Failed to delete project'),
  });
}

// ─── Members ──────────────────────────────────────────────────
export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: projectKeys.members(projectId),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IProjectMemberListItem[]>>(
        `/projects/${projectId}/members`,
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

// Workspace members who aren't in this project yet (LEAD can read this)
export function useAvailableProjectMembers(projectId: string) {
  return useQuery({
    queryKey: projectKeys.availableMembers(projectId),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IAvailableProjectMember[]>>(
        `/projects/${projectId}/available-members`,
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useAddProjectMember(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddProjectMemberInput) => {
      const res = await api.post<IApiResponse<IProjectMember>>(
        `/projects/${projectId}/members`,
        input,
      );
      return res.data.data;
    },
    // counts and the "available" list change too, so refresh everything under projects
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
      toast.success('Member added to project');
    },
    onError: (err) => showError(err, 'Failed to add member'),
  });
}

export function useUpdateProjectMemberRole(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string } & UpdateProjectMemberRoleInput) => {
      const res = await api.put<IApiResponse<IProjectMember>>(
        `/projects/${projectId}/members/${userId}`,
        { role },
      );
      return res.data.data;
    },
    onSuccess: (_member, { role }) => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
      toast.success(`Role updated to ${role}`);
    },
    onError: (err) => showError(err, 'Failed to update role'),
  });
}

export function useRemoveProjectMember(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/projects/${projectId}/members/${userId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
      toast.success('Member removed');
    },
    onError: (err) => showError(err, 'Failed to remove member'),
  });
}

// ─── Labels ───────────────────────────────────────────────────
export function useProjectLabels(projectId: string) {
  return useQuery({
    queryKey: projectKeys.labels(projectId),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IProjectLabel[]>>(`/projects/${projectId}/labels`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateLabel(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLabelInput) => {
      const res = await api.post<IApiResponse<IProjectLabel>>(
        `/projects/${projectId}/labels`,
        input,
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.labels(projectId) });
      toast.success('Label created');
    },
    onError: (err) => showError(err, 'Failed to create label'),
  });
}

export function useUpdateLabel(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ labelId, data }: { labelId: string; data: UpdateLabelInput }) => {
      const res = await api.patch<IApiResponse<IProjectLabel>>(
        `/projects/${projectId}/labels/${labelId}`,
        data,
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.labels(projectId) });
      toast.success('Label updated');
    },
    onError: (err) => showError(err, 'Failed to update label'),
  });
}

export function useDeleteLabel(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (labelId: string) => {
      await api.delete(`/projects/${projectId}/labels/${labelId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.labels(projectId) });
      toast.success('Label deleted');
    },
    onError: (err) => showError(err, 'Failed to delete label'),
  });
}