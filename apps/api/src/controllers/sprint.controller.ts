import { Request, Response } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { prisma } from "@devflow/db";
import { sendNoContent, sendSuccess } from "../lib/apiResponse";
import { createSprintSchema, updateSprintSchema } from "@devflow/validators";
import { publishToProject } from "../lib/redis.publisher";
import { activityQueue } from "@devflow/queues";
import { ActivityActions, ProjectEvents } from "@devflow/types";
import { CacheKeys, deleteCache } from "../lib/cache";

// ─── POST /projects/:id/sprints ───────────────────────────────────
export const createSprint = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params;
    const { name, startDate, endDate } = createSprintSchema.parse(req.body);

    const Sprint = await prisma.sprint.create({
        data: {
            name,
            projectId: projectId as string,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            status: "PLANNED"
        }
    });

    sendSuccess(res, Sprint, 'Sprint created successfully')
})

// ─── GET /projects/:id/sprints ────────────────────────────────────
export const getSprints = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params

    const sprints = await prisma.sprint.findMany({
        where: {
            projectId: projectId as string
        },
        include: {
            _count: {
                select: {
                    issues: true
                }
            },
            issues: {
                where: { status: "DONE" },
                select: { id: true }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    const mapped = sprints.map((s) => ({
        ...s,
        doneCount: s.issues.length,
        issues: undefined, // strip the issues array, only needed for count
    }));

    sendSuccess(res, mapped, "Sprints fetched successfully")
})

// ─── GET /sprints/:id ─────────────────────────────────────────────
export const getSprintById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    const sprint = await prisma.sprint.findUnique({
        where: {
            id: id as string
        },
        include: {
            issues: {
                include: {
                    assignee: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            avatarUrl: true
                        }
                    },
                    creator: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            avatarUrl: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            },
            _count: {
                select: {
                    issues: true
                }
            }
        },

    })

    if (!sprint) {
        throw ApiError.notFound('Sprint not found')
    }

    sendSuccess(res, sprint, "Sprint fetched successfully")

})

// ─── PATCH /sprints/:id ───────────────────────────────────────────
export const updateSprint = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const { name, startDate, endDate } = updateSprintSchema.parse(req.body)

    const sprint = await prisma.sprint.findUnique({
        where: {
            id: id as string
        }
    })

    if (!sprint) {
        throw ApiError.notFound('Sprint not found')
    }

    if (sprint.status === "COMPLETED") {
        throw ApiError.badRequest('Cannot update completed sprint')
    }

    const updated = await prisma.sprint.update({
        where: {
            id: id as string
        },
        data: {
            ...(name && { name }),
            ...(startDate && { startDate }),
            ...(endDate && { endDate })
        }
    })

    sendSuccess(res, updated, "Sprint updated successfully")
})

// ─── DELETE /sprints/:id ──────────────────────────────────────────
export const deleteSprint = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    const sprint = await prisma.sprint.findUnique({
        where: {
            id: id as string
        }
    })

    if (!sprint) {
        throw ApiError.notFound('Sprint not found')
    }

    if (sprint.status === "ACTIVE") {
        throw ApiError.badRequest('Cannot delete an active sprint — complete it first')
    }

    //move any issues back to backlog before deleting
    await prisma.issue.updateMany({
        where: {
            sprintId: id as string
        },
        data: {
            sprintId: null,
            status: "BACKLOG"
        }
    })

    await prisma.sprint.delete({
        where: {
            id: id as string
        }
    })

    sendNoContent(res)

})

// ─── POST /sprints/:id/start ──────────────────────────────────────
export const startSprint = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const sprint = await prisma.sprint.findUnique({
        where: {
            id: id as string
        }
    })

    if (!sprint) {
        throw ApiError.notFound('Sprint not found')
    }

    if (sprint.status === "ACTIVE") {
        throw ApiError.badRequest('Sprint is already active')
    }

    if (sprint.status === "COMPLETED") {
        throw ApiError.badRequest('Sprint is already completed')
    }

    // only one active sprint per project at a time

    const activeSprint = await prisma.sprint.findFirst({
        where: {
            projectId: sprint.projectId,
            status: "ACTIVE"
        }
    })

    if (activeSprint) {
        throw ApiError.badRequest('A sprint is already active in this project — complete it first')
    }

    const updated = await prisma.sprint.update({
        where: {
            id: id as string
        },
        data: {
            status: "ACTIVE",
            startDate: sprint?.startDate ?? new Date()
        }
    })

    // in startSprint — after sprint updated:
    await deleteCache(CacheKeys.board(sprint.projectId, id as string))

    // after sprint started:
    await activityQueue.add('activity', {
        action: ActivityActions.SPRINT_STARTED,
        userId: req.user!.id,
        projectId: sprint.projectId,
        meta: { sprintId: id, sprintName: sprint.name },
    });

    // TODO: publish SPRINT_STARTED event to Redis pub/sub → WS broadcasts to clients
    await publishToProject(sprint.projectId, {
        type: ProjectEvents.SPRINT_STARTED,
        payload: { sprintId: id, name: sprint.name }
    })
    sendSuccess(res, updated, "Sprint started successfully")
})

// ─── POST /sprints/:id/complete ───────────────────────────────────
export const completeSprint = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const sprint = await prisma.sprint.findUnique({
        where: {
            id: id as string
        },
        include: {
            issues: true
        }
    })

    if (!sprint) {
        throw ApiError.notFound('Sprint not found')
    }


    if (sprint.status === "COMPLETED") {
        throw ApiError.badRequest('Sprint is already completed')
    }


    await prisma.$transaction(async (tx) => {
        // move incomplete issues back to backlog
        await tx.issue.updateMany({
            where: {
                sprintId: id as string,
                status: {
                    not: "DONE"
                }
            },
            data: {
                status: "BACKLOG",
                sprintId: null
            }
        })

        // mark sprint as completed
        await tx.sprint.update({
            where: {
                id: id as string
            },
            data: {
                status: "COMPLETED",
                endDate: sprint?.endDate ?? new Date()
            }
        })
    })
    // in completeSprint — after transaction:
    await deleteCache(CacheKeys.board(sprint.projectId, id as string))

    const incompleteCount = sprint?.issues.filter(issue => issue.status !== "DONE").length
    const doneCount = sprint?.issues.filter(issue => issue.status === "DONE").length

    await activityQueue.add('activity', {
        action: ActivityActions.SPRINT_COMPLETED,
        userId: req.user!.id,
        projectId: sprint.projectId,
        meta: { sprintId: id, doneCount, incompleteCount },
    });

    // TODO: publish SPRINT_COMPLETED event to Redis pub/sub → WS broadcasts to clients
    await publishToProject(sprint.projectId, {
        type: ProjectEvents.SPRINT_COMPLETED,
        payload: { sprintId: id, incompleteCount, doneCount }
    })
    sendSuccess(res, { sprintId: id, incompleteCount, doneCount, message: `${incompleteCount} issues moved back to backlog`, }, "Sprint completed successfully")
})