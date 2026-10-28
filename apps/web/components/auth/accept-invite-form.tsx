'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@devflow/ui/components/button';

import { ROUTES } from '../../constants/routes';
import { useAcceptInvite } from '../../hooks/use-auth';
import { useAuthStore } from '../../stores/auth.store';
import { AuthHeader } from './auth-header';
import { AuthStatus } from './auth-status';

export function AcceptInviteForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const user = useAuthStore((s) => s.user);
  const { mutate: acceptInvite, isPending } = useAcceptInvite();

  if (!token) {
    return (
      <AuthStatus
        title="Invalid invite"
        description="This invite link is invalid or has expired."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <AuthHeader
        title="You're invited!"
        description="You've been invited to join a workspace on DevFlow"
      />

      {user ? (
        <Button
          size="xl"
          className="w-full"
          onClick={() => acceptInvite(token)}
          loading={isPending}
        >
          Accept invite
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-text-muted">Sign in to accept this invite</p>
          <Button
            size="xl"
            className="w-full"
            onClick={() =>
              router.push(
                `${ROUTES.signIn}?redirect=${encodeURIComponent(`${ROUTES.invite}?token=${token}`)}`,
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
