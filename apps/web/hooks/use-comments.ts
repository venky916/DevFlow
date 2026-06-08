import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";

export function useComments(issueId: string) {
    return useQuery({
        queryKey: ["comments", issueId],
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
        mutationFn: async (data: { content: string }) => {
            const res = await api.post(`/issues/${issueId}/comments`, data);
            return res.data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", issueId] }),
    });
}

export function useUpdateComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
            const res = await api.patch(`/comments/${commentId}`, { content });
            return res.data.data;
        },
        onSuccess: (_data, { commentId }) => {
            qc.invalidateQueries({ queryKey: ["comments"] });
        },
    });
}

export function useDeleteComment(issueId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (commentId: string) => {
            await api.delete(`/comments/${commentId}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", issueId] }),
    });
}