import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

// One logger for every service.
// Production: one JSON object per line, which log tools can read and search.
// Development: colored, readable lines.
// The level comes from LOG_LEVEL (default: info). On the server, LOG_LEVEL=debug shows more.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // which service wrote the line (each production container sets SERVICE_NAME)
  base: { service: process.env.SERVICE_NAME ?? 'unknown' },
  timestamp: pino.stdTimeFunctions.isoTime,
  // "level":"info" instead of "level":30 (kept off in development, where pino-pretty needs numbers)
  formatters: isProduction ? { level: (label) => ({ level: label }) } : undefined,
  // an Error is not a plain object: without a serializer it is logged as {}
  serializers: { err: pino.stdSerializers.err, error: pino.stdSerializers.err },
  // never write secrets, even if someone logs a whole request by mistake
  redact: {
    paths: [
      'password',
      '*.password',
      'token',
      '*.token',
      'authorization',
      '*.authorization',
      'req.headers.authorization',
    ],
    censor: '[redacted]',
  },
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      },
});
