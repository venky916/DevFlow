import { Request, Response } from 'express';

import { prisma } from '@devflow/db';

import { ApiError } from '../lib/ApiError';
import { sendCursorPaginated, sendSuccess } from '../lib/apiResponse';
import { asyncHandler } from '../lib/asyncHandler';
import { parseLimit } from '../lib/pagination';

// ─── GET /issues/:id/activities ──────────────────────────────────
export const getIssueActivities = asyncHandler(async (req: Request, res: Response) => {
  const { id: issueId } = req.params;
  const cursor = req.query.cursor as string | undefined;
  const take = parseLimit(req.query.limit);

  const issue = await prisma.issue.findUnique({
    where: { id: issueId as string },
    select: { id: true },
  });
  if (!issue) throw ApiError.notFound('Issue not found');

  const activities = await prisma.activityLog.findMany({
    where: { issueId: issueId as string, scope: 'ISSUE' },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    take: take + 1, // fetch one extra to detect "more"
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = activities.length > take;
  const items = hasMore ? activities.slice(0, take) : activities;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.id : null;

  sendCursorPaginated(res, items, { nextCursor, hasMore });
});

// ─── GET /projects/:id/activities ────────────────────────────────
export const getProjectActivities = asyncHandler(async (req: Request, res: Response) => {
  const { id: projectId } = req.params;
  const cursor = req.query.cursor as string | undefined;
  const take = parseLimit(req.query.limit);

  const activities = await prisma.activityLog.findMany({
    where: { projectId: projectId as string, scope: 'PROJECT' },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      issue: { select: { id: true, title: true } },
    },
    // id breaks ties, so two rows with the same createdAt can't skip or repeat across pages
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1, // one extra row tells us whether there is more
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = activities.length > take;
  const items = hasMore ? activities.slice(0, take) : activities;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.id : null;

  sendCursorPaginated(res, items, { nextCursor, hasMore });
});

// ─── GET /projects/:id/activities/all ────────────────────────────────
export const getAllProjectActivities = asyncHandler(async (req: Request, res: Response) => {
  const { id: projectId } = req.params;

  const activities = await prisma.activityLog.findMany({
    where: {
      projectId: projectId as string,
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      issue: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100, // last 100 activities
  });
  sendSuccess(res, activities, 'Activities fetched successfully');
});
