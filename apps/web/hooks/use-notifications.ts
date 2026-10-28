'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { IApiResponse, ICursorPaginatedData, INotification } from '@devflow/types';

import { getAuthErrorMessage } from '../lib/auth-errors';
import { api } from '../lib/axios';
import { userKeys } from './use-user';

const PAGE_SIZE = 20;

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
};

function showError(err: unknown, fallback: string) {
  const message = getAuthErrorMessage(err, fallback);
  if (message) toast.error(message);
}

// Every change refreshes the list AND the sidebar badge, so the two never disagree.
// A realtime (websocket) handler can reuse this later.
function useRefreshNotifications() {
  const qc = useQueryClient();

  return () => {
    qc.invalidateQueries({ queryKey: notificationKeys.all });
    qc.invalidateQueries({ queryKey: userKeys.counts });
  };
}

// ─── Fetch ────────────────────────────────────────────────────
// Unread first, then newest, loaded in pages
export function useNotifications() {
  const query = useInfiniteQuery({
    queryKey: notificationKeys.list(),
    queryFn: async ({ pageParam }) => {
      const res = await api.get<IApiResponse<ICursorPaginatedData<INotification>>>(
        '/notifications',
        { params: { cursor: pageParam, limit: PAGE_SIZE } },
      );
      return res.data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  });

  return {
    notifications: query.data?.pages.flatMap((page) => page.items) ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    hasMore: query.hasNextPage,
    loadMore: () => query.fetchNextPage(),
    isLoadingMore: query.isFetchingNextPage,
  };
}

// ─── Change ───────────────────────────────────────────────────
// Single-row actions are quiet on success (a toast per click is noise).
// Bulk actions confirm. Every error shows a toast.
export function useMarkAsRead() {
  const refresh = useRefreshNotifications();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: refresh,
    onError: (err) => showError(err, 'Failed to mark as read'),
  });
}

export function useMarkAllAsRead() {
  const refresh = useRefreshNotifications();

  return useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      refresh();
      toast.success('All notifications marked as read');
    },
    onError: (err) => showError(err, 'Failed to mark all as read'),
  });
}

export function useDeleteNotification() {
  const refresh = useRefreshNotifications();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: refresh,
    onError: (err) => showError(err, 'Failed to delete notification'),
  });
}

export function useClearReadNotifications() {
  const refresh = useRefreshNotifications();

  return useMutation({
    mutationFn: async () => {
      await api.delete('/notifications');
    },
    onSuccess: () => {
      refresh();
      toast.success('Read notifications cleared');
    },
    onError: (err) => showError(err, 'Failed to clear notifications'),
  });
}
