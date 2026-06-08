import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { IIssueWithRelations, IssueStatus } from "@devflow/types";

interface MyIssuesResponse {
    columns: Record<IssueStatus, IIssueWithRelations[]>;
}

export function useMyIssues() {
    return useQuery<MyIssuesResponse>({
        queryKey: ["my-issues"],
        queryFn: async () => {
            const res = await api.get("/users/my-issues");
            return res.data.data;
        },
    });
}