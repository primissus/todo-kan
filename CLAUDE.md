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
  Help dialog — **keep the two in sync**. Cards read "am I selected?" via the
  granular selectors in `src/hooks/useSelection.ts`.
- **Persistence**: localStorage (`src/lib/storage.ts`) — chosen so `build:single`
  works from `file://`. No IndexedDB.
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
- **Task view dialog** (`src/features/TaskDialog.tsx`): the unified view/edit modal
  opened via `useUiStore.editId` (Enter / clicking a card or its open button). Its
  detail fields (title, description, status, due date, reminder, labels)
  **commit LIVE** to the store as you edit (no Save/Discard), and the discussion
  thread is embedded below. **Create** still uses the buffered
  `src/features/TaskFormDialog.tsx` (Add button). There is no separate notes
  dialog or `notesId` anymore.
- **Task notes/discussion**: each task carries a `notes: Note[]` thread (store
  actions `addNote`/`editNote`/`deleteNote`). The thread UI is
  `src/features/NoteThread.tsx`, rendered inside `TaskDialog`; notes commit
  immediately (not the form save/discard model) and report unsaved drafts up via
  `onUnsavedChange`. **Bare URLs** in descriptions AND notes render as links via
  the pure tokenizer `src/lib/linkify.ts` + `src/components/Linkify.tsx`.
- **Due date & reminders**: tasks gained optional `dueAt`/`remindAt` (unix ms).
  Edited with the **dependency-free** shadcn-style `src/components/DateTimePicker.tsx`
  (Popover + hand-rolled calendar grid + native time input; pure helpers +
  tests in `src/lib/datetime.ts` — no react-day-picker/date-fns, keeps the
  single-file build clean). Reminders fire via the **Web Notifications API**
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
