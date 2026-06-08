"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "../../../components/layout/page-header";
import { WorkspaceHome } from "../../../components/workspace/workspace-home";
import { useWorkspaces } from "../../../hooks/use-workspaces";
import { useProjects } from "../../../hooks/use-projects";
import { useAuthStore } from "../../../stores/auth.store";

export default function WorkspaceHomePage() {
  const router = useRouter();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const user = useAuthStore((s) => s.user);

  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);

  const { data: projects, isLoading: projLoading } = useProjects(
    currentWorkspace?.id ?? "",
  );

  const myMembership = currentWorkspace?.members?.find(
    (m) => m.userId === user?.id,
  );
  const workspaceRole = myMembership?.role;

  useEffect(() => {
    if (projLoading || !projects || !workspaceRole) return;

    // Lead/Developer/Viewer don't see the workspace projects grid
    // Redirect them straight to their first assigned project's board
    const isOwnerOrAdmin =
      workspaceRole === "OWNER" || workspaceRole === "ADMIN";

    if (!isOwnerOrAdmin && projects.length > 0) {
      router.replace(`/${workspaceSlug}/${projects?.[0]?.slug}/board`);
    }
  }, [projects, projLoading, workspaceRole]);

  // Owner/Admin see the projects grid
  const isOwnerOrAdmin = workspaceRole === "OWNER" || workspaceRole === "ADMIN";

  if (!isOwnerOrAdmin) {
    // Show spinner while redirect happens
    return (
      <div className="flex items-center justify-center h-full bg-bg-app">
        <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader pageTitle="Projects" />
      <main className="flex-1 overflow-auto bg-bg-app">
        <WorkspaceHome />
      </main>
    </div>
  );
}
