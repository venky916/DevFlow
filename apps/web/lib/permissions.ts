// lib/permissions.ts
// Single source of truth for role → action rules on the frontend.
// Mirrors the backend matrix exactly — keep both in sync (or later, move
// this into @devflow/types so both sides import the literal same file).

export type WorkspaceRole = "ADMIN" | "MEMBER";
export type ProjectRole = "LEAD" | "DEVELOPER" | "VIEWER";

export type ProjectAccess = {
    isWorkspaceAdmin: boolean;
    projectRole: ProjectRole | null;
};

// ── Pure role-lookup tables — one row per action from the locked table ──
export const WORKSPACE_PERMISSIONS = {
    UPDATE_WORKSPACE: ["ADMIN"],
    DELETE_WORKSPACE: ["ADMIN"],
    VIEW_MEMBERS: ["ADMIN", "MEMBER"],
    CHANGE_MEMBER_ROLE: ["ADMIN"],
    REMOVE_MEMBER: ["ADMIN"],
    MANAGE_INVITES: ["ADMIN"],
    UPDATE_LOGO: ["ADMIN"],
    VIEW_WORKSPACE_ANALYTICS: ["ADMIN"],
    CREATE_PROJECT: ["ADMIN"],
} as const satisfies Record<string, readonly WorkspaceRole[]>;

export const PROJECT_PERMISSIONS = {
    UPDATE_PROJECT: ["LEAD"],
    ADD_PROJECT_MEMBER: ["LEAD"],
    REMOVE_PROJECT_MEMBER: ["LEAD"],
    UPDATE_PROJECT_MEMBER_ROLE: ["LEAD"],
    CREATE_LABEL: ["LEAD"],
    UPDATE_LABEL: ["LEAD"],
    DELETE_LABEL: ["LEAD"],
    VIEW_PROJECT_ANALYTICS: ["LEAD"],

    CREATE_SPRINT: ["LEAD"],
    UPDATE_SPRINT: ["LEAD"],
    DELETE_SPRINT: ["LEAD"],
    START_SPRINT: ["LEAD"],
    COMPLETE_SPRINT: ["LEAD"],

    CREATE_ISSUE: ["LEAD", "DEVELOPER"],
    MOVE_ISSUE_TO_SPRINT: ["LEAD"],
    UPDATE_DUE_DATE: ["LEAD"],
    DELETE_ISSUE: ["LEAD"],
    CREATE_SUB_ISSUE: ["LEAD"],
    ATTACH_CHILD_ISSUE: ["LEAD"],
    DETACH_CHILD_ISSUE: ["LEAD"],

    UPLOAD_ATTACHMENT: ["LEAD", "DEVELOPER"],
} as const satisfies Record<string, readonly ProjectRole[]>;

export type WorkspaceAction = keyof typeof WORKSPACE_PERMISSIONS;
export type ProjectAction = keyof typeof PROJECT_PERMISSIONS;

export function canWorkspace(
    role: WorkspaceRole | null,
    action: WorkspaceAction,
): boolean {
    if (!role) return false;
    return (WORKSPACE_PERMISSIONS[action] as readonly string[]).includes(role);
}

export function canProject(access: ProjectAccess, action: ProjectAction): boolean {
    if (access.isWorkspaceAdmin) return true;
    if (!access.projectRole) return false;
    return (PROJECT_PERMISSIONS[action] as readonly string[]).includes(
        access.projectRole,
    );
}

// DELETE_PROJECT is admin-only, no LEAD path — deliberately not a table row
export function canDeleteProject(access: ProjectAccess): boolean {
    return access.isWorkspaceAdmin;
}

// ── Data-dependent exceptions — role alone isn't enough. Not used by the
// sidebar/auth screens yet, but they belong here so Board/Issue-detail/
// Comments screens later just import from this one file, not reinvent it. ──

export function canUpdateIssue(
    access: ProjectAccess,
    issue: { assigneeId: string | null },
    userId: string,
): boolean {
    if (access.isWorkspaceAdmin || access.projectRole === "LEAD") return true;
    if (access.projectRole !== "DEVELOPER") return false;
    return issue.assigneeId === userId;
}

export function canMoveIssue(
    access: ProjectAccess,
    issue: { assigneeId: string | null },
    userId: string,
): boolean {
    return canUpdateIssue(access, issue, userId); // same rule today, separate name — table lists them as distinct rows
}

export function canEditComment(comment: { authorId: string }, userId: string): boolean {
    return comment.authorId === userId;
}

export function canDeleteComment(
    access: ProjectAccess,
    comment: { authorId: string },
    userId: string,
): boolean {
    if (comment.authorId === userId) return true;
    return access.isWorkspaceAdmin || access.projectRole === "LEAD";
}

export function canDeleteAttachment(
    access: ProjectAccess,
    attachment: { uploader?: { id: string } },
    userId: string,
): boolean {
    if (attachment.uploader?.id === userId) return true;
    return access.isWorkspaceAdmin || access.projectRole === "LEAD";
}