import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma, WorkspaceRole } from "@devflow/db";
import { ApiError } from "../lib/ApiError";
import { ProjectRole } from "@devflow/types";

// ─── Attach projectId from sprintId ───────────────────────────────
export const attachSprintProject = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const sprintId = req.params.id

    const sprint = await prisma.sprint.findUnique({
        where: {
            id: sprintId as string
        },
        select: {
            projectId: true
        }
    })

    if (!sprint) {
        throw ApiError.notFound('Sprint not found')
    }

    req.params.projectId = sprint.projectId
    next()
})

// ─── Attach projectId from issueId ────────────────────────────────
export const attachIssueProject = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const issueId = req.params.id

    const issue = await prisma.issue.findUnique({
        where: {
            id: issueId as string
        },
        select: {
            projectId: true
        }
    })

    if (!issue) {
        throw ApiError.notFound('Issue not found')
    }

    req.params.projectId = issue.projectId
    next()
})

// ─── Attach projectId from commentId (comment → issue → project) ──
export const attachCommentProject = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const commentId = req.params.id

    const comment = await prisma.comment.findUnique({
        where: { id: commentId as string },
        select: { issue: { select: { projectId: true } } }
    })

    if (!comment) throw ApiError.notFound('Comment not found')

    req.params.projectId = comment.issue.projectId
    next()
})

// ─── Attach projectId from attachmentId (attachment → issue → project) ──
export const attachAttachmentProject = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const attachmentId = req.params.attachmentId

    const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId as string },
        select: { issue: { select: { projectId: true } } }
    })

    if (!attachment) throw ApiError.notFound('Attachment not found')

    if (!attachment.issue) {
        // attachment belongs to a comment, not directly to an issue —
        // shouldn't happen via the current issue-scoped upload flow,
        // but guard it rather than silently passing through
        throw ApiError.notFound('Attachment is not linked to an issue')
    }

    req.params.projectId = attachment.issue.projectId
    next()
})

// ─── Core resolver — the ONE rule every project-scoped route uses ─
export type ResolvedAccess =
    | { isWorkspaceAdmin: true; projectRole: null }
    | { isWorkspaceAdmin: false; projectRole: ProjectRole }

export async function resolveProjectAccess(userId: string, projectId: string): Promise<ResolvedAccess> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { workspaceId: true }
    })

    if (!project) throw ApiError.notFound('Project not found')

    const wsMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } }
    })

    if (!wsMember) throw ApiError.forbidden('You are not a member of this workspace')

    if (wsMember.role === 'ADMIN') {
        return { isWorkspaceAdmin: true, projectRole: null }
    }

    const projMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } }
    })

    if (!projMember) throw ApiError.forbidden('You are not a member of this project')

    return { isWorkspaceAdmin: false, projectRole: projMember.role as ProjectRole }
}

// ─── Workspace role check ─────────────────────────────────────────
export const requireWorkspaceRole = (...roles: WorkspaceRole[]) => {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!.id
        const workspaceId = req.params.workspaceId ?? req.params.id

        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId as string } });
        if (!workspace) throw ApiError.notFound('Workspace not found');

        const member = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: workspaceId as string,
                    userId
                }
            }
        })

        if (!member) {
            throw ApiError.forbidden('You are not a member of this workspace')
        }

        if (!roles.includes(member.role as WorkspaceRole)) {
            throw ApiError.forbidden('You do not have permission to perform this action')
        }

        next()
    })
};

// ─── Workspace membership check (any role) ────────────────────────
export const requireWorkspaceMember = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const workspaceId = req.params.workspaceId ?? req.params.id;

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId as string } });
    if (!workspace) throw ApiError.notFound('Workspace not found');

    const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: workspaceId as string, userId } },
    });

    if (!member) {
        throw ApiError.forbidden('You are not a member of this workspace');
    }

    next();
})

// ─── Any project member (or workspace admin) — no role filter ────
export const requireProjectMember = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const projectId = req.params.projectId ?? req.params.id;

    req.projectAccess = await resolveProjectAccess(userId, projectId as string)
    next()
})

// ─── Specific project roles (or workspace admin, who always passes) ─
export const requireProjectRole = (...roles: ProjectRole[]) => {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!.id
        const projectId = req.params.projectId ?? req.params.id

        const access = await resolveProjectAccess(userId, projectId as string)

        if (!access.isWorkspaceAdmin && !roles.includes(access.projectRole)) {
            throw ApiError.forbidden('You do not have permission to perform this action')
        }

        req.projectAccess = access
        next()
    })
}

// ─── Issue move ownership check ────────────────────────────────────
export const requireIssueMoveAccess = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id
    const issueId = req.params.id
    const projectId = req.params.projectId as string

    const access = await resolveProjectAccess(userId, projectId)
    req.projectAccess = access

    if (access.isWorkspaceAdmin || access.projectRole === 'LEAD') {
        return next()
    }

    if (access.projectRole !== 'DEVELOPER') {
        throw ApiError.forbidden('You do not have permission to move issues')
    }

    const issue = await prisma.issue.findUnique({
        where: { id: issueId as string },
        select: { assigneeId: true }
    })

    if (!issue) throw ApiError.notFound('Issue not found')

    if (!issue.assigneeId) {
        throw ApiError.forbidden('This issue is unassigned — a lead or admin must assign it first')
    }

    if (issue.assigneeId !== userId) {
        throw ApiError.forbidden('You can only move issues assigned to you')
    }

    next()
})