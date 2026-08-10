import { Request, Response } from "express";
import { prisma } from "@devflow/db";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { sendSuccess } from "../lib/apiResponse";
import { extractKeyFromUrl, generatePresignedDownloadUrl } from "@devflow/storage";
import { updateProfileSchema, updateAvatarSchema } from "@devflow/validators";
import { buildUpdateData } from "../lib/updateBuilder";
import { signUrl } from "../lib/signUrl";
import { fileCleanupQueue } from "@devflow/queues";

// ─── GET MY PROFILE /users/me ───────────────────────────────────────────
export const getMe = asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
        where: {
            id: req.user!.id
        },
        select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            firebaseUid: true,
            createdAt: true,
            timezone: true
        }
    })

    if (!user) {
        throw new ApiError(404, 'User not found')
    }

    // private bucket — sign the avatar URL if it exists
    const signedAvatarUrl = await signUrl(user.avatarUrl)

    sendSuccess(res, { ...user, avatarUrl: signedAvatarUrl }, 'Profile fetched successfully')

})

// ─── UPDATE PROFILE PATCH /users/me ───────────────────────────────────────────
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const { name, avatarUrl, timezone } = updateProfileSchema.parse(req.body)

    const user = await prisma.user.update({
        where: {
            id: req.user!.id
        },
        data: buildUpdateData({ name, avatarUrl, timezone }),
        select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            firebaseUid: true,
            createdAt: true,
            timezone: true
        }
    })
    sendSuccess(res, user, 'Profile updated successfully')
})

// ─── UPDATE AVATAR ────────────────────────────────────────────
// called AFTER client uploads to B2 and gets back the public URL
export const updateAvatar = asyncHandler(async (req: Request, res: Response) => {
    const { avatarUrl: url } = updateAvatarSchema.parse(req.body)
    const userId = req.user!.id

    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } })

    const user = await prisma.user.update({
        where: {
            id: req.user!.id
        },
        data: {
            avatarUrl: url
        },
        select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            firebaseUid: true,
            createdAt: true,
            timezone: true
        }
    })

    if (existing?.avatarUrl && existing.avatarUrl !== url) {
        await fileCleanupQueue.add('delete-file', { fileKey: extractKeyFromUrl(existing.avatarUrl) })
    }
    sendSuccess(res, { ...user, avatarUrl: await signUrl(user.avatarUrl) }, 'Avatar updated successfully')
})

// ─── REMOVE AVATAR ────────────────────────────────────────────
export const removeAvatar = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id

    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } })

    const user = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: null },
        select: { id: true, email: true, name: true, avatarUrl: true, firebaseUid: true, createdAt: true, timezone: true }
    })

    if (existing?.avatarUrl) {
        await fileCleanupQueue.add('delete-file', { fileKey: extractKeyFromUrl(existing.avatarUrl) })
    }

    sendSuccess(res, user, 'Avatar removed successfully')
})