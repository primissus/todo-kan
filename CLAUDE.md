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
- **State**: one Zustand store (`src/store/useAppStore.ts`) over a **normalized**
  model (`src/lib/types/domain.ts`): `boards` + flat `tasks` map + per-board
  `taskIds[]` as the single order source. All mutations are store actions; read via
  `src/store/selectors.ts`.
- **Persistence**: localStorage (`src/lib/storage.ts`) — chosen so `build:single`
  works from `file://`. No IndexedDB.
- **No dynamic `import()` / `React.lazy`** in feature code (single-file build needs one chunk).
- **Theme**: families × light/dark are `[data-theme]` blocks setting shadcn tokens;
  `dark:` keyed off `[data-mode="dark"]`. Theme prefs are separate localStorage keys
  read by the FOUC script in `index.html` (not in the Zustand blob).
- **Kanban DnD**: order lives in `taskIds` (filtered per column); the primitive is
  `moveTaskToColumn(taskId, columnId, beforeTaskId|null)`. "Done" column = `isDone` flag.
- Path alias `@/` → `src/`. `import type` for types (`verbatimModuleSyntax`).

## Don't
Add CSS Modules / another styling system · add code-splitting · commit
`dist*`/`node_modules` · run builds or commits unless asked.
