import { z } from "zod"

const dateRefinement = (data: { startDate?: Date | null, endDate?: Date | null }) => {
    if (data.startDate && data.endDate) {
        return data.startDate < data.endDate
    }
    return true
}

const dateRefinementError = {
    message: "End date must be after start date",
    path: ["endDate"]
}

export const createSprintSchema = z.object({
    name: z.string().min(1, "Sprint Name is required").max(50, "Name is too long"),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
}).refine(dateRefinement, dateRefinementError)

export const updateSprintSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional()
}).refine(dateRefinement, dateRefinementError)

// export type CreateSprintInput = z.infer<typeof createSprintSchema>
// export type UpdateSprintInput = z.infer<typeof updateSprintSchema>
export type CreateSprintInput = z.input<typeof createSprintSchema>;
export type CreateSprintOutput = z.output<typeof createSprintSchema>;
export type UpdateSprintInput = z.input<typeof updateSprintSchema>;
export type UpdateSprintOutput = z.output<typeof updateSprintSchema>;
