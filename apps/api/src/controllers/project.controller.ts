import { Request, Response } from "express";
import { ApiError } from "../lib/ApiError";
import { prisma } from "@devflow/db";
import { sendNoContent, sendSuccess } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { createProjectSchema, updateProjectSchema, updateProjectMemberRoleSchema, addProjectMemberSchema } from "@devflow/validators";
import { getCache, setCache, CacheKeys, TTL, deleteCache } from "../lib/cache"
import { createLabelSchema, updateLabelSchema } from "@devflow/validators"
import { logActivity } from "../lib/logActivity"
import { notificationQueue } from "@devflow/queues";
import { ActivityActions, NotificationTypes } from "@devflow/types";
import { buildUpdateData } from "../lib/updateBuilder";

// ─── POST /workspaces/:workspaceId/projects ───────────────────────
export const createProject = asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params
    const { name, slug, description, color } = createProjectSchema.parse(req.body)
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
                workspaceId: workspaceId as string,
                color
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

    // Check requester's workspace role
    const workspaceMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: workspaceId as string, userId } },
    });

    if (!workspaceMember) {
        throw ApiError.forbidden("You are not a member of this workspace");
    }

    const isOwnerOrAdmin = ["ADMIN"].includes(workspaceMember.role);

    const projects = await prisma.project.findMany({
        where: {
            workspaceId: workspaceId as string,
            // Owner/Admin see all projects
            // Everyone else sees only projects they are a member of
            ...(!isOwnerOrAdmin && {
                members: {
                    some: { userId },
                },
            }),
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
                include: {
                    _count: {
                        select: { issues: true }
                    },
                    issues: {
                        where: { status: 'DONE' },
                        select: { id: true }
                    }
                },
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

    const mapped = {
        ...project,
        sprints: project.sprints.map((sprint) => {
            return {
                ...sprint,
                issues: sprint.issues.map((issue) => issue.id)
            }
        })
    }

    sendSuccess(res, mapped, "Project fetched successfully")
})

// ─── PATCH /projects/:id ──────────────────────────────────────────
export const updateProject = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const { name, description, color } = updateProjectSchema.parse(req.body)

    const project = await prisma.project.update({
        where: {
            id: id as string
        },
        data: {
            ...(name && { name }),
            ...(description && { description }),
            ...(color && { color })
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

// ─── POST /projects/:id/members ──────────────────────────────
// Add a workspace member to a project
export const addProjectMember = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params
    const { userId, role } = addProjectMemberSchema.parse(req.body)
    const requester = req.user!.id

    const project = await prisma.project.findUnique({
        where: { id: projectId as string }
    })

    if (!project) {
        throw ApiError.notFound('Project not found')
    }

    // Check requester permissions (workspace or project level)
    const workspaceMember = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId: project.workspaceId,
                userId: requester
            }
        }
    })

    // If not workspace OWNER/ADMIN, check if project LEAD
    if (!workspaceMember || workspaceMember.role !== "ADMIN") {
        const projectMember = await prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId: projectId as string, userId: requester } }
        })

        if (!projectMember || projectMember.role !== 'LEAD') {
            throw ApiError.forbidden('Only OWNER, ADMIN, or project LEAD can add members')
        }
    }

    // Check if user is workspace member
    const newMember = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId: project.workspaceId,
                userId
            }
        }
    })

    if (!newMember) {
        throw ApiError.conflict('User must be a workspace member first')
    }

    if (newMember.role === 'VIEWER' && role !== 'VIEWER') {
        throw ApiError.forbidden('Workspace VIEWERs can only be added as project VIEWER')
    }

    // Add to project
    const member = await prisma.projectMember.create({
        data: {
            projectId: projectId as string,
            userId,
            role: role || 'DEVELOPER'
        },
        include: { user: { select: { id: true, name: true, email: true } } }
    })

    await logActivity({
        action: ActivityActions.MEMBER_ADDED,
        scope: 'PROJECT',
        userId: requester,
        projectId: projectId as string,
        meta: { addedUserId: userId, role }
    })

    await notificationQueue.add('notification', {
        userId,
        type: NotificationTypes.PROJECT_ADDED,
        content: `You've been added to project`,
        link: `/projects/${projectId}`,
        triggeredBy: requester,
    })

    sendSuccess(res, member, 'Member added to project')

})

// ─── GET /projects/:id/members ────────────────────────────────────
export const getProjectMembers = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    // ─── Check cache ──────────────────────────────────────────
    const cacheKey = CacheKeys.projectMembers(id as string)
    const cached = await getCache(cacheKey)

    if (cached) {
        sendSuccess(res, cached, "Members fetched successfully")
        return
    }

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

    await setCache(cacheKey, members, TTL.MEMBERS)

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

    // add after DB write in both functions:
    await deleteCache(CacheKeys.projectMembers(id as string))

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

    // add after DB write in both functions:
    await deleteCache(CacheKeys.projectMembers(id as string))
    sendNoContent(res)

})

// ─── POST /projects/:id/labels ────────────────────────────────────
export const createLabel = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params
    const { name, color } = createLabelSchema.parse(req.body)

    const existing = await prisma.label.findUnique({
        where: {
            name_projectId: {
                name,
                projectId: projectId as string
            }
        }
    })

    if (existing) {
        throw ApiError.conflict(`Label "${name}" already exists in this project`)
    }

    const label = await prisma.label.create({
        data: {
            name,
            color: color as string,
            projectId: projectId as string
        }
    })

    sendSuccess(res, label, "Label created successfully")
})

// ─── GET /projects/:id/labels ─────────────────────────────────────
export const getLabels = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params

    const labels = await prisma.label.findMany({
        where: {
            projectId: projectId as string
        },
        orderBy: {
            createdAt: 'asc'
        }
    })

    sendSuccess(res, labels, "Labels fetched successfully")
})

// ─── PATCH /projects/:id/labels/:labelId ──────────────────────────
export const updateLabel = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId, labelId } = req.params
    const { name, color } = updateLabelSchema.parse(req.body)

    const label = await prisma.label.findUnique({
        where: {
            id: labelId as string
        }
    })

    if (!label || label.projectId !== projectId) {
        throw ApiError.notFound('Label not found')
    }

    if (name && name !== label.name) {
        const duplicate = await prisma.label.findUnique({
            where: {
                name_projectId: {
                    name,
                    projectId: projectId as string
                }
            }
        })

        if (duplicate) {
            throw ApiError.conflict(`Label "${name}" already exists in this project`)
        }
    }

    const updated = await prisma.label.update({
        where: {
            id: labelId as string
        },
        data: buildUpdateData({ name, color })
    })

    sendSuccess(res, updated, "Label updated successfully")

})

// ─── DELETE /projects/:id/labels/:labelId ───────────────────────
export const deleteLabel = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId, labelId } = req.params

    const label = await prisma.label.findUnique({
        where: {
            id: labelId as string
        }
    })

    if (!label || label.projectId !== projectId) {
        throw ApiError.notFound('Label not found')
    }

    // IssueLabel rows clean up automatically via onDelete: Cascade
    const deleted = await prisma.label.delete({
        where: {
            id: labelId as string
        }
    })

    sendNoContent(res)
})