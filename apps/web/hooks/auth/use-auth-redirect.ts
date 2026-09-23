import { useSearchParams } from "next/navigation";

export function useAuthRedirect(fallback = "/workspaces") {
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect");
    return {
        redirectTo: redirect ?? fallback,
        redirectQuery: redirect ? `?redirect=${encodeURIComponent(redirect)}` : "",
    };
}