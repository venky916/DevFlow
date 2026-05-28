import { Request, Response } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { prisma } from "@devflow/db";
import { sendNoContent, sendSuccess } from "../lib/apiResponse";
import { createIssueSchema, updateIssueSchema, moveIssueSchema, moveIssueToSprintSchema } from "@devflow/validators";
import { publishToProject } from "../lib/redis.publisher";
import { activityQueue, notificationQueue, emailQueue } from "@devflow/queues"
import { ActivityActions, NotificationTypes, ProjectEvents } from "@devflow/types";
import { CacheKeys, deleteCache, deleteManyCache, getCache, setCache, TTL } from "../lib/cache";

// ─── POST /projects/:id/issues ────────────────────────────────────
export const createIssue = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params;
    const { title, description, priority, assigneeId, sprintId } = createIssueSchema.parse(req.body);
    const creatorId = req.user!.id;

    if (!title) {
        throw ApiError.badRequest('Title is required')
    }

    // get the last position in backlog or sprint
    const lastIssue = await prisma.issue.findFirst({
        where: {
            projectId: projectId as string,
            sprintId: sprintId ? sprintId as string : null
        },
        orderBy: {
            position: 'desc'
        }
    })

    const position = lastIssue ? lastIssue.position + 1000 : 1000;

    if (assigneeId) {
        const assigneeMember = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: projectId as string,
                    userId: assigneeId
                }
            }
        })

        if (!assigneeMember) {
            throw ApiError.badRequest('Assignee is not a member of this project')
        }
    }

    const issue = await prisma.issue.create({
        data: {
            title,
            description,
            priority: priority ?? "NO_PRIORITY",
            status: "BACKLOG",
            position,
            projectId: projectId as string,
            creatorId,
            assigneeId,
            sprintId: sprintId ? sprintId as string : null,
        },
        include: {
            assignee: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            },
            creator: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            }
        }
    })

    // in createIssue — after issue created:
    await deleteCache(CacheKeys.board(projectId as string, issue.sprintId ?? null))

    // after issue created:
    await activityQueue.add("activity", {
        action: ActivityActions.ISSUE_CREATED,
        userId: creatorId,
        projectId: projectId as string,
        issueId: issue.id,
        meta: { title: issue.title },
    })

    if (assigneeId) {
        await notificationQueue.add("notification", {
            userId: assigneeId,
            type: NotificationTypes.ISSUE_ASSIGNED,
            content: `You were assigned to: ${title}`,
            link: `/issues/${issue.id}`,
            triggeredBy: creatorId,
        })

        // get assignee email for email notification
        const assignee = await prisma.user.findUnique({
            where: { id: assigneeId },
            select: { email: true, name: true },
        });

        if (assignee) {
            await emailQueue.add("email", {
                to: assignee.email,
                type: NotificationTypes.ISSUE_ASSIGNED,
                data: {
                    assigneeName: assignee.name,
                    issueTitle: title,
                    projectName: projectId,
                    assignedBy: creatorId,
                    issueLink: `${process.env.BASE_WEB_URL}/issues/${issue.id}`,
                },
            })
        }
    }

    // TODO: publish ISSUE_CREATED event to Redis pub/sub → WS broadcasts to clients
    await publishToProject(projectId as string, {
        type: ProjectEvents.ISSUE_CREATED,
        payload: { issue }
    })

    sendSuccess(res, issue, "Issue created successfully")
})

// ─── GET /projects/:id/board ──────────────────────────────────────
export const getBoardIssues = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params

    // get active sprint first
    const activeSprint = await prisma.sprint.findFirst({
        where: {
            projectId: projectId as string,
            status: "ACTIVE"
        }
    })

    // ─── Check cache first ────────────────────────────────────
    const cacheKey = CacheKeys.board(projectId as string, activeSprint?.id ?? null)

    const cached = await getCache(cacheKey)

    if (cached) {
        sendSuccess(res, cached, "Board fetched successfully")
        return
    }

    const issues = await prisma.issue.findMany({
        where: {
            projectId: projectId as string,
            sprintId: activeSprint ? activeSprint.id : null
        },
        include: {
            assignee: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            },
            creator: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            }
        },
        orderBy: {
            position: 'asc'
        }
    })
    const board = {
        activeSprint,
        columns: {
            BACKLOG: issues.filter(issue => issue.status === "BACKLOG"),
            TODO: issues.filter(issue => issue.status === "TODO"),
            IN_PROGRESS: issues.filter(issue => issue.status === "IN_PROGRESS"),
            IN_REVIEW: issues.filter(issue => issue.status === "IN_REVIEW"),
            DONE: issues.filter(issue => issue.status === "DONE")
        }
    }

    // ─── Store in cache ───────────────────────────────────────
    await setCache(cacheKey, board, TTL.BOARD)

    sendSuccess(res, board, "Board fetched successfully")
})

// ─── GET /projects/:id/backlog ────────────────────────────────────
export const getBacklogIssues = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params

    const issues = await prisma.issue.findMany({
        where: {
            projectId: projectId as string,
            sprintId: null
        },
        include: {
            assignee: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            },
            creator: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            }
        },
        orderBy: {
            position: 'asc'
        }
    })
    sendSuccess(res, issues, "Issues fetched successfully")

})

// ─── GET /issues/:id ──────────────────────────────────────────────
export const getIssueById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    const issue = await prisma.issue.findUnique({
        where: {
            id: id as string
        },
        include: {
            assignee: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            },
            creator: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            },
            sprint: {
                select: {
                    id: true,
                    name: true,
                    status: true
                }
            },
            comments: {
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
                    createdAt: "asc"
                }
            },
            activities: {
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
                    createdAt: "desc"
                }
            }
        }
    })

    if (!issue) {
        throw ApiError.notFound('Issue not found')
    }

    sendSuccess(res, issue, "Issue fetched successfully")
})

// ─── PATCH /issues/:id ────────────────────────────────────────────
export const updateIssue = asyncHandler(async (req: Request, res: Response) => {
    const { id, projectId } = req.params
    const { title, description, status, assigneeId, priority } = updateIssueSchema.parse(req.body)

    const issue = await prisma.issue.findUnique({
        where: {
            id: id as string
        }
    })

    if (!issue) {
        throw ApiError.notFound('Issue not found')
    }

    if (assigneeId) {
        const assigneeMember = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: projectId as string,
                    userId: assigneeId
                }
            }
        })

        if (!assigneeMember) {
            throw ApiError.badRequest('Assignee is not a member of this project')
        }
    }

    const updated = await prisma.issue.update({
        where: {
            id: id as string
        },
        data: {
            ...(title && { title }),
            ...(description && { description }),
            ...(status && { status }),
            ...(assigneeId !== undefined && { assigneeId }),
            ...(priority && { priority })
        },
        include: {
            assignee: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            },
            creator: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            }
        }
    })

    // in updateIssue — after issue updated:
    await deleteCache(CacheKeys.board(updated.projectId, updated.sprintId ?? null))

    await activityQueue.add("activity", {
        action: ActivityActions.ISSUE_UPDATED,
        userId: req.user!.id,
        projectId: updated.projectId,
        issueId: id as string,
        meta: { changes: { title, description, priority, assigneeId, status } },
    })

    // if assignee changed — notify them
    if (assigneeId && assigneeId !== issue.assigneeId) {
        const assignee = await prisma.user.findUnique({
            where: { id: assigneeId },
            select: { email: true, name: true },
        });

        await notificationQueue.add("notification", {
            userId: assigneeId,
            type: NotificationTypes.ISSUE_ASSIGNED,
            content: `You were assigned to: ${updated.title}`,
            link: `/issues/${issue.id}`,
            triggeredBy: req.user!.id,
        })

        if (assignee) {
            await emailQueue.add("email", {
                to: assignee.email,
                type: NotificationTypes.ISSUE_ASSIGNED,
                data: {
                    assigneeName: assignee.name,
                    issueTitle: updated.title,
                    projectName: updated.projectId,
                    assignedBy: req.user!.id,
                    issueLink: `${process.env.BASE_WEB_URL}/issues/${id}`,
                }
            })
        }
    }

    // TODO: publish ISSUE_UPDATED event to Redis pub/sub → WS broadcasts
    await publishToProject(issue.projectId, {
        type: ProjectEvents.ISSUE_UPDATED,
        payload: {
            issueId: id,
            changes: {
                title,
                description,
                status,
                assigneeId,
                priority
            }
        }
    })
    sendSuccess(res, updated, "Issue updated successfully")
})

// ─── PATCH /issues/:id/move ───────────────────────────────────────
export const moveIssue = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const { status, position } = moveIssueSchema.parse(req.body)

    const issue = await prisma.issue.findUnique({
        where: {
            id: id as string
        }
    })

    if (!issue) {
        throw ApiError.notFound('Issue not found')
    }

    const updated = await prisma.issue.update({
        where: {
            id: id as string
        },
        data: {
            status,
            position
        }
    })

    await activityQueue.add("activity", {
        action: ActivityActions.ISSUE_STATUS_CHANGED,
        userId: req.user!.id,
        projectId: updated.projectId,
        issueId: id as string,
        meta: { from: issue.status, to: status },
    })

    // TODO: publish ISSUE_MOVED event to Redis pub/sub → WS broadcasts to all clients in room
    await publishToProject(updated.projectId, {
        type: ProjectEvents.ISSUE_MOVED,
        payload: {
            issueId: id,
            newStatus: status,
            newPosition: position
        }
    })

    // ─── Invalidate both old and new locations ────────────────
    const keysToDelete = [
        CacheKeys.board(updated.projectId, issue.sprintId ?? null),
    ]

    if (issue.sprintId !== updated.sprintId) {
        keysToDelete.push(CacheKeys.board(updated.projectId, updated.sprintId ?? null))
    }

    await deleteManyCache(keysToDelete)
    sendSuccess(res, updated, "Issue moved successfully")

})

// ─── PATCH /issues/:id/move-to-sprint ────────────────────────────
export const moveIssueToSprint = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const { sprintId } = moveIssueToSprintSchema.parse(req.body)

    const issue = await prisma.issue.findUnique({
        where: {
            id: id as string
        }
    })

    if (!issue) {
        throw ApiError.notFound('Issue not found')
    }

    if (sprintId) {
        const sprint = await prisma.sprint.findUnique({
            where: {
                id: sprintId as string
            }
        })

        if (!sprint) {
            throw ApiError.notFound('Sprint not found')
        }

        if (sprint.status === "COMPLETED") {
            throw ApiError.badRequest('Cannot move issue to completed sprint')
        }
    }
    const updated = await prisma.issue.update({
        where: {
            id: id as string
        },
        data: {
            sprintId: sprintId as string ?? null,
            status: "BACKLOG"
        }
    })

    // ─── Invalidate old sprint cache + new sprint cache ───────
    const keysToDelete = [
        CacheKeys.board(issue.projectId, issue.sprintId ?? null), // old location
        CacheKeys.board(issue.projectId, sprintId as string ?? null) // new location
    ]

    await deleteManyCache(keysToDelete)

    sendSuccess(res, updated, "Issue moved to sprint successfully")

})

// ─── DELETE /issues/:id ───────────────────────────────────────────
export const deleteIssue = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    const issue = await prisma.issue.findUnique({
        where: {
            id: id as string
        }
    })

    if (!issue) {
        throw ApiError.notFound('Issue not found')
    }

    await prisma.issue.delete({
        where: {
            id: id as string
        }
    })

    // in deleteIssue — after issue deleted:
    await deleteCache(CacheKeys.board(issue.projectId, issue.sprintId ?? null))

    await activityQueue.add('activity', {
        action: ActivityActions.ISSUE_DELETED,
        userId: req.user!.id,
        projectId: issue.projectId,
        issueId: id as string,
        meta: { title: issue.title },
    });

    await publishToProject(issue.projectId, {
        type: ProjectEvents.ISSUE_DELETED,
        payload: {
            issueId: id
        }
    })
    sendNoContent(res)
})