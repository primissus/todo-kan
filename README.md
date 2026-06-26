# todo-kan

A fast, local-first app for **TODO lists** and **Kanban boards**. Everything lives
in your browser — no accounts, no server. Build it as a normal static site, or as
a **single HTML file** you can open by double-clicking.

## Highlights

- 📋 **TODO lists** and 🗂️ **Kanban boards** side by side on one home screen.
- 🔍 **Search** across title, description, and tags — or type `#tag` to search tags only.
- 🧲 **Drag and drop** to reorder tasks, and to move Kanban cards between columns.
- 🗃️ **Archive** whole lists/boards or individual tasks — and bring them back.
- ⏰ **Due dates & reminders** with in-tab browser notifications.
- 💬 **Discussion threads** on any task, with linkified notes and descriptions.
- ⌨️ **Keyboard navigation** — an optional Vim-style cursor (j/k/h/l), `?` for the cheat sheet.
- 🎨 **Themes** (Default / Gruvbox / Nord …) with **light / dark / system** appearance.
- 💾 **Export / import** your data as JSON (pick exactly which lists to export).
- 🔗 **Sync to a file** — link a JSON file once and it auto-saves on every change
  (Chromium browsers; falls back to Export elsewhere).
- 🪶 Builds to a **single, self-contained HTML file** that works offline from `file://`.

## Quick start

```bash
pnpm install
pnpm dev          # open the printed localhost URL
```

### Build

```bash
pnpm build          # static site            → dist/
pnpm build:single   # one self-contained file → dist-single/index.html
```

Host `dist/` on any static host, or just open `dist-single/index.html` in a
browser — your data is saved locally in that browser.

## How to use

- **New** (top right of the home page) → create a TODO list or a Kanban board.
- Click a card to open it. It opens **read-only** (Markdown description + the
  discussion thread) — though you can change its **status** and **reminder** right
  there. Press **Edit** (or **Shift+E**) for the full form (title, description, due
  date, labels). **Shift+C** jumps to the comment box.
- **TODO**: add tasks, check them off, hide/show completed, drag to reorder,
  archive what you’re done with. "Clear" wipes the list (type `clear` to confirm).
- **Kanban**: configure columns (default *Pending / In Progress / Review / Done*),
  add cards, drag them within and across columns, "Archive done" in one click. With
  keyboard nav, the column headers are cursor targets too — ↑ from the first card,
  ←/→ across columns — and a new card inherits the column you’re on.
- **Settings** (gear, top right): theme & appearance, reminders, export, import,
  **sync to a file**, and a guarded "Clear all" (type `delete all tasks`).

## Tech

Vite · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Zustand · dnd-kit ·
Floating UI · Fuse.js · pnpm.

## Project docs

| File | What |
|------|------|
| [REQUIREMENTS.md](./REQUIREMENTS.md) | The spec + decisions |
| [PLAN.md](./PLAN.md) | Architecture as built |
| [PROGRESS.md](./PROGRESS.md) | Status & verification log |
| [AGENTS.md](./AGENTS.md) | Engineering guide & conventions |
| [CLAUDE.md](./CLAUDE.md) | Quick reference for Claude Code |

## Scripts

```bash
pnpm dev · build · build:single · preview · preview:single · typecheck · lint · test
```

## License

MIT
