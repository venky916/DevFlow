import { logger } from '@devflow/backend-common';
import { prisma } from '@devflow/db';
import { joinIssueSchema, leaveIssueSchema } from '@devflow/validators';

import { canAccessProject } from '../lib/access';
import { announceJoin, announceLeave } from '../lib/presence';
import { subscribeToIssueChannel, unsubscribeFromIssueChannel } from '../lib/redis.subscriber';
import { roomManager } from '../RoomManager';
import { AuthenticatedWebSocket } from '../types/socket.types';

export const handleJoinIssue = async (ws: AuthenticatedWebSocket, payload: { issueId: string }) => {
  try {
    const { payload: validPayload } = joinIssueSchema.parse({ type: 'JOIN_ISSUE', payload });
    const { issueId } = validPayload;
    const issue = await prisma.issue.findUnique({
      where: {
        id: issueId,
      },
      select: {
        projectId: true,
      },
    });

    if (!issue) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          payload: { message: 'Issue not found' },
        }),
      );
      return;
    }

    // a project member, or an admin of the project's workspace
    if (!(await canAccessProject(ws.userId, issue.projectId))) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          payload: { message: 'You are not a member of this project' },
        }),
      );
      return;
    }

    const roomId = `issue:${issueId}`;
    roomManager.join(roomId, ws);
    subscribeToIssueChannel(issueId);
    announceJoin(roomId, ws);
    logger.debug({ userId: ws.userId, issueId }, 'Joined issue room');
    ws.send(
      JSON.stringify({
        type: 'JOINED_ISSUE',
        payload: { issueId },
      }),
    );
  } catch (err) {
    logger.warn({ err, userId: ws.userId }, 'JOIN_ISSUE failed');
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid payload for JOIN_ISSUE' }));
  }
};

export const handleLeaveIssue = (ws: AuthenticatedWebSocket, payload: { issueId: string }) => {
  try {
    const { payload: validPayload } = leaveIssueSchema.parse({
      type: 'LEAVE_ISSUE',
      payload,
    });

    const { issueId } = validPayload;
    const roomId = `issue:${issueId}`;
    roomManager.leave(roomId, ws);
    unsubscribeFromIssueChannel(issueId);
    announceLeave(roomId, ws);
    logger.debug({ userId: ws.userId, issueId }, 'Left issue room');
  } catch (err) {
    logger.warn({ err, userId: ws.userId }, 'LEAVE_ISSUE failed');
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid payload for LEAVE_ISSUE' }));
  }
};
