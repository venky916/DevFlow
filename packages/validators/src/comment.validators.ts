import { z } from "zod"

const tiptapNode: z.ZodType<any> = z.lazy(() => z.object({
    type: z.string(),
    attrs: z.record(z.string(), z.any()).optional(),
    text: z.string().optional(),
    marks: z.array(z.any()).optional(),
    content: z.array(tiptapNode).optional(),
}))

export function getPlainText(node: any): string {
    if (!node) return ""
    if (node.type === "text") return node.text ?? ""
    if (node.type === "mention") return `@${node.attrs?.label ?? ""}`
    if (!node.content) return ""
    return node.content.map(getPlainText).join("")
}

export const createCommentSchema = z.object({
    content: tiptapNode.refine(
        (doc) => getPlainText(doc).trim().length > 0,
        { message: "Comment cannot be empty" }
    ),
})

export const updateCommentSchema = createCommentSchema

// mention extraction — pure utility, not a zod schema
// call this in the comment service after schema validation passes
export function extractMentions(doc: any): { id: string; label: string }[] {
    const found: { id: string; label: string }[] = []
    const walk = (node: any) => {
        if (!node) return
        if (node.type === "mention" && node.attrs?.id) {
            found.push({ id: node.attrs.id, label: node.attrs.label ?? "" })
        }
        node.content?.forEach(walk)
    }
    walk(doc)
    const seen = new Set<string>()
    return found.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
}

export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type UpdateCommentInput = z.infer<typeof updateCommentSchema> 
export type TiptapContent = z.infer<typeof tiptapNode>