# Architecture

> Axis-specific view. The full as-built architecture is [PLAN.md](../PLAN.md);
> the engineering guide is [AGENTS.md](../AGENTS.md).

## In one sentence
A local-first SPA for multiple TODO lists and Kanban boards — all state lives in
the browser (localStorage), and it ships both as a static site and as one
self-contained HTML file that runs from `file://`.

## Stack
- Language / runtime: TypeScript (strict, `verbatimModuleSyntax`) on Vite 6,
  bundling for the browser. No server runtime.
- Main framework: React 19 (required — shadcn primitives are ref-as-prop).
- UI: Tailwind v4 (`@tailwindcss/vite`, no `tailwind.config.js`) + shadcn/ui on
  the unified `radix-ui` package; Floating UI for tag-autocomplete + tooltips;
  lucide-react icons; sonner toasts.
- State: Zustand v5 with `persist` + `immer`.
- Other libs: dnd-kit (drag and drop), Fuse.js (fuzzy search). Package manager: pnpm.
- Database: **none** — `localStorage` via the swappable boundary `src/lib/storage.ts`.
- External services: **none** (no backend, no accounts, no telemetry).

## Folder map
- `src/lib/` → pure, framework-free code: `types/domain.ts` (the normalized
  model), `storage.ts`/`storageKeys.ts`, `search.ts`, `datetime.ts`, `markdown.ts`,
  `linkify.ts`, `transfer.ts` (export/import + id re-keying), `fileSync.ts`,
  `router.ts`, `keymap.ts`, `hints.ts`, `theme.ts`, `notifications.ts`, `version.ts`.
- `src/store/` → `useAppStore.ts` (persisted domain model + all mutations),
  `useUiStore.ts` (non-persisted ephemeral UI/nav state), `selectors.ts`.
- `src/hooks/` → `useGlobalKeymap.ts`, `useSelection.ts`, `useTheme.ts`,
  `useReminderScheduler.ts`, `useFileSyncWriter.ts`, `useDebouncedValue.ts`.
- `src/components/ui/` → shadcn primitives (CLI-generated, avoid hand-editing);
  `src/components/` → shared widgets (dialogs, pickers, command palette, etc.).
- `src/features/` → `home/`, `todo/`, `kanban/`, `selection/` (bulk select/move),
  `boardActions/` (clone/merge/convert), plus shared `BoardHeader`/`TaskDialog`/etc.
- `src/styles/` → `globals.css`, `theme.css`. `src/test/` → vitest suites.

## Data flow
A hash route (`src/lib/router.ts`: `#/` home, `#/board/<id>`) drives `App.tsx`,
which renders `HomePage`, `TodoView`, or `KanbanView` (chosen by `board.type`).
Components **read** through `selectors.ts` hooks and **mutate** only through
`useAppStore` actions; `persist` writes the `boards`/`boardOrder`/`tasks` slice to
localStorage. Ephemeral cursor/selection/modal state lives in `useUiStore`. Two
mounted-in-`App` hooks run side effects: `useReminderScheduler` (polls for due
reminders → Web Notifications) and `useFileSyncWriter` (debounced auto-save to a
linked file).

## What does NOT exist (and should not be created)
- No backend / server / accounts / database — and no IndexedDB (breaks the
  `file://` single-file build; localStorage only).
- No code-splitting / `React.lazy` / dynamic `import()` (single-file build needs
  one JS chunk).
- No Service Worker / Push, and no heavy date libs (react-day-picker/date-fns) —
  the date picker is hand-rolled and reminders are in-tab.
- No CSS Modules / second styling system; no `react-router`.
