# Glossary & entities

> Domain shapes live in `src/lib/types/domain.ts`.

## Domain terms
- **List / board** → the same struct (`Board`), discriminated by `type`. "TODO
  list" = `type:'todo'`; "Kanban board" = `type:'kanban'`. UI often says "list".
- **`taskIds[]`** → a board's ordered array of all its task ids — the **single
  source of order** for both list rows and (filtered by `columnId`) Kanban columns.
- **`completed`** → done-ness on a **TODO** task (a checkbox). Ignored on Kanban.
- **`isDone` column** → done-ness on a **Kanban** board is positional: a card is
  "done" when its `columnId` is the column flagged `isDone` (default: "Done").
- **`archived`** → orthogonal hide flag on a task or board; restorable.
- **Cursor (`selectedId`)** → the keyboard-navigation focus (a task id, board id, or
  Kanban column-header id). Distinct from bulk selection.
- **Selection mode (`selectionMode` + `selectedTaskIds`)** → bulk-select tasks via
  checkboxes for Move/Archive/Delete.
- **Move-mode** → "pick up" the cursor item and relocate it live (`m`, Enter drops, Esc reverts).
- **`pendingSelectId`** → a task to focus after the next route change (Home search → board).
- **f-hint mode** → Vimium-style: press `f`, type a label over any clickable element.

## Main entities
- **Board** → `{ id, type:'todo'|'kanban', title, description, tags[], columns[]
  (kanban; [] for todo), taskIds[], showCompleted, archived, createdAt, updatedAt }`.
- **Task** → `{ id, boardId, title, description, tags[], completed, columnId|null,
  archived, notes[], dueAt?, remindAt?, createdAt, updatedAt }`.
- **Column** (kanban) → `{ id, title, order, isDone? }`.
- **Note** → a task's threaded comment `{ id, text, createdAt, updatedAt }`.

## Acronyms & internal names
- **`useAppStore`** → persisted domain store (all mutations). **`useUiStore`** →
  non-persisted ephemeral UI/nav store.
- **rekey / buildExport** (`lib/transfer.ts`) → regenerate all ids when importing/
  cloning so copies never collide.
- **FOUC script** → the inline `index.html` script that applies theme prefs before
  the bundle loads (theme prefs are separate localStorage keys, not the Zustand blob).
- **`build:single`** → the one-HTML-file build (`SINGLE_FILE=1`).
