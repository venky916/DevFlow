import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, signInWithPopup, updateProfile } from "firebase/auth"
import { auth, googleProvider, githubProvider } from "./firebase";
import { api } from "./axios"
import { useAuthStore } from "../stores/auth.store";

// after firebase signin → get user from our backend
async function syncWithBackend() {
    // api.ts interceptor auto attaches firebase token
    const res = await api.get("/auth/me");
    const user = res.data.user;
    useAuthStore.getState().setUser(user);
    return user;
}

export async function signInWithEmail(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
    return syncWithBackend();
}


export async function signUpWithEmail(email: string, password: string, name: string) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
    return syncWithBackend();
}


export async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider);
    return syncWithBackend();
}

export async function signInWithGithub() {
    await signInWithPopup(auth, githubProvider);
    return syncWithBackend();
}

export async function signOut() {
    await firebaseSignOut(auth);
    useAuthStore.getState().clearAuth();
}
