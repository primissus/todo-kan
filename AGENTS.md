# AGENTS.md

Working guide for AI agents (and humans) editing **todo-kan**. Read this before
making changes. Companion docs: [REQUIREMENTS.md](./REQUIREMENTS.md),
[PLAN.md](./PLAN.md), [PROGRESS.md](./PROGRESS.md).

## What this is

A local-first SPA for multiple TODO lists and Kanban boards. No backend — all
state lives in the browser (localStorage). It ships two ways: a normal static
site (`pnpm build`) and a single self-contained HTML file (`pnpm build:single`)
that runs from `file://`.

## Commands

```bash
pnpm dev            # dev server
pnpm build          # tsc -b && vite build         → dist/
pnpm build:single   # SINGLE_FILE=1 vite build     → dist-single/index.html
pnpm preview        # serve dist/
pnpm preview:single # serve dist-single/
pnpm typecheck      # tsc -b --noEmit
pnpm lint           # eslint
pnpm test           # vitest run
```

Toolchain note: this sandbox ships no Node/pnpm. Node 22.13 is installed under
`~/.local/node` (on `PATH` via `~/.bashrc`); pnpm 11.5.2 was installed with
`npm i -g` (corepack's bundled signing keys are stale). pnpm build-script
approvals live in `pnpm-workspace.yaml`, not `package.json`.

## Directory layout

```
src/
  main.tsx, App.tsx              # entry + shell (header + hash-routed views)
  lib/
    types/domain.ts              # normalized model (single source of truth)
    utils.ts (cn), id.ts, storage.ts, storageKeys.ts
    theme.ts                     # ported theme logic (families/modes/applyTheme)
    search.ts                    # Fuse.js + "#tag" parsing
    transfer.ts                  # export/import (+ id re-keying)
    router.ts                    # tiny hash router
  store/
    useAppStore.ts               # Zustand store + ALL actions (persist + immer)
    selectors.ts                 # useOrderedBoards / useBoard / useBoardTasks / useAllTags
  hooks/                         # useTheme, useDebouncedValue
  components/
    ui/                          # shadcn primitives (CLI-generated) — avoid hand-editing
    AppHeader is inline in App.tsx; SearchBar, SettingsDialog, ThemeControls,
    ConfirmModal, TypeToConfirmModal, TagInput (Floating UI), Tooltip (Floating UI),
    ExportDialog, ImportDialog
  features/
    BoardHeader.tsx, TaskFormDialog.tsx, ArchivedTasksDrawer.tsx   # shared by both views
    home/    HomePage, BoardCard
    todo/    TodoView, TaskRow
    kanban/  KanbanView, Column, KanbanCard, ColumnsSettings
  styles/ globals.css, theme.css
  test/   setup.ts, store.test.ts, render.test.tsx
```

## Architecture (read before touching state/UI)

- **Normalized model** (`lib/types/domain.ts`): `boards`, a flat `tasks` map, and
  a per-board **`taskIds[]`** that is the single source of order. A Kanban column
  = `taskIds` filtered by `columnId`. Don't denormalize (don't nest tasks under
  boards in the store).
- **All mutations go through `store/useAppStore.ts`** actions. Components read via
  the `selectors.ts` hooks (they use `useShallow` for arrays). Add new behavior as
  a store action, not ad-hoc state in components.
- **Persistence**: `persist` → `lib/storage.ts` (localStorage, never-throws,
  in-memory fallback). `partialize` persists only `boards/boardOrder/tasks`.
- **`archived` is an orthogonal boolean** on each task — independent of
  `completed` (todo) and `columnId` (kanban). Never fold archived into a status
  enum (you'd lose the column to restore on unarchive).

## Conventions

- TypeScript strict; `verbatimModuleSyntax` is on → use `import type` for types.
- Path alias **`@/` → `src/`** (in `vite.config.ts` and `tsconfig.app.json`).
- Styling is **Tailwind v4 + shadcn only — no CSS Modules.** Use semantic tokens
  (`bg-background`, `text-muted-foreground`, `border-input`, etc.) so theming works.
- shadcn primitives live in `components/ui` and use the unified `radix-ui` package;
  add new ones with `pnpm dlx shadcn@latest add <name>` (then move from the literal
  `@/` folder into `src/` if the CLI mis-resolves the alias).
- Feature components live under `features/<area>`; shared cross-feature pieces
  (BoardHeader, TaskFormDialog, ArchivedTasksDrawer) live directly under `features/`.

## Gotchas (these will bite you)

1. **React 19 is required** — shadcn components are ref-as-prop (no `forwardRef`).
   Do **not** downgrade to React 18; refs to Button/Dialog/etc. would silently break.
2. **localStorage, not IndexedDB** — keeps the single-file `file://` build working.
   If you change the store engine, keep the `lib/storage.ts` boundary and re-verify
   `file://`.
3. **Single-file build needs one JS chunk** — no `React.lazy()` / dynamic
   `import()` in feature code, or `vite-plugin-singlefile` can't inline it.
4. **Theme prefs are NOT in the Zustand blob** — they're separate localStorage
   keys (`theme-mode`/`theme-family`) read by the inline FOUC script in
   `index.html`. Keep those keys in sync with `lib/theme.ts`.
5. **Dark mode is keyed off `[data-mode="dark"]`** via `@custom-variant dark` in
   `globals.css` — not the default `.dark` class. Don't remove that line.
6. **Kanban DnD ordering** — `moveTaskToColumn(taskId, columnId, beforeTaskId|null)`
   is the one primitive: insert before the target card, or at the column's end when
   `beforeTaskId` is null. `onDragOver` does the live cross-column hop;
   `onDragEnd` finalizes. The board-wide `taskIds` array (filtered per column) is
   the order — there are no per-column arrays.
7. **"Done" column** is identified by `column.isDone`, not its title.

## Testing

- `pnpm test` runs vitest (`vitest.config.ts`, jsdom, polyfills in
  `src/test/setup.ts`). `store.test.ts` covers the data logic; `render.test.tsx`
  mounts the real views.
- After UI/logic changes, run `pnpm typecheck && pnpm lint && pnpm test`, then
  `pnpm build` and `pnpm build:single`.

## Hard rules

- Don't introduce CSS Modules or another styling system.
- Don't add dynamic imports / route-level code splitting (breaks `build:single`).
- Don't commit `dist/`, `dist-single/`, or `node_modules/` (already git-ignored).
- Don't run builds/commits unless asked.
