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
        onSuccess: () => qc.invalidateQueries({ queryKey: ["board", projectId] }),
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
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["issue", issueId] });
            qc.invalidateQueries({ queryKey: ["board", projectId] });
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