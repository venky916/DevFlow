import { z } from "zod"

export const joinProjectSchema = z.object({
    type: z.literal("JOIN_PROJECT"),
    payload: z.object({
        projectId: z.string().min(1),
    })
})

export const leaveProjectSchema = z.object({
    type: z.literal("LEAVE_PROJECT"),
    payload: z.object({
        projectId: z.string().min(1),
    })
})

export const joinIssueSchema = z.object({
    type: z.literal('JOIN_ISSUE'),
    payload: z.object({
        issueId: z.string().min(1),
    }),
});

export const leaveIssueSchema = z.object({
    type: z.literal("LEAVE_ISSUE"),
    payload: z.object({
        issueId: z.string().min(1),
    })
})

export const cursorMoveSchema = z.object({
    type: z.literal("CURSOR_MOVE"),
    payload: z.object({
        projectId: z.string().min(1),
        x: z.number(),
        y: z.number(),
    })
})

export const wsEVentSchema = z.discriminatedUnion("type", [
    joinProjectSchema,
    leaveProjectSchema,
    leaveIssueSchema,
    cursorMoveSchema
])

export type WsEvent = z.infer<typeof wsEVentSchema>