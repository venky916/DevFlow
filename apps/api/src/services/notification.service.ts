// services/notification.service.ts
import { emailQueue, notificationQueue } from '@devflow/queues';
import { NotificationTypes } from '@devflow/types';

import { absoluteUrl, webLinks } from '../lib/web-links';
import { issueRepository } from '../repositories/issue.repository';
import { projectRepository } from '../repositories/project.repository';

interface LinkContext {
  workspaceSlug: string;
  projectSlug: string;
  projectName: string;
}

// Pages are addressed by slug, so every link starts from a project's slugs.
// null means the project or issue was deleted: skip the notification.
async function getProjectContext(projectId: string): Promise<LinkContext | null> {
  const project = await projectRepository.findLinkContext(projectId);
  if (!project) return null;
  return {
    workspaceSlug: project.workspace.slug,
    projectSlug: project.slug,
    projectName: project.name,
  };
}

async function getIssueContext(issueId: string): Promise<LinkContext | null> {
  const issue = await issueRepository.findLinkContext(issueId);
  if (!issue) return null;
  const { project } = issue;
  return {
    workspaceSlug: project.workspace.slug,
    projectSlug: project.slug,
    projectName: project.name,
  };
}

export const notificationService = {
  async notifySprintStarted(
    memberUserIds: string[],
    sprintId: string,
    sprintName: string,
    projectId: string,
    triggeredBy: string,
  ) {
    const ctx = await getProjectContext(projectId);
    if (!ctx) return;

    await Promise.all(
      memberUserIds.map((userId) =>
        notificationQueue.add('notification', {
          userId,
          type: NotificationTypes.SPRINT_STARTED,
          content: `Sprint "${sprintName}" has started`,
          link: webLinks.board(ctx.workspaceSlug, ctx.projectSlug),
          triggeredBy,
        }),
      ),
    );
  },

  async notifySprintCompleted(
    memberUserIds: string[],
    sprintId: string,
    sprintName: string,
    projectId: string,
    triggeredBy: string,
    doneCount: number,
    incompleteCount: number,
  ) {
    const ctx = await getProjectContext(projectId);
    if (!ctx) return;

    await Promise.all(
      memberUserIds.map((userId) =>
        notificationQueue.add('notification', {
          userId,
          type: NotificationTypes.SPRINT_COMPLETED,
          content: `Sprint "${sprintName}" completed — ${doneCount} done, ${incompleteCount} moved to backlog`,
          link: webLinks.board(ctx.workspaceSlug, ctx.projectSlug),
          triggeredBy,
        }),
      ),
    );
  },

  async notifyProjectMemberAdded(userId: string, projectId: string, triggeredBy: string) {
    const ctx = await getProjectContext(projectId);
    if (!ctx) return;

    await notificationQueue.add('notification', {
      userId,
      type: NotificationTypes.PROJECT_ADDED,
      content: `You've been added to ${ctx.projectName}`,
      link: webLinks.project(ctx.workspaceSlug, ctx.projectSlug),
      triggeredBy,
    });
  },

  async notifyWorkspaceInvited(
    userId: string,
    workspaceName: string,
    inviteToken: string,
    triggeredBy: string,
  ): Promise<void> {
    await notificationQueue.add('notification', {
      userId,
      type: NotificationTypes.WORKSPACE_INVITED,
      content: `You've been invited to join ${workspaceName}`,
      link: webLinks.invite(inviteToken),
      triggeredBy,
    });
  },

  async sendInviteEmail(
    email: string,
    workspaceName: string,
    invitedByName: string,
    inviteToken: string,
    role: string,
  ): Promise<void> {
    await emailQueue.add('email', {
      to: email,
      type: NotificationTypes.WORKSPACE_INVITED,
      data: {
        workspaceName,
        invitedBy: invitedByName,
        inviteLink: absoluteUrl(webLinks.invite(inviteToken)),
        role,
      },
    });
  },

  async notifyMention(
    userId: string,
    commenterName: string,
    issueTitle: string,
    issueId: string,
    triggeredBy: string,
  ): Promise<void> {
    const ctx = await getIssueContext(issueId);
    if (!ctx) return;

    await notificationQueue.add('notification', {
      userId,
      type: NotificationTypes.MENTION,
      content: `@${commenterName} mentioned you in: ${issueTitle}`,
      link: webLinks.issue(ctx.workspaceSlug, ctx.projectSlug, issueId),
      triggeredBy,
    });
  },

  async notifyIssueCommented(
    userId: string,
    commenterName: string,
    issueTitle: string,
    issueId: string,
    triggeredBy: string,
  ): Promise<void> {
    const ctx = await getIssueContext(issueId);
    if (!ctx) return;

    await notificationQueue.add('notification', {
      userId,
      type: NotificationTypes.ISSUE_COMMENTED,
      content: `@${commenterName} commented on your issue: ${issueTitle}`,
      link: webLinks.issue(ctx.workspaceSlug, ctx.projectSlug, issueId),
      triggeredBy,
    });
  },

  async sendCommentEmail(
    to: string,
    issueTitle: string,
    commenterName: string,
    commentPreview: string,
    creatorName: string | null,
    projectId: string,
    issueId: string,
  ): Promise<void> {
    const ctx = await getProjectContext(projectId);
    if (!ctx) return;

    await emailQueue.add('email', {
      to,
      type: NotificationTypes.ISSUE_COMMENTED,
      data: {
        issueTitle,
        commentedBy: commenterName,
        comment: commentPreview.slice(0, 200),
        assigneeName: creatorName,
        projectName: ctx.projectName,
        issueLink: absoluteUrl(webLinks.issue(ctx.workspaceSlug, ctx.projectSlug, issueId)),
      },
    });
  },

  async notifyIssueAssigned(
    assigneeId: string,
    triggeredBy: string,
    issueId: string,
    issueTitle: string,
    projectId: string,
  ): Promise<void> {
    const ctx = await getProjectContext(projectId);
    if (!ctx) return;

    const issuePath = webLinks.issue(ctx.workspaceSlug, ctx.projectSlug, issueId);

    await notificationQueue.add('notification', {
      userId: assigneeId,
      type: NotificationTypes.ISSUE_ASSIGNED,
      content: `You were assigned to: ${issueTitle}`,
      link: issuePath,
      triggeredBy,
    });

    const assignee = await issueRepository.findAssigneeContact(assigneeId);
    if (assignee) {
      await emailQueue.add('email', {
        to: assignee.email,
        type: NotificationTypes.ISSUE_ASSIGNED,
        data: {
          assigneeName: assignee.name,
          issueTitle,
          projectName: ctx.projectName,
          assignedBy: triggeredBy,
          issueLink: absoluteUrl(issuePath),
        },
      });
    }
  },

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    await emailQueue.add('email', {
      to: email,
      type: NotificationTypes.PASSWORD_RESET,
      data: { resetLink },
    });
  },
};