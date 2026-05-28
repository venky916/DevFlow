import { Request, Response } from "express"
import { prisma } from "@devflow/db"
import { asyncHandler } from "../lib/asyncHandler"
import { ApiError } from '../lib/ApiError';
import { sendSuccess } from '../lib/apiResponse';

// ─── GET /issues/:id/activities ──────────────────────────────────
export const getIssueActivities = asyncHandler(async (req: Request, res: Response) => {
    const { id: issueId } = req.params;

    const issue = await prisma.issue.findUnique({
        where: {
            id: issueId as string
        },
        select: {
            id: true
        }
    })
    if (!issue) {
        throw ApiError.notFound('Issue not found')
    }
    const activities = await prisma.activityLog.findMany({
        where: {
            issueId: issueId as string
        },
        orderBy: {
            createdAt: "desc"
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            }
        }
    })
    sendSuccess(res, activities, 'Activities fetched successfully')
})

// ─── GET /projects/:id/activities ────────────────────────────────
export const getProjectActivities = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params;

    const activities = await prisma.activityLog.findMany({
        where: {
            projectId: projectId as string
        },

        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            },
            issues: {
                select: {
                    id: true,
                    title: true
                }
            }
        },
        orderBy: {
            createdAt: "desc"
        },
        take: 50, // last 50 activities
    })
    sendSuccess(res, activities, 'Activities fetched successfully')
})

