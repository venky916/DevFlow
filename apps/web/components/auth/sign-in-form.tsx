"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@devflow/ui/components/button";
import { Input } from "@devflow/ui/components/input";
import { signInWithEmail } from "../../lib/auth";
import { signInSchema, type SignInForm } from "@devflow/validators";
import { GoogleIcon, GithubIcon } from "../../icons";
import { Logo } from "../shared/logo";
import { useAuthRedirect } from "../../hooks/auth/use-auth-redirect";
import { useOAuthSignIn } from "../../hooks/auth/use-oauth-sign-in";
import { Loader2 } from "lucide-react";

export function SignInForm() {
  const router = useRouter();
  const { redirectTo, redirectQuery } = useAuthRedirect();
  const { googleLoading, githubLoading, signInWithGoogle, signInWithGithub } =
    useOAuthSignIn(redirectTo, "Welcome back!");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({ resolver: zodResolver(signInSchema) });

  const onSubmit = async (data: SignInForm) => {
    try {
      await signInWithEmail(data.email, data.password);
      toast.success("Welcome back!");
      router.push(redirectTo);
    } catch (err: any) {
      toast.error(err.message ?? "Sign in failed");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2">
        <Logo />
        <h1 className="text-xl font-semibold text-text-primary">
          Sign in to DevFlow
        </h1>
        <p className="text-sm text-text-muted">
          Welcome back. Let's get you moving.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          className="w-full h-10"
          onClick={signInWithGoogle}
          disabled={googleLoading}
        >
          <span className="mr-3">
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
          </span>
          <span className={googleLoading ? "opacity-70" : ""}>
            Continue with Google
          </span>
        </Button>
        <Button
          variant="secondary"
          className="w-full h-10"
          onClick={signInWithGithub}
          disabled={githubLoading}
        >
          <span className="mr-3">
            {githubLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GithubIcon />
            )}
          </span>
          <span className={githubLoading ? "opacity-70" : ""}>
            Continue with GitHub
          </span>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border-default" />
        <span className="text-xs text-text-disabled uppercase tracking-wider">
          or
        </span>
        <div className="flex-1 h-px bg-border-default" />
      </div>

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
        <Link
          href="/forgot-password"
          className="text-xs text-accent hover:text-accent-hover transition-colors self-end -mt-2"
        >
          Forgot password?
        </Link>
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

      <p className="text-center text-sm text-text-muted">
        Don't have an account?{" "}
        <Link
          href={`/sign-up${redirectQuery}`}
          className="text-accent hover:text-accent-hover transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
