'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { ImageUploadButton } from '@devflow/ui/components/image-upload-button';
import { Select } from '@devflow/ui/components/select';

import { useAvatarUpload } from '../../hooks/use-avatar-upload';
import { useMyProfile, useUpdateProfile } from '../../hooks/use-user';
import PageError from '../shared/page-error';
import PageLoading from '../shared/page-loading';

const TIMEZONE_OPTIONS = [
  { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
  { label: 'UTC', value: 'UTC' },
  { label: 'America/New_York (ET)', value: 'America/New_York' },
  { label: 'America/Los_Angeles (PT)', value: 'America/Los_Angeles' },
  { label: 'Europe/London (GMT)', value: 'Europe/London' },
];

export function ProfilePage() {
  const { data: profile, isLoading, isError, refetch } = useMyProfile();
  const { mutateAsync: updateProfile, isPending: saving } = useUpdateProfile();
  const { uploadAvatar, isUploading } = useAvatarUpload();

  const [name, setName] = useState('');

  useEffect(() => {
    if (profile) setName(profile.name ?? '');
  }, [profile?.id]);

  const saveName = async () => {
    if (!profile || name.trim() === (profile.name ?? '')) return;
    try {
      await updateProfile({ name: name.trim() });
      toast.success('Name updated');
    } catch {
      toast.error('Failed to update name');
      setName(profile.name ?? '');
    }
  };

  const saveTimezone = async (timezone: string) => {
    try {
      await updateProfile({ timezone });
      toast.success('Timezone updated');
    } catch {
      toast.error('Failed to update timezone');
    }
  };

  const handleAvatarSelect = async (file: File) => {
    try {
      await uploadAvatar(file);
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload avatar');
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (isError || !profile) {
    return <PageError message="Couldn't load your profile" onRetry={() => refetch()} />;
  }

  return (
    <div className="flex max-w-[480px] flex-1 flex-col gap-4 overflow-auto p-8">
      <div className="flex flex-col gap-4 rounded-[6px] border border-border-default p-5">
        <div className="flex items-center gap-3.5">
          <ImageUploadButton
            src={profile.avatarUrl ?? null}
            fallbackLabel={(profile.name ?? profile.email).charAt(0).toUpperCase()}
            shape="circle"
            size={40}
            isUploading={isUploading}
            onFileSelect={handleAvatarSelect}
          />
          <div>
            <p className="text-[15px] font-semibold text-text-primary">
              {profile.name ?? 'Unnamed'}
            </p>
            <p className="text-[12px] text-text-muted">{profile.email}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border-default pt-3.5">
          <label className="font-mono text-[11px] tracking-[0.04em] text-text-muted uppercase">
            Display name
          </label>
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              className="flex-1 rounded-[4px] border border-border-default bg-bg-surface px-3 py-1.5 text-[13px] text-text-primary transition-colors focus:border-border-emphasis focus:outline-none"
            />
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[6px] border border-border-default p-5">
        <p className="font-mono text-[11px] tracking-[0.04em] text-text-muted uppercase">Account</p>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-text-muted">Email</span>
          <span className="text-text-primary">{profile.email}</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-text-muted">Timezone</span>
          <Select
            options={TIMEZONE_OPTIONS}
            value={profile.timezone ?? 'Asia/Kolkata'}
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
