'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ShieldOff } from 'lucide-react';

import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../stores/auth.store';

type Reason = 'not-a-member' | 'insufficient-role' | 'no-projects';

const REASON_CONFIG: Record<Reason, { title: string; message: string; actionLabel: string }> = {
  'not-a-member': {
    title: 'No access to this workspace',
    message:
      "You don't have access to this workspace. Ask an admin to invite you, or switch to one you belong to.",
    actionLabel: 'Go to My Workspaces',
  },
  'insufficient-role': {
    title: "You don't have permission",
    message:
      "You don't have permission to view this page. Contact a workspace admin if you think this is a mistake.",
    actionLabel: 'Go to Workspace',
  },
  'no-projects': {
    title: 'No projects assigned',
    message:
      "You haven't been added to any project yet. Contact your workspace admin to get access.",
    actionLabel: 'Sign out',
  },
};

export function NoAccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceSlug } = useParams<{ workspaceSlug?: string }>();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const reason = (searchParams.get('reason') as Reason) ?? 'no-projects';
  const config = REASON_CONFIG[reason];

  async function handleSignOut() {
    await auth.signOut();
    clearAuth();
    router.push('/sign-in');
  }

  function handleAction() {
    if (reason === 'not-a-member') {
      router.push('/workspaces');
    } else if (reason === 'insufficient-role') {
      const ws = searchParams.get('workspace');
      router.push(ws ? `/${ws}` : '/workspaces');
    } else {
      handleSignOut();
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg-app">
      <div className="flex max-w-sm flex-col items-center gap-4 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-hover">
          <ShieldOff className="h-6 w-6 text-text-muted" />
        </div>
        <div>
          <h1 className="mb-1 text-[16px] font-semibold text-text-primary">{config.title}</h1>
          <p className="text-[13px] leading-relaxed text-text-muted">{config.message}</p>
        </div>
        <button
          onClick={handleAction}
          className="text-[13px] text-text-muted underline underline-offset-2 transition-colors hover:text-text-primary"
        >
          {config.actionLabel}
        </button>
      </div>
    </div>
  );
}
