"use client";

import { useParams } from "next/navigation";
import { useWorkspaces } from "./use-workspaces";
import { useProjects } from "./use-projects";
import type { ProjectAccess, WorkspaceRole } from "../lib/permissions";

export interface Permissions {
    workspaceRole: WorkspaceRole | null;
    access: ProjectAccess;
    isWorkspaceAdmin: boolean;
    isViewer: boolean;
    isLoading: boolean;
}

// This hook ONLY resolves facts (who is this user, what's their role here).
// It makes no decisions — decisions happen by calling canProject/canWorkspace
// from lib/permissions.ts directly wherever needed.
export function usePermissions(override?: {
    workspaceSlug?: string;
    projectSlug?: string;
}): Permissions {
    const params = useParams<{ workspaceSlug?: string; projectSlug?: string }>();
    const workspaceSlug = override?.workspaceSlug ?? params.workspaceSlug;
    const projectSlug = override?.projectSlug ?? params.projectSlug;

    const { data: workspaces, isLoading: wsLoading } = useWorkspaces();
    const currentWorkspace = workspaces?.find((ws) => ws.slug === workspaceSlug);
    const workspaceRole = (currentWorkspace?.currentUserWorkspaceRole ??
        null) as WorkspaceRole | null;

    const { data: projects, isLoading: projLoading } = useProjects(
        currentWorkspace?.id ?? "",
    );
    const currentProject = projects?.find((p) => p.slug === projectSlug);
    const rawAccess = currentProject?.currentUserAccess;

    const access: ProjectAccess = {
        isWorkspaceAdmin: rawAccess?.isWorkspaceAdmin ?? workspaceRole === "ADMIN",
        projectRole: rawAccess?.projectRole ?? null,
    };

    return {
        workspaceRole,
        access,
        isWorkspaceAdmin: access.isWorkspaceAdmin,
        isViewer: access.projectRole === "VIEWER" && !access.isWorkspaceAdmin,
        isLoading: wsLoading || projLoading,
    };
}