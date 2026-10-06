import { Request, Response } from 'express';

import { prisma } from '@devflow/db';
import { fileCleanupQueue } from '@devflow/queues';
import { isPublicUrlIn, keyFromUrl } from '@devflow/storage';
import { updateAvatarSchema, updateProfileSchema } from '@devflow/validators';

import { ApiError } from '../lib/ApiError';
import { sendSuccess } from '../lib/apiResponse';
import { asyncHandler } from '../lib/asyncHandler';
import { buildUpdateData } from '../lib/updateBuilder';

// ─── GET MY PROFILE /users/me ───────────────────────────────────────────
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req.user!.id,
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      firebaseUid: true,
      createdAt: true,
      timezone: true,
    },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  sendSuccess(res, user, 'Profile fetched successfully');
});

// ─── UPDATE PROFILE PATCH /users/me ───────────────────────────────────────────
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { name, avatarUrl, timezone } = updateProfileSchema.parse(req.body);

  const user = await prisma.user.update({
    where: {
      id: req.user!.id,
    },
    data: buildUpdateData({ name, avatarUrl, timezone }),
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      firebaseUid: true,
      createdAt: true,
      timezone: true,
    },
  });
  sendSuccess(res, user, 'Profile updated successfully');
});

// ─── UPDATE AVATAR ────────────────────────────────────────────
// called AFTER client uploads to B2 and gets back the public URL
export const updateAvatar = asyncHandler(async (req: Request, res: Response) => {
  const { avatarUrl: url } = updateAvatarSchema.parse(req.body);
  if (!isPublicUrlIn(url!, 'avatars')) throw ApiError.badRequest('Invalid avatar URL');
  const userId = req.user!.id;

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  const user = await prisma.user.update({
    where: {
      id: req.user!.id,
    },
    data: {
      avatarUrl: url,
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      firebaseUid: true,
      createdAt: true,
      timezone: true,
    },
  });

  if (existing?.avatarUrl && existing.avatarUrl !== url) {
    await fileCleanupQueue.add('delete-file', { fileKey: keyFromUrl(existing.avatarUrl) });
  }
  sendSuccess(res, user, 'Avatar updated successfully');
});

// ─── REMOVE AVATAR ────────────────────────────────────────────
export const removeAvatar = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      firebaseUid: true,
      createdAt: true,
      timezone: true,
    },
  });

  if (existing?.avatarUrl) {
    await fileCleanupQueue.add('delete-file', { fileKey: keyFromUrl(existing.avatarUrl) });
  }

  sendSuccess(res, user, 'Avatar removed successfully');
});

// ─── SIDEBAR COUNTS ────────────────────────────────────────────
export const getSidebarCounts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [unreadNotifications, myOpenIssues] = await Promise.all([
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
    prisma.issue.count({
      where: { assigneeId: userId, status: { not: 'DONE' } },
    }),
  ]);

  sendSuccess(res, { unreadNotifications, myOpenIssues }, 'Sidebar counts fetched successfully');
});
