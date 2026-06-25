# todo-kan

A fast, local-first app for **TODO lists** and **Kanban boards**. Everything lives
in your browser — no accounts, no server. Build it as a normal static site, or as
a **single HTML file** you can open by double-clicking.

## Highlights

- 📋 **TODO lists** and 🗂️ **Kanban boards** side by side on one home screen.
- 🔍 **Search** across title, description, and tags — or type `#tag` to search tags only.
- 🧲 **Drag and drop** to reorder tasks, and to move Kanban cards between columns.
- 🗃️ **Archive** whole lists/boards or individual tasks — and bring them back.
- 🎨 **Themes** (Default / Gruvbox / Nord) with **light / dark / system** appearance.
- 💾 **Export / import** your data as JSON (pick exactly which lists to export).
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
- Click a card to open it. The title, description, and tags are editable inline.
- **TODO**: add tasks, check them off, hide/show completed, drag to reorder,
  archive what you’re done with. "Clear" wipes the list (type `clear` to confirm).
- **Kanban**: configure columns (default *Pending / In Progress / Review / Done*),
  add cards, drag them within and across columns, "Archive done" in one click.
- **Settings** (gear, top right): theme & appearance, export, import, and a guarded
  "Clear all" (type `delete all tasks`).

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
