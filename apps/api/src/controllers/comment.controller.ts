import { Request, Response } from "express"
import { prisma } from "@devflow/db"
import { asyncHandler } from "../lib/asyncHandler"
import { ApiError } from "../lib/ApiError"
import { sendNoContent, sendSuccess, sendCreated } from "../lib/apiResponse"
import { publishToIssue } from "../lib/redis.publisher"
import { activityQueue, emailQueue, notificationQueue } from "@devflow/queues"
import { createCommentSchema, updateCommentSchema } from "@devflow/validators"
import { ActivityActions, IssueEvents, NotificationTypes } from "@devflow/types"

// ─── POST /issues/:id/comments ───────────────────────────────────
export const createComment = asyncHandler(async (req: Request, res: Response) => {
    const { id: issueId } = req.params
    const { content } = createCommentSchema.parse(req.body)
    const userId = req.user!.id

    const issue = await prisma.issue.findUnique({
        where: {
            id: issueId as string
        },
        select: {
            projectId: true,
            creatorId: true,
            title: true,
            assigneeId: true
        }
    })

    if (!issue) {
        throw ApiError.notFound('Issue not found')
    }

    const comment = await prisma.comment.create({
        data: {
            content,
            issueId: issueId as string,
            userId
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

    // ─── Publish to WS (issue detail page)
    await publishToIssue(issueId as string, {
        type: IssueEvents.COMMENT_ADDED,
        payload: {
            comment
        }
    })

    // ─── Enqueue activity log
    await activityQueue.add("activity", {
        action: ActivityActions.COMMENT_ADDED,
        userId,
        projectId: issue.projectId,
        issueId: issueId as string,
        meta: { commentId: comment.id, preview: content.slice(0, 100) },
    })

    // ─── Notify issue creator (if not the commenter)
    if (issue.creatorId !== userId) {
        const commenter = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true }
        })
        await notificationQueue.add("notification", {
            userId: issue.creatorId,
            type: NotificationTypes.ISSUE_COMMENTED,
            content: `${commenter?.name ?? 'Someone'} commented on: ${issue.title}`,
            link: `/issues/${issueId}`,
            triggeredBy: userId,
        })

        const creator = await prisma.user.findUnique({
            where: { id: issue.creatorId },
            select: { email: true, name: true },
        })

        if (creator) {
            await emailQueue.add("email", {
                to: creator.email,
                type: NotificationTypes.ISSUE_COMMENTED,
                data: {
                    issueTitle: issue.title,
                    commentedBy: commenter?.name ?? 'Someone',
                    comment: content.slice(0, 200),
                    issueLink: `${process.env.BASE_WEB_URL}/issues/${issueId}`,
                }
            })
        }
    }

    sendCreated(res, comment, "Comment created successfully")
})

// ─── GET /issues/:id/comments ────────────────────────────────────
export const getComments = asyncHandler(async (req: Request, res: Response) => {
    const { id: issueId } = req.params

    const comments = await prisma.comment.findMany({
        where: {
            issueId: issueId as string
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    })

    sendSuccess(res, comments, "Comments fetched successfully")
})

// ─── PATCH /comments/:id ─────────────────────────────────────────
export const updateComment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const { content } = updateCommentSchema.parse(req.body)
    const userId = req.user!.id

    const comment = await prisma.comment.findUnique({
        where: {
            id: id as string
        }
    })

    if (!comment) {
        throw ApiError.notFound('Comment not found')
    }

    // only author can edit
    if (comment.userId !== userId) {
        throw ApiError.forbidden('You are not allowed to edit this comment')
    }

    const updatedComment = await prisma.comment.update({
        where: {
            id: id as string
        },
        data: {
            content
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

    sendSuccess(res, updatedComment, "Comment updated successfully")
})

// ─── DELETE /comments/:id ─────────────────────────────────────────
export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    const comment = await prisma.comment.findUnique({
        where: {
            id: id as string
        }
    })

    if (!comment) {
        throw ApiError.notFound('Comment not found')
    }

    // only author can delete
    if (comment.userId !== userId) {
        throw ApiError.forbidden('You are not allowed to delete this comment')
    }

    await prisma.comment.delete({
        where: {
            id: id as string
        }
    })

    await publishToIssue(comment.issueId, {
        type: IssueEvents.COMMENT_DELETED,
        payload: {
            commentId: id
        }
    })

    sendNoContent(res)
})