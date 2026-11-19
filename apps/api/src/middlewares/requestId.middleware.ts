import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { runWithRequestId } from '@devflow/backend-common';

// An id sent by the caller is accepted only if it looks safe: short, and only letters,
// digits, dash and underscore. Anything else gets a new id.
const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.header('x-request-id');
  const id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();

  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);

  runWithRequestId(id, () => next());
};
