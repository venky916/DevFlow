'use client';

import { useEffect } from 'react';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  IApiResponse,
  IWorkspace,
  IWorkspaceAnalytics,
  IWorkspaceInvite,
  IWorkspaceMember,
  IWorkspaceMemberWithUser,
  IWorkspaceSummary,
  WorkspaceRole,
} from '@devflow/types';
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from '@devflow/validators';

import { ROUTES } from '../constants/routes';
import { getAuthErrorMessage } from '../lib/auth-errors';
import { api } from '../lib/axios';
import { canWorkspace, type WorkspaceAction } from '../lib/permissions';
import { useUploadImage } from './use-upload';

export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: () => [...workspaceKeys.all, 'list'] as const,
  bySlug: (slug: string) => [...workspaceKeys.all, 'slug', slug] as const,
  members: (id: string) => [...workspaceKeys.all, 'members', id] as const,
  invites: (id: string) => [...workspaceKeys.all, 'invites', id] as const,
  analytics: (id: string) => [...workspaceKeys.all, 'analytics', id] as const,
};

function showError(err: unknown, fallback: string) {
  const message = getAuthErrorMessage(err, fallback);
  if (message) toast.error(message);
}

// ─── Workspace: fetch ─────────────────────────────────────────
// Lean list: /workspaces page and the switcher only
export function useWorkspaces(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IWorkspaceSummary[]>>('/workspaces/summary');
      return res.data.data;
    },
    enabled: options?.enabled ?? true,
  });
}

// One workspace + my role. Guard, pages, permissions all share this cache entry
export function useWorkspaceBySlug(slug: string) {
  return useQuery({
    queryKey: workspaceKeys.bySlug(slug),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IWorkspaceSummary>>(`/workspaces/by-slug/${slug}`);
      return res.data.data;
    },
    enabled: !!slug,
    // a 404 means "no access", so retrying won't help
    retry: (count, err) => !(isAxiosError(err) && err.response?.status === 404) && count < 1,
  });
}

// ─── Guards ───────────────────────────────────────────────────
// Loading, error (retry), or ready. A 404 from by-slug means "not a member".
export function useWorkspaceGuard(slug: string) {
  const router = useRouter();
  const { isLoading, isError, error, refetch } = useWorkspaceBySlug(slug);
  const isNoAccess = isAxiosError(error) && error.response?.status === 404;

  useEffect(() => {
    if (isNoAccess) router.replace(ROUTES.noAccess('not-a-member'));
  }, [isNoAccess, router]);

  const status = isLoading || isNoAccess ? 'loading' : isError ? 'error' : 'ready';
  return { status, refetch } as const;
}

// For pages only some roles may open (settings, analytics).
// Redirects everyone else, so pages don't repeat the same useEffect.
export function useRequireWorkspaceRole(slug: string, action: WorkspaceAction) {
  const router = useRouter();
  const { data: workspace } = useWorkspaceBySlug(slug);
  const isAllowed = workspace ? canWorkspace(workspace.currentUserWorkspaceRole, action) : null;

  useEffect(() => {
    if (isAllowed === false) router.replace(ROUTES.noAccess('insufficient-role', slug));
  }, [isAllowed, router, slug]);

  return { workspace, isAllowed: isAllowed === true };
}

// ─── Workspace: change ────────────────────────────────────────
export function useCreateWorkspace() {
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkspaceInput) => {
      const res = await api.post<IApiResponse<IWorkspace>>('/workspaces', input);
      return res.data.data;
    },
    onSuccess: (workspace) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.all });
      toast.success('Workspace created!');
      router.push(ROUTES.workspace(workspace.slug));
    },
    onError: (err) => showError(err, 'Failed to create workspace'),
  });
}

export function useUpdateWorkspace(workspaceId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWorkspaceInput) => {
      const res = await api.patch<IApiResponse<IWorkspace>>(`/workspaces/${workspaceId}`, input);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workspaceKeys.all });
      toast.success('Workspace updated');
    },
    onError: (err) => showError(err, 'Failed to update workspace'),
  });
}

export function useDeleteWorkspace(workspaceId: string) {
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete(`/workspaces/${workspaceId}`);
    },
    onSuccess: () => {
      // mark stale without refetching, because the deleted workspace would return 404
      qc.invalidateQueries({ queryKey: workspaceKeys.all, refetchType: 'none' });
      toast.success('Workspace deleted');
      router.push(ROUTES.workspaces);
    },
    onError: (err) => showError(err, 'Failed to delete workspace'),
  });
}

// ─── Logo ─────────────────────────────────────────────────────
export function useUpdateWorkspaceLogo(workspaceId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (url: string) => {
      const res = await api.patch<IApiResponse<IWorkspace>>(`/workspaces/${workspaceId}/logo`, {
        url,
      });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workspaceKeys.all });
      toast.success('Logo updated');
    },
    onError: (err) => showError(err, 'Failed to update logo'),
  });
}

// upload the image, then save its URL on the workspace
export function useUploadWorkspaceLogo(workspaceId: string) {
  const { uploadImage, isUploading } = useUploadImage('logos');
  const { mutate: updateLogo, isPending } = useUpdateWorkspaceLogo(workspaceId);

  const uploadLogo = async (file: File) => {
    const url = await uploadImage(file);
    if (url) updateLogo(url);
  };

  return { uploadLogo, isUploading: isUploading || isPending };
}

// ─── Members ──────────────────────────────────────────────────
export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IWorkspaceMemberWithUser[]>>(
        `/workspaces/${workspaceId}/members`,
      );
      return res.data.data;
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateMemberRole(workspaceId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: WorkspaceRole }) => {
      const res = await api.put<IApiResponse<IWorkspaceMember>>(
        `/workspaces/${workspaceId}/members/${userId}`,
        { role },
      );
      return res.data.data;
    },
    // a role change doesn't change counts, so only the members list refreshes
    onSuccess: (_member, { role }) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
      toast.success(`Role updated to ${role}`);
    },
    onError: (err) => showError(err, 'Failed to update role'),
  });
}

export function useRemoveMember(workspaceId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
    },
    // member counts change too, so refresh everything under workspaces
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workspaceKeys.all });
      toast.success('Member removed');
    },
    onError: (err) => showError(err, 'Failed to remove member'),
  });
}

// ─── Invites ──────────────────────────────────────────────────
export function useWorkspaceInvites(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.invites(workspaceId),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IWorkspaceInvite[]>>(
        `/workspaces/${workspaceId}/invites`,
      );
      return res.data.data;
    },
    enabled: !!workspaceId,
  });
}

export function useCreateInvite(workspaceId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { email: string; role: WorkspaceRole }) => {
      const res = await api.post<IApiResponse<IWorkspaceInvite>>(
        `/workspaces/${workspaceId}/invites`,
        input,
      );
      return res.data.data;
    },
    onSuccess: (_invite, { email }) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.invites(workspaceId) });
      toast.success(`Invite sent to ${email}`);
    },
    onError: (err) => showError(err, 'Failed to send invite'),
  });
}

export function useCancelInvite(workspaceId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      await api.delete(`/workspaces/${workspaceId}/invites/${inviteId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workspaceKeys.invites(workspaceId) });
      toast.success('Invite cancelled');
    },
    onError: (err) => showError(err, 'Failed to cancel invite'),
  });
}

// ─── Analytics ────────────────────────────────────────────────
export function useWorkspaceAnalytics(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.analytics(workspaceId),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IWorkspaceAnalytics>>(
        `/workspaces/${workspaceId}/analytics`,
      );
      return res.data.data;
    },
    enabled: !!workspaceId,
  });
}