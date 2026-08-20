// repositories/comment.repository.ts
import { prisma } from '@devflow/db';

export const commentRepository = {
    findIssueContext(issueId: string) {
        return prisma.issue.findUnique({
            where: { id: issueId },
            select: { projectId: true, creatorId: true, title: true, assigneeId: true },
        });
    },

    create(issueId: string, userId: string, content: any) {
        return prisma.comment.create({
            data: { content, issueId, userId },
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        });
    },

    findUserById(userId: string) {
        return prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    },

    findUserWithEmail(userId: string) {
        return prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    },

    findProjectMemberIds(projectId: string) {
        return prisma.projectMember.findMany({ where: { projectId }, select: { userId: true } });
    },
};