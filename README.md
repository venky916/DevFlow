# DevFlow

A lightweight issue tracker for small engineering teams. Plan sprints, run a kanban board, track issues with sub-issues, comments and files, and watch your teammates work live.

[**Live demo**](https://dev-flow-blush.vercel.app) · [Status](https://devflow.betteruptime.com) · [Architecture](docs/ARCHITECTURE.md) · [Deployment](DEPLOY.md) · [Monitoring](docs/MONITORING.md)

<!-- TODO(add): after you record the video, add:  · [Demo video](YOUR_YOUTUBE_LINK) -->

<!-- TODO(add): save the GIF as docs/images/hero.gif (two windows, two users: pointers, a drag marker, avatars), then remove these comment marks
![DevFlow: two users on one board, with live pointers and a drag marker](docs/images/hero.gif)
-->

## Why I built it

Jira and Linear are built for large organizations. For a team of about 20 people working on one or a few projects at a time, they can feel heavy: many screens, many settings. DevFlow is a smaller tool for that size. It follows how a small team is organized (a workspace, projects inside it, and a clear hierarchy of roles), keeps navigation simple, and gives good board, list and backlog views, with file attachments.

It is also light to run. The whole backend (API, websocket server, background workers, three Redis instances and the HTTPS proxy) runs on one 2 GB server. The seven containers used about 560 MiB of RAM when idle (measured in November 2026, with a few users).

## Features

**Teams and roles**
- Workspaces with admins and members. Invite people by email.
- Projects inside a workspace, each with its own roles: lead, developer and viewer.

**Planning**
- Sprints: create, start and complete.
- A backlog to plan the sprints, a kanban board with drag and drop, and a list view with filters and sorting.

**Issues**
- Types, priority, labels, due dates and assignees.
- Sub-issues, an issue page and a quick slide-over, and an activity feed.
- "My Issues": everything assigned to you, across projects.

**Comments and files**
- Rich-text comments with @mentions.
- File attachments, stored privately and opened through short-lived signed links.

**Notifications**
- An in-app inbox with an unread count, and email for invites and assigned issues.

**Live collaboration**
- The board updates for everyone as cards move, and you see other people's pointers.
- A card that someone is dragging is marked, so two people do not fight over it.
- Avatars show who has an issue open, and a hint shows who is typing, editing or uploading.

**Everything else**
- Global search with a command palette (Ctrl or Cmd + K), and analytics for workspaces and projects.

## Screenshots

<!-- TODO(add): save the files in docs/images/ and remove these comment marks
| Board | Issue page |
| --- | --- |
| ![Board](docs/images/board.png) | ![Issue page](docs/images/issue-detail.png) |
| ![Backlog](docs/images/backlog.png) | ![Analytics](docs/images/analytics.png) |
-->

## Try it

Open the [live demo](https://dev-flow-blush.vercel.app) and sign up with any email. Create a workspace and a project, add an issue, and drag it across the board. To see the live features, open the same project in a second window (a private window works) signed in as a second user.

<!-- TODO(add): create these two accounts in the app, then remove the comment marks. Use a password that you use nowhere else, and reset the demo data now and then.
Or use the demo accounts (shared, so the data may change):

| | Email | Password |
| --- | --- | --- |
| Demo user 1 | venkateshsmsv1999+demo1@gmail.com | DevFlowDemo2026! |
| Demo user 2 | venkateshsmsv1999+demo2@gmail.com | DevFlowDemo2026! |
-->

The demo runs on a small AWS server paid for with free credits. If it is down, please watch the demo video instead.

## How it works

![DevFlow architecture: the browser, the web app on Vercel, the backend on AWS EC2 (Caddy, api, ws, workers and three Redis), and the services around it](docs/images/architecture.png)

- **Web:** a Next.js app on Vercel.
- **API:** Express. It checks who you are and what you may do, applies the rules, and saves to Postgres.
- **Workers:** the slow work (activity log, notifications, email, file deletion) runs in the background, through Redis queues.
- **Live updates:** the API publishes an event to Redis, a websocket server forwards it, and the browser refetches. Pointers and presence go straight through the websocket server.
- **Files:** the browser uploads straight to Cloudflare R2 with a link that the API signs.

More detail, with flow diagrams, is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Engineering decisions

1. **The server decides, the web only hints.** Every permission is checked in the API. The web hides buttons for a better experience, but it is never the protection.
2. **Live updates are hints, and the database is the truth.** A websocket message only tells the browser to refetch. A lost message costs nothing, and the app works if the websocket is down.
3. **Optimistic updates with a rollback.** A dragged card moves on screen at once. If the API refuses, the board goes back to a saved snapshot.
4. **Slow work goes through queues.** The API answers first, and a worker sends the email or writes the activity log afterward. A failed job is retried.
5. **Uploads go straight to storage.** The API only signs a link that names one file key, one type and one size, so large files never pass through it.
6. **User text is escaped before it goes into an email.** An issue title can contain HTML, and it must never become a clickable link in an email sent from the app.
7. **Shared types and schemas.** The web forms, the API and the websocket server use the same Zod schemas, so they cannot disagree about the shape of data.
8. **Safe releases.** Images contain no secrets, every release can be rolled back to the previous image, and production and development use separate databases.

## Tech stack

| Layer | What |
| --- | --- |
| Web | Next.js (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI, TanStack Query and Table, React Hook Form, Zod, Zustand, dnd-kit, Tiptap |
| API | Node 22, Express 5, Prisma 7, Zod |
| Data | PostgreSQL on Neon, Redis (cache, queue, pub/sub), Cloudflare R2 |
| Realtime and jobs | `ws`, Redis pub/sub, BullMQ |
| Services | Firebase Authentication, Gmail (nodemailer) |
| Tooling | pnpm workspaces, Turborepo, ESLint, Prettier, pino |
| Delivery | Docker and Docker Compose, Caddy, Docker Hub, Vercel, AWS EC2 |

It is a monorepo of 4 apps and 8 packages, with 11 database migrations.

## Run it locally

You need Node 22, pnpm 9 and Docker Desktop. The services below all have free plans.

1. **Clone and install:**
   ```bash
   git clone https://github.com/venky916/DevFlow.git
   cd DevFlow
   pnpm install
   ```
2. **Create the services:**
   - **Neon:** a Postgres project. Copy the pooled and the direct connection strings.
   - **Firebase:** a project with Authentication turned on (enable the sign-in methods you want), and a service account key for the backend.
   - **Cloudflare R2:** two buckets (one private, one public) and an API token. Add a CORS rule for `http://localhost:3000`.
   - **Gmail:** an app password for sending email. Without it the app still works, and email jobs fail.
3. **Add the env files.** Copy each `.env.example` to `.env` (in `apps/api`, `apps/ws`, `apps/workers`, `apps/web` and `packages/db`) and fill in the values. The variable names are listed in each example file. The Redis addresses already point at the Docker services.
4. **Create the tables:**
   ```bash
   pnpm --filter @devflow/db run build
   pnpm --filter @devflow/db exec prisma migrate deploy
   ```
5. **Start the backend and the web app:**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   pnpm --filter web dev
   ```
   Open http://localhost:3000.

Logs: `docker compose -f docker-compose.dev.yml logs -f --tail 20 api ws workers`.

## Quality and tooling

- Strict TypeScript across the repo, and one ESLint and Prettier setup shared by every package.
- Checks: `pnpm -r run lint`, `pnpm -r run check-types` and `pnpm -r run format:check`.
- Structured JSON logs with the service name in every line.
- Each app and package has an `AGENTS.md` that explains its role and rules. Start with the [root one](AGENTS.md).

## Deployment

The web app is built by Vercel on every push to `main`. The backend runs on one AWS EC2 server, in Docker Compose behind Caddy, from images pulled from Docker Hub. Production uses its own Neon database. The release steps, the rollback and the troubleshooting guide are in [DEPLOY.md](DEPLOY.md).

## Known limitations and what's next

- **No automated tests or CI/CD yet.** Next: Vitest tests for the rules and schemas, and a GitHub Actions pipeline that checks, builds and deploys.
- **Monitoring is in place, and its alerts are still being tested.** Uptime checks and a worker heartbeat (Better Stack), errors (Sentry) and searchable logs and server numbers (Axiom), all on free plans. See `docs/MONITORING.md`. A public [status page](https://devflow.betteruptime.com) shows whether the API and the web app are up. Not yet: readable web stack traces (source maps).
- **Pointers, presence and typing hints live in the memory of one websocket server,** so they work for a single instance. Scaling them would need a shared store.
- A member who is removed from a project keeps receiving its live events until their connection drops.
- Dates are stored as timestamps, so a due date can appear a day off for someone in another timezone.
- One server, with no failover.

## How it was built

I used AI tools (Claude) as a pair programmer for code and documentation. I made the product and architecture decisions, tested the app, and deployed it myself.

## About me

I'm M. Venkatesh, a software engineer looking for SDE roles at product-based companies. DevFlow is the project where I practiced designing a full-stack system: permissions, live collaboration, background jobs and a real deployment.

- GitHub: [venky916](https://github.com/venky916)
- LinkedIn: [Venkatesh Maliga](https://www.linkedin.com/in/Venkatesh-Maliga)
- Email: venkateshsmsv1999@gmail.com
<!-- TODO(add): portfolio and resume links -->

## License

[MIT](LICENSE)