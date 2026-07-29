import axios from "axios"
import { auth } from "./firebase"
import { signOut } from "./auth";

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: { "Content-Type": "application/json" },
})

// attach fresh firebase token on every request
api.interceptors.request.use(async (config) => {
    try {
        // wait for firebase auth to be ready
        await auth.authStateReady();
        const user = auth.currentUser;
        if (user) {
            const token = await user.getIdToken();
            console.log("[axios] token:", token);
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (err) {
        console.error("[axios] token error:", err);
    }
    return config;
})


api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.data?.code === "SESSION_EXPIRED") {
            await signOut();
            const redirect = window.location.pathname;
            window.location.href = `/sign-in?redirect=${encodeURIComponent(redirect)}`;
        }
        return Promise.reject(error);
    }
);
