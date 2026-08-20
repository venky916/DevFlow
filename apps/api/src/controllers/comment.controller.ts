import { Request, Response } from "express"
import { prisma } from "@devflow/db"
import { asyncHandler } from "../lib/asyncHandler"
import { ApiError } from "../lib/ApiError"
import { sendNoContent, sendSuccess, sendCreated } from "../lib/apiResponse"
import { publishToIssue } from "../lib/redis.publisher"
import { activityQueue, emailQueue, notificationQueue } from "@devflow/queues"
import { createCommentSchema, extractMentions, updateCommentSchema, getPlainText } from "@devflow/validators"
import { ActivityActions, IssueEvents, NotificationTypes } from "@devflow/types"
import { logActivity } from "../lib/logActivity"
import { commentService } from "../services/comment.service"

// ─── POST /issues/:id/comments ───────────────────────────────────
export const createComment = asyncHandler(async (req: Request, res: Response) => {
    const { id: issueId } = req.params;
    const { content } = createCommentSchema.parse(req.body);
    const comment = await commentService.createComment(issueId as string, req.user!.id, content);
    sendCreated(res, comment, "Comment created successfully");
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
    const { id, projectId } = req.params
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

    await publishToIssue(comment.issueId, {
        type: IssueEvents.COMMENT_UPDATED,
        payload: { comment: updatedComment }
    })

    await logActivity({
        action: ActivityActions.COMMENT_UPDATED,
        scope: 'ISSUE',
        userId,
        projectId: projectId as string,
        issueId: comment.issueId,
        meta: { commentId: id }
    })


    sendSuccess(res, updatedComment, "Comment updated successfully")
})

// ─── DELETE /comments/:id ─────────────────────────────────────────
export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id
    const access = req.projectAccess!

    const comment = await prisma.comment.findUnique({
        where: {
            id: id as string
        }
    })

    if (!comment) {
        throw ApiError.notFound('Comment not found')
    }

    const isAuthor = comment.userId === userId
    const canModerate = access.isWorkspaceAdmin || access.projectRole === 'LEAD'

    // only author can delete
    if (!isAuthor && !canModerate) {
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