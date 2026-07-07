import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { CreateSprintInput, UpdateSprintInput } from "@devflow/validators";
import type { ISprintWithCount } from "@devflow/types";

export function useSprints(projectId: string) {
    return useQuery<ISprintWithCount[]>({
        queryKey: ["sprints", projectId],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/sprints`);
            return res.data.data;
        },
        enabled: !!projectId,
    });
}

export function useCreateSprint(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateSprintInput) => {
            const res = await api.post(`/projects/${projectId}/sprints`, data);
            return res.data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["sprints", projectId] }),
    });
}

export function useUpdateSprint(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ sprintId, data }: { sprintId: string; data: UpdateSprintInput }) => {
            const res = await api.patch(`/sprints/${sprintId}`, data);
            return res.data.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["sprints", projectId] });
            qc.invalidateQueries({ queryKey: ["board", projectId] });
            qc.invalidateQueries({ queryKey: ["backlog-grouped", projectId] });
        },
    });
}

export function useDeleteSprint(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (sprintId: string) => {
            const res = await api.delete(`/sprints/${sprintId}`);
            return res.data.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["sprints", projectId] });
            qc.invalidateQueries({ queryKey: ["board", projectId] });
            qc.invalidateQueries({ queryKey: ["backlog-grouped", projectId] });
        },
    });
}

export function useStartSprint(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (sprintId: string) => {
            const res = await api.post(`/sprints/${sprintId}/start`);
            return res.data.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["sprints", projectId] });
            qc.invalidateQueries({ queryKey: ["board", projectId] });
            qc.invalidateQueries({ queryKey: ["backlog-grouped", projectId] });
        },
    });
}

export function useCompleteSprint(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (sprintId: string) => {
            const res = await api.post(`/sprints/${sprintId}/complete`);
            return res.data.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["sprints", projectId] });
            qc.invalidateQueries({ queryKey: ["board", projectId] });
            qc.invalidateQueries({ queryKey: ["backlog-grouped", projectId] });
        },
    });
}