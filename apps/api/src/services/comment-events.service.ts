// services/comment-events.service.ts
import { IssueEvents } from '@devflow/types';

import { publishToIssue } from '../lib/redis.publisher';

export const commentEventsService = {
  publishAdded(issueId: string, comment: unknown) {
    return publishToIssue(issueId, { type: IssueEvents.COMMENT_ADDED, payload: { comment } });
  },

  publishUpdated(issueId: string, comment: unknown) {
    return publishToIssue(issueId, { type: IssueEvents.COMMENT_UPDATED, payload: { comment } });
  },

  publishDeleted(issueId: string, commentId: string) {
    return publishToIssue(issueId, { type: IssueEvents.COMMENT_DELETED, payload: { commentId } });
  },
};
