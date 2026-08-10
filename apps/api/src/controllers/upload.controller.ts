import { Request, Response } from "express";
import { generatePresignedUploadUrl } from "@devflow/storage"
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { sendSuccess } from "../lib/apiResponse";
import { presignedUrlSchema } from "@devflow/validators";
import { resolveProjectAccess } from "../middlewares/permission.middleware";
import { prisma } from "@devflow/db";

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


// ─── GET PRESIGNED UPLOAD URL ─────────────────────────────────
// knows nothing about DB — just talks to B2
export const getPresignedUploadUrl = asyncHandler(async (req: Request, res: Response) => {
    const parsed = presignedUrlSchema.safeParse(req.body);
    if (!parsed.success) {
        throw ApiError.badRequest(parsed.error.message)
    }

    const { folder, fileName, mimeType, fileSize, workspaceId, projectId } = parsed.data;
    const userId = req.user!.id;

    if ((folder === "avatars" || folder === "logos") && !mimeType.startsWith("image/")) {
        throw ApiError.badRequest("Only images allowed for avatars and logos")
    }

    if (folder === "logos") {
        if (!workspaceId) throw ApiError.badRequest("workspaceId is required for logo uploads")
        const member = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } }
        })
        if (!member || member.role !== 'ADMIN') {
            throw ApiError.forbidden('Only workspace ADMIN can upload a logo')
        }
    }

    if (folder === "attachments") {
        if (!projectId) throw ApiError.badRequest("projectId is required for attachment uploads")
        const access = await resolveProjectAccess(userId, projectId)
        if (!access.isWorkspaceAdmin && access.projectRole === 'VIEWER') {
            throw ApiError.forbidden('Viewers cannot upload attachments')
        }
    }

    const result = await generatePresignedUploadUrl(
        folder,
        fileName,
        mimeType,
        fileSize
    )

    sendSuccess(res, result, "Presigned upload URL generated successfully")
})