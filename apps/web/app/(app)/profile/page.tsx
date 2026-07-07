"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Spinner } from "@devflow/ui/components/spinner";
import { Avatar } from "@devflow/ui/components/avatar";
import { Select } from "@devflow/ui/components/select";
import { useMyProfile, useUpdateProfile } from "../../../hooks/use-user";

const TIMEZONE_OPTIONS = [
  { label: "Asia/Kolkata (IST)", value: "Asia/Kolkata" },
  { label: "UTC", value: "UTC" },
  { label: "America/New_York (ET)", value: "America/New_York" },
  { label: "America/Los_Angeles (PT)", value: "America/Los_Angeles" },
  { label: "Europe/London (GMT)", value: "Europe/London" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();

  const { data: profile, isLoading } = useMyProfile();
  const { mutateAsync: updateProfile, isPending: saving } = useUpdateProfile();

  const [name, setName] = useState("");

  useEffect(() => {
    if (profile) setName(profile.name ?? "");
  }, [profile?.id]);

  const saveName = async () => {
    if (!profile || name.trim() === (profile.name ?? "")) return;
    try {
      await updateProfile({ name: name.trim() });
      toast.success("Name updated");
    } catch {
      toast.error("Failed to update name");
      setName(profile.name ?? "");
    }
  };

  const saveTimezone = async (timezone: string) => {
    try {
      await updateProfile({ timezone });
      toast.success("Timezone updated");
    } catch {
      toast.error("Failed to update timezone");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-8 max-w-[480px] flex flex-col gap-4">
      <button
        onClick={() => router.push(`/${workspaceSlug}`)}
        className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {/* identity card — name is the only editable field here, avatarUrl
          click is stubbed pending the B2 presigned-upload flow */}
      <div className="rounded-[6px] border border-border-default p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() =>
              toast(
                "Avatar upload wiring pending — TODO: hook into B2 presigned upload flow",
              )
            }
            className="relative"
          >
            <Avatar
              name={profile.name ?? profile.email}
              size="lg"
              src={profile.avatarUrl ?? undefined}
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-bg-surface border border-border-default flex items-center justify-center">
              <Pencil className="h-2.5 w-2.5 text-text-muted" />
            </span>
          </button>
          <div>
            <p className="text-[15px] font-semibold text-text-primary">
              {profile.name ?? "Unnamed"}
            </p>
            <p className="text-[12px] text-text-muted">{profile.email}</p>
          </div>
        </div>

        <div className="border-t border-border-default pt-3.5 flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted">
            Display name
          </label>
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              className="flex-1 bg-bg-surface border border-border-default rounded-[4px] px-3 py-1.5 text-[13px] text-text-primary focus:outline-none focus:border-border-emphasis transition-colors"
            />
            {saving && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />
            )}
          </div>
        </div>
      </div>

      {/* account card — read-only email, editable timezone, member-since */}
      <div className="rounded-[6px] border border-border-default p-5 flex flex-col gap-3">
        <p className="text-[11px] uppercase tracking-[0.04em] font-mono text-text-muted">
          Account
        </p>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-text-muted">Email</span>
          <span className="text-text-primary">{profile.email}</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-text-muted">Timezone</span>
          <Select
            options={TIMEZONE_OPTIONS}
            value={profile.timezone ?? "Asia/Kolkata"}
            onValueChange={saveTimezone}
          />
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-text-muted">Member since</span>
          <span className="text-text-primary">
            {formatDistanceToNow(new Date(profile.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
