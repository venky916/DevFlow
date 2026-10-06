'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@devflow/ui/components/button';
import { Input } from '@devflow/ui/components/input';
import { resetPasswordSchema, type ResetPasswordForm } from '@devflow/validators';

import { confirmReset, verifyResetCode } from '../../lib/auth';

type Status = 'checking' | 'valid' | 'invalid';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oobCode = searchParams.get('oobCode');
  const [status, setStatus] = useState<Status>('checking');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (!oobCode) {
      setStatus('invalid');
      return;
    }
    verifyResetCode(oobCode)
      .then(() => setStatus('valid'))
      .catch(() => setStatus('invalid'));
  }, [oobCode]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!oobCode) return;
    try {
      await confirmReset(oobCode, data.password);
      toast.success('Password updated. Please sign in.');
      router.push('/sign-in');
    } catch (err: any) {
      toast.error(err.message ?? 'Reset failed');
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <p className="text-sm text-text-muted">Verifying link...</p>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-semibold text-text-primary">Link expired</h1>
        <p className="text-sm text-text-muted">This reset link is invalid or has expired.</p>
        <Link
          href="/forgot-password"
          className="text-sm text-accent transition-colors hover:text-accent-hover"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-xl font-semibold text-text-primary">Set a new password</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="New Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
        </Button>
      </form>
    </div>
  );
}
