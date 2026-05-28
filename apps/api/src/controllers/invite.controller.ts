import { Request, Response } from "express";
import { prisma } from "@devflow/db"
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError"
import { sendCreated, sendSuccess } from "../lib/apiResponse";
import { emailQueue } from "@devflow/queues"
import { NotificationTypes } from "@devflow/types";
import { createInviteSchema, acceptInviteSchema } from "@devflow/validators";

// ─── POST /workspaces/:id/invites ─────────────────────────────
// Owner/Admin sends invite to an email
export const createInvite = asyncHandler(async (req: Request, res: Response) => {
    const { id: workspaceId } = req.params
    const { email, role } = createInviteSchema.parse(req.body)
    const userId = req.user!.id

    const workspace = await prisma.workspace.findUnique({
        where: {
            id: workspaceId as string
        }
    })

    if (!workspace) {
        throw ApiError.notFound('Workspace not found')
    }

    // find the user account for the invited email first
    const invitedUser = await prisma.user.findUnique({
        where: { email }
    })

    if (invitedUser) {
        const existingMember = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: workspaceId as string,
                    userId: invitedUser.id
                }
            }
        })

        if (existingMember) {
            throw ApiError.conflict("User is already a member of this workspace")
        }
    }


    // check if invite already pending for this email
    const existingInvite = await prisma.workspaceInvite.findFirst({
        where: {
            workspaceId: workspaceId as string,
            email,
            acceptedAt: null,
            expiresAt: {
                gt: new Date()
            }
        }
    })

    if (existingInvite) {
        throw ApiError.conflict("Invite already pending for this email")
    }

    // create invite — expires in 7 days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.workspaceInvite.create({
        data: {
            workspaceId: workspaceId as string,
            email,
            role,
            invitedBy: userId,
            expiresAt,
        }
    })

    // get inviter name for email
    const inviter = await prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            name: true,
            email: true
        }
    })

    // queue invite email
    await emailQueue.add("email", {
        to: email,
        type: NotificationTypes.WORKSPACE_INVITED,
        data: {
            workspaceName: workspace.name,
            invitedBy: inviter?.name ?? inviter?.email ?? "Admin",
            inviteLink: `${process.env.BASE_WEB_URL}/invite?token=${invite.token}`,
            role
        }
    })

    sendCreated(res, { inviteId: invite.id, email, role, expiresAt }, "Invite sent successfully")

})

// ─── POST /invites/accept ─────────────────────────────────────
// Invited user accepts the invite via token
export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
    const { token } = acceptInviteSchema.parse(req.body)
    const userId = req.user!.id

    // find invite by token
    const invite = await prisma.workspaceInvite.findUnique({
        where: {
            token
        },
        include: {
            workspace: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    })

    if (!invite) {
        throw ApiError.notFound('Invite not found or already used')
    }

    // check if already accepted
    if (invite.acceptedAt) {
        throw ApiError.conflict('Invite already accepted')
    }

    // check expiry
    if (invite.expiresAt < new Date()) {
        throw ApiError.conflict('Invite has expired')
    }

    // check the logged in user's email matches invite email
    const user = await prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            email: true
        }
    })

    if (user?.email?.toLowerCase() !== invite.email?.toLowerCase()) {
        throw ApiError.forbidden('This invite was sent to a different email address')
    }

    // check if already a member
    const existingMember = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId: invite.workspaceId,
                userId
            }
        }
    })

    if (existingMember) {
        throw ApiError.conflict('You are already a member of this workspace')
    }

    // accept invite — add to workspace + mark invite as accepted in transaction
    await prisma.$transaction(async (tx) => {
        await tx.workspaceMember.create({
            data: {
                workspaceId: invite.workspaceId,
                userId,
                role: invite.role
            }
        })

        await tx.workspaceInvite.update({
            where: {
                token
            },
            data: {
                acceptedAt: new Date()
            }
        })
    })

    sendSuccess(res, { workspaceId: invite.workspaceId, workspaceName: invite.workspace.name, role: invite.role }, 'Invite accepted successfully')
})

// ─── GET /workspaces/:id/invites ──────────────────────────────
// Get all pending invites for a workspace
export const getWorkspaceInvites = asyncHandler(async (req: Request, res: Response) => {
    const { id: workspaceId } = req.params

    const invites = await prisma.workspaceInvite.findMany({
        where: {
            workspaceId: workspaceId as string,
            acceptedAt: null,
            expiresAt: {
                gt: new Date()
            },
        }, include: {
            inviter: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    sendSuccess(res, invites, 'Invites fetched successfully')
})

// ─── DELETE /workspaces/:id/invites/:inviteId ─────────────────
// Cancel a pending invite
export const cancelInvite = asyncHandler(async (req: Request, res: Response) => {
    const { inviteId } = req.params

    const invite = await prisma.workspaceInvite.findUnique({
        where: {
            id: inviteId as string
        }
    })

    if (!invite) {
        throw ApiError.notFound('Invite not found')
    }

    if (invite.acceptedAt) {
        throw ApiError.badRequest('Cannot cancel an already accepted invite')
    }

    await prisma.workspaceInvite.delete({
        where: {
            id: inviteId as string
        }
    })

    sendSuccess(res, null, 'Invite cancelled successfully')
})