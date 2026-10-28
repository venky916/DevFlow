'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { IAcceptedInvite, IApiResponse, IUser } from '@devflow/types';
import type { ForgotPasswordInput, SignInInput, SignUpInput } from '@devflow/validators';

import { ROUTES } from '../constants/routes';
import {
  confirmReset,
  sendResetEmail,
  signInWithEmail,
  signInWithGithub,
  signInWithGoogle,
  signOut as signOutUser,
  signUpWithEmail,
  verifyResetCode,
} from '../lib/auth';
import { getAuthErrorMessage } from '../lib/auth-errors';
import { api } from '../lib/axios';
import { getSafeRedirect } from '../lib/redirect';
import { useAuthStore } from '../stores/auth.store';

// ─── Current user ─────────────────────────────────────────────

export function useAuth() {
  const { user, setUser, clearAuth, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    if (user) return;

    const fetchUser = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<IApiResponse<IUser>>('/users/me');
        setUser(data.data);
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, isLoading };
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<IApiResponse<IUser>>('/users/me');
      return res.data.data;
    },
  });
}

// ─── Redirect after auth ──────────────────────────────────────

export function useAuthRedirect(fallback: string = ROUTES.workspaces) {
  const searchParams = useSearchParams();
  const safeRedirect = getSafeRedirect(searchParams.get('redirect'), '');

  return {
    redirectTo: safeRedirect || fallback,
    redirectQuery: safeRedirect ? `?redirect=${encodeURIComponent(safeRedirect)}` : '',
  };
}

// ─── Guard for app pages ──────────────────────────────────────
// Sends signed-out users to sign-in and remembers the page they wanted.
// After sign-in, useAuthRedirect reads ?redirect= and brings them back.

export function useAuthGuard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || user) return;

    // read the query string here, because useSearchParams in a layout needs a Suspense boundary
    const target = pathname + window.location.search;
    router.replace(`${ROUTES.signIn}?redirect=${encodeURIComponent(target)}`);
  }, [isLoading, user, router, pathname]);

  return { isReady: !isLoading && !!user };
}

// ─── Sign in / sign up ────────────────────────────────────────

export function useSignIn() {
  const router = useRouter();
  const { redirectTo } = useAuthRedirect();

  return useMutation({
    mutationFn: (input: SignInInput) => signInWithEmail(input.email, input.password),
    onSuccess: () => {
      toast.success('Welcome back!');
      router.push(redirectTo);
    },
    onError: (err) => {
      const message = getAuthErrorMessage(err, 'Sign in failed');
      if (message) toast.error(message);
    },
  });
}

export function useSignUp() {
  const router = useRouter();
  const { redirectTo } = useAuthRedirect();

  return useMutation({
    mutationFn: (input: SignUpInput) => signUpWithEmail(input.email, input.password, input.name),
    onSuccess: () => {
      toast.success('Account created!');
      router.push(redirectTo);
    },
    onError: (err) => {
      const message = getAuthErrorMessage(err, 'Sign up failed');
      if (message) toast.error(message);
    },
  });
}

// ─── Google / GitHub ──────────────────────────────────────────

type OAuthProvider = 'google' | 'github';

const OAUTH_PROVIDERS = {
  google: { label: 'Google', signIn: signInWithGoogle },
  github: { label: 'GitHub', signIn: signInWithGithub },
} as const;

export function useOAuthSignIn(successMessage: string) {
  const router = useRouter();
  const { redirectTo } = useAuthRedirect();

  const mutation = useMutation({
    mutationFn: (provider: OAuthProvider) => OAUTH_PROVIDERS[provider].signIn(),
    onSuccess: () => {
      toast.success(successMessage);
      router.push(redirectTo);
    },
    onError: (err, provider) => {
      const message = getAuthErrorMessage(err, `${OAUTH_PROVIDERS[provider].label} sign in failed`);
      if (message) toast.error(message);
    },
  });

  return {
    signIn: mutation.mutate,
    loadingProvider: mutation.isPending ? (mutation.variables ?? null) : null,
  };
}

// ─── Forgot / reset password ──────────────────────────────────

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (input: ForgotPasswordInput) => {
      try {
        await sendResetEmail(input.email);
      } catch (err) {
        // swallow on purpose: never reveal whether the email exists
        console.error(err);
      }
    },
  });
}

export function useVerifyResetCode(oobCode: string | null) {
  return useQuery({
    queryKey: ['verify-reset-code', oobCode],
    queryFn: () => verifyResetCode(oobCode as string),
    enabled: !!oobCode,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: (input: { oobCode: string; password: string }) =>
      confirmReset(input.oobCode, input.password),
    onSuccess: () => {
      toast.success('Password updated. Please sign in.');
      router.push(ROUTES.signIn);
    },
    onError: (err) => {
      const message = getAuthErrorMessage(err, 'Reset failed');
      if (message) toast.error(message);
    },
  });
}

export function useAcceptInvite() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (token: string) => {
      const res = await api.post<IApiResponse<IAcceptedInvite>>('/invites/accept', { token });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("You've joined the workspace!");
      router.push(ROUTES.workspaces);
    },
    onError: (err) => {
      const message = getAuthErrorMessage(err, 'Failed to accept invite');
      if (message) toast.error(message);
    },
  });
}

// ─── Sign out ─────────────────────────────────────────────────

export function useSignOut() {
  const router = useRouter();

  return async function signOut() {
    await signOutUser();
    router.push(ROUTES.signIn);
  };
}
