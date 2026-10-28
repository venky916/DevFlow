'use client';

import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@devflow/ui/components/button';
import { Input } from '@devflow/ui/components/input';
import { Spinner } from '@devflow/ui/components/spinner';
import { resetPasswordSchema, type ResetPasswordInput } from '@devflow/validators';

import { ROUTES } from '../../constants/routes';
import { useResetPassword, useVerifyResetCode } from '../../hooks/use-auth';
import { AuthHeader } from './auth-header';
import { AuthStatus } from './auth-status';
import { PasswordRequirements } from './password-requirements';

export function ResetPasswordForm() {
  const oobCode = useSearchParams().get('oobCode');
  const { isPending: isChecking, isError: isInvalid } = useVerifyResetCode(oobCode);
  const { mutate: resetPassword, isPending } = useResetPassword();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!oobCode || isInvalid) {
    return (
      <AuthStatus
        title="Link expired"
        description="This reset link is invalid or has expired."
        action={{ label: 'Request a new link', href: ROUTES.forgotPassword }}
      />
    );
  }

  if (isChecking) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Spinner />
        <p className="text-sm text-text-muted">Verifying link...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <AuthHeader title="Set a new password" />

      <form
        onSubmit={handleSubmit((data) => resetPassword({ oobCode, password: data.password }))}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordRequirements control={control} name="password" />
        </div>
        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" size="xl" loading={isPending} className="w-full">
          Update password
        </Button>
      </form>
    </div>
  );
}
