# web

The Next.js app (App Router): everything the user sees. Package name: `web`. It talks to `api` over HTTP and to `ws` over a websocket.

Stack: Next.js, React 19, Tailwind v4, TanStack Query, TanStack Table, React Hook Form with Zod, Zustand (auth and UI state), nuqs (filters in the URL), dnd-kit, Tiptap, Firebase Auth, and the browser's own `WebSocket`.

**Must not:** hold business rules, or be the only place a permission is checked. The server decides, and the web only hides buttons.

## Commands

```
pnpm --filter web run dev
pnpm --filter web run build
pnpm --filter web run lint
pnpm --filter web run check-types      (runs next typegen first)
pnpm --filter web run format
```

## Env variables it reads

`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_APP_URL`, six `NEXT_PUBLIC_FIREBASE_*`, and `NEXT_PUBLIC_SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_ENVIRONMENT` (empty in development, so nothing is sent; set only for Production in Vercel). All are public by design and are baked into the build, so a change needs a redeploy. Never put a secret under a `NEXT_PUBLIC_` name.

---

## 1. Where code lives

| Folder | What goes here | Must NOT contain |
| --- | --- | --- |
| `app/` | `page.tsx`, layouts, metadata | logic, hooks, API calls |
| `components/{domain}/` | JSX and styling for one feature: `auth`, `workspace`, `projects`, `inbox`, `layout`, `sprints`, `backlog`, `board`, `issue` (the full page is in `issue/issue-detail-page/`, and the My Issues pieces are here too), `profile` | `toast`, `router`, API calls, `try/catch`, `useQuery`, `useMutation`, the socket |
| `components/shared/` | Pieces used by 2 or more features: `PageContainer`, `PageHeading`, `EmptyState`, `PageLoading`, `PageError`, `ListView`, `FilterBar`, `ViewSwitch`, `SubIssueList`, `IssueActionsMenu` | feature-specific code |
| `components/providers/` | `SocketProvider`, the only component that connects the socket | |
| `hooks/` | One file per domain (`use-issues`, `use-comments`, `use-attachments`, `use-sprints`, `use-board`, `use-backlog`, `use-workspaces`, `use-projects`, ...) and small helpers (`use-issue-access`, `use-issue-filters`) | JSX |
| `hooks/pages/` | One hook per page that combines other hooks: `use-board-page`, `use-backlog-page`, `use-my-issues-page`, `use-issue-detail-page`, `use-issue-form`, ... | JSX |
| `hooks/events/` | Everything that listens to or sends websocket messages: `use-project-events`, `use-issue-events`, `use-issue-presence`, `use-presence-action`, `use-board-cursors`, `use-board-drags` | JSX that is not a tiny overlay |
| `lib/` | Plain functions and classes: Firebase, axios, `socket-client`, `board-utils`, `backlog-utils`, `issue-rules`, `issue-filters`, `format-date`, `permissions`, `redirect`, `show-error`, `user-color`, `presence-text` | React, hooks |
| `stores/` | Zustand stores (`auth.store`, `ui.store`) | server data (that lives in React Query) |
| `constants/` | Static values, such as `routes.ts` | |
| `packages/ui` | Generic UI. No DevFlow logic | routes, auth, hooks |
| `packages/validators`, `packages/types` | Schemas and types shared with the API | React |

Dependencies point down: `app` to `components` to `hooks` to `lib` to `constants` and `packages`. A `lib/` file never imports a hook or a component.

**Types live in one place.** If the API sends it, it goes in `packages/types`. Never declare an API type inside a hook file, and never redefine one that exists. Props and local UI state stay next to their component.

## 2. The component rule

Components render. They call one hook and show the result. They never call `toast`, `router`, `api`, Firebase or the socket, and never use `try/catch`. Side effects (the API call, the toast, the redirect, the error text) live in the hook.

A component may pass an `onSuccess` callback to a mutation only for purely local UI work: closing a modal, resetting a form, leaving an edit mode.

**Split a component into its own file** only if the piece has its own state or is used in several places. Do not split just because a file is long.

## 3. Hooks

- Names: `use{Noun}` fetches, `use{Verb}{Noun}` changes data, `use{Noun}Access` checks permissions.
- Fetching uses `useQuery` (or `useInfiniteQuery` for cursor lists), changing uses `useMutation`, and never inside a component.
- Every domain exports a **key factory** (`workspaceKeys`, `projectKeys`, `issueKeys`, `sprintKeys`, `commentKeys`, `attachmentKeys`, `userKeys`, `notificationKeys`). No inline `['issues']` strings elsewhere. A wrong key fails silently, so keep them in one place.
- Every mutation owns its error toast through `showError(err, fallback)` (`lib/show-error.ts`). Success toasts only when the screen does not already prove it worked: create, delete and start or complete a sprint get one, and a drag, a field change or a comment does not.
- Navigation after a mutation (`router.push`) lives in the hook, using `ROUTES`.
- Guards are hooks (`useWorkspaceGuard`, `useProjectGuard`) and return `'loading' | 'error' | 'ready'`. Restricted pages use `useRequireWorkspaceRole` or `useRequireProjectAccess`.
- Lists that can wait take `{ enabled }`, so a switcher loads its list only when it is opened.
- A page hook (`hooks/pages/`) only composes other hooks. It adds no new request of its own.

### Uploads

Name by intent, never by storage vendor. The flow: `useRequestUploadUrl` asks the API for a signed link (`POST /upload/presigned-url`), `uploadFileToStorage` (`lib/upload.ts`) sends the file straight to storage, then a hook saves the result (`useUploadWorkspaceLogo`, `useUploadAvatar`, or the attachment upload in `use-attachments`). Private files store only the key, and a signed link is made when the file is read. `uploadImage` returns `string | null` and shows its own error, so callers write `if (url)` and never `try/catch`.

## 4. Data fetching rules

1. **One call per resource, shared by the cache.** The guards load by-slug once, and every page under them reads the same cached query. Never load a list and `.find()` by slug.
2. **Lean lists.** `summary` endpoints return only what a list needs.
3. **Lists in dropdowns load on open.**
4. **Never fire a query with an empty id.** Use `enabled: !!id`.
5. **Restricted pages fetch after the role check.**
6. **404 is not an error screen.** By-slug hooks do not retry a 404, and a guard treats it as "no access".
7. **Invalidate by prefix.** `workspaceKeys.all`, `projectKeys.all` and `issueKeys.all` are prefixes of everything in their domain.
8. **One refresh rule for issues.** Any issue change calls `refreshIssueViews(qc)`, which invalidates everything under `issueKeys.all`: the board, list, backlog, My Issues and an open issue panel. Only queries on screen refetch.
9. **Comments and attachments have their own keys, outside `issueKeys`**, so saving a field never reloads them.
10. **After a delete,** remove or mark stale without refetching (`removeQueries` for one issue, `refetchType: 'none'` for lists), because the deleted item now returns 404.
11. **Optimistic updates keep a snapshot.** The board move and the backlog move write the guess into every cached board in `onMutate`, restore the snapshot in `onError`, and refresh everything in `onSettled`.
12. **One source for each number.** The unread count lives in `userKeys.counts`. Every notification change invalidates it together with `notificationKeys.all`.
13. **When an event and a response can both add the same item, skip duplicates by id.** A new comment arrives twice: from the HTTP answer and from the websocket.

## 5. Types and API calls

- No `any`. Use `unknown` in `catch` and narrow it. A few warnings remain and are on the clean-up list.
- Every axios call is typed: `api.get<IApiResponse<IIssueDetail>>(...)`. No `as` casts on `res.data.data`. The envelope is `{ success, message, data }`. A `204` has no body.
- A type describes what the server really sends. If an endpoint always sends a field, the type says so. If two endpoints send different shapes, use two types: `IIssueCard` for the board, list and backlog, `IIssueDetail` for one issue, `IMyIssue` for My Issues.
- Roles: `WorkspaceRole = 'ADMIN' | 'MEMBER'`, `ProjectRole = 'LEAD' | 'DEVELOPER' | 'VIEWER'`. Never mix them.
- String unions and `as const` objects instead of `enum`.

### Dates

- Every date field in the API and in `packages/types` is an ISO `string`. Never `Date`.
- Convert only at display time, through `lib/format-date.ts`.
- Timestamps are instants and show in the viewer's timezone. Date-only values (`dueDate`, sprint dates) are calendar days. They are still stored as timestamps, so a user in another timezone can see a day's difference. A move to date-only columns is planned.

## 6. Naming

- Files: kebab-case. Components and types: PascalCase. Hooks and functions: camelCase.
- Interfaces start with `I` (`IUser`). Unions and aliases have no prefix. Zod types are `*Input`, schemas are `*Schema`.
- Dynamic route segments are named after the thing: `[workspaceSlug]`, `[projectSlug]`, `[issueId]`. Never `[id]`.
- Import `cn` from `@devflow/ui/lib/cn`.

## 7. Errors, redirects, routes, links

- Error text for users goes through `getAuthErrorMessage(err, fallback)`. Never show `err.message`.
- Errors are reported to Sentry from `app/error.tsx` and `app/global-error.tsx` (a page failed to render) and by the browser SDK started in `instrumentation-client.ts`. The shared privacy rules (no user, no query strings, no breadcrumbs, a limit of 20 events a minute) are in `lib/sentry-shared.ts`. Never add a user's data to an event.
- Any `?redirect=` value and any URL that came from the server goes through `getSafeRedirect` before it is followed.
- Routes come from `constants/routes.ts`. No hard-coded paths. Add a route when you add a page. Routes with parameters take **slugs**.
- **Link vs router:** the user clicks and goes elsewhere, so use `<Link>`. Code decides, such as after a mutation or in a guard, so use `router.push` inside a hook. Never put a `<button>` inside a `<Link>`.
- Links into an issue page add `?from=board`, `?from=backlog` or `?from=my-issues`, so the back link knows where to return.
- The board's view, filters and the open issue live in the URL (`nuqs`: `?view=`, `?issue=`), so a link restores the screen.

## 8. Websockets

One connection per tab, held by the `socketClient` class in `lib/socket-client.ts` (outside React). `SocketProvider` in the signed-in layout connects it after sign-in and closes it on sign-out. A page joins a room through a hook and leaves it on cleanup:

```ts
useEffect(() => socketClient.joinRoom('project', projectId), [projectId]);
```

- A message is a **hint**. The data comes from the API. A lost message is repaired by a refetch, and after a reconnect the hooks refresh once.
- Every listener hears **every** message on the connection. Match on the type and on the room id.
- Saved changes arrive as events from the API. Notifications refresh `notificationKeys.all` and `userKeys.counts`. Issue and sprint events refresh the issue views, batched about 300 ms. A board move also updates the cached boards directly (`moveIssueInBoard`). Comments update the cache directly. Files and activity refresh their own section.
- Temporary events (presence hints, pointers, drag markers) are never cached or saved. Presence state lives in the hook that shows it, and it expires by itself.
- Throttle what you send: pointer moves about every 100 ms, presence hints once every 2 seconds. Never send a user id. The server uses the token.
- Hide your own entries (your avatar, your pointer).
- Components never touch the socket. Hooks in `hooks/events/` do.
- Never log the token. It also travels in the websocket URL.

## 9. UI and styling

### Do not change the look during a refactor

A refactor changes structure, not appearance. Keep sizes, spacing, weights and fonts. When you swap an arbitrary value for a token, use the exact equivalent and check the computed `font-size` and `line-height`. Visual changes are made only when asked, in a separate step.

### Tokens

- Colors, radius and fonts come from `@theme` tokens in `theme.css`. No hex colours in components. Only tokens that exist may be used.
- Type scale: `text-2xs` (11px), `text-xs` (12px), `text-body` (13px), `text-lg`, `text-xl`, `text-2xl`. Radius: `rounded-base`, `rounded-md`. Weights: 400 body, 500 labels, buttons and nav, 600 headings.
- Inline `style` only for runtime data Tailwind cannot generate: colours from the database, bar widths, a person's colour (`lib/user-color.ts`).

### Page layout

- Every page is wrapped in `<PageContainer size="narrow | medium | default | full">`, which owns the padding and the maximum width. The title is `<PageHeading>`.
- Empty, loading and error states are `<EmptyState>`, `<PageLoading>` and `<PageError message onRetry />`. Never a hand-written spinner or "Loading..." text.
- `(app)/layout.tsx` owns the scrolling, the header and the socket. Pages do not add their own `h-full overflow-hidden` wrapper.

### Components

- Never write a spinner by hand. Use `<Button loading>` or `<Spinner />`.
- A plain `<button>` needs `type="button"`, or it submits a surrounding form.
- Icon-only buttons need `aria-label`.
- Merge class names with `cn()`, not template strings.
- Auth inputs need `autoComplete`.
- Other people are shown with `Avatar` and `AvatarGroup` (from `packages/ui`).

## 10. Forms

- React Hook Form with `zodResolver`. No `useState` forms. Small inline editors are the exception.
- Use `isPending` from the mutation for the loading state.
- Validation rules shared with the API live in `packages/validators`.
- Derived fields are set in the field's change handler, not in a `useEffect`.
- Do not copy server data into state with `useEffect`. Use RHF `values`, or a draft that stays `null` until the user edits.
- On the issue page, the fields save on blur, and only what really changed is sent.

## 11. Permissions

- Checks go through `canWorkspace()`, `canProject()`, `canDeleteProject()`, `useIssueAccess` and `lib/issue-rules.ts`. Never inline `role === 'ADMIN'`.
- The web only hides and disables. The server is the real protection, and both must agree.
- Workspace role comes from `workspace.currentUserWorkspaceRole`, project access from `project.currentUserAccess`. A workspace admin has no project role and passes every project check.
- **Issues:** everyone in a project sees every issue. Only the assignee, leads and admins edit or move it. A developer can assign only themselves, and only leads set due dates. A parent with sub-issues cannot be dragged, and its status follows its children. Status is locked outside the active sprint (`isStatusLocked`).
- Restricted pages do not take `isAdmin` or `isLead` props. If the page renders, the user is allowed.

---

## 12. Working rules

### Before you start a new screen

1. Find the nearest finished example and copy its shape.
2. Settle the backend first: the endpoint, the roles, the status codes.
3. Types in `packages/types`, then `ROUTES`, then the hook, then the components.
4. Build the page from `PageContainer`, `PageHeading`, `EmptyState`, `PageLoading` and `PageError`.
5. Open the Network tab: one call per resource, no empty-id calls, no list loaded just for a dropdown.
6. Run `check-types` and `lint`, and add no new `any`.

### Before you change something large

Say what is required and what is optional. Split a change into: required for correctness, required by these conventions, requested, and extras. Do the first three, and list the extras separately.

## 13. Known gaps

- A few `any` warnings remain (`use-mention-suggestion`, `issue-constants`).
- Cards and board components still use arbitrary sizes, and `comment-box` and `mention-list` in `packages/ui` still use hex colours.
- Cards and filter dropdowns are not keyboard accessible.
- Verify that `text-body` and `text-2xs` render at 13px and 11px, that the font family matches, and that `cn` uses `twMerge`.
- Dates are timestamps for now (see section 5).
- The slideover is not in the issue room, so its activity does not update live.

## Links

The API rules: `apps/api/AGENTS.md`. The websocket server: `apps/ws/AGENTS.md`. Shared rules and the endpoint list: the root `AGENTS.md`. Deployment: `DEPLOY.md`.