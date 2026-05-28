import { z } from "zod"

export const createInviteSchema = z.object({
    email: z.email("Invalid email address"),
    role: z.enum(["OWNER", "ADMIN", "LEAD", "DEVELOPER", "VIEWER"]).default("OWNER")
})

export const acceptInviteSchema = z.object({
    token: z.string().min(1, "Token is required"),
})

export type CreateInviteInput = z.infer<typeof createInviteSchema>
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>