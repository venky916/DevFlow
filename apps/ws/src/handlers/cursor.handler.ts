import { ProjectEvents } from '@devflow/types';
import { cursorLeaveSchema, cursorMoveSchema } from '@devflow/validators';

import { roomManager } from '../RoomManager';
import { AuthenticatedWebSocket } from '../types/socket.types';

const PROJECT_ROOM_PREFIX = 'project:';
// the web sends about 10 a second, so more than 20 a second is not a normal browser
const MIN_GAP_MS = 50;
const lastMoveAt = new WeakMap<AuthenticatedWebSocket, number>();

function sendLeave(roomId: string, projectId: string, ws: AuthenticatedWebSocket) {
  roomManager.broadcast(
    roomId,
    { type: ProjectEvents.CURSOR_LEAVE, payload: { projectId, userId: ws.userId } },
    ws,
  );
}

// "my mouse is here". It is relayed to the others in the project room.
export const handleCursorMove = (ws: AuthenticatedWebSocket, payload: unknown) => {
  const parsed = cursorMoveSchema.safeParse({ type: 'CURSOR_MOVE', payload });
  if (!parsed.success) return;

  const { projectId, x, y } = parsed.data.payload;
  const roomId = `${PROJECT_ROOM_PREFIX}${projectId}`;
  // only someone who joined the room may send into it
  if (!roomManager.has(roomId, ws)) return;

  const now = Date.now();
  if (now - (lastMoveAt.get(ws) ?? 0) < MIN_GAP_MS) return;
  lastMoveAt.set(ws, now);

  roomManager.broadcast(
    roomId,
    {
      type: ProjectEvents.CURSOR_MOVE,
      payload: { projectId, userId: ws.userId, name: roomManager.describe(ws).name, x, y },
    },
    ws,
  );
};

// "my mouse left the board"
export const handleCursorLeave = (ws: AuthenticatedWebSocket, payload: unknown) => {
  const parsed = cursorLeaveSchema.safeParse({ type: 'CURSOR_LEAVE', payload });
  if (!parsed.success) return;

  const { projectId } = parsed.data.payload;
  const roomId = `${PROJECT_ROOM_PREFIX}${projectId}`;
  if (!roomManager.has(roomId, ws)) return;
  sendLeave(roomId, projectId, ws);
};

// Call after a socket left a project room, or disconnected.
export const announceProjectLeave = (roomId: string, ws: AuthenticatedWebSocket) => {
  if (!roomId.startsWith(PROJECT_ROOM_PREFIX)) return;
  // the person is gone only when their last tab has left
  if (roomManager.countForUser(roomId, ws.userId) > 0) return;
  sendLeave(roomId, roomId.slice(PROJECT_ROOM_PREFIX.length), ws);
};
