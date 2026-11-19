import 'dotenv/config';

import http from 'http';
import { WebSocketServer } from 'ws';

import { logger, registerGracefulShutdown, subscriber } from '@devflow/backend-common';
import { ClientEvent } from '@devflow/types';

import {
  announceProjectLeave,
  handleCursorLeave,
  handleCursorMove,
} from './handlers/cursor.handler';
import { endActiveDrag, handleDragEnd, handleDragStart } from './handlers/drag.handler';
import { handleJoinIssue, handleLeaveIssue } from './handlers/issue.handler';
import { handlePresenceAction } from './handlers/presence.handler';
import { handleJoinProject, handleLeaveProject } from './handlers/project.handler';
import { announceLeave } from './lib/presence';
import { authenticateWS } from './middlewares/auth';
import { roomManager } from './RoomManager';
import { AuthenticatedWebSocket } from './types/socket.types';

const PORT = process.env.PORT ?? 4001;
const HEARTBEAT_MS = 30_000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'ws', timestamp: new Date().toISOString() }));
    return;
  }

  res.writeHead(404);
  res.end();
});

// ─── WebSocket server ─────────────────────────────────────────────
const wss = new WebSocketServer({ server });

// ─── Heartbeat ────────────────────────────────────────────────────
// Every 30 seconds we ping every client. A client that did not answer since the last round
// is gone (sleeping laptop, dropped network), so we close it. That runs the normal
// disconnect cleanup, which also removes the person from the "who is here" lists.
const heartbeat = setInterval(() => {
  wss.clients.forEach((client) => {
    const socket = client as AuthenticatedWebSocket;
    if (socket.isAlive === false) {
      socket.terminate();
      return;
    }
    socket.isAlive = false;
    socket.ping();
  });
}, HEARTBEAT_MS);

wss.on('close', () => clearInterval(heartbeat));

wss.on('connection', async (ws, req) => {
  const authWs = ws as AuthenticatedWebSocket;

  // the browser answers pings by itself with a pong. This listener must exist from the start.
  authWs.isAlive = true;
  ws.on('pong', () => {
    authWs.isAlive = true;
  });

  const authenticated = await authenticateWS(ws, req);
  if (!authenticated) return;

  logger.info({ userId: authWs.userId }, 'Client connected');

  // ─── Auto subscribe to personal notification channel ──────
  subscriber.subscribe(`user:${authWs.userId}`, (err) => {
    if (err) {
      logger.error({ err, userId: authWs.userId }, 'Failed to subscribe to user channel');
      return;
    }
    logger.debug({ userId: authWs.userId }, 'Subscribed to personal channel');
  });

  // ─── Also join personal WS room ───────────────────────────
  roomManager.join(`user:${authWs.userId}`, authWs);

  // send welcome message
  ws.send(
    JSON.stringify({ type: 'CONNECTED', message: `Welcome ${authWs.name ?? authWs.email}!` }),
  );

  // ─── Message handler ──────────────────────────────────────
  ws.on('message', async (data) => {
    try {
      const event: ClientEvent = JSON.parse(data.toString());
      // debug, not info: pointers and typing hints arrive many times a second
      logger.debug({ type: event.type, userId: authWs.userId }, 'Event received');

      switch (event.type) {
        case 'JOIN_PROJECT': {
          await handleJoinProject(authWs, event.payload as { projectId: string });
          break;
        }
        case 'LEAVE_PROJECT': {
          handleLeaveProject(authWs, event.payload as { projectId: string });
          break;
        }
        case 'JOIN_ISSUE': {
          await handleJoinIssue(authWs, event.payload as { issueId: string });
          break;
        }
        case 'LEAVE_ISSUE': {
          handleLeaveIssue(authWs, event.payload as { issueId: string });
          break;
        }
        case 'CURSOR_MOVE': {
          handleCursorMove(authWs, event.payload);
          break;
        }
        case 'CURSOR_LEAVE': {
          handleCursorLeave(authWs, event.payload);
          break;
        }
        case 'PRESENCE_ACTION': {
          handlePresenceAction(authWs, event.payload);
          break;
        }
        case 'DRAG_START': {
          handleDragStart(authWs, event.payload);
          break;
        }
        case 'DRAG_END': {
          handleDragEnd(authWs, event.payload);
          break;
        }
        case 'PING': {
          ws.send(JSON.stringify({ type: 'PONG' }));
          break;
        }

        default: {
          logger.warn({ type: event.type }, 'Unknown event type');
          ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown event type: ${event.type}` }));
        }
      }
    } catch (error) {
      logger.warn({ err: error }, 'Failed to handle message');

      ws.send(JSON.stringify({ type: 'ERROR', message: 'Failed to parse message' }));
    }
  });

  // ─── Disconnect handler ───────────────────────────────────
  ws.on('close', () => {
    const leftRooms = roomManager.leaveAll(authWs);
    leftRooms.forEach((roomId) => {
      announceLeave(roomId, authWs); // issue rooms: "who is here"
      announceProjectLeave(roomId, authWs); // project rooms: pointers
    });
    endActiveDrag(authWs); // a card held by this person is released
    logger.info({ userId: authWs.userId }, 'Client disconnected');
  });

  // ─── Handle error ──────────────────────────────────────────
  ws.on('error', (error) => {
    logger.error({ err: error }, 'WebSocket error');
  });
});

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'WS server listening');
});

// on a deploy: tell the browsers to reconnect, stop the server, send the last logs
registerGracefulShutdown(() => {
  clearInterval(heartbeat);
  wss.clients.forEach((client) => client.close(1001, 'Server restarting'));
  wss.close();
  server.close();
});
