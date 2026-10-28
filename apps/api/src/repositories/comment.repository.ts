// repositories/comment.repository.ts
import { prisma } from '@devflow/db';

const userSelect = { select: { id: true, name: true, avatarUrl: true } };

// Prisma wants plain JSON; this turns the editor's content into exactly that
const toJson = (content: unknown) => JSON.parse(JSON.stringify(content));

export const commentRepository = {
  findIssueContext(issueId: string) {
    return prisma.issue.findUnique({
      where: { id: issueId },
      select: { projectId: true, creatorId: true, title: true, assigneeId: true },
    });
  },

  listByIssue(issueId: string) {
    return prisma.comment.findMany({
      where: { issueId },
      include: { user: userSelect },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  },

  // the comment with its author and the project it belongs to (through its issue)
  findByIdWithIssue(commentId: string) {
    return prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: userSelect,
        issue: { select: { id: true, projectId: true, title: true } },
      },
    });
  },

  create(issueId: string, userId: string, content: unknown) {
    return prisma.comment.create({
      data: { content: toJson(content), issueId, userId },
      include: { user: userSelect },
    });
  },

  update(commentId: string, content: unknown) {
    return prisma.comment.update({
      where: { id: commentId },
      data: { content: toJson(content) },
      include: { user: userSelect },
    });
  },

  delete(commentId: string) {
    return prisma.comment.delete({ where: { id: commentId } });
  },

  findUserById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  },

  findProjectMemberIds(projectId: string) {
    return prisma.projectMember.findMany({ where: { projectId }, select: { userId: true } });
  },
};
