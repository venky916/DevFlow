// services/comment.service.ts
import { getPlainText, type TiptapContent } from '@devflow/validators';

import { ApiError } from '../lib/ApiError';
import { resolveProjectAccess } from '../middlewares/permission.middleware';
import { commentRepository } from '../repositories/comment.repository';
import { activityService } from './activity.service';
import { commentEventsService } from './comment-events.service';
import { mentionService } from './mention.service';

// A comment belongs to a project through its issue. Someone who is no longer in the project
// (and is not a workspace admin) gets "not found".
async function getCommentWithAccess(commentId: string, userId: string) {
  const comment = await commentRepository.findByIdWithIssue(commentId);
  if (!comment) throw ApiError.notFound('Comment not found');

  const access = await resolveProjectAccess(userId, comment.issue.projectId);
  if (!access.isWorkspaceAdmin && !access.projectRole) throw ApiError.notFound('Comment not found');

  return { comment, canModerate: access.isWorkspaceAdmin || access.projectRole === 'LEAD' };
}

export const commentService = {
  listComments(issueId: string) {
    return commentRepository.listByIssue(issueId);
  },

  async createComment(issueId: string, userId: string, content: TiptapContent) {
    const issue = await commentRepository.findIssueContext(issueId);
    if (!issue) throw ApiError.notFound('Issue not found');

    const comment = await commentRepository.create(issueId, userId, content);
    const commenter = await commentRepository.findUserById(userId);

    await commentEventsService.publishAdded(issueId, comment);
    await activityService.logCommentAdded(
      issueId,
      issue.projectId,
      userId,
      comment.id,
      getPlainText(content).trim(),
    );
    await mentionService.processCommentNotifications(
      content,
      issue,
      issueId,
      userId,
      commenter?.name ?? 'Someone',
    );

    return comment;
  },

  async updateComment(commentId: string, userId: string, content: TiptapContent) {
    const { comment } = await getCommentWithAccess(commentId, userId);

    // only the author edits a comment
    if (comment.userId !== userId) {
      throw ApiError.forbidden('You can only edit your own comments');
    }

    const updated = await commentRepository.update(commentId, content);
    const editor = await commentRepository.findUserById(userId);

    await commentEventsService.publishUpdated(comment.issueId, updated);
    await activityService.logCommentUpdated(
      comment.issueId,
      comment.issue.projectId,
      userId,
      commentId,
    );
    await mentionService.notifyNewMentions(
      content,
      comment.content as unknown as TiptapContent,
      comment.issue,
      comment.issueId,
      userId,
      editor?.name ?? 'Someone',
    );

    return updated;
  },

  async deleteComment(commentId: string, userId: string) {
    const { comment, canModerate } = await getCommentWithAccess(commentId, userId);

    // the author, a lead or an admin can delete
    if (comment.userId !== userId && !canModerate) {
      throw ApiError.forbidden('You are not allowed to delete this comment');
    }

    await commentRepository.delete(commentId);

    await commentEventsService.publishDeleted(comment.issueId, commentId);
    await activityService.logCommentDeleted(
      comment.issueId,
      comment.issue.projectId,
      userId,
      commentId,
    );
  },
};
