import {z} from "zod"

export const saveAttachmentSchema = z.object({
    fileKey: z.string().min(1),
    fileName: z.string().min(1),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
    url: z.string().min(1)
}) 


export const presignedUrlSchema = z.object({
    folder: z.enum(["attachments", "avatars", "logos"]),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    fileSize: z.number().max(10 * 1024 * 1024) // 10MB max
})

export const deleteFileSchema = z.object({
    fileKey: z.string().min(1)
})

export type SaveAttachmentInput = z.infer<typeof saveAttachmentSchema>
export type PresignedUrlInput = z.infer<typeof presignedUrlSchema>
export type DeleteFileInput = z.infer<typeof deleteFileSchema>