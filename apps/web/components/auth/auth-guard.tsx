"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../hooks/use-auth";
import { useWorkspaces } from "../../hooks/use-workspaces";
import { useProjects } from "../../hooks/use-projects";
import { useAuthStore } from "../../stores/auth.store";

// Routes that don't need workspace/project context
const PUBLIC_APP_ROUTES = ["/inbox", "/my-issues", "/workspaces"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const storeUser = useAuthStore((s) => s.user);

  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();

  // Get the first workspace the user belongs to
  const firstWorkspace = workspaces?.[0];

  const { data: projects, isLoading: projLoading } = useProjects(
    firstWorkspace?.id ?? "",
  );

  useEffect(() => {
    // Not ready yet
    if (isLoading || wsLoading) return;

    // Not logged in → send to sign-in
    if (!user) {
      router.replace("/sign-in");
      return;
    }

    // Already on a valid route — don't redirect
    const isOnPublicAppRoute = PUBLIC_APP_ROUTES.some((r) =>
      pathname.startsWith(r),
    );
    // Already on a workspace or project route
    const isOnWorkspaceRoute =
      pathname.split("/").length >= 2 && !isOnPublicAppRoute;
    if (isOnWorkspaceRoute || isOnPublicAppRoute) return;

    // No workspaces at all → send to create workspace
    if (!workspaces || workspaces.length === 0) {
      router.replace("/workspaces");
      return;
    }
  }, [user, isLoading, wsLoading, workspaces, pathname]);

  useEffect(() => {
    if (isLoading || wsLoading || projLoading) return;
    if (!user || !firstWorkspace || !projects) return;

    // Only redirect from root path
    if (pathname !== "/") return;

    const myMembership = firstWorkspace.members?.find(
      (m) => m.userId === storeUser?.id,
    );
    const workspaceRole = myMembership?.role;
    const isOwnerOrAdmin =
      workspaceRole === "OWNER" || workspaceRole === "ADMIN";

    if (isOwnerOrAdmin) {
      // Owner/Admin → workspace home
      router.replace(`/${firstWorkspace.slug}`);
    } else {
      // Lead/Developer/Viewer → first assigned project board
      const assignedProject = projects.find((p) =>
        p.members?.some((m) => m.userId === storeUser?.id),
      );
      if (assignedProject) {
        router.replace(`/${firstWorkspace.slug}/${assignedProject.slug}/board`);
      } else {
        // No project assigned → no-access page
        router.replace("/no-access");
      }
    }
  }, [
    user,
    isLoading,
    wsLoading,
    projLoading,
    firstWorkspace,
    projects,
    pathname,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg-app">
        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
