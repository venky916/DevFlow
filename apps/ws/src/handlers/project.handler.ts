import { logger } from '@devflow/backend-common';
import { joinProjectSchema, leaveProjectSchema } from '@devflow/validators';

import { canAccessProject } from '../lib/access';
import { subscribeToProjectChannel, unsubscribeFromProjectChannel } from '../lib/redis.subscriber';
import { roomManager } from '../RoomManager';
import { AuthenticatedWebSocket } from '../types/socket.types';
import { announceProjectLeave } from './cursor.handler';
import { endActiveDrag } from './drag.handler';

export const handleJoinProject = async (
  ws: AuthenticatedWebSocket,
  payload: { projectId: string },
) => {
  const { payload: validPayload } = joinProjectSchema.parse({
    type: 'JOIN_PROJECT',
    payload,
  });
  const { projectId } = validPayload;

  if (!(await canAccessProject(ws.userId, projectId))) {
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: 'You are not a member of this project',
      }),
    );
    return;
  }

  const roomId = `project:${projectId}`;
  roomManager.join(roomId, ws);
  subscribeToProjectChannel(projectId);

  logger.debug({ userId: ws.userId, projectId }, 'Joined project room');

  ws.send(
    JSON.stringify({
      type: 'JOINED_PROJECT',
      payload: { projectId },
    }),
  );
};

export const handleLeaveProject = (ws: AuthenticatedWebSocket, payload: { projectId: string }) => {
  try {
    const { payload: validPayload } = leaveProjectSchema.parse({
      type: 'LEAVE_PROJECT',
      payload,
    });
    const { projectId } = validPayload;
    const roomId = `project:${projectId}`;

    roomManager.leave(roomId, ws);
    announceProjectLeave(roomId, ws);
    endActiveDrag(ws, projectId);

    unsubscribeFromProjectChannel(projectId);
    logger.debug({ userId: ws.userId, projectId }, 'Left project room');
  } catch (err) {
    logger.warn({ err, userId: ws.userId }, 'LEAVE_PROJECT failed');
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid payload for LEAVE_PROJECT' }));
  }
};
