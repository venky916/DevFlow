// repositories/project.repository.ts
import { prisma } from '@devflow/db';
import { ProjectRole } from '@devflow/types';

export const projectRepository = {
    findById(projectId: string) {
        return prisma.project.findUnique({ where: { id: projectId } });
    },

    findWorkspaceMember(workspaceId: string, userId: string) {
        return prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
        });
    },

    addMember(projectId: string, userId: string, role: ProjectRole) {
        return prisma.projectMember.create({
            data: { projectId, userId, role },
            include: { user: { select: { id: true, name: true, email: true } } },
        });
    },
};