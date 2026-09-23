import { Request, Response } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { prisma } from "@devflow/db";
import { sendNoContent, sendPaginated, sendSuccess } from "../lib/apiResponse";
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
const signBoardUrls = async (board: any) => {
    const signedColumns = await Promise.all(
        Object.entries(board.columns).map(async ([status, issues]: [string, any]) => {
            const signedIssues = await Promise.all(
                issues.map(async (issue: any) => ({
                    ...issue,

                    assignee: issue.assignee
                        ? {
                            ...issue.assignee,
                            avatarUrl: issue.assignee.avatarUrl
                                ? await signUrl(issue.assignee.avatarUrl)
                                : null
                        }
                        : null,

                    children: await Promise.all(
                        (issue.children ?? []).map(async (child: any) => ({
                            ...child,

                            assignee: child.assignee
                                ? {
                                    ...child.assignee,
                                    avatarUrl: child.assignee.avatarUrl
                                        ? await signUrl(child.assignee.avatarUrl)
                                        : null
                                }
                                : null
                        }))
                    )
                }))
            );

            return [status, signedIssues];
        })
    );

    return {
        ...board,
        columns: Object.fromEntries(signedColumns)
    };
};

export const getBoardIssues = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params;

    // Get active sprint first
    const activeSprint = await prisma.sprint.findFirst({
        where: {
            projectId: projectId as string,
            status: "ACTIVE"
        }
    });

    // If no active sprint, return empty board immediately
    if (!activeSprint) {
        sendSuccess(
            res,
            {
                activeSprint: null,
                columns: {
                    TODO: [],
                    IN_PROGRESS: [],
                    IN_REVIEW: [],
                    DONE: []
                }
            },
            "Board fetched successfully"
        );
        return;
    }

    const filterWhere = buildFilterWhere(req.query);

    // Cache key includes filters so filtered results don't pollute unfiltered cache
    const hasFilters = Object.keys(filterWhere).length > 0;
    const cacheKey = CacheKeys.board(
        projectId as string,
        activeSprint?.id ?? null
    );

    // ─── Check cache ──────────────────────────────────────────
    if (!hasFilters) {
        const cached = await getCache(cacheKey);

        if (cached) {
            const signedBoard = await signBoardUrls(cached);

            sendSuccess(
                res,
                signedBoard,
                "Board fetched successfully"
            );
            return;
        }
    }

    // ─── Fetch issues ─────────────────────────────────────────
    const issues = await prisma.issue.findMany({
        where: {
            projectId: projectId as string,
            sprintId: activeSprint.id,
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
                    assignee: {
                        select: {
                            id: true,
                            name: true,
                            avatarUrl: true
                        }
                    }
                },
                orderBy: {
                    position: "asc"
                }
            }
        },
        orderBy: {
            position: "asc"
        }
    });

    const board = {
        activeSprint,
        columns: {
            TODO: issues.filter(issue => issue.status === "TODO"),
            IN_PROGRESS: issues.filter(issue => issue.status === "IN_PROGRESS"),
            IN_REVIEW: issues.filter(issue => issue.status === "IN_REVIEW"),
            DONE: issues.filter(issue => issue.status === "DONE")
        }
    };

    // ─── Store raw URLs in cache ───────────────────────────────
    // Signed URLs expire, so never cache signed URLs.
    if (!hasFilters) {
        await setCache(cacheKey, board, TTL.BOARD);
    }

    // ─── Sign avatar URLs only for response ────────────────────
    const signedBoard = await signBoardUrls(board);

    sendSuccess(
        res,
        signedBoard,
        "Board fetched successfully"
    );
});

// whitelist — never let sortBy be an arbitrary user-supplied column name (injection/error surface)
const LIST_SORTABLE_FIELDS = ["position", "priority", "dueDate", "createdAt", "updatedAt", "title", "status"] as const
type ListSortField = typeof LIST_SORTABLE_FIELDS[number]

// ─── GET /projects/:id/issues/list ────────────────────────────────
// flat, paginated view of active sprint's issues (list-view toggle, TanStack Table)
export const getListIssues = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25))
    const skip = (page - 1) * limit

    const sortBy: ListSortField = LIST_SORTABLE_FIELDS.includes(req.query.sortBy as ListSortField)
        ? (req.query.sortBy as ListSortField)
        : "position"
    const sortOrder: "asc" | "desc" = req.query.sortOrder === "desc" ? "desc" : "asc"

    const activeSprint = await prisma.sprint.findFirst({
        where: {
            projectId: projectId as string,
            status: "ACTIVE"
        }
    })

    if (!activeSprint) {
        sendPaginated(res, [], { total: 0, page, limit, hasMore: false })
        return
    }

    const filterWhere = buildFilterWhere(req.query)
    const hasFilters = Object.keys(filterWhere).length > 0

    const isDefaultSort = sortBy === "position" && sortOrder === "asc"
    const cacheable = !hasFilters && isDefaultSort
    const cacheKey = CacheKeys.list(projectId as string, activeSprint.id, page, limit)

    if (cacheable) {
        const cached = await getCache(cacheKey)

        if (cached) {
            const cachedIssues = (cached as any).issues

            const signedIssues = await Promise.all(
                cachedIssues.map(async (issue: any) => ({
                    ...issue,
                    assignee: issue.assignee
                        ? {
                            ...issue.assignee,
                            avatarUrl: await signUrl(issue.assignee.avatarUrl)
                        }
                        : null,
                    children: await Promise.all(
                        (issue.children ?? []).map(async (child: any) => ({
                            ...child,
                            assignee: child.assignee
                                ? {
                                    ...child.assignee,
                                    avatarUrl: await signUrl(child.assignee.avatarUrl)
                                }
                                : null
                        }))
                    )
                }))
            )

            sendPaginated(res, signedIssues, (cached as any).meta)
            return
        }
    }

    const where = {
        projectId: projectId as string,
        sprintId: activeSprint.id,
        parentId: null,
        NOT: {
            status: "BACKLOG" as const
        },
        ...filterWhere
    }

    const [issues, total] = await Promise.all([
        prisma.issue.findMany({
            where,
            include: {
                ...issueInclude,
                children: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        assignee: {
                            select: {
                                id: true,
                                name: true,
                                avatarUrl: true
                            }
                        }
                    },
                    orderBy: { position: "asc" }
                }
            },
            orderBy: { [sortBy]: sortOrder },
            skip,
            take: limit
        }),
        prisma.issue.count({ where })
    ])

    const meta = {
        total,
        page,
        limit,
        hasMore: skip + issues.length < total
    }

    if (cacheable) {
        await setCache(cacheKey, { issues, meta }, TTL.BOARD)
    }

    const signedIssues = await Promise.all(
        issues.map(async (issue) => ({
            ...issue,
            assignee: issue.assignee
                ? {
                    ...issue.assignee,
                    avatarUrl: await signUrl(issue.assignee.avatarUrl)
                }
                : null,
            children: await Promise.all(
                issue.children.map(async (child) => ({
                    ...child,
                    assignee: child.assignee
                        ? {
                            ...child.assignee,
                            avatarUrl: await signUrl(child.assignee.avatarUrl)
                        }
                        : null
                }))
            )
        }))
    )

    sendPaginated(res, signedIssues, meta)
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
    const filterWhere = buildFilterWhere(req.query);

    const childrenInclude = {
        children: {
            select: {
                id: true,
                title: true,
                status: true,
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: {
                position: "asc" as const
            }
        }
    };

    const sprints = await prisma.sprint.findMany({
        where: {
            projectId: projectId as string,
            status: {
                not: "COMPLETED"
            }
        },
        include: {
            issues: {
                where: {
                    parentId: null,
                    ...filterWhere
                },
                include: {
                    ...issueInclude,
                    ...childrenInclude
                },
                orderBy: {
                    position: "asc"
                }
            }
        },
        orderBy: {
            createdAt: "asc"
        }
    });

    const backlogIssues = await prisma.issue.findMany({
        where: {
            projectId: projectId as string,
            sprintId: null,
            parentId: null,
            ...filterWhere
        },
        include: {
            ...issueInclude,
            ...childrenInclude
        },
        orderBy: {
            position: "asc"
        }
    });

    // ─── Sign avatar URLs before sending response ──────────────

    const signIssueAvatars = async (issue: any) => ({
        ...issue,

        assignee: issue.assignee
            ? {
                ...issue.assignee,
                avatarUrl: issue.assignee.avatarUrl
                    ? await signUrl(issue.assignee.avatarUrl)
                    : null
            }
            : null,

        children: await Promise.all(
            (issue.children ?? []).map(async (child: any) => ({
                ...child,

                assignee: child.assignee
                    ? {
                        ...child.assignee,
                        avatarUrl: child.assignee.avatarUrl
                            ? await signUrl(child.assignee.avatarUrl)
                            : null
                    }
                    : null
            }))
        )
    });

    const signedSprints = await Promise.all(
        sprints.map(async (sprint) => ({
            ...sprint,
            issues: await Promise.all(
                sprint.issues.map(signIssueAvatars)
            )
        }))
    );

    const signedBacklogIssues = await Promise.all(
        backlogIssues.map(signIssueAvatars)
    );

    sendSuccess(
        res,
        {
            sprints: signedSprints,
            backlogIssues: signedBacklogIssues
        },
        "Backlog fetched successfully"
    );
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

// ─── shared filter builder for /my-issues ─────────────────────────
function buildMyIssuesFilterWhere(userId: string, query: Record<string, any>) {
    const filters = myIssuesFilterSchema.parse(query)
    return {
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
    }
}

const myIssuesInclude = {
    ...issueInclude,
    project: {
        select: {
            id: true, name: true, slug: true, workspace: {
                select: { id: true, slug: true }
            }
        }
    },
    sprint: { select: { id: true, name: true, status: true } },
    parent: { select: { id: true, title: true } }
}

// ─── GET /my-issues/board ──────────────────────────────────────────
export const getMyIssuesBoard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const where = buildMyIssuesFilterWhere(userId, req.query)

    // only cache the unfiltered default view — same reasoning as project board
    const { assigneeId, ...restFilters } = where as any
    const hasFilters = Object.keys(restFilters).length > 0
    const cacheKey = CacheKeys.myIssuesBoard(userId)

    if (!hasFilters) {
        const cached = await getCache(cacheKey)
        if (cached) {
            sendSuccess(res, cached, "My issues fetched successfully")
            return
        }
    }

    const issues = await prisma.issue.findMany({
        where,
        include: myIssuesInclude,
        orderBy: { updatedAt: "desc" }
    });

    const columns = {
        BACKLOG: issues.filter(i => i.status === "BACKLOG"),
        TODO: issues.filter(i => i.status === "TODO"),
        IN_PROGRESS: issues.filter(i => i.status === "IN_PROGRESS"),
        IN_REVIEW: issues.filter(i => i.status === "IN_REVIEW"),
        DONE: issues.filter(i => i.status === "DONE"),
    };

    if (!hasFilters) {
        await setCache(cacheKey, { columns }, TTL.BOARD)
    }

    sendSuccess(res, { columns }, "My issues fetched successfully");
});

// ─── GET /my-issues/list ────────────────────────────────────────────
const MY_ISSUES_SORTABLE_FIELDS = ["updatedAt", "createdAt", "priority", "dueDate", "title", "status"] as const
type MyIssuesSortField = typeof MY_ISSUES_SORTABLE_FIELDS[number]

export const getMyIssuesList = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25))
    const skip = (page - 1) * limit

    const sortBy: MyIssuesSortField = MY_ISSUES_SORTABLE_FIELDS.includes(req.query.sortBy as MyIssuesSortField)
        ? (req.query.sortBy as MyIssuesSortField)
        : "updatedAt"
    const sortOrder: "asc" | "desc" = req.query.sortOrder === "asc" ? "asc" : "desc"

    const where = buildMyIssuesFilterWhere(userId, req.query)
    const { assigneeId, ...restFilters } = where as any
    const hasFilters = Object.keys(restFilters).length > 0
    const isDefaultSort = sortBy === "updatedAt" && sortOrder === "desc"
    const cacheable = !hasFilters && isDefaultSort && page === 1
    const cacheKey = CacheKeys.myIssuesList(userId, page, limit)

    if (cacheable) {
        const cached = await getCache(cacheKey)
        if (cached) {
            sendPaginated(res, (cached as any).issues, (cached as any).meta)
            return
        }
    }

    const [issues, total] = await Promise.all([
        prisma.issue.findMany({
            where,
            include: myIssuesInclude,
            orderBy: { [sortBy]: sortOrder },
            skip,
            take: limit
        }),
        prisma.issue.count({ where })
    ])

    const meta = { total, page, limit, hasMore: skip + issues.length < total }

    if (cacheable) {
        await setCache(cacheKey, { issues, meta }, TTL.BOARD)
    }

    sendPaginated(res, issues, meta)
});