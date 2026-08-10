import { Request, Response } from "express";
import { prisma } from "@devflow/db";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { generatePresignedDownloadUrl, deleteFileFromB2 } from "@devflow/storage";
import { sendSuccess, sendCreated, sendNoContent } from "../lib/apiResponse";
import { saveAttachmentSchema } from "@devflow/validators"
import { signUrl } from "../lib/signUrl";

// ─── SAVE ATTACHMENT ──────────────────────────────────────────
// just saves to DB — doesnt care if its an issue, comment, or anything else
// permission middleware already verified the parent resource exists
export const saveAttachment = asyncHandler(async (req: Request, res: Response) => {
    const issueId = req.params.id;

    const parsed = saveAttachmentSchema.safeParse(req.body);
    if (!parsed.success) {
        throw ApiError.badRequest("Invalid attachment data")
    }

    const { fileKey, fileName, fileSize, mimeType, url } = parsed.data;

    const issue = await prisma.issue.findUnique({
        where: {
            id: issueId as string
        }
    })

    if (!issue) {
        throw ApiError.notFound('Issue not found')
    }

    const attachment = await prisma.attachment.create({
        data: {
            fileKey: fileKey as string,
            fileName: fileName as string,
            fileSize,
            mimeType: mimeType as string,
            url: url as string,
            issueId: issue.id,
            uploadedBy: req.user!.id
        },
        include: {
            uploader: {
                select: {
                    id: true,
                    name: true,
                    avatarUrl: true
                }
            }
        }
    })

    sendCreated(res, attachment, "Attachment saved")
})

// ─── GET ATTACHMENTS ──────────────────────────────────────────
// fetches all attachments for an issue
// signs each fileKey for private bucket access
export const getAttachments = asyncHandler(async (req: Request, res: Response) => {
    const issueId = req.params.id;

    const attachments = await prisma.attachment.findMany({
        where: {
            issueId: issueId as string
        },
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
            createdAt: 'asc'
        }
    })

    // generate signed download URLs for each (private bucket!)
    const withSignedUrls = await Promise.all(attachments.map(async (attachment) => {
        const signedUrl = await generatePresignedDownloadUrl(attachment.fileKey)
        return {
            ...attachment,
            signedUrl: signedUrl,
            uploader: {
                ...attachment.uploader,
                avatarUrl: await signUrl(attachment.uploader.avatarUrl)
            }
        }
    }))
    sendSuccess(res, withSignedUrls, "Attachments fetched")
})

// ─── Delete attachment ─────────────────────────────────────────
// deletes from DB first, then B2
// only the uploader can delete their own attachment
export const deleteAttachment = asyncHandler(async (req: Request, res: Response) => {
    const { attachmentId } = req.params;
    const userId = req.user!.id
    const access = req.projectAccess!

    const attachment = await prisma.attachment.findUnique({
        where: {
            id: attachmentId as string
        }
    })

    if (!attachment) {
        throw ApiError.notFound('Attachment not found')
    }

    const isUploader = attachment.uploadedBy === userId
    const canModerate = access.isWorkspaceAdmin || access.projectRole === 'LEAD'

    if (!isUploader && !canModerate) {
        throw ApiError.forbidden('You can only delete your own attachments')
    }

    // delete DB record first
    await prisma.attachment.delete({
        where: {
            id: attachmentId as string
        }
    })

    // then delete from B2
    // even if B2 delete fails, DB record is gone — file becomes orphaned
    // cleanup worker will handle orphaned files later
    await deleteFileFromB2(attachment.fileKey)

    sendNoContent(res)

})

export const getAttachmentDownloadUrl = asyncHandler(async (req: Request, res: Response) => {
    const { attachmentId } = req.params

    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId as string } })
    if (!attachment) throw ApiError.notFound('Attachment not found')

    const downloadUrl = await generatePresignedDownloadUrl(attachment.fileKey, 300, attachment.fileName)
    sendSuccess(res, { downloadUrl }, "Download URL generated")
})