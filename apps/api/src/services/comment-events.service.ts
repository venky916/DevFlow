// services/comment-events.service.ts
import { publishToIssue } from '../lib/redis.publisher';
import { IssueEvents } from '@devflow/types';

export const commentEventsService = {
    publishAdded(issueId: string, comment: any) {
        return publishToIssue(issueId, { type: IssueEvents.COMMENT_ADDED, payload: { comment } });
    },
};