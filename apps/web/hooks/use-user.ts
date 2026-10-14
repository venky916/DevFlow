'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { IApiResponse, IUser } from '@devflow/types';
import type { UpdateProfileInput } from '@devflow/validators';

import { getAuthErrorMessage } from '../lib/auth-errors';
import { api } from '../lib/axios';
import { useAuthStore } from '../stores/auth.store';
import { useUploadImage } from './use-upload';

export interface ISidebarCounts {
  unreadNotifications: number;
  myOpenIssues: number;
}

export const userKeys = {
  me: ['me'] as const,
  counts: ['me', 'counts'] as const,
};

// ─── Fetch ────────────────────────────────────────────────────
export function useMyProfile() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: async () => {
      const res = await api.get<IApiResponse<IUser>>('/users/me');
      return res.data.data;
    },
  });
}

export function useSidebarCounts() {
  return useQuery({
    queryKey: userKeys.counts,
    queryFn: async () => {
      const res = await api.get<IApiResponse<ISidebarCounts>>('/users/me/counts');
      return res.data.data;
    },
  });
}

// ─── Change ───────────────────────────────────────────────────
// Shared by profile and avatar. Merges the response into the cache and the
// auth store, so the sidebar updates right away and a partial response
// can't wipe fields. It does not touch the counts query.
function useSyncUser() {
  const qc = useQueryClient();

  return (updated: Partial<IUser>) => {
    qc.setQueryData<IUser>(userKeys.me, (old) => (old ? { ...old, ...updated } : old));

    const { user, setUser } = useAuthStore.getState();
    if (user) setUser({ ...user, ...updated });
  };
}

export function useUpdateProfile() {
  const syncUser = useSyncUser();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const res = await api.patch<IApiResponse<IUser>>('/users/me', input);
      return res.data.data;
    },
    onSuccess: (user) => {
      syncUser(user);
      toast.success('Profile updated');
    },
    onError: (err) => {
      const message = getAuthErrorMessage(err, 'Failed to update profile');
      if (message) toast.error(message);
    },
  });
}

export function useUpdateAvatar() {
  const syncUser = useSyncUser();

  return useMutation({
    mutationFn: async (avatarUrl: string) => {
      const res = await api.patch<IApiResponse<IUser>>('/users/me/avatar', { avatarUrl });
      return res.data.data;
    },
    onSuccess: (user) => {
      syncUser(user);
      toast.success('Avatar updated');
    },
    onError: (err) => {
      const message = getAuthErrorMessage(err, 'Failed to update avatar');
      if (message) toast.error(message);
    },
  });
}

// upload the image, then save its URL on the user
export function useUploadAvatar() {
  const { uploadImage, isUploading } = useUploadImage('avatars');
  const { mutate: updateAvatar, isPending } = useUpdateAvatar();

  const uploadAvatar = async (file: File) => {
    const url = await uploadImage(file);
    if (url) updateAvatar(url);
  };

  return { uploadAvatar, isUploading: isUploading || isPending };
}