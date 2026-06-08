"use client"

import { useEffect } from "react"
import { useAuthStore } from "../stores/auth.store"
import { api } from "../lib/axios";
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
    const { user, setUser, clearAuth, setLoading, isLoading } = useAuthStore();

    useEffect(() => {
        if (user) return

        const fetchUser = async () => {
            setLoading(true);
            try {
                const { data } = await api.get("/auth/me");
                setUser(data.user);
            } catch {
                clearAuth();
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    return { user, isLoading }
}

export function useMe() {
    return useQuery({
        queryKey: ["me"],
        queryFn: async () => {
            const res = await api.get("/users/me");
            return res.data.data;
        },
    });
}