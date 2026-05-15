import { Request, Response } from "express";
import { prisma } from "@devflow/db";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { z } from "zod";
import { generatePresignedDownloadUrl, deleteFileFromB2 } from "@devflow/storage";
import { sendSuccess, sendCreated, sendNoContent } from "../lib/apiResponse";

const saveAttachmentSchema = z.object({
    fileKey: z.string().min(1),
    fileName: z.string().min(1),
    fileSize: z.number().optional(),
    mimetype: z.string().optional(),
    url: z.string().min(1)
})

// ─── SAVE ATTACHMENT ──────────────────────────────────────────
// just saves to DB — doesnt care if its an issue, comment, or anything else
// permission middleware already verified the parent resource exists
export const saveAttachment = asyncHandler(async (req: Request, res: Response) => {
    const issueId = req.params.id;

    const parsed = saveAttachmentSchema.safeParse(req.body);
    if (!parsed.success) {
        throw ApiError.badRequest("Invalid attachment data")
    }

    const { fileKey, fileName, fileSize, mimetype, url } = parsed.data;

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
            mimeType: mimetype as string,
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
            signedUrl: signedUrl
        }
    }))
    console.log(withSignedUrls)
    sendSuccess(res, withSignedUrls, "Attachments fetched")
})

// ─── Delete attachment ─────────────────────────────────────────
// deletes from DB first, then B2
// only the uploader can delete their own attachment
export const deleteAttachment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
        where: {
            id: id as string
        }
    })

    if (!attachment) {
        throw ApiError.notFound('Attachment not found')
    }

    if (attachment.uploadedBy !== req.user!.id) {
        throw ApiError.forbidden('You can only delete your own attachments')
    }

    // delete DB record first
    await prisma.attachment.delete({
        where: {
            id: id as string
        }
    })

    // then delete from B2
    // even if B2 delete fails, DB record is gone — file becomes orphaned
    // cleanup worker will handle orphaned files later
    await deleteFileFromB2(attachment.fileKey)

    sendNoContent(res)

})