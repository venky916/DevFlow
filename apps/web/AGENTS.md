# DevFlow: Conventions (Web + API contract)

Stack: Next.js (App Router), Tailwind v4, TanStack Query, Zustand, React Hook Form + Zod, Firebase Auth.
API: Express, Prisma (Postgres), Redis cache, BullMQ queues, Backblaze/R2 storage.
Monorepo: `apps/web`, `apps/api`, `packages/ui`, `packages/validators`, `packages/types`, `packages/storage`, `packages/queues`, `packages/db`.

Reference modules (copy their shape): **auth**, **workspace**, **project** (settings, overview, analytics), **inbox**, **sidebar/header**.

---

# Part 1: Frontend

## 1. Where code lives

| Folder                  | What goes here                                                                                                                                                                                                             | Must NOT contain                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `app/`                  | `page.tsx`, layouts, metadata only                                                                                                                                                                                         | logic, hooks, API calls                                              |
| `components/{domain}/`  | JSX and styling for one feature (`auth/`, `workspace/`, `projects/`, `inbox/`, `layout/`)                                                                                                                                  | `toast`, `router`, API calls, `try/catch`, `useQuery`, `useMutation` |
| `components/shared/`    | Pieces used by 2+ features: `PageContainer`, `PageHeading`, `EmptyState`, `StatCard`, `BarRow`, `BarTrack`, `PanelTitle`, `SectionHeading`, `RoleBadge`, `WorkspaceLogo`, `ProjectDot`, `Logo`, `PageLoading`, `PageError` | feature-specific code                                                |
| `hooks/use-{domain}.ts` | ALL hooks for that domain in one file                                                                                                                                                                                      | JSX                                                                  |
| `lib/`                  | Plain functions: Firebase, axios, `format-date`, `slugify`, `upload`, `permissions`, `roles`, `redirect`, `auth-errors`                                                                                                    | React, hooks                                                         |
| `stores/`               | Zustand stores (`auth.store`, `ui.store`)                                                                                                                                                                                  |                                                                      |
| `constants/`            | Static values, e.g. `routes.ts`                                                                                                                                                                                            |                                                                      |
| `packages/ui`           | Generic UI (Button, Input, Select, Spinner, Dropdown). No DevFlow logic                                                                                                                                                    | routes, auth, hooks                                                  |
| `packages/validators`   | Zod schemas and `*Input` types, shared with the API                                                                                                                                                                        | React                                                                |
| `packages/types`        | Entity and API types shared with the API                                                                                                                                                                                   | form types                                                           |

Dependencies only point down: `app` → `components` → `hooks` → `lib` → `constants` / `packages`.
A `lib/` file never imports a hook or a component.

**Types live in one place.** If the API sends it, it goes in `packages/types`. Never declare an API type inside a hook file. Never redefine a type that already exists (`WorkspaceRole`, `ProjectRole` and `IProjectAccess` are defined once, in `@devflow/types`). Props and local UI state stay next to their component.

## 2. The component rule

Components render. They call one hook and show the result.
They never call `toast`, `router`, `api`, Firebase, or use `try/catch`.
Side effects (API call, toast, redirect, error text) live in the hook.

A component may pass an `onSuccess` callback to a mutation only for purely local UI work (closing a modal, resetting a form, leaving an edit mode). It never shows toasts from there.

### When to split a component into its own file

Split only if the piece has **its own state** or is **used in several places**. Do not split just because a file is long, and do not make a file for a plain list of links.

- Sidebar: `SidebarItem` (used about 12 times), `WorkspaceSwitcher`, `ProjectSwitcher`, `UserMenu` (own open state) are separate files. The workspace nav and project nav stay inside `sidebar-content.tsx`.
- A hook that is only one `useEffect` stays inside the component that uses it.

## 3. Hooks

- One file per domain: `use-auth.ts`, `use-workspaces.ts`, `use-projects.ts`, `use-user.ts`, `use-upload.ts`, `use-notifications.ts`, `use-search.ts`, later `use-issues.ts`.
- `use-workspaces.ts`: workspace list, by-slug, guards, create/update/delete, logo, members, invites, analytics.
- `use-projects.ts`: project list, by-slug, guards, detail, activities (paged), analytics, create/update/delete, members, available members, labels. It is over 300 lines; when issues land, split the members and labels half into `use-project-settings.ts`.
- Screen-level hooks that only compose other hooks are allowed: `use-sidebar.ts`, `use-page-header.ts`, `use-command-palette.ts`. They return everything one component needs.
- Names: `use{Noun}` fetches, `use{Verb}{Noun}` changes data, `use{Noun}Access` / `useRequire{Noun}Access` checks permissions. Hooks that combine steps keep the same pattern (`useUploadWorkspaceLogo`).
- Fetch hooks use `useQuery` (or `useInfiniteQuery` for cursor lists). Changes use `useMutation`.
- No `useQuery` or `useMutation` directly inside a component.
- Every domain exports a query key factory (`workspaceKeys`, `projectKeys`, `userKeys`, `notificationKeys`, `searchKeys`). No inline `['workspaces']` strings anywhere else.
- Every mutation owns its error toast and, for user-visible changes, its success toast. Use a small local `showError(err, fallback)` helper that wraps `getAuthErrorMessage`.
  - Single-row quiet actions (mark one notification read, delete one notification) skip the success toast. Bulk actions confirm.
- Navigation after a mutation (`router.push`) lives in the mutation hook, using `ROUTES`.
- Guards are hooks: `useWorkspaceGuard(slug)` and `useProjectGuard(ws, project)` return `'loading' | 'error' | 'ready'` and do the redirect. `useRequireWorkspaceRole(slug, action)` and `useRequireProjectAccess(ws, project, action)` replace any copied `useEffect` redirect on restricted pages.
- Lists that can wait take an `{ enabled }` option (`useWorkspaces({ enabled })`, `useProjects(id, { enabled })`) so a switcher loads its list only when opened.
- Paged lists return a flat shape: `{ items, isLoading, isError, refetch, hasMore, loadMore, isLoadingMore }` (see `useProjectActivities`, `useNotifications`).

### Naming for hooks that upload

Name by intent, not by storage vendor. "Presigned", "B2", "R2" and "S3" appear only inside `packages/storage`.

| Step                                                       | Name                                                            |
| ---------------------------------------------------------- | --------------------------------------------------------------- |
| Ask the API for a one-time upload link                     | `useRequestUploadUrl`                                           |
| Send the file to storage (plain function, `lib/upload.ts`) | `uploadFileToStorage`                                           |
| Request link + send file, for images                       | `useUploadImage(folder)` returns `{ uploadImage, isUploading }` |
| Save the URL on the workspace / user                       | `useUpdateWorkspaceLogo`, `useUpdateAvatar`                     |
| Upload + save together                                     | `useUploadWorkspaceLogo`, `useUploadAvatar`                     |

`uploadImage` returns `string | null`. It shows its own error toast and returns `null` on failure, so callers write `if (url) ...` and never `try/catch`.

## 4. Data fetching rules (this is what keeps API calls low)

1. **One call per resource, shared by cache.** The workspace guard loads `GET /workspaces/by-slug/:slug` once; the project guard loads `GET /projects/by-slug/:ws/:project` once. Every page under them reads the same cached query (`useWorkspaceBySlug`, `useProjectBySlug`). Never load a list and `.find()` by slug.
2. **Lean lists.** `GET /workspaces/summary` and `GET /workspaces/:id/projects/summary` return only what a list needs (id, name, slug, logo/color, counts, the caller's role or access). No member lists. They are used by list pages and switchers only.
3. **Lists in dropdowns load on open.** The workspace and project switchers pass `enabled: open`.
4. **Never fire a query with an empty id.** Use `enabled: !!id`, or pass `''` only to a hook that sets `enabled`.
5. **Only load what the page needs.** `usePermissions` reads the cached workspace and project; it does not load a list.
6. **Restricted pages fetch after the role check.** Analytics pass an empty id until `isAllowed` is true, so a non-admin never sends the request.
7. **404 is not an error screen.** by-slug hooks do not retry a 404. Guards treat 404 as "no access" (redirect) and any other error as "show retry".
8. **Invalidate by prefix.** `workspaceKeys.all` and `projectKeys.all` are prefixes of every key in their domain, so one invalidate refreshes list, by-slug, members, invites, analytics. Narrower invalidation is used only when it is clearly enough (role change refreshes `members` only; label changes refresh `labels` only).
9. **After a delete, mark stale but do not refetch** (`refetchType: 'none'`), because the deleted resource now returns 404.
10. **Profile and avatar updates merge into the cache** (`setQueryData`) and the auth store. They do not invalidate `['me']`, because `['me', 'counts']` shares that prefix.
11. **One source for each number.** The unread notification count lives in `userKeys.counts` only. Every notification mutation invalidates both `notificationKeys.all` and `userKeys.counts`, so the sidebar badge and the inbox never disagree.

## 5. Types and API calls

- No `any`. Use `unknown` in `catch (err)` and narrow it.
- Every axios call gets a type: `api.get<IApiResponse<IWorkspaceSummary>>(...)`. No `as` casts on `res.data.data`. Lists use `IPaginatedData<T>` or `ICursorPaginatedData<T>`.
- The backend envelope is `{ success, message, data }`, so read `res.data.data`. A `204` has no body.
- A type describes what the server actually sends. If an endpoint always sends a field, the type says so (no `?` on `_count`, `user`, `currentUserAccess`). If two endpoints send different shapes, use two types.
- Workspace types: `IWorkspace`, `IWorkspaceSummary` (list and by-slug), `IWorkspaceMember`, `IWorkspaceMemberWithUser`, `IWorkspaceInvite`, `IWorkspaceAnalytics`.
- Project types: `IProject`, `IProjectSummary` (summary list and by-slug, includes `_count` and `currentUserAccess`), `IProjectDetail` (by id, includes members and sprints), `IProjectMember`, `IProjectMemberWithUser`, `IProjectMemberListItem` (adds `isWorkspaceAdmin`), `IAvailableProjectMember`, `IProjectLabel`, `IProjectAnalytics`, `IActivityLog`.
- Notification and search types: `INotification`, `NotificationType` (a string union, not a TypeScript `enum`), `ISearchResult`, `ISidebarCounts`.
- Roles: `WorkspaceRole = 'ADMIN' | 'MEMBER'`, `ProjectRole = 'LEAD' | 'DEVELOPER' | 'VIEWER'`. Never mix them.
- String unions and `as const` objects instead of `enum`, so values compare cleanly with string literals.

### Dates

- JSON has no date type. Every date field in `packages/types` is `string` (ISO 8601, UTC). Never `Date`.
- Do not convert in controllers, hooks, or the cache. Convert at display time through `lib/format-date.ts` (`formatTimeAgo`, later `formatDay` for date-only fields).
- Timestamps (`createdAt`, `joinedAt`, `expiresAt`) are instants. Show them in the viewer's timezone.
- Date-only values (`dueDate`, sprint `startDate`/`endDate`) are calendar days. Send and store them as `YYYY-MM-DD` and never shift them by timezone. (Not applied yet, see Part 4.)
- Request bodies: the server uses `z.coerce.date()`. Forms use the input type (string).
- `Json` columns (`ActivityLog.meta`, `Comment.content`) are read through a Zod schema, with `string` dates inside.
- Prisma `Decimal` arrives as `string`. Never send `BigInt` over JSON.

## 6. Naming

- Files: kebab-case (`sign-in-form.tsx`, `use-workspaces.ts`, `format-date.ts`).
- Components and types: PascalCase. Hooks and functions: camelCase.
- Interfaces: `I` prefix (`IUser`, `IApiResponse<T>`). Type aliases and unions have no prefix (`WorkspaceRole`, `NotificationType`).
- Zod types: `*Input` (`SignInInput`, `AddProjectMemberInput`), derived with `z.infer`. Never name a type the same as a component.
- Schemas: `*Schema`, in `packages/validators/{domain}.validators.ts`.
- Routes and controllers are plural (`/workspaces`, `workspace.controller.ts`). Services, repositories, types and schemas describe one domain concept (singular).
- Dynamic route segments are named after the thing: `[workspaceSlug]`, `[projectSlug]`, never `[id]`.
- Import `cn` from `@devflow/ui/lib/cn`.

## 7. Errors, redirects, routes, links

- Error text for users goes through `getAuthErrorMessage(err, fallback)`. Never show `err.message` directly. If it returns `null`, show nothing.
- Any `?redirect=` value, and any URL that came from the server (notification `link`, search result `url`), goes through `getSafeRedirect` before it is followed.
- Routes come from `constants/routes.ts`. No hardcoded paths in links, `router.push`, or `router.replace`. Add a route when you add a page. Routes with params are functions and take **slugs**:
  `workspace`, `workspaceSettings`, `workspaceAnalytics`, `project`, `projectBoard`, `projectBacklog`, `projectSprints`, `projectAnalytics`, `projectSettings`, `issue`, `noAccess(reason, workspaceSlug?)`, plus `inbox`, `myIssues`, `profile`, `workspaces`.
- **Link vs router:**
  - The user clicks and goes to another page → `<Link href={ROUTES...}>` (middle-click, new tab, prefetch, accessibility).
  - Code decides to navigate (after a mutation, in a guard) → `router.push` / `router.replace`, inside a hook.
  - Never put a `<button>` inside a `<Link>`. Make the card itself the `Link` (`ProjectCard` takes `href`, `NotificationRow` is a `Link`).
- Links into an issue page add `?from=board`, `?from=backlog` or `?from=my-issues`, so the header (back arrow, breadcrumb) and the sidebar highlight know where the user came from.

## 8. UI and styling

### Do not change the look during a refactor

A refactor changes structure, not appearance. Keep existing sizes, spacing, weights and fonts. When swapping an arbitrary value for a token, use the exact equivalent and **verify it renders the same** (inspect the computed `font-size` and `line-height`). Visual changes are made only when asked, in a separate step. Tokens have fixed line heights, arbitrary values inherit the parent's, so a swap can shift a row by a pixel or two.

### Tokens

- Colors, radius and fonts come from `@theme` tokens in `theme.css`. No hex colors in components.
- Prefer Tailwind's spacing scale over arbitrary values. Where a size has no token, an arbitrary value is acceptable and is listed for a later cleanup pass (see Part 4).
- Type scale:

| Old                                                 | Use                                          |
| --------------------------------------------------- | -------------------------------------------- |
| `text-[11px]`                                       | `text-2xs` (11px)                            |
| `text-[12px]`                                       | `text-xs` (12px)                             |
| `text-[13px]`                                       | `text-body` (13px)                           |
| `text-[16px]`, `text-[18px]`                        | `text-lg`, `text-xl`                         |
| `text-[24px]`                                       | `text-2xl`                                   |
| `rounded-[4px]` / `rounded-[5px]` / `rounded-[6px]` | `rounded-base` / `rounded-md` / `rounded-md` |
| `h-4 w-4`                                           | `size-4`                                     |
| `max-h-[240px]`, `w-[130px]`                        | `max-h-60`, `w-32`                           |

- Weights: 400 body, 500 labels/buttons/nav, 600 headings and emphasis. Avoid 700+ in app UI.
- Inline `style` is allowed only for runtime data that Tailwind cannot generate: project colors from the database, bar widths, dynamic `size` props. For theme colors in inline style use `var(--color-...)`.
- Only tokens that exist in `theme.css` may be used (`text-danger-text`, not `text-status-danger-text`).

### Page layout (one shell for every page)

- Wrap every page in `<PageContainer size="narrow | medium | default | full">`. It owns the padding and max width. Pages never write their own padding or `max-w-*`.
- Every page title is `<PageHeading title description actions />`.
- Empty states use `<EmptyState />`. Stat tiles use `<StatCard />`. Bar rows use `<BarRow />` and `<BarTrack />`. Section titles inside a card use `<PanelTitle />`. Settings sections use `<SectionHeading />`.
- Loading and error use `<PageLoading />` and `<PageError message onRetry />`. Never a hand-written spinner or "Loading..." text.
- `(app)/layout.tsx` already owns scrolling and the app header. Pages do not add `h-full overflow-hidden` wrappers or nested `<main>`.
- Exception kept on purpose: the inbox keeps its own full-width list with an action bar.

### Components

- Never write a spinner by hand (no `Loader2`). Use `<Button loading={isPending}>` or `<Spinner />`.
- Button sizes: `sm`, `md`, `lg`, `xl`. Don't override height with `className`.
- A plain `<button>` inside a form needs `type="button"`, or it submits the form. `Button`, `ImageUploadButton` and `ColorDot` set it.
- Icon-only buttons need `aria-label`.
- Logo: `<Logo size="sm" />` in the sidebar, `<Logo size="lg" />` on auth. Never size it with ad-hoc classes.
- Workspace logo or letter: `<WorkspaceLogo />`. Project color dot: `<ProjectDot />`.
- Merge class names with `cn()`, not template strings.
- Auth screens: `gap-8` between sections, `gap-4` between fields, `gap-2` inside the header. Use `AuthHeader`, `AuthStatus`, `OAuthButtons`, `AuthDivider`, `AuthFooterLink`.
- Auth inputs need `autoComplete` (`email`, `current-password`, `new-password`, `name`).

## 9. Forms

- React Hook Form + `zodResolver`. No `useState` forms (small inline editors such as the labels tab are the exception).
- Use `isPending` from the mutation for the loading state, not `isSubmitting`.
- Validation rules shared with the API live in `packages/validators`.
- Derived fields (slug from name) are set in the field's change handler with a `lib/` helper (`slugify`), not in a `useEffect`.
- Do not copy server data into state with `useEffect`. Use RHF `values`, or a draft state that stays `null` until the user edits.
- Optional nullable values passed to controlled inputs fall back to a default (`field.value ?? DEFAULT_PROJECT_COLOR`).

## 10. Permissions

- Permission checks go only through `canWorkspace()`, `canProject()`, `canDeleteProject()` and the access hooks. Never inline `role === 'ADMIN'`.
- `lib/permissions.ts` mirrors the backend matrix. `VIEW_MEMBERS` is `['ADMIN']`.
- Frontend checks are for UX only (hide buttons, redirect). The backend middleware is the real protection. Both must agree.
- Workspace role comes from `workspace.currentUserWorkspaceRole`. Project access comes from `project.currentUserAccess`. Neither needs another query.
- The server resolves access (`isWorkspaceAdmin`, `projectRole`). `usePermissions` only reads it. Workspace admins have `projectRole: null` and pass every project check.
- Restricted pages call `useRequireWorkspaceRole` or `useRequireProjectAccess`. They do not take `isAdmin` or `isLead` props: if the page renders, the user is allowed.
- Members lists receive `isWorkspaceAdmin` per member from the API. A workspace admin's access comes from the workspace, so the project members tab shows an Admin badge with no role select and no remove button.
- Creating a workspace has no role check. Any signed-in user can, and becomes `ADMIN`.

---

# Part 2: Backend contract

## 11. API rules

- **Controller shape:** `asyncHandler(async (req, res) => ...)`. No `try/catch` in controllers or services: `asyncHandler` passes errors to the global error middleware.
- **Error middleware** (`error.middleware.ts`) converts known Prisma errors, so no controller handles them: `P2002` (unique constraint) becomes 409, `P2025` (record not found) becomes 404. Zod errors become 422. 4xx are logged as warnings, 5xx as errors. Do not match on error message text.
- **Uniqueness is enforced by the database index**, not by a find-then-insert check (which races). Let `P2002` surface.
- **Status codes:** create returns 201 (`sendCreated`); delete and "nothing to return" actions return 204 (`sendNoContent`, no body); reads and updates return 200 with `{ success, message, data }`. Paged lists use `sendCursorPaginated`.
- **Permissions come from the resource, not the URL.** A middleware that guards an existing project loads the project and reads its real `workspaceId` (`resolveProjectAccess`). It never trusts a `:workspaceId` in the path. `requireWorkspaceRole` is correct only when the URL id is the workspace being acted on. `requireProjectWorkspaceAdmin` is the guard for admin-only project actions (delete project).
- **Hide existence from non-members.** by-slug endpoints return the same 404 for "does not exist" and "you cannot see it", so slugs cannot be probed. Owner-scoped writes use one scoped query (`updateMany`/`deleteMany` with `userId`) and return 404 when nothing changed.
- **Route order:** register specific paths before `/:id` (`/summary`, `/by-slug/...`, `/available-members` style routes first).
- **Lean lists and by-slug:** built from a shared `select`. Role and access are attached flat (`currentUserWorkspaceRole`, `currentUserAccess`) by querying only the caller's own membership row. Heavy "by id" endpoints stay for pages that need members or sprints.
- **Cursor pagination:** use `lib/pagination.ts` (`parseLimit`, `toCursorPage`). Query `take + 1`, order by the sort column plus `id` as a tie-breaker, `cursor` + `skip: 1`. Limits are clamped (1 to 50).
- **Caching:** Redis keys are colon-delimited, lowercase, general to specific, built only through `CacheKeys`. Cache raw data only. Never cache data that must reflect a role change immediately (for example the workspace-admin flag on project members is queried fresh and merged).
- **Search:** filter and `take` in the database. Return `{ items }` with `{ type, id, name, context, url }`. Return early for queries shorter than 2 characters.

## 12. Workspace and project endpoints

| Endpoint                                                                                                               | Purpose                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET /workspaces/summary`                                                                                              | Lean list for the workspaces page and the switcher. Built from the caller's memberships. |
| `GET /workspaces/by-slug/:slug`                                                                                        | One workspace + my role. Used by the guard and every workspace page.                     |
| `GET /workspaces/:id`                                                                                                  | Heavy detail with members. Known gap (Part 4).                                           |
| `GET /workspaces/:id/projects/summary`                                                                                 | Lean project list with `currentUserAccess`.                                              |
| `GET /projects/by-slug/:workspaceSlug/:projectSlug`                                                                    | One project + my access. Used by the project guard and every project page.               |
| `GET /projects/:id`                                                                                                    | Heavy detail: members (with `isWorkspaceAdmin`) and sprints.                             |
| `GET /projects/:id/members`                                                                                            | Members, each with `isWorkspaceAdmin`.                                                   |
| `GET /projects/:id/available-members`                                                                                  | Workspace members not yet in the project. LEAD or workspace admin.                       |
| `GET /projects/:id/activities?cursor&limit`                                                                            | Project activity, newest first, paged.                                                   |
| `DELETE /projects/:id`                                                                                                 | Workspace admin of the project's own workspace only.                                     |
| `PUT /workspaces/:id/members/:uid`, `PUT /projects/:id/members/:uid`                                                   | Role change.                                                                             |
| `GET /notifications?cursor&limit`                                                                                      | Paged, unread first. No `unreadCount` in the response.                                   |
| `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`, `DELETE /notifications` | All return 204.                                                                          |
| `GET /users/me/counts`                                                                                                 | `{ unreadNotifications, myOpenIssues }`. The only source of the badge numbers.           |
| `GET /search?q=`                                                                                                       | Global search, results filtered by what the caller can open.                             |

- **Project slugs are unique per workspace** (`@@unique([workspaceId, slug])`). Workspace slugs are globally unique.
- **Reserved slugs:** `RESERVED_WORKSPACE_SLUGS` and `RESERVED_PROJECT_SLUGS` list top-level routes and static folders. Add a name whenever a static route is added under `app/` or `app/(app)/[workspaceSlug]/`.

## 13. Notification links

Pages are addressed by slug, so every notification and email link is built from slugs.

- `lib/web-links.ts` is the only place that knows the web URL shape (`board`, `issue`, `project`, `invite`) and `absoluteUrl` for emails. Keep it in sync with `constants/routes.ts`.
- `notification.service.ts` looks up the project's slugs and name once per notification (`getProjectContext` / `getIssueContext`, through `findLinkContext` on the repositories), then builds links with `webLinks`. If the project or issue was deleted, the notification is skipped.
- No other code creates notifications with hand-written paths. Any new notification goes through the service.
- The web never trusts a stored link: `NotificationRow` passes it through `getSafeRedirect`.

## 14. File storage

Two kinds of files, two flows. The frontend never talks to the storage vendor for credentials: it asks **our API**, which signs the link after validating the request.

### Public files (avatars, workspace logos)

```
1. FE → API   POST /upload/url          (folder, fileName, mimeType, fileSize)
2. API         validates, signs a one-time PUT link
3. API → FE   { uploadUrl, fileKey, publicUrl }
4. FE → storage PUT the file to uploadUrl
5. FE → API   PATCH /workspaces/:id/logo  or  PATCH /users/me/avatar  (the public URL)
6. API → DB   saves the URL, queues deletion of the replaced file, returns the record
```

Reading needs no signing: the record already holds the URL.

### Private files (issue attachments)

```
1-4. Same: get an upload link from the API, PUT the file
5.   FE → API   save the attachment (fileKey, fileName, size, mimeType)
6.   API → DB   saves the fileKey only, returns the record (no signed URL)
```

Reading: `GET /issues/:id/attachments/:attachmentId/download-url` checks project access, signs a short-lived GET link from the stored `fileKey`, and returns it.

### Rules

1. Never store a presigned URL in the database. They expire. Private files store only `fileKey`.
2. Sign on read, with a short expiry (about 5 to 15 minutes), per file and on click, after the permission check.
3. Validate what the client sends back: public URLs through `isPublicUrlIn(url, folder)`, private keys must start with the expected folder.
4. Delete replaced and orphaned files through the `fileCleanupQueue` (`delete-file` jobs). On workspace or project delete, collect the file keys before the delete.
5. Name by intent: `requestUploadUrl` (controller), `requestUploadUrlSchema`, `createUploadTarget` (storage), `IUploadTarget`, `POST /upload/url`.
6. Optional later: store only the `fileKey` for public files too and build the public URL on response, so a CDN or bucket change is one function.

---

# Part 3: Working rules

## 15. Before you start a new screen

1. Find the nearest finished example (`use-projects.ts`, `components/projects/settings/`, `components/inbox/`) and copy its shape.
2. Settle the backend first: lean list, by-slug, route order, role checks, response status codes.
3. Types in `packages/types` (string dates), then `ROUTES`, then the hook, then components.
4. Build the page from `PageContainer`, `PageHeading`, `EmptyState`, `PageLoading`, `PageError`.
5. Keep the existing look (section 8). Verify any token swap renders the same.
6. Open the Network tab: one call per resource, no empty-id calls, no list-then-find, no list loaded just for a dropdown.
7. Run `typecheck` and `lint`, and add no new `any`.

## 16. Before you change something large

Say what is required and what is optional. Split a change into: required for correctness, required by these conventions, requested by the team, and extras. Do the first three, and list extras separately.

---

# Part 4: Migration status

## Done

- **Auth**: sign in/up, OAuth, reset, invites.
- **Workspaces**: list, create modal, guard, home, settings (general, members, invites), analytics, logo upload, by-slug and summary endpoints.
- **Profile and avatar**: `use-user.ts`, upload hooks, cache merge.
- **Projects**: backend (by-slug, summary, available-members, paged activities, `isWorkspaceAdmin` on members, delete guard, per-workspace slugs, reserved slugs, error middleware), types, `use-projects.ts`, guard, create modal, overview, analytics, settings (general with delete, members, add member, labels).
- **Notifications and search backend**: paged notifications, owner-scoped queries, search early-return fix and database-side filtering, `lib/pagination.ts`, slug-based links through `webLinks`.
- **Inbox**, **command palette**, **sidebar** (switchers load on open, project colors, workspace logo, user menu with avatar, `Logo` brand), **page header** (cached names, back link, search button).

## Next (in this order)

1. **Issues core**: issue types (`IssueStatus`, `IssueType`, `IssuePriority`), issue backend review, `use-issues.ts`, issue form (labels, mentions).
2. **Sprints and backlog**: start/complete sprint, backlog. Decide the date-only format for sprint dates here.
3. **Board**: plan first (drag and drop, `useCanMoveIssue`, move rules), then code.
4. **Issue slideover and issue detail page**: comments, activity feed, attachments (private file flow), links with `?from=`.
5. **My issues** (`/my-issues`, `GET /users/my-issues/board` and `/list`).
6. **Websockets**: only after the HTTP work is complete. Handlers update the existing query keys (`notificationKeys`, `userKeys.counts`, project and issue keys) with `setQueryData` or `invalidateQueries`. No refactor needed.

## Cleanup (safe any time)

- Delete old hook files: `use-workspace-settings.ts`, `use-project-settings.ts`, `use-logo-upload.ts`, `use-image-upload.ts`, `use-avatar-upload.ts`, `use-analytics.ts`, `use-global-search.ts`. Run `grep` to confirm nothing imports them.
- Replace `useMe` in `use-auth.ts` with `useMyProfile`. Remove `IMyProfile`.
- Delete the old list endpoints once nothing calls them: `getMyWorkspaces` (`GET /workspaces`) and `getProjects` (`GET /workspaces/:id/projects`). Delete `getAllProjectActivities` if it stays unused.
- `AuthGuard`: replace the hardcoded `/sign-in` with `ROUTES.signIn` and the hand-written spinner with `PageLoading`.
- Remove `console.log('[axios] token:', token)` from `lib/axios.ts` (it prints the full Firebase token).
- Add `autoComplete` to the auth inputs.
- Run `typecheck` and `lint` across the repo and clear the errors.
- Apply the file-storage rename on the attachment hooks and routes when attachments are done (`useRequestUploadUrl`, `uploadFileToStorage`).

## Parked on purpose

- **Comment attachments** are not collected when a project or workspace is deleted (`deleteProject`, `deleteWorkspace` only collect issue attachments). Fix with the file deletion queue work.
- **`buildProjectAccess` helper** to remove the repeated access ternary in three controllers.
- **Date-only handling** for `dueDate` and sprint dates (`@db.Date`, `YYYY-MM-DD`, `formatDay`). Existing sprint dates are stored inconsistently (some at local midnight, some at UTC midnight).
- **Backfill of old notification links**: skipped, no old notifications exist.

## Known gaps

- `GET /workspaces/:id` returns the full member list to every member, which bypasses the admin-only members rule. Close it or remove the endpoint once nothing uses it.
- `removeWorkspaceLogo` exists in the controller but has no route and no hook.
- `IAttachment.createdAt` is typed `Date`; it should be `string`.
- The assignment email shows `assignedBy: triggeredBy`, which is a user id, not a name. Pass the assigner's name from the caller.
- `POST /projects` and `GET /projects/summary` without a workspace id reach the middleware with an undefined id (500). The web never calls them; split the two mount points if this matters.
- Shared `DropdownMenu`: clicking the trigger while the menu is open can close and reopen it, because the outside-click handler runs first.
- `Button` and `Select` use `text-sm` (14px) while body text is `text-body` (13px). Decide whether to move them to 13px.
- `ProjectCard` and the issue and board components still use arbitrary values.
- `workspace.controller.ts` `createWorkspace` still does a find-then-insert slug check. The unique index already protects it, so the pre-check can go.
- Settings and sidebar leftovers with no token: `text-[10px]`, `text-[9px]`, the 200px sidebar width, the 38px header and brand bar, `min-[1025px]` breakpoint.

## Open checks

- **Verify that `text-body` (13px) and `text-2xs` (11px) render at those sizes.** The inbox rows and sidebar looked larger after the token swap. Inspect the computed `font-size`. If they render at 16px, the tokens are not being generated and every page that uses them is affected. If the sizes are right but rows look different, the cause is the fixed line height. The sidebar sizes may need to go back to the original arbitrary values.
- Verify the font: `--font-sans: "Geist Sans"` may not match the family name that `next/font` generates. Check Rendered Fonts in DevTools.
- Verify `cn` in `packages/ui` uses `twMerge`. Several pages pass `className="mx-0"` to `PageContainer`, which only overrides `mx-auto` if classes are merged.
- Confirm the notification click test: assigned, comment, mention, sprint, project-added and invite links all open the right page.
- Confirm the project delete and project role change work end to end (both were broken before the router and middleware fixes).
