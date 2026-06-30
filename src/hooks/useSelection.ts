// Granular selection selectors. Each returns a primitive boolean so a card only
// re-renders when ITS own selected/move-target state flips — moving the cursor
// from A to B re-renders exactly A and B, never the whole list.

import { useUiStore } from '@/store/useUiStore';

export function useSelectedId(): string | null {
  return useUiStore((s) => s.selectedId);
}

/** True when this id is the cursor AND we're not in move-mode (steady selection ring). */
export function useIsSelected(id: string): boolean {
  return useUiStore((s) => s.selectedId === id && !s.moveMode);
}

/** True when this id is the item currently being relocated (move-mode ring). */
export function useIsMoveTarget(id: string): boolean {
  return useUiStore((s) => s.moveMode && s.selectedId === id);
}

/** Whether bulk selection mode is active (cards/rows show a select checkbox). */
export function useSelectionMode(): boolean {
  return useUiStore((s) => s.selectionMode);
}

/** True when this task is in the bulk selection set (primitive → granular). */
export function useIsTaskSelected(id: string): boolean {
  return useUiStore((s) => s.selectedTaskIds.includes(id));
}

/** True when this item's per-item actions menu (⋮) is the open one (granular). */
export function useIsActionsMenuOpen(id: string): boolean {
  return useUiStore((s) => s.actionsMenuId === id);
}
