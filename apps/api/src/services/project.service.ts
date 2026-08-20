// services/project.service.ts
import { projectRepository } from '../repositories/project.repository';
import { activityService } from './activity.service';
import { notificationService } from './notification.service';
import { ApiError } from '../lib/ApiError';
import { ProjectRole } from '@devflow/types';

export const projectService = {
    async addMember(projectId: string, requesterId: string, targetUserId: string, role: ProjectRole) {
        const project = await projectRepository.findById(projectId);
        if (!project) throw ApiError.notFound('Project not found');

        const newMember = await projectRepository.findWorkspaceMember(project.workspaceId, targetUserId);
        if (!newMember) throw ApiError.conflict('User must be a workspace member first');

        const finalRole: ProjectRole = role ?? 'DEVELOPER';

        const member = await projectRepository.addMember(projectId, targetUserId, finalRole);

        await activityService.logMemberAdded(projectId, requesterId, targetUserId, finalRole);
        await notificationService.notifyProjectMemberAdded(targetUserId, projectId, requesterId);

        return member;
    },
};