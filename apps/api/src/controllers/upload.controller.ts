import { Request, Response } from "express";
import { z } from "zod"
import { generatePresignedUploadUrl, deleteFileFromB2 } from "@devflow/storage"
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { sendSuccess, sendNoContent } from "../lib/apiResponse";

// [
//     { "extension": "pdf", "mimeType": "application/pdf" },
//     { "extension": "docx", "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
//     { "extension": "doc", "mimeType": "application/msword" },
//     { "extension": "xlsx", "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
//     { "extension": "xls", "mimeType": "application/vnd.ms-excel" },
//     { "extension": "pptx", "mimeType": "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
//     { "extension": "ppt", "mimeType": "application/vnd.ms-powerpoint" },
//     { "extension": "png", "mimeType": "image/png" },
//     { "extension": "jpg", "mimeType": "image/jpeg" },
//     { "extension": "jpeg", "mimeType": "image/jpeg" },
//     { "extension": "gif", "mimeType": "image/gif" },
//     { "extension": "mp4", "mimeType": "video/mp4" },
//     { "extension": "mp3", "mimeType": "audio/mpeg" },
//     { "extension": "csv", "mimeType": "text/csv" },
//     { "extension": "txt", "mimeType": "text/plain" },
//     { "extension": "zip", "mimeType": "application/zip" }
// ]

const presignedUrlSchema = z.object({
    folder: z.enum(["attachments", "avatars", "logos"]),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    fileSize: z.number().max(10 * 1024 * 1024) // 10MB max
})

const deleteFileSchema = z.object({
    fileKey: z.string().min(1)
})


// ─── GET PRESIGNED UPLOAD URL ─────────────────────────────────
// knows nothing about DB — just talks to B2
export const getPresignedUploadUrl = asyncHandler(async (req: Request, res: Response) => {
    const parsed = presignedUrlSchema.safeParse(req.body);
    if (!parsed.success) {
        throw ApiError.badRequest(parsed.error.message)
    }

    const { folder, fileName, mimeType, fileSize } = parsed.data;
    if ((folder === "avatars" || folder === "logos") && !mimeType.startsWith("image/")) {
        throw ApiError.badRequest("Only images allowed for avatars and logos")
    }

    const result = await generatePresignedUploadUrl(
        folder,
        fileName,
        mimeType,
        fileSize
    )

    sendSuccess(res, result, "Presigned upload URL generated successfully")
})

// ─── DELETE FILE FROM B2 ──────────────────────────────────────
// knows nothing about DB — just deletes from B2
// actual DB record deletion happens in attachment.controller
export const deleteFile = asyncHandler(async (req: Request, res: Response) => {
    const parsed = deleteFileSchema.safeParse(req.body);
    if (!parsed.success) {
        throw ApiError.badRequest("Invalid file key")
    }

    await deleteFileFromB2(parsed.data.fileKey)
    sendNoContent(res)
})