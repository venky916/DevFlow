// services/comment.service.ts
import { commentRepository } from '../repositories/comment.repository';
import { activityService } from './activity.service';
import { commentEventsService } from './comment-events.service';
import { mentionService } from './mention.service';
import { ApiError } from '../lib/ApiError';
import { getPlainText } from '@devflow/validators';

export const commentService = {
    async createComment(issueId: string, userId: string, content: any) {
        const issue = await commentRepository.findIssueContext(issueId);
        if (!issue) throw ApiError.notFound('Issue not found');

        const comment = await commentRepository.create(issueId, userId, content);
        const commenter = await commentRepository.findUserById(userId);
        const plainPreview = getPlainText(content);

        await commentEventsService.publishAdded(issueId, comment);
        await activityService.logCommentAdded(issueId, issue.projectId, userId, comment.id, plainPreview);
        await mentionService.processCommentNotifications(content, issue, issueId, userId, commenter?.name ?? 'Someone');

        return comment;
    },
};