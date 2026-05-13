import { Request, Response } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { prisma } from "@devflow/db";
import { sendNoContent, sendSuccess } from "../lib/apiResponse";
import { createIssueSchema, updateIssueSchema, moveIssueSchema, moveIssueToSprintSchema } from "@devflow/validators";
import { publishToProject } from "../lib/redis.publisher";

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

    // TODO: publish ISSUE_CREATED event to Redis pub/sub → WS broadcasts to clients
    await publishToProject(projectId as string, {
        type: "ISSUE_CREATED",
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
    const { id } = req.params
    const { title, description, status, assigneeId, priority } = updateIssueSchema.parse(req.body)

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

    // TODO: publish ISSUE_UPDATED event to Redis pub/sub → WS broadcasts
    await publishToProject(issue.projectId, {
        type: "ISSUE_UPDATED",
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

    // TODO: publish ISSUE_MOVED event to Redis pub/sub → WS broadcasts to all clients in room
    await publishToProject(updated.projectId, {
        type: "ISSUE_MOVED",
        payload: {
            issueId: id,
            newStatus: status,
            newPosition: position
        }
    })
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

    await publishToProject(issue.projectId, {
        type: "ISSUE_DELETED",
        payload: {
            issueId: id
        }
    })
    sendNoContent(res)
})