"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { WorkspaceRole } from "@devflow/types";

export interface IWorkspaceInvite {
    id: string;
    email: string;
    role: WorkspaceRole;
    expiresAt: string;
    createdAt: string;
    inviter?: {
        id: string;
        name: string | null;
        email: string;
    };
}

// ─── Members ──────────────────────────────────────────────────────
export function useWorkspaceMembers(workspaceId: string) {
    return useQuery({
        queryKey: ["workspace-members", workspaceId],
        queryFn: async () => {
            const res = await api.get(`/workspaces/${workspaceId}/members`);
            return res.data.data;
        },
        enabled: !!workspaceId,
    });
}

export function useUpdateMemberRole(workspaceId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: WorkspaceRole }) => {
            const res = await api.put(`/workspaces/${workspaceId}/members/${userId}`, { role });
            return res.data.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
            qc.invalidateQueries({ queryKey: ["workspaces"] });
        },
    });
}

export function useRemoveMember(workspaceId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (userId: string) => {
            await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
            qc.invalidateQueries({ queryKey: ["workspaces"] });
        },
    });
}

// ─── Invites ──────────────────────────────────────────────────────
export function useWorkspaceInvites(workspaceId: string) {
    return useQuery<IWorkspaceInvite[]>({
        queryKey: ["workspace-invites", workspaceId],
        queryFn: async () => {
            const res = await api.get(`/workspaces/${workspaceId}/invites`);
            return res.data.data;
        },
        enabled: !!workspaceId,
    });
}

export function useCreateInvite(workspaceId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ email, role }: { email: string; role: WorkspaceRole }) => {
            const res = await api.post(`/workspaces/${workspaceId}/invites`, { email, role });
            return res.data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-invites", workspaceId] }),
    });
}

export function useCancelInvite(workspaceId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (inviteId: string) => {
            await api.delete(`/workspaces/${workspaceId}/invites/${inviteId}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-invites", workspaceId] }),
    });
}