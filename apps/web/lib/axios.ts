import axios from "axios"
import { auth } from "./firebase"

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: { "Content-Type": "application/json" },
})

// attach fresh firebase token on every request
api.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken(); // auto refreshes if expired
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config
})
