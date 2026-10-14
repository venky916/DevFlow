"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { signInSchema, type SignInInput } from "@devflow/validators";

import { ROUTES } from "../../constants/routes";
import { useAuthRedirect, useSignIn } from "../../hooks/use-auth";
import { AuthDivider } from "./auth-divider";
import { AuthFooterLink } from "./auth-footer-link";
import { AuthHeader } from "./auth-header";
import { OAuthButtons } from "./oauth-buttons";

export function SignInForm() {
  const { redirectQuery } = useAuthRedirect();
  const { mutate: signIn, isPending } = useSignIn();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  return (
    <div className="flex flex-col gap-8">
      <AuthHeader
        title="Sign in to DevFlow"
        description="Welcome back. Let's get you moving."
      />
      <OAuthButtons successMessage="Welcome back!" />
      <AuthDivider />

      <form
        onSubmit={handleSubmit((data) => signIn(data))}
        className="flex flex-col gap-4"
      >
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
        <Link
          href={ROUTES.forgotPassword}
          className="-mt-2 self-end text-xs text-accent transition-colors hover:text-accent-hover"
        >
          Forgot password?
        </Link>
        <Button type="submit" size="xl" loading={isPending} className="w-full">
          Sign in
        </Button>
      </form>

      <AuthFooterLink
        text="Don't have an account?"
        label="Sign up"
        href={`${ROUTES.signUp}${redirectQuery}`}
      />
    </div>
  );
}
