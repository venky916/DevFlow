import { z } from "zod"

const IssueTypeEnum = z.enum(['BUG', 'TASK', 'FEATURE', 'IMPROVEMENT', 'OTHER'])
const IssueStatusEnum = z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'])
const IssuePriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'NO_PRIORITY', 'URGENT',])

export const createIssueSchema = z.object({
    title: z.string().min(1, "Title is required").max(200, "Title is too long"),
    description: z.string().max(500).optional().nullable(),
    priority: IssuePriorityEnum.optional().default('NO_PRIORITY'),
    type: IssueTypeEnum.optional().default('TASK'),
    status: IssueStatusEnum.optional(),
    sprintId: z.string().optional().nullable(),
    assigneeId: z.string().optional().nullable(),
    parentId: z.string().optional().nullable(),
    dueDate: z.coerce.date().optional().nullable(),
    labelIds: z.array(z.string()).optional().default([]),
})

export const updateIssueSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional().nullable(),
    priority: IssuePriorityEnum.optional(),
    type: IssueTypeEnum.optional(),
    status: IssueStatusEnum.optional(),
    sprintId: z.string().optional().nullable(),
    assigneeId: z.string().optional().nullable(),
    parentId: z.string().optional().nullable(),
    dueDate: z.coerce.date().optional().nullable(),
    labelIds: z.array(z.string()).optional()
})


export const moveIssueSchema = z.object({
    position: z.string().min(1),
    status: IssueStatusEnum
})

export const moveIssueToSprintSchema = z.object({
    sprintId: z.string().nullable(),
    position: z.string().min(1).optional(), // fractional key for the destination bucket
})

// for GET /projects/:slug/issues and board fetch query params
export const issueFilterSchema = z.object({
    assigneeId: z.string().optional(),
    labelId: z.string().optional(),
    type: IssueTypeEnum.optional(),
    priority: IssuePriorityEnum.optional(),
    status: IssueStatusEnum.optional(),
    dueDateFrom: z.coerce.date().optional(),
    dueDateTo: z.coerce.date().optional(),
    noDueDate: z.coerce.boolean().optional(),
})

export const myIssuesFilterSchema = z.object({
    projectId: z.string().optional(),
    sprintId: z.string().optional(),
    type: IssueTypeEnum.optional(),
    priority: IssuePriorityEnum.optional(),
    dueDateFrom: z.coerce.date().optional(),
    dueDateTo: z.coerce.date().optional(),
    noDueDate: z.coerce.boolean().optional(),
})

export type CreateIssueInput = z.input<typeof createIssueSchema>
export type CreateIssueOutput = z.output<typeof createIssueSchema>

export type UpdateIssueInput = z.input<typeof updateIssueSchema>
export type UpdateIssueOutput = z.output<typeof updateIssueSchema>

export type MoveIssueInput = z.infer<typeof moveIssueSchema>
export type MoveIssueToSprintInput = z.infer<typeof moveIssueToSprintSchema>