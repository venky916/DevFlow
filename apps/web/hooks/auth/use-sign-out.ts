'use client';

import { useRouter } from 'next/navigation';

import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../stores/auth.store';

export function useSignOut() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return async function signOut() {
    await auth.signOut();
    clearAuth();
    router.push('/sign-in');
  };
}
