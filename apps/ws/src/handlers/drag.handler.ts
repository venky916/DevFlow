import { ProjectEvents } from '@devflow/types';
import { dragEndSchema, dragStartSchema } from '@devflow/validators';

import { roomManager } from '../RoomManager';
import { AuthenticatedWebSocket } from '../types/socket.types';

// the card each socket is holding right now (at most one)
const activeDrags = new WeakMap<AuthenticatedWebSocket, { projectId: string; issueId: string }>();

function broadcastEnd(
  ws: AuthenticatedWebSocket,
  projectId: string,
  issueId: string,
  dropped: boolean,
) {
  roomManager.broadcast(
    `project:${projectId}`,
    { type: ProjectEvents.DRAG_END, payload: { projectId, issueId, userId: ws.userId, dropped } },
    ws,
  );
}

// "I picked up this card"
export const handleDragStart = (ws: AuthenticatedWebSocket, payload: unknown) => {
  const parsed = dragStartSchema.safeParse({ type: 'DRAG_START', payload });
  if (!parsed.success) return;

  const { projectId, issueId } = parsed.data.payload;
  // only someone who joined the room may send into it
  if (!roomManager.has(`project:${projectId}`, ws)) return;

  // one card at a time: picking up another ends the first
  const previous = activeDrags.get(ws);
  if (previous && previous.issueId !== issueId) {
    broadcastEnd(ws, previous.projectId, previous.issueId, false);
  }

  activeDrags.set(ws, { projectId, issueId });
  roomManager.broadcast(
    `project:${projectId}`,
    {
      type: ProjectEvents.DRAG_START,
      payload: { projectId, issueId, userId: ws.userId, name: roomManager.describe(ws).name },
    },
    ws,
  );
};

// "I let go of it" (dropped: a move is being saved, or false: cancelled / dropped back)
export const handleDragEnd = (ws: AuthenticatedWebSocket, payload: unknown) => {
  const parsed = dragEndSchema.safeParse({ type: 'DRAG_END', payload });
  if (!parsed.success) return;

  const { projectId, issueId, dropped } = parsed.data.payload;
  if (!roomManager.has(`project:${projectId}`, ws)) return;

  if (activeDrags.get(ws)?.issueId === issueId) activeDrags.delete(ws);
  broadcastEnd(ws, projectId, issueId, dropped);
};

// Call when a socket left a project room, or disconnected, so a card is never stuck as "moving".
export const endActiveDrag = (ws: AuthenticatedWebSocket, projectId?: string) => {
  const active = activeDrags.get(ws);
  if (!active || (projectId && active.projectId !== projectId)) return;
  activeDrags.delete(ws);
  broadcastEnd(ws, active.projectId, active.issueId, false);
};
