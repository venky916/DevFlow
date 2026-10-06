import { Request, Response } from 'express';

import { prisma } from '@devflow/db';
import { fileCleanupQueue } from '@devflow/queues';
import { generatePresignedDownloadUrl } from '@devflow/storage';
import { saveAttachmentSchema } from '@devflow/validators';

import { ApiError } from '../lib/ApiError';
import { sendCreated, sendNoContent, sendSuccess } from '../lib/apiResponse';
import { asyncHandler } from '../lib/asyncHandler';

// ─── SAVE ATTACHMENT ──────────────────────────────────────────
// just saves to DB — doesnt care if its an issue, comment, or anything else
// permission middleware already verified the parent resource exists
export const saveAttachment = asyncHandler(async (req: Request, res: Response) => {
  const issueId = req.params.id;

  const parsed = saveAttachmentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest('Invalid attachment data');
  }

  const { fileKey, fileName, fileSize, mimeType } = parsed.data;

  const issue = await prisma.issue.findUnique({
    where: {
      id: issueId as string,
    },
  });

  if (!issue) {
    throw ApiError.notFound('Issue not found');
  }

  const attachment = await prisma.attachment.create({
    data: {
      fileKey: fileKey as string,
      fileName: fileName as string,
      fileSize,
      mimeType: mimeType as string,
      issueId: issue.id,
      uploadedBy: req.user!.id,
    },
    include: {
      uploader: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });
  const url = await generatePresignedDownloadUrl(attachment.fileKey);

  sendCreated(res, { ...attachment, url }, 'Attachment saved');
});

// ─── GET ATTACHMENTS ──────────────────────────────────────────
// fetches all attachments for an issue
// signs each fileKey for private bucket access
export const getAttachments = asyncHandler(async (req: Request, res: Response) => {
  const issueId = req.params.id;

  const attachments = await prisma.attachment.findMany({
    where: {
      issueId: issueId as string,
    },
    include: {
      uploader: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // generate signed download URLs for each (private bucket!)
  const withSignedUrls = await Promise.all(
    attachments.map(async (attachment) => ({
      ...attachment,
      url: await generatePresignedDownloadUrl(attachment.fileKey),
    })),
  );

  sendSuccess(res, withSignedUrls, 'Attachments fetched');
});

// ─── Delete attachment ─────────────────────────────────────────
// deletes from DB first, then B2
// only the uploader can delete their own attachment
export const deleteAttachment = asyncHandler(async (req: Request, res: Response) => {
  const { attachmentId } = req.params;
  const userId = req.user!.id;
  const access = req.projectAccess!;

  const attachment = await prisma.attachment.findUnique({
    where: {
      id: attachmentId as string,
    },
  });

  if (!attachment) {
    throw ApiError.notFound('Attachment not found');
  }

  const isUploader = attachment.uploadedBy === userId;
  const canModerate = access.isWorkspaceAdmin || access.projectRole === 'LEAD';

  if (!isUploader && !canModerate) {
    throw ApiError.forbidden('You can only delete your own attachments');
  }

  // delete DB record first
  await prisma.attachment.delete({
    where: {
      id: attachmentId as string,
    },
  });
  await fileCleanupQueue.add('delete-file', { fileKey: attachment.fileKey });

  sendNoContent(res);
});

export const getAttachmentDownloadUrl = asyncHandler(async (req: Request, res: Response) => {
  const { attachmentId } = req.params;

  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId as string } });
  if (!attachment) throw ApiError.notFound('Attachment not found');

  const downloadUrl = await generatePresignedDownloadUrl(
    attachment.fileKey,
    300,
    attachment.fileName,
  );
  sendSuccess(res, { downloadUrl }, 'Download URL generated');
});
