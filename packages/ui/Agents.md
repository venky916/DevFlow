# @devflow/ui

The shared React components and the design tokens, built on Radix UI and Tailwind. Used by `apps/web`.

**Must not:** fetch data, call the API, navigate, or show toasts. A component gets everything through props and callbacks, and the web's hooks do the rest.

## Commands

```
pnpm --filter @devflow/ui run lint
pnpm --filter @devflow/ui run check-types
pnpm --filter @devflow/ui run format
```

## Folder map

- `src/components/`: one file per component, for example `button`, `select`, `avatar`, `avatar-group`, `badge`, `confirm-modal`, `date-picker`, `file-upload-list`, `comment-box` (the Tiptap editor), `comment-content` (renders a saved comment), `mention-list`.
- `src/lib/cn.ts`: `cn()`, which joins class names and resolves Tailwind conflicts.
- `src/styles/theme.css`: the colour, font and spacing tokens.

## How the web imports it

```ts
import { Avatar } from '@devflow/ui/components/avatar';
import { cn } from '@devflow/ui/lib/cn';
```

The `exports` map in `package.json` points `./components/*` at the component files. A new component needs no extra setup.

## Rules

- Presentational only. If it needs data, the caller passes it in. Example: `CommentBox` gets `mentionSuggestion` from the web.
- Non-submit buttons are `type="button"`, so they never submit a surrounding form.
- Use the tokens (`text-text-primary`, `bg-bg-surface`, `border-border-default`), not hard-coded colours. Some hex colours remain in `comment-box` and `mention-list`, and they are on the clean-up list.
- `CommentContent` falls back to plain text when a saved comment cannot be rendered, so one bad comment cannot crash a page.
- Controls that can be disabled must look and behave disabled (permissions decide in the web).
- Prettier here also sorts Tailwind classes (`prettier.config.mjs`). Run `format` instead of ordering them by hand.
- Lint uses `@devflow/config/eslint/react.js`.

## Env variables it reads

None.

## Links

Where the components are used: `apps/web`. Shared rules and commands: the root `AGENTS.md`.
