'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@devflow/ui/components/button';
import { Input } from '@devflow/ui/components/input';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@devflow/validators';

import { ROUTES } from '../../constants/routes';
import { useForgotPassword } from '../../hooks/use-auth';
import { AuthFooterLink } from './auth-footer-link';
import { AuthHeader } from './auth-header';
import { AuthStatus } from './auth-status';

export function ForgotPasswordForm() {
  const { mutate: sendLink, isPending, isSuccess } = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  if (isSuccess) {
    return (
      <AuthStatus
        title="Check your email"
        description="If an account exists for that email, we've sent a link to reset your password."
        action={{ label: 'Back to sign in', href: ROUTES.signIn }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <AuthHeader
        title="Reset your password"
        description="Enter your email and we'll send you a reset link."
      />

      <form onSubmit={handleSubmit((data) => sendLink(data))} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" size="xl" loading={isPending} className="w-full">
          Send reset link
        </Button>
      </form>

      <AuthFooterLink text="Remember your password?" label="Sign in" href={ROUTES.signIn} />
    </div>
  );
}
