import { NextFunction, Request, Response } from 'express';

import { logger } from '@devflow/backend-common';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    // an uptime check calls /health every minute, and would drown the logs
    if (req.originalUrl === '/health') return;

    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger[level](
      {
        method: req.method,
        url: req.originalUrl,
        statusCode,
        durationMs: Date.now() - start,
        userId: req.user?.id ?? 'unauthenticated',
      },
      'request completed',
    );
  });

  next();
};
