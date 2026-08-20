// repositories/sprint.repository.ts
import { prisma } from '@devflow/db';

export const sprintRepository = {
    findById(sprintId: string) {
        return prisma.sprint.findUnique({ where: { id: sprintId } });
    },

    findByIdWithIssues(sprintId: string) {
        return prisma.sprint.findUnique({
            where: { id: sprintId },
            include: { issues: true },
        });
    },

    findActiveSprintInProject(projectId: string) {
        return prisma.sprint.findFirst({ where: { projectId, status: 'ACTIVE' } });
    },

    async activate(sprintId: string, startDate: Date) {
        return prisma.$transaction(async (tx) => {
            const updated = await tx.sprint.update({
                where: { id: sprintId },
                data: { status: 'ACTIVE', startDate },
            });
            await tx.issue.updateMany({
                where: { sprintId, status: 'BACKLOG' },
                data: { status: 'TODO' },
            });
            return updated;
        });
    },

    async complete(sprintId: string, endDate: Date) {
        return prisma.$transaction(async (tx) => {
            await tx.issue.updateMany({
                where: { sprintId, status: { not: 'DONE' } },
                data: { status: 'BACKLOG', sprintId: null },
            });
            return tx.sprint.update({
                where: { id: sprintId },
                data: { status: 'COMPLETED', endDate },
            });
        });
    },

    findProjectMemberIds(projectId: string) {
        return prisma.projectMember.findMany({
            where: { projectId },
            select: { userId: true },
        });
    },
}