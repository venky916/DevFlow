import { z } from "zod"

export const createIssueSchema = z.object({
    title: z.string().min(1, "Title is required").max(200, "Title is too long"),
    description: z.string().max(500).optional().nullable(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'NO_PRIORITY', 'URGENT',]),
    sprintId: z.string().optional().nullable(),
    assigneeId: z.string().optional().nullable()
})

export const updateIssueSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional().nullable(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'NO_PRIORITY', 'URGENT',]).optional(),
    assigneeId: z.string().optional().nullable(),
    status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional()
})


export const moveIssueSchema = z.object({
    position: z.number(),
    status:z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'])
})

export const moveIssueToSprintSchema = z.object({
    sprintId: z.string().nullable()
})

export type CreateIssueInput = z.infer<typeof createIssueSchema>
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>
export type MoveIssueInput = z.infer<typeof moveIssueSchema>
export type MoveIssueToSprintInput = z.infer<typeof moveIssueToSprintSchema>