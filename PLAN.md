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

## Routing

Tiny hash router (`src/lib/router.ts`): `#/` = home, `#/board/<id>` = board.
Deep links + back/forward that survive `file://`; no `react-router`.

## Keyboard navigation

Vim-style control layered on without disturbing the domain model:

- **Two stores.** `useAppStore` stays the persisted domain model. A second,
  **non-persisted** `src/store/useUiStore.ts` holds ephemeral nav state — the
  selection cursor, move-mode + an order snapshot for revert, and overlay/modal
  flags. This keeps cursor moves out of the persisted blob and lets cards
  subscribe to a primitive "am I selected?" (`src/hooks/useSelection.ts`) so a
  cursor move re-renders only the two affected cards.
- **One listener.** `src/hooks/useGlobalKeymap.ts` registers a single `window`
  `keydown` handler (mounted once in `App`), reading state via `getState()` and
  the route via a ref so it never re-registers. It owns the should-handle guard
  (skip while typing / while a dialog is open / for unregistered modifier combos;
  don't hijack Enter/Space on a focused control), cursor math, and move-mode.
  Selection never moves DOM focus, so it can't conflict with dnd-kit's keyboard
  sensor.
- **Reuses store primitives.** Move-mode relocates via `moveTaskToColumn` /
  `reorderTaskInBoard` / the new `reorderBoard`; Esc-revert restores the snapshot
  via `restoreTaskOrder` / `restoreBoardOrder`.
- **Overlays** (all statically imported — single-file safe): `CommandPalette`
  (`/` ⌘K Ctrl+K, reuses `lib/search`), `HelpDialog` (`?`, rendered from the
  declarative `src/lib/keymap.ts`), `HintOverlay` (`f`, Vimium hints from the pure
  `src/lib/hints.ts`, a `z-[100]` portal above the `z-50` dialogs).

## App version

`src/lib/version.ts` exposes `APP_VERSION` from the compile-time constant
`__APP_VERSION__`, injected via `define` in **both** `vite.config.ts` and
`vitest.config.ts` (read from `package.json`). Compile-time so the single-file
build inlines a literal — no runtime fetch/import of `package.json`. Shown in the
Settings footer.

## Verification

`pnpm test` (vitest) — store-logic suite + jsdom render/interaction. Also driven
end-to-end in real headless Chromium against the single-file `file://` build.
