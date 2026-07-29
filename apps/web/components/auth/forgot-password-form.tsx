"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { sendResetEmail } from "../../lib/auth";
import {
  forgotPasswordSchema,
  type ForgotPasswordForm,
} from "@devflow/validators";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      await sendResetEmail(data.email);
    } catch (err: any) {
      // swallow the specific error — don't reveal whether the email exists
      console.error(err);
    } finally {
      // always show success, regardless of outcome
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4 items-center text-center">
        <h1 className="text-xl font-semibold text-text-primary">
          Check your email
        </h1>
        <p className="text-sm text-text-muted">
          If an account exists for that email, we've sent a link to reset your
          password.
        </p>
        <Link
          href="/sign-in"
          className="text-accent hover:text-accent-hover transition-colors text-sm"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2">
        <div className="h-10 w-10 rounded-[4px] bg-accent flex items-center justify-center">
          <span className="text-accent-text font-bold text-lg font-mono">
            D
          </span>
        </div>
        <h1 className="text-xl font-semibold text-text-primary">
          Reset your password
        </h1>
        <p className="text-sm text-text-muted">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted">
        Remember your password?{" "}
        <Link
          href="/sign-in"
          className="text-accent hover:text-accent-hover transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
