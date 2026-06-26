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
    search.ts                    # Fuse.js + "#tag" + "type:task/list" parsing
    datetime.ts                  # pure date/time helpers for the date-time picker
    notifications.ts             # Web Notifications boundary (in-tab reminders)
    linkify.ts                   # pure URL tokenizer (bare URLs → link segments)
    markdown.ts                  # pure Markdown-subset parser (AST + safeHref); no deps
    transfer.ts                  # export/import (+ id re-keying, incl. notes; fingerprint/diff)
    fileSync.ts                  # File System Access API: link a file + auto-save the dataset to it
    router.ts                    # tiny hash router
    keymap.ts                    # declarative shortcut table (drives the Help dialog)
    hints.ts                     # pure f-hint helpers (generateLabels / collectHintTargets)
    version.ts                   # APP_VERSION (build-time __APP_VERSION__ define)
  store/
    useAppStore.ts               # persisted Zustand store + ALL domain actions (persist + immer)
    useUiStore.ts                # NON-persisted ephemeral store (selection/move/overlay/modal flags)
    selectors.ts                 # useOrderedBoards / useBoard / useBoardTasks / useAllTasks / useAllTags
  hooks/                         # useTheme, useDebouncedValue, useGlobalKeymap, useSelection, useReminderScheduler, useFileSyncWriter
  components/
    ui/                          # shadcn primitives (CLI-generated) — avoid hand-editing
    AppHeader is inline in App.tsx; SearchBar, SettingsDialog, ThemeControls,
    ConfirmModal, TypeToConfirmModal, TagInput (Floating UI), Tooltip (Floating UI),
    DateTimePicker (dependency-free Popover + calendar + time), ExportDialog, ImportDialog,
    FileSyncSection (Settings "Sync to a file": link/new/unlink + overwrite-conflict banner),
    CommandPalette (search), HelpDialog (? cheat sheet, mode-aware), HintOverlay (f hints),
    KeyboardStatus (move-mode banner + sr-only selection announcements),
    CommandLine (: command line — Vim-keys toggle + bottom-left mode indicator),
    Linkify (renders bare URLs in free text as anchors),
    Markdown (renders the Markdown subset → React elements; code-block copy button; reuses Linkify)
  features/
    BoardHeader.tsx, TaskFormDialog.tsx (create), TaskDialog.tsx (unified view/edit
    + due/reminder + discussion), NoteThread.tsx (the note thread, embedded in TaskDialog),
    ArchivedTasksDrawer.tsx                                        # shared by both views
    home/    HomePage, BoardCard
    todo/    TodoView, TaskRow
    kanban/  KanbanView, Column, KanbanCard, ColumnsSettings
  styles/ globals.css, theme.css
  test/   setup.ts, store.test.ts, notes.test.ts, render.test.tsx,
          keymap.test.tsx, keymapTable.test.ts, hints.test.ts,
          linkify.test.ts, markdown.test.ts, markdownRender.test.tsx,
          datetime.test.ts, uiStore.test.ts, transfer.test.ts
```

## Architecture (read before touching state/UI)

- **Normalized model** (`lib/types/domain.ts`): `boards`, a flat `tasks` map, and
  a per-board **`taskIds[]`** that is the single source of order. A Kanban column
  = `taskIds` filtered by `columnId`. Don't denormalize (don't nest tasks under
  boards in the store). A task's `notes: Note[]` thread is the one nested array
  (notes are scoped to their task, never addressed globally); `addNote`/`editNote`/
  `deleteNote` are the store actions and they commit immediately. Tasks also carry
  optional `dueAt`/`remindAt` (unix ms). The `persist` `version` is **3** — the
  cumulative `migrate` backfills `notes: []` on older tasks (v1→v2); v2→v3 added
  the optional `dueAt`/`remindAt` and needs no backfill (absent === "none").
- **All mutations go through `store/useAppStore.ts`** actions. Components read via
  the `selectors.ts` hooks (they use `useShallow` for arrays). Add new behavior as
  a store action, not ad-hoc state in components.
- **Persistence**: `persist` → `lib/storage.ts` (localStorage, never-throws,
  in-memory fallback). `partialize` persists only `boards/boardOrder/tasks`.
- **`archived` is an orthogonal boolean** on each task — independent of
  `completed` (todo) and `columnId` (kanban). Never fold archived into a status
  enum (you'd lose the column to restore on unarchive).
- **App-shell layout (the frame never scrolls).** `globals.css` sets
  `html { overflow: hidden }`; `App` is a fixed-height `h-dvh` flex column
  (header is `shrink-0`, always visible). The single document-style scroll lives
  on **`<main>`** (`flex-1 min-h-0 overflow-y-auto`). Home/TODO render inside a
  centered `max-w-6xl` wrapper that scrolls vertically. The **Kanban board fills
  `<main>` on md+ (`md:h-full`)**: its board header is fixed height and the
  columns region (`flex-1 min-h-0 md:overflow-x-auto md:overflow-y-hidden`)
  scrolls **horizontally only**, so its scrollbar is pinned to the viewport
  bottom; vertical task overflow scrolls **inside each column**
  (`Column`'s list is `tall:md:min-h-0 tall:md:overflow-y-auto`). On mobile the
  board flows at natural height and `<main>` scrolls the whole thing. Heights
  come from the flex chain — **no `calc()`/magic numbers** and no full-bleed
  negative-margin hack (`<main>` is full-width; the board header re-centers
  itself with `mx-auto max-w-6xl`).
- **The fit-to-viewport pane is gated by a `tall` height variant** (`@custom-variant
  tall (@media (min-height: 640px))` in `globals.css`, plus its `short` inverse).
  The pane behavior is `tall:md:*` — so on **short/landscape viewports** (e.g. a
  phone rotated to landscape, height < 640px) the board does NOT try to fit;
  columns get `short:md:min-h-[420px]`, the board flows at natural height, and
  `<main>` scrolls it. Without this, a short viewport crushes the columns into a
  sliver under the board header. Keep new fit-to-height classes on the `tall:`
  variant, not bare `md:`.
- **Two stores, on purpose.** `useAppStore` is the persisted domain model.
  `useUiStore` is a separate, **non-persisted** store for ephemeral
  keyboard-navigation state: the selection cursor (`selectedId`), move-mode
  (`moveMode` + an order `moveSnapshot` for Esc-revert), the Vim-keys toggle
  (`vimEnabled`) + command-line buffer (`cmdline`), and overlay/modal flags
  (`paletteOpen`, `helpOpen`, `hintsActive`, `newOpen`, `editId`, `deleteId`,
  `archivedOpen`, `kanbanColumnsOpen`, `homeShowArchived`, `homeQuery`), plus
  `pendingSelectId` (a task to focus AFTER the next route change — set by a Home
  search result that targets a task on another board, consumed by the keymap's
  route-reset effect). `editId` opens the unified `TaskDialog` (view/edit + due/
  reminder + discussion); there is no separate `notesId` anymore. Cursor moves must never
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
  cards involved, not the list; a **selected card/row also reveals its hover
  action buttons** (open/archive) — the keyboard cursor has no hover.
- **Vim keys are opt-in** (`vimEnabled`, off by default). `handleKey` is split
  into an always-available block (arrows, Enter, Esc, ⌘K/Ctrl+K, `?`, `:`) and a
  Vim-gated block (j/k/h/l, `m`, `a`, `f`, `/`, Shift-combos) — `f` hint mode is
  checked *before* the dialog guard (but after the typing guard) so it can label
  an open dialog's own controls (the task form); every other key still bails when
  a dialog owns the keyboard. `:` opens the
  `CommandLine`; `:q`↵ toggles `vimEnabled`. **Esc** clears the cursor, then backs
  out to Home from a board. **Shift+D** sets `deleteId` to open a destructive
  confirm; the board views run the exported `deleteTaskWithCursor` on confirm.
  When adding a shortcut, decide which block it belongs in. **Kanban column headers
  are cursor targets** — `selectKanban` treats each column as `[header, ...cards]`,
  so ↑ from the first card selects the header and ←/→ step across column headers
  (even empty ones); `selectedId` may then be a column id (header actions like
  `a`/`m`/Shift+D are guarded off). **Shift+N**/**Enter** on a header (and Shift+N
  on any card) opens the create form for the cursor's column via
  `useUiStore.newColumnId`.
- **Task dialog & scheduling.** Opening a task (Enter / clicking the card / its
  **eye / "view"** open button — the dialog opens read-only first) shows
  `features/TaskDialog.tsx` — a view/edit modal that opens **read-only**
  (title heading, Markdown description, due date + labels for reading, the
  `features/NoteThread.tsx` discussion below — and **Status + Reminder as live controls**
  even in the read-only view, the two common quick edits). **Shift+E** / the Edit button
  reveal the full form, whose fields **commit live** to the store (no Save/Discard); **Shift+C**
  focuses the comment box (via NoteThread's `composeRef`). **⌘/Ctrl+Enter** commits &
  closes (fields auto-save, so it's just "done"; skipped via `e.defaultPrevented`
  when a child note box submits a comment on the same chord). A **Discussion** toggle
  in the read-only header (`discussionOnly` state) collapses the metadata
  (status/due/reminder/labels + Edit) so only the title, description and thread
  remain — it flips to **Details** to restore them, and resets on close. These
  modal-local shortcuts (`onKeyDown` on `DialogContent`, guarded while typing) live
  here, not in `useGlobalKeymap`/`keymap.ts` — only `f` hint mode reaches in (the
  overlay scopes its labels to the open dialog).
  **Esc** steps out of a focused field first (blurs to the `contentRef`, nothing is
  lost — fields auto-save) and only closes on a second Esc with no field focused;
  `editMode` resets when the dialog **closes**. Creating a
  task still uses the buffered `TaskFormDialog`. Due date + reminder use
  `components/DateTimePicker.tsx`, a **dependency-free** shadcn-style
  Popover/calendar/time picker (pure math in `lib/datetime.ts`) — do NOT add
  react-day-picker/date-fns; the hand-rolled grid keeps the single-file build a single
  chunk. Due date is calendar-first; the Reminder picker uses **`timeFirst`** (time
  input leads, calendar hidden behind a date disclosure). Reminders fire through the in-tab
  **Web Notifications API** only (`lib/notifications.ts` + `hooks/useReminderScheduler.ts`,
  mounted in `App`): no Service Worker / Push (they need https and can't run from
  `file://`), so reminders only fire while the tab is open but work in BOTH builds.
  The on/off pref is its own `todokan:notifications-enabled` localStorage key (like
  the theme/vim prefs), never the persisted blob.
- **Sync to a file** (`lib/fileSync.ts` + `hooks/useFileSyncWriter.ts`, mounted in
  `App`; UI in `components/FileSyncSection.tsx`, Settings → Data). Links one JSON
  file via the **File System Access API** and auto-saves the whole dataset to it
  (debounced) on every change — so the user stops re-downloading exports. The file
  handle is **in-memory / session-only**: persisting it would need IndexedDB
  (handles aren't JSON-serializable), which we avoid — so the link drops on reload
  and the user re-links once. `isFileSyncSupported()` is false on Firefox/Safari
  and the **`file://` single-file build** (the API needs a secure non-`file://`
  origin); there the section just points back to Export. On link the file is read +
  compared to the live data with the id/timestamp-independent `fingerprintPayload`/
  `payloadsEqual` (`lib/transfer.ts`); a real difference raises a banner to choose
  direction — *load file → app* (`importBoards(payload, 'replace')`) or *overwrite
  the file with app data*. Writes are serialized through one promise chain so a
  manual "Save now" and the debounced auto-save never open two writables at once.
- **Home search** (`features/HomePage.tsx`) spans lists AND tasks; `parseQuery`
  (`lib/search.ts`) reads a leading `type:task`/`type:list` filter plus the `#tag`
  prefix. Results are navigated inline (↑/↓/Enter while the search box is focused);
  picking a task sets `pendingSelectId` then navigates to its board so the view
  highlights it on arrival.

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
   `file://`. (File sync deliberately keeps its file handle in memory only for the
   same reason — don't reach for IndexedDB to persist it across reloads.)
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
   the order — there are no per-column arrays. **Touch:** both views register a
   `TouchSensor` with a long-press `delay` (220ms, 6px tolerance) alongside the
   `PointerSensor` so dragging works on phones/tablets (a quick swipe still
   scrolls). Keep both sensors statically imported (no dynamic import).
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
  tokenizer; `markdown.test.ts` covers the Markdown parser + `safeHref`, and
  `markdownRender.test.tsx` the renderer (copy button, verbatim code, inert unsafe
  links); `datetime.test.ts` covers the pure date-picker math; `hints.test.ts`
  + `uiStore.test.ts` cover the pure/ephemeral pieces. `store.test.ts` also covers
  `type:` query parsing and `dueAt`/`remindAt` edits; `render.test.tsx` covers the
  unified TaskDialog live-edit and the Home `type:task` jump-to-task flow.
- After UI/logic changes, run `pnpm typecheck && pnpm lint && pnpm test`, then
  `pnpm build` and `pnpm build:single`. Note `tsc -b` type-checks the test files
  too — a green `vitest` run is not enough on its own. That is the full automated
  gate; the jsdom render tests mount the real views, so component behavior is
  covered without a browser.
- **Browser/visual verification is manual** — loading the `file://` single-file
  build and clicking through it (or taking screenshots) is a human step in a real
  browser. It is not part of the automated gate and is not expected of agents
  (sandboxes usually can't launch a browser); rely on the render tests instead.

## Hard rules

- Don't introduce CSS Modules or another styling system.
- Don't add dynamic imports / route-level code splitting (breaks `build:single`).
- Don't add a Service Worker / Push, or heavy date libs (react-day-picker/date-fns).
  Reminders are intentionally in-tab (Web Notifications API) and the date-time
  picker is hand-rolled so the `file://` single-file build stays one chunk.
- Don't commit `dist/`, `dist-single/`, or `node_modules/` (already git-ignored).
- Don't run builds/commits unless asked.
