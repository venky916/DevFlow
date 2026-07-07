import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { ProjectRole } from "@devflow/types";
import type { CreateLabelInput, UpdateLabelInput } from "@devflow/validators";

// ─── Members ──────────────────────────────────────────────────────

export function useProjectMembers(projectId: string) {
    return useQuery({
        queryKey: ["project-members", projectId],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/members`);
            return res.data.data;
        },
        enabled: !!projectId,
    });
}

export function useAddProjectMember(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: ProjectRole }) => {
            const res = await api.post(`/projects/${projectId}/members`, { userId, role });
            return res.data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["project-members", projectId] }),
    });
}

export function useUpdateProjectMemberRole(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: ProjectRole }) => {
            const res = await api.put(`/projects/${projectId}/members/${userId}`, { role });
            return res.data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["project-members", projectId] }),
    });
}

export function useRemoveProjectMember(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (userId: string) => {
            await api.delete(`/projects/${projectId}/members/${userId}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["project-members", projectId] }),
    });
}

// ─── Labels ───────────────────────────────────────────────────────

export function useProjectLabels(projectId: string) {
    return useQuery({
        queryKey: ["project-labels", projectId],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/labels`);
            return res.data.data;
        },
        enabled: !!projectId,
    });
}

export function useCreateLabel(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateLabelInput) => {
            const res = await api.post(`/projects/${projectId}/labels`, data);
            return res.data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["project-labels", projectId] }),
    });
}

export function useUpdateLabel(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ labelId, data }: { labelId: string; data: UpdateLabelInput }) => {
            const res = await api.patch(`/projects/${projectId}/labels/${labelId}`, data);
            return res.data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["project-labels", projectId] }),
    });
}

export function useDeleteLabel(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (labelId: string) => {
            await api.delete(`/projects/${projectId}/labels/${labelId}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["project-labels", projectId] }),
    });
}