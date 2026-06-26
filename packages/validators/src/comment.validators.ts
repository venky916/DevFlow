import { z } from "zod"

export const createCommentSchema = z.object({
    content: z.string().min(1, "Comment cannot be empty")
})

export const updateCommentSchema = z.object({
    content: z.string().min(1, "Comment cannot be empty")
})

// mention extraction — pure utility, not a zod schema
// call this in the comment service after schema validation passes
export function extractMentions(content: string): string[] {
    const matches = content.match(/@\[([a-zA-Z0-9]+)\]/g) ?? []
    return [...new Set(matches.map(m => m.slice(2, -1)))] // strip @[ and ]
}

export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type UpdateCommentInput = z.infer<typeof updateCommentSchema> 