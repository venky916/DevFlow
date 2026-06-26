import { z } from "zod"

export const updateProfileSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    avatarUrl: z.url("Invalid URL").optional().nullable(),
    timezone: z.string().optional()
})

export const updateAvatarSchema = z.object({
    avatarUrl: z.url("Invalid URL").optional().nullable()
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>