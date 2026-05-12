import { Request, Response } from "express";
import { ApiError } from "../lib/ApiError";
import { prisma } from "@devflow/db";
import { sendNoContent, sendSuccess } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { createProjectSchema,updateProjectSchema,updateProjectMemberRoleSchema } from "@devflow/validators"; "@devflow/validators"

// ─── POST /workspaces/:workspaceId/projects ───────────────────────
export const createProject = asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params
    const { name, slug, description } = createProjectSchema.parse(req.body)
    const userId = req.user!.id

    const existing = await prisma.project.findUnique({
        where: {
            slug
        }
    })

    if (existing) {
        throw ApiError.conflict(`Project slug already taken`)
    }
    // create project + add creator as LEAD in one transaction
    const project = await prisma.$transaction(async (tx) => {
        const proj = await tx.project.create({
            data: {
                name,
                slug,
                description,
                workspaceId: workspaceId as string
            }
        })
        await tx.projectMember.create({
            data: {
                projectId: proj.id,
                userId,
                role: 'LEAD'
            }
        })
        return proj
    })

    sendSuccess(res, project, 'Project created successfully')
})

// ─── GET /workspaces/:workspaceId/projects ────────────────────────
export const getProjects = asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params
    const userId = req.user!.id

    const projects = await prisma.project.findMany({
        where: {
            workspaceId: workspaceId as string
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
                    issues: true,
                    sprints: true,
                    members: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    sendSuccess(res, projects, "Projects fetched successfully")
})

// ─── GET /projects/:id ────────────────────────────────────────────
export const getProjectById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    const project = await prisma.project.findUnique({
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
            sprints: {
                orderBy: {
                    createdAt: 'desc'
                }
            },
            _count: {
                select: {
                    issues: true,
                    sprints: true,
                    members: true
                }
            }
        }
    })

    if (!project) {
        throw ApiError.notFound('Project not found')
    }

    sendSuccess(res, project, "Project fetched successfully")
})

// ─── PATCH /projects/:id ──────────────────────────────────────────
export const updateProject = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const { name, description } = updateProjectSchema.parse(req.body)

    const project = await prisma.project.update({
        where: {
            id: id as string
        },
        data: {
            ...(name && { name }),
            ...(description && { description })
        }
    })

    sendSuccess(res, project, "Project updated successfully")

})

// ─── DELETE /projects/:id ─────────────────────────────────────────
export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    const project = await prisma.project.delete({
        where: {
            id: id as string
        }
    })

    sendNoContent(res)
})

// ─── GET /projects/:id/members ────────────────────────────────────
export const getProjectMembers = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    const members = await prisma.projectMember.findMany({
        where: {
            projectId: id as string
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

    sendSuccess(res, members, "Members fetched successfully")
})

// ─── PATCH /projects/:id/members/:uid ────────────────────────────
export const updateProjectMemberRole = asyncHandler(async (req: Request, res: Response) => {
    const { id, uid } = req.params
    const { role } = updateProjectMemberRoleSchema.parse(req.body) 

    const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: id as string, userId: uid as string } },
    });

    if (!member) {
        throw ApiError.notFound('Member not found in this project');
    }

    const updated = await prisma.projectMember.update({
        where: { projectId_userId: { projectId: id as string, userId: uid as string } },
        data: { role },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    });

    sendSuccess(res, updated, "Member role updated successfully")
})

// ─── DELETE /projects/:id/members/:uid ───────────────────────────
export const removeProjectMember = asyncHandler(async (req: Request, res: Response) => {
    const { id, uid } = req.params

    const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: id as string, userId: uid as string } },
    });

    if (!member) {
        throw ApiError.notFound('Member not found in this project');
    }

    if (member.role === "LEAD" && uid === req.user!.id) {
        throw ApiError.forbidden('LEAD cannot remove themselves');
    }

    const deleted = await prisma.projectMember.delete({
        where: {
            projectId_userId: {
                projectId: id as string,
                userId: uid as string
            }
        }
    })
    sendNoContent(res)

})