import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { CreateProjectInput } from "@devflow/validators";
import type { IProjectWithMembers } from "@devflow/types";

export function useProjects(workspaceId: string) {
    return useQuery<IProjectWithMembers[]>({
        queryKey: ["projects", workspaceId],
        queryFn: async () => {
            const res = await api.get(`/workspaces/${workspaceId}/projects`);
            return res.data.data;
        },
        enabled: !!workspaceId,
    });
}

export function useCreateProject(workspaceId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateProjectInput) => {
            const res = await api.post(`/workspaces/${workspaceId}/projects`, data);
            return res.data.data as IProjectWithMembers;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", workspaceId] }),
    });
}