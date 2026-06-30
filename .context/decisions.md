# Decisions made

> Distilled from [REQUIREMENTS.md](../REQUIREMENTS.md) "Locked stack decisions" +
> "Interpretations chosen". Dates are mostly unknown from the repo alone and left
> `[PENDING]`; the "why/rejected" is the durable part.

## [PENDING: date] · localStorage, not IndexedDB
- **Decision:** persist everything to `localStorage` via the `lib/storage.ts` boundary.
- **Why:** the single-file build is opened from `file://`, where Chrome blocks
  IndexedDB but localStorage works; the data is small JSON.
- **Rejected:** IndexedDB (blocked from `file://`). The boundary stays swappable.
- **Status:** current. (File-sync keeps its file handle in memory only for the same reason.)

## [PENDING: date] · Tailwind v4 + shadcn/ui everywhere
- **Decision:** style exclusively with Tailwind v4 semantic tokens + shadcn primitives.
- **Why:** consistent theming via tokens; Radix accessibility; no per-component CSS.
- **Rejected:** CSS Modules (the original option) and any second styling system.
- **Status:** current (hard rule).

## [PENDING: date] · Single self-contained HTML build is a first-class target
- **Decision:** `pnpm build:single` inlines all JS+CSS into one `file://`-openable HTML.
- **Why:** zero-install distribution — double-click to run, data stays local.
- **Rejected:** anything that breaks one-chunk output — no dynamic `import()`/
  `React.lazy`, no Service Worker/Push, no heavy date libs (picker is hand-rolled).
- **Status:** current (hard rule).

## [PENDING: date] · Normalized model with `taskIds[]` as the single order source
- **Decision:** flat `tasks` map + per-board ordered `taskIds[]`; a Kanban column is
  `taskIds` filtered by `columnId`.
- **Why:** O(1) edits and one source of order for both list and board views.
- **Rejected:** nesting tasks under boards / per-column arrays (would duplicate order).
- **Status:** current.

## [PENDING: date] · `archived` is an orthogonal boolean, not a status
- **Decision:** `archived` is independent of `completed` (todo) and `columnId` (kanban).
- **Why:** unarchiving must restore a card to its original column/state.
- **Rejected:** folding archived into a status enum.
- **Status:** current.

## [PENDING: date] · Vim-style keyboard nav is opt-in
- **Decision:** letter motions/hints/Shift-combos are gated behind `vimEnabled` (off by
  default); only arrows/Enter/Esc/⌘K/?/`:` work otherwise.
- **Why:** don't surprise normal QWERTY users; power users opt in via `:q`↵.
- **Status:** current.

## 2026-06-29 · Cross-type "done" reconciliation for move/merge/convert
- **Decision:** when a task crosses board types, translate between the TODO
  `completed` flag and the Kanban `isDone` column (`taskWasDone`/`doneColumnId`).
- **Why:** a finished card must not silently become active (or land in Pending).
- **Rejected:** copying `completed` verbatim (loses Kanban done-ness, leaves stale flags).
- **Status:** current.
