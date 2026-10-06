// services/comment-events.service.ts
import { IssueEvents } from '@devflow/types';

import { publishToIssue } from '../lib/redis.publisher';

export const commentEventsService = {
  publishAdded(issueId: string, comment: any) {
    return publishToIssue(issueId, { type: IssueEvents.COMMENT_ADDED, payload: { comment } });
  },
};
