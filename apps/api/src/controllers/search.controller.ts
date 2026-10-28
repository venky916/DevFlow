import { Request, Response } from 'express';

import { prisma } from '@devflow/db';

import { sendSuccess } from '../lib/apiResponse';
import { asyncHandler } from '../lib/asyncHandler';

const MIN_QUERY_LENGTH = 2;
const WORKSPACE_LIMIT = 5;
const PROJECT_LIMIT = 5;
const ISSUE_LIMIT = 5;
const SETTINGS_LIMIT = 5;

interface SearchItem {
  type: 'workspace' | 'project' | 'issue' | 'page';
  id: string;
  name: string;
  context: string | null;
  url: string;
}

export const globalSearch = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const q = String(req.query.q ?? '').trim();

  if (q.length < MIN_QUERY_LENGTH) {
    sendSuccess(res, { items: [] });
  }
  const needle = q.toLowerCase();

  // Every workspace this user belongs to, with their role in each
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { role: true, workspace: { select: { id: true, name: true, slug: true } } },
  });
  const workspaceIds = memberships.map((m) => m.workspace.id);
  const adminWorkspaceIds = memberships
    .filter((m) => m.role === 'ADMIN')
    .map((m) => m.workspace.id);

  // Same rule as resolveProjectAccess, in query form:
  // workspace admins see every project, everyone else only their own
  const openableProjects = {
    workspaceId: { in: workspaceIds },
    OR: [{ workspaceId: { in: adminWorkspaceIds } }, { members: { some: { userId } } }],
  };

  const [projects, issues] = await Promise.all([
    prisma.project.findMany({
      where: { ...openableProjects, name: { contains: q, mode: 'insensitive' } },
      orderBy: { updatedAt: 'desc' },
      take: PROJECT_LIMIT,
      select: {
        id: true,
        name: true,
        slug: true,
        workspace: { select: { name: true, slug: true } },
      },
    }),
    prisma.issue.findMany({
      where: { title: { contains: q, mode: 'insensitive' }, project: openableProjects },
      orderBy: { updatedAt: 'desc' },
      take: ISSUE_LIMIT,
      select: {
        id: true,
        title: true,
        project: {
          select: { name: true, slug: true, workspace: { select: { name: true, slug: true } } },
        },
      },
    }),
  ]);

  const items: SearchItem[] = [];

  memberships
    .filter((m) => m.workspace.name.toLowerCase().includes(needle))
    .slice(0, WORKSPACE_LIMIT)
    .forEach(({ workspace }) => {
      items.push({
        type: 'workspace',
        id: workspace.id,
        name: workspace.name,
        context: null,
        url: `/${workspace.slug}`,
      });
    });

  projects.forEach((project) => {
    items.push({
      type: 'project',
      id: project.id,
      name: project.name,
      context: project.workspace.name,
      url: `/${project.workspace.slug}/${project.slug}/board`,
    });
  });

  issues.forEach((issue) => {
    const { project } = issue;
    items.push({
      type: 'issue',
      id: issue.id,
      name: issue.title,
      context: `${project.workspace.name} · ${project.name}`,
      url: `/${project.workspace.slug}/${project.slug}/issues/${issue.id}`,
    });
  });

  // Settings rows only, and only where the role allows (workspace admin, or project lead)
  if ('settings'.includes(needle)) {
    const leadProjects = await prisma.project.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        OR: [
          { workspaceId: { in: adminWorkspaceIds } },
          { members: { some: { userId, role: 'LEAD' } } },
        ],
      },
      take: SETTINGS_LIMIT,
      select: {
        id: true,
        name: true,
        slug: true,
        workspace: { select: { name: true, slug: true } },
      },
    });

    const settingsPages: SearchItem[] = [
      ...memberships
        .filter((m) => m.role === 'ADMIN')
        .map(({ workspace }) => ({
          type: 'page' as const,
          id: `${workspace.id}:settings`,
          name: 'Settings',
          context: workspace.name,
          url: `/${workspace.slug}/settings`,
        })),
      ...leadProjects.map((project) => ({
        type: 'page' as const,
        id: `${project.id}:settings`,
        name: 'Settings',
        context: `${project.workspace.name} · ${project.name}`,
        url: `/${project.workspace.slug}/${project.slug}/settings`,
      })),
    ];

    items.push(...settingsPages.slice(0, SETTINGS_LIMIT));
  }

  sendSuccess(res, { items });
});
