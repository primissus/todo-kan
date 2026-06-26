// On-screen + screen-reader feedback for keyboard navigation, since the cursor
// deliberately never moves real DOM focus:
//   - a visible banner while move-mode is active (what the keys do now), and
//   - an sr-only aria-live region announcing the current selection / move state.

import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';

export function KeyboardStatus() {
  const selectedId = useUiStore((s) => s.selectedId);
  const moveMode = useUiStore((s) => s.moveMode);
  const label = useAppStore((s) => {
    if (!selectedId) return '';
    const t = s.tasks[selectedId];
    if (t) return t.title || 'Untitled task';
    const b = s.boards[selectedId];
    if (b) return b.title || 'Untitled';
    // The cursor can also sit on a Kanban column header (a column id).
    for (const board of Object.values(s.boards)) {
      const col = board.columns.find((c) => c.id === selectedId);
      if (col) return `${col.title || 'Untitled'} column`;
    }
    return '';
  });

  const announce = !selectedId
    ? ''
    : moveMode
      ? `Moving ${label}. Arrow keys to move, Enter to drop, Escape to cancel.`
      : `Selected ${label}.`;

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
      {moveMode && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4">
          <div className="flex items-center gap-1.5 rounded-full border bg-popover px-4 py-2 text-sm text-popover-foreground shadow-lg">
            <span className="font-medium">Moving</span>
            <span className="text-muted-foreground">·</span>
            <kbd className="rounded border bg-muted px-1.5 font-mono text-xs">
              ↑↓←→
            </kbd>
            <span className="text-muted-foreground">move</span>
            <kbd className="rounded border bg-muted px-1.5 font-mono text-xs">
              Enter
            </kbd>
            <span className="text-muted-foreground">drop</span>
            <kbd className="rounded border bg-muted px-1.5 font-mono text-xs">
              Esc
            </kbd>
            <span className="text-muted-foreground">cancel</span>
          </div>
        </div>
      )}
    </>
  );
}
