// services/mention.service.ts
import { extractMentions, type TiptapContent } from '@devflow/validators';

import { commentRepository } from '../repositories/comment.repository';
import { notificationService } from './notification.service';

interface IssueContext {
  projectId: string;
  creatorId: string;
  title: string;
  assigneeId: string | null;
}

// People mentioned in a comment who may be notified: project members only, never the commenter
async function mentionableIds(
  content: TiptapContent,
  projectId: string,
  commenterId: string,
): Promise<string[]> {
  const mentions = extractMentions(content);
  if (mentions.length === 0) return [];

  const projectMembers = await commentRepository.findProjectMemberIds(projectId);
  const memberIds = new Set(projectMembers.map((m) => m.userId));
  return mentions.map((m) => m.id).filter((id) => id !== commenterId && memberIds.has(id));
}

export const mentionService = {
  async processCommentNotifications(
    content: TiptapContent,
    issue: IssueContext,
    issueId: string,
    commenterId: string,
    commenterName: string,
  ) {
    const mentionedIds = new Set(await mentionableIds(content, issue.projectId, commenterId));

    for (const userId of mentionedIds) {
      await notificationService.notifyMention(
        userId,
        commenterName,
        issue.title,
        issueId,
        commenterId,
      );
    }

    // the creator and the assignee hear about the comment, unless they were just mentioned
    const recipients = new Set(
      [issue.creatorId, issue.assigneeId].filter((id): id is string => !!id),
    );
    for (const recipientId of recipients) {
      if (recipientId === commenterId || mentionedIds.has(recipientId)) continue;
      await notificationService.notifyIssueCommented(
        recipientId,
        commenterName,
        issue.title,
        issueId,
        commenterId,
      );
    }
  },

  // an edited comment only notifies people who were NOT already mentioned before the edit
  async notifyNewMentions(
    content: TiptapContent,
    previousContent: TiptapContent,
    issue: { projectId: string; title: string },
    issueId: string,
    commenterId: string,
    commenterName: string,
  ) {
    const before = new Set(extractMentions(previousContent).map((m) => m.id));
    const newIds = (await mentionableIds(content, issue.projectId, commenterId)).filter(
      (id) => !before.has(id),
    );

    for (const userId of newIds) {
      await notificationService.notifyMention(
        userId,
        commenterName,
        issue.title,
        issueId,
        commenterId,
      );
    }
  },
};
