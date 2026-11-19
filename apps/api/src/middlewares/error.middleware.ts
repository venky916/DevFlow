import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { captureError, logger } from '@devflow/backend-common';

import { ApiError } from '../lib/ApiError';

function getPrismaCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

// Turns known Prisma errors into API errors, so controllers never handle them.
function normalizeError(err: Error): Error {
  switch (getPrismaCode(err)) {
    case 'P2002': // unique constraint (slugs, label names, duplicate members)
      return ApiError.conflict('Resource already exists');
    case 'P2025': // record not found on update/delete
      return ApiError.notFound('Resource not found');
    default:
      return err;
  }
}

export const errorMiddleware = (
  rawError: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // the id of this request: a user can quote it, and it finds every log line
  const requestId: string | undefined = res.locals.requestId;

  // Zod validation errors
  if (rawError instanceof ZodError) {
    logger.warn(
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: 422,
        // field names and messages only, never the values the user typed
        issues: rawError.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      },
      'Validation failed',
    );
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: rawError.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      data: null,
      requestId,
    });
  }

  const err = normalizeError(rawError);

  // 4xx — warn, 5xx — error
  if (err instanceof ApiError && err.statusCode < 500) {
    logger.warn(
      { method: req.method, url: req.originalUrl, statusCode: err.statusCode, code: err.code },
      err.message,
    );
  } else {
    logger.error({ err, method: req.method, url: req.originalUrl }, 'Request failed');
    // an unexpected error: tell Sentry (expected 4xx errors are not sent)
    captureError(err, { method: req.method, route: req.route?.path });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      data: null,
      requestId,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    data: null,
    requestId,
  });
};
