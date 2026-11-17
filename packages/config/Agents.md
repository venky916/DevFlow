# @devflow/config

The shared ESLint, Prettier and TypeScript settings for the whole repo. It only matters while you work: nothing from here runs in production.

**Must not:** be imported by application code, or hold rules that only one app needs.

## Commands

This package has no scripts of its own. Every other package runs `lint`, `check-types` and `format`, and those read the files here. There is nothing to build.

## Folder map

- `prettier.js`: formatting (single quotes, 100 columns) and import sorting.
- `eslint/base.js`: lint rules for every backend app and package.
- `eslint/next.js`: `base.js` plus the Next.js and React rules, for `apps/web`.
- `eslint/react.js`: `base.js` plus the React rules, for `packages/ui`.
- `tsconfig/base.json`: strict TypeScript settings for backend code.
- `tsconfig/nextjs.json`: for `apps/web`.
- `tsconfig/react-library.json`: for `packages/ui`.

## How a package uses it

- `eslint.config.mjs`: `import { config } from '@devflow/config/eslint/base.js'; export default config;`
- `tsconfig.json`: `"extends": "@devflow/config/tsconfig/base.json"`
- `package.json`: `"prettier": "@devflow/config/prettier.js"`
- `web` and `ui` have their own `prettier.config.mjs`. It extends the shared file and adds Tailwind class sorting.

## Rules

- A lint error fails the check. There is no "warnings only" mode.
- `any` is only a warning for now. It is meant to become an error once the remaining uses are replaced.
- A name that starts with `_` may be unused on purpose (`_next` in an Express error handler).
- Imports are sorted by the Prettier plugin: built-ins, third-party, `@devflow/*`, then relative paths. Run `format` instead of sorting by hand.
- TypeScript is pinned to one exact version in every package (no `^`), because `typescript-eslint` only supports a range of versions.
- Node 22.

## Env variables it reads

None.

## Links

Shared rules and commands: the root `AGENTS.md`.