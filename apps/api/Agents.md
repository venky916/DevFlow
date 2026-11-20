# api

The REST API (Express 5). It checks who the caller is, checks what they may do, applies the business rules, reads and writes the database, and starts background work. Package name: `api`. Port 4000, routes under `/api/v1`.

**Must not:** render anything, serve files, or hold long-running work. Slow work (activity log, notifications, email, file deletion) goes to a queue, and live updates go out through Redis.

## Commands

```
pnpm --filter api run dev            tsx watch (the dev Docker stack runs this)
pnpm --filter api run lint
pnpm --filter api run check-types
pnpm --filter api run format
```

## Folder map

- `src/index.ts`: starts Express. `dotenv/config` is the first import. Order: cors (it exposes `X-Request-Id`), request id, json, request logger, `/health`, `/api/v1`, error middleware. It registers a clean shutdown, which flushes the last logs and errors.
- `src/routes/v1/`: one router per area, mounted in `index.ts`. A route lists its middleware, then the controller.
- `src/middlewares/`: `auth.middleware.ts` (checks the Firebase token, sets `req.user`), `permission.middleware.ts` (workspace and project role checks, `resolveProjectAccess`), `requestId.middleware.ts` (makes or accepts the request id and puts it in the log context), `error.middleware.ts` (logs the error under `err`, sends unexpected 5xx errors to Sentry, and puts `requestId` in the response), `requestLogger.middleware.ts`.
- `src/controllers/`: read the request, validate it with a Zod schema, call a service, send the response. No business rules.
- `src/services/`: the business rules, and the side effects around them (activity log, notifications, events, cache).
- `src/repositories/`: Prisma queries only. No permission or business logic.
- `src/lib/`: `ApiError`, `apiResponse` (the `send*` helpers), `asyncHandler`, `cache` (`CacheKeys`), `pagination`, `issue-rules`, `issue-serializer`, `redis.publisher`, `web-links`, `logActivity`, `updateBuilder`.

## The request path

```
route ─▶ authenticate ─▶ permission middleware ─▶ controller ─▶ service ─▶ repository ─▶ Prisma
                                                                  └─▶ queue / Redis event / cache
```

## Rules

- **Controllers:** `asyncHandler(async (req, res) => ...)`. No `try/catch`. Errors go to the error middleware, which turns Prisma `P2002` into 409, `P2025` into 404 and Zod errors into 422. Never match on error message text.
- **Permissions come from the resource, not the URL.** `resolveProjectAccess` loads the project's real workspace. The web only hides buttons, and this is the real protection.
- **Hide existence.** A resource the caller may not see returns the same 404 as one that does not exist.
- **Uniqueness** is enforced by the database index, not by a find-then-insert check.
- **Status codes:** 201 on create (`sendCreated`), 204 with no body for deletes, 200 with `{ success, message, data }` otherwise.
- **Pagination:** `lib/pagination.ts`. Query `take + 1`, order by the sort column plus `id`, limit clamped 1 to 50.
- **Cache:** keys come only from `CacheKeys`. The board is the only cached issue response (5 minutes), and every issue change clears it.
- **Issues:** status exists only inside the active sprint, and outside it an issue is Backlog. Status changes go through `PATCH /issues/:id/move`, sprint changes through `PATCH /issues/:id/move-to-sprint`. The update route does not accept status, sprint or parent. Only the assignee, leads and admins edit. Developers assign only themselves, and only leads set due dates. A parent's status follows its sub-issues.
- **Side effects after a save are best effort.** Publishing an event, or announcing a change, is wrapped so a Redis failure does not turn a saved change into a 500.
- **Logging:** `logger` only, never `console`. Never log tokens, emails or request bodies. Every request logs one `request completed` line with `durationMs`, and `/health` is skipped.
- **Files:** the browser uploads straight to storage (`POST /upload/presigned-url`). The API validates the request and signs the link.

## Env variables it reads

`PORT`, `NODE_ENV`, `SERVICE_NAME`, `LOG_LEVEL`, `BASE_WEB_URL` (the CORS origin and the base of notification links), `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `REDIS_CACHE_URL`, `REDIS_QUEUE_URL`, `REDIS_PUBSUB_URL`, `STORAGE_*`, `AXIOM_TOKEN` and `AXIOM_DATASET` (logs), `SENTRY_DSN` (errors; empty in development).

## Known gaps

- `POST /auth/forgot-password` is unused (the web uses Firebase's own reset email).
- `GET /workspaces/:id` returns the member list to every member.
- The file-cleanup queue runs when an attachment, a project or a workspace is deleted, and when a logo or avatar is replaced. Deleting a single **issue** does not queue its attachment files yet. The fix is the same pattern as the project delete: collect the file keys before the delete (the rows cascade away with it), then queue them.
- Failed queue jobs are not capped, and there is no rate limiting yet.

## Links

Shared rules and commands: the root `AGENTS.md`. Data model and migrations: `packages/db/AGENTS.md`. Queues: `packages/queues/AGENTS.md`. Deployment: `DEPLOY.md`.
