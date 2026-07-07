import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { IIssueWithRelations, IssueStatus } from "@devflow/types";
import type { IssueFilters } from "../components/shared/filter-bar";

// getMyIssues includes `project` — not part of the shared IIssueWithRelations,
// since board/backlog issues never carry it (already scoped to one project)
export interface IMyIssue extends IIssueWithRelations {
    project: {
        id: string;
        name: string;
        slug: string;
        workspace: { id: string; slug: string };
    };
}

// extends IssueFilters rather than redeclaring the same fields — this is
// what fixes the dueDatePreset type mismatch, since there's now only one
// real definition of it (IssueFilters'), not two that can drift apart.
// projectId/sprintId/priority/type/dueDate*/noDueDate/dueDatePreset all
// already exist on IssueFilters, so nothing new needs declaring here —
// this interface exists only so My Issues has its own name for the concept
export interface MyIssuesFilters extends IssueFilters { }

interface MyIssuesResponse {
    columns: Record<IssueStatus, IMyIssue[]>;
}

export function useMyIssues(filters: MyIssuesFilters = {}) {
    return useQuery<MyIssuesResponse>({
        queryKey: ["my-issues", filters],
        queryFn: async () => {
            const res = await api.get("/users/my-issues", {
                params: {
                    projectId: filters.projectId,
                    sprintId: filters.sprintId,
                    priority: filters.priority,
                    type: filters.type,
                    dueDateFrom: filters.dueDateFrom,
                    dueDateTo: filters.dueDateTo,
                    noDueDate: filters.noDueDate,
                },
            });
            return res.data.data;
        },
    }); // includes refetch, isFetching by default
}