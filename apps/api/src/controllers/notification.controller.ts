import { Request, Response } from 'express';

import { prisma } from '@devflow/db';

import { ApiError } from '../lib/ApiError';
import { sendCursorPaginated, sendNoContent } from '../lib/apiResponse';
import { asyncHandler } from '../lib/asyncHandler';
import { parseLimit, toCursorPage } from '../lib/pagination';

const NOTIFICATION_PAGE_SIZE = 20;

// ─── GET /notifications ───────────────────────────────────────
// Unread first, then newest. The unread count lives in GET /users/me/counts only.
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const cursor = req.query.cursor as string | undefined;
  const take = parseLimit(req.query.limit, NOTIFICATION_PAGE_SIZE);

  const rows = await prisma.notification.findMany({
    where: { userId },
    // id breaks ties, so the cursor never skips or repeats a row
    orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const { items, nextCursor, hasMore } = toCursorPage(rows, take);
  sendCursorPaginated(res, items, { nextCursor, hasMore });
});

// ─── PATCH /notifications/:id/read ───────────────────────────
// One query scoped to the owner: someone else's id looks the same as a missing one (404)
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.notification.updateMany({
    where: { id: req.params.id as string, userId: req.user!.id },
    data: { isRead: true },
  });

  if (count === 0) throw ApiError.notFound('Notification not found');
  sendNoContent(res);
});

// ─── PATCH /notifications/read-all ───────────────────────────
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true },
  });

  sendNoContent(res);
});

// ─── DELETE /notifications/:id ────────────────────────────────
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.notification.deleteMany({
    where: { id: req.params.id as string, userId: req.user!.id },
  });

  if (count === 0) throw ApiError.notFound('Notification not found');
  sendNoContent(res);
});

// ─── DELETE /notifications ──────────────────────────────────
// Clear all read notifications for the logged in user
export const clearReadNotifications = asyncHandler(async (req: Request, res: Response) => {
  await prisma.notification.deleteMany({
    where: { userId: req.user!.id, isRead: true },
  });

  sendNoContent(res);
});