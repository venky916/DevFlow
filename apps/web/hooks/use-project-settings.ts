import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { ProjectRole } from "@devflow/types";

// ─── Hooks ────────────────────────────────────────────────────────
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

export function useWorkspaceMembers(workspaceId: string) {
    return useQuery({
        queryKey: ["workspace-members", workspaceId],
        queryFn: async () => {
            const res = await api.get(`/workspaces/${workspaceId}/members`);
            return res.data.data;
        },
        enabled: !!workspaceId,
    });
}

export function useUpdateProjectMemberRole(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            userId,
            role,
        }: {
            userId: string;
            role: ProjectRole;
        }) => {
            const res = await api.put(`/projects/${projectId}/members/${userId}`, {
                role,
            });
            return res.data.data;
        },
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: ["project-members", projectId] }),
    });
}

export function useRemoveProjectMember(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (userId: string) => {
            await api.delete(`/projects/${projectId}/members/${userId}`);
        },
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: ["project-members", projectId] }),
    });
}

export function useAddProjectMember(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            userId,
            role,
        }: {
            userId: string;
            role: ProjectRole;
        }) => {
            const res = await api.post(`/projects/${projectId}/members`, {
                userId,
                role,
            });
            return res.data.data;
        },
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: ["project-members", projectId] }),
    });
}