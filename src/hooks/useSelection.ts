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
