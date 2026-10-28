// services/attachment.service.ts
import { prisma } from '@devflow/db';
import { fileCleanupQueue } from '@devflow/queues';
import { generatePresignedDownloadUrl } from '@devflow/storage';
import type { SaveAttachmentInput } from '@devflow/validators';

import { ApiError } from '../lib/ApiError';
import type { IssueActor } from '../lib/issue-rules';
import { activityService } from './activity.service';

const uploader = { select: { id: true, name: true, avatarUrl: true } };
const VIEW_URL_SECONDS = 60 * 60; // links in the list stay valid for 1 hour
const DOWNLOAD_URL_SECONDS = 5 * 60; // the Download button asks for a fresh one

export const attachmentService = {
  // Leads and admins attach to any issue. A developer only to an issue assigned to them.
  async saveAttachment(issueId: string, actor: IssueActor, input: SaveAttachmentInput) {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { projectId: true, assigneeId: true },
    });
    if (!issue) throw ApiError.notFound('Issue not found');

    if (!actor.isLead && issue.assigneeId !== actor.userId) {
      throw ApiError.forbidden('You can only attach files to issues assigned to you');
    }

    const attachment = await prisma.attachment.create({
      data: { ...input, issueId, uploadedBy: actor.userId },
      include: { uploader },
    });

    await activityService.logAttachmentAdded(
      issueId,
      issue.projectId,
      actor.userId,
      attachment.fileName,
    );

    return {
      ...attachment,
      url: await generatePresignedDownloadUrl(attachment.fileKey, VIEW_URL_SECONDS),
    };
  },

  // the bucket is private, so every file gets a signed link
  async listAttachments(issueId: string) {
    const attachments = await prisma.attachment.findMany({
      where: { issueId },
      include: { uploader },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return Promise.all(
      attachments.map(async (attachment) => ({
        ...attachment,
        url: await generatePresignedDownloadUrl(attachment.fileKey, VIEW_URL_SECONDS),
      })),
    );
  },

  // the uploader, a lead or an admin can delete
  async deleteAttachment(issueId: string, attachmentId: string, actor: IssueActor) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { issue: { select: { projectId: true } } },
    });
    if (!attachment || attachment.issueId !== issueId || !attachment.issue) {
      throw ApiError.notFound('Attachment not found');
    }

    if (attachment.uploadedBy !== actor.userId && !actor.isLead) {
      throw ApiError.forbidden('You can only delete your own attachments');
    }

    await prisma.attachment.delete({ where: { id: attachmentId } });
    await fileCleanupQueue.add('delete-file', { fileKey: attachment.fileKey });
    await activityService.logAttachmentDeleted(
      issueId,
      attachment.issue.projectId,
      actor.userId,
      attachment.fileName,
    );
  },

  async getDownloadUrl(issueId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.issueId !== issueId)
      throw ApiError.notFound('Attachment not found');

    return generatePresignedDownloadUrl(
      attachment.fileKey,
      DOWNLOAD_URL_SECONDS,
      attachment.fileName,
    );
  },
};
