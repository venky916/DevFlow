# DevFlow Ledger (version 4)

Only what is LEFT. Everything built or decided since version 3 is in "Done" and "Decisions".
Updated: 18 November 2026.

The plan: finish monitoring, then tests and CI/CD, then fix this list group by group.

Status: `[ ]` open, `[x]` done, `(verify)` needs a check in the repo or on the server first, `(optional)` nice to have.

---

## Done

**Product (all built and refactored):** auth, workspaces, projects, profile, uploads, notifications, search and command palette, sidebar and header, sprints, board (board view, list view, create issue), issue slide-over, backlog, My Issues, issue detail page (fields, sub-issues, comments, attachments, activity), analytics.

**Live collaboration (websockets):** notifications update the bell live. The board updates for everyone (card moves are applied at once, the rest refetches). The issue page updates comments, files, activity and fields. Avatars show who has an issue open. Typing, editing, uploading and property-change hints. Pointers on the board. A dashed marker on a card someone is dragging. The ws server checks access (project member or workspace admin) and runs a heartbeat. Attachment and activity events are now published.

**Backend rules in place:**
- Issue rules: a developer edits only issues assigned to them. Only leads and admins set due dates. A developer assigns only themselves. Parents with sub-issues can't be moved. Status exists only inside the active sprint. Sub-issues follow their parent's sprint. A parent's status is derived from its sub-issues.
- Positions are validated, ties break by id, and a move without a position goes to the end of the column.
- Sprints: completing needs an active sprint, only a planned sprint can be deleted, delete and complete use transactions.
- Comments, attachments (signed links, type and size limits), and 3 email templates with safe HTML and plain-text versions.
- File cleanup runs when an attachment, a project or a workspace is deleted, and when a logo or avatar is replaced.

**Deployment and operations:**
- Web on Vercel. Backend on one AWS EC2 server (Docker Compose: api, ws, workers, three Redis, Caddy for HTTPS). Images built on the laptop and pulled from Docker Hub, with a rollback copy per release.
- Two Neon projects: `devflow-dev` (Singapore) and `devflow-prod` (Sydney). Production has all 11 migrations.
- Credentials rotated and the old ones deleted. Redis Cloud and Resend are no longer used.
- AWS budget alert created. Logging moved to pino: JSON in production, a `service` name on every line, redaction of secrets, a clean request log.
- Request id in the API and through the queues to the workers (monitoring step 1). The code is applied. Testing is open (section 15).

**Docs:** README, MIT license, root `AGENTS.md`, an `AGENTS.md` in every app and package, `docs/ARCHITECTURE.md` (diagrams and the icon picture), `DEPLOY.md` (runbook, migrations, rollback and a CI/CD design).

**Cleanups done:** the token `console.log` in `lib/axios.ts` is gone. The request log uses `originalUrl`. The misspelled controller file names are fixed. `preview.ts` is deleted. `BASE_WEB_URL` is in the workers' env. Docker images use Node 22.

## Decisions made

- Everyone in a project can SEE every issue. Only the assigned person, leads and admins EDIT it.
- Mentions: project members only. Comments carry no files in v1.
- Email is only for things the person can't see in the app. Everything else is an in-app notification.
- Upload link path is `/upload/presigned-url`. Attachments are their own call.
- A project without a LEAD is fine. Workspace admins always have full access and can't be removed.
- Portfolio scope: simple rules that work beat many strict ones. Known limits go in the README.
- Dates (section 5) and the validators rewrite (section 6) happen after testing.
- **Live updates are hints, and the database is the truth.** Saved events go API or worker, Redis, ws, browser. Temporary events (pointers, presence, hints, drag markers) go straight between browser and ws server, in memory, for a single instance.
- Two Neon projects, not branches (so production is empty, in the server's region, with its own credentials). Dev and production share the same Firebase project and R2 buckets. Accepted for a demo.
- Monitoring tools, one account each: Better Stack (uptime and a heartbeat), Sentry (errors), Axiom (logs). Alerts by email. No Prometheus, Grafana or full tracing.
- Logs go to Axiom through `pino.multistream` and the `@axiomhq/js` client, not the official pino transport (the transport forces numeric levels).
- The README keeps an honest line that AI tools were used as a pair programmer. License: MIT.

---

## 0. Do these first

- [ ] **Test monitoring step 1** (section 15), then commit it.
- [ ] (verify) **The server uses the production database and has `SERVICE_NAME`.** Run the three checks in `DEPLOY.md` section 4.9.
- [ ] **Reboot test** on the server (`DEPLOY.md` 4.4).
- [ ] (verify) **Card order collation** on **both** databases: `SELECT datcollate FROM pg_database WHERE datname = current_database();`. If the result is not `C`, position keys can sort differently after about 36 issues in one column (IS4). Fix: an empty migration with `ALTER TABLE "issues" ALTER COLUMN "position" TYPE text COLLATE "C";`, run on dev first.
- [ ] (verify) `Comment` has `updatedAt DateTime @updatedAt` (the web shows "edited" from it).
- [ ] (verify) The R2 CORS rule on both buckets lists only the web address and `http://localhost:3000`.
- [ ] Turn on **GitHub secret scanning with push protection**, and Dependabot (Settings, Security). Ten minutes, and secrets were exposed earlier in this project.
- [ ] Run the cleanup greps (section 12).

---

## 1. Security and exposure

- [ ] **C1** `GET /workspaces/:id` returns the full member list to any member. Delete the endpoint.
- [ ] **A2** `BASE_WEB_URL` is not validated in the API. Add `config/env.ts` (Zod), stop at startup if a variable is missing, use it in `web-links.ts`. The workers already stop without it. Same idea for `GMAIL_USER` and `GMAIL_APP_PASSWORD`.
- [ ] **A1** `uploadRouter` is mounted at `/` with `authenticate` on the whole router, so unknown URLs return 401 instead of 404. Put `authenticate` on each upload route. Confirm there is a not-found handler before `errorMiddleware`.
- [ ] **I3** (verify) `acceptInvite` must check that the signed-in user's email matches the invite email.
- [ ] **I5** `POST /auth/forgot-password` is public and sends email. Add rate limiting if the endpoint stays (see section 8).
- [ ] **Queues** `removeOnFail: false` keeps failed jobs forever. Use `removeOnFail: { age: 7 * 24 * 3600, count: 1000 }` on all four queues.
- [ ] **Hardening (cheap, later):** `helmet` in the API, `express-rate-limit` on auth and write routes (Redis store), timeouts on outbound calls (email, storage), `$transaction` where several writes must succeed together, `npm audit` in CI.
- [ ] **Websocket:** no origin check and only light rate limits. A member removed from a project keeps its live events until their connection drops.
- [ ] **SSH** is open to the internet and protected only by the key. Tighten it with CI/CD (section 16).
- [ ] Accepted for the demo: dev and production share one Firebase project and the R2 buckets. Redis has no password (it is reachable only inside Docker).

## 2. Role checks (backend foundation)

Rule: the middleware's public shape does not change (`requireProjectRole`, `requireWorkspaceRole`, `req.projectAccess`).

- [ ] **A4** `requireWorkspaceRole` and `requireWorkspaceMember` load the member, then controllers load it again. Load once, attach to `req`.
- [ ] **A5** `resolveProjectAccess` runs 3 queries on every project route. Make it one query. It is also called by the comment service, the upload controller and the ws server (`canAccessProject`).
- [ ] One backend permission table, so no `['ADMIN'].includes(role)` or `role !== 'ADMIN'` appears in controllers.
- [ ] **T3 / V6 / A6** Roles are defined in three places (Prisma, `packages/types`, `z.enum`), and `ResolvedAccess` duplicates `IProjectAccess`. Pick one source.
- [ ] **T6 / A9** `getWorkspaceBySlug` sends `members[0]?.role` (maybe undefined) while the type says it is always present.
- [ ] **C12** The "admin has no project role" ternary is written three times. Add a `buildProjectAccess` helper.

## 3. Members cascade

The database already cascades everything inside a workspace or project. Code has to cover the rest.

- [ ] **N2** The default cache time is 5 minutes (`TTL.BOARD`). Workspace member caches use it instead of `TTL.MEMBERS`. Clear member caches when a workspace or project is deleted.
- [ ] **IS19** The board cache is not cleared when a label is edited or deleted, a member is removed from a project, or a user is renamed. The 5-minute TTL covers it for now.
- [ ] Removing a workspace member should also remove or expire pending invites for that email.
- [ ] **N3** Notifications about a deleted project or issue stay and open a 404. Delete or ignore them when the target is deleted.
- [ ] User deletion is not a feature. Several relations (`WorkspaceMember.user`, `Issue.creator`) have no `onDelete`. Decide when building delete-account.

## 4. Files

- [ ] **AT8** Deleting a single **issue** does not queue its attachment files. Collect the keys before the delete (the rows cascade away), then queue them, as `deleteProject` does. Also check sub-issues deleted with a parent.
- [ ] `deleteProject`: simplify the one-clause `OR` in the attachment query and fix its comment. Optional: wrap `addBulk` in a try/catch so a Redis failure after the delete does not return 500.
- [ ] **Orphaned uploads.** A file uploaded but never saved (modal cancelled, save failed) stays in storage. Fix: a delayed job (about 1 hour) that deletes the key if no row references it, or a bucket lifecycle rule.
- [ ] **C7** `removeWorkspaceLogo` has no route or hook, and there is no remove-avatar route. Add them or delete the dead controller.
- [ ] **V2** `updateAvatarSchema` allows a missing URL and the controller uses `url!`. Require a string.
- [ ] **W12** The web's avatar and logo pickers accept any image, but the server accepts png, jpeg and webp only. A GIF fails with a 422. Limit the picker.
- [ ] **AT9** The same storage key could be saved twice (deleting one attachment would remove the shared file). Reject a key that is already attached.
- [ ] **AT11** (optional) No limit on the number of attachments per issue.
- [ ] **DP5** (optional) The upload area has no file type filter on the client.
- [ ] A file name with non-English letters can download with a garbled name. Add the `filename*=UTF-8''` form if it matters.
- [ ] (optional) Store only `fileKey` for public files and build the public URL on response.

## 5. Dates (needs a database backup first)

Problem: `Sprint.startDate`, `Sprint.endDate` and `Issue.dueDate` mean calendar days but are stored as timestamps. The date picker sends local midnight, which becomes UTC. Existing rows are inconsistent, so other timezones see a shifted day.

Rule: a calendar day is a string `YYYY-MM-DD` from the picker to the database, never a Date or timestamp in between.

- [ ] **D1** DB: `@db.Date` on those three columns, plus a conversion of existing rows. Before a migration on production, make a Neon branch of `devflow-prod` as a backup.
- [ ] **Validators** a date-only schema (`z.iso.date()`) for day fields.
- [ ] **API** send `YYYY-MM-DD` (one small serializer). Filters and "overdue" compare days. "Today" comes from the user's timezone (`User.timezone` exists).
- [ ] **T2** Types: day fields are `string`. Add `startDate` and `endDate` to `IProjectDetail.sprints`.
- [ ] **Web** `DatePicker` converts at the edge. Add `formatDay` to `lib/format-date.ts` and replace `formatShortDate` and the `toLocaleDateString` calls.
- [ ] **B19** Due-date filter presets are saved as absolute timestamps in the URL, so a bookmarked "due today" shows an old range tomorrow. The custom range is off by one day west of UTC. "Overdue" includes issues due today, and done issues.
- [ ] **S8** The sprint date rule uses strict `<`, so a one-day sprint is invalid. Starting a sprint keeps a planned `startDate` even if it is in the future. Decide.
- [ ] A cleared date must be sent as `null`, not `""` (the sprint forms).
- [ ] **B40** The list view and sprint card format dates with the browser's locale.

## 6. Validators rewrite (after the screens settle)

Schemas are loose on purpose. Rewrite them against the final DB columns and forms, then remove the `as string` and `!` workarounds.

- [ ] **V0** Remove `.nullable()` and `.optional()` where the column is required or the form always sends a value. Re-check each form.
- [ ] **V1** `createLabelSchema.color` must be required (a missing color returns a 500).
- [ ] **V5** Tighten the slug regex: `^[a-z0-9]+(-[a-z0-9]+)*$`.
- [ ] **V7** `cursor`, `limit` and `q` are parsed by hand. Add a shared query schema.
- [ ] **V8 / A13** The server returns per-field 422 errors, but the web only shows the generic message.
- [ ] **I1** Lowercase invite emails (`Bob@x.com` and `bob@x.com` count as different).

## 7. API consistency

- [ ] **A3** Only `P2002` and `P2025` are converted. Add `P2003` (foreign key) and `P2000` (value too long).
- [ ] **A7** `sendSuccess(data: any)` and `sendPaginated(meta: any)` lose types. Use generics.
- [ ] **A10** `getIssueActivities` has its own copy of the cursor logic. Use `lib/pagination`.
- [ ] **A11 / A12** Only `unauthorized` takes a `code`. Several helpers are unused.
- [ ] **A8** Analytics routes live in `routes/index.ts`. Move them into the domain routers.
- [ ] **C9 / S1 / IS11** Routes mounted without a project id (`POST /projects`, `GET /projects/summary`, `/sprints`, `/issues` list routes) reach the middleware with an undefined id and return 500. Split the mount points.
- [ ] **C10** `createWorkspace` does a find-then-insert slug check. Remove it, the unique index covers it.
- [ ] **A17** `getProjectAnalytics` runs two count queries per member (N+1). Use one grouped query.
- [ ] **A14** (optional) Workspace summary can start from `workspaceMember`.
- [ ] **A15** (verify) `getProjectById` returns `isWorkspaceAdmin` on members.
- [ ] **A16** Remove unused code in `project.controller.ts` (`isUniqueViolation`, `isOwnerOrAdmin`, `const deleted`) and the redundant `as string` in `project.service.ts`.
- [ ] **I2** (verify) `findPendingInvite` must ignore expired invites.
- [ ] **I4** `createInvite` returns `{ inviteId, ... }` while the web types it as `IWorkspaceInvite`.
- [ ] **S2** "One active sprint per project" is a read-then-write check, so two simultaneous starts can both pass. Add a partial unique index (`ON sprints("projectId") WHERE status = 'ACTIVE'`).
- [ ] **S3** After the database write, start and complete run cache, activity, notification and event calls in sequence. If one throws (Redis down), the request returns 500 even though the sprint changed. Make those best-effort, as the attachment events are.
- [ ] **S4** `getSprintById` returns every issue unpaged, and `getSprints` loads done issue ids only to count them. Use a grouped count.
- [ ] **S6** The sprint controller mixes direct Prisma calls with the service. Move them into the service.
- [ ] **S7** Sprint create, update and delete are not written to the activity log.
- [ ] **S9** Sprint notifications go to project members only. A workspace admin outside the project gets none.
- [ ] **IS22** Two simultaneous creates can generate the same position key (order stays stable thanks to the id tie-break).
- [ ] **IS16** Sorting by priority follows enum order, which puts `NO_PRIORITY` first.
- [ ] **F5 / F7** A parent's automatic status change, label changes, and sub-issue create or delete are not written to the activity log.
- [ ] **BL4** A Done issue moved out of the active sprint goes back to Backlog. Decide whether to block it.

## 8. Notifications and email

- [ ] **Forgot password path.** The web uses Firebase's own reset email, so the `forgotPassword` API controller, its route and the password-reset template are unused. Recommended: keep Firebase's email and delete the controller, the route, the template and the email type. If kept instead, use `notificationService.sendPasswordResetEmail` and `webLinks.resetPassword`, and add rate limiting.
- [ ] **Email worker:** keep the 7-file structure, or merge it into 3 files (worker, templates with one `esc()` helper). Either way, keep the escaping. When adding a test, check that an issue title with HTML does not become a link.
- [ ] **T7** (verify) `NotificationTypes` (API and queues) vs `NotificationType` (web). Confirm `packages/types` exports and that they agree.
- [ ] **E7** (verify) The logo shows in a real inbox. It loads from a public address, so do not test with `localhost` links.
- [ ] **E8** (optional) Comment emails can return later with notification settings.
- [ ] **E11** (optional) To remove the issue-assigned email: delete the `if (assignee) { ... }` block at the end of `notifyIssueAssigned` and the matching queue and template branches.
- [ ] **E12** (optional) Dark header instead of the white card: only `layout.ts` changes, plus a white-text logo file.
- [ ] Gmail's daily sending limit is the ceiling for email volume.

## 9. Database

- [ ] **D3** Confirm `prisma migrate status` is clean on both databases, and that nothing calls `project.findUnique({ where: { slug } })` (also seed scripts).
- [ ] **D2** (optional) The old `@@index([workspaceId])` on `Project` is redundant.
- [ ] **D4** (optional) Search uses `contains` (a scan). Add a trigram index only at hundreds of thousands of issues.
- [ ] (see section 0) `Comment.updatedAt` and the position collation.
- [ ] Production starts empty. Decide whether to add a small seed for demo data (optional, see section 17).

## 10. Web UI consistency (one visual pass, last)

- [ ] **C18** (verify) `text-body` and `text-2xs` render at 13px and 11px. If not, fix `theme.css`.
- [ ] **C19** (verify) `--font-sans: "Geist Sans"` matches the family `next/font` generates.
- [ ] **C20** (verify) `cn` in `packages/ui` uses `twMerge`.
- [ ] **C4** Arbitrary sizes remain in cards, board, issue components and the sidebar (`text-[10px]`, `h-[5px]`, `p-[10px_12px]`, `w-[250px]`, `top-[38px]`, 200px sidebar).
- [ ] **C5** `Button` and `Select` use 14px while body text is 13px.
- [ ] **C8** The shared dropdown closes and reopens when you click its trigger while open.
- [ ] **C16** Add `autoComplete` to the auth inputs.
- [ ] **W9** Stat grids are not responsive.
- [ ] **W10** Write a "typography and spacing" section in `apps/web/AGENTS.md`.
- [ ] **B14** Cards, filter dropdowns and the board are not keyboard accessible.
- [ ] **B21** Click-outside code is copied three times (filters, due date, sub-issue search).
- [ ] **B30** `PRIORITY_COLORS` for LOW and NO_PRIORITY have almost no contrast on dark, and constants use raw hex.
- [ ] **B33** With no active sprint the board shows four empty columns and no hint.
- [ ] **B45** `LabelMultiSelect`: the remove-label control is a `span` inside a `button` with no accessible name, `text-white` on the accent color (use `accent-text`), and the chip tint assumes a 6-digit hex.
- [ ] **B46** `FieldRow` width and slideover widths (`w-1/2`, `w-[250px]`) are not responsive.
- [ ] **B49 / B50** A sub-issue with no assignee shows nothing on board hover but a "?" circle in the backlog. The hover list shows the title only, not the status.
- [ ] **P1** `DatePicker` uses arbitrary sizes and `!bg-accent !text-white`.
- [ ] Hard-coded hex colors in `CommentBox`, `MentionList` and `CommentContent`. Use tokens.
- [ ] **DP1** (optional) Skeleton placeholders for comments and files.
- [ ] **DP2** The Properties card on the detail page is not collapsible any more.
- [ ] **DP4** No warning when you leave the page while a field is still saving.
- [ ] **BL1 / BL2 / BL3** Backlog rows in the active sprint don't show their status, there is no create-sprint button on the backlog, and completed sprints can only be browsed on the sprints page.
- [ ] **BL5** Reordering inside the active sprint changes the order of the cards in the board column too.
- [ ] **S11** Only leads and admins can open the sprints page. Decide whether members get a read-only list.
- [ ] Other `packages/ui` fixes (confirm applied): `ImageUploadButton` `type="button"`, `ColorDot` `type="button"`, `Select` label wired with `useId`.
- [ ] Live-update look: the pointer arrow, the drag marker and the hint text in the issue header were built functionally. Review them in the visual pass.

## 11. Web code structure

- [ ] **W1** `use-projects.ts` is over 300 lines. Split members and labels into `use-project-settings.ts`.
- [ ] **W2** Member and label mutations invalidate all of `projectKeys.all`.
- [ ] **W3** Create project closes the modal and stays on the page. Decide if it should open the new project.
- [ ] **W4** Check nothing still passes `workspaceSlug` to the create modals.
- [ ] **W7** `showError` is copy-pasted in older hook files. New files use `lib/show-error.ts`. Replace the older copies.
- [ ] **W8** A network failure (axios error with no `response`) should show "Check your connection".
- [ ] **C15** `useSignOut` may leave a `?redirect=` on the sign-in URL after a manual sign-out (cosmetic).
- [ ] **B41** The instant update covers the board and backlog only. The list view refreshes after the response.
- [ ] **B42** A drop with equal neighbour keys falls back to "end of column" instead of an error (root cause: IS22).
- [ ] **MI1 / MI2 / MI3** The sidebar badge counts non-done issues, while My Issues also shows Done issues in the active sprint. The My Issues board has no limit. A sub-issue assigned to you also appears under its parent's hover list if the parent is yours.
- [ ] **CM6** Comments are not paged.
- [ ] **CM7** Workspace admins who are not in the project can't be mentioned (decision: project members only).
- [ ] Comment "edited" is shown when `updatedAt` is more than one second after `createdAt`. Saving without a change counts as an edit.
- [ ] A few `any` warnings remain (about 31 across the repo). Replace them, then make `no-explicit-any` an error.

## 12. Cleanup and verification

Run these greps first. Delete what has no imports left.

```bash
git grep -n "board.store\|useBoardStore" -- apps/web         # delete stores/board.store.ts
git grep -n "demo-redis" -- apps packages                    # delete packages/backend-common/src/demo-redis.ts
git grep -n "use-can-move-issue\|useCanMoveIssue" -- apps/web
git grep -n "useProjectSprints\|IIssueWithRelations" -- apps packages
git grep -n "PaginatedResponse" -- apps/web
git grep -n "useMe(" -- apps/web                             # replace with useMyProfile
git grep -n "use-workspace-settings\|use-project-settings\|use-logo-upload\|use-image-upload\|use-avatar-upload\|use-analytics\|use-global-search" -- apps/web
git grep -n "getSubIssues" -- apps                           # IS23: unused endpoints
git grep -n "_projectId" -- apps/web/hooks                   # B35: unused parameters
git grep -n "console\." -- apps/api apps/ws apps/workers packages/backend-common packages/queues packages/storage packages/db
git grep -n "{ error }" -- apps packages                     # the logger convention is { err }
```

- [ ] Delete what the greps show is unused (see the list above).
- [ ] Convert leftover `console.*` calls in the backend to the logger, remove emojis from log messages, and turn template-string log messages into a message plus fields.
- [ ] **C6** Delete the old endpoints: `GET /workspaces` (`getMyWorkspaces`), `getProjects`, `getAllProjectActivities`, the flat `GET .../issues/backlog`, and `GET /issues/:id/children` if unused (IS23).
- [ ] **C14** Delete the old hook files listed above, `IMyIssue` duplicates and `IMyProfile`.
- [ ] **T4** Delete `IWorkspaceWithMembers` with `GET /workspaces/:id`.
- [ ] **T5** (optional) Types are hand-written and can drift from the API. Consider shared types later.
- [ ] Remove `email-previews` and `verify.log` from `.gitignore` if they are no longer needed, and make sure no `package-lock.json` is tracked.
- [ ] Delete the old detail files (old `issue-properties-panel.tsx`, old `comments-section.tsx`) if any copy is left.

## 13. Environment and tooling

- [ ] **L1** API requests took 1 to 2 seconds in the local setup (the dev database is in Singapore). Measure `durationMs` in production once monitoring runs, and compare warm requests with the first request after Neon wakes from sleep.
- [ ] **L3** Occasional dev-only 404 on valid routes with Turbopack. Delete `.next` first, then try `next dev --webpack`.
- [ ] **Turbo on Windows:** `pnpm turbo run ...` fails with `spawn UNKNOWN` (probably antivirus blocking `turbo.exe`). `pnpm -r run lint`, `check-types` and `format:check` do the same job meanwhile.
- [ ] Prisma shows an update notice (7.8.0 to 8.0 release candidate). Do not upgrade yet.

## 14. Live updates: known limits and later ideas

Built and working (see Done). What is left:

- [ ] Temporary live state (pointers, presence, hints, drag markers) lives in the memory of one ws server. To scale it, publish it through Redis and keep presence in a shared store with an expiry.
- [ ] A member removed from a project keeps receiving live events until their connection drops.
- [ ] The issue slide-over is not in the issue room, so its activity does not update live.
- [ ] No origin check, and only light rate limits.
- [ ] (optional) Put the live-event routing table in one place, as the `ws` doc describes.

## 15. Monitoring (in progress)

Plan: one account each. Better Stack for uptime checks and a heartbeat, Sentry for errors, Axiom for logs. Everything is tested on the dev stack first, then shipped. Free limits change, so confirm them on each pricing page.

- [x] Accounts created (Better Stack, Sentry, Axiom).
- [ ] **Baseline:** note `docker stats --no-stream` on the server before and after, since the SDKs add memory (about 877 MiB is free).
- [ ] **Step 1, request id.** Applied. Test: the four `curl` checks, the 401 body shows `requestId`, and assigning an issue in the web app shows the same id in the API and the worker logs. Then commit.
- [ ] **Step 2, uptime checks (Better Stack, no code).** Monitors on the API `/health`, the ws `/health` and the web address, with email alerts. **A frequent check must not touch the database.** Neon sleeps after 5 minutes of inactivity, and the free plan has a compute allowance. Drill: stop `api`, expect an email, start it, expect a recovery email.
- [ ] **Step 3, logs in Axiom.** `pino.multistream` (stdout plus an `@axiomhq/js` stream, switched on by `AXIOM_TOKEN`), a `LOG_FORMAT=json|pretty` env, flush on shutdown in the API and ws, `onError` to stderr, and it must never crash the app. Datasets: `devflow-dev`, `devflow-prod`, `devflow-host` (the free plan allows 3). Create the org in the US region. Ingest-only tokens, one per environment. Limit: 256 fields per dataset, so keep a fixed list of log keys and never log whole objects. Test the dev dataset first, then production.
- [ ] **Step 4, errors in Sentry.** Manual capture: the API's 5xx path, the worker `failed` handlers, ws error paths. `dataCollection` off (the SDK sends IPs, user ids and bodies by default), ESM loader hooks off, and tracing, replay, logs and metrics off. Web: `@sentry/nextjs`, set up by hand, with the auth token for source maps only in Vercel. Tag events with the request id, environment and release. Confirm the Node SDK supports Express 5 (it does since 9.2) and Next.js 14 or higher.
- [ ] **Step 5, workers heartbeat (Better Stack).** A ping from the workers every 2 minutes, with a period of 5 minutes and a grace of 5 minutes to start. The heartbeat URL is a secret and lives in the env file.
- [ ] **Step 6, server resources (optional).** A small script on the server that sends `free`, `df` and `docker stats` as JSON to `devflow-host`, with alerts on low memory and disk.
- [ ] **Step 7, alerts, a dashboard and a runbook.** Alerts you can act on: site down, a new Sentry error, an error spike, low memory or disk. Axiom allows 3 monitors. A dashboard of requests per minute, error rate and p95 latency per service.
- [ ] **Step 8, drills and docs.** Break things on purpose to prove each alert. Update `DEPLOY.md` (a monitoring section and the new env variables), the `AGENTS.md` files (request id, logging and Sentry rules, the field list), and the README limitation lines.
- [ ] Confirm from the sites: Better Stack's free check interval, Sentry's free numbers, Neon's free compute hours. Versions: Next.js, React, pino, Express.
- [ ] (optional) Vercel Speed Insights.

## 16. Tests and CI/CD

- [ ] **Vitest, a few tests per package:** the issue permission rules and the parent status rule, the comment schema, `renderEmail` with a nasty issue title (the output must not contain a clickable link from user text), the board move helper, and the `createTracedQueue` stamping.
- [ ] (optional) Supertest on a couple of routes.
- [ ] **GitHub Actions**, as designed in `DEPLOY.md` section 10: checks (install, lint, types, format, tests, web build), images tagged with the commit hash, deploy over SSH with a health check and an automatic rollback.
- [ ] Secrets in GitHub: Docker Hub username and token, the server host and user, and a key made only for the pipeline.
- [ ] Choose how to tighten SSH: key-only plus fail2ban, Systems Manager, or opening the port for the pipeline's address only during a deploy.
- [ ] Optional job for production migrations, with a manual approval.
- [ ] When these exist, change the README's "No automated tests or CI/CD yet" line.

## 17. Docs and demo

- [ ] **README placeholders** (they are inside HTML comments): the hero GIF, four screenshots (`docs/images/`), the demo video link, the demo accounts block, and the portfolio and resume links.
- [ ] Create the two demo accounts (`+demo1`, `+demo2`) with a password used nowhere else, or delete that block. Reset the demo data now and then.
- [ ] Take the screenshots and the two-window GIF with sample data (one workspace, 3 users, about 15 issues, 2 sprints). Record a 2 to 3 minute video **before the AWS credits end**.
- [ ] Run "Run it locally" from the README on a clean clone, and fix what breaks (does `packages/db` have a `.env.example`, is the `build` step needed, which Firebase sign-in methods are on).
- [ ] Add a data-model diagram to `docs/ARCHITECTURE.md` (generated from `schema.prisma`).
- [ ] Check the root `AGENTS.md` claims against the code: the route examples in "API at a glance" and the "who uses whom" table.
- [ ] Be able to explain each of the 8 engineering decisions in the README in your own words.
- [ ] Keep the "How it was built" line in the README only if you can explain the main parts of the code.

## 18. Operations and AWS

- [ ] (verify) The temporary instance `temp-delete-me` is terminated, EC2 Volumes shows only one volume, and the Elastic IP is attached to `devflow`.
- [ ] Check Billing, Credits weekly, and note the balance. Stop the instance when you are not demoing.
- [ ] (optional) The remaining credit activities (EC2 if not credited, Lambda, Bedrock, RDS). Delete whatever they create, and never terminate `devflow`.
- [ ] `sudo apt-get update && sudo apt-get upgrade -y` on the server, now and then.
- [ ] `docker image prune -f` after each release (never `prune -a`).
- [ ] (optional) A Cost budget that excludes credits, to see the real spend rate (Billing, Budgets, Charge type).
- [ ] The server is a single machine with no failover. This is accepted.

---

## Suggested order

1. Section 0 (test monitoring step 1, verify the server, the reboot test, secret scanning)
2. Section 15 (monitoring, steps 2 to 8)
3. Section 12 (cleanup and checks), and the section 4 issue-delete files fix
4. Section 16 (tests, then CI/CD)
5. Section 17 (screenshots, GIF, video, demo accounts, then publish the README)
6. Sections 1 to 3, then 7 and 9 (security, roles, cascade, API consistency, database)
7. Section 6 (validators rewrite), then 5 (dates, with a backup)
8. Sections 10 and 11 (visual pass and structure)

## 15-minute test path

1. Sign in, open a workspace and a project.
2. Create a sprint, create 3 issues (one with a file and a label), and start the sprint.
3. Board: drag a card, switch to List, change a status.
4. Open an issue in the slide-over, change the priority, add a sub-issue.
5. Open the full page, post a comment with an `@mention`, edit it, delete it.
6. Upload a file, download it, delete it.
7. Backlog: drag an issue into a planned sprint.
8. My Issues: both views.
9. Complete the sprint.
10. Sign in as a developer in the same project and check that only their own issues can be edited.
11. **Live:** with two windows and two users, check the bell after a mention, a card move with the pointer and drag marker, avatars and a typing hint on the same issue, and a file upload.
12. **Production:** repeat the live check on the real site (the websocket should show a `wss://` connection with `CONNECTED`).

## Known limitations (paste into the README)

These are accepted on purpose for the first version. A short list like this shows that you knew about them.

- Everyone in a project can see every issue. Only the assigned person, leads and admins can edit it.
- File types are the ones the browser declares. There is no virus scan or content check.
- Deleting a single issue does not delete its files from storage. Files that were uploaded but never saved stay in storage too.
- There is no limit on how many files an issue can have.
- Comments load all at once, with no paging, and workspace admins who are not in a project can't be mentioned.
- A comment saved without changes still counts as edited.
- Due dates and sprint dates are stored as timestamps, so a user in another timezone can see a day's difference (planned fix: date-only columns).
- Email is sent only for invites, password resets and issue assignments. Everything else is an in-app notification.
- Pointers, presence, typing hints and drag markers live in the memory of one websocket server, so they work for a single instance.
- A member removed from a project keeps receiving its live events until their connection drops.
- There are no automated tests, CI/CD or monitoring yet (planned).
- One server with no failover, funded by free credits. If the live demo is down, watch the video.