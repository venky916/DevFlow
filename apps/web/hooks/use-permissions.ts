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

    // workspace-level helpers
    isOwner: boolean;
    isOwnerOrAdmin: boolean;

    // project-level helpers (Lead OR workspace Owner/Admin can do these)
    isLeadOrAbove: boolean;
    canViewBacklog: boolean;
    canManageSprints: boolean;
    canManageProjectMembers: boolean;
    canViewProjectSettings: boolean;

    // board-level helpers
    canCreateIssue: boolean;
    canDragAnyCard: boolean;
    canComment: boolean;

    // loading state
    isLoading: boolean;
}

export function usePermissions(): Permissions {
    const { workspaceSlug, projectSlug } = useParams<{
        workspaceSlug?: string;
        projectSlug?: string;
    }>();

    const user = useAuthStore((s) => s.user);
    const { data: workspaces, isLoading: wsLoading } = useWorkspaces();

    // Find current workspace
    const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);

    // Find current user's workspace membership
    const workspaceMember = currentWorkspace?.members?.find(
        (m) => m.userId === user?.id
    );
    const workspaceRole = workspaceMember?.role ?? null;

    // Find current project membership (from projects query)
    // We pull projectRole from the projects list members array
    const { data: projects, isLoading: projLoading } = useProjects(
        currentWorkspace?.id ?? ""
    );

    const currentProject = projects?.find((p) => p.slug === projectSlug);
    const projectMember = currentProject?.members?.find(
        (m) => m.userId === user?.id
    );
    const projectRole = projectMember?.role ?? null;

    const isLoading = wsLoading || projLoading;

    // ─── Derived booleans ──────────────────────────────────────────
    const isOwner = workspaceRole === "OWNER";
    const isOwnerOrAdmin = isOwner || workspaceRole === "ADMIN";

    // Lead at project level OR Owner/Admin at workspace level
    const isLeadOrAbove =
        isOwnerOrAdmin || projectRole === "LEAD";

    const canViewBacklog = isLeadOrAbove;
    const canManageSprints = isLeadOrAbove;
    const canManageProjectMembers = isLeadOrAbove;
    const canViewProjectSettings = isLeadOrAbove;

    // Developer+ can create issues and comment, Viewer cannot
    const isDeveloperOrAbove =
        isLeadOrAbove ||
        projectRole === "DEVELOPER" ||
        workspaceRole === "DEVELOPER";

    const canCreateIssue = isDeveloperOrAbove;
    const canComment = isDeveloperOrAbove;

    // Only Owner/Admin/Lead can drag anyone's card
    const canDragAnyCard = isLeadOrAbove;

    return {
        workspaceRole,
        projectRole,
        isOwner,
        isOwnerOrAdmin,
        isLeadOrAbove,
        canViewBacklog,
        canManageSprints,
        canManageProjectMembers,
        canViewProjectSettings,
        canCreateIssue,
        canDragAnyCard,
        canComment,
        isLoading,
    };
}