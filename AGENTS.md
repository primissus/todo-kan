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
    linkify.ts                   # pure URL tokenizer (bare URLs → link segments)
    transfer.ts                  # export/import (+ id re-keying, incl. notes)
    router.ts                    # tiny hash router
    keymap.ts                    # declarative shortcut table (drives the Help dialog)
    hints.ts                     # pure f-hint helpers (generateLabels / collectHintTargets)
    version.ts                   # APP_VERSION (build-time __APP_VERSION__ define)
  store/
    useAppStore.ts               # persisted Zustand store + ALL domain actions (persist + immer)
    useUiStore.ts                # NON-persisted ephemeral store (selection/move/overlay/modal flags)
    selectors.ts                 # useOrderedBoards / useBoard / useBoardTasks / useAllTags
  hooks/                         # useTheme, useDebouncedValue, useGlobalKeymap, useSelection
  components/
    ui/                          # shadcn primitives (CLI-generated) — avoid hand-editing
    AppHeader is inline in App.tsx; SearchBar, SettingsDialog, ThemeControls,
    ConfirmModal, TypeToConfirmModal, TagInput (Floating UI), Tooltip (Floating UI),
    ExportDialog, ImportDialog,
    CommandPalette (search), HelpDialog (? cheat sheet, mode-aware), HintOverlay (f hints),
    KeyboardStatus (move-mode banner + sr-only selection announcements),
    CommandLine (: command line — Vim-keys toggle + bottom-left mode indicator),
    Linkify (renders bare URLs in free text as anchors)
  features/
    BoardHeader.tsx, TaskFormDialog.tsx, NotesDialog.tsx,
    ArchivedTasksDrawer.tsx                                        # shared by both views
    home/    HomePage, BoardCard
    todo/    TodoView, TaskRow
    kanban/  KanbanView, Column, KanbanCard, ColumnsSettings
  styles/ globals.css, theme.css
  test/   setup.ts, store.test.ts, notes.test.ts, render.test.tsx,
          keymap.test.tsx, keymapTable.test.ts, hints.test.ts,
          linkify.test.ts, uiStore.test.ts
```

## Architecture (read before touching state/UI)

- **Normalized model** (`lib/types/domain.ts`): `boards`, a flat `tasks` map, and
  a per-board **`taskIds[]`** that is the single source of order. A Kanban column
  = `taskIds` filtered by `columnId`. Don't denormalize (don't nest tasks under
  boards in the store). A task's `notes: Note[]` thread is the one nested array
  (notes are scoped to their task, never addressed globally); `addNote`/`editNote`/
  `deleteNote` are the store actions and they commit immediately. The `persist`
  `version` is **2** — the v1→v2 `migrate` backfills `notes: []` on older tasks.
- **All mutations go through `store/useAppStore.ts`** actions. Components read via
  the `selectors.ts` hooks (they use `useShallow` for arrays). Add new behavior as
  a store action, not ad-hoc state in components.
- **Persistence**: `persist` → `lib/storage.ts` (localStorage, never-throws,
  in-memory fallback). `partialize` persists only `boards/boardOrder/tasks`.
- **`archived` is an orthogonal boolean** on each task — independent of
  `completed` (todo) and `columnId` (kanban). Never fold archived into a status
  enum (you'd lose the column to restore on unarchive).
- **Two stores, on purpose.** `useAppStore` is the persisted domain model.
  `useUiStore` is a separate, **non-persisted** store for ephemeral
  keyboard-navigation state: the selection cursor (`selectedId`), move-mode
  (`moveMode` + an order `moveSnapshot` for Esc-revert), the Vim-keys toggle
  (`vimEnabled`) + command-line buffer (`cmdline`), and overlay/modal flags
  (`paletteOpen`, `helpOpen`, `hintsActive`, `newOpen`, `editId`, `deleteId`,
  `archivedOpen`, `kanbanColumnsOpen`, `homeShowArchived`). Cursor moves must never
  dirty the persisted blob. `useUiStore` is deliberately "dumb" (primitive
  setters); `useUiStore` never imports `useAppStore` (no cycle). `vimEnabled` is
  the lone exception to "non-persisted" — it mirrors to its own
  `todokan:vim-enabled` localStorage key (like the theme prefs), not the blob.
- **Keyboard navigation** is one global `keydown` listener in
  `hooks/useGlobalKeymap.ts`, mounted once in `App`. It reads state via
  `getState()` (not hooks) so it registers once and always sees fresh data; only
  the route is tracked via a ref. All cursor math + move-mode relocation live in
  that hook and reuse existing store actions (`moveTaskToColumn`,
  `reorderTaskInBoard`, the new `reorderBoard`); revert uses `restoreTaskOrder` /
  `restoreBoardOrder`. Cards subscribe to "am I selected?" through the primitive
  selectors in `hooks/useSelection.ts` so a cursor move re-renders only the two
  cards involved, not the list.
- **Vim keys are opt-in** (`vimEnabled`, off by default). `handleKey` is split
  into an always-available block (arrows, Enter, Esc, ⌘K/Ctrl+K, `?`, `:`) and a
  Vim-gated block (j/k/h/l, `m`, `a`, `f`, `/`, Shift-combos). `:` opens the
  `CommandLine`; `:q`↵ toggles `vimEnabled`. **Esc** clears the cursor, then backs
  out to Home from a board. **Shift+D** sets `deleteId` to open a destructive
  confirm; the board views run the exported `deleteTaskWithCursor` on confirm.
  When adding a shortcut, decide which block it belongs in.

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
8. **The global keymap guard** (`hooks/useGlobalKeymap.ts`) ignores keys while
   focus is in an `input`/`textarea`/`select`/`contenteditable`, while any dialog
   is **actually rendered** (`[data-slot="dialog-content"][data-state="open"]` —
   NOT the `useUiStore` flags, so a stale flag can never wedge the keymap), and
   for modifier combos other than ⌘/Ctrl+K. It won't hijack Enter/Space on a
   focused button/link **unless there is a selection** (so "select card, press
   Enter" still works after a click). The lifted modal flags + cursor are reset
   on route change (`resetModals`). Selection **never moves DOM focus** — so it
   can't fight dnd-kit's `KeyboardSensor`. Preserve these invariants when adding
   shortcuts.
9. **`keymap.ts` ↔ `useGlobalKeymap.ts` must stay in sync.** `keymap.ts` is only
   the display table for the Help dialog; the actual dispatch is hand-written in
   the hook. Add a binding to both. Each `keymap.ts` row carries mode metadata
   (`vimOnly` / `vimKeys`); `visibleBindings(vimEnabled)` filters them so the Help
   dialog matches the active mode. A Vim-gated dispatch ⇒ mark its row `vimOnly`.
10. **App version is a build-time constant.** `__APP_VERSION__` is injected via
    `define` in BOTH `vite.config.ts` and `vitest.config.ts` (read from
    `package.json`); `src/lib/version.ts` re-exports it. If you add another
    build/test entrypoint, define it there too or the literal is missing.

## Testing

- `pnpm test` runs vitest (`vitest.config.ts`, jsdom, polyfills + `useUiStore`
  reset in `src/test/setup.ts`). `store.test.ts` covers data logic;
  `render.test.tsx` mounts the real views; `keymap.test.tsx` drives the global
  shortcuts (`fireEvent.keyDown(window, …)`) incl. the Vim toggle, Shift+D confirm,
  archived-drawer nav, Esc→Home and the discard guard; `keymapTable.test.ts`
  covers the mode-aware Help table (`visibleBindings`); `notes.test.ts` covers the
  note thread actions + import re-keying; `linkify.test.ts` covers the URL
  tokenizer; `hints.test.ts` + `uiStore.test.ts` cover the pure/ephemeral pieces.
- After UI/logic changes, run `pnpm typecheck && pnpm lint && pnpm test`, then
  `pnpm build` and `pnpm build:single`. Note `tsc -b` type-checks the test files
  too — a green `vitest` run is not enough on its own.

## Hard rules

- Don't introduce CSS Modules or another styling system.
- Don't add dynamic imports / route-level code splitting (breaks `build:single`).
- Don't commit `dist/`, `dist-single/`, or `node_modules/` (already git-ignored).
- Don't run builds/commits unless asked.
