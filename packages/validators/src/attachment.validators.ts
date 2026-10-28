import { z } from 'zod';

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB for avatars and logos

// Windows browsers report .csv as an Excel type and .zip as x-zip-compressed, so those are listed too
export const ATTACHMENT_TYPES: string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'audio/mpeg',
  'text/csv',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
];

export const IMAGE_TYPES: string[] = ['image/png', 'image/jpeg', 'image/webp'];

// what the browser sends after the upload finished
export const saveAttachmentSchema = z.object({
  fileKey: z.string().startsWith('attachments/', 'Invalid file'),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_ATTACHMENT_SIZE, 'File is too large (max 10MB)'),
  mimeType: z
    .string()
    .refine((type) => ATTACHMENT_TYPES.includes(type), 'This file type is not allowed'),
});

// files sent when an issue is created use the same shape (issue.validators imports this name)
export const attachmentInputSchema = saveAttachmentSchema;

export const requestUploadUrlSchema = z
  .object({
    folder: z.enum(['attachments', 'avatars', 'logos']),
    fileName: z.string().min(1).max(255),
    mimeType: z.string().min(1),
    fileSize: z.number().int().positive(),
    projectId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const fail = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });

    if (data.folder === 'attachments') {
      if (!data.projectId) fail('projectId', 'projectId is required for attachment uploads');
      if (!ATTACHMENT_TYPES.includes(data.mimeType))
        fail('mimeType', 'This file type is not allowed');
      if (data.fileSize > MAX_ATTACHMENT_SIZE) fail('fileSize', 'File is too large (max 10MB)');
    } else {
      if (!IMAGE_TYPES.includes(data.mimeType))
        fail('mimeType', 'Only png, jpeg or webp images are allowed');
      if (data.fileSize > MAX_IMAGE_SIZE) fail('fileSize', 'Image must be 2MB or smaller');
    }
  });

export const deleteFileSchema = z.object({
  fileKey: z.string().min(1),
});

export type SaveAttachmentInput = z.infer<typeof saveAttachmentSchema>;
export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlSchema>;
export type DeleteFileInput = z.infer<typeof deleteFileSchema>;
