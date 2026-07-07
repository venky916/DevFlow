import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { CreateIssueInput, UpdateIssueInput } from "@devflow/validators";
import type { IIssueWithRelations, ISprint, IProjectMember } from "@devflow/types";

export function useCreateIssue(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateIssueInput) => {
            const res = await api.post(`/projects/${projectId}/issues`, data);
            return res.data.data as IIssueWithRelations;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["backlog-grouped", projectId] });
            qc.invalidateQueries({ queryKey: ["board", projectId] });
        }
    });
}

export function useIssueById(issueId: string) {
    return useQuery<IIssueWithRelations>({
        queryKey: ["issue", issueId],
        queryFn: async () => {
            const res = await api.get(`/issues/${issueId}`);
            return res.data.data;
        },
        enabled: !!issueId,
    });
}

export function useUpdateIssue(issueId: string, projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: UpdateIssueInput) => {
            const res = await api.patch(`/issues/${issueId}`, data);
            return res.data.data as IIssueWithRelations;
        },
        onSuccess: async () => {
            await qc.refetchQueries({ queryKey: ["activities", issueId] });
            qc.invalidateQueries({ queryKey: ["issue", issueId] });
            qc.invalidateQueries({ queryKey: ["board", projectId] });
            qc.invalidateQueries({ queryKey: ["backlog-grouped", projectId] });
        },
    });
}

export function useProjectSprints(projectId: string) {
    return useQuery<ISprint[]>({
        queryKey: ["sprints", projectId],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/sprints`);
            return res.data.data;
        },
        enabled: !!projectId,
    });
}

export function useProjectMembers(projectId: string) {
    return useQuery<IProjectMember[]>({
        queryKey: ["project-members", projectId],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/members`);
            return res.data.data;
        },
        enabled: !!projectId,
    });
}

export function useIssueActivities(issueId: string) {
    return useQuery({
        queryKey: ["activities", issueId],
        queryFn: async () => {
            const res = await api.get(`/issues/${issueId}/activities`);
            return res.data.data;
        },
        enabled: !!issueId,
    });
}

export function useCreateSubIssue(parentId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateIssueInput) => {
            const res = await api.post(`/issues/${parentId}/children`, data);
            return res.data.data as IIssueWithRelations;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["issue", parentId] });
        },
    });
}

export function useAttachChildIssue(parentId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (issueId: string) => {
            const res = await api.post(`/issues/${parentId}/children/attach`, { issueId });
            return res.data.data as IIssueWithRelations;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["issue", parentId] });
        },
    });
}

export function useDetachChildIssue(parentId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (childId: string) => {
            const res = await api.delete(`/issues/${parentId}/children/${childId}`);
            return res.data.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["issue", parentId] });
        },
    });
}

export interface IIssueSearchResult {
    id: string;
    title: string;
    status: string;
    type: string;
    priority: string;
}

export function useSearchProjectIssues(
    projectId: string,
    query: string,
    options?: { excludeId?: string; mode?: "child"; enabled?: boolean }
) {
    return useQuery<IIssueSearchResult[]>({
        queryKey: ["issue-search", projectId, query, options?.excludeId, options?.mode],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/issues/search`, {
                params: { q: query || undefined, excludeId: options?.excludeId, mode: options?.mode },
            });
            return res.data.data;
        },
        enabled: !!projectId && (options?.enabled ?? true),
    });
}