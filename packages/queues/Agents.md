# @devflow/queues

The background-job queues (BullMQ on Redis) and the type of each job's data. The API **adds** jobs here, and the workers **take** them. This package defines the queues and the job shapes, and nothing else.

**Must not:** contain the code that processes a job. That belongs to `apps/workers`.

## Commands

```
pnpm --filter @devflow/queues run lint
pnpm --filter @devflow/queues run check-types
pnpm --filter @devflow/queues run format
```

## Folder map

- `src/connection.ts`: `createRedisConnection()`. Every queue and every worker makes its own connection.
- `src/activity.queue.ts`: `activity-queue`. Writes a row in the activity log, and announces it to open issues.
- `src/notification.queue.ts`: `notification-queue`. Saves a notification and pushes it live to the user.
- `src/email.queue.ts`: `email-queue`. Job data is typed per email (invite, issue assigned, password reset).
- `src/file-cleanup.queue.ts`: `file-cleanup-queue`. Deletes a file from storage after its row is gone.
- `src/index.ts`: re-exports the queues and the data types.

## Rules

- Change a job's data type **here first**, then the code that adds the job (API), then the worker that reads it. The compiler then shows every place that needs an update.
- Do not put personal data in a job that gets logged. An email job holds the address, and the worker never logs it.
- A queue name is a contract. Renaming one strands the jobs already waiting in Redis.
- The job name for email is `email`, and for file cleanup `delete-file`.
- Jobs must be safe to run twice, because a failed job is retried. For example, a worker that publishes an event after saving must not let the publish failure fail the job.
- The queue Redis runs with `noeviction`, so it never drops waiting jobs under memory pressure. Failed jobs should be capped with `removeOnFail` (age and count), otherwise they stay forever.

## Env variables it reads

`REDIS_QUEUE_URL`.

## Links

The workers that process these jobs: `apps/workers`. Shared rules and commands: the root `AGENTS.md`.
