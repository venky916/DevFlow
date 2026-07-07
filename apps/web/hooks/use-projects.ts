import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { CreateProjectInput, UpdateProjectInput } from "@devflow/validators";
import type { IProjectWithMembers } from "@devflow/types";

// workspaceId at hook level — you're always fetching projects FOR a workspace
export function useProjects(workspaceId: string) {
    return useQuery<IProjectWithMembers[]>({
        queryKey: ["projects", workspaceId],
        queryFn: async () => {
            const res = await api.get(`/workspaces/${workspaceId}/projects`);
            return res.data.data;
        },
        enabled: !!workspaceId,
    });
}

// workspaceId at hook level — tied to which workspace you're creating in
export function useCreateProject(workspaceId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateProjectInput) => {
            const res = await api.post(`/workspaces/${workspaceId}/projects`, data);
            return res.data.data as IProjectWithMembers;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", workspaceId] }),
    });
}

// projectId at hook level — you always know which project you're editing
export function useUpdateProject(projectId: string, workspaceId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: UpdateProjectInput) => {
            const res = await api.patch(`/projects/${projectId}`, data);
            return res.data.data as IProjectWithMembers;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", workspaceId] }),
    });
}

// projectId at hook level — same reasoning
export function useDeleteProject(projectId: string, workspaceId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await api.delete(`/projects/${projectId}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", workspaceId] }),
    });
}


// ─── full project detail — richer than the list version above ─────
// matches getProjectById's include: members, sprints (with issue counts), _count
export interface IProjectDetail {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    color: string;
    createdAt: string;
    members: {
        userId: string;
        role: string;
        user: { id: string; name: string | null; email: string; avatarUrl: string | null };
    }[];
    sprints: {
        id: string;
        name: string;
        status: string;
        createdAt: string;
        _count: { issues: number };
        issues: string[]; // done-issue ids, per getProjectById's mapping
    }[];
    _count: { issues: number; sprints: number; members: number };
}

export function useProjectById(projectId: string) {
    return useQuery<IProjectDetail>({
        queryKey: ["project", projectId],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}`);
            return res.data.data;
        },
        enabled: !!projectId,
    });
}

export interface IActivityLog {
    id: string;
    action: string;
    createdAt: string;
    user: { id: string; name: string | null; avatarUrl: string | null } | null;
    issue?: { id: string; title: string } | null;
    meta?: Record<string, unknown>;
}

// scope=PROJECT only, last 50 — matches getProjectActivities.
// getAllProjectActivities (scope=all, last 100) exists on the backend
// too, but isn't wired to any page yet — add useAllProjectActivities
// later if a page actually needs the combined issue+project feed.
export function useProjectActivities(projectId: string) {
    return useQuery<IActivityLog[]>({
        queryKey: ["project-activities", projectId],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/activities`);
            return res.data.data;
        },
        enabled: !!projectId,
    });
}