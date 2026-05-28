import { z } from "zod"


export const createProjectSchema = z.object({
    name: z.string().min(1, "Name is required").max(50, "Name is too long"),
    slug: z.string().min(1, "Slug is required").max(50, "Slug is too long").regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
    description: z.string().max(500).optional().nullable()
})

export const updateProjectSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    description: z.string().max(500).optional().nullable()
})

export const addProjectMemberSchema = z.object({
    userId: z.string().min(1),
    role: z.enum(['LEAD', 'DEVELOPER', 'VIEWER'])
})

export const updateProjectMemberRoleSchema = z.object({
    role: z.enum(['LEAD', 'DEVELOPER', 'VIEWER'])
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type UpdateProjectMemberRoleInput = z.infer<typeof updateProjectMemberRoleSchema>