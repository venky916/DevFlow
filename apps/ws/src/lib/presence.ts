import { IssueEvents } from '@devflow/types';

import { roomManager } from '../RoomManager';
import type { AuthenticatedWebSocket } from '../types/socket.types';

const ISSUE_ROOM_PREFIX = 'issue:';

// Call after the socket has joined an issue room.
export function announceJoin(roomId: string, ws: AuthenticatedWebSocket) {
  if (!roomId.startsWith(ISSUE_ROOM_PREFIX)) return;
  const issueId = roomId.slice(ISSUE_ROOM_PREFIX.length);

  // the newcomer gets everyone who is here now (the web hides their own entry)
  ws.send(
    JSON.stringify({
      type: IssueEvents.PRESENCE_STATE,
      payload: { issueId, users: roomManager.getUsers(roomId) },
    }),
  );

  // the others hear about a new person only when this is that person's first tab in the room
  if (roomManager.countForUser(roomId, ws.userId) === 1) {
    roomManager.broadcast(
      roomId,
      { type: IssueEvents.PRESENCE_JOINED, payload: { issueId, user: roomManager.describe(ws) } },
      ws,
    );
  }
}

// Call after the socket has left a room, or when it disconnected.
export function announceLeave(roomId: string, ws: AuthenticatedWebSocket) {
  if (!roomId.startsWith(ISSUE_ROOM_PREFIX)) return;
  const issueId = roomId.slice(ISSUE_ROOM_PREFIX.length);

  // the person is gone only when their last tab has left
  if (roomManager.countForUser(roomId, ws.userId) > 0) return;

  roomManager.broadcast(roomId, {
    type: IssueEvents.PRESENCE_LEFT,
    payload: { issueId, userId: ws.userId },
  });
}
