import { Request, Response } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { IssueStatus, prisma } from "@devflow/db";
import { sendNoContent, sendSuccess } from "../lib/apiResponse";
import { createIssueSchema, updateIssueSchema, moveIssueSchema, moveIssueToSprintSchema, issueFilterSchema } from "@devflow/validators";
import { publishToProject } from "../lib/redis.publisher";
import { notificationQueue, emailQueue } from "@devflow/queues"
import { ActivityActions, NotificationTypes, ProjectEvents } from "@devflow/types";
import { CacheKeys, deleteCache, deleteManyCache, getCache, setCache, TTL } from "../lib/cache";
import { generateKeyBetween } from "fractional-indexing"
import { buildUpdateData } from "../lib/updateBuilder";
import { logActivity } from "../lib/logActivity";

// ─── shared include — used across all issue fetches ───────────────
const issueInclude = {
    assignee: {
        select: {
            id: true,
            name: true,
            avatarUrl: true,
        }
    },
    creator: {
        select: {
            id: true,
            name: true,
            avatarUrl: true
        }
    },
    labels: {
        include: {
            label: true
        }
    }
}

// ─── shared filter builder from query params ──────────────────────
function buildFilterWhere(query: Record<string, any>) {
    const filters = issueFilterSchema.parse(query)
    return {
        ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
        ...(filters.type && { type: filters.type }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.status && { status: filters.status }),
        ...(filters.labelId && { labels: { some: { labelId: filters.labelId } } }),
        ...((filters.dueDateFrom || filters.dueDateTo) && {
            dueDate: {
                ...(filters.dueDateFrom && { gte: filters.dueDateFrom }),
                ...(filters.dueDateTo && { lte: filters.dueDateTo }),
            }
        }),
    }
}

// ─── sync parent status when child changes ────────────────────────
// if all children have the same status → parent auto-updates to match
// if mixed → parent stays as-is
async function syncParentStatus(parentId: string, tx: any) {
    const children = await tx.issue.findMany({
        where: {
            parentId
        },
        select: {
            status: true
        }
    })

    if (children.length === 0) return

    const statuses: IssueStatus[] = children.map((c: { status: IssueStatus }) => c.status)
    const allSame = statuses.every((s: IssueStatus) => s === statuses[0])

    if (allSame) {
        await tx.issue.update({
            where: {
                id: parentId
            },
            data: {
                status: statuses[0]
            }
        })
    }
    // mixed statuses → do nothing, parent stays as-is
}


// ─── notify assignee helper — reused in create + sub-issue ────────
async function notifyAssignee(
    assigneeId: string,
    triggeredBy: string,
    issueId: string,
    issueTitle: string,
    projectId: string
) {
    await notificationQueue.add('notification', {
        userId: assigneeId,
        type: NotificationTypes.ISSUE_ASSIGNED,
        content: `You were assigned to: ${issueTitle}`,
        link: `/issues/${issueId}`,
        triggeredBy,
    })

    const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { email: true, name: true }
    })

    if (assignee) {
        await emailQueue.add("email", {
            to: assignee.email,
            type: NotificationTypes.ISSUE_ASSIGNED,
            data: {
                assigneeName: assignee.name,
                issueTitle,
                projectName: projectId,
                assignedBy: triggeredBy,
                issueLink: `${process.env.BASE_WEB_URL}/issues/${issueId}`,
            }
        })
    }


}

// ─── POST /projects/:id/issues ────────────────────────────────────
export const createIssue = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params;
    const { title, description, priority, type, assigneeId, sprintId, parentId, dueDate, labelIds, status } = createIssueSchema.parse(req.body);
    const creatorId = req.user!.id;

    // validate assignee is project member
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

    // validate parentId — max 1 level deep, no self-reference
    if (parentId) {
        const parent = await prisma.issue.findUnique({
            where: {
                id: parentId
            }
        })

        if (!parent) {
            throw ApiError.badRequest('Parent issue not found')
        }
        if (parent.parentId) {
            throw ApiError.badRequest('Parent issue is already a child of another issue')
        }
        if (parent.projectId !== projectId) throw ApiError.badRequest('Parent must be in same project')
    }

    // validate sprint
    if (sprintId) {
        const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } })
        if (!sprint) throw ApiError.notFound('Sprint not found')
        if (sprint.status === 'COMPLETED') throw ApiError.badRequest('Cannot add issue to a completed sprint')
    }


    // fractional indexing — append after last issue in same bucket
    const lastIssue = await prisma.issue.findFirst({
        where: {
            projectId: projectId as string,
            sprintId: sprintId ? sprintId as string : null,
        },
        orderBy: {
            position: "desc"
        }
    })

    const position = generateKeyBetween(lastIssue?.position ?? null, null)

    const issue = await prisma.$transaction(async (tx) => {
        const created = await tx.issue.create({
            data: {
                title,
                description,
                priority: priority ?? "NO_PRIORITY",
                type: type ?? 'TASK',
                status: status ?? "BACKLOG",
                position,
                dueDate: dueDate ?? null,
                parentId: parentId ?? null,
                projectId: projectId as string,
                creatorId,
                assigneeId,
                sprintId: sprintId ? sprintId as string : null,
            }
        })

        if (labelIds && labelIds.length > 0) {
            await tx.issueLabel.createMany({
                data: labelIds.map(labelId => ({
                    issueId: created.id,
                    labelId: labelId
                }))
            })
        }

        // refetch after labels inserted
        return tx.issue.findUnique({
            where: { id: created.id },
            include: issueInclude
        })
    })

    if (!issue) throw ApiError.internal('Failed to create issue')

    // in createIssue — after issue created:
    await deleteCache(CacheKeys.board(projectId as string, issue.sprintId ?? null))

    // after issue created:
    await logActivity({
        action: ActivityActions.ISSUE_CREATED,
        scope: "ISSUE",
        userId: creatorId,
        projectId: projectId as string,
        issueId: issue.id,
        meta: { title: issue.title },
    })

    if (assigneeId) {
        await notifyAssignee(assigneeId, creatorId, issue.id, title, projectId as string)
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

    // if no active sprint, return empty board immediately
    if (!activeSprint) {
        sendSuccess(res, {
            activeSprint: null,
            columns: {
                TODO: [],
                IN_PROGRESS: [],
                IN_REVIEW: [],
                DONE: []
            }
        }, "Board fetched successfully");
        return;
    }

    const filterWhere = buildFilterWhere(req.query)

    // cache key includes filters so filtered results don't pollute unfiltered cache
    const hasFilters = Object.keys(filterWhere).length > 0
    const cacheKey = CacheKeys.board(projectId as string, activeSprint?.id ?? null)

    if (!hasFilters) {
        const cached = await getCache(cacheKey)
        if (cached) {
            sendSuccess(res, cached, "Board fetched successfully")
            return
        }
    }

    const issues = await prisma.issue.findMany({
        where: {
            projectId: projectId as string,
            sprintId: activeSprint ? activeSprint.id : null,
            NOT: {
                status: "BACKLOG"
            },
            ...filterWhere
        },
        include: issueInclude,
        orderBy: {
            position: 'asc'
        }
    })

    const board = {
        activeSprint,
        columns: {
            TODO: issues.filter(issue => issue.status === "TODO"),
            IN_PROGRESS: issues.filter(issue => issue.status === "IN_PROGRESS"),
            IN_REVIEW: issues.filter(issue => issue.status === "IN_REVIEW"),
            DONE: issues.filter(issue => issue.status === "DONE")
        }
    }

    // ─── Store in cache ───────────────────────────────────────
    if (!hasFilters) {
        await setCache(cacheKey, board, TTL.BOARD)
    }

    sendSuccess(res, board, "Board fetched successfully")
})

// ─── GET /projects/:id/backlog ────────────────────────────────────
export const getBacklogIssues = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params
    const filterWhere = buildFilterWhere(req.query)

    const issues = await prisma.issue.findMany({
        where: {
            projectId: projectId as string,
            sprintId: null,
            ...filterWhere
        },
        include: issueInclude,
        orderBy: {
            position: 'asc'
        }
    })
    sendSuccess(res, issues, "Issues fetched successfully")
})

// ─── GET /projects/:id/backlog/grouped ────────────────────────────
export const getBacklogGrouped = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params;

    const sprints = await prisma.sprint.findMany({
        where: {
            projectId: projectId as string,
            status: { not: "COMPLETED" }
        },
        include: {
            issues: {
                include: issueInclude,
                orderBy: { position: "asc" }
            }
        },
        orderBy: { createdAt: "asc" }
    });

    const backlogIssues = await prisma.issue.findMany({
        where: {
            projectId: projectId as string,
            sprintId: null
        },
        include: issueInclude,
        orderBy: { position: "asc" }
    });

    sendSuccess(res, { sprints, backlogIssues }, "Backlog fetched successfully");
});

// ─── GET /issues/:id ──────────────────────────────────────────────
export const getIssueById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    const issue = await prisma.issue.findUnique({
        where: {
            id: id as string
        },
        include: {
            ...issueInclude,
            sprint: {
                select: {
                    id: true,
                    name: true,
                    status: true
                }
            },
            // sub-issues
            parent: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    type: true,
                    priority: true
                }
            },
            children: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    type: true,
                    priority: true,
                    assignee: {
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
            // attachments
            attachments: {
                include: {
                    uploader: {
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
            comments: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            avatarUrl: true
                        }
                    },
                    attachments: {
                        include: {
                            uploader: {
                                select: {
                                    id: true,
                                    name: true,
                                    avatarUrl: true
                                }
                            }
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
    const { title, description, status, assigneeId, priority, type, dueDate, parentId, labelIds } = updateIssueSchema.parse(req.body)

    const issue = await prisma.issue.findUnique({
        where: {
            id: id as string
        }
    })

    if (!issue) {
        throw ApiError.notFound('Issue not found')
    }

    // validate assignee
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

    // validate parentId
    if (parentId) {
        if (parentId === id) throw ApiError.badRequest('Issue cannot be its own parent')
        const parent = await prisma.issue.findUnique({
            where: {
                id: parentId
            }
        })
        if (!parent) throw ApiError.badRequest('Parent issue not found')
        if (parent.parentId) throw ApiError.badRequest('Cannot nest more than 1 level deep in parent-child relationship')
        if (parent.projectId !== issue.projectId) throw ApiError.badRequest('Parent must be in same project')
    }

    const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.issue.update({
            where: {
                id: id as string
            },
            data: buildUpdateData({ title, description, status, assigneeId, priority, type, dueDate, parentId })
        })

        // replace labels if provided
        if (labelIds !== undefined) {
            await tx.issueLabel.deleteMany({ where: { issueId: id as string } })
            if (labelIds.length > 0) {
                await tx.issueLabel.createMany({
                    data: labelIds.map(labelId => ({ issueId: id as string, labelId }))
                })
            }
        }

        // if child issue and status changed → sync parent status
        if (status && result.parentId) {
            await syncParentStatus(result.parentId, tx)
        }

        return tx.issue.findUnique({ where: { id: id as string }, include: issueInclude })
    })

    if (!updated) {
        throw ApiError.internal('Failed to update issue')
    }

    // in updateIssue — after issue updated:
    await deleteCache(CacheKeys.board(updated.projectId, updated.sprintId ?? null))

    await logActivity({
        action: ActivityActions.ISSUE_UPDATED,
        scope: "ISSUE",
        userId: req.user!.id,
        projectId: updated.projectId,
        issueId: id as string,
        meta: { changes: { title, description, priority, type, assigneeId, status, dueDate } },
    })

    // if assignee changed — notify them
    if (assigneeId && assigneeId !== issue.assigneeId) {
        await notifyAssignee(assigneeId, req.user!.id, issue.id, updated.title, updated.projectId)
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
                priority,
                type
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

    const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.issue.update({
            where: {
                id: id as string
            },
            data: {
                status,
                position
            }
        })

        // sync parent status if this is a child issue
        if (result.parentId) {
            await syncParentStatus(result.parentId, tx)
        }
        return result
    })

    await logActivity({
        action: ActivityActions.ISSUE_STATUS_CHANGED,
        scope: "ISSUE",
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
    let targetSprint = null
    let newStatus = issue.status

    if (sprintId) {
        targetSprint = await prisma.sprint.findUnique({
            where: {
                id: sprintId as string
            }
        })

        if (!targetSprint) {
            throw ApiError.notFound('Sprint not found')
        }

        if (targetSprint.status === "COMPLETED") {
            throw ApiError.badRequest('Cannot move issue to completed sprint')
        }

        // auto-promote BACKLOG → TODO when moved to active sprint
        if (targetSprint.status === "ACTIVE" && issue.status === "BACKLOG") {
            newStatus = "TODO"
        }
    }

    await prisma.$transaction(async (tx) => {
        // move parent issue
        await tx.issue.update({
            where: {
                id: id as string
            },
            data: {
                sprintId: sprintId as string ?? null,
                status: newStatus
            }
        })

        // children follow parent to same sprint
        // if new sprint is active and child is BACKLOG → promote to TODO
        const children = await tx.issue.findMany({
            where: {
                parentId: id as string
            },
            select: {
                id: true,
                status: true
            }
        })

        if (children.length > 0) {
            for (const child of children) {
                // use targetSprint status directly — not parent's newStatus
                const childStatus =
                    targetSprint?.status === 'ACTIVE' && child.status === 'BACKLOG'
                        ? 'TODO'
                        : child.status
                await tx.issue.update({
                    where: {
                        id: child.id
                    },
                    data: {
                        sprintId: sprintId as string ?? null,
                        status: childStatus
                    }
                })
            }
        }
    })

    // ─── Invalidate old sprint cache + new sprint cache ───────
    const keysToDelete = [
        CacheKeys.board(issue.projectId, issue.sprintId ?? null), // old location
        CacheKeys.board(issue.projectId, sprintId as string ?? null) // new location
    ]

    await deleteManyCache(keysToDelete)

    sendSuccess(res, { message: 'Issue moved to sprint successfully' }, "Issue moved to sprint successfully")

})

// ─── POST /issues/:id/children ────────────────────────────────────
export const createSubIssue = asyncHandler(async (req: Request, res: Response) => {
    const { id: parentId } = req.params;
    const { title, description, priority, type, assigneeId, dueDate, labelIds } = createIssueSchema.parse(req.body);
    const creatorId = req.user!.id

    const parent = await prisma.issue.findUnique({
        where: {
            id: parentId as string
        }
    })

    if (!parent) {
        throw ApiError.notFound('Parent issue not found')
    }
    if (parent.parentId) {
        throw ApiError.badRequest('Cannot nest more than 1 level deep')
    }
    if (parent.status === "DONE") {
        throw ApiError.badRequest('Cannot add sub-issue to completed issue')
    }

    // validate assignee
    if (assigneeId) {
        const assigneeMember = await prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId: parent.projectId, userId: assigneeId } }
        })

        if (!assigneeMember) {
            throw ApiError.notFound('Assignee is not a member of this project')
        }
    }

    // check parent's sprint state
    let initialStatus: IssueStatus = IssueStatus.BACKLOG

    if (parent.sprintId) {
        const parentSprint = await prisma.sprint.findUnique({
            where: {
                id: parent.sprintId as string
            }
        })

        if (parentSprint?.status === "COMPLETED") {
            throw ApiError.badRequest('Cannot add sub-issue to completed sprint')
        }

        if (parentSprint?.status === "ACTIVE") {
            initialStatus = IssueStatus.TODO
        }
    }

    const lastChild = await prisma.issue.findFirst({
        where: {
            parentId: parentId as string
        },
        orderBy: {
            position: 'desc'
        }
    })

    const position = generateKeyBetween(lastChild?.position ?? null, null)

    const subIssue = await prisma.$transaction(async (tx) => {
        const created = await tx.issue.create({
            data: {
                title,
                description,
                priority: priority ?? "NO_PRIORITY",
                type: type ?? 'TASK',
                status: initialStatus,
                position,
                dueDate: dueDate ?? null,
                parentId: parentId as string,
                projectId: parent.projectId,
                sprintId: parent.sprintId ?? null,
                creatorId,
                assigneeId,
            }
        })

        if (labelIds && labelIds.length > 0) {
            await tx.issueLabel.createMany({
                data: labelIds.map(labelId => ({
                    issueId: created.id,
                    labelId: labelId
                }))
            })
        }

        return tx.issue.findUnique({ where: { id: created.id }, include: issueInclude })
    })

    if (!subIssue) {
        throw ApiError.internal('Failed to create sub issue')
    }

    await logActivity({
        action: ActivityActions.ISSUE_CREATED,
        scope: "ISSUE",
        userId: creatorId,
        projectId: parent.projectId,
        issueId: subIssue.id,
        meta: { title: subIssue.title },
    });

    if (assigneeId) {
        await notifyAssignee(assigneeId, req.user!.id, subIssue.id, subIssue.title, subIssue.projectId)
    }

    await publishToProject(parent.projectId, {
        type: ProjectEvents.ISSUE_CREATED,
        payload: {
            issueId: subIssue.id
        }
    })

    sendSuccess(res, subIssue, "Issue created successfully")
})

// ─── GET /issues/: id / children ─────────────────────────────────────
export const getSubIssues = asyncHandler(async (req: Request, res: Response) => {
    const { id: parentId } = req.params

    const parent = await prisma.issue.findUnique({
        where: {
            id: parentId as string
        }
    })

    if (!parent) {
        throw ApiError.notFound('Parent issue not found')
    }

    const children = await prisma.issue.findMany({
        where: {
            parentId: parentId as string
        },
        include: issueInclude,
        orderBy: {
            position: 'asc'
        }
    })

    sendSuccess(res, children, "Sub-issues fetched successfully")
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

    // block deletion if issue has children
    const childCount = await prisma.issue.count({
        where: {
            parentId: id as string
        }
    })


    if (childCount > 0) {
        throw ApiError.badRequest('Delete all sub-issues before deleting this issue')
    }

    await prisma.issue.delete({
        where: {
            id: id as string
        }
    })

    // if this was a child, sync parent status after deletion
    if (issue.parentId) {
        await syncParentStatus(issue.parentId, prisma)
    }

    // in deleteIssue — after issue deleted:
    await deleteCache(CacheKeys.board(issue.projectId, issue.sprintId ?? null))

    await logActivity({
        action: ActivityActions.ISSUE_DELETED,
        scope: "ISSUE",
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

// ─── GET /my-issues ───────────────────────────────────────────────
export const getMyIssues = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const issues = await prisma.issue.findMany({
        where: {
            assigneeId: userId
        },
        include: {
            ...issueInclude,
            project: {
                select: {
                    id: true, name: true, slug: true, workspace: {
                        select: {
                            id: true,
                            slug: true
                        }
                    }
                }
            },
            sprint: { select: { id: true, name: true, status: true } },
            parent: {
                select: {
                    id: true,
                    title: true
                }
            }
        },
        orderBy: { updatedAt: "desc" }
    });

    const columns = {
        BACKLOG: issues.filter(i => i.status === "BACKLOG"),
        TODO: issues.filter(i => i.status === "TODO"),
        IN_PROGRESS: issues.filter(i => i.status === "IN_PROGRESS"),
        IN_REVIEW: issues.filter(i => i.status === "IN_REVIEW"),
        DONE: issues.filter(i => i.status === "DONE"),
    };

    sendSuccess(res, { columns }, "My issues fetched successfully");
});