// services/invite.service.ts
import { inviteRepository } from '../repositories/invite.repository';
import { notificationService } from './notification.service';
import { ApiError } from '../lib/ApiError';
import { WorkspaceRole } from '@devflow/types';

export const inviteService = {
    async createInvite(workspaceId: string, requesterId: string, email: string, role: WorkspaceRole) {
        const workspace = await inviteRepository.findWorkspaceById(workspaceId);
        if (!workspace) throw ApiError.notFound('Workspace not found');

        const invitedUser = await inviteRepository.findUserByEmail(email);

        if (invitedUser) {
            const existingMember = await inviteRepository.findWorkspaceMember(workspaceId, invitedUser.id);
            if (existingMember) throw ApiError.conflict('User is already a member of this workspace');
        }

        const existingInvite = await inviteRepository.findPendingInvite(workspaceId, email);
        if (existingInvite) throw ApiError.conflict('Invite already pending for this email');

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invite = await inviteRepository.createInvite(workspaceId, email, role, requesterId, expiresAt);

        const inviter = await inviteRepository.findUserById(requesterId);

        if (invitedUser) {
            await notificationService.notifyWorkspaceInvited(invitedUser.id, workspace.name, invite.token, requesterId);
        }

        await notificationService.sendInviteEmail(
            email,
            workspace.name,
            inviter?.name ?? inviter?.email ?? 'Admin',
            invite.token,
            role
        );

        return { inviteId: invite.id, email, role, expiresAt };
    },
};