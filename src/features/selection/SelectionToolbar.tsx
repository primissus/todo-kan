import { useState } from 'react';
import { toast } from 'sonner';
import { Archive, FolderInput, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ConfirmModal';
import { MoveToListDialog } from '@/features/selection/MoveToListDialog';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import { useBoard, useBoardTasks } from '@/store/selectors';

export interface SelectionToolbarProps {
  boardId: string;
}

/**
 * Bulk-action bar shown while selection mode is on (req: selection mode enables
 * Move / Archive / Delete on the checked tasks). Rendered by the board views just
 * under the header; reads the shared selection from useUiStore.
 */
export function SelectionToolbar({ boardId }: SelectionToolbarProps) {
  const board = useBoard(boardId);
  const tasks = useBoardTasks(boardId);
  const selectedTaskIds = useUiStore((s) => s.selectedTaskIds);
  const setSelectedTasks = useUiStore((s) => s.setSelectedTasks);
  const setSelectorOpen = useUiStore((s) => s.setSelectorOpen);
  const exitSelectionMode = useUiStore((s) => s.exitSelectionMode);
  const setSelected = useUiStore((s) => s.setSelected);
  const archiveTasks = useAppStore((s) => s.archiveTasks);
  const deleteTasks = useAppStore((s) => s.deleteTasks);

  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
  const plural = count === 1 ? '' : 's';

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

  // After a bulk action the selection is consumed: leave selection mode and drop
  // the cursor (some selected tasks may no longer exist / be visible).
  const finish = () => {
    exitSelectionMode();
    setSelected(null);
  };

  const onArchive = () => {
    if (count === 0) return;
    archiveTasks(selectedTaskIds);
    toast.success(`Archived ${count} task${plural}`);
    finish();
  };

  const onDelete = () => {
    deleteTasks(selectedTaskIds);
    toast.success(`Deleted ${count} task${plural}`);
    finish();
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-xs">
      <span className="text-sm font-medium tabular-nums">
        {count} selected
      </span>

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
        onClick={() => setMoveOpen(true)}
      >
        <FolderInput className="size-4" />
        Move
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={count === 0}
        onClick={onArchive}
      >
        <Archive className="size-4" />
        Archive
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={count === 0}
        onClick={() => setDeleteOpen(true)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="size-4" />
        Delete
      </Button>

      <div className="flex-1" />

      <Button variant="ghost" size="sm" onClick={finish}>
        <X className="size-4" />
        Done
      </Button>

      <MoveToListDialog
        taskIds={selectedTaskIds}
        sourceBoardId={boardId}
        open={moveOpen}
        onOpenChange={setMoveOpen}
        onMoved={(n, title) => {
          toast.success(`Moved ${n} task${n === 1 ? '' : 's'} to “${title}”`);
          finish();
        }}
      />

      <ConfirmModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${count} task${plural}?`}
        description="The selected tasks will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}
