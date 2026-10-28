import { Request, Response } from 'express';

import { createUploadTarget } from '@devflow/storage';
import { requestUploadUrlSchema } from '@devflow/validators';

import { ApiError } from '../lib/ApiError';
import { sendSuccess } from '../lib/apiResponse';
import { asyncHandler } from '../lib/asyncHandler';
import { resolveProjectAccess } from '../middlewares/permission.middleware';

// ─── POST /upload/presigned-url ───────────────────────────────
// File type and size are checked by the schema, so a wrong file answers 422 with a clear message.
export const requestUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const { folder, fileName, mimeType, fileSize, projectId } = requestUploadUrlSchema.parse(
    req.body,
  );
  const userId = req.user!.id;

  if (folder === 'attachments') {
    const access = await resolveProjectAccess(userId, projectId as string);
    if (!access.isWorkspaceAdmin && (!access.projectRole || access.projectRole === 'VIEWER')) {
      throw ApiError.forbidden('You cannot upload attachments to this project');
    }
  }

  const result = await createUploadTarget(folder, fileName, mimeType, fileSize);
  sendSuccess(res, result, 'Presigned upload URL generated successfully');
});
