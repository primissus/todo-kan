# Requirements

The original specification for **todo-kan**, plus the locked decisions and the
interpretations chosen where the spec left room. Every item below is
implemented — see [PROGRESS.md](./PROGRESS.md) for verification.

## Product

A web app that can be **statically generated** to create and manage multiple
**TODO lists** and **Kanban boards**, persisted in the browser.

1. **Home page** — a list of all lists/boards.
2. Create a **TODO list** or a **Kanban board**.
3. **Search bar** with fuzzy find across title, description, or tags.
4. **`#tag`** queries search tags only.
5. **Archive** whole lists/boards.
6. A button to **view archived** lists/boards; able to **unarchive**.
7. **General settings** button at the top:
   1. **Theme selector** (dropdown) using the vegapunk theming logic.
   2. **Appearance**: light / dark / system.
   3. **Clear all** — must type `delete all tasks` to confirm.
   4. **Export** → JSON, with a selection list (incl. select-all) of which lists/boards to export.
   5. **Import** → import multiple lists.
   6. Shows the app **version** at the bottom (read from `package.json` at build time).
8. Whole site builds statically with **`pnpm build`**.
9. Whole site builds to a **single HTML file** with **`pnpm build:single`**.

### TODO list (10)
1. General title, description, tags (chips).
2. An "add" CTA button (plus icon).
3. Button to hide/show completed tasks.
4. New-task form: title, description, labels (chips).
5. Tasks can be edited.
6. Editing goes through a **confirm modal**.
7. A "clear" button with a confirmation modal requiring the word **`clear`**.
8. Tasks can be **drag-and-drop reordered**.
9. Tasks can be archived; a button shows archived; archived can be unarchived.

### Kanban board (11)
1. General title, description, labels (chips).
2. A settings form to define **columns** (default: Pending, In Progress, Review, Done).
3. A button to **archive all Done** cards.
4. An "add" CTA button (plus icon).
5. New-task form: title, description, **status (column)**, labels (chips).
6. Tasks can be edited.
7. Editing goes through a **confirm modal**.
8. The edit modal contains a **dropdown to change status (column)**.
9. Tasks can be **reordered vertically** and **moved across columns** via drag-and-drop.
10. A "clear" button with a confirmation modal requiring the word **`clear`**.
11. Tasks can be archived; a button shows archived; archived can be unarchived.

### Keyboard navigation (12)

Vim-style keyboard control, available across the app (added after the initial spec).

1. **`j` / `k` / `h` / `l` and arrow keys** move a **selection cursor**. Kanban:
   `j`/`k` within a column, `h`/`l` between columns. TODO: `j`/`k` between rows.
   Home: across list/board cards.
2. **`m`** picks up the selected item to **move** it; `j`/`k`/`h`/`l`/arrows
   relocate it live, **Enter** drops it, **Esc** snaps it back. Works for Kanban
   cards (reorder + change column), TODO rows (reorder), and Home cards (reorder).
3. **Enter** opens the selected item — edit a task, or open a board from Home.
4. **`a`** archives the selected item (and advances the cursor).
5. **Shift+A** toggles archived — the per-board archived drawer, or "show archived"
   on Home.
6. **Shift+C** opens the Kanban columns settings.
7. **Shift+N** creates a new task/card (in a board) or a new list (on Home).
8. **`/`**, **⌘K**, **Ctrl+K** open a **search palette** over the current board's
   tasks (lists/boards on Home); choosing a result jumps the cursor to it.
9. **`f`** enters **hint mode** (Vimium-style) — type the label over any clickable
   element to activate it.
10. **`?`** opens a **help dialog** listing every shortcut; a header button opens it too.
11. Shortcuts are ignored while typing in a field or while a dialog is open.

## Locked stack decisions

- **Vite + React + TypeScript + pnpm.**
- **Tailwind CSS v4 + shadcn/ui everywhere** (no CSS Modules) — chosen over the
  original "CSS Modules" option.
- **localStorage** (not IndexedDB) — the single-file build is opened from
  `file://`, where Chrome blocks IndexedDB but localStorage works; data is small
  JSON. The storage boundary is swappable.
- **dnd-kit** for drag-and-drop (neither Floating UI nor shadcn provides DnD).
- **Floating UI** for the tag-autocomplete combobox + tooltips; Radix-based
  shadcn handles dialogs/menus/selects.
- **Fuse.js** for fuzzy search.
- Theming **ported from `vegapunk/docs-web-app`**, adapted to drive shadcn tokens.

## Interpretations chosen

- **Archived tasks are per-board** — `archived` is a boolean flag on each task,
  scoped to its board, surfaced via a per-board "Archived" drawer. Archived
  **boards** are the cross-app view on Home (req 5/6). `archived` is orthogonal
  to `completed` (todo) and `columnId` (kanban), so unarchiving always restores a
  card to its original column.
- **`showCompleted` is per-list** (lives on the board), matching req 10.3.
- **Removing a column** reassigns its orphaned cards to the first column.
- **"Done" column** is marked by an `isDone` flag so "Archive done" is robust to
  renaming/reordering columns.
