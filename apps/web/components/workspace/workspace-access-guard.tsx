"use client";

import { useParams } from "next/navigation";

import { useWorkspaceGuard } from "../../hooks/use-workspaces";
import {PageError} from "../shared/page-error";
import {PageLoading} from "../shared/page-loading";

export function WorkspaceAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { status, refetch } = useWorkspaceGuard(workspaceSlug);

  if (status === "loading") return <PageLoading />;
  if (status === "error") {
    return (
      <PageError
        message="Couldn't load this workspace"
        onRetry={() => refetch()}
      />
    );
  }
  return <>{children}</>;
}
