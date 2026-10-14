import { NextFunction, Request, Response } from 'express';

import { adminAuth, logger } from '@devflow/backend-common';
import { prisma } from '@devflow/db';

import { ApiError } from '../lib/ApiError';
import { ResolvedAccess } from './permission.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        firebaseUid: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
      };
      projectAccess?: ResolvedAccess;
    }
  }
}

const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000; // 24h

async function verifyToken(token: string) {
  try {
    return await adminAuth.verifyIdToken(token);
  } catch (err) {
    logger.warn({ err }, 'ID token verification failed');
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      throw ApiError.unauthorized('Unauthorized');
    }

    const decoded = await verifyToken(token);
    if (Date.now() - decoded.auth_time * 1000 > MAX_SESSION_AGE_MS) {
      throw ApiError.unauthorized('Session expired, please sign in again', 'SESSION_EXPIRED');
    }

    // 1 db call
    const user = await prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: {},
      create: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? '',
        name: decoded.name ?? null,
        avatarUrl: decoded.picture ?? null,
      },
    });

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
