import { Request, Response } from "express";
import { z } from "zod"
import { prisma } from "@devflow/db";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { sendSuccess } from "../lib/apiResponse";
import { generatePresignedDownloadUrl } from "@devflow/storage";

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
    const { name, avatarUrl } = z.object({
        name: z.string().optional(),
        avatarUrl: z.string().optional(),
    }).parse(req.body)

    const user = await prisma.user.update({
        where: {
            id: req.user!.id
        },
        data: {
            ...(name && { name }),
            ...(avatarUrl && { avatarUrl })
        },
        select:{
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            firebaseUid: true,
            createdAt: true
        }
    })
    sendSuccess(res, user, 'Profile updated successfully')
})

// ─── UPDATE AVATAR ────────────────────────────────────────────
// called AFTER client uploads to B2 and gets back the public URL
export const updateAvatar = asyncHandler(async (req: Request, res: Response) => {
    const { url } = z.object({
        url: z.string()
    }).parse(req.body)

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
            createdAt: true
        }
    })
    sendSuccess(res, user, 'Avatar updated successfully')
})