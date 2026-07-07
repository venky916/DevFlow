import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "../lib/axios";
import { useBoardStore } from "../stores/board.store";
import type { IIssueWithRelations, IssueStatus, ISprint } from "@devflow/types";
import type { MoveIssueInput } from "@devflow/validators";
import { toast } from "sonner";
import type { IssueFilters } from "../components/shared/filter-bar";

interface BoardResponse {
    activeSprint: ISprint | null;
    columns: Record<IssueStatus, IIssueWithRelations[]>;
}

export function useBoard(projectId: string, filters: IssueFilters = {}) {
    const setColumns = useBoardStore((s) => s.setColumns);
    const setActiveSprint = useBoardStore((s) => s.setActiveSprint);

    const query = useQuery<BoardResponse>({
        // filters in the key — different filter combos cache separately,
        // and changing filters triggers a real refetch automatically
        queryKey: ["board", projectId, filters],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/issues/board`, {
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

    useEffect(() => {
        if (!query.data) return;
        setColumns(query.data.columns);
        setActiveSprint(query.data.activeSprint);
    }, [query.data]);

    return query;
}

export function useMoveIssue() {
    const moveIssue = useBoardStore((s) => s.moveIssue);

    return useMutation({
        mutationFn: async ({
            issueId,
            data,
        }: {
            issueId: string;
            data: MoveIssueInput;
        }) => {
            const res = await api.patch(`/issues/${issueId}/move`, data);
            return res.data.data;
        },
        onMutate: ({ issueId, data }) => {
            const snapshot = useBoardStore.getState().columns;
            const fromStatus = Object.entries(snapshot).find(
                ([, issues]) => issues.some((i) => i.id === issueId)
            )?.[0] as IssueStatus;
            if (fromStatus) moveIssue(issueId, fromStatus, data.status, data.position);
            return { snapshot }; // return for rollback
        },
        onError: (_err, _vars, context) => {
            if (context?.snapshot) {
                useBoardStore.getState().setColumns(context.snapshot);
            }
            toast.error("Failed to move issue");
        }
    });
}