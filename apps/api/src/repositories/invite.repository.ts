// repositories/invite.repository.ts
import { prisma } from '@devflow/db';
import { WorkspaceRole } from '@devflow/types';

export const inviteRepository = {
    findWorkspaceById(workspaceId: string) {
        return prisma.workspace.findUnique({ where: { id: workspaceId } });
    },

    findUserByEmail(email: string) {
        return prisma.user.findUnique({ where: { email } });
    },

    findWorkspaceMember(workspaceId: string, userId: string) {
        return prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
        });
    },

    findPendingInvite(workspaceId: string, email: string) {
        return prisma.workspaceInvite.findFirst({
            where: {
                workspaceId,
                email,
                acceptedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
    },

    createInvite(workspaceId: string, email: string, role: WorkspaceRole, invitedBy: string, expiresAt: Date) {
        return prisma.workspaceInvite.create({
            data: { workspaceId, email, role, invitedBy, expiresAt },
        });
    },

    findUserById(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
        });
    },
};