"use client";

import { useParams } from "next/navigation";

import { useProjects } from "../../hooks/use-projects";
import { useWorkspaceBySlug } from "../../hooks/use-workspaces";
import {PageError} from "../shared/page-error";
import {PageLoading} from "../shared/page-loading";
import { WorkspaceHome } from "./workspace-home";

export function WorkspacePage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { data: workspace } = useWorkspaceBySlug(workspaceSlug); // already cached by the guard
  const {
    data: projects,
    isLoading,
    isError,
    refetch,
  } = useProjects(workspace?.id ?? "");

  if (!workspace || isLoading) return <PageLoading />;
  if (isError)
    return (
      <PageError message="Couldn't load projects" onRetry={() => refetch()} />
    );

  return <WorkspaceHome workspace={workspace} projects={projects ?? []} />;
}
