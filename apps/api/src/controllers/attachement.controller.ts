import { Request, Response } from 'express';

import { saveAttachmentSchema } from '@devflow/validators';

import { sendCreated, sendNoContent, sendSuccess } from '../lib/apiResponse';
import { asyncHandler } from '../lib/asyncHandler';
import { getIssueActor } from '../lib/issue-rules';
import { attachmentService } from '../services/attachment.service';

// ─── POST /issues/:id/attachments ─────────────────────────────
export const saveAttachment = asyncHandler(async (req: Request, res: Response) => {
  const input = saveAttachmentSchema.parse(req.body);
  const actor = getIssueActor(req.user!.id, req.projectAccess!);
  const attachment = await attachmentService.saveAttachment(req.params.id as string, actor, input);
  sendCreated(res, attachment, 'Attachment saved');
});

// ─── GET /issues/:id/attachments ──────────────────────────────
export const getAttachments = asyncHandler(async (req: Request, res: Response) => {
  const attachments = await attachmentService.listAttachments(req.params.id as string);
  sendSuccess(res, attachments, 'Attachments fetched');
});

// ─── DELETE /issues/:id/attachments/:attachmentId ─────────────
export const deleteAttachment = asyncHandler(async (req: Request, res: Response) => {
  const { id, attachmentId } = req.params;
  const actor = getIssueActor(req.user!.id, req.projectAccess!);
  await attachmentService.deleteAttachment(id as string, attachmentId as string, actor);
  sendNoContent(res);
});

// ─── GET /issues/:id/attachments/:attachmentId/download-url ───
export const getAttachmentDownloadUrl = asyncHandler(async (req: Request, res: Response) => {
  const { id, attachmentId } = req.params;
  const downloadUrl = await attachmentService.getDownloadUrl(id as string, attachmentId as string);
  sendSuccess(res, { downloadUrl }, 'Download URL generated');
});
