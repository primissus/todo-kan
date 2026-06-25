# Progress

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
