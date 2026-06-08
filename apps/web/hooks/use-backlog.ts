import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { IIssueWithRelations, ISprint } from "@devflow/types";
import type { MoveIssueToSprintInput } from "@devflow/validators";

export function useBacklog(projectId: string) {
    return useQuery<IIssueWithRelations[]>({
        queryKey: ["backlog", projectId],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/issues/backlog`);
            return res.data.data;
        },
        enabled: !!projectId,
    });
}

export interface BacklogGroup {
    sprints: (ISprint & { issues: IIssueWithRelations[] })[];
    backlogIssues: IIssueWithRelations[];
}

export function useBacklogGrouped(projectId: string) {
    return useQuery<BacklogGroup>({
        queryKey: ["backlog-grouped", projectId],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/issues/backlog/grouped`);
            return res.data.data;
        },
        enabled: !!projectId,
    });
}

export function useMoveToSprint(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ issueId, data }: { issueId: string; data: MoveIssueToSprintInput }) => {
            const res = await api.patch(`/issues/${issueId}/move-to-sprint`, data);
            return res.data.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["backlog-grouped", projectId] });
            qc.invalidateQueries({ queryKey: ["board", projectId] });
        },
    });
}