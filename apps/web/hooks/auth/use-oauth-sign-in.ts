import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signInWithGoogle, signInWithGithub } from "../../lib/auth";

export function useOAuthSignIn(redirectTo: string, successMessage: string) {
    const router = useRouter();
    const [loading, setLoading] = useState<"google" | "github" | null>(null);

    async function withProvider(provider: "google" | "github") {
        const fn = provider === "google" ? signInWithGoogle : signInWithGithub;
        try {
            setLoading(provider);
            await fn();
            toast.success(successMessage);
            router.push(redirectTo);
        } catch (err: any) {
            toast.error(err.message ?? `${provider === "google" ? "Google" : "GitHub"} sign in failed`);
        } finally {
            setLoading(null);
        }
    }

    return {
        googleLoading: loading === "google",
        githubLoading: loading === "github",
        signInWithGoogle: () => withProvider("google"),
        signInWithGithub: () => withProvider("github"),
    };
}