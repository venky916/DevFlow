// lib/roles.ts
import type { ProjectRole, WorkspaceRole } from "@devflow/types";

export const WORKSPACE_ROLE_OPTIONS = [
    { label: "Admin", value: "ADMIN" },
    { label: "Developer", value: "DEVELOPER" },
    { label: "Viewer", value: "VIEWER" },
];

export const PROJECT_ROLE_OPTIONS = [
    { label: "Lead", value: "LEAD" },
    { label: "Developer", value: "DEVELOPER" },
    { label: "Viewer", value: "VIEWER" },
];

export function workspaceRoleVariant(role: WorkspaceRole) {
    switch (role) {
        case "ADMIN": return "warning" as const;
        case "DEVELOPER": return "neutral" as const;
        case "VIEWER": return "neutral" as const;
    }
}

export function projectRoleVariant(role: ProjectRole) {
    switch (role) {
        case "LEAD":
            return "success" as const;
        case "DEVELOPER":
            return "neutral" as const;
        case "VIEWER":
            return "neutral" as const;
    }
}

export function displayName(user?: { name?: string | null; email?: string | null }) {
    if (!user) return "Unknown";
    if (user.name) return user.name;
    if (user.email) return user.email.split("@")[0];
    return "Unknown";
}