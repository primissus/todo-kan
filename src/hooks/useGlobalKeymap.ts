// The single global keyboard handler. Mounted once in App. It owns:
//   - the should-handle guard (ignore keys while typing or while a dialog owns them),
//   - cursor movement (j/k/h/l + arrows) over the current view's items,
//   - actions (Enter / a / Shift+A / Shift+C / Shift+D / Shift+N / m / / · ⌘K · f · ?),
//   - move-mode relocation (live, via existing store actions) + Esc revert,
//   - the `:` command line opener (toggles Vim keys via `:q` ↵).
//
// Vim keys are OPT-IN (ui.vimEnabled, off by default). When off, only the
// "simple" keys fire: arrows (move), Enter (open), Esc (clear), ⌘K (search),
// `?` (help) and `:` (command line). The letter motions, hints and Shift combos
// are gated behind the mode so a normal QWERTY user never triggers them.
//
// State reads go through getState() (not hooks) so the listener registers once and
// always sees fresh data; only the route is tracked via a ref. The HelpDialog
// reflects these bindings from lib/keymap.ts — keep the two in sync.

import { useEffect, useRef } from 'react';
import { goBoard, goHome, useRoute, type Route } from '@/lib/router';
import { filterBySearch } from '@/lib/search';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore, type UiState } from '@/store/useUiStore';
import type { Board, ColumnId, Task } from '@/lib/types/domain';

type Dir = 'up' | 'down' | 'left' | 'right';
type Ctx = 'home' | 'kanban' | 'todo';

type TaskMap = Record<string, Task>;

function dirFromKey(key: string): Dir | null {
  // Lower-case single chars so CapsLock ('J') still navigates; arrow keys
  // ('ArrowDown', …) are multi-char and pass through unchanged.
  const k = key.length === 1 ? key.toLowerCase() : key;
  switch (k) {
    case 'j':
    case 'ArrowDown':
      return 'down';
    case 'k':
    case 'ArrowUp':
      return 'up';
    case 'h':
    case 'ArrowLeft':
      return 'left';
    case 'l':
    case 'ArrowRight':
      return 'right';
    default:
      return null;
  }
}

function contextFor(route: Route): Ctx {
  if (route.name === 'home') return 'home';
  const b = useAppStore.getState().boards[route.id];
  return b?.type === 'kanban' ? 'kanban' : 'todo';
}

/** True when the cursor is on a Kanban column header (selectedId === a column id). */
function isKanbanHeader(route: Route, sel: string | null): boolean {
  if (route.name !== 'board' || !sel) return false;
  const b = useAppStore.getState().boards[route.id];
  return !!b && b.type === 'kanban' && b.columns.some((c) => c.id === sel);
}

/** The Kanban column the cursor is "in": the header's own column, or a card's
 *  column. null when nothing relevant is selected (→ defaults to first column). */
function currentKanbanColumnId(route: Route, sel: string | null): ColumnId | null {
  if (route.name !== 'board' || !sel) return null;
  const app = useAppStore.getState();
  const board = app.boards[route.id];
  if (!board) return null;
  if (board.columns.some((c) => c.id === sel)) return sel as ColumnId;
  return app.tasks[sel]?.columnId ?? null;
}

/** Sorted columns, each with its visible (non-archived) task ids in board order. */
function kanbanColumns(
  board: Board,
  tasks: TaskMap,
): { id: ColumnId; ids: string[] }[] {
  const cols = board.columns.slice().sort((a, b) => a.order - b.order);
  return cols.map((c) => ({
    id: c.id,
    ids: board.taskIds.filter((tid) => {
      const t = tasks[tid];
      return !!t && !t.archived && t.columnId === c.id;
    }),
  }));
}

/** Visible todo rows in order (non-archived, respecting showCompleted). */
function todoVisibleIds(board: Board, tasks: TaskMap): string[] {
  return board.taskIds.filter((tid) => {
    const t = tasks[tid];
    if (!t || t.archived) return false;
    return board.showCompleted ? true : !t.completed;
  });
}

/**
 * Boards the Home cursor can land on: active (non-archived) boards in order,
 * filtered by the same search query the grid shows — so the cursor never selects
 * a board that's been filtered off-screen.
 */
function activeBoardIds(): string[] {
  const s = useAppStore.getState();
  const active = s.boardOrder
    .map((id) => s.boards[id])
    .filter((b): b is Board => !!b && !b.archived);
  const query = useUiStore.getState().homeQuery;
  return filterBySearch(active, query).map((b) => b.id);
}

/** After removing `id`, which sibling should the cursor land on? */
function neighborAfterRemoval(list: string[], id: string): string | null {
  const i = list.indexOf(id);
  if (i < 0) return null;
  return list[i + 1] ?? list[i - 1] ?? null;
}

// ---- cursor movement ------------------------------------------------------

function selectLinear(
  list: string[],
  sel: string | null,
  dir: Dir,
  ui: UiState,
): void {
  if (list.length === 0) return;
  const i = sel ? list.indexOf(sel) : -1;
  if (i < 0) {
    ui.setSelected(list[0]);
    return;
  }
  const delta = dir === 'down' || dir === 'right' ? 1 : -1;
  const ni = i + delta;
  if (ni >= 0 && ni < list.length) ui.setSelected(list[ni]);
}

function selectKanban(
  cols: { id: ColumnId; ids: string[] }[],
  sel: string | null,
  dir: Dir,
  ui: UiState,
): void {
  // Each column is a vertical list whose FIRST item is the column header (so the
  // cursor can sit on a header — the row above the first card — and headers are
  // reachable even in empty columns). Header id === column id; cards follow.
  const lists = cols.map((c) => [c.id as string, ...c.ids]);

  let ci = -1;
  let ri = -1;
  for (let i = 0; i < lists.length; i++) {
    const j = sel ? lists[i].indexOf(sel) : -1;
    if (j >= 0) {
      ci = i;
      ri = j;
      break;
    }
  }

  // Nothing selected yet → land on the first card (or the first header if the
  // board has no cards at all) so the cursor always has somewhere to go.
  if (ci < 0) {
    for (const c of cols) {
      if (c.ids.length) {
        ui.setSelected(c.ids[0]);
        return;
      }
    }
    if (lists.length) ui.setSelected(lists[0][0]);
    return;
  }

  if (dir === 'down') {
    if (ri + 1 < lists[ci].length) ui.setSelected(lists[ci][ri + 1]);
    return;
  }
  if (dir === 'up') {
    if (ri - 1 >= 0) ui.setSelected(lists[ci][ri - 1]);
    return;
  }
  // left / right: step exactly one column, keeping the row (clamped) — so a
  // shorter/empty neighbour lands you on its nearest item (its header if empty).
  const ni = ci + (dir === 'left' ? -1 : 1);
  if (ni >= 0 && ni < lists.length) {
    const target = lists[ni];
    ui.setSelected(target[Math.min(ri, target.length - 1)]);
  }
}

function moveCursor(ctx: Ctx, route: Route, dir: Dir): void {
  const app = useAppStore.getState();
  const ui = useUiStore.getState();
  const sel = ui.selectedId;
  if (ctx === 'home') {
    selectLinear(activeBoardIds(), sel, dir, ui);
    return;
  }
  if (route.name !== 'board') return;
  const board = app.boards[route.id];
  if (!board) return;
  if (ctx === 'todo') selectLinear(todoVisibleIds(board, app.tasks), sel, dir, ui);
  else selectKanban(kanbanColumns(board, app.tasks), sel, dir, ui);
}

// ---- actions --------------------------------------------------------------

function archiveSelected(ctx: Ctx, route: Route, id: string): void {
  const app = useAppStore.getState();
  const ui = useUiStore.getState();
  if (ctx === 'home') {
    const next = neighborAfterRemoval(activeBoardIds(), id);
    app.archiveBoard(id);
    ui.setSelected(next);
    return;
  }
  if (route.name !== 'board') return;
  const board = app.boards[route.id];
  if (!board) return;
  const list =
    ctx === 'kanban'
      ? kanbanColumns(board, app.tasks).find((c) => c.ids.includes(id))?.ids ?? []
      : todoVisibleIds(board, app.tasks);
  // Kanban: if this was the column's last card, fall back to its (now-empty)
  // header so the cursor stays in the same column (read columnId before mutating).
  const fallback = ctx === 'kanban' ? app.tasks[id]?.columnId ?? null : null;
  const next = neighborAfterRemoval(list, id) ?? fallback;
  app.archiveTask(id);
  ui.setSelected(next);
}

/** Permanently delete a task and land the cursor on a neighbour. Exported so the
 *  Shift+D confirm dialog (rendered by the board views) runs it on confirm.
 *  Tasks only — boards are deleted (with confirm) from their Home card. */
export function deleteTaskWithCursor(
  boardId: string,
  ctx: 'kanban' | 'todo',
  id: string,
): void {
  const app = useAppStore.getState();
  const ui = useUiStore.getState();
  const board = app.boards[boardId];
  if (!board) return;
  const list =
    ctx === 'kanban'
      ? kanbanColumns(board, app.tasks).find((c) => c.ids.includes(id))?.ids ?? []
      : todoVisibleIds(board, app.tasks);
  // Kanban: deleting a column's last card lands the cursor on its header (read
  // columnId BEFORE deleteTask removes the task).
  const fallback = ctx === 'kanban' ? app.tasks[id]?.columnId ?? null : null;
  const next = neighborAfterRemoval(list, id) ?? fallback;
  app.deleteTask(id);
  ui.setSelected(next);
}

function beginMove(ctx: Ctx, route: Route, id: string): void {
  const app = useAppStore.getState();
  const ui = useUiStore.getState();
  if (ctx === 'home') {
    ui.beginMove({
      kind: 'board',
      id,
      boardId: null,
      originColumnId: null,
      originOrder: app.boardOrder.slice(),
    });
    return;
  }
  if (route.name !== 'board') return;
  const board = app.boards[route.id];
  const task = app.tasks[id];
  if (!board || !task) return;
  ui.beginMove({
    kind: 'task',
    id,
    boardId: route.id,
    originColumnId: task.columnId,
    originOrder: board.taskIds.slice(),
  });
}

// ---- move-mode relocation -------------------------------------------------

function relocateBoard(id: string, dir: Dir): void {
  const app = useAppStore.getState();
  const list = activeBoardIds();
  const i = list.indexOf(id);
  if (i < 0) return;
  const delta = dir === 'down' || dir === 'right' ? 1 : -1;
  const ni = i + delta;
  if (ni >= 0 && ni < list.length) app.reorderBoard(id, list[ni]);
}

function relocateTodo(boardId: string, id: string, dir: Dir): void {
  if (dir === 'left' || dir === 'right') return;
  const app = useAppStore.getState();
  const board = app.boards[boardId];
  if (!board) return;
  const list = todoVisibleIds(board, app.tasks);
  const i = list.indexOf(id);
  if (i < 0) return;
  if (dir === 'down' && i + 1 < list.length)
    app.reorderTaskInBoard(boardId, id, list[i + 1]);
  if (dir === 'up' && i - 1 >= 0)
    app.reorderTaskInBoard(boardId, id, list[i - 1]);
}

function relocateKanban(boardId: string, id: string, dir: Dir): void {
  const app = useAppStore.getState();
  const board = app.boards[boardId];
  if (!board) return;
  const cols = kanbanColumns(board, app.tasks);
  const ci = cols.findIndex((c) => c.ids.includes(id));
  if (ci < 0) return;
  const ids = cols[ci].ids;
  const ri = ids.indexOf(id);
  if (dir === 'down') {
    if (ri + 1 < ids.length) app.moveTaskToColumn(id, cols[ci].id, ids[ri + 2] ?? null);
  } else if (dir === 'up') {
    if (ri - 1 >= 0) app.moveTaskToColumn(id, cols[ci].id, ids[ri - 1]);
  } else {
    const ti = ci + (dir === 'left' ? -1 : 1);
    if (ti >= 0 && ti < cols.length) {
      app.moveTaskToColumn(id, cols[ti].id, cols[ti].ids[ri] ?? null);
    }
  }
}

function cancelMove(): void {
  const ui = useUiStore.getState();
  const app = useAppStore.getState();
  const snap = ui.moveSnapshot;
  if (snap) {
    if (snap.kind === 'board') app.restoreBoardOrder(snap.originOrder);
    else if (snap.boardId)
      app.restoreTaskOrder(
        snap.boardId,
        snap.originOrder,
        snap.id,
        snap.originColumnId,
      );
  }
  ui.endMove();
}

function handleMoveMode(e: KeyboardEvent, route: Route): void {
  const ui = useUiStore.getState();
  if (e.key === 'Enter') {
    e.preventDefault();
    ui.endMove();
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    cancelMove();
    return;
  }
  const dir = dirFromKey(e.key);
  if (!dir) return;
  e.preventDefault();
  const snap = ui.moveSnapshot;
  if (!snap) return;
  if (snap.kind === 'board') {
    relocateBoard(snap.id, dir);
    return;
  }
  if (route.name !== 'board') return;
  if (contextFor(route) === 'kanban') relocateKanban(route.id, snap.id, dir);
  else relocateTodo(route.id, snap.id, dir);
}

// ---- guard + dispatch -----------------------------------------------------

/** True when focus is in a text field — letter shortcuts must yield to typing. */
function isEditableTarget(): boolean {
  const ae = document.activeElement as HTMLElement | null;
  const tag = ae?.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    !!ae?.isContentEditable
  );
}

function shouldHandle(e: KeyboardEvent, ui: UiState): boolean {
  if (isEditableTarget()) return false;
  const ae = document.activeElement as HTMLElement | null;
  // Drive this off the ACTUALLY-rendered dialog, not the ui flags: a stale flag
  // (e.g. editId left set after navigating away) must never wedge the keymap.
  // Every overlay we own (palette/help/new/edit/archived/columns) and the shared
  // dialogs (Settings/Confirm/TypeToConfirm/Export/Import) render a Radix dialog
  // with [data-state="open"] while visible.
  if (document.querySelector('[data-slot="dialog-content"][data-state="open"]')) {
    return false;
  }
  // Only ⌘/Ctrl+K is a registered combo; leave every other modified key alone.
  if (e.metaKey || e.ctrlKey || e.altKey) {
    return !e.altKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
  }
  // Let Enter/Space activate a focused button/link natively — but ONLY when there
  // is no keyboard selection. Otherwise "select a card, press Enter" would be
  // swallowed whenever a button still holds focus (common after a click / dialog
  // close, since selection never moves DOM focus).
  if (
    !ui.selectedId &&
    ae &&
    typeof ae.matches === 'function' &&
    ae.matches('button, [role="button"], a[href], summary')
  ) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') return false;
  }
  return true;
}

function handleKey(e: KeyboardEvent, route: Route): void {
  const ui = useUiStore.getState();

  if (ui.moveMode) {
    handleMoveMode(e, route);
    return;
  }
  // HintOverlay installs its own capture-phase listener; don't double-handle.
  if (ui.hintsActive) return;

  // `f` hint mode is reachable even while a dialog is open (Vimium-style), so the
  // task form / task dialog can be navigated and triggered by hint — but never
  // while the user is typing in a field. (Every other key stays gated by
  // shouldHandle below, which bails when a dialog owns the keyboard.)
  if (
    ui.vimEnabled &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.altKey &&
    !e.shiftKey &&
    e.key.toLowerCase() === 'f' &&
    !isEditableTarget()
  ) {
    e.preventDefault();
    ui.setHintsActive(true);
    return;
  }

  if (!shouldHandle(e, ui)) return;

  const ctx = contextFor(route);
  const key = e.key;
  const lower = key.toLowerCase();
  const mod = e.metaKey || e.ctrlKey;

  // ---- Always available (Vim on or off) -----------------------------------
  // `:` opens the bottom-left command line — this is how Vim keys get toggled
  // (`:q` ↵), so it must never be gated behind the very mode it switches.
  if (key === ':') {
    e.preventDefault();
    ui.openCmdline();
    return;
  }
  // ⌘/Ctrl+K is a standard palette chord; `?` opens Help. Both stay available.
  if (mod && lower === 'k') {
    e.preventDefault();
    ui.setPaletteOpen(true);
    return;
  }
  if (key === '?') {
    e.preventDefault();
    ui.setHelpOpen(true);
    return;
  }
  if (key === 'Escape') {
    // Escalating back-out: leave bulk-selection mode first, then clear the
    // cursor, then leave the board for Home.
    if (ui.selectionMode) {
      e.preventDefault();
      ui.exitSelectionMode();
    } else if (ui.selectedId) {
      e.preventDefault();
      ui.setSelected(null);
    } else if (route.name === 'board') {
      e.preventDefault();
      goHome();
    }
    return;
  }
  // Enter opens the selected item; arrow keys move the cursor — the "simple"
  // shortcuts that work without Vim.
  if (key === 'Enter') {
    if (!ui.selectedId) return;
    e.preventDefault();
    if (ctx === 'home') goBoard(ui.selectedId);
    // A column header has no card to open — Enter adds a card to that column.
    else if (isKanbanHeader(route, ui.selectedId)) {
      ui.setNewColumnId(ui.selectedId as ColumnId);
      ui.setNewOpen(true);
    } else ui.setEditId(ui.selectedId);
    return;
  }
  if (key.startsWith('Arrow')) {
    const dir = dirFromKey(key);
    if (dir) {
      e.preventDefault();
      moveCursor(ctx, route, dir);
    }
    return;
  }

  // ---- Vim motions (only when enabled) ------------------------------------
  if (!ui.vimEnabled) return;

  if (key === '/') {
    e.preventDefault();
    ui.setPaletteOpen(true);
    return;
  }
  // (`f` hint mode is handled earlier so it also fires over an open dialog.)

  // Shift combos
  if (lower === 'n' && e.shiftKey) {
    e.preventDefault();
    if (ctx === 'home') goBoard(useAppStore.getState().createBoard('todo'));
    else {
      // New card inherits the cursor's column (header or card); else first column.
      if (ctx === 'kanban') {
        ui.setNewColumnId(currentKanbanColumnId(route, ui.selectedId));
      }
      ui.setNewOpen(true);
    }
    return;
  }
  if (lower === 'a' && e.shiftKey) {
    e.preventDefault();
    if (ctx === 'home') ui.toggleHomeShowArchived();
    else ui.setArchivedOpen(!ui.archivedOpen);
    return;
  }
  if (lower === 'c' && e.shiftKey) {
    if (ctx === 'kanban') {
      e.preventDefault();
      ui.setKanbanColumnsOpen(true);
    }
    return;
  }
  if (lower === 'd' && e.shiftKey) {
    // Tasks only (Home board cards own their own confirmed delete; a column header
    // is not deletable here). Opens a confirm dialog — the board view runs
    // deleteTaskWithCursor on confirm.
    if (ctx === 'home' || !ui.selectedId || isKanbanHeader(route, ui.selectedId))
      return;
    e.preventDefault();
    ui.setDeleteId(ui.selectedId);
    return;
  }
  // No other shift combo is bound — don't hijack the browser's.
  if (e.shiftKey) return;

  // Selection-scoped actions (a column header isn't archivable/movable).
  if (lower === 'a') {
    if (!ui.selectedId || isKanbanHeader(route, ui.selectedId)) return;
    e.preventDefault();
    archiveSelected(ctx, route, ui.selectedId);
    return;
  }
  if (lower === 'm') {
    if (!ui.selectedId || isKanbanHeader(route, ui.selectedId)) return;
    e.preventDefault();
    beginMove(ctx, route, ui.selectedId);
    return;
  }

  // j/k/h/l (arrow keys are handled in the always-available block above).
  const dir = dirFromKey(key);
  if (dir) {
    e.preventDefault();
    moveCursor(ctx, route, dir);
  }
}

export function useGlobalKeymap(): void {
  const route = useRoute();
  const routeRef = useRef<Route>(route);
  routeRef.current = route;

  // The cursor + any open modal are per-view: reset them when navigating between
  // boards / home, so a stale editId/newOpen/etc. can't re-open or wedge keys
  // after a browser Back/Forward.
  const routeKey = route.name === 'board' ? `board:${route.id}` : 'home';
  useEffect(() => {
    const ui = useUiStore.getState();
    // A Home search result that targets a task on another board stashes its id in
    // `pendingSelectId` and navigates; apply it here (after the reset) so the
    // destination view scrolls to / highlights that task on arrival.
    ui.setSelected(ui.pendingSelectId ?? null);
    ui.setPendingSelect(null);
    if (ui.moveMode) ui.endMove();
    ui.resetModals();
  }, [routeKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => handleKey(e, routeRef.current);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
