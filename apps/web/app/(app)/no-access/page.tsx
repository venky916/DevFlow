"use client";

import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { useAuthStore } from "../../../stores/auth.store";
import { auth } from "../../../lib/firebase";

export default function NoAccessPage() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  async function handleSignOut() {
    await auth.signOut();
    clearAuth();
    localStorage.removeItem("lastWorkspaceSlug");
    localStorage.removeItem("lastProjectSlug");
    router.push("/sign-in");
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg-app">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
        <div className="h-12 w-12 rounded-full bg-bg-hover flex items-center justify-center">
          <ShieldOff className="h-6 w-6 text-text-muted" />
        </div>
        <div>
          <h1 className="text-[16px] font-semibold text-text-primary mb-1">
            No projects assigned
          </h1>
          <p className="text-[13px] text-text-muted leading-relaxed">
            You haven't been added to any project yet. Contact your workspace
            admin to get access.
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-[13px] text-text-muted hover:text-text-primary transition-colors underline underline-offset-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
