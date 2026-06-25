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
  (`src/store/useUiStore.ts`): the selection cursor, move-mode, and overlay/modal
  flags. Never put domain data here, and never put cursor/overlay state in the
  persisted store.
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
- **Kanban DnD**: order lives in `taskIds` (filtered per column); the primitive is
  `moveTaskToColumn(taskId, columnId, beforeTaskId|null)`. "Done" column = `isDone` flag.
- **App version** (Settings footer): injected at build time from `package.json` via
  `define: __APP_VERSION__` in `vite.config.ts` + `vitest.config.ts` → `src/lib/version.ts`.
- Path alias `@/` → `src/`. `import type` for types (`verbatimModuleSyntax`).

## Don't
Add CSS Modules / another styling system · add code-splitting · commit
`dist*`/`node_modules` · run builds or commits unless asked.
