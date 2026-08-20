// services/mention.service.ts
import { extractMentions, getPlainText } from '@devflow/validators';
import { commentRepository } from '../repositories/comment.repository';
import { notificationService } from './notification.service';

interface IssueContext {
    projectId: string;
    creatorId: string;
    title: string;
    assigneeId: string | null;
}

export const mentionService = {
    async processCommentNotifications(content: any, issue: IssueContext, issueId: string, commenterId: string, commenterName: string) {
        const mentions = extractMentions(content);
        const commentRecipients = [issue.creatorId, issue.assigneeId].filter(Boolean) as string[];

        if (mentions.length > 0) {
            const projectMembers = await commentRepository.findProjectMemberIds(issue.projectId);
            const memberIds = new Set(projectMembers.map((m) => m.userId));
            const validMentions = mentions.filter((m) => m.id !== commenterId && memberIds.has(m.id));

            for (const mention of validMentions) {
                await notificationService.notifyMention(mention.id, commenterName, issue.title, issueId, commenterId);
            }

            const mentionedSet = new Set(validMentions.map((m) => m.id));
            for (const recipientId of commentRecipients) {
                if (recipientId === commenterId || mentionedSet.has(recipientId)) continue;
                await notificationService.notifyIssueCommented(recipientId, commenterName, issue.title, issueId, commenterId);
            }
        } else {
            for (const recipientId of commentRecipients) {
                if (recipientId === commenterId) continue;
                await notificationService.notifyIssueCommented(recipientId, commenterName, issue.title, issueId, commenterId);

                if (recipientId === issue.creatorId) {
                    const creator = await commentRepository.findUserWithEmail(issue.creatorId);
                    if (creator) {
                        await notificationService.sendCommentEmail(
                            creator.email, issue.title, commenterName, getPlainText(content),
                            creator.name, issue.projectId, issueId
                        );
                    }
                }
            }
        }
    },
};