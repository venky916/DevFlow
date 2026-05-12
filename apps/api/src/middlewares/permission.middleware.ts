import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "@devflow/db";
import { ApiError } from "../lib/ApiError";
import { WorkspaceRole,ProjectRole } from "@devflow/types";

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

// ─── Workspace role check ─────────────────────────────────────────
export const requireWorkspaceRole = (...roles: WorkspaceRole[]) => {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!.id
        const workspaceId = req.params.workspaceId ?? req.params.id

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

// ─── Project role check ───────────────────────────────────────────
export const requireProjectRole = (...roles: ProjectRole[]) => {
    return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!.id
        const projectId = req.params.projectId ?? req.params.id

        const member = await prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId: projectId as string, userId } },
        });

        if (!member) {
            throw ApiError.forbidden('You are not a member of this project');
        }

        if (!roles.includes(member.role as ProjectRole)) {
            throw ApiError.forbidden('You do not have permission to perform this action');
        }

        next();
    })
}

// ─── Workspace membership check (any role) ────────────────────────
export const requireWorkspaceMember = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const workspaceId = req.params.workspaceId ?? req.params.id;

    const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: workspaceId as string, userId } },
    });

    if (!member) {
        throw ApiError.forbidden('You are not a member of this workspace');
    }

    next();
})

// ─── Project membership check (any role) ─────────────────────────
export const requireProjectMember = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const projectId = req.params.projectId ?? req.params.id;

    const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: projectId as string, userId } },
    });

    if (!member) {
        throw ApiError.forbidden('You are not a member of this project');
    }

    next();
})