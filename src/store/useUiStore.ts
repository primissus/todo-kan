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
import type { ColumnId } from '@/lib/types/domain';

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

  /** Move-mode: relocate the selected item live; Enter commits, Esc reverts. */
  moveMode: boolean;
  moveSnapshot: MoveSnapshot | null;
  beginMove: (snap: MoveSnapshot) => void;
  /** Leave move-mode (commit — data is already mutated live). */
  endMove: () => void;

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
  editId: string | null;
  setEditId: (id: string | null) => void;
  archivedOpen: boolean;
  setArchivedOpen: (v: boolean) => void;
  kanbanColumnsOpen: boolean;
  setKanbanColumnsOpen: (v: boolean) => void;
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
  moveMode: false,
  moveSnapshot: null,
  paletteOpen: false,
  helpOpen: false,
  hintsActive: false,
  newOpen: false,
  editId: null,
  archivedOpen: false,
  kanbanColumnsOpen: false,
  homeShowArchived: false,
  homeQuery: '',
} as const;

export const useUiStore = create<UiState>((set) => ({
  ...initialUiState,

  setSelected: (id) => set({ selectedId: id }),

  beginMove: (snap) => set({ moveMode: true, moveSnapshot: snap }),
  endMove: () => set({ moveMode: false, moveSnapshot: null }),

  setPaletteOpen: (v) => set({ paletteOpen: v }),
  setHelpOpen: (v) => set({ helpOpen: v }),
  setHintsActive: (v) => set({ hintsActive: v }),

  setNewOpen: (v) => set({ newOpen: v }),
  setEditId: (id) => set({ editId: id }),
  setArchivedOpen: (v) => set({ archivedOpen: v }),
  setKanbanColumnsOpen: (v) => set({ kanbanColumnsOpen: v }),
  resetModals: () =>
    set({
      newOpen: false,
      editId: null,
      archivedOpen: false,
      kanbanColumnsOpen: false,
    }),
  setHomeShowArchived: (v) => set({ homeShowArchived: v }),
  toggleHomeShowArchived: () =>
    set((s) => ({ homeShowArchived: !s.homeShowArchived })),
  setHomeQuery: (v) => set({ homeQuery: v }),
}));
