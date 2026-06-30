# CLAUDE.md

Quick reference for Claude Code. **Full guide: [AGENTS.md](./AGENTS.md).**
Spec: [REQUIREMENTS.md](./REQUIREMENTS.md) · Architecture: [PLAN.md](./PLAN.md).

## Commands
```bash
pnpm dev | build | build:single | preview | typecheck | lint | test
```
After changes: `pnpm typecheck && pnpm lint && pnpm test`, then `pnpm build` and `pnpm build:single`.

## Top things to know
- **Tailwind v4 + shadcn/ui only — no CSS Modules.** Use semantic tokens (`bg-background`, …).
- **React 19 required** (shadcn components are ref-as-prop). Don't downgrade.
- **State**: one **persisted** Zustand store (`src/store/useAppStore.ts`) over a
  **normalized** model (`src/lib/types/domain.ts`): `boards` + flat `tasks` map +
  per-board `taskIds[]` as the single order source. All mutations are store
  actions; read via `src/store/selectors.ts`.
- **Ephemeral UI/nav state** lives in a SECOND, **non-persisted** store
  (`src/store/useUiStore.ts`): the selection cursor, move-mode, overlay/modal
  flags, and `pendingSelectId` (a task to focus AFTER the next route change —
  consumed by the keymap's route-reset effect; used when a Home search result
  jumps to a task on another board). Never put domain data here, and never put
  cursor/overlay state in the persisted store.
- **Keyboard nav**: one global `keydown` listener in `src/hooks/useGlobalKeymap.ts`
  (mounted once in `App`) drives a Vim-style cursor (j/k/h/l + arrows), move-mode
  (`m`), actions (Enter/`a`/Shift+A/Shift+C/Shift+D-delete/Shift+N), search
  (`/` ⌘K), hints (`f`), help (`?`). **Vim keys are opt-in** (`useUiStore.vimEnabled`,
  off by default, persisted to the `todokan:vim-enabled` localStorage key): when
  off only the "simple" keys fire (arrows, Enter, Esc, ⌘K, `?`, `:`). Toggle via
  the bottom-left command line (`src/components/CommandLine.tsx`) — press `:`,
  type `q`, Enter. The cheat-sheet table in `src/lib/keymap.ts` drives the `?`
  Help dialog — **keep the two in sync**. **`f` hint mode fires even while a
  dialog is open** (so the task form / task view can be hint-navigated; the
  `HintOverlay` scopes its labels to the topmost open dialog) — it still yields
  while you're typing in a field. Cards/rows read "am I selected?" via the
  granular selectors in `src/hooks/useSelection.ts`; a **selected card/row also
  reveals its hover action buttons** (the keyboard cursor has no hover).
  **Kanban column headers are cursor targets**: each column is navigated as the
  list `[header, ...cards]`, so ↑ on the first card lands on the header and headers
  step ←/→ across columns (even empty ones); `selectedId` then holds a column id
  (distinct from task ids), which `Column` highlights via `useIsSelected`. **Shift+N
  / Enter** on a header (or Shift+N on any card) opens the new-card form targeting
  the cursor's column via `useUiStore.newColumnId`.
- **Persistence**: localStorage (`src/lib/storage.ts`) — chosen so `build:single`
  works from `file://`. No IndexedDB.
- **File sync** (Settings → Data → *Sync to a file*): links a JSON file via the
  **File System Access API** (`src/lib/fileSync.ts`) and **auto-saves** the whole
  dataset to it on every change (debounced, `src/hooks/useFileSyncWriter.ts`,
  mounted in `App`) so the user stops re-downloading exports. The handle is
  **in-memory/session-only** (persisting it needs IndexedDB, which we avoid — so
  re-link after a reload). `isFileSyncSupported()` is false on Firefox/Safari and
  the `file://` single-file build → UI falls back to Export. On link the file is
  read + compared to current data with the id/timestamp-independent
  `fingerprintPayload`/`payloadsEqual` (`src/lib/transfer.ts`); a difference shows a
  banner (`src/components/FileSyncSection.tsx`) to pick direction — load file→app
  (`importBoards(..,'replace')`) or overwrite the file with app data. Writes are
  serialized through one promise chain (manual + auto-save never overlap).
- **No dynamic `import()` / `React.lazy`** in feature code (single-file build needs one chunk).
- **Theme**: families × light/dark are `[data-theme]` blocks setting shadcn tokens;
  `dark:` keyed off `[data-mode="dark"]`. Theme prefs are separate localStorage keys
  read by the FOUC script in `index.html` (not in the Zustand blob).
- **App-shell layout**: the `<html>` frame never scrolls (`globals.css`
  `html { overflow: hidden }`); `App` is a fixed-height `h-dvh` flex column and
  the only document-style scroll lives on **`<main>`** (`flex-1 min-h-0
  overflow-y-auto`). Home/TODO scroll inside a centered `max-w-6xl` wrapper. The
  Kanban board fills `<main>` on md+ (`md:h-full`): board header fixed, the
  columns region scrolls **horizontally only** (scrollbar pinned to viewport
  bottom), and **vertical task overflow scrolls inside each `Column`**. Mobile:
  board flows naturally and `<main>` scrolls it. Heights are flex-derived — no
  `calc()`/magic numbers. The fit-to-viewport pane is gated by a **`tall`**
  height variant (`@media (min-height: 640px)`, with `short` inverse, in
  `globals.css`): on short/landscape viewports the board flows at natural height
  (columns get `short:md:min-h-[420px]`) instead of being crushed. Put new
  fit-to-height classes on `tall:`, not bare `md:`.
- **DnD** uses **@dnd-kit**. Sensors: `PointerSensor` (5px mouse threshold) +
  `TouchSensor` (220ms long-press, 6px tolerance — so a quick swipe scrolls but a
  hold picks up the card/row on touch) + `KeyboardSensor`. Kanban order lives in
  `taskIds` (filtered per column); the primitive is
  `moveTaskToColumn(taskId, columnId, beforeTaskId|null)`. "Done" column = `isDone` flag.
- **Bulk selection + list transforms**: a per-board, **ephemeral** selection set
  lives in `useUiStore` (`selectionMode`, `selectedTaskIds`, `selectorOpen`;
  cleared by `resetModals` on route change). Each list's **More** menu → **"Select
  tasks…"** opens the searchable `TaskSelectorDialog` (`src/features/selection/`);
  applying it turns on **selection mode**, which shows a checkbox on every
  card/row (`useSelectionMode`/`useIsTaskSelected` in `useSelection.ts`) and a
  **`SelectionToolbar`** (Select all · Search · **Move · Archive · Delete** ·
  Done). Esc exits selection mode (handled first in the keymap's Esc back-out).
  **Move** (`MoveToListDialog`) re-homes the selection onto another board via
  `moveTasksToBoard`. **List-item actions** come from the shared
  `useBoardListActions` hook (`src/features/boardActions/`, rendered on the Home
  `BoardCard` menu AND both board headers): **Clone** (`cloneBoard` — copy via the
  export→rekey path), **Merge into…** (`mergeBoardInto`, type-confirm `merge
  list`), **Convert to todo/kanban** (`convertBoard`, type-confirm `convert
  list`). Crossing board types, move/merge/convert all reconcile the two "done"
  representations — TODO `completed` ⇄ Kanban `isDone` column — via the
  `taskWasDone`/`doneColumnId` helpers. **Dialogs opened from a dropdown render
  OUTSIDE the menu** (a `Dialog` inside a closing `DropdownMenuContent` unmounts);
  `useBoardListActions` returns its menu `items` and `dialogs` separately for this.
- **Task view dialog** (`src/features/TaskDialog.tsx`): the unified view/edit modal
  opened via `useUiStore.editId` (Enter / clicking a card or its open button — an
  **eye / "view"** icon on the card/row, since the dialog opens read-only first). It
  opens **read-only** (`editMode` state, reset to `false` when the dialog
  **closes** so the next open paints read-only with no edit-form flash): the title
  is a heading, the description renders **Markdown** (see below), due date + labels
  show for reading, and **Status + Reminder stay LIVE controls in the read-only view**
  (the two most common quick edits — the `Select` and the `timeFirst` `DateTimePicker`,
  committing immediately), with the discussion thread below.
  **Shift+E** or the **Edit** button reveals the form. Unlike the read-only quick
  controls, the **edit form is a BUFFERED draft** (`react-hook-form`, `useForm` +
  `Controller` for the Select/pickers/`TagInput`): edits stay provisional and only
  **commit to the store on save** — the **Done editing** button or **⌘/Ctrl+Enter**
  (both call `saveEdit = form.handleSubmit(...)`). Entering edit `reset()`s the form
  from a `snapshotOf(task)`; `formState.isDirty` gates the discard prompts. The
  reminder asks for notification permission on **save** (not on each keystroke).
  **Shift+C** focuses the comment box (NoteThread exposes a `composeRef`).
  **⌘/Ctrl+Enter** is
  contextual — it **saves the draft** in edit mode and **closes** in read-only
  (skipped when a child already handled the chord, e.g. the note box submitting a
  comment via `e.defaultPrevented`). These
  shortcuts (⌘/Ctrl+Enter, Shift+E, Shift+C) are **modal-local** (`onKeyDown` on
  `DialogContent`, guarded against firing while typing) — NOT in `useGlobalKeymap`
  and NOT in the `keymap.ts` cheat sheet (only `f` hint mode reaches in from the
  global keymap).
  **Escape** is a two-step back-out in **both** views: the first Esc *steps out* of
  a focused field (`onEscapeKeyDown` blurs it to the `contentRef` — the live
  read-only controls and the buffered edit draft both survive a blur), and only a
  **second** Esc, with no field focused, acts on the view: **read-only closes**,
  while the **edit form cancels** — a "Discard changes?" confirm when the draft is
  dirty, else straight back to read-only. Closing while editing a dirty draft (the
  **X** / overlay) prompts the same discard confirm (`requestClose` checks
  `editMode && isDirty`).
  "Done editing" → save → read-only; "Done" → close. **Create** still uses the
  buffered `src/features/TaskFormDialog.tsx` (Add button). There is no separate
  notes dialog or `notesId` anymore.
- **Task notes/discussion**: each task carries a `notes: Note[]` thread (store
  actions `addNote`/`editNote`/`deleteNote`). The thread UI is
  `src/features/NoteThread.tsx`, rendered inside `TaskDialog`; notes commit
  immediately (not the form save/discard model) and report unsaved drafts up via
  `onUnsavedChange`. **Descriptions AND notes render a Markdown subset** —
  hand-rolled + dependency-free (lists, bold/italic, headings, inline code, fenced
  code blocks with a copy button, blockquotes, `[label](url)`; no images) via the
  pure parser `src/lib/markdown.ts` + renderer `src/components/Markdown.tsx`. It
  emits React elements (never `dangerouslySetInnerHTML` → no sanitizer needed),
  reuses `src/components/Linkify.tsx` for **bare-URL** autolinks inside text leaves,
  and scheme-guards explicit-link hrefs via `safeHref` (http/https/mailto/relative
  only — `javascript:`/`data:` become inert text). Editing stays a raw `<Textarea>`
  (the rendered form shows in the read-only description / un-edited notes); full
  Markdown also renders on Kanban cards + TODO rows. Keep the subset minimal — **no
  heavy md libs** (same single-file rationale as the hand-rolled date picker).
- **Due date & reminders**: tasks gained optional `dueAt`/`remindAt` (unix ms).
  Edited with the **dependency-free** shadcn-style `src/components/DateTimePicker.tsx`
  (Popover + hand-rolled calendar grid + native time input; pure helpers +
  tests in `src/lib/datetime.ts` — no react-day-picker/date-fns, keeps the
  single-file build clean). Due date is **calendar-first**; the Reminder picker
  passes **`timeFirst`** so the popover leads with the time input and the calendar
  stays collapsed behind a date disclosure (reminders are usually "at 9:00", the
  day secondary). Reminders fire via the **Web Notifications API**
  (`src/lib/notifications.ts`) driven by `src/hooks/useReminderScheduler.ts`
  (mounted in `App`, polls every 30s). It's **in-tab only** (no Service Worker /
  Push — those need https + can't run from `file://`), so it works in BOTH the
  served and single-file builds while the tab is open. The on/off pref is the
  `todokan:notifications-enabled` localStorage key (like the theme/vim prefs, NOT
  the persisted blob); permission is requested on the user gesture of setting a
  reminder or via the Settings toggle.
- **Home search** (`src/features/home/HomePage.tsx`) searches lists AND tasks
  across the whole app. `parseQuery` (`src/lib/search.ts`) understands a leading
  `type:task` / `type:list` filter (default = both) and the existing `#tag` prefix.
  Results are keyboard-navigable inline (↑/↓/Enter while the search box is
  focused); choosing a task sets `pendingSelectId` and navigates to its board.
- **App version** (Settings footer): injected at build time from `package.json` via
  `define: __APP_VERSION__` in `vite.config.ts` + `vitest.config.ts` → `src/lib/version.ts`.
- Path alias `@/` → `src/`. `import type` for types (`verbatimModuleSyntax`).

## Don't
Add CSS Modules / another styling system · add code-splitting · add a Service
Worker/Push or heavy date libs (react-day-picker/date-fns — keep the picker
hand-rolled, reminders in-tab) · commit `dist*`/`node_modules` · run builds or
commits unless asked.
