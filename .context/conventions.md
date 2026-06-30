# Code conventions

> See [AGENTS.md](../AGENTS.md) "Conventions" + "Hard rules" for the full list.

## Style
- Formatting/linting: **ESLint only** (`pnpm lint`; flat config). No Prettier in
  the repo — match the surrounding file's existing style.
- TypeScript strict + `verbatimModuleSyntax` → import types with `import type`.
- Path alias **`@/` → `src/`** (set in `vite.config.ts` and `tsconfig.app.json`).
- Naming: PascalCase for component files/exports (`KanbanCard.tsx`), camelCase for
  libs/hooks (`useAppStore.ts`, `search.ts`). Branded id types
  (`BoardId`/`TaskId`/`ColumnId`/`NoteId`) — type local id arrays as `string[]`
  before putting them in a `Set`/`.includes()` (see known-issues).

## Patterns we DO use
- **All mutations are `useAppStore` actions**; components read via `selectors.ts`
  (arrays use `useShallow`). Add behavior as a store action, not ad-hoc component state.
- **Granular primitive selectors** (`hooks/useSelection.ts`) return a boolean so a
  card re-renders only when its own state flips.
- **Ephemeral nav/UI state goes in `useUiStore`** (non-persisted), never the domain blob.
- **Tailwind semantic tokens** (`bg-background`, `text-muted-foreground`, …) so theming works.
- **Type-to-confirm** (`TypeToConfirmModal`) for destructive/irreversible actions.
- A **`Dialog` opened from a dropdown renders as a sibling** of the menu, controlled
  by state (not inside `DropdownMenuContent`, which unmounts on close).

## FORBIDDEN patterns
- CSS Modules / another styling system.
- Dynamic `import()` / `React.lazy` / route code-splitting.
- IndexedDB; Service Worker / Push; heavy date libs (react-day-picker/date-fns).
- Downgrading React below 19. Committing `dist/`, `dist-single/`, `node_modules/`.

## Tests
- Live in `src/test/*.test.ts(x)` (vitest + jsdom). `store.test.ts` = data logic;
  `render.test.tsx` mounts real views; `keymap*.test.ts(x)` = shortcuts/Help table;
  `uiStore.test.ts` = the ephemeral store; plus pure-helper suites.
- Always test new store actions and any pure `lib/` helper.

## Commits
- **Conventional Commits** (`feat:`, `refactor(scope): …`). Keep `dist*` out.
- Don't run builds/commits unless asked.
