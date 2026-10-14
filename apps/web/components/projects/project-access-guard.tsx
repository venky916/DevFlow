"use client";

import { useParams } from "next/navigation";

import { useProjectGuard } from "../../hooks/use-projects";
import {PageError} from "../shared/page-error";
import {PageLoading} from "../shared/page-loading";

export function ProjectAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspaceSlug, projectSlug } = useParams<{
    workspaceSlug: string;
    projectSlug: string;
  }>();
  const { status, refetch } = useProjectGuard(workspaceSlug, projectSlug);

  if (status === "loading") return <PageLoading />;
  if (status === "error") {
    return (
      <PageError
        message="Couldn't load this project"
        onRetry={() => refetch()}
      />
    );
  }
  return <>{children}</>;
}
