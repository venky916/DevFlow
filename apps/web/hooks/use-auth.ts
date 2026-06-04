"use client"

import { useEffect } from "react"
import { useAuthStore } from "../stores/auth.store"
import { api } from "../lib/axios";

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