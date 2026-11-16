import { IssueEvents } from '@devflow/types';
import { presenceActionSchema } from '@devflow/validators';

import { roomManager } from '../RoomManager';
import { AuthenticatedWebSocket } from '../types/socket.types';

// a cheap limit, so a misbehaving client cannot flood the room (the web sends one per 2 seconds)
const MIN_GAP_MS = 300;
const lastSentAt = new WeakMap<AuthenticatedWebSocket, number>();

// "I am typing / editing / uploading" (or null: I stopped). It is relayed to the others in the
// issue room. Nothing is saved, and it does not go through Redis.
export const handlePresenceAction = (ws: AuthenticatedWebSocket, payload: unknown) => {
  const parsed = presenceActionSchema.safeParse({ type: 'PRESENCE_ACTION', payload });
  if (!parsed.success) return; // a malformed hint is not worth an error message

  const { issueId, kind } = parsed.data.payload;
  const roomId = `issue:${issueId}`;

  // only someone who joined the room may send into it
  if (!roomManager.has(roomId, ws)) return;

  const now = Date.now();
  if (kind !== null && now - (lastSentAt.get(ws) ?? 0) < MIN_GAP_MS) return;
  lastSentAt.set(ws, now);

  roomManager.broadcast(
    roomId,
    { type: IssueEvents.PRESENCE_ACTION, payload: { issueId, userId: ws.userId, kind } },
    ws,
  );
};
