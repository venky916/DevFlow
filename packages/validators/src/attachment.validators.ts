import {z} from "zod"

export const saveAttachmentSchema = z.object({
    fileKey: z.string().min(1),
    fileName: z.string().min(1),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
}) 


export const requestUploadUrlSchema = z.object({
    folder: z.enum(["attachments", "avatars", "logos"]),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
    workspaceId: z.string().optional(),
    projectId: z.string().optional(),
})

export const deleteFileSchema = z.object({
    fileKey: z.string().min(1)
})

export type SaveAttachmentInput = z.infer<typeof saveAttachmentSchema>
export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlSchema>
export type DeleteFileInput = z.infer<typeof deleteFileSchema>