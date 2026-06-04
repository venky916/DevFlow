import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {IUser} from "@devflow/types"; 

interface AuthState {
    user: IUser | null;
    isLoading: boolean;
    setUser: (user: IUser) => void;
    clearAuth: () => void;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isLoading: true,
            setUser: (user) => set({ user }),
            clearAuth: () => set({ user: null }),
            setLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: "devflow-auth",
            partialize: (state) => ({ user: state.user }),
        }
    )
);