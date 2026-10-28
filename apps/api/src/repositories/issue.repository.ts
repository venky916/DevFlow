import { generateKeyBetween } from 'fractional-indexing';

import { prisma } from '@devflow/db';
import type { IssuePriority, IssueStatus, IssueType } from '@devflow/types';

import { deriveParentStatus } from '../lib/issue-rules';

// works for both the normal client and a transaction client
type DbClient = Pick<typeof prisma, 'issue'>;

interface CreateIssueData {
  title: string;
  description?: string | null;
  priority: IssuePriority;
  type: IssueType;
  status: IssueStatus;
  dueDate?: Date | null;
  assigneeId?: string | null;
  sprintId?: string | null;
}

interface CreateSubIssueData {
  title: string;
  description?: string | null;
  priority: IssuePriority;
  type: IssueType;
  dueDate?: Date | null;
  assigneeId?: string | null;
}

interface AttachmentData {
  fileKey: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
}

export const issueInclude = {
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  creator: { select: { id: true, name: true, avatarUrl: true } },
  labels: { include: { label: true } },
};

// sub-issues shown inside a parent card, shared by every list endpoint
export const childrenInclude = {
  children: {
    select: {
      id: true,
      title: true,
      status: true,
      assignee: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
  },
};

// Keeps a parent's status in line with its sub-issues.
// A standalone function (not a method) so it works inside any transaction.
async function syncParentStatus(parentId: string, db: DbClient) {
  const parent = await db.issue.findUnique({
    where: { id: parentId },
    select: { status: true, sprint: { select: { status: true } } },
  });
  if (!parent) return;

  const children = await db.issue.findMany({ where: { parentId }, select: { status: true } });
  if (children.length === 0) return;

  const next = deriveParentStatus(
    children.map((c) => c.status),
    parent.sprint?.status === 'ACTIVE',
  );
  if (next !== parent.status) {
    await db.issue.update({ where: { id: parentId }, data: { status: next } });
  }
}

export const issueRepository = {
  findById(issueId: string) {
    return prisma.issue.findUnique({ where: { id: issueId } });
  },

  findByIdWithInclude(issueId: string) {
    return prisma.issue.findUnique({ where: { id: issueId }, include: issueInclude });
  },

  // what a move needs to know: the sprint's status and whether this is a parent
  findForMove(issueId: string) {
    return prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        sprint: { select: { status: true } },
        _count: { select: { children: true } },
      },
    });
  },

  findProjectMember(projectId: string, userId: string) {
    return prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
  },

  findAssigneeContact(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  },

  findLinkContext(issueId: string) {
    return prisma.issue.findUnique({
      where: { id: issueId },
      select: {
        project: { select: { name: true, slug: true, workspace: { select: { slug: true } } } },
      },
    });
  },

  countProjectLabels(projectId: string, labelIds: string[]) {
    return prisma.label.count({ where: { projectId, id: { in: labelIds } } });
  },

  // next key at the end of a bucket (a sprint, the backlog, a column, or one parent's sub-issues)
  async getNextPosition(where: {
    projectId: string;
    sprintId: string | null;
    parentId: string | null;
    status?: IssueStatus;
  }) {
    const last = await prisma.issue.findFirst({
      where,
      orderBy: [{ position: 'desc' }, { id: 'desc' }],
      select: { position: true },
    });
    return generateKeyBetween(last?.position ?? null, null);
  },

  findSprint(sprintId: string) {
    return prisma.sprint.findUnique({ where: { id: sprintId } });
  },

  async createIssue(
    projectId: string,
    creatorId: string,
    data: CreateIssueData,
    position: string,
    labelIds?: string[],
    attachments?: AttachmentData[],
  ) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.issue.create({
        data: { ...data, position, projectId, creatorId },
      });

      if (labelIds?.length) {
        await tx.issueLabel.createMany({
          data: labelIds.map((labelId) => ({ issueId: created.id, labelId })),
        });
      }
      if (attachments?.length) {
        await tx.attachment.createMany({
          data: attachments.map((a) => ({ ...a, issueId: created.id, uploadedBy: creatorId })),
        });
      }
      return tx.issue.findUnique({ where: { id: created.id }, include: issueInclude });
    });
  },

  async updateIssue(issueId: string, data: Record<string, unknown>, labelIds?: string[]) {
    return prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.issue.update({ where: { id: issueId }, data });
      }

      if (labelIds !== undefined) {
        await tx.issueLabel.deleteMany({ where: { issueId } });
        if (labelIds.length > 0) {
          await tx.issueLabel.createMany({
            data: labelIds.map((labelId) => ({ issueId, labelId })),
          });
        }
      }
      return tx.issue.findUnique({ where: { id: issueId }, include: issueInclude });
    });
  },

  async moveIssue(issueId: string, status: IssueStatus, position: string) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.issue.update({ where: { id: issueId }, data: { status, position } });
      if (result.parentId) await syncParentStatus(result.parentId, tx);
      return result;
    });
  },

  async moveToSprint(
    issueId: string,
    sprintId: string | null,
    newStatus: IssueStatus,
    position: string,
    targetSprintStatus: string | undefined,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.issue.update({
        where: { id: issueId },
        data: { sprintId, status: newStatus, position },
      });

      // sub-issues follow their parent, with the same status rule:
      // in the active sprint a Backlog sub-issue becomes Todo, anywhere else they are Backlog
      if (targetSprintStatus === 'ACTIVE') {
        await tx.issue.updateMany({ where: { parentId: issueId }, data: { sprintId } });
        await tx.issue.updateMany({
          where: { parentId: issueId, status: 'BACKLOG' },
          data: { status: 'TODO' },
        });
      } else {
        await tx.issue.updateMany({
          where: { parentId: issueId },
          data: { sprintId, status: 'BACKLOG' },
        });
      }

      // a parent's status is always derived from its sub-issues (does nothing without any)
      await syncParentStatus(issueId, tx);
    });
  },

  async createSubIssue(
    parentId: string,
    projectId: string,
    sprintId: string | null,
    creatorId: string,
    data: CreateSubIssueData,
    status: IssueStatus,
    position: string,
    labelIds?: string[],
  ) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.issue.create({
        data: { ...data, status, position, parentId, projectId, sprintId, creatorId },
      });
      if (labelIds?.length) {
        await tx.issueLabel.createMany({
          data: labelIds.map((labelId) => ({ issueId: created.id, labelId })),
        });
      }
      await syncParentStatus(parentId, tx);
      return tx.issue.findUnique({ where: { id: created.id }, include: issueInclude });
    });
  },

  countChildren(parentId: string) {
    return prisma.issue.count({ where: { parentId } });
  },

  async attachChild(
    parentId: string,
    childId: string,
    sprintId: string | null,
    childStatus: IssueStatus,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.issue.update({
        where: { id: childId },
        data: { parentId, sprintId, status: childStatus },
      });
      await syncParentStatus(parentId, tx);
      return tx.issue.findUnique({ where: { id: childId }, include: issueInclude });
    });
  },

  async detachChild(parentId: string, childId: string) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.issue.update({ where: { id: childId }, data: { parentId: null } });
      await syncParentStatus(parentId, tx);
      return result;
    });
  },

  // delete and re-sync the parent together (this used to fail after the delete)
  async delete(issueId: string) {
    return prisma.$transaction(async (tx) => {
      const deleted = await tx.issue.delete({ where: { id: issueId } });
      if (deleted.parentId) await syncParentStatus(deleted.parentId, tx);
      return deleted;
    });
  },
};
