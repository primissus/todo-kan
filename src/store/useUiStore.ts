// Ephemeral UI / keyboard-navigation state. Deliberately a SEPARATE, NON-persisted
// Zustand store (the persisted `useAppStore` is the normalized domain model only).
// Keeping selection/move/overlay state here means:
//   - cursor moves never dirty the persisted blob,
//   - card components can subscribe to "am I selected?" with a primitive selector
//     (see hooks/useSelection.ts) so a cursor move re-renders only the two cards
//     involved, never the whole list.
// The store is intentionally "dumb": it holds primitives + setters. All cursor math
// and relocation logic lives in hooks/useGlobalKeymap.ts (it needs ordered lists
// from useAppStore). Move-mode revert is done by the hook via useAppStore restore
// actions, then endMove() — so this store never imports useAppStore (no cycle).

import { create } from 'zustand';
import { storage } from '@/lib/storage';
import type { ColumnId } from '@/lib/types/domain';

// Vim keys are OFF by default; the preference is a single localStorage key
// (kept out of the persisted domain blob, like the theme prefs) so it survives
// reloads. Toggled from the bottom-left command line by typing `:q` ↵.
const VIM_KEY = 'todokan:vim-enabled';
function readVimEnabled(): boolean {
  return storage.getItem(VIM_KEY) === '1';
}

export interface MoveSnapshot {
  kind: 'task' | 'board';
  /** Moving item id (task id, or board id on home). */
  id: string;
  /** Owning board for a task move; null for a board move. */
  boardId: string | null;
  /** The task's column when move-mode started (kanban only). */
  originColumnId: ColumnId | null;
  /** Snapshot of board.taskIds (task move) or boardOrder (board move) at start. */
  originOrder: string[];
}

export interface UiState {
  /** Currently-focused item id (task id, or board id on home); null = none. */
  selectedId: string | null;
  setSelected: (id: string | null) => void;

  /** A task to focus AFTER the next route change applies (used when a Home search
   *  result jumps to a task on another board). The route-change effect in
   *  useGlobalKeymap consumes it: it resets the cursor, then re-selects this id. */
  pendingSelectId: string | null;
  setPendingSelect: (id: string | null) => void;

  /** Move-mode: relocate the selected item live; Enter commits, Esc reverts. */
  moveMode: boolean;
  moveSnapshot: MoveSnapshot | null;
  beginMove: (snap: MoveSnapshot) => void;
  /** Leave move-mode (commit — data is already mutated live). */
  endMove: () => void;

  /** Master switch for the Vim-style key motions (j/k/h/l, m, a, f, Shift+…).
   *  When off, only the "simple" keys work: arrows, Enter, Esc, ⌘K, ? and `:`. */
  vimEnabled: boolean;
  toggleVim: () => void;
  setVimEnabled: (v: boolean) => void;

  /** Bottom-left command line. `null` = closed; a string = open, holding the
   *  text typed after the leading `:`. Opened with `:`, run with Enter. */
  cmdline: string | null;
  openCmdline: () => void;
  setCmdline: (v: string) => void;
  closeCmdline: () => void;

  // Global overlays
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
  hintsActive: boolean;
  setHintsActive: (v: boolean) => void;

  // Modal flags lifted out of the views so the keymap can open them with no
  // prop-drilling.
  newOpen: boolean;
  setNewOpen: (v: boolean) => void;
  /** Target column for the next new Kanban card (Shift+N uses the cursor's column;
   *  a per-column "+" sets its own). null = first column / not applicable. */
  newColumnId: ColumnId | null;
  setNewColumnId: (id: ColumnId | null) => void;
  /** Task whose detail dialog (edit + due/reminder + discussion thread) is open. */
  editId: string | null;
  setEditId: (id: string | null) => void;
  /** Task pending a (confirmed) Shift+D delete; null = no confirm open. */
  deleteId: string | null;
  setDeleteId: (id: string | null) => void;
  archivedOpen: boolean;
  setArchivedOpen: (v: boolean) => void;
  kanbanColumnsOpen: boolean;
  setKanbanColumnsOpen: (v: boolean) => void;
  /** Item whose per-item actions menu (the ⋮ dropdown on a card/row/board card)
   *  is open; null = none. Lifted here so the global keymap (`.`) can open the
   *  cursored item's menu, and only ONE menu is ever open app-wide. */
  actionsMenuId: string | null;
  setActionsMenuId: (id: string | null) => void;

  /** Bulk task selection (board-scoped, ephemeral). When `selectionMode` is on,
   *  cards/rows show a checkbox and a SelectionToolbar exposes Move/Archive/Delete.
   *  `selectorOpen` is the searchable "Select tasks…" picker dialog. */
  selectionMode: boolean;
  selectedTaskIds: string[];
  selectorOpen: boolean;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleTaskSelected: (id: string) => void;
  setSelectedTasks: (ids: string[]) => void;
  clearTaskSelection: () => void;
  setSelectorOpen: (v: boolean) => void;
  /** Move-to-list dialog, lifted so both the toolbar AND the keymap (⇧M) can open
   *  it. `moveTaskIds` is the set it operates on (the selection, or one task). */
  moveOpen: boolean;
  moveTaskIds: string[];
  openMove: (ids: string[]) => void;
  setMoveOpen: (v: boolean) => void;
  /** Bulk delete confirm, lifted for the same reason (⇧D). `bulkDeleteIds` is a
   *  frozen snapshot of the selection so the confirm count is stable and the
   *  delete acts on exactly what was confirmed. */
  bulkDeleteOpen: boolean;
  bulkDeleteIds: string[];
  openBulkDelete: (ids: string[]) => void;
  setBulkDeleteOpen: (v: boolean) => void;

  /** Close every lifted modal at once (e.g. on route change). */
  resetModals: () => void;
  homeShowArchived: boolean;
  setHomeShowArchived: (v: boolean) => void;
  toggleHomeShowArchived: () => void;
  /** Home search query — lifted so the keyboard cursor navigates the same
   *  filtered set the grid shows. */
  homeQuery: string;
  setHomeQuery: (v: string) => void;
}

export const initialUiState = {
  selectedId: null,
  pendingSelectId: null,
  moveMode: false,
  moveSnapshot: null,
  vimEnabled: false,
  cmdline: null as string | null,
  paletteOpen: false,
  helpOpen: false,
  hintsActive: false,
  newOpen: false,
  newColumnId: null as ColumnId | null,
  editId: null,
  deleteId: null,
  archivedOpen: false,
  kanbanColumnsOpen: false,
  actionsMenuId: null,
  selectionMode: false,
  selectedTaskIds: [] as string[],
  selectorOpen: false,
  moveOpen: false,
  moveTaskIds: [] as string[],
  bulkDeleteOpen: false,
  bulkDeleteIds: [] as string[],
  homeShowArchived: false,
  homeQuery: '',
} as const;

export const useUiStore = create<UiState>((set) => ({
  ...initialUiState,
  vimEnabled: readVimEnabled(),

  setSelected: (id) => set({ selectedId: id }),
  setPendingSelect: (id) => set({ pendingSelectId: id }),

  beginMove: (snap) => set({ moveMode: true, moveSnapshot: snap }),
  endMove: () => set({ moveMode: false, moveSnapshot: null }),

  setVimEnabled: (v) => {
    storage.setItem(VIM_KEY, v ? '1' : '0');
    set({ vimEnabled: v });
  },
  toggleVim: () =>
    set((s) => {
      const v = !s.vimEnabled;
      storage.setItem(VIM_KEY, v ? '1' : '0');
      return { vimEnabled: v };
    }),

  openCmdline: () => set({ cmdline: '' }),
  setCmdline: (v) => set({ cmdline: v }),
  closeCmdline: () => set({ cmdline: null }),

  setPaletteOpen: (v) => set({ paletteOpen: v }),
  setHelpOpen: (v) => set({ helpOpen: v }),
  setHintsActive: (v) => set({ hintsActive: v }),

  setNewOpen: (v) => set({ newOpen: v }),
  setNewColumnId: (id) => set({ newColumnId: id }),
  setEditId: (id) => set({ editId: id }),
  setDeleteId: (id) => set({ deleteId: id }),
  setArchivedOpen: (v) => set({ archivedOpen: v }),
  setKanbanColumnsOpen: (v) => set({ kanbanColumnsOpen: v }),
  setActionsMenuId: (id) => set({ actionsMenuId: id }),

  enterSelectionMode: () => set({ selectionMode: true }),
  exitSelectionMode: () =>
    set({ selectionMode: false, selectedTaskIds: [], selectorOpen: false }),
  toggleTaskSelected: (id) =>
    set((s) => ({
      selectedTaskIds: s.selectedTaskIds.includes(id)
        ? s.selectedTaskIds.filter((x) => x !== id)
        : [...s.selectedTaskIds, id],
    })),
  setSelectedTasks: (ids) => set({ selectedTaskIds: ids }),
  clearTaskSelection: () => set({ selectedTaskIds: [] }),
  setSelectorOpen: (v) => set({ selectorOpen: v }),
  openMove: (ids) => set({ moveTaskIds: ids, moveOpen: true }),
  setMoveOpen: (v) => set({ moveOpen: v }),
  openBulkDelete: (ids) => set({ bulkDeleteIds: ids, bulkDeleteOpen: true }),
  setBulkDeleteOpen: (v) => set({ bulkDeleteOpen: v }),

  resetModals: () =>
    set({
      newOpen: false,
      newColumnId: null,
      editId: null,
      deleteId: null,
      archivedOpen: false,
      kanbanColumnsOpen: false,
      actionsMenuId: null,
      selectionMode: false,
      selectedTaskIds: [],
      selectorOpen: false,
      moveOpen: false,
      moveTaskIds: [],
      bulkDeleteOpen: false,
      bulkDeleteIds: [],
      cmdline: null,
    }),
  setHomeShowArchived: (v) => set({ homeShowArchived: v }),
  toggleHomeShowArchived: () =>
    set((s) => ({ homeShowArchived: !s.homeShowArchived })),
  setHomeQuery: (v) => set({ homeQuery: v }),
}));
