import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { logger } from '@devflow/backend-common';

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
  // Zod validation errors
  if (rawError instanceof ZodError) {
    logger.warn({
      message: 'Validation failed',
      url: req.originalUrl,
      errors: rawError.issues,
    });
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: rawError.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      data: null,
    });
  }

  const err = normalizeError(rawError);

  // 4xx — warn, 5xx — error
  if (err instanceof ApiError && err.statusCode < 500) {
    logger.warn({
      message: err.message,
      method: req.method,
      url: req.originalUrl,
      statusCode: err.statusCode,
    });
  } else {
    logger.error({
      message: err.message,
      method: req.method,
      url: req.originalUrl,
      stack: err.stack,
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      data: null,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    data: null,
  });
};
