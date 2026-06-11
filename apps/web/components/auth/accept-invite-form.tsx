"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { api } from "../../lib/axios";
import { useAuthStore } from "../../stores/auth.store";

export function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const user = useAuthStore((s) => s.user);
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    try {
      setAccepting(true);
      await api.post("/invites/accept", { token });
      toast.success("You've joined the workspace!");
      router.push("/workspaces");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="h-10 w-10 rounded-[4px] bg-accent flex items-center justify-center">
          <span className="text-accent-text font-bold text-lg font-mono">
            D
          </span>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Invalid invite
          </h1>
          <p className="text-sm text-text-muted mt-1">
            This invite link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="h-10 w-10 rounded-[4px] bg-accent flex items-center justify-center">
        <span className="text-accent-text font-bold text-lg font-mono">D</span>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          You're invited!
        </h1>
        <p className="text-sm text-text-muted mt-1">
          You've been invited to join a workspace on DevFlow
        </p>
      </div>

      {user ? (
        <Button
          variant="primary"
          className="w-full"
          onClick={handleAccept}
          disabled={accepting}
        >
          {accepting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Accept invite"
          )}
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full">
          <p className="text-sm text-text-muted">
            Sign in to accept this invite
          </p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() =>
              router.push(
                `/sign-in?redirect=${encodeURIComponent(`/invite?token=${token}`)}`,
              )
            }
          >
            Sign in
          </Button>
        </div>
      )}
    </div>
  );
}
