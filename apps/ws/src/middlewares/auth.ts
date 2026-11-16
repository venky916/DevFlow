import { IncomingMessage } from 'node:http';
import { WebSocket } from 'ws';

import { adminAuth, logger } from '@devflow/backend-common';
import { prisma } from '@devflow/db';

import { AuthenticatedWebSocket } from '../types/socket.types';

export const authenticateWS = async (ws: WebSocket, req: IncomingMessage) => {
  try {
    // get token from query param
    // ws://localhost:4001?token=FIREBASE_TOKEN
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) {
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          message: 'No token provided',
        }),
      );
      ws.close(1008, 'Unauthorized');
      return false;
    }

    const decoded = await adminAuth.verifyIdToken(token);

    const user = await prisma.user.findUnique({
      where: {
        firebaseUid: decoded.uid,
      },
    });

    if (!user) {
      logger.warn({ firebaseUid: decoded.uid }, 'WS user not found');
      ws.send(
        JSON.stringify({
          type: 'ERROR',
          message: 'User not found, please login first',
        }),
      );
      ws.close(1008, 'Unauthorized');
      return false;
    }

    // attach user to ws connection
    const authWs = ws as AuthenticatedWebSocket;
    authWs.userId = user.id;
    authWs.email = user.email ?? '';
    authWs.name = user.name ?? null;
    authWs.avatarUrl = user.avatarUrl ?? null;

    return true;
  } catch (error) {
    // an expired or invalid token is the client's problem, so this is a warning, not an error.
    // The token itself is never logged.
    logger.warn(
      {
        code: (error as { code?: string }).code,
        reason: error instanceof Error ? error.message : String(error),
      },
      'WS authentication failed',
    );
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: 'Invalid or expired token',
      }),
    );

    ws.close(1008, 'Unauthorized');
    return false;
  }
};
