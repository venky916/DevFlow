import { Request, Response } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { prisma } from "@devflow/db";
import { sendNoContent, sendSuccess } from "../lib/apiResponse";
import { createIssueSchema, updateIssueSchema, moveIssueSchema, moveIssueToSprintSchema, issueFilterSchema, myIssuesFilterSchema } from "@devflow/validators";
import { CacheKeys, getCache, setCache, TTL } from "../lib/cache";
import { signUrl } from "../lib/signUrl";
import { issueService } from "../services/issue.service";
import { issueInclude } from "../repositories/issue.repository"

// ─── shared filter builder from query params ──────────────────────
function buildFilterWhere(query: Record<string, any>) {
    const filters = issueFilterSchema.parse(query)
    return {
        ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
        ...(filters.type && { type: filters.type }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.status && { status: filters.status }),
        ...(filters.labelId && { labels: { some: { labelId: filters.labelId } } }),
        ...(filters.q?.trim() && {
            title: { contains: filters.q.trim(), mode: "insensitive" as const }
        }),
        ...(filters.noDueDate
            ? { dueDate: null }
            : (filters.dueDateFrom || filters.dueDateTo) && {
                dueDate: {
                    ...(filters.dueDateFrom && { gte: filters.dueDateFrom }),
                    ...(filters.dueDateTo && { lte: filters.dueDateTo }),
                }
            }),
    }
}

// ─── POST /projects/:id/issues ────────────────────────────────────
export const createIssue = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params;
    const input = createIssueSchema.parse(req.body);
    const issue = await issueService.createIssue(projectId as string, req.user!.id, input);
    sendSuccess(res, issue, "Issue created successfully");
})

// ─── GET /projects/:id/issues/search ──────────────────────────────
// mode=child → only issues safe to become a child (no parent, no children of own)
// no mode → default parent-candidate search (just parentId: null) — not used by any UI now, kept for flexibility
export const searchProjectIssues = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params
    const { q, excludeId, mode } = req.query

    const issues = await prisma.issue.findMany({
        where: {
            projectId: projectId as string,
            parentId: null,
            ...(mode === "child" && { children: { none: {} } }),
            ...(excludeId && { id: { not: excludeId as string } }),
            ...(q && {
                title: {
                    contains: q as string,
                    mode: "insensitive"
                }
            })
        },
        select: {
            id: true,
            title: true,
            status: true,
            type: true,
            priority: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 10
    })

    sendSuccess(res, issues, "Issues fetched successfully")
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
            parentId: null,
            NOT: {
                status: "BACKLOG"
            },
            ...filterWhere
        },
        include: {
            ...issueInclude,
            children: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    assignee: { select: { id: true, name: true, avatarUrl: true } }
                },
                orderBy: { position: "asc" }
            }
        },
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
    const filterWhere = buildFilterWhere(req.query)

    const childrenInclude = {
        children: {
            select: {
                id: true, title: true, status: true,
                assignee: { select: { id: true, name: true, avatarUrl: true } }
            },
            orderBy: { position: "asc" as const }
        }
    }

    const sprints = await prisma.sprint.findMany({
        where: {
            projectId: projectId as string,
            status: { not: "COMPLETED" }
        },
        include: {
            issues: {
                where: { parentId: null, ...filterWhere },
                include: { ...issueInclude, ...childrenInclude },
                orderBy: { position: "asc" }
            }
        },
        orderBy: { createdAt: "asc" }
    });

    const backlogIssues = await prisma.issue.findMany({
        where: { projectId: projectId as string, sprintId: null, parentId: null, ...filterWhere },
        include: { ...issueInclude, ...childrenInclude },
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
        }
    })

    if (!issue) {
        throw ApiError.notFound('Issue not found')
    }

    const signedIssue = {
        ...issue,
        assignee: issue.assignee ? { ...issue.assignee, avatarUrl: await signUrl(issue.assignee.avatarUrl) } : null,
        creator: { ...issue.creator, avatarUrl: await signUrl(issue.creator.avatarUrl) },
        attachments: await Promise.all(
            issue.attachments.map(async (a) => ({
                ...a,
                url: (await signUrl(a.url)) ?? a.url,
                uploader: { ...a.uploader, avatarUrl: await signUrl(a.uploader.avatarUrl) },
            })),
        ),
    }

    sendSuccess(res, signedIssue, "Issue fetched successfully")
})

// ─── PATCH /issues/:id ────────────────────────────────────────────
export const updateIssue = asyncHandler(async (req: Request, res: Response) => {
    const { id, projectId } = req.params;
    const input = updateIssueSchema.parse(req.body);
    const access = req.projectAccess!;
    const canAssignAnyone = access.isWorkspaceAdmin || access.projectRole === 'LEAD';
    const isLeadOrAdmin = access.isWorkspaceAdmin || access.projectRole === 'LEAD';

    const updated = await issueService.updateIssue(
        id as string, projectId as string, req.user!.id, input, canAssignAnyone, isLeadOrAdmin
    );
    sendSuccess(res, updated, "Issue updated successfully");
})

// ─── PATCH /issues/:id/move ───────────────────────────────────────
export const moveIssue = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, position } = moveIssueSchema.parse(req.body);
    const updated = await issueService.moveIssue(id as string, req.user!.id, status, position);
    sendSuccess(res, updated, "Issue moved successfully");

})

// ─── PATCH /issues/:id/move-to-sprint ────────────────────────────
export const moveIssueToSprint = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { sprintId, position } = moveIssueToSprintSchema.parse(req.body);
    const result = await issueService.moveIssueToSprint(id as string, sprintId ?? null, position);
    sendSuccess(res, result, "Issue moved to sprint successfully");
})

// ─── POST /issues/:id/children ────────────────────────────────────
export const createSubIssue = asyncHandler(async (req: Request, res: Response) => {
    const { id: parentId } = req.params;
    const input = createIssueSchema.parse(req.body);
    const subIssue = await issueService.createSubIssue(parentId as string, req.user!.id, req.user!.id, input);
    sendSuccess(res, subIssue, "Issue created successfully");
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

// ─── POST /issues/:id/children/attach ─────────────────────────────
// lead/admin only — attaches an EXISTING standalone issue as a child of :id
// called from the PARENT's page only (dev-1's sub-issue search box)
export const attachChildIssue = asyncHandler(async (req: Request, res: Response) => {
    const { id: parentId } = req.params;
    const { issueId: childId } = req.body;
    if (!childId) throw ApiError.badRequest('issueId is required');

    const updated = await issueService.attachChildIssue(parentId as string, childId, req.user!.id);
    sendSuccess(res, updated, "Issue attached as sub-issue");
})

// ─── DELETE /issues/:id/children/:childId ─────────────────────────
// lead/admin only — detaches a child, making it standalone again
// called from the PARENT's page only (dev-1's sub-issue list, X button)
export const detachChildIssue = asyncHandler(async (req: Request, res: Response) => {
    const { id: parentId, childId } = req.params;
    const updated = await issueService.detachChildIssue(parentId as string, childId as string, req.user!.id);
    sendSuccess(res, updated, "Sub-issue detached");
})

// ─── DELETE /issues/:id ───────────────────────────────────────────
export const deleteIssue = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await issueService.deleteIssue(id as string, req.user!.id);
    sendNoContent(res);
})

// ─── GET /my-issues ───────────────────────────────────────────────
export const getMyIssues = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const filters = myIssuesFilterSchema.parse(req.query)

    const issues = await prisma.issue.findMany({
        where: {
            assigneeId: userId,
            ...(filters.projectId && { projectId: filters.projectId }),
            ...(filters.sprintId && { sprintId: filters.sprintId }),
            ...(filters.type && { type: filters.type }),
            ...(filters.priority && { priority: filters.priority }),
            ...(filters.q?.trim() && {
                title: { contains: filters.q.trim(), mode: "insensitive" as const }
            }),
            ...(filters.noDueDate
                ? { dueDate: null }
                : (filters.dueDateFrom || filters.dueDateTo) && {
                    dueDate: {
                        ...(filters.dueDateFrom && { gte: filters.dueDateFrom }),
                        ...(filters.dueDateTo && { lte: filters.dueDateTo }),
                    }
                }),
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