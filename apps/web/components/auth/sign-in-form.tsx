'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@devflow/ui/components/button';
import { Input } from '@devflow/ui/components/input';
import { signInSchema, type SignInForm } from '@devflow/validators';

import { useAuthRedirect } from '../../hooks/auth/use-auth-redirect';
import { useOAuthSignIn } from '../../hooks/auth/use-oauth-sign-in';
import { GithubIcon, GoogleIcon } from '../../icons';
import { signInWithEmail } from '../../lib/auth';
import { Logo } from '../shared/logo';

export function SignInForm() {
  const router = useRouter();
  const { redirectTo, redirectQuery } = useAuthRedirect();
  const { googleLoading, githubLoading, signInWithGoogle, signInWithGithub } = useOAuthSignIn(
    redirectTo,
    'Welcome back!',
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({ resolver: zodResolver(signInSchema) });

  const onSubmit = async (data: SignInForm) => {
    try {
      await signInWithEmail(data.email, data.password);
      toast.success('Welcome back!');
      router.push(redirectTo);
    } catch (err: any) {
      toast.error(err.message ?? 'Sign in failed');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2">
        <Logo />
        <h1 className="text-xl font-semibold text-text-primary">Sign in to DevFlow</h1>
        <p className="text-sm text-text-muted">Welcome back. Let's get you moving.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          className="h-10 w-full"
          onClick={signInWithGoogle}
          disabled={googleLoading}
        >
          <span className="mr-3">
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          </span>
          <span className={googleLoading ? 'opacity-70' : ''}>Continue with Google</span>
        </Button>
        <Button
          variant="secondary"
          className="h-10 w-full"
          onClick={signInWithGithub}
          disabled={githubLoading}
        >
          <span className="mr-3">
            {githubLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GithubIcon />}
          </span>
          <span className={githubLoading ? 'opacity-70' : ''}>Continue with GitHub</span>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-default" />
        <span className="text-xs tracking-wider text-text-disabled uppercase">or</span>
        <div className="h-px flex-1 bg-border-default" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <Link
          href="/forgot-password"
          className="-mt-2 self-end text-xs text-accent transition-colors hover:text-accent-hover"
        >
          Forgot password?
        </Link>
        <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted">
        Don't have an account?{' '}
        <Link
          href={`/sign-up${redirectQuery}`}
          className="text-accent transition-colors hover:text-accent-hover"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
