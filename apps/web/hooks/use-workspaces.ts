import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { IWorkspaceWithMembers, IWorkspace } from "@devflow/types";
import type { CreateWorkspaceInput } from "@devflow/validators";

export function useWorkspaces() {
    return useQuery<IWorkspaceWithMembers[]>({
        queryKey: ["workspaces"],
        queryFn: () => api.get("/workspaces").then((res) => res.data.data),
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