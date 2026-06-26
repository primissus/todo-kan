# Progress

## 2026-06-26 — Links in descriptions + task note threads

- **Linkify**: bare URLs (`http(s)://`, `www.`) in task descriptions now render as
  new-tab links in both the TODO and Kanban views. Pure tokenizer in
  `src/lib/linkify.ts` (trailing-punctuation/balanced-bracket aware), rendered by
  `src/components/Linkify.tsx` (clicks/pointer-downs stop-propagated so a link in a
  draggable card opens instead of starting a drag).
- **Note threads**: tasks gained a `notes: Note[]` thread — add / edit / delete,
  each with timestamps and an "· edited" marker. Store actions `addNote` /
  `editNote` / `deleteNote`; opened per-task from a Notes button on each row/card
  (with a count badge) via `useUiStore.notesId` → `src/features/NotesDialog.tsx`.
  Note text is linkified too. Persist bumped to **v2** (migrate backfills `[]`);
  export/import re-keys notes with fresh ids.
- Tests: `linkify.test.ts` (10) + `notes.test.ts` (7) + render-level link/notes
  flow (add/edit/delete, no-op-save, edit-switch discard guard); **83/83** pass.
  `typecheck`, `lint`, `build`, `build:single` all green.
- Hardened via an adversarial multi-agent review: case-insensitive `www.` href,
  confirm-before-discarding an in-progress edit when switching notes, no flash of
  stale confirm copy during the close animation, per-note aria-labels, and a
  no-op Save no longer bumps `updatedAt`/the "edited" marker.

## 2026-06-25 — Initial build complete

All requirements in [REQUIREMENTS.md](./REQUIREMENTS.md) are implemented.

### Done
- Project scaffold: Vite 6 + React 19 + TS (strict) + Tailwind v4 + shadcn/ui + pnpm.
- Theming ported from vegapunk → shadcn token system (default / gruvbox / nord ×
  light/dark), inline FOUC script, light/dark/system appearance.
- Normalized domain model + Zustand store (`persist` → localStorage, immer).
- Core libs: `id`, `storage`, `search` (Fuse + `#tag`), `transfer` (export/import
  with id re-keying), `router` (hash).
- Home (search, create, board cards, archived boards view).
- TODO view: add/edit (confirm)/archive/unarchive, hide/show completed,
  drag-reorder, clear (type "clear").
- Kanban view: column settings, archive done, add/edit (confirm, status dropdown),
  reorder + cross-column drag, archive/unarchive, clear.
- Settings: theme + appearance, export (multi-select), import (merge/replace),
  clear-all (type "delete all tasks").
- Both build modes working: `pnpm build` (static) and `pnpm build:single`
  (one self-contained `dist-single/index.html`).

### Verification
- `pnpm typecheck` — clean.
- `pnpm lint` — 0 errors (3 stock shadcn fast-refresh warnings).
- `pnpm test` — **22/22** pass (store logic: cross-column moves, archive-done,
  import re-keying, search; jsdom render/interaction of the real views).
- Real headless Chromium against the single-file `file://` build: create board →
  set title → add task/card → toggle → drag card across columns → reload persists
  → dark-mode toggle. Zero console errors.

### Notes / possible future work
- Export JSON is the flat/normalized envelope (`{ boards: [], tasks: [] }`). A
  nested per-list shape was discussed and deferred.
- No cross-board "all archived tasks" view (archived tasks are per-board by
  design; archived boards are the global view on Home).
- Bundle is a single ~620 KB JS chunk by design (single-file build needs one
  chunk; no code-splitting / `React.lazy`).

## 2026-06-25 — Theming, layout, keyboard navigation

### Done
- Theme families expanded to match vegapunk: **default · gruvbox · solarized ·
  catppuccin · nord · github** (× light/dark), Gruvbox light = "soft" background.
  Palettes converted from vegapunk hex → shadcn oklch tokens.
- TaskFormDialog: real `<form>` so **Enter** saves from single-line inputs (title,
  empty chips); description keeps Enter for newlines (⌘/Ctrl+Enter submits).
- Kanban columns layout: full-bleed centered scroller, columns
  `clamp(288px, 22vw, 500px)`, vertical stacking on mobile, `20vw` scroll padding.
- **Vim-style keyboard navigation** (REQUIREMENTS §12): selection cursor
  (j/k/h/l + arrows), move-mode (`m` → relocate, Enter/Esc), `Enter` open/edit,
  `a` archive, Shift+A archived, Shift+C columns, Shift+N new, `/`·⌘K·Ctrl+K
  search palette, `f` Vimium hints, `?` help dialog + header button.
  New: `store/useUiStore.ts` (non-persisted), `hooks/useGlobalKeymap.ts`,
  `hooks/useSelection.ts`, `lib/keymap.ts`, `lib/hints.ts`,
  `components/{CommandPalette,HelpDialog,HintOverlay}.tsx`; store gained
  `reorderBoard` + `restoreTaskOrder`/`restoreBoardOrder`.
- Settings footer shows the app **version** (`__APP_VERSION__` injected from
  `package.json` at build, `lib/version.ts`). `package.json` at `0.1.0`.

### Verification
- `pnpm typecheck` — clean. `pnpm lint` — 0 errors (3 stock shadcn warnings).
- `pnpm test` — **52/52** pass (added `keymap.test.tsx`, `hints.test.ts`,
  `uiStore.test.ts`).
- `pnpm build` + `pnpm build:single` — both succeed; version literal inlined.
- Multi-agent adversarial review of the keyboard feature → 20 confirmed findings
  fixed: stale-modal-flag keymap deadlock (guard now keys off the rendered dialog
  + reset on route change), Enter-with-focused-button, CapsLock nav, palette
  scroll-into-view + listbox roles + hidden-completed filtering, home cursor
  honoring the search filter, move-mode banner + sr-only announcements, and the
  test-coverage gaps above.

## 2026-06-25 — Keyboard & modal UX pass

### Done
- **Vim keys are now opt-in** (`useUiStore.vimEnabled`, off by default, persisted
  to `todokan:vim-enabled`). New bottom-left **command line**
  (`components/CommandLine.tsx`): `:` opens it, `:q`↵ toggles Vim keys, with a
  mode indicator. `useGlobalKeymap.handleKey` split into always-available (arrows,
  Enter, Esc, ⌘K/Ctrl+K, `?`, `:`) vs Vim-gated (j/k/h/l, `m`, `a`, `f`, `/`,
  Shift-combos).
- **Shift+D** deletes the selected task behind a destructive **confirm** (`deleteId`
  in `useUiStore`; exported `deleteTaskWithCursor` lands the cursor on a neighbour,
  rendered by both board views).
- **Edit Save no longer confirms**; instead closing a **dirty** task form (Esc /
  outside / X / Cancel) prompts to discard unsaved input (req 10.6 / 11.7 updated).
- **Esc** on a board clears the cursor, then backs out to **Home**.
- **Archived-tasks drawer is keyboard-navigable** — local cursor (arrows always,
  `j`/`k` with Vim on), Enter/`u` restore, Del/Backspace delete, selection ring +
  `listbox`/`option` roles.
- **Help dialog renders shortcuts for the active mode** (`visibleBindings`) and
  shows a live Vim ON/OFF banner; `lib/keymap.ts` gained `vimOnly`/`vimKeys`
  metadata + the `visibleBindings` helper.

### Verification
- `pnpm typecheck` — clean. `pnpm lint` — 0 errors (3 stock shadcn warnings).
- `pnpm test` — **62/62** pass (added Vim gating/toggle, Shift+D confirm,
  archived-drawer nav, Esc→Home, and discard-guard cases; new `keymapTable.test.ts`).
- `pnpm build` + `pnpm build:single` — both succeed.
