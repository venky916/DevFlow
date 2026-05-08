import { z } from "zod"

export const createWorkspaceSchema = z.object({
    name: z.string().min(1, "Name is required").max(50, "Name is too long"),
    slug: z.string().min(1, "Slug is required").max(50, "Slug is too long").regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
    logoUrl: z.url("Invalid URL").optional().nullable()
})

export const updateWorkspaceSchema = z.object({
    name:z.string().min(1).max(50).optional(),
    logoUrl:z.url().optional().nullable()
})

export const updateMemberRoleSchema = z.object({
    role: z.enum(['OWNER', 'ADMIN', 'LEAD', 'DEVELOPER', 'VIEWER'])
})

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>