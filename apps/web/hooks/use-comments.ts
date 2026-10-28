'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { IApiResponse, IComment, ITiptapNode } from '@devflow/types';

import { api } from '../lib/axios';
import { showError } from '../lib/show-error';
import { issueKeys } from './use-issues';

// comments have their own keys, outside the issue keys, so saving a field never reloads them
export const commentKeys = {
  all: ['comments'] as const,
  list: (issueId: string) => [...commentKeys.all, issueId] as const,
};

// the list updates at once from the server's answer, and the activity feed gets a new line
function useChangeComments(issueId: string) {
  const qc = useQueryClient();

  return (update: (list: IComment[]) => IComment[]) => {
    qc.setQueryData<IComment[]>(commentKeys.list(issueId), (list) => (list ? update(list) : list));
    qc.invalidateQueries({ queryKey: issueKeys.activities(issueId) });
  };
}

export function useComments(issueId: string) {
  return useQuery({
    queryKey: commentKeys.list(issueId),
    queryFn: async () => {
      const res = await api.get<IApiResponse<IComment[]>>(`/issues/${issueId}/comments`);
      return res.data.data;
    },
    enabled: !!issueId,
  });
}

export function useCreateComment(issueId: string) {
  const change = useChangeComments(issueId);

  return useMutation({
    mutationFn: async (input: { content: ITiptapNode }) => {
      const res = await api.post<IApiResponse<IComment>>(`/issues/${issueId}/comments`, input);
      return res.data.data;
    },
    onSuccess: (created) => change((list) => [...list, created]),
    onError: (err) => showError(err, "Couldn't post your comment"),
  });
}

export function useUpdateComment(issueId: string) {
  const change = useChangeComments(issueId);

  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: ITiptapNode }) => {
      const res = await api.patch<IApiResponse<IComment>>(`/comments/${commentId}`, { content });
      return res.data.data;
    },
    onSuccess: (updated) =>
      change((list) => list.map((comment) => (comment.id === updated.id ? updated : comment))),
    onError: (err) => showError(err, "Couldn't update your comment"),
  });
}

export function useDeleteComment(issueId: string) {
  const change = useChangeComments(issueId);

  return useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/comments/${commentId}`);
    },
    onSuccess: (_data, commentId) => {
      change((list) => list.filter((comment) => comment.id !== commentId));
      toast.success('Comment deleted');
    },
    onError: (err) => showError(err, "Couldn't delete the comment"),
  });
}
