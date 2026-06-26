import { Request, Response } from "express";
import { prisma } from "@devflow/db";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { sendSuccess } from "../lib/apiResponse";

// ─── GET /projects/:id/analytics ─────────────────────────────────
export const getProjectAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { id: projectId } = req.params;

    const project = await prisma.project.findUnique({
        where: {
            id: projectId as string
        }, select: {
            id: true,
            name: true,
        }
    })

    if (!project) {
        throw ApiError.notFound('Project not found')
    }

    const now = new Date()

    // all queries in parallel
    const [issuesByStatus,
        issuesByType,
        overdueCount,
        sprints,
        memberIssues] = await Promise.all([
            // issues grouped by status
            prisma.issue.groupBy({
                by: ['status'],
                where: { projectId: projectId as string },
                _count: { id: true }
            }),

            // issues grouped by type
            prisma.issue.groupBy({
                by: ['type'],
                where: { projectId: projectId as string },
                _count: { id: true }
            }),

            // overdue = dueDate in past and not DONE
            prisma.issue.count({
                where: {
                    projectId: projectId as string,
                    dueDate: { lt: now },
                    status: { not: 'DONE' }
                }
            }),

            // sprint velocity — all completed + active sprints
            prisma.sprint.findMany({
                where: {
                    projectId: projectId as string,
                    status: { in: ['ACTIVE', 'COMPLETED'] }
                },
                include: {
                    _count: { select: { issues: true } },
                    issues: {
                        where: { status: 'DONE' },
                        select: { id: true }
                    }
                },
                orderBy: { createdAt: 'asc' }
            }),

            // issues per assignee
            prisma.projectMember.findMany({
                where: { projectId: projectId as string },
                include: {
                    user: { select: { id: true, name: true, avatarUrl: true } },
                }
            })
        ])

    // issues by assignee — separate queries per member for overdue
    const issuesByAssignee = await Promise.all(
        memberIssues.map(async (member) => {
            const [count, overdueCount] = await Promise.all([
                prisma.issue.count({
                    where: {
                        projectId: projectId as string,
                        assigneeId: member.userId,
                        status: { not: 'DONE' }
                    }
                }),
                prisma.issue.count({
                    where: {
                        projectId: projectId as string,
                        assigneeId: member.userId,
                        dueDate: { lt: now },
                        status: { not: 'DONE' }
                    }
                })
            ])

            return {
                user: member.user,
                count,
                overdueCount
            }
        })
    )

    // shape the response
    const statusMap = Object.fromEntries(issuesByStatus.map(s => [s.status, s._count.id]))

    const typeMap = Object.fromEntries(issuesByType.map(t => [t.type, t._count.id]))

    const sprintVelocity = sprints.map(s => ({
        sprintId: s.id,
        name: s.name,
        status: s.status,
        doneCount: s.issues.length,
        totalCount: s._count.issues,
        percentage: s._count.issues > 0 ? Math.round((s.issues.length / s._count.issues) * 100) : 0
    }))

    sendSuccess(res, {
        issuesByStatus: {
            BACKLOG: statusMap['BACKLOG'] ?? 0,
            TODO: statusMap['TODO'] ?? 0,
            IN_PROGRESS: statusMap['IN_PROGRESS'] ?? 0,
            IN_REVIEW: statusMap['IN_REVIEW'] ?? 0,
            DONE: statusMap['DONE'] ?? 0,
        },
        issuesByType: {
            BUG: typeMap['BUG'] ?? 0,
            FEATURE: typeMap['FEATURE'] ?? 0,
            TASK: typeMap['TASK'] ?? 0,
            IMPROVEMENT: typeMap['IMPROVEMENT'] ?? 0,
            OTHER: typeMap['OTHER'] ?? 0,
        },
        overdueCount,
        sprintVelocity,
        issuesByAssignee: issuesByAssignee.filter(a => a.count > 0)
    }, "Project analytics fetched successfully")
})

// ─── GET /workspaces/: id / analytics ───────────────────────────────
export const getWorkspaceAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { id: workspaceId } = req.params;

    const workspace = await prisma.workspace.findUnique({
        where: {
            id: workspaceId as string
        },
        select: {
            id: true,
        }
    })

    if (!workspace) {
        throw ApiError.notFound('Workspace not found')
    }

    const projects = await prisma.project.findMany({
        where: {
            workspaceId: workspaceId as string
        },
        select: {
            id: true,
            name: true,
            color: true
        }
    })

    const projectIds = projects.map(p => p.id)

    const [totalIssues, activeSprintsCount, memberCount, members, IssueCountsByProject] = await Promise.all([
        prisma.issue.count({
            where: {
                projectId: { in: projectIds }
            }
        }),

        prisma.sprint.count({
            where: {
                projectId: { in: projectIds },
                status: 'ACTIVE'
            }
        }),

        prisma.workspaceMember.count({
            where: {
                workspaceId: workspaceId as string
            }
        }),

        prisma.workspaceMember.findMany({
            where: {
                workspaceId: workspaceId as string
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                        email: true
                    }
                }
            },
            orderBy: {
                joinedAt: 'asc'
            }
        }),
        // issue count per project
        prisma.issue.groupBy({
            by: ['projectId'],
            where: { projectId: { in: projectIds } },
            _count: { id: true }
        })
    ])

    // role breakdown
    const roleBreakdown = members.reduce((acc, member) => {
        acc[member.role] = (acc[member.role] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    // issues by project with project info

    const issuesByProject = projects.map(p => {
        const found = IssueCountsByProject.find(c => c.projectId === p.id)
        return {
            project: {
                id: p.id,
                name: p.name,
                color: p.color
            },
            count: found ? found._count.id : 0
        }
    }).sort((a, b) => b.count - a.count)

    sendSuccess(res, {
        totalIssues,
        activeSprintsCount,
        memberCount,
        issuesByProject,
        roleBreakdown: {
            ADMIN: roleBreakdown['ADMIN'] ?? 0,
            DEVELOPER: roleBreakdown['DEVELOPER'] ?? 0,
            VIEWER: roleBreakdown['VIEWER'] ?? 0,
        },
        members: members.map(m => ({
            user: m.user,
            role: m.role,
            joinedAt: m.joinedAt
        }))
    }, "Workspace Analytics fetched successfully")
})