import { Request, Response } from "express";
import { prisma } from "@devflow/db";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { sendSuccess } from "../lib/apiResponse";
import { generatePresignedDownloadUrl } from "@devflow/storage";
import { updateProfileSchema, updateAvatarSchema } from "@devflow/validators";
import { buildUpdateData } from "../lib/updateBuilder";

// ─── GET MY PROFILE ───────────────────────────────────────────
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
    const signedAvatarUrl = user.avatarUrl
        ? await generatePresignedDownloadUrl(
            user.avatarUrl.includes('avatars/')
                ? user.avatarUrl.split(`${process.env.B2_BUCKET_NAME}/`)[1] ?? user.avatarUrl
                : user.avatarUrl
        )
        : null

    sendSuccess(res, { ...user, avatarUrl: signedAvatarUrl }, 'Profile fetched successfully')

})

// ─── UPDATE PROFILE ───────────────────────────────────────────
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
    sendSuccess(res, user, 'Avatar updated successfully')
})