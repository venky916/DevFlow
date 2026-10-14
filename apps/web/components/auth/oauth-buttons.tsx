"use client";

import { Button } from "@devflow/ui/components/button";

import { useOAuthSignIn } from "../../hooks/use-auth";
import { GithubIcon, GoogleIcon } from "../../icons";

export function OAuthButtons({ successMessage }: { successMessage: string }) {
  const { signIn, loadingProvider } = useOAuthSignIn(successMessage);
  const busy = loadingProvider !== null;

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        size="xl"
        className="w-full"
        onClick={() => signIn("google")}
        loading={loadingProvider === "google"}
        disabled={busy}
      >
        {loadingProvider !== "google" && <GoogleIcon />}
        Continue with Google
      </Button>
      <Button
        variant="secondary"
        size="xl"
        className="w-full"
        onClick={() => signIn("github")}
        loading={loadingProvider === "github"}
        disabled={busy}
      >
        {loadingProvider !== "github" && <GithubIcon />}
        Continue with GitHub
      </Button>
    </div>
  );
}
