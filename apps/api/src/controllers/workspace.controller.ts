import { Request, Response } from 'express';

import { prisma } from '@devflow/db';
import { fileCleanupQueue } from '@devflow/queues';
import { isPublicUrlIn, keyFromUrl } from '@devflow/storage';
import {
  createWorkspaceSchema,
  updateMemberRoleSchema,
  updateWorkspaceLogoSchema,
  updateWorkspaceSchema,
} from '@devflow/validators';

import { ApiError } from '../lib/ApiError';
import { sendCreated, sendNoContent, sendSuccess } from '../lib/apiResponse';
import { asyncHandler } from '../lib/asyncHandler';
import { CacheKeys, deleteCache, getCache, setCache } from '../lib/cache';
import { buildUpdateData } from '../lib/updateBuilder';

const getMember = async (workspaceId: string, userId: string) => {
  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
    },
  });
  return member;
};

// ─── POST /workspaces ─────────────────────────────────────────────
export const createWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const { name, slug, logoUrl } = createWorkspaceSchema.parse(req.body);
  const userId = req.user!.id;

  const existing = await prisma.workspace.findFirst({
    where: {
      slug,
    },
  });

  if (existing) {
    throw ApiError.conflict(`Slug already taken`);
  }

  if (logoUrl && !isPublicUrlIn(logoUrl, 'logos')) throw ApiError.badRequest('Invalid logo URL');

  // Create workspace + add creator as ADMIN in one transaction
  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        name,
        slug,
        logoUrl,
      },
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: ws.id,
        userId,
        role: 'ADMIN',
      },
    });

    return ws;
  });

  sendCreated(res, workspace, 'Workspace created successfully');
});

// ─── GET /workspaces ──────────────────────────────────────────
export const getMyWorkspaces = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
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
          projects: true,
          members: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  const signed = await Promise.all(
    workspaces.map(async (ws) => {
      const myMembership = ws.members.find((m) => m.userId === userId);
      return {
        ...ws,
        currentUserWorkspaceRole: myMembership?.role ?? null, // NEW
      };
    }),
  );
  sendSuccess(res, signed, 'Workspaces fetched successfully');
});

// ─── GET /workspaces/:id ──────────────────────────────────────────
export const getWorkspaceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const member = await getMember(id as string, userId);

  if (!member) {
    throw ApiError.forbidden('You are not a member of this workspace');
  }

  const workspace = await prisma.workspace.findUnique({
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
      projects: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          projects: true,
          members: true,
        },
      },
    },
  });

  if (!workspace) {
    throw ApiError.notFound(`Workspace not found`);
  }

  const activeSprintsCount = await prisma.sprint.count({
    where: {
      projectId: { in: workspace.projects.map((p) => p.id) },
      status: 'ACTIVE',
    },
  });

  sendSuccess(
    res,
    {
      ...workspace,
      activeSprintsCount,
      currentUserWorkspaceRole: member.role,
    },
    'Workspace fetched successfully',
  );
});

// ─── PATCH /workspaces/: id ────────────────────────────────────────
export const updateWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, logoUrl } = updateWorkspaceSchema.parse(req.body);
  const userId = req.user!.id;

  const member = await getMember(id as string, userId);

  if (!member || !['ADMIN'].includes(member.role)) {
    throw ApiError.forbidden('Only ADMIN can update workspace');
  }

  const workspace = await prisma.workspace.update({
    where: {
      id: id as string,
    },
    data: buildUpdateData({ name, logoUrl }),
  });

  sendSuccess(res, workspace, 'Workspace updated successfully');
});

// ─── DELETE /workspaces/:id ───────────────────────────────────────
export const deleteWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const member = await getMember(id as string, userId);

  if (!member || member.role !== 'ADMIN') {
    throw ApiError.forbidden('Only ADMIN can delete workspace');
  }

  // 1. collect
  const files = await prisma.attachment.findMany({
    where: {
      OR: [{ issue: { project: { workspaceId: id as string } } }],
    },
    select: { fileKey: true },
  });

  const workspace = await prisma.workspace.delete({
    where: {
      id: id as string,
    },
  });

  // 3. queue (attachments + logo)
  const jobs = files.map((f) => ({ name: 'delete-file', data: { fileKey: f.fileKey } }));
  if (workspace.logoUrl) {
    await fileCleanupQueue.add('delete-file', { fileKey: keyFromUrl(workspace.logoUrl) });
  }
  if (jobs.length) {
    await fileCleanupQueue.addBulk(jobs);
  }

  sendNoContent(res);
});

// ─── GET /workspaces/:id/members ─────────────────────────────────
export const getWorkspaceMembers = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const member = await getMember(id as string, userId);
  if (!member) {
    throw ApiError.forbidden('You are not a member of this workspace');
  }

  // ─── Check cache ──────────────────────────────────────────
  const cacheKey = CacheKeys.workspaceMembers(id as string);
  const cached = await getCache(cacheKey);

  if (cached) {
    sendSuccess(res, cached, 'Members fetched successfully');
    return;
  }

  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: id as string,
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

  await setCache(cacheKey, members);
  sendSuccess(res, members, 'Members fetched successfully');
});

// ─── PATCH /workspaces/:id/members/:uid ──────────────────────────
export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const { id, uid } = req.params;

  const userId = req.user!.id;
  const { role } = updateMemberRoleSchema.parse(req.body);

  const requester = await getMember(id as string, userId);

  if (!requester || !['ADMIN'].includes(requester.role)) {
    throw ApiError.forbidden('Only ADMIN can change roles');
  }

  const targetMember = await getMember(id as string, uid as string);

  if (!targetMember) {
    throw ApiError.notFound('Member not found in this workspace');
  }

  if (targetMember.role === 'ADMIN' && role === 'ADMIN') {
    const adminCount = await prisma.workspaceMember.count({
      where: { workspaceId: id as string, role: 'ADMIN' },
    });
    if (adminCount <= 1) {
      throw ApiError.forbidden('Cannot demote the last admin — assign another admin first');
    }
  }

  const updated = await prisma.workspaceMember.update({
    where: {
      workspaceId_userId: {
        workspaceId: id as string,
        userId: uid as string,
      },
    },
    data: {
      role,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  // add after DB write in both functions:
  await deleteCache(CacheKeys.workspaceMembers(id as string));
  sendSuccess(res, updated, 'Member Role updated successfully');
});

// ─── DELETE /workspaces/:id/members/:uid ─────────────────────────
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const { id, uid } = req.params;
  const userId = req.user!.id;

  const requester = await getMember(id as string, userId);

  if (!requester || !['ADMIN'].includes(requester.role)) {
    throw ApiError.forbidden('Only ADMIN can delete members');
  }

  const targetMember = await getMember(id as string, uid as string);

  if (!targetMember) {
    throw ApiError.notFound('Member not found in this workspace');
  }

  if (targetMember.role === 'ADMIN') {
    throw ApiError.forbidden('Cannot remove ADMIN from workspace');
  }

  // cascade: remove their project-member rows for projects in this workspace, same transaction
  await prisma.$transaction(async (tx) => {
    // unassign their issues across every project in this workspace —
    // must run before the ProjectMember rows are deleted, same tx
    await tx.issue.updateMany({
      where: {
        assigneeId: uid as string,
        project: { workspaceId: id as string },
      },
      data: { assigneeId: null },
    });

    await tx.projectMember.deleteMany({
      where: {
        userId: uid as string,
        project: { workspaceId: id as string },
      },
    });

    await tx.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: id as string, userId: uid as string } },
    });
  });

  // add after DB write in both functions:
  await deleteCache(CacheKeys.workspaceMembers(id as string));
  sendNoContent(res);
});

// ─── UPDATE LOGO ──────────────────────────────────────────────
export const updateWorkspaceLogo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { url } = updateWorkspaceLogoSchema.parse(req.body);
  if (!isPublicUrlIn(url, 'logos')) throw ApiError.badRequest('Invalid logo URL');

  const member = await getMember(id as string, userId);

  if (!member || member.role !== 'ADMIN') {
    throw ApiError.forbidden('Only ADMIN can update the workspace logo');
  }
  const existing = await prisma.workspace.findUnique({
    where: { id: id as string },
    select: { logoUrl: true },
  });

  const workspace = await prisma.workspace.update({
    where: {
      id: id as string,
    },
    data: {
      logoUrl: url,
    },
  });

  if (existing?.logoUrl && existing.logoUrl !== url) {
    await fileCleanupQueue.add('delete-file', { fileKey: keyFromUrl(existing.logoUrl) });
  }

  sendSuccess(res, workspace, 'Logo updated successfully');
});

// ─── REMOVE LOGO ──────────────────────────────────────────────
export const removeWorkspaceLogo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const member = await getMember(id as string, userId);
  if (!member || member.role !== 'ADMIN') {
    throw ApiError.forbidden('Only ADMIN can remove the workspace logo');
  }

  const existing = await prisma.workspace.findUnique({
    where: { id: id as string },
    select: { logoUrl: true },
  });

  const workspace = await prisma.workspace.update({
    where: { id: id as string },
    data: { logoUrl: null },
  });

  if (existing?.logoUrl) {
    await fileCleanupQueue.add('delete-file', { fileKey: keyFromUrl(existing.logoUrl) });
  }

  sendSuccess(res, workspace, 'Logo removed successfully');
});
