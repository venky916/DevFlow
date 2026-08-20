// services/notification.service.ts
import { emailQueue, notificationQueue } from '@devflow/queues';
import { NotificationTypes } from '@devflow/types';
import { issueRepository } from '../repositories/issue.repository';

export const notificationService = {

    async notifySprintStarted(memberUserIds: string[], sprintId: string, sprintName: string, projectId: string, triggeredBy: string) {
        await Promise.all(
            memberUserIds.map((userId) =>
                notificationQueue.add('notification', {
                    userId,
                    type: NotificationTypes.SPRINT_STARTED,
                    content: `Sprint "${sprintName}" has started`,
                    link: `/projects/${projectId}/board`,
                    triggeredBy,
                })
            )
        );
    },

    async notifySprintCompleted(memberUserIds: string[], sprintId: string, sprintName: string, projectId: string, triggeredBy: string, doneCount: number, incompleteCount: number) {
        await Promise.all(
            memberUserIds.map((userId) =>
                notificationQueue.add('notification', {
                    userId,
                    type: NotificationTypes.SPRINT_COMPLETED,
                    content: `Sprint "${sprintName}" completed — ${doneCount} done, ${incompleteCount} moved to backlog`,
                    link: `/projects/${projectId}/board`,
                    triggeredBy,
                })
            )
        );
    },

    async notifyProjectMemberAdded(userId: string, projectId: string, triggeredBy: string) {
        await notificationQueue.add('notification', {
            userId,
            type: NotificationTypes.PROJECT_ADDED,
            content: `You've been added to project`,
            link: `/projects/${projectId}`,
            triggeredBy,
        });
    },

    // services/notification.service.ts — add these two methods to the existing object
    async notifyWorkspaceInvited(userId: string, workspaceName: string, inviteToken: string, triggeredBy: string): Promise<void> {
        await notificationQueue.add('notification', {
            userId,
            type: NotificationTypes.WORKSPACE_INVITED,
            content: `You've been invited to join ${workspaceName}`,
            link: `/invite?token=${inviteToken}`,
            triggeredBy,
        });
    },

    async sendInviteEmail(email: string, workspaceName: string, invitedByName: string, inviteToken: string, role: string): Promise<void> {
        await emailQueue.add('email', {
            to: email,
            type: NotificationTypes.WORKSPACE_INVITED,
            data: {
                workspaceName,
                invitedBy: invitedByName,
                inviteLink: `${process.env.BASE_WEB_URL}/invite?token=${inviteToken}`,
                role,
            },
        });
    },

    async notifyMention(userId: string, commenterName: string, issueTitle: string, issueId: string, triggeredBy: string): Promise<void> {
        await notificationQueue.add('notification', {
            userId,
            type: NotificationTypes.MENTION,
            content: `@${commenterName} mentioned you in: ${issueTitle}`,
            link: `/issues/${issueId}`,
            triggeredBy,
        });
    },

    async notifyIssueCommented(userId: string, commenterName: string, issueTitle: string, issueId: string, triggeredBy: string): Promise<void> {
        await notificationQueue.add('notification', {
            userId,
            type: NotificationTypes.ISSUE_COMMENTED,
            content: `@${commenterName} commented on your issue: ${issueTitle}`,
            link: `/issues/${issueId}`,
            triggeredBy,
        });
    },

    async sendCommentEmail(to: string, issueTitle: string, commenterName: string, commentPreview: string, creatorName: string | null, projectId: string, issueId: string): Promise<void> {
        await emailQueue.add('email', {
            to,
            type: NotificationTypes.ISSUE_COMMENTED,
            data: {
                issueTitle,
                commentedBy: commenterName,
                comment: commentPreview.slice(0, 200),
                assigneeName: creatorName,
                projectName: projectId,
                issueLink: `${process.env.BASE_WEB_URL}/issues/${issueId}`,
            },
        });
    },

    async notifyIssueAssigned(assigneeId: string, triggeredBy: string, issueId: string, issueTitle: string, projectId: string): Promise<void> {
        await notificationQueue.add('notification', {
            userId: assigneeId,
            type: NotificationTypes.ISSUE_ASSIGNED,
            content: `You were assigned to: ${issueTitle}`,
            link: `/issues/${issueId}`,
            triggeredBy,
        });

        const assignee = await issueRepository.findAssigneeContact(assigneeId); // add this tiny method to issue.repository.ts, or reuse a shared user lookup if you have one
        if (assignee) {
            await emailQueue.add('email', {
                to: assignee.email,
                type: NotificationTypes.ISSUE_ASSIGNED,
                data: {
                    assigneeName: assignee.name,
                    issueTitle,
                    projectName: projectId,
                    assignedBy: triggeredBy,
                    issueLink: `${process.env.BASE_WEB_URL}/issues/${issueId}`,
                },
            });
        }
    },
}