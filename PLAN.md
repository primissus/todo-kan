# Implementation Plan

The architecture as built. See [REQUIREMENTS.md](./REQUIREMENTS.md) for the spec
and [AGENTS.md](./AGENTS.md) for the working engineering guide.

## Stack

Vite 6 · React 19 · TypeScript (strict) · Tailwind v4 (`@tailwindcss/vite`, no
`tailwind.config.js`) · shadcn/ui (Radix, unified `radix-ui` pkg) · Zustand v5
(+`persist`, +immer) · dnd-kit · Floating UI · Fuse.js · lucide-react · sonner ·
pnpm.

## Data model (normalized)

`src/lib/types/domain.ts` — chosen for O(1) edits and a single source of order:

- `Board` — `id`, `type: 'todo' | 'kanban'`, `title`, `description`, `tags[]`,
  `columns[]` (kanban only), **`taskIds[]`** (the one ordered list of all the
  board's tasks), `showCompleted`, `archived`.
- `Task` — `id`, `boardId`, `title`, `description`, `tags[]`, `completed` (todo),
  `columnId` (kanban), `archived`.
- `Column` — `id`, `title`, `order`, `isDone?` (the "Archive done" target).

A Kanban column is just `board.taskIds` filtered by `columnId`; ordering within a
column derives from that single array. `archived` is orthogonal to
`completed`/`columnId`.

## State + persistence

- One Zustand store (`src/store/useAppStore.ts`) with all actions, `persist`
  middleware (key `todo-kan:v1`, `version: 1`), and immer for nested updates.
- **localStorage** via the swappable boundary `src/lib/storage.ts` (never-throws;
  falls back to in-memory). Chosen so the single-file build works from `file://`.
- Theme prefs live in their **own** localStorage keys (`theme-mode`,
  `theme-family`), excluded from the persisted blob via `partialize`, so the
  inline FOUC script in `index.html` can read them synchronously before the bundle.

## Build modes

- `pnpm build` → static SPA in `dist/`.
- `pnpm build:single` → `SINGLE_FILE=1` adds `vite-plugin-singlefile` to inline
  all JS + CSS into one `dist-single/index.html` (favicon is an inline data URI).
- `base: './'` keeps both builds working from `file://` and any subpath host.
- **Rule:** feature code uses no `React.lazy()` / dynamic `import()` (the
  single-file inliner needs one chunk).

## Theming (ported from vegapunk → shadcn tokens)

- `src/lib/theme.ts` — `THEME_FAMILIES` (default, gruvbox, solarized, catppuccin,
  nord, github), `MODES` (light/dark/system), `applyTheme` sets `data-theme` +
  `data-mode` on `<html>`. Gruvbox light uses the "soft" background, matching vegapunk.
- `src/styles/theme.css` — `[data-theme="<family>-<light|dark>"]` blocks set
  shadcn's semantic tokens (oklch). `src/styles/globals.css` maps them via
  `@theme inline` and keys `dark:` off `[data-mode="dark"]`.

## Drag and drop (dnd-kit)

- **TODO**: vertical `SortableContext`; `onDragEnd` → `reorderTaskInBoard`.
- **Kanban**: one `DndContext` (`closestCorners`), each column is a `useDroppable`
  + `SortableContext`, `DragOverlay` for the floating card. `onDragOver` performs
  the live cross-column hop; `onDragEnd` finalizes order. The single primitive is
  `moveTaskToColumn(taskId, columnId, beforeTaskId|null)` — insert before the
  target card, or at the end of the column when dropping on empty space.

## Bulk selection & list transforms

Layered on the same normalized model:

- **Selection** is one ephemeral set in `useUiStore` (`selectionMode`,
  `selectedTaskIds`, `selectorOpen`; plus the lifted `moveOpen`/`moveTaskIds`/
  `bulkDeleteOpen`), cleared by `resetModals` on route change. Three surfaces share
  it: the inline card/row checkbox (`useSelectionMode`/`useIsTaskSelected`; in
  selection mode the whole card/row is the click target), the `SelectionToolbar`
  (Move / Archive / Delete), and the searchable `TaskSelectorDialog`. The list
  menu's **Select tasks** enters selection mode directly; the dialog is the
  toolbar's **Search** picker. `src/features/selection/`.
- **Keyboard.** The cursor keeps moving in selection mode; **Enter/Space** toggle
  the cursored task (always-available), and Vim keys `s`/`x`/`a`/`Shift+D`/`Shift+M`
  drive mode/item/archive/delete/move. The Move dialog + delete confirm are lifted
  to `useUiStore` and rendered by the board views, so toolbar and keyboard share one
  flow (`features/selection/bulkActions.ts`).
- **Store actions** (`useAppStore`, now a `(set, get)` closure): `archiveTasks`,
  `deleteTasks`, `moveTasksToBoard(ids, targetBoardId, columnId?)`,
  `cloneBoard(id, title?)` (deep copy through `buildExport`→`rekey`),
  `mergeBoardInto(src, dst)`, `convertBoard(id)`.
- **Done reconciliation.** "Done" is the TODO `completed` flag on a todo board but
  the `isDone` column on a kanban board. `taskWasDone` / `doneColumnId` /
  `landingColumnId` let `moveTasksToBoard`, `mergeBoardInto`, and `convertBoard`
  translate between the two whenever a task changes board type, so done-ness
  survives the move. The Move dialog's **"Current (keep status)"** default
  (`columnId: undefined`) keeps each task's column (same title, else Done/first).
- **List-item actions** (`useBoardListActions`, `src/features/boardActions/`):
  Clone, Merge into… (type `merge list`), Convert to todo/kanban (type
  `convert list`). The hook returns the dropdown `items` and the backing `dialogs`
  separately — a `Dialog` inside a closing `DropdownMenuContent` would unmount, so
  the dialogs render as a sibling of the menu (the Home `BoardCard` delete pattern).

## Routing

Tiny hash router (`src/lib/router.ts`): `#/` = home, `#/board/<id>` = board.
Deep links + back/forward that survive `file://`; no `react-router`.

## Keyboard navigation

Vim-style control layered on without disturbing the domain model:

- **Opt-in.** Vim motions are off by default (`useUiStore.vimEnabled`, persisted
  to its own `todokan:vim-enabled` localStorage key — not the domain blob).
  Toggled from the bottom-left command line (`src/components/CommandLine.tsx`):
  `:` opens it, `q`+Enter runs `:q`. `handleKey` is split into an
  **always-available** block (arrows, Enter, Esc, ⌘K/Ctrl+K, `?`, `:`, and the
  selection-mode Enter/Space toggle) and a **Vim-gated** block (j/k/h/l, `m`, `a`,
  `s`/`x` select, Shift-combos incl. `Shift+M` move, `f` hints, `/`) behind
  `if (!vimEnabled) return`.
- **Grid-aware Home.** The lists grid navigates in 2D (`selectGrid`): ↑/↓ by a row,
  ←/→ by a column, with the column count from `homeGridColumns()` (matches the
  `sm:grid-cols-2 lg:grid-cols-3` breakpoints). Kanban/TODO stay linear per their
  layout.
- **Two stores.** `useAppStore` stays the persisted domain model. A second,
  **non-persisted** `src/store/useUiStore.ts` holds ephemeral nav state — the
  selection cursor, move-mode + an order snapshot for revert, the `vimEnabled`
  flag, the `cmdline` buffer, and overlay/modal flags (incl. `deleteId` for the
  Shift+D confirm). This keeps cursor moves out of the persisted blob and lets
  cards subscribe to a primitive "am I selected?" (`src/hooks/useSelection.ts`)
  so a cursor move re-renders only the two affected cards.
- **One listener.** `src/hooks/useGlobalKeymap.ts` registers a single `window`
  `keydown` handler (mounted once in `App`), reading state via `getState()` and
  the route via a ref so it never re-registers. It owns the should-handle guard
  (skip while typing / while a dialog is open / for unregistered modifier combos;
  don't hijack Enter/Space on a focused control), cursor math, and move-mode.
  **Esc** clears the cursor, then backs out to Home from a board. **Shift+D**
  opens a confirm (sets `deleteId`); the board views run the exported
  `deleteTaskWithCursor` on confirm. Selection never moves DOM focus, so it can't
  conflict with dnd-kit's keyboard sensor.
- **Reuses store primitives.** Move-mode relocates via `moveTaskToColumn` /
  `reorderTaskInBoard` / the new `reorderBoard`; Esc-revert restores the snapshot
  via `restoreTaskOrder` / `restoreBoardOrder`.
- **Overlays** (all statically imported — single-file safe): `CommandLine` (`:`,
  the Vim toggle + mode indicator), `CommandPalette` (`/` ⌘K Ctrl+K, reuses
  `lib/search`), `HelpDialog` (`?`, rendered from the declarative
  `src/lib/keymap.ts` via `visibleBindings(vimEnabled)` so it lists shortcuts for
  the active mode), `HintOverlay` (`f`, Vimium hints from the pure
  `src/lib/hints.ts`, a `z-[100]` portal above the `z-50` dialogs).
- **Dialogs are self-navigated.** While any dialog is open the global keymap is
  suppressed, so the archived-tasks drawer carries its own local cursor (arrows
  always, `j`/`k` with Vim on; Enter/`u` restore, Del/Backspace delete), and the
  task form prompts to discard when closed dirty.

## App version

`src/lib/version.ts` exposes `APP_VERSION` from the compile-time constant
`__APP_VERSION__`, injected via `define` in **both** `vite.config.ts` and
`vitest.config.ts` (read from `package.json`). Compile-time so the single-file
build inlines a literal — no runtime fetch/import of `package.json`. Shown in the
Settings footer.

## Verification

`pnpm test` (vitest) — store-logic suite + jsdom render/interaction — is the
automated gate, run alongside `pnpm typecheck`, `pnpm lint`, `pnpm build`, and
`pnpm build:single`. The jsdom render tests mount the real views, so component
behavior is covered without a browser.

Browser/visual verification (loading the single-file `file://` build and clicking
through it, screenshots) is a **manual** step performed by a human in a real
browser — it is **not** part of the automated flow and is **not** expected of
automated agents, whose sandboxes typically can't run a browser.
