'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { IComment } from '@devflow/types';

import { socketClient } from '../../lib/socket-client';
import { attachmentKeys } from '../use-attachments';
import { commentKeys } from '../use-comments';
import { issueKeys } from '../use-issues';

const REFRESH_DELAY_MS = 300;

type Section = 'comments' | 'attachments' | 'activities';

// Live updates for one open issue (the detail page): comments, files and activity.
// Comments are applied directly, because the event carries the whole comment.
// Files and activity just refresh their own section.
export function useIssueEvents(issueId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!issueId) return;

    const pending = new Set<Section>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let hasJoinedBefore = false;

    const refresh = (section: Section) => {
      const keys = {
        comments: commentKeys.list(issueId),
        attachments: attachmentKeys.list(issueId),
        activities: issueKeys.activities(issueId),
      };
      qc.invalidateQueries({ queryKey: keys[section] });
    };

    // several events in a row refresh each section once
    const refreshSoon = (section: Section) => {
      pending.add(section);
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        pending.forEach(refresh);
        pending.clear();
      }, REFRESH_DELAY_MS);
    };

    const stopListening = socketClient.subscribe((message) => {
      const payload = message.payload ?? {};

      switch (message.type) {
        case 'COMMENT_ADDED': {
          const comment = payload.comment as IComment | undefined;
          if (!comment?.id) return;
          qc.setQueryData<IComment[]>(commentKeys.list(issueId), (list) =>
            // the sender already added it from the HTTP answer
            list && !list.some((c) => c.id === comment.id) ? [...list, comment] : list,
          );
          return;
        }
        case 'COMMENT_UPDATED': {
          const comment = payload.comment as IComment | undefined;
          if (!comment?.id) return;
          const list = qc.getQueryData<IComment[]>(commentKeys.list(issueId));
          if (list?.some((c) => c.id === comment.id)) {
            qc.setQueryData<IComment[]>(commentKeys.list(issueId), (current) =>
              current?.map((c) => (c.id === comment.id ? comment : c)),
            );
          } else {
            refreshSoon('comments'); // not in our list, so ask the server
          }
          return;
        }
        case 'COMMENT_DELETED': {
          const commentId = payload.commentId;
          if (typeof commentId !== 'string') return;
          qc.setQueryData<IComment[]>(commentKeys.list(issueId), (list) =>
            list?.filter((c) => c.id !== commentId),
          );
          return;
        }
        case 'ATTACHMENT_ADDED':
        case 'ATTACHMENT_DELETED':
          refreshSoon('attachments');
          return;
        case 'ACTIVITY_ADDED':
          refreshSoon('activities');
          return;
        case 'JOINED_ISSUE':
          // a second join means the connection dropped and came back: refresh everything
          if (payload.issueId === issueId) {
            if (hasJoinedBefore) {
              refreshSoon('comments');
              refreshSoon('attachments');
              refreshSoon('activities');
            }
            hasJoinedBefore = true;
          }
          return;
      }
    });
    const leaveRoom = socketClient.joinRoom('issue', issueId);

    return () => {
      stopListening();
      leaveRoom(); // leaves the room, the connection stays open
      if (timer) clearTimeout(timer);
    };
  }, [issueId, qc]);
}
