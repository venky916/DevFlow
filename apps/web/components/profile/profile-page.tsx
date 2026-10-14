"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

import { ImageUploadButton } from "@devflow/ui/components/image-upload-button";
import { Select } from "@devflow/ui/components/select";
import { Spinner } from "@devflow/ui/components/spinner";

import {
  useMyProfile,
  useUpdateProfile,
  useUploadAvatar,
} from "../../hooks/use-user";
import { PageContainer } from "../shared/page-container";
import {PageError} from "../shared/page-error";
import { PageHeading } from "../shared/page-heading";
import {PageLoading} from "../shared/page-loading";

const TIMEZONE_OPTIONS = [
  { label: "Asia/Kolkata (IST)", value: "Asia/Kolkata" },
  { label: "UTC", value: "UTC" },
  { label: "America/New_York (ET)", value: "America/New_York" },
  { label: "America/Los_Angeles (PT)", value: "America/Los_Angeles" },
  { label: "Europe/London (GMT)", value: "Europe/London" },
];

export function ProfilePage() {
  const { data: profile, isLoading, isError, refetch } = useMyProfile();
  const { mutate: updateProfile, isPending: saving } = useUpdateProfile();
  const { uploadAvatar, isUploading } = useUploadAvatar();
  const [draftName, setDraftName] = useState<string | null>(null);

  if (isLoading) return <PageLoading />;
  if (isError || !profile) {
    return (
      <PageError
        message="Couldn't load your profile"
        onRetry={() => refetch()}
      />
    );
  }

  // draftName is null until the user types, so no useEffect is needed to copy profile.name
  const name = draftName ?? profile.name ?? "";

  const saveName = () => {
    const trimmed = name.trim();
    if (trimmed === (profile.name ?? "")) return;
    updateProfile({ name: trimmed }, { onSettled: () => setDraftName(null) });
  };

  return (
    <PageContainer size="narrow">
      <PageHeading title="Profile" />

      <div className="flex flex-col gap-4 rounded-md border border-border-default p-5">
        <div className="flex items-center gap-4">
          <ImageUploadButton
            src={profile.avatarUrl}
            fallbackLabel={(profile.name ?? profile.email)
              .charAt(0)
              .toUpperCase()}
            shape="circle"
            size={40}
            isUploading={isUploading}
            onFileSelect={uploadAvatar}
          />
          <div className="flex flex-col gap-0.5">
            <p className="text-body font-semibold text-text-primary">
              {profile.name ?? "Unnamed"}
            </p>
            <p className="text-xs text-text-muted">{profile.email}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border-default pt-4">
          <label className="font-mono text-2xs tracking-wider text-text-muted uppercase">
            Display name
          </label>
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={saveName}
              className="flex-1 rounded-base border border-border-default bg-bg-surface px-3 py-2 text-body text-text-primary transition-colors focus:border-border-emphasis focus:outline-none"
            />
            {saving && <Spinner size="sm" />}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border-default p-5">
        <p className="font-mono text-2xs tracking-wider text-text-muted uppercase">
          Account
        </p>
        <div className="flex items-center justify-between text-body">
          <span className="text-text-muted">Email</span>
          <span className="text-text-primary">{profile.email}</span>
        </div>
        <div className="flex items-center justify-between text-body">
          <span className="text-text-muted">Timezone</span>
          <Select
            options={TIMEZONE_OPTIONS}
            value={profile.timezone}
            onValueChange={(timezone) => updateProfile({ timezone })}
          />
        </div>
        <div className="flex items-center justify-between text-body">
          <span className="text-text-muted">Member since</span>
          <span className="text-text-primary">
            {formatDistanceToNow(new Date(profile.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </PageContainer>
  );
}
