# @devflow/backend-common

Shared backend building blocks: the logger, the Redis clients and the Firebase Admin setup. Used by `api`, `ws`, `workers` and the other backend packages. Not used by `web`.

**Must not:** import from an app, touch business data, or load `.env` files. Each app's entry point does that, with `import 'dotenv/config'` as its first line.

## Commands

```
pnpm --filter @devflow/backend-common run lint
pnpm --filter @devflow/backend-common run check-types
pnpm --filter @devflow/backend-common run format
```

## Folder map

- `src/logger.ts`: the pino logger. JSON in production, readable lines in development.
- `src/redis.ts`, `src/redis-opts.ts`: Redis client and the connection options the clients share.
- `src/pub-sub.ts`: `publisher` and `subscriber`, used for live events between the API, the workers and the ws server.
- `src/firebase-admin.ts`: Firebase Admin. Exports `adminAuth`, used to verify sign-in tokens.
- `src/index.ts`: re-exports all of the above.

## Rules

- Log with the logger, never `console.*`. Message last, fields first: `logger.info({ jobId, type }, 'Notification job completed')`.
- Log an Error under the key `err`, so its message and stack are printed.
- Never log tokens, passwords, emails or other personal data. The logger redacts `password`, `token` and `authorization` keys as a safety net, not as a plan.
- Levels: `info` for normal events, `warn` for client errors and recoverable problems, `error` for failures, `debug` for noisy detail such as per-message events.
- Every log line carries `service`, taken from `SERVICE_NAME` in the app's env file.

## Env variables it reads

`NODE_ENV` (`production` switches the logger to JSON), `LOG_LEVEL` (default `info`), `SERVICE_NAME`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `REDIS_CACHE_URL`, `REDIS_PUBSUB_URL`.

## Links

Shared rules and commands: the root `AGENTS.md`. Deployment: `DEPLOY.md`.