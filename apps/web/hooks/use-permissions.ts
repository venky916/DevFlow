"use client";

import { useParams } from "next/navigation";
import { useAuthStore } from "../stores/auth.store";
import { useWorkspaces } from "./use-workspaces";
import { useProjects } from "./use-projects";
import type { WorkspaceRole, ProjectRole } from "@devflow/types";

export interface Permissions {
    // raw roles
    workspaceRole: WorkspaceRole | null;
    projectRole: ProjectRole | null;

    // workspace-level
    isAdmin: boolean;

    // project-level (LEAD or workspace ADMIN)
    isLeadOrAbove: boolean;
    canViewBacklog: boolean;
    canManageSprints: boolean;
    canManageProjectMembers: boolean;
    canViewProjectSettings: boolean;

    // board-level
    canCreateIssue: boolean;
    canDragAnyCard: boolean;
    canComment: boolean;

    // viewer check
    isViewer: boolean;

    isLoading: boolean;
}

export function usePermissions(): Permissions {
    const { workspaceSlug, projectSlug } = useParams<{
        workspaceSlug?: string;
        projectSlug?: string;
    }>();

    const user = useAuthStore((s) => s.user);
    const { data: workspaces, isLoading: wsLoading } = useWorkspaces();

    const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);
    const workspaceMember = currentWorkspace?.members?.find((m) => m.userId === user?.id);
    const workspaceRole = (workspaceMember?.role ?? null) as WorkspaceRole | null;

    const { data: projects, isLoading: projLoading } = useProjects(
        currentWorkspace?.id ?? ""
    );

    const currentProject = projects?.find((p) => p.slug === projectSlug);
    const projectMember = currentProject?.members?.find((m) => m.userId === user?.id);
    const projectRole = (projectMember?.role ?? null) as ProjectRole | null;

    const isLoading = wsLoading || projLoading;

    // ─── Derived booleans ──────────────────────────────────────────

    // Workspace ADMIN
    const isAdmin = workspaceRole === "ADMIN";

    // LEAD at project level OR ADMIN at workspace level
    const isLeadOrAbove = isAdmin || projectRole === "LEAD";

    // DEVELOPER at project level OR Lead/Admin
    // Note: workspaceRole DEVELOPER alone is NOT enough —
    // they must also be a project member with DEVELOPER role
    const isDeveloperOrAbove = isLeadOrAbove || projectRole === "DEVELOPER";

    const isViewer = projectRole === "VIEWER" && !isAdmin;

    return {
        workspaceRole,
        projectRole,
        isAdmin,
        isLeadOrAbove,
        canViewBacklog: isLeadOrAbove,
        canManageSprints: isLeadOrAbove,
        canManageProjectMembers: isLeadOrAbove,
        canViewProjectSettings: isLeadOrAbove,
        canCreateIssue: isDeveloperOrAbove,
        canDragAnyCard: isLeadOrAbove,
        canComment: isDeveloperOrAbove,
        isViewer,
        isLoading,
    };
}