"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { signUpSchema, type SignUpInput } from "@devflow/validators";

import { ROUTES } from "../../constants/routes";
import { useAuthRedirect, useSignUp } from "../../hooks/use-auth";
import { AuthDivider } from "./auth-divider";
import { AuthFooterLink } from "./auth-footer-link";
import { AuthHeader } from "./auth-header";
import { OAuthButtons } from "./oauth-buttons";
import { PasswordRequirements } from "./password-requirements";

export function SignUpForm() {
  const { redirectQuery } = useAuthRedirect();
  const { mutate: signUp, isPending } = useSignUp();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  return (
    <div className="flex flex-col gap-8">
      <AuthHeader
        title="Create your account"
        description="Start shipping faster today."
      />
      <OAuthButtons successMessage="Account created!" />
      <AuthDivider />

      <form
        onSubmit={handleSubmit((data) => signUp(data))}
        className="flex flex-col gap-4"
      >
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <div className="flex flex-col gap-2">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordRequirements control={control} name="password" />
        </div>
        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" size="xl" loading={isPending} className="w-full">
          Create account
        </Button>
      </form>

      <AuthFooterLink
        text="Already have an account?"
        label="Sign in"
        href={`${ROUTES.signIn}${redirectQuery}`}
      />
    </div>
  );
}
