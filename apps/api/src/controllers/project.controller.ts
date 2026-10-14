import { Request, Response } from 'express';

import { prisma } from '@devflow/db';
import { fileCleanupQueue } from '@devflow/queues';
import { ProjectRole } from '@devflow/types';
import {
  addProjectMemberSchema,
  createLabelSchema,
  createProjectSchema,
  updateLabelSchema,
  updateProjectMemberRoleSchema,
  updateProjectSchema,
} from '@devflow/validators';

import { ApiError } from '../lib/ApiError';
import { sendCreated, sendNoContent, sendSuccess } from '../lib/apiResponse';
import { asyncHandler } from '../lib/asyncHandler';
import { CacheKeys, deleteCache, getCache, setCache, TTL } from '../lib/cache';
import { buildUpdateData } from '../lib/updateBuilder';
import { projectService } from '../services/project.service';

const projectSummarySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  color: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { issues: true, sprints: true, members: true } },
} as const;

// userIds of workspace admins for this project's workspace.
// Never cached, because a workspace role change must show up immediately.
async function getWorkspaceAdminIds(projectId: string): Promise<Set<string>> {
  const admins = await prisma.workspaceMember.findMany({
    where: { role: 'ADMIN', workspace: { projects: { some: { id: projectId } } } },
    select: { userId: true },
  });
  return new Set(admins.map((a) => a.userId));
}

const withAdminFlag = <T extends { userId: string }>(members: T[], adminIds: Set<string>) =>
  members.map((m) => ({ ...m, isWorkspaceAdmin: adminIds.has(m.userId) }));


// ─── POST /workspaces/:workspaceId/projects ───────────────────────
export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { name, slug, description, color } = createProjectSchema.parse(req.body);
  const userId = req.user!.id;

  // create project + add creator as LEAD in one transaction
  const project = await prisma.$transaction(async (tx) => {
    const proj = await tx.project.create({
      data: {
        name,
        slug,
        description,
        workspaceId: workspaceId as string,
        color,
      },
    });
    await tx.projectMember.create({
      data: {
        projectId: proj.id,
        userId,
        role: 'LEAD',
      },
    });
    return proj;
  });

  sendCreated(res, project, 'Project created successfully');
});

// ─── GET /workspaces/:workspaceId/projects ────────────────────────
export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.user!.id;

  // Check requester's workspace role
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: workspaceId as string, userId } },
  });

  if (!workspaceMember) {
    throw ApiError.forbidden('You are not a member of this workspace');
  }

  const isOwnerOrAdmin = ['ADMIN'].includes(workspaceMember.role);

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
              avatarUrl: true,
            },
          },
        },
      },
      _count: {
        select: {
          issues: true,
          sprints: true,
          members: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // NEW — attach resolved access per project, no extra query needed:
  // admin → isWorkspaceAdmin true always; otherwise pull role from the members array we already fetched
  const mapped = projects.map((p) => {
    const myMembership = p.members.find((m) => m.userId === userId);
    return {
      ...p,
      currentUserAccess: isOwnerOrAdmin
        ? { isWorkspaceAdmin: true, projectRole: null }
        : { isWorkspaceAdmin: false, projectRole: myMembership?.role ?? null },
    };
  });

  sendSuccess(res, mapped, 'Projects fetched successfully');
});

// ─── GET /workspaces/:workspaceId/projects/summary ────────────────
// Lean list for workspace home and the sidebar. No member lists.
export const getProjectSummaries = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const userId = req.user!.id;

  const wsMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: workspaceId as string, userId } },
    select: { role: true },
  });
  if (!wsMember) throw ApiError.forbidden('You are not a member of this workspace');

  const isWorkspaceAdmin = wsMember.role === 'ADMIN';

  const projects = await prisma.project.findMany({
    where: {
      workspaceId: workspaceId as string,
      // admins see every project, everyone else only their own
      ...(!isWorkspaceAdmin && { members: { some: { userId } } }),
    },
    select: {
      ...projectSummarySelect,
      members: { where: { userId }, select: { role: true } }, // only my row
    },
    orderBy: { createdAt: 'desc' },
  });

  const data = projects.map(({ members, ...project }) => ({
    ...project,
    currentUserAccess: isWorkspaceAdmin
      ? { isWorkspaceAdmin: true, projectRole: null }
      : { isWorkspaceAdmin: false, projectRole: members[0]?.role ?? null },
  }));

  sendSuccess(res, data, 'Project summaries fetched successfully');
});

// ─── GET /projects/:id ────────────────────────────────────────────
export const getProjectById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const project = await prisma.project.findUnique({
    where: {
      id: id as string,
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
      sprints: {
        include: {
          _count: {
            select: { issues: true },
          },
          issues: {
            where: { status: 'DONE' },
            select: { id: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      _count: {
        select: {
          issues: true,
          sprints: true,
          members: true,
        },
      },
    },
  });

  if (!project) {
    throw ApiError.notFound('Project not found');
  }
  const adminIds = await getWorkspaceAdminIds(id as string);
  const mapped = {
    ...project,
    currentUserAccess: req.projectAccess,
    members: withAdminFlag(project.members, adminIds),
    sprints: project.sprints.map((sprint) => {
      return {
        ...sprint,
        issues: sprint.issues.map((issue) => issue.id),
      };
    }),
  };

  sendSuccess(res, mapped, 'Project fetched successfully');
});

// ─── GET /projects/by-slug/:workspaceSlug/:projectSlug ────────────
// One project + the caller's access. 404 when it doesn't exist OR the caller
// can't see it (same answer, so slugs can't be probed).
export const getProjectBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceSlug, projectSlug } = req.params;
  const userId = req.user!.id;

  const project = await prisma.project.findFirst({
    where: {
      slug: projectSlug as string,
      workspace: { slug: workspaceSlug as string, members: { some: { userId } } },
    },
    select: {
      ...projectSummarySelect,
      members: { where: { userId }, select: { role: true } },
      workspace: { select: { members: { where: { userId }, select: { role: true } } } },
    },
  });

  if (!project) throw ApiError.notFound('Project not found');

  const { members, workspace, ...rest } = project;
  const isWorkspaceAdmin = workspace.members[0]?.role === 'ADMIN';
  const projectRole = members[0]?.role ?? null;

  // a workspace member who isn't in this project gets the same 404
  if (!isWorkspaceAdmin && !projectRole) throw ApiError.notFound('Project not found');

  sendSuccess(
    res,
    {
      ...rest,
      currentUserAccess: isWorkspaceAdmin
        ? { isWorkspaceAdmin: true, projectRole: null }
        : { isWorkspaceAdmin: false, projectRole },
    },
    'Project fetched successfully',
  );
});

// ─── PATCH /projects/:id ──────────────────────────────────────────
export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, color } = updateProjectSchema.parse(req.body);

  const project = await prisma.project.update({
    where: {
      id: id as string,
    },
    data: buildUpdateData({ name, description, color }),
  });

  sendSuccess(res, project, 'Project updated successfully');
});

// ─── DELETE /projects/:id ─────────────────────────────────────────
export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // 1. collect the file keys (issue attachments + comment attachments)
  const files = await prisma.attachment.findMany({
    where: {
      OR: [{ issue: { projectId: id as string } }],
    },
    select: { fileKey: true },
  });
  // 2. delete the project (Cascade removes everything inside it)
  await prisma.project.delete({
    where: {
      id: id as string,
    },
  });
  // 3. queue the file deletions
  if (files.length) {
    await fileCleanupQueue.addBulk(
      files.map((f) => ({ name: 'delete-file', data: { fileKey: f.fileKey } })),
    );
  }

  sendNoContent(res);
});

// ─── POST /projects/:id/members ──────────────────────────────
// Add a workspace member to a project
export const addProjectMember = asyncHandler(async (req: Request, res: Response) => {
  const { id: projectId } = req.params;
  const { userId, role } = addProjectMemberSchema.parse(req.body);

  const member = await projectService.addMember(
    projectId as string,
    req.user!.id,
    userId,
    role as ProjectRole,
  );

  sendCreated(res, member, 'Member added to project');
});

// ─── GET /projects/:id/members ────────────────────────────────────
export const getProjectMembers = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const adminIds = await getWorkspaceAdminIds(id as string);

  // ─── Check cache ──────────────────────────────────────────
  const cacheKey = CacheKeys.projectMembers(id as string);
  const cached = await getCache(cacheKey);

  if (cached) {
    sendSuccess(res, withAdminFlag(cached as { userId: string }[], adminIds), 'Members fetched successfully');
    return;
  }

  const members = await prisma.projectMember.findMany({
    where: {
      projectId: id as string,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'asc',
    },
  });

  // cache raw (unsigned) data — signed URLs expire, raw keys don't
  await setCache(cacheKey, members, TTL.MEMBERS);

  sendSuccess(res, withAdminFlag(members, adminIds), 'Members fetched successfully');
});

// ─── GET /projects/:id/available-members ──────────────────────────
// Workspace members not yet in this project. LEAD can call it, unlike the admin-only workspace members route.
export const getAvailableProjectMembers = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const members = await prisma.workspaceMember.findMany({
    where: {
      workspace: { projects: { some: { id: id as string } } },
      user: { projects: { none: { projectId: id as string } } },
    },
    select: {
      userId: true,
      user: { select: { id: true, email: true, name: true, avatarUrl: true } },
    },
    orderBy: { joinedAt: 'asc' },
  });

  sendSuccess(res, members, 'Available members fetched successfully');
});

// ─── PUT /projects/:id/members/:uid ────────────────────────────
export const updateProjectMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const { id, uid } = req.params;
  const { role } = updateProjectMemberRoleSchema.parse(req.body);

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id as string, userId: uid as string } },
  });

  if (!member) {
    throw ApiError.notFound('Member not found in this project');
  }

  if (member.role === 'LEAD' && role !== 'LEAD') {
    const leadCount = await prisma.projectMember.count({
      where: { projectId: id as string, role: 'LEAD' },
    });
    if (leadCount <= 1) {
      throw ApiError.forbidden('Cannot demote the last lead — assign another lead first');
    }
  }

  const updated = await prisma.projectMember.update({
    where: { projectId_userId: { projectId: id as string, userId: uid as string } },
    data: { role },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // add after DB write in both functions:
  await deleteCache(CacheKeys.projectMembers(id as string));

  sendSuccess(res, updated, 'Member role updated successfully');
});

// ─── DELETE /projects/:id/members/:uid ───────────────────────────
export const removeProjectMember = asyncHandler(async (req: Request, res: Response) => {
  const { id, uid } = req.params;

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id as string, userId: uid as string } },
  });

  if (!member) {
    throw ApiError.notFound('Member not found in this project');
  }

  if (member.role === 'LEAD') {
    const leadCount = await prisma.projectMember.count({
      where: { projectId: id as string, role: 'LEAD' },
    });
    if (leadCount <= 1) {
      throw ApiError.forbidden('Cannot remove the last lead — assign another lead first');
    }
  }

  await prisma.$transaction([
    // unassign their issues in this project — they can no longer open them
    prisma.issue.updateMany({
      where: { projectId: id as string, assigneeId: uid as string },
      data: { assigneeId: null },
    }),
    prisma.projectMember.delete({
      where: { projectId_userId: { projectId: id as string, userId: uid as string } },
    }),
  ]);

  // add after DB write in both functions:
  await deleteCache(CacheKeys.projectMembers(id as string));
  sendNoContent(res);
});

// ─── POST /projects/:id/labels ────────────────────────────────────
export const createLabel = asyncHandler(async (req: Request, res: Response) => {
  const { id: projectId } = req.params;
  const { name, color } = createLabelSchema.parse(req.body);

  const existing = await prisma.label.findUnique({
    where: {
      name_projectId: {
        name,
        projectId: projectId as string,
      },
    },
  });

  if (existing) {
    throw ApiError.conflict(`Label "${name}" already exists in this project`);
  }

  const label = await prisma.label.create({
    data: {
      name,
      color: color as string,
      projectId: projectId as string,
    },
  });

  sendSuccess(res, label, 'Label created successfully');
});

// ─── GET /projects/:id/labels ─────────────────────────────────────
export const getLabels = asyncHandler(async (req: Request, res: Response) => {
  const { id: projectId } = req.params;

  const labels = await prisma.label.findMany({
    where: {
      projectId: projectId as string,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  sendSuccess(res, labels, 'Labels fetched successfully');
});

// ─── PATCH /projects/:id/labels/:labelId ──────────────────────────
export const updateLabel = asyncHandler(async (req: Request, res: Response) => {
  const { id: projectId, labelId } = req.params;
  const { name, color } = updateLabelSchema.parse(req.body);

  const label = await prisma.label.findUnique({
    where: {
      id: labelId as string,
    },
  });

  if (!label || label.projectId !== projectId) {
    throw ApiError.notFound('Label not found');
  }

  if (name && name !== label.name) {
    const duplicate = await prisma.label.findUnique({
      where: {
        name_projectId: {
          name,
          projectId: projectId as string,
        },
      },
    });

    if (duplicate) {
      throw ApiError.conflict(`Label "${name}" already exists in this project`);
    }
  }

  const updated = await prisma.label.update({
    where: {
      id: labelId as string,
    },
    data: buildUpdateData({ name, color }),
  });

  sendSuccess(res, updated, 'Label updated successfully');
});

// ─── DELETE /projects/:id/labels/:labelId ───────────────────────
export const deleteLabel = asyncHandler(async (req: Request, res: Response) => {
  const { id: projectId, labelId } = req.params;

  const label = await prisma.label.findUnique({
    where: {
      id: labelId as string,
    },
  });

  if (!label || label.projectId !== projectId) {
    throw ApiError.notFound('Label not found');
  }

  // IssueLabel rows clean up automatically via onDelete: Cascade
  const deleted = await prisma.label.delete({
    where: {
      id: labelId as string,
    },
  });

  sendNoContent(res);
});
