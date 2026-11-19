# @devflow/validators

The Zod schemas that check data before it is used. The **same** schemas run in the web's forms and in the API, so a rule is written once. Also checks every message the websocket server accepts.

**Must not:** check permissions (who may do something) or look anything up in the database. A schema only says whether the data has the right shape and limits.

## Commands

```
pnpm --filter @devflow/validators run lint
pnpm --filter @devflow/validators run check-types
pnpm --filter @devflow/validators run format
```

## Folder map

One file per area, all re-exported from `src/index.ts`:

- `auth.validators.ts`, `user.validators.ts`
- `workspace.validators.ts`, `project.validators.ts`, `sprint.validators.ts`
- `issue.validators.ts`: create, update, move, sub-issue and filter schemas.
- `comment.validators.ts`: the allowed comment content, links, sizes and mentions.
- `ws.validators.ts`: one schema per message the websocket server accepts.
- The file-upload and attachment rules (allowed types and sizes).

## Rules

- A schema is the single source of the input type. Derive the type with `z.infer`, as in `CreateIssueInput`. Do not write the same type by hand.
- The API validates every request, whatever the form already checked. The form is only for the user's convenience.
- **Comments:** only the listed Tiptap nodes and marks, only safe links, at most 5,000 characters of text, 50,000 of JSON and 20 mentions.
- **Attachments:** only the allowed file types, at most 10 MB.
- **Websocket messages:** every client message has a schema. A cursor position is a fraction between 0 and 1 across and a pixel offset down. A message that fails its schema is ignored.
- Status, sprint and parent are not part of the issue update schema. They change only through the move and sub-issue routes, so the server controls those rules.
- Several schemas are loose on purpose (optional and nullable fields). A rewrite against the final columns and forms is planned.
- Zod 4: use `.parse` or `.safeParse`, and read errors through the issues list.

## Env variables it reads

None.

## Links

The matching types: `packages/types`. Shared rules and commands: the root `AGENTS.md`.
