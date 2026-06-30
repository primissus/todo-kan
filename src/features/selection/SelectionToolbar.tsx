import { Archive, FolderInput, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  archiveSelection,
  finishSelection,
  requestDeleteSelection,
  requestMove,
} from '@/features/selection/bulkActions';
import { useUiStore } from '@/store/useUiStore';
import { useBoard, useBoardTasks } from '@/store/selectors';

export interface SelectionToolbarProps {
  boardId: string;
}

/**
 * Bulk-action bar shown while selection mode is on (req: selection mode enables
 * Move / Archive / Delete on the checked tasks). Rendered by the board views just
 * under the header; reads the shared selection from useUiStore. The Move/Delete
 * dialogs are lifted to the view (see useUiStore.moveOpen/bulkDeleteOpen) so the
 * keyboard shortcuts (⇧M / ⇧D) drive the exact same flows.
 */
export function SelectionToolbar({ boardId }: SelectionToolbarProps) {
  const board = useBoard(boardId);
  const tasks = useBoardTasks(boardId);
  const selectedTaskIds = useUiStore((s) => s.selectedTaskIds);
  const setSelectedTasks = useUiStore((s) => s.setSelectedTasks);
  const setSelectorOpen = useUiStore((s) => s.setSelectorOpen);
  // The Move/Archive/Delete shortcuts are Vim-gated — only hint them when on.
  const vimEnabled = useUiStore((s) => s.vimEnabled);
  const hint = (label: string, key: string) =>
    vimEnabled ? `${label} (${key})` : label;

  // "Select all" targets only the tasks the user can actually see/check inline:
  // non-archived, and (for a TODO list with "Hide completed") not completed.
  const hideCompleted = board?.type === 'todo' && !board.showCompleted;
  const activeIds: string[] = tasks
    .filter((t) => !t.archived && !(hideCompleted && t.completed))
    .map((t) => t.id);
  const count = selectedTaskIds.length;
  // True membership (not a count comparison): are all *visible* tasks selected?
  const selectedSet = new Set(selectedTaskIds);
  const allVisibleSelected =
    activeIds.length > 0 && activeIds.every((id) => selectedSet.has(id));

  // Toggle the visible set without disturbing any out-of-view tasks the picker
  // dialog may have selected (union to add, set-difference to remove).
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const visible = new Set(activeIds);
      setSelectedTasks(selectedTaskIds.filter((id) => !visible.has(id)));
    } else {
      setSelectedTasks([...new Set([...selectedTaskIds, ...activeIds])]);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-xs">
      <span className="text-sm font-medium tabular-nums">{count} selected</span>

      <Button
        variant="ghost"
        size="sm"
        onClick={toggleSelectAll}
        disabled={activeIds.length === 0}
      >
        {allVisibleSelected ? 'Deselect all' : 'Select all'}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setSelectorOpen(true)}>
        <Search className="size-4" />
        Search
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      <Button
        variant="outline"
        size="sm"
        disabled={count === 0}
        title={hint('Move', '⇧M')}
        onClick={() => requestMove(selectedTaskIds)}
      >
        <FolderInput className="size-4" />
        Move
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={count === 0}
        title={hint('Archive', 'a')}
        onClick={archiveSelection}
      >
        <Archive className="size-4" />
        Archive
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={count === 0}
        title={hint('Delete', '⇧D')}
        onClick={requestDeleteSelection}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="size-4" />
        Delete
      </Button>

      <div className="flex-1" />

      <Button variant="ghost" size="sm" title="Done (Esc)" onClick={finishSelection}>
        <X className="size-4" />
        Done
      </Button>
    </div>
  );
}
