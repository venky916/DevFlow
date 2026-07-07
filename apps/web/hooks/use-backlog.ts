import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { IIssueWithRelations, ISprint } from "@devflow/types";
import type { MoveIssueToSprintInput } from "@devflow/validators";
import type { IssueFilters } from "../components/shared/filter-bar";

interface BacklogGroupedResponse {
    sprints: (ISprint & { issues: IIssueWithRelations[] })[];
    backlogIssues: IIssueWithRelations[];
}

export function useBacklogGrouped(projectId: string, filters: IssueFilters = {}) {
    return useQuery<BacklogGroupedResponse>({
        queryKey: ["backlog-grouped", projectId, filters],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/issues/backlog/grouped`, {
                params: {
                    assigneeId: filters.assigneeId,
                    labelId: filters.labelId,
                    priority: filters.priority,
                    type: filters.type,
                    dueDateFrom: filters.dueDateFrom,
                    dueDateTo: filters.dueDateTo,
                    noDueDate: filters.noDueDate,
                },
            });
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