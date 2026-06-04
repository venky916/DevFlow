import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "../lib/axios";
import { useBoardStore } from "../stores/board.store";
import type { IIssueWithRelations, IssueStatus, ISprint } from "@devflow/types";
import type { MoveIssueInput } from "@devflow/validators";

interface BoardResponse {
    activeSprint: ISprint | null;
    columns: Record<IssueStatus, IIssueWithRelations[]>;
}

export function useBoard(projectId: string) {
    const setColumns = useBoardStore((s) => s.setColumns);
    const setActiveSprint = useBoardStore((s) => s.setActiveSprint);

    const query = useQuery<BoardResponse>({
        queryKey: ["board", projectId],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/issues/board`);
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
            // optimistic update
            const columns = useBoardStore.getState().columns;
            const fromStatus = Object.entries(columns).find(
                ([, issues]) => issues.some((i) => i.id === issueId)
            )?.[0] as IssueStatus;
            if (fromStatus) moveIssue(issueId, fromStatus, data.status, data.position);
        },
    });
}