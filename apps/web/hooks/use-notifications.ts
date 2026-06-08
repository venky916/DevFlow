"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { NotificationType } from "@devflow/types";

export interface INotification {
    id: string;
    content: string;
    type: NotificationType;
    link: string | null;
    isRead: boolean;
    triggeredBy: string | null;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

interface NotificationsResponse {
    notifications: INotification[];
    unreadCount: number;
}

// ─── GET /notifications ───────────────────────────────────────────
export function useNotifications() {
    return useQuery<NotificationsResponse>({
        queryKey: ["notifications"],
        queryFn: async () => {
            const res = await api.get("/notifications");
            return res.data.data;
        },
    });
}

// ─── PATCH /notifications/:id/read ───────────────────────────────
export function useMarkAsRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/notifications/${id}/read`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    });
}

// ─── PATCH /notifications/read-all ───────────────────────────────
export function useMarkAllAsRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await api.patch("/notifications/read-all");
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    });
}

// ─── DELETE /notifications ────────────────────────────────────────
export function useClearReadNotifications() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await api.delete("/notifications");
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    });
}

// ─── DELETE /notifications/:id ────────────────────────────────────
export function useDeleteNotification() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/notifications/${id}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    });
}