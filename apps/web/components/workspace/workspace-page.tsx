"use client";
import { useParams } from "next/navigation";
import { WorkspaceHome } from "./workspace-home";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import PageLoading from "../shared/page-loading";
import PageError from "../shared/page-error";

export function WorkspacePage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const {
    data: workspaces,
    isLoading: wsLoading,
    isError: wsError,
    refetch: refetchWorkspaces,
  } = useWorkspaces();
  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);
  const {
    data: projects,
    isLoading: projLoading,
    isError: projError,
    refetch: refetchProjects,
  } = useProjects(currentWorkspace?.id ?? "");

  if (wsLoading || projLoading) {
    return <PageLoading />;
  }
  if (wsError) {
    return (
      <PageError
        message="Couldn't load your workspace"
        onRetry={() => refetchWorkspaces()}
      />
    );
  }
  if (projError) {
    return (
      <PageError
        message="Couldn't load projects"
        onRetry={() => refetchProjects()}
      />
    );
  }
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <main className="flex-1 overflow-auto bg-bg-app">
        <WorkspaceHome
          workspace={currentWorkspace}
          workspaceSlug={workspaceSlug}
          projects={projects ?? []}
        />
      </main>
    </div>
  );
}
