import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { IWorkspaceWithMembers, IWorkspace } from "@devflow/types";
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from "@devflow/validators";

export function useWorkspaces() {
    return useQuery<IWorkspaceWithMembers[]>({
        queryKey: ["workspaces"],
        queryFn: () => api.get("/workspaces").then((res) => res.data.data),
    });
}

export function useWorkspace(workspaceId: string) {
    return useQuery<IWorkspaceWithMembers>({
        queryKey: ["workspace", workspaceId],
        queryFn: () => api.get(`/workspaces/${workspaceId}`).then((res) => res.data.data),
    });
}

export function useCreateWorkspace() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateWorkspaceInput) => {
            const res = await api.post("/workspaces", data)
            return res.data.data as IWorkspace;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
    });
}

export function useUpdateWorkspace(workspaceId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: UpdateWorkspaceInput) => {
            const res = await api.patch(`/workspaces/${workspaceId}`, data)
            return res.data.data as IWorkspace;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["workspaces"] });
            qc.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
        }
    })

}

export function useDeleteWorkspace(workspaceId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await api.delete(`/workspaces/${workspaceId}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
    });
}