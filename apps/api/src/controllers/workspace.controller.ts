import { prisma } from "@devflow/db"
import { asyncHandler } from "../lib/asyncHandler"
import { Request, Response } from "express"
import { ApiError } from "../lib/ApiError"
import { sendCreated, sendNoContent, sendSuccess } from "../lib/apiResponse"
import { createWorkspaceSchema, updateMemberRoleSchema, updateWorkspaceSchema, updateWorkspaceLogoSchema } from "@devflow/validators"
import { generatePresignedDownloadUrl } from "@devflow/storage"
import { getCache, setCache, CacheKeys, TTL, deleteCache } from "../lib/cache"
import { buildUpdateData } from "../lib/updateBuilder"

const getMember = async (workspaceId: string, userId: string) => {
    const member = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId,
            userId
        }
    })
    return member
}

// ─── POST /workspaces ─────────────────────────────────────────────
export const createWorkspace = asyncHandler(async (req: Request, res: Response) => {
    const { name, slug, logoUrl } = createWorkspaceSchema.parse(req.body)
    const userId = req.user!.id

    const existing = await prisma.workspace.findFirst({
        where: {
            slug
        }
    })

    if (existing) {
        throw ApiError.conflict(`Slug already taken`)
    }

    // Create workspace + add creator as ADMIN in one transaction
    const workspace = await prisma.$transaction(async (tx) => {
        const ws = await tx.workspace.create({
            data: {
                name,
                slug,
                logoUrl
            }
        })

        await tx.workspaceMember.create({
            data: {
                workspaceId: ws.id,
                userId,
                role: 'ADMIN'
            }
        })

        return ws
    })

    sendCreated(res, workspace, 'Workspace created successfully')

})

// ─── GET /workspaces ──────────────────────────────────────────
export const getMyWorkspaces = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id
    const workspaces = await prisma.workspace.findMany({
        where: {
            members: {
                some: {
                    userId
                }
            }
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            avatarUrl: true
                        }
                    }
                }
            },
            _count: {
                select: {
                    projects: true,
                    members: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })
    sendSuccess(res, workspaces, 'Workspaces fetched successfully')
})

// ─── GET /workspaces/:id ──────────────────────────────────────────
export const getWorkspaceById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    const member = await getMember(id as string, userId)

    if (!member) {
        throw ApiError.forbidden('You are not a member of this workspace')
    }

    const workspace = await prisma.workspace.findUnique({
        where: {
            id: id as string
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            avatarUrl: true
                        }
                    }
                }
            },
            projects: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    createdAt: true,
                }
            },
            _count: {
                select: {
                    projects: true,
                    members: true
                }
            }
        }
    })

    if (!workspace) {
        throw ApiError.notFound(`Workspace not found`)
    }

    const activeSprintsCount = await prisma.sprint.count({
        where: {
            projectId: { in: workspace.projects.map(p => p.id) },
            status: 'ACTIVE'
        }
    })

    sendSuccess(res, { ...workspace, activeSprintsCount }, 'Workspace fetched successfully')

})

// ─── PATCH /workspaces/: id ────────────────────────────────────────
export const updateWorkspace = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const { name, logoUrl } = updateWorkspaceSchema.parse(req.body)
    const userId = req.user!.id

    const member = await getMember(id as string, userId)

    if (!member || !["ADMIN"].includes(member.role)) {
        throw ApiError.forbidden('Only ADMIN can update workspace')
    }

    const workspace = await prisma.workspace.update({
        where: {
            id: id as string
        },
        data: buildUpdateData({ name, logoUrl })
    })

    sendSuccess(res, workspace, 'Workspace updated successfully')
})

// ─── DELETE /workspaces/:id ───────────────────────────────────────
export const deleteWorkspace = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    const member = await getMember(id as string, userId)

    if (!member || member.role !== 'ADMIN') {
        throw ApiError.forbidden('Only ADMIN can delete workspace')
    }

    const workspace = await prisma.workspace.delete({
        where: {
            id: id as string
        }
    })

    sendNoContent(res)
})

// ─── GET /workspaces/:id/members ─────────────────────────────────
export const getWorkspaceMembers = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    const member = await getMember(id as string, userId)
    if (!member) {
        throw ApiError.forbidden('You are not a member of this workspace')
    }

    // ─── Check cache ──────────────────────────────────────────
    const cacheKey = CacheKeys.workspaceMembers(id as string)
    const cached = await getCache(cacheKey)

    if (cached) {
        sendSuccess(res, cached, "Members fetched successfully")
        return
    }

    const members = await prisma.workspaceMember.findMany({
        where: {
            workspaceId: id as string
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    avatarUrl: true
                }
            }
        },
        orderBy: {
            joinedAt: 'asc'
        }
    })

    await setCache(cacheKey, members)
    sendSuccess(res, members, 'Members fetched successfully')
})

// ─── PATCH /workspaces/:id/members/:uid ──────────────────────────
export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
    const { id, uid } = req.params

    const userId = req.user!.id
    const { role } = updateMemberRoleSchema.parse(req.body)

    const requester = await getMember(id as string, userId)

    if (!requester || !["ADMIN"].includes(requester.role)) {
        throw ApiError.forbidden('Only ADMIN can change roles')
    }

    const targetMember = await getMember(id as string, uid as string)

    if (!targetMember) {
        throw ApiError.notFound('Member not found in this workspace')
    }

    if (role === "ADMIN") {
        throw ApiError.forbidden('Cannot assign ADMIN role')
    }

    const updated = await prisma.workspaceMember.update({
        where: {
            workspaceId_userId: {
                workspaceId: id as string,
                userId: uid as string
            }
        },
        data: {
            role
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                }
            }
        }
    })

    // add after DB write in both functions:
    await deleteCache(CacheKeys.workspaceMembers(id as string))
    sendSuccess(res, updated, 'Member Role updated successfully')
})

// ─── DELETE /workspaces/:id/members/:uid ─────────────────────────
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
    const { id, uid } = req.params
    const userId = req.user!.id

    const requester = await getMember(id as string, userId)

    if (!requester || !["ADMIN"].includes(requester.role)) {
        throw ApiError.forbidden('Only ADMIN can delete members')
    }

    const targetMember = await getMember(id as string, uid as string)

    if (!targetMember) {
        throw ApiError.notFound('Member not found in this workspace')
    }

    if (targetMember.role === "ADMIN") {
        throw ApiError.forbidden('Cannot remove ADMIN from workspace')
    }

    const deleted = await prisma.workspaceMember.delete({
        where: {
            workspaceId_userId: {
                workspaceId: id as string,
                userId: uid as string
            }
        }
    })

    // add after DB write in both functions:
    await deleteCache(CacheKeys.workspaceMembers(id as string))
    sendNoContent(res)
})

// ─── UPDATE LOGO ──────────────────────────────────────────────
export const updateWorkspaceLogo = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const { url } = updateWorkspaceLogoSchema.parse(req.body)

    const workspace = await prisma.workspace.update({
        where: {
            id: id as string
        },
        data: {
            logoUrl: url
        }
    })
    sendSuccess(res, workspace, 'Logo updated successfully')
})