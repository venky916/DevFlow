"use client";

import { useEffect, useState } from "react";
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
  const [info, setInfo] = useState<{ workspaceName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .get(`/invites/info?token=${token}`)
      .then((res) => setInfo(res.data.data))
      .catch(() => toast.error("Invalid or expired invite link"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      router.push(`/sign-in?redirect=/invite?token=${token}`);
      return;
    }
    try {
      setAccepting(true);
      await api.post("/invites/accept", { token });
      toast.success("You've joined the workspace!");
      router.push("/workspaces");
    } catch {
      toast.error("Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
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
          Join{" "}
          <span className="text-text-primary font-medium">
            {info?.workspaceName}
          </span>{" "}
          on DevFlow
        </p>
      </div>
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
      {!user && (
        <p className="text-[12px] text-text-muted">
          You'll be asked to sign in first.
        </p>
      )}
    </div>
  );
}
