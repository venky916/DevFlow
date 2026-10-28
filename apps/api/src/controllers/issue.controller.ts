import { Request, Response } from 'express';

import { prisma } from '@devflow/db';
import {
  attachChildSchema,
  createIssueSchema,
  createSubIssueSchema,
  issueFilterSchema,
  moveIssueSchema,
  moveIssueToSprintSchema,
  myIssuesFilterSchema,
  updateIssueSchema,
} from '@devflow/validators';

import { ApiError } from '../lib/ApiError';
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from '../lib/apiResponse';
import { asyncHandler } from '../lib/asyncHandler';
import { CacheKeys, getCache, setCache, TTL } from '../lib/cache';
import { getIssueActor } from '../lib/issue-rules';
import { serializeIssue } from '../lib/issue-serializer';
import { childrenInclude, issueInclude } from '../repositories/issue.repository';
import { issueService } from '../services/issue.service';

// same position twice must never swap places randomly, so id breaks ties
const POSITION_ORDER = [{ position: 'asc' as const }, { id: 'asc' as const }];
const CARD_INCLUDE = { ...issueInclude, ...childrenInclude };

// ─── shared filter builder from query params ──────────────────────
function buildFilterWhere(query: Record<string, any>) {
  const filters = issueFilterSchema.parse(query);
  return {
    ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
    ...(filters.type && { type: filters.type }),
    ...(filters.priority && { priority: filters.priority }),
    ...(filters.status && { status: filters.status }),
    ...(filters.labelId && { labels: { some: { labelId: filters.labelId } } }),
    ...(filters.q?.trim() && {
      title: { contains: filters.q.trim(), mode: 'insensitive' as const },
    }),
    ...(filters.noDueDate
      ? { dueDate: null }
      : (filters.dueDateFrom || filters.dueDateTo) && {
          dueDate: {
            ...(filters.dueDateFrom && { gte: filters.dueDateFrom }),
            ...(filters.dueDateTo && { lte: filters.dueDateTo }),
          },
        }),
  };
}

// ─── POST /projects/:id/issues ────────────────────────────────────
export const createIssue = asyncHandler(async (req: Request, res: Response) => {
  const { id: projectId } = req.params;
  const input = createIssueSchema.parse(req.body);
  const actor = getIssueActor(req.user!.id, req.projectAccess!);
  const issue = await issueService.createIssue(projectId as string, actor, input);
  sendCreated(res, issue, 'Issue created successfully');
});

// ─── GET /projects/:id/issues/search ──────────────────────────────
// mode=child → only issues safe to become a child (no parent, no children of own)
export const searchProjectIssues = asyncHandler(async (req: Request, res: Response) => {
  const { id: projectId } = req.params;
  const { q, excludeId, mode } = req.query;

  const issues = await prisma.issue.findMany({
    where: {
      projectId: projectId as string,
      parentId: null,
      ...(mode === 'child' && { children: { none: {} } }),
      ...(excludeId && { id: { not: excludeId as string } }),
      ...(q && {
        title: {
          contains: q as string,
          mode: 'insensitive',
        },
      }),
    },
    select: {
      id: true,
      title: true,
      status: true,
      type: true,
      priority: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  sendSuccess(res, issues, 'Issues fetched successfully');
});

// ─── GET /projects/:id/issues/board ───────────────────────────────
export const getBoardIssues = asyncHandler(async (req: Request, res: Response) => {
  const { id: projectId } = req.params;

  const activeSprint = await prisma.sprint.findFirst({
    where: { projectId: projectId as string, status: 'ACTIVE' },
  });

  // no active sprint: empty board
  if (!activeSprint) {
    sendSuccess(
      res,
      { activeSprint: null, columns: { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] } },
      'Board fetched successfully',
    );
    return;
  }

  const filterWhere = buildFilterWhere(req.query);

  // only the unfiltered board is cached
  const hasFilters = Object.keys(filterWhere).length > 0;
  const cacheKey = CacheKeys.board(projectId as string, activeSprint.id);

  if (!hasFilters) {
    const cached = await getCache(cacheKey);
    if (cached) {
      sendSuccess(res, cached, 'Board fetched successfully');
      return;
    }
  }

  // sub-issues are not cards: they appear inside their parent's card
  const rows = await prisma.issue.findMany({
    where: {
      projectId: projectId as string,
      sprintId: activeSprint.id,
      parentId: null,
      NOT: { status: 'BACKLOG' },
      ...filterWhere,
    },
    include: CARD_INCLUDE,
    orderBy: POSITION_ORDER,
  });
  const issues = rows.map(serializeIssue);

  const board = {
    activeSprint,
    columns: {
      TODO: issues.filter((issue) => issue.status === 'TODO'),
      IN_PROGRESS: issues.filter((issue) => issue.status === 'IN_PROGRESS'),
      IN_REVIEW: issues.filter((issue) => issue.status === 'IN_REVIEW'),
      DONE: issues.filter((issue) => issue.status === 'DONE'),
    },
  };

  if (!hasFilters) {
    await setCache(cacheKey, board, TTL.BOARD);
  }

  sendSuccess(res, board, 'Board fetched successfully');
});

// whitelist — never let sortBy be an arbitrary user-supplied column name
const LIST_SORTABLE_FIELDS = [
  'position',
  'priority',
  'dueDate',
  'createdAt',
  'updatedAt',
  'title',
  'status',
] as const;
type ListSortField = (typeof LIST_SORTABLE_FIELDS)[number];

// ─── GET /projects/:id/issues/list ────────────────────────────────
// flat, paginated view of the active sprint's issues (not cached: the query is cheap)
export const getListIssues = asyncHandler(async (req: Request, res: Response) => {
  const { id: projectId } = req.params;

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
  const skip = (page - 1) * limit;

  const sortBy: ListSortField = LIST_SORTABLE_FIELDS.includes(req.query.sortBy as ListSortField)
    ? (req.query.sortBy as ListSortField)
    : 'position';
  const sortOrder: 'asc' | 'desc' = req.query.sortOrder === 'desc' ? 'desc' : 'asc';

  const activeSprint = await prisma.sprint.findFirst({
    where: { projectId: projectId as string, status: 'ACTIVE' },
  });

  if (!activeSprint) {
    sendPaginated(res, [], { total: 0, page, limit, hasMore: false });
    return;
  }

  const filterWhere = buildFilterWhere(req.query);

  const where = {
    projectId: projectId as string,
    sprintId: activeSprint.id,
    parentId: null,
    NOT: { status: 'BACKLOG' as const },
    ...filterWhere,
  };

  const [rows, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      include: CARD_INCLUDE,
      orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' as const }],
      skip,
      take: limit,
    }),
    prisma.issue.count({ where }),
  ]);

  sendPaginated(res, rows.map(serializeIssue), {
    total,
    page,
    limit,
    hasMore: skip + rows.length < total,
  });
});

// ─── GET /projects/:id/issues/backlog ─────────────────────────────
export const getBacklogIssues = asyncHandler(async (req: Request, res: Response) => {
  const { id: projectId } = req.params;
  const filterWhere = buildFilterWhere(req.query);

  const rows = await prisma.issue.findMany({
    where: { projectId: projectId as string, sprintId: null, ...filterWhere },
    include: issueInclude,
    orderBy: POSITION_ORDER,
  });
  sendSuccess(res, rows.map(serializeIssue), 'Issues fetched successfully');
});

// ─── GET /projects/:id/issues/backlog/grouped ─────────────────────
export const getBacklogGrouped = asyncHandler(async (req: Request, res: Response) => {
  const { id: projectId } = req.params;
  const filterWhere = buildFilterWhere(req.query);

  const sprints = await prisma.sprint.findMany({
    where: { projectId: projectId as string, status: { not: 'COMPLETED' } },
    include: {
      issues: {
        where: { parentId: null, ...filterWhere },
        include: CARD_INCLUDE,
        orderBy: POSITION_ORDER,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const backlogIssues = await prisma.issue.findMany({
    where: { projectId: projectId as string, sprintId: null, parentId: null, ...filterWhere },
    include: CARD_INCLUDE,
    orderBy: POSITION_ORDER,
  });

  sendSuccess(
    res,
    {
      sprints: sprints.map((sprint) => ({ ...sprint, issues: sprint.issues.map(serializeIssue) })),
      backlogIssues: backlogIssues.map(serializeIssue),
    },
    'Backlog fetched successfully',
  );
});

// ─── GET /issues/:id ──────────────────────────────────────────────
export const getIssueById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const issue = await prisma.issue.findUnique({
    where: { id: id as string },
    include: {
      ...issueInclude,
      sprint: { select: { id: true, name: true, status: true } },
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
          workspace: { select: { id: true, slug: true } },
        },
      },
      parent: { select: { id: true, title: true, status: true, type: true, priority: true } },
      children: {
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          priority: true,
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      attachments: {
        include: { uploader: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!issue) {
    throw ApiError.notFound('Issue not found');
  }

  sendSuccess(res, serializeIssue(issue), 'Issue fetched successfully');
});

// ─── PATCH /issues/:id ────────────────────────────────────────────
export const updateIssue = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = updateIssueSchema.parse(req.body);
  const actor = getIssueActor(req.user!.id, req.projectAccess!);

  const updated = await issueService.updateIssue(id as string, actor, input);
  sendSuccess(res, updated, 'Issue updated successfully');
});

// ─── PATCH /issues/:id/move ───────────────────────────────────────
export const moveIssue = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, position } = moveIssueSchema.parse(req.body);
  const updated = await issueService.moveIssue(id as string, req.user!.id, status, position);
  sendSuccess(res, updated, 'Issue moved successfully');
});

// ─── PATCH /issues/:id/move-to-sprint ────────────────────────────
export const moveIssueToSprint = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sprintId, position } = moveIssueToSprintSchema.parse(req.body);
  const result = await issueService.moveIssueToSprint(id as string, sprintId ?? null, position);
  sendSuccess(res, result, 'Issue moved to sprint successfully');
});

// ─── POST /issues/:id/children ────────────────────────────────────
export const createSubIssue = asyncHandler(async (req: Request, res: Response) => {
  const { id: parentId } = req.params;
  const input = createSubIssueSchema.parse(req.body);
  const actor = getIssueActor(req.user!.id, req.projectAccess!);
  const subIssue = await issueService.createSubIssue(parentId as string, actor, input);
  sendCreated(res, subIssue, 'Issue created successfully');
});

// ─── GET /issues/:id/children ─────────────────────────────────────
export const getSubIssues = asyncHandler(async (req: Request, res: Response) => {
  const { id: parentId } = req.params;

  const parent = await prisma.issue.findUnique({ where: { id: parentId as string } });
  if (!parent) {
    throw ApiError.notFound('Parent issue not found');
  }

  const children = await prisma.issue.findMany({
    where: { parentId: parentId as string },
    include: issueInclude,
    orderBy: POSITION_ORDER,
  });

  sendSuccess(res, children.map(serializeIssue), 'Sub-issues fetched successfully');
});

// ─── POST /issues/:id/children/attach ─────────────────────────────
// lead/admin only. Attaches an EXISTING standalone issue as a child of :id.
export const attachChildIssue = asyncHandler(async (req: Request, res: Response) => {
  const { id: parentId } = req.params;
  const { issueId: childId } = attachChildSchema.parse(req.body);

  const updated = await issueService.attachChildIssue(parentId as string, childId, req.user!.id);
  sendSuccess(res, updated, 'Issue attached as sub-issue');
});

// ─── DELETE /issues/:id/children/:childId ─────────────────────────
export const detachChildIssue = asyncHandler(async (req: Request, res: Response) => {
  const { id: parentId, childId } = req.params;
  const updated = await issueService.detachChildIssue(
    parentId as string,
    childId as string,
    req.user!.id,
  );
  sendSuccess(res, updated, 'Sub-issue detached');
});

// ─── DELETE /issues/:id ───────────────────────────────────────────
export const deleteIssue = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await issueService.deleteIssue(id as string, req.user!.id);
  sendNoContent(res);
});

const myIssuesBase = (userId: string) => ({
  assigneeId: userId,
  NOT: { status: 'DONE' as const, sprint: { status: 'COMPLETED' as const } },
});

// ─── shared filter builder for /my-issues ─────────────────────────
function buildMyIssuesFilterWhere(userId: string, query: Record<string, any>) {
  const filters = myIssuesFilterSchema.parse(query);
  return {
    ...myIssuesBase(userId),
    ...(filters.projectId && { projectId: filters.projectId }),
    ...(filters.sprintId && { sprintId: filters.sprintId }),
    ...(filters.type && { type: filters.type }),
    ...(filters.priority && { priority: filters.priority }),
    ...(filters.q?.trim() && {
      title: { contains: filters.q.trim(), mode: 'insensitive' as const },
    }),
    ...(filters.noDueDate
      ? { dueDate: null }
      : (filters.dueDateFrom || filters.dueDateTo) && {
          dueDate: {
            ...(filters.dueDateFrom && { gte: filters.dueDateFrom }),
            ...(filters.dueDateTo && { lte: filters.dueDateTo }),
          },
        }),
  };
}

const myIssuesInclude = {
  ...CARD_INCLUDE,
  project: {
    select: {
      id: true,
      name: true,
      slug: true,
      workspace: { select: { id: true, slug: true } },
    },
  },
  sprint: { select: { id: true, name: true, status: true } },
  parent: { select: { id: true, title: true } },
};

// ─── GET /users/my-issues/board ───────────────────────────────────
export const getMyIssuesBoard = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const where = buildMyIssuesFilterWhere(userId, req.query);

  const rows = await prisma.issue.findMany({
    where,
    include: myIssuesInclude,
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
  });
  const issues = rows.map(serializeIssue);

  const columns = {
    BACKLOG: issues.filter((i) => i.status === 'BACKLOG'),
    TODO: issues.filter((i) => i.status === 'TODO'),
    IN_PROGRESS: issues.filter((i) => i.status === 'IN_PROGRESS'),
    IN_REVIEW: issues.filter((i) => i.status === 'IN_REVIEW'),
    DONE: issues.filter((i) => i.status === 'DONE'),
  };

  sendSuccess(res, { columns }, 'My issues fetched successfully');
});

// ─── GET /users/my-issues/list ────────────────────────────────────
const MY_ISSUES_SORTABLE_FIELDS = [
  'updatedAt',
  'createdAt',
  'priority',
  'dueDate',
  'title',
  'status',
] as const;
type MyIssuesSortField = (typeof MY_ISSUES_SORTABLE_FIELDS)[number];

export const getMyIssuesList = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
  const skip = (page - 1) * limit;

  const sortBy: MyIssuesSortField = MY_ISSUES_SORTABLE_FIELDS.includes(
    req.query.sortBy as MyIssuesSortField,
  )
    ? (req.query.sortBy as MyIssuesSortField)
    : 'updatedAt';
  const sortOrder: 'asc' | 'desc' = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

  const where = buildMyIssuesFilterWhere(userId, req.query);

  const [rows, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      include: myIssuesInclude,
      orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' as const }],
      skip,
      take: limit,
    }),
    prisma.issue.count({ where }),
  ]);

  sendPaginated(res, rows.map(serializeIssue), {
    total,
    page,
    limit,
    hasMore: skip + rows.length < total,
  });
});

// ─── GET /users/my-issues/projects ────────────────────────────────
// the projects where the user has issues, for the project filter
export const getMyIssuesProjects = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const projects = await prisma.project.findMany({
    where: { issues: { some: myIssuesBase(userId) } },
    select: {
      id: true,
      name: true,
      slug: true,
      workspace: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { name: 'asc' },
  });

  sendSuccess(res, projects, 'Projects fetched successfully');
});
