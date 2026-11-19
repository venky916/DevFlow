import pino, { type StreamEntry } from 'pino';
import pretty from 'pino-pretty';

import { createAxiomStream } from './axiom-stream';
import { getRequestId } from './request-context';

const isProduction = process.env.NODE_ENV === 'production';
const level = (process.env.LOG_LEVEL || 'info') as pino.Level;
// json in production, readable lines in development. LOG_FORMAT=json shows what production prints.
const format = process.env.LOG_FORMAT || (isProduction ? 'json' : 'pretty');

// Optional second destination: Axiom, switched on by two env variables.
const axiomStream =
  process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET
    ? createAxiomStream({ token: process.env.AXIOM_TOKEN, dataset: process.env.AXIOM_DATASET })
    : null;

const streams: StreamEntry[] = [
  {
    level,
    stream:
      format === 'pretty'
        ? pretty({ colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' })
        : pino.destination({ dest: 1, sync: true }),
  },
];
if (axiomStream) streams.push({ level, stream: axiomStream });

// A fixed, small shape for errors. Log tools limit how many different fields a dataset may have
// (Axiom: 256), and an error's extra properties (a database error's details, for example)
// would add new ones.
function serializeError(value: unknown) {
  if (!(value instanceof Error)) return value;
  const code = (value as { code?: unknown }).code;
  return {
    type: value.name,
    message: value.message.slice(0, 1000),
    stack: value.stack?.slice(0, 4000),
    ...(typeof code === 'string' ? { code } : {}),
  };
}

// One logger for every service.
// Each line is a JSON object. The level is a word ("info"), which log tools understand.
export const logger = pino(
  {
    level,
    // which service wrote the line (each container sets SERVICE_NAME)
    base: { service: process.env.SERVICE_NAME ?? 'unknown' },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    serializers: { err: serializeError, error: serializeError },
    // adds the request id to every log line written while a request or a job is being handled
    mixin() {
      const requestId = getRequestId();
      return requestId ? { requestId } : {};
    },
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
  },
  pino.multistream(streams),
);

// Sends the logs that are still waiting in memory. Call it before the process exits.
export async function flushLogs(): Promise<void> {
  await axiomStream?.flush();
}
