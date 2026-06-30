import { useState } from 'react';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Archive, Eraser, Eye, EyeOff, ListChecks, MoreVertical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BoardHeader } from '@/features/BoardHeader';
import { TaskRow } from '@/features/todo/TaskRow';
import { TaskFormDialog } from '@/features/TaskFormDialog';
import { TaskDialog } from '@/features/TaskDialog';
import { ArchivedTasksDrawer } from '@/features/ArchivedTasksDrawer';
import { SelectionToolbar } from '@/features/selection/SelectionToolbar';
import { TaskSelectorDialog } from '@/features/selection/TaskSelectorDialog';
import { MoveToListDialog } from '@/features/selection/MoveToListDialog';
import { completeMove, deleteSelection } from '@/features/selection/bulkActions';
import { useBoardListActions } from '@/features/boardActions/useBoardListActions';
import { TypeToConfirmModal } from '@/components/TypeToConfirmModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import { deleteTaskWithCursor } from '@/hooks/useGlobalKeymap';
import { useBoard, useBoardTasks, useAllTags } from '@/store/selectors';

export interface TodoViewProps {
  boardId: string;
}

export function TodoView({ boardId }: TodoViewProps) {
  const board = useBoard(boardId);
  const tasks = useBoardTasks(boardId);
  const allTags = useAllTags();

  const addTask = useAppStore((s) => s.addTask);
  const setShowCompleted = useAppStore((s) => s.setShowCompleted);
  const reorderTaskInBoard = useAppStore((s) => s.reorderTaskInBoard);
  const clearBoard = useAppStore((s) => s.clearBoard);

  // Modal flags live in useUiStore so the global keymap can open them directly.
  const newOpen = useUiStore((s) => s.newOpen);
  const setNewOpen = useUiStore((s) => s.setNewOpen);
  const editId = useUiStore((s) => s.editId);
  const setEditId = useUiStore((s) => s.setEditId);
  const deleteId = useUiStore((s) => s.deleteId);
  const setDeleteId = useUiStore((s) => s.setDeleteId);
  const archivedOpen = useUiStore((s) => s.archivedOpen);
  const setArchivedOpen = useUiStore((s) => s.setArchivedOpen);
  const selectionMode = useUiStore((s) => s.selectionMode);
  const enterSelectionMode = useUiStore((s) => s.enterSelectionMode);
  const selectorOpen = useUiStore((s) => s.selectorOpen);
  const setSelectorOpen = useUiStore((s) => s.setSelectorOpen);
  const moveOpen = useUiStore((s) => s.moveOpen);
  const moveTaskIds = useUiStore((s) => s.moveTaskIds);
  const setMoveOpen = useUiStore((s) => s.setMoveOpen);
  const bulkDeleteOpen = useUiStore((s) => s.bulkDeleteOpen);
  const setBulkDeleteOpen = useUiStore((s) => s.setBulkDeleteOpen);
  const bulkDeleteIds = useUiStore((s) => s.bulkDeleteIds);
  const listActions = useBoardListActions(board);

  const [clearOpen, setClearOpen] = useState(false);

  const sensors = useSensors(
    // Mouse: 5px drag threshold. Touch: 220ms long-press (6px tolerance) so a
    // quick swipe scrolls the list while a hold picks up the row to reorder.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!board) return null;

  const active = tasks.filter((t) => !t.archived);
  const visible = board.showCompleted
    ? active
    : active.filter((t) => !t.completed);
  const archivedCount = tasks.filter((t) => t.archived).length;
  const editTaskObj = editId ? tasks.find((t) => t.id === editId) : undefined;
  const deleteTaskObj = deleteId
    ? tasks.find((t) => t.id === deleteId)
    : undefined;

  const handleDragEnd = (e: DragEndEvent) => {
    const { active: a, over } = e;
    if (over && a.id !== over.id) {
      reorderTaskInBoard(boardId, String(a.id), String(over.id));
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <BoardHeader board={board}>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="size-4" />
          Add task
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCompleted(boardId, !board.showCompleted)}
        >
          {board.showCompleted ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
          {board.showCompleted ? 'Hide completed' : 'Show completed'}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="More list actions">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => enterSelectionMode()}>
              <ListChecks className="size-4" />
              Select tasks
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {listActions.items}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setArchivedOpen(true)}>
              <Archive className="size-4" />
              Archived{archivedCount > 0 ? ` (${archivedCount})` : ''}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setClearOpen(true)}
            >
              <Eraser className="size-4" />
              Clear
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </BoardHeader>
      {selectionMode && <SelectionToolbar boardId={boardId} />}

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          {active.length === 0
            ? 'No tasks yet. Add your first task.'
            : 'All tasks are completed and hidden.'}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visible.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-2">
              {visible.map((t) => (
                <TaskRow key={t.id} task={t} onEdit={() => setEditId(t.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <TaskFormDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        mode="create"
        heading="New task"
        allTags={allTags}
        onSubmit={(v) =>
          addTask(boardId, {
            title: v.title,
            description: v.description,
            tags: v.tags,
            dueAt: v.dueAt ?? undefined,
          })
        }
      />

      <TaskDialog
        taskId={editId}
        open={!!editTaskObj}
        onOpenChange={(o) => !o && setEditId(null)}
        allTags={allTags}
      />

      <ArchivedTasksDrawer
        boardId={boardId}
        open={archivedOpen}
        onOpenChange={setArchivedOpen}
      />

      <ConfirmModal
        open={!!deleteTaskObj}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this task?"
        description={
          deleteTaskObj
            ? `"${deleteTaskObj.title || 'Untitled task'}" will be permanently deleted.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) deleteTaskWithCursor(boardId, 'todo', deleteId);
          setDeleteId(null);
        }}
      />

      <TypeToConfirmModal
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear this list?"
        description="This permanently deletes every task in this list (including archived)."
        phrase="clear"
        confirmLabel="Clear list"
        onConfirm={() => clearBoard(boardId)}
      />

      <TaskSelectorDialog
        boardId={boardId}
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
      />

      <MoveToListDialog
        taskIds={moveTaskIds}
        sourceBoardId={boardId}
        open={moveOpen}
        onOpenChange={setMoveOpen}
        onMoved={completeMove}
      />

      <ConfirmModal
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${bulkDeleteIds.length} task${bulkDeleteIds.length === 1 ? '' : 's'}?`}
        description="The selected tasks will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={deleteSelection}
      />

      {listActions.dialogs}
    </div>
  );
}
