'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { BoardStatus, IBoard } from '@devflow/types';

import { moveIssueInBoard } from '../../lib/board-utils';
import { socketClient } from '../../lib/socket-client';
import { issueKeys, refreshIssueViews } from '../use-issues';

const REFRESH_DELAY_MS = 300;

// Live updates for one project: the board, list, backlog and any open slideover refresh together.
export function useProjectEvents(projectId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let hasJoinedBefore = false;

    const refreshSoon = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        refreshIssueViews(qc);
      }, REFRESH_DELAY_MS);
    };

    const stopListening = socketClient.subscribe((message) => {
      // the card moves at once on every cached board. The refresh below fixes any difference.
      if (message.type === 'ISSUE_MOVED') {
        const { issueId, newStatus, newPosition } = message.payload ?? {};
        if (
          typeof issueId === 'string' &&
          typeof newStatus === 'string' &&
          typeof newPosition === 'string'
        ) {
          qc.setQueriesData<IBoard>(
            { predicate: (query) => issueKeys.isBoard(query.queryKey) },
            (board) =>
              board
                ? moveIssueInBoard(board, issueId, newStatus as BoardStatus, newPosition)
                : board,
          );
        }
        refreshSoon();
        return;
      }

      // the server says JOINED_PROJECT each time we enter the room. The second time means the
      // connection dropped and came back, so events may have been missed: refresh once.
      if (message.type === 'JOINED_PROJECT' && message.payload?.projectId === projectId) {
        if (hasJoinedBefore) refreshSoon();
        hasJoinedBefore = true;
        return;
      }

      if (message.type.startsWith('ISSUE_') || message.type.startsWith('SPRINT_')) refreshSoon();
    });
    const leaveRoom = socketClient.joinRoom('project', projectId);

    return () => {
      stopListening();
      leaveRoom(); // leaves the room, the connection stays open
      if (timer) clearTimeout(timer);
    };
  }, [projectId, qc]);
}
