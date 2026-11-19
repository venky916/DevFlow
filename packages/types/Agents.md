# @devflow/types

The TypeScript types and event-name constants that the web and the backend share. They describe what the API sends and what the websocket carries. Used by every app and by `ui`, `queues` and `validators`.

**Must not:** contain logic, import from an app, or depend on React, Express or Prisma. The one thing it holds at runtime is the `as const` objects of event and action names.

## Commands

```
pnpm --filter @devflow/types run lint
pnpm --filter @devflow/types run check-types
pnpm --filter @devflow/types run format
```

## Folder map

One file per area, all re-exported from `src/index.ts`:

- `api.types.ts`: the response wrapper and the paging types.
- `user.types.ts`, `workspace.types.ts`, `project.types.ts`, `sprint.types.ts`: the main entities and their API shapes.
- `issue.types.ts`: the issue in each shape the API returns (card, detail, my issue), the board, the backlog, and the activity log.
- `comment.types.ts`, `attachment.types.ts`, `notification.types.ts`, `search.types.ts`.
- `events.ts`: the constants for websocket events (`ClientEvents`, `ProjectEvents`, `IssueEvents`, `UserEvents`), activity actions (`ActivityActions`) and notification types (`NotificationTypes`).
- `ws.types.ts`: the websocket message types and the presence types.

## Rules

- A type describes what the API actually sends. Change the API response and its type in the same commit.
- One type per response shape. Do not make one big type with optional fields for several shapes.
- Dates are ISO strings in the API and in these types. Never `Date`.
- Use `import type` for types.
- Do not export the same name from two files. `export *` then fails with an ambiguity error.
- No `any`. Two remain in `ws.types.ts`, and they are on the list to replace.
- A new websocket event gets its name in `events.ts` first. Listeners in the web match on the name, and a name that starts with `ISSUE_` or `SPRINT_` refreshes the board, so choose the prefix on purpose.

## Env variables it reads

None.

## Links

The matching validation schemas: `packages/validators`. Shared rules and commands: the root `AGENTS.md`.
