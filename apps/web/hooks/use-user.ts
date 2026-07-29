import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";
import type { UpdateProfileInput } from "@devflow/validators";

export interface IMyProfile {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    createdAt: string;
    timezone: string | null;
}

export function useMyProfile() {
    return useQuery<IMyProfile>({
        queryKey: ["me"],
        queryFn: async () => {
            const res = await api.get("/users/me");
            return res.data.data;
        },
    });
}

export function useUpdateProfile() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: UpdateProfileInput) => {
            const res = await api.patch("/users/me", data);
            return res.data.data as IMyProfile;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
    });
}

export function useUpdateAvatar() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (avatarUrl: string) => {
            const res = await api.patch("/users/me/avatar", { avatarUrl }); // ⚠️ verify against router — file shows "/user/me/avatar" singular
            return res.data.data as IMyProfile;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
    });
}