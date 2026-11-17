# DevFlow

A project-management tool for software teams: workspaces, projects, sprints, a kanban board, issues with sub-issues, comments with mentions, file attachments, notifications, and live collaboration (pointers, who is on the page, typing hints). A pnpm and Turborepo monorepo.

This file is the map. Each app and package has its own `AGENTS.md` with the rules for that folder. The pictures are in `docs/ARCHITECTURE.md`, and the release steps are in `DEPLOY.md`.

## Repo map

| Folder | What it is | Rules |
| --- | --- | --- |
| `apps/web` | The Next.js app: everything the user sees | `apps/web/AGENTS.md` |
| `apps/api` | The REST API (Express). Checks who you are and what you may do, then reads and writes the database | `apps/api/AGENTS.md` |
| `apps/ws` | The websocket server (package name `ws-server`). Sends live updates to open browsers | `apps/ws/AGENTS.md` |
| `apps/workers` | Background workers: activity log, notifications, email, file deletion | `apps/workers/AGENTS.md` |
| `packages/types` | TypeScript types and event names shared by everything | `packages/types/AGENTS.md` |
| `packages/validators` | Zod schemas, shared by the web forms, the API and the websocket server | `packages/validators/AGENTS.md` |
| `packages/ui` | Shared React components and design tokens | `packages/ui/AGENTS.md` |
| `packages/db` | The Prisma schema, migrations and client | `packages/db/AGENTS.md` |
| `packages/backend-common` | The logger, the Redis clients and Firebase Admin | `packages/backend-common/AGENTS.md` |
| `packages/queues` | The BullMQ queues and the shape of each job | `packages/queues/AGENTS.md` |
| `packages/storage` | Signed upload and download links for files (Cloudflare R2) | `packages/storage/AGENTS.md` |
| `packages/config` | Shared ESLint, Prettier and TypeScript settings (dev only) | `packages/config/AGENTS.md` |
| `docker/`, `docker-compose*.yml`, `Caddyfile` | How the backend is built and run | `DEPLOY.md` |

## Who uses whom

| Package | Used by |
| --- | --- |
| `types` | `web`, `api`, `ws`, `workers`, `ui`, `queues` |
| `validators` | `web`, `api`, `ws` |
| `ui` | `web` |
| `db` | `api`, `ws`, `workers` |
| `backend-common` | `api`, `ws`, `workers`, `queues` |
| `queues` | `api` (adds jobs), `workers` (takes them) |
| `storage` | `api` (signs links), `workers` (deletes files) |
| `config` | every package, as a dev dependency |

Apps never import from each other. They share code only through packages, and they talk to each other over HTTP, the websocket, Redis and the database.

## How the pieces talk

- **Browser to API:** HTTPS, with the Firebase ID token in the `Authorization` header. The API is the only thing that changes data.
- **API to workers:** through Redis queues. The API answers the user first, and the slow work runs afterward.
- **API or workers to browsers, live:** they publish an event on a Redis channel, the ws server forwards it to the browsers in that room, and the browser refetches. A live message is a hint, and the database is the truth.
- **Browser to storage:** straight to Cloudflare R2 with a link the API signed. File bytes never pass through the API.

## Tech stack

| Layer | What |
| --- | --- |
| Web | Next.js (App Router), React 19, TypeScript, Tailwind v4, Radix UI, TanStack Query and Table, React Hook Form, Zod, Zustand, nuqs, dnd-kit, Tiptap, Firebase Auth, the browser `WebSocket` |
| API | Node 22, Express 5, Zod, Prisma 7, pino |
| Data | PostgreSQL on Neon, three Redis instances (cache, queue, pub/sub), Cloudflare R2 for files |
| Realtime and jobs | `ws`, Redis pub/sub, BullMQ |
| Services | Firebase Auth, Gmail (nodemailer) |
| Tooling | pnpm workspaces, Turborepo, TypeScript 5.9, ESLint 9, Prettier |
| Delivery | Docker and Compose, Caddy, Docker Hub, GitHub, Vercel, AWS EC2, DuckDNS |
| Planned | Better Stack, Sentry, Axiom, Vitest, GitHub Actions |

## Patterns used, and where to see them

| Pattern | Where |
| --- | --- |
| Shared packages for types and validation, so the web and API cannot drift | `packages/types`, `packages/validators` |
| A layered API: route, middleware, controller, service, repository | `apps/api` |
| **The server decides, the web only hints.** Permissions are checked in the API, and the web hides buttons | `apps/api/src/middlewares`, `apps/web/lib/permissions.ts` |
| One source of truth per screen: React Query's cache, never a second copy in a store | `apps/web/hooks` |
| An optimistic update with a snapshot and a rollback | `useMoveIssue` in `apps/web/hooks/use-board.ts` |
| Slow side effects go to a queue | `packages/queues`, `apps/workers` |
| A saved change is announced through Redis, then the websocket makes browsers refetch | `apps/api/src/lib/redis.publisher.ts`, `apps/ws` |
| Temporary live state (pointers, who is here) is kept in memory and never saved | `apps/ws/src/handlers` |
| Direct upload with a signed link | `packages/storage`, `apps/web/lib/upload.ts` |
| Fractional indexing for card order, so a drop never renumbers the column | `apps/web/lib/fractional-position.ts` |
| Escape by default: user text is escaped before it goes into an email | `apps/workers/src/emails/html.ts` |
| Structured logs: one JSON line per event, with the service name | `packages/backend-common/src/logger.ts` |
| Config from env files, never from code, and images carry no secrets | `.env.example` in each app |
| Releases by image tag, with a rollback copy | `DEPLOY.md` |

## API at a glance

All routes are under `/api/v1` and need a signed-in user, except `/health`. The controllers are the source of truth.

| Area | Routes (examples) |
| --- | --- |
| Workspaces | `GET /workspaces/summary`, `GET /workspaces/by-slug/:slug`, members, invites, analytics |
| Projects | `GET /projects/by-slug/:ws/:project`, `GET /workspaces/:id/projects/summary`, members, labels, activities, analytics |
| Issues | `GET /projects/:id/issues/board`, `.../backlog/grouped`, `.../search`, `POST /projects/:id/issues`, `GET`, `PATCH` and `DELETE /issues/:id` |
| Issue moves | `PATCH /issues/:id/move` (status and position), `PATCH /issues/:id/move-to-sprint` |
| Sub-issues | `POST /issues/:id/children`, `POST /issues/:id/children/attach`, `DELETE /issues/:id/children/:childId` |
| Sprints | list, create, update, start, complete, delete (only a planned sprint can be deleted) |
| Comments | `GET` and `POST /issues/:id/comments`, `PATCH` and `DELETE /comments/:id` |
| Attachments | `GET` and `POST /issues/:id/attachments`, `DELETE /issues/:id/attachments/:attachmentId`, `GET .../download-url` |
| Activity | `GET /issues/:id/activities` (paged) |
| Files | `POST /upload/presigned-url` |
| Me | `GET /users/me`, `GET /users/me/counts`, `GET /users/my-issues/board`, `/list`, `/projects` |
| Notifications and search | `GET /notifications` (paged), `PATCH .../read`, `GET /search?q=` |

The envelope is `{ success, message, data }`. A create returns 201, and a delete returns 204 with no body.

## Commands

```
pnpm install

# local development
docker compose -f docker-compose.dev.yml up -d       api, ws, workers and Redis
docker compose -f docker-compose.dev.yml logs -f --tail 20 api ws workers
pnpm --filter web dev                                the web app on http://localhost:3000

# checks (the same ones CI will run)
pnpm -r run lint
pnpm -r run check-types
pnpm -r run format:check
pnpm -r run format                                   fixes formatting
```

`pnpm check` runs the same checks through Turborepo.

**Database:**

```
pnpm --filter @devflow/db exec prisma migrate dev --name <what_changed>     development only
pnpm --filter @devflow/db exec prisma migrate deploy                         production only
```

**Release:** build and push the images, then pull and start them on the server. Steps, the rollback and the safety copy are in `DEPLOY.md`.

## Environments

| | Development | Production |
| --- | --- | --- |
| Runs on | Your laptop: the dev Docker stack and `pnpm --filter web dev` | AWS EC2 for the backend, Vercel for the web |
| Database | `devflow-dev` (Neon, Singapore) | `devflow-prod` (Neon, Sydney) |
| Env files | `apps/*/.env` and `packages/db/.env` | Copies kept outside the repo, copied to the server |
| Logs | Colored lines | JSON lines |

Every app has a `.env.example` that lists the variable names. The real `.env` files are never committed.

## Env variables by app

| App | Reads |
| --- | --- |
| `web` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_APP_URL`, six `NEXT_PUBLIC_FIREBASE_*`. They are public and baked into the build. |
| `api` | `SERVICE_NAME`, `PORT`, `NODE_ENV`, `BASE_WEB_URL`, `DATABASE_URL`, `FIREBASE_*`, `REDIS_CACHE_URL`, `REDIS_QUEUE_URL`, `REDIS_PUBSUB_URL`, `STORAGE_*` |
| `ws` | `SERVICE_NAME`, `PORT`, `NODE_ENV`, `DATABASE_URL`, `FIREBASE_*`, `REDIS_PUBSUB_URL` |
| `workers` | `SERVICE_NAME`, `NODE_ENV`, `BASE_WEB_URL`, `DATABASE_URL`, `REDIS_QUEUE_URL`, `REDIS_PUBSUB_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `STORAGE_*` |
| `packages/db` | `DIRECT_URL`, used only for migrations from a laptop |

## Never do

- Never run `migrate dev` or `db push` against production, and never edit a migration that has already run.
- Never commit a `.env` file, a `.pem` key or a token. Never put a secret under a `NEXT_PUBLIC_` name.
- Never use `console.*` in the backend. Use the logger, and never log tokens, emails or request bodies.
- Never run `docker image prune -a` on the server. It would delete the rollback copy.
- Never skip the permission check in the API because the web already hides the button.
- Never put business rules in `packages/ui`, `packages/types` or `packages/validators`.
- Never add a second copy of server data in a store. React Query is the single copy.

## Where to look next

- A new developer: this file, then `docs/ARCHITECTURE.md`, then the `AGENTS.md` of the app you will change.
- Releasing, rolling back, changing an env value: `DEPLOY.md`.
- Open items and known gaps: `LEDGER.md`.