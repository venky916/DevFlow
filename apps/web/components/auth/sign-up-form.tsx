"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import {
  signUpWithEmail,
  signInWithGoogle,
  signInWithGithub,
} from "../../lib/auth";
import { signUpSchema, type SignUpForm } from "@devflow/validators";
import { GithubIcon, GoogleIcon } from "../../icons";

export function SignUpForm() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpForm) => {
    try {
      await signUpWithEmail(data.email, data.password, data.name);
      toast.success("Account created!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message ?? "Sign up failed");
    }
  };

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
      toast.success("Account created!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message ?? "Google sign up failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGithub = async () => {
    try {
      setGithubLoading(true);
      await signInWithGithub();
      toast.success("Account created!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message ?? "GitHub sign up failed");
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
          Create your account
        </h1>
        <p className="text-sm text-text-muted">Start shipping faster today.</p>
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
        <div className="flex flex-col gap-1.5">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordHint password={watch("password")} />
        </div>
        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
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
            "Create account"
          )}
        </Button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-text-muted">
        Already have an account?{" "}
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

function PasswordHint({ password }: { password: string }) {
  if (!password) return null;
  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
    { label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
  return (
    <div className="flex flex-col gap-1 mt-1">
      {rules.map((rule) => (
        <div key={rule.label} className="flex items-center gap-2">
          <div
            className={`h-1.5 w-1.5 rounded-full ${rule.met ? "bg-accent" : "bg-text-disabled"}`}
          />
          <span
            className={`text-[11px] ${rule.met ? "text-accent" : "text-text-disabled"}`}
          >
            {rule.label}
          </span>
        </div>
      ))}
    </div>
  );
}
