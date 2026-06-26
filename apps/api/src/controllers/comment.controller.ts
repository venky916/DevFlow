import { Request, Response } from "express"
import { prisma } from "@devflow/db"
import { asyncHandler } from "../lib/asyncHandler"
import { ApiError } from "../lib/ApiError"
import { sendNoContent, sendSuccess, sendCreated } from "../lib/apiResponse"
import { publishToIssue } from "../lib/redis.publisher"
import { activityQueue, emailQueue, notificationQueue } from "@devflow/queues"
import { createCommentSchema, extractMentions, updateCommentSchema } from "@devflow/validators"
import { ActivityActions, IssueEvents, NotificationTypes } from "@devflow/types"
import { logActivity } from "../lib/logActivity"

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

    // fetch commenter name once — used in all notification content below
    const commenter = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
    })

    // ─── Publish to WS (issue detail page)
    await publishToIssue(issueId as string, {
        type: IssueEvents.COMMENT_ADDED,
        payload: {
            comment
        }
    })

    // ─── Enqueue activity log
    await logActivity({
        action: ActivityActions.COMMENT_ADDED,
        scope: "ISSUE",
        userId,
        projectId: issue.projectId,
        issueId: issueId as string,
        meta: { commentId: comment.id, preview: content.slice(0, 100) },
    })

    // ─── mention + notification logic
    // extract @[userId] mentions from content
    const mentionedUserIds = extractMentions(content)

    if (mentionedUserIds.length > 0) {
        // validate each mentioned user is actually a project member
        const projectMembers = await prisma.projectMember.findMany({
            where: {
                projectId: issue.projectId,
            },
            select: {
                userId: true
            }
        })
        const membersIds = new Set(projectMembers.map(member => member.userId))

        const validMentionIds = mentionedUserIds.filter(id => id !== userId && membersIds.has(id))

        // fire MENTION notification for each valid mention
        for (const mentionedUserId of validMentionIds) {
            await notificationQueue.add('notification', {
                userId: mentionedUserId,
                type: NotificationTypes.MENTION,
                content: `@${commenter?.name ?? 'Someone'} mentioned you in: ${issue.title}`,
                link: `/issues/${issueId}`,
                triggeredBy: userId
            })
        }

        // ISSUE_COMMENTED → creator + assignee only if NOT already mentioned
        const mentionedSet = new Set(validMentionIds)
        const commentRecipients = [issue.creatorId, issue.assigneeId].filter(Boolean) as string[]

        for (const recipientId of commentRecipients) {
            if (recipientId === userId) continue
            if (mentionedSet.has(recipientId)) continue

            await notificationQueue.add('notification', {
                userId: recipientId,
                type: NotificationTypes.ISSUE_COMMENTED,
                content: `@${commenter?.name ?? 'Someone'} commented on your issue: ${issue.title}`,
                link: `/issues/${issueId}`,
                triggeredBy: userId
            })
        }
    } else {
        // no mentions — notify creator + assignee normally
        const commentRecipients = [issue.creatorId, issue.assigneeId].filter(Boolean) as string[]

        for (const recipientId of commentRecipients) {
            if (recipientId === userId) continue

            await notificationQueue.add('notification', {
                userId: recipientId,
                type: NotificationTypes.ISSUE_COMMENTED,
                content: `@${commenter?.name ?? 'Someone'} commented on your issue: ${issue.title}`,
                link: `/issues/${issueId}`,
                triggeredBy: userId
            })

            // email notification for creator only (not assignee, too noisy)
            if (recipientId === issue.creatorId) {
                const creator = await prisma.user.findUnique({
                    where: { id: issue.creatorId },
                    select: { email: true, name: true }
                })

                if (creator) {
                    await emailQueue.add('email', {
                        to: creator.email,
                        type: NotificationTypes.ISSUE_COMMENTED,
                        data: {
                            issueTitle: issue.title,
                            commentedBy: commenter?.name ?? 'Someone',
                            comment: content.slice(0, 200),
                            assigneeName: creator.name,
                            projectName: issue.projectId,
                            issueLink: `${process.env.BASE_WEB_URL}/issues/${issueId}`,
                        }
                    })
                }
            }
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