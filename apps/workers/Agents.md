# workers

The background workers. They take jobs from the queues and do the slow work: writing the activity log, saving and pushing notifications, sending email, and deleting files. Package name: `workers`. It opens no port.

**Must not:** answer requests, or decide who may do something. The API decides first, then queues a job.

## Commands

```
pnpm --filter workers run dev
pnpm --filter workers run lint
pnpm --filter workers run check-types
pnpm --filter workers run format
```

## Folder map

- `src/index.ts`: starts every worker, and closes them on `SIGTERM` and `SIGINT`.
- `src/workers/activity.worker.ts`: writes an activity row, then tells the open issue page (`ACTIVITY_ADDED`).
- `src/workers/notification.worker.ts`: saves the notification, then publishes it to `user:<id>` for the live bell.
- `src/workers/email.worker.ts`: renders an email and sends it through Gmail.
- `src/workers/file-cleanup.worker.ts`: deletes a file from storage.
- `src/emails/`: `templates.ts` (the three emails), `layout.ts` (the shared frame), `components.ts` (heading, paragraph, button), `html.ts` (escaping), `config.ts` (site URL, logo, safe links).

## Rules

- The job data type lives in `packages/queues`. Change it there first.
- A job may run twice (a failed job is retried), so a worker must be safe to repeat. After the database write, the live announcement is **best effort**: if it fails, log a warning and finish the job, or a retry would write the row again.
- Each worker checks `waitUntilReady()` at start-up and exits the process if Redis is not reachable.
- **Never log an email address.** Log the job id, the type and the message id.
- Log errors under `err`, and the final failure of a job once, with the job id and the attempts used.
- **Email is escaped by default.** Every value goes through the `html` tagged template, which turns `<` into `&lt;` unless the code marks it as already safe. User text (issue titles, workspace names, people's names) reaches emails, so never build email HTML from raw strings.
- Every email has an HTML part and a plain-text part. Links go through `safeLink`, so they can only point at our own site.
- Only three emails exist: workspace invite, issue assigned, password reset. Everything else is an in-app notification. A job of another type has no template and is skipped.
- Add an email: add its data type in `packages/queues`, then its template and a case in `templates.ts`. Test it with a real send to yourself, using a nasty title such as `<b>x</b> <a href="https://evil.com">click</a>`. It must show as plain text in the inbox.

## Env variables it reads

`NODE_ENV`, `SERVICE_NAME`, `LOG_LEVEL`, `BASE_WEB_URL` (**required**: the process stops at start-up without it), `EMAIL_LOGO_URL` (optional), `DATABASE_URL`, `REDIS_QUEUE_URL`, `REDIS_PUBSUB_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `STORAGE_*` (the file cleanup), `FIREBASE_*` (loaded through `backend-common`).

## Known gaps

- The password-reset email is unused, because the web uses Firebase's own reset email.
- Failed jobs are kept without a limit.
- Gmail's daily sending limit is the ceiling for email volume.

## Links

The queues: `packages/queues/AGENTS.md`. Event names: `packages/types/src/events.ts`. Shared rules: the root `AGENTS.md`.