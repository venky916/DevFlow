import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";

export interface IProjectAnalytics {
    issuesByStatus: Record<"BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE", number>;
    issuesByType: Record<"BUG" | "FEATURE" | "TASK" | "IMPROVEMENT" | "OTHER", number>;
    overdueCount: number;
    sprintVelocity: {
        sprintId: string;
        name: string;
        status: string;
        doneCount: number;
        totalCount: number;
        percentage: number;
    }[];
    issuesByAssignee: {
        user: { id: string; name: string | null; avatarUrl: string | null } | null;
        count: number;
        overdueCount: number;
    }[];
}

export function useProjectAnalytics(projectId: string) {
    return useQuery<IProjectAnalytics>({
        queryKey: ["project-analytics", projectId],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/analytics`);
            return res.data.data;
        },
        enabled: !!projectId,
    });
}

export interface IWorkspaceAnalytics {
    totalIssues: number;
    activeSprintsCount: number;
    memberCount: number;
    issuesByProject: { project: { id: string; name: string; color: string }; count: number }[];
    roleBreakdown: Record<"ADMIN" | "DEVELOPER" | "VIEWER", number>;
    members: {
        user: { id: string; name: string | null; email: string; avatarUrl: string | null };
        role: string;
        joinedAt: string;
    }[];
}

export function useWorkspaceAnalytics(workspaceId: string) {
    return useQuery<IWorkspaceAnalytics>({
        queryKey: ["workspace-analytics", workspaceId],
        queryFn: async () => {
            const res = await api.get(`/workspaces/${workspaceId}/analytics`);
            return res.data.data;
        },
        enabled: !!workspaceId,
    });
}