# Known issues (gotchas)

> The full list is [AGENTS.md](../AGENTS.md) "Gotchas". The high-value traps:

## A Dialog opened from a dropdown menu never stays open
- **Happens when:** you render a `<Dialog>` inside `DropdownMenuContent` and open it
  from a `DropdownMenuItem`.
- **Real cause:** selecting the item closes the menu, which **unmounts** the dialog
  with it.
- **Fix:** render the dialog as a **sibling** of the menu, controlled by state the
  item sets (see `BoardCard`'s delete and `useBoardListActions`' `items`/`dialogs` split).

## TS2345 "string is not assignable to TaskId" from a Set / `.includes()`
- **Happens when:** you build `new Set(taskIdArray)` (inferred `Set<TaskId>`) then call
  `.has(someString)`, or `taskIdArray.includes(plainString)`.
- **Real cause:** branded id types (`TaskId = string & {__brand}`) — a plain `string`
  isn't assignable to the brand.
- **Fix:** type the local array as `string[]` (e.g. `const ids: string[] = tasks.map(t => t.id)`).

## "Done" status lost when a task changes board type
- **Happens when:** moving/merging/converting a task between a TODO list and a Kanban board.
- **Real cause:** done-ness is the `completed` flag on todo but the `isDone` column on
  kanban — copying one verbatim drops the other.
- **Fix:** reconcile via `taskWasDone`/`doneColumnId` (already done in `moveTasksToBoard`,
  `mergeBoardInto`, `convertBoard` — keep any new re-homing action consistent).

## Global keyboard shortcuts silently stop working
- **Happens when:** a shortcut doesn't fire while typing, while a dialog is open, or
  under a modifier other than ⌘/Ctrl+K.
- **Real cause:** the guard in `hooks/useGlobalKeymap.ts` intentionally yields in those
  cases (driven by the actually-rendered dialog, not the `useUiStore` flags).
- **Fix:** that's by design. New shortcuts must respect it, and go in **both**
  `useGlobalKeymap.ts` and `lib/keymap.ts`.

## Theme flashes / wrong theme on first paint
- **Happens when:** you move theme prefs into the Zustand blob.
- **Real cause:** the inline FOUC script in `index.html` reads theme from its **own**
  localStorage keys (`theme-mode`/`theme-family`) before the bundle runs; dark mode is
  keyed off `[data-mode="dark"]` via `@custom-variant dark`, not `.dark`.
- **Fix:** keep theme prefs as separate localStorage keys in sync with `lib/theme.ts`.

## Things that look broken but are intentional
- `pnpm lint` reports **3 `react-refresh/only-export-components` warnings** in
  `components/ui/` — pre-existing in generated shadcn files; don't "fix" them.
- `pnpm build` prints a **">500 kB chunk" warning** — expected; the single-file build
  is deliberately one chunk.
