"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import {
  signInWithEmail,
  signInWithGoogle,
  signInWithGithub,
} from "../../lib/auth";
import { signInSchema, type SignInForm } from "@devflow/validators";
import { GoogleIcon, GithubIcon } from "../../icons";

export function SignInForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInForm) => {
    try {
      await signInWithEmail(data.email, data.password);
      toast.success("Welcome back!");
      router.push(redirect ?? "/");
    } catch (err: any) {
      toast.error(err.message ?? "Sign in failed");
    }
  };

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
      toast.success("Welcome back!");
      router.push(redirect ?? "/");
    } catch (err: any) {
      toast.error(err.message ?? "Google sign in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGithub = async () => {
    try {
      setGithubLoading(true);
      await signInWithGithub();
      toast.success("Welcome back!");
      router.push(redirect ?? "/");
    } catch (err: any) {
      toast.error(err.message ?? "GitHub sign in failed");
    } finally {
      setGithubLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Logo */}
      <div className="flex flex-col items-center gap-2">
        <div className="h-10 w-10 rounded-[4px] bg-accent flex items-center justify-center">
          <span className="text-accent-text font-bold text-lg font-mono">
            D
          </span>
        </div>
        <h1 className="text-xl font-semibold text-text-primary">
          Sign in to DevFlow
        </h1>
        <p className="text-sm text-text-muted">
          Welcome back. Let's get you moving.
        </p>
      </div>

      {/* OAuth */}
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          className="w-full h-10"
          onClick={handleGoogle}
          disabled={googleLoading}
        >
          <span className="mr-3">
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
          </span>
          Continue with Google
        </Button>
        <Button
          variant="secondary"
          className="w-full h-10"
          onClick={handleGithub}
          disabled={githubLoading}
        >
          <span className="mr-3">
            {githubLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GithubIcon />
            )}
          </span>
          Continue with GitHub
        </Button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border-default" />
        <span className="text-xs text-text-disabled uppercase tracking-wider">
          or
        </span>
        <div className="flex-1 h-px bg-border-default" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-text-muted">
        Don't have an account?{" "}
        <Link
          href={
            redirect
              ? `/sign-up?redirect=${encodeURIComponent(redirect)}`
              : "/sign-up"
          }
          className="text-accent hover:text-accent-hover transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
