import type { Job } from 'bullmq';

import { runWithRequestId } from '@devflow/backend-common';

import type { WithRequestId } from './traced-queue';

// Runs fn with the job's request id in the log context, so every log line written while
// the job is handled carries it. A job without an id (made outside a request, or waiting
// in Redis from before this change) gets an id of its own.
export function runJob<R>(job: Job<WithRequestId> | undefined, fn: () => R): R {
  if (!job) return fn();
  return runWithRequestId(job.data.requestId ?? `job-${job.id}`, fn);
}

// True when BullMQ will not try this job again. BullMQ reports a failure after every attempt,
// so errors are sent to Sentry only on the last one.
export function isFinalFailure(job: Job<WithRequestId> | undefined): boolean {
  return !!job && job.attemptsMade >= (job.opts.attempts ?? 1);
}
