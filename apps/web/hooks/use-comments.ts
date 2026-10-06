import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { TiptapContent } from '@devflow/validators';

import { api } from '../lib/axios';

export function useComments(issueId: string) {
  return useQuery({
    queryKey: ['comments', issueId],
    queryFn: async () => {
      const res = await api.get(`/issues/${issueId}/comments`);
      return res.data.data;
    },
    enabled: !!issueId,
  });
}

export function useCreateComment(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { content: TiptapContent }) => {
      const res = await api.post(`/issues/${issueId}/comments`, data);
      return res.data.data;
    },
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['activities', issueId] });
      qc.invalidateQueries({ queryKey: ['comments', issueId] });
    },
  });
}

export function useUpdateComment(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: TiptapContent }) => {
      const res = await api.patch(`/comments/${commentId}`, { content });
      return res.data.data;
    },
    onSuccess: async (_data, { commentId }) => {
      await qc.refetchQueries({ queryKey: ['activities', issueId] });
      qc.invalidateQueries({ queryKey: ['comments'] });
    },
  });
}

export function useDeleteComment(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/comments/${commentId}`);
    },
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['activities', issueId] });
      qc.invalidateQueries({ queryKey: ['comments', issueId] });
    },
  });
}
