import { Request, Response } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { prisma } from "@devflow/db";
import { sendNoContent, sendSuccess } from "../lib/apiResponse";
import { createSprintSchema, updateSprintSchema } from "@devflow/validators";
import { buildUpdateData } from "../lib/updateBuilder";
import { sprintService } from "../services/sprint.service";

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
        data: buildUpdateData({ name, startDate, endDate })
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
    const updated = await sprintService.startSprint(req.params.id as string, req.user!.id);
    sendSuccess(res, updated, "Sprint started successfully");
})

// ─── POST /sprints/:id/complete ───────────────────────────────────
export const completeSprint = asyncHandler(async (req: Request, res: Response) => {
    const result = await sprintService.completeSprint(req.params.id as string, req.user!.id);
    sendSuccess(res, {
        ...result,
        message: `${result.incompleteCount} issues moved back to backlog`,
    }, "Sprint completed successfully");
})