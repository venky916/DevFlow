# @devflow/db

The database: the Prisma schema, the migrations and the Prisma client. Postgres on Neon, reached through the Neon adapter. Used by `api`, `ws` and `workers`.

**Must not:** hold business rules or permission checks. Those live in the API's services. This package only defines the data and exports the client.

## Commands

```
pnpm --filter @devflow/db run build                       generate the Prisma client
pnpm --filter @devflow/db run db:studio                   browse the data
pnpm --filter @devflow/db exec prisma migrate dev --name <what_changed>     DEVELOPMENT only
pnpm --filter @devflow/db exec prisma migrate deploy      PRODUCTION: apply the migrations that have not run
pnpm --filter @devflow/db exec prisma migrate status
```

## Folder map

- `prisma/schema.prisma`: all models.
- `prisma/migrations/`: one folder per migration. Committed.
- `prisma.config.ts`: tells the Prisma CLI where the schema is and which database to use (`DIRECT_URL`).
- `src/index.ts`: creates and exports `prisma`, the client the apps import.
- `src/generated/`: the generated client. Not committed, skipped by Prettier. `build` recreates it.

## Rules

- Two databases: `devflow-dev` (Singapore) and `devflow-prod` (Sydney). They are separate Neon projects with separate credentials.
- A schema change: edit `schema.prisma`, run `migrate dev --name ...`, test, then commit the schema **and** the new migration folder.
- **Never edit a migration that has already run.** Prisma stores a checksum and refuses a changed file. Make a new migration.
- **Never run `migrate dev` or `db push` against production.** Production only uses `migrate deploy`.
- Apply a migration to production **before** releasing the code that needs it. For a removed or renamed column, use two releases: first code that no longer uses it, then the migration.
- Check the host before you run `migrate deploy`: `status` prints it. Production is `ap-southeast-2`, development is `ap-southeast-1`.
- `DIRECT_URL` for production is set in one cmd window (`set "DIRECT_URL=..."`), never saved in a file.
- Docker builds run `prisma generate` with a placeholder `DIRECT_URL`, so no real secret goes into an image.
- Dates are timestamps for now. A move to date-only columns is planned, and it needs a backup first.

## Env variables it reads

- `DATABASE_URL`: the **pooled** connection string, used by the apps at runtime.
- `DIRECT_URL`: the **direct** connection string, used only by the Prisma CLI for migrations. Servers do not need it.

## Links

Shared rules and commands: the root `AGENTS.md`. How to release and roll back: `DEPLOY.md`.