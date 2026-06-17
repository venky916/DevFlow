import { z } from "zod"

export const createSprintSchema = z.object({
    name: z.string().min(1, "Sprint Name is required").max(50, "Name is too long"),
    startDate: z.preprocess(
        arg => (typeof arg === 'string' && arg) ? new Date(arg) : arg,
        z.date().nullable().optional()
    ),
    endDate: z.preprocess(
        arg => (typeof arg === 'string' && arg) ? new Date(arg) : arg,
        z.date().nullable().optional()
    )
})

export const updateSprintSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    startDate: z.preprocess(
        arg => (typeof arg === 'string' && arg) ? new Date(arg) : arg,
        z.date().nullable().optional()
    ),
    endDate: z.preprocess(
        arg => (typeof arg === 'string' && arg) ? new Date(arg) : arg,
        z.date().nullable().optional()
    )
})

export type CreateSprintInput = z.infer<typeof createSprintSchema>
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>

// z.coerce.date().nullable().optional()