import { Request, Response } from 'express';

import { createCommentSchema, updateCommentSchema } from '@devflow/validators';

import { sendCreated, sendNoContent, sendSuccess } from '../lib/apiResponse';
import { asyncHandler } from '../lib/asyncHandler';
import { commentService } from '../services/comment.service';

// ─── POST /issues/:id/comments ───────────────────────────────────
export const createComment = asyncHandler(async (req: Request, res: Response) => {
  const { id: issueId } = req.params;
  const { content } = createCommentSchema.parse(req.body);
  const comment = await commentService.createComment(issueId as string, req.user!.id, content);
  sendCreated(res, comment, 'Comment created successfully');
});

// ─── GET /issues/:id/comments ────────────────────────────────────
export const getComments = asyncHandler(async (req: Request, res: Response) => {
  const { id: issueId } = req.params;
  const comments = await commentService.listComments(issueId as string);
  sendSuccess(res, comments, 'Comments fetched successfully');
});

// ─── PATCH /comments/:id ─────────────────────────────────────────
export const updateComment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = updateCommentSchema.parse(req.body);
  const updated = await commentService.updateComment(id as string, req.user!.id, content);
  sendSuccess(res, updated, 'Comment updated successfully');
});

// ─── DELETE /comments/:id ─────────────────────────────────────────
export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await commentService.deleteComment(id as string, req.user!.id);
  sendNoContent(res);
});
