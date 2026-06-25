import { useState } from 'react';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Archive, Eraser, Eye, EyeOff, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoardHeader } from '@/features/BoardHeader';
import { TaskRow } from '@/features/todo/TaskRow';
import { TaskFormDialog } from '@/features/TaskFormDialog';
import { ArchivedTasksDrawer } from '@/features/ArchivedTasksDrawer';
import { TypeToConfirmModal } from '@/components/TypeToConfirmModal';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import { useBoard, useBoardTasks, useAllTags } from '@/store/selectors';

export interface TodoViewProps {
  boardId: string;
}

export function TodoView({ boardId }: TodoViewProps) {
  const board = useBoard(boardId);
  const tasks = useBoardTasks(boardId);
  const allTags = useAllTags();

  const addTask = useAppStore((s) => s.addTask);
  const editTask = useAppStore((s) => s.editTask);
  const setShowCompleted = useAppStore((s) => s.setShowCompleted);
  const reorderTaskInBoard = useAppStore((s) => s.reorderTaskInBoard);
  const clearBoard = useAppStore((s) => s.clearBoard);

  // Modal flags live in useUiStore so the global keymap can open them directly.
  const newOpen = useUiStore((s) => s.newOpen);
  const setNewOpen = useUiStore((s) => s.setNewOpen);
  const editId = useUiStore((s) => s.editId);
  const setEditId = useUiStore((s) => s.setEditId);
  const archivedOpen = useUiStore((s) => s.archivedOpen);
  const setArchivedOpen = useUiStore((s) => s.setArchivedOpen);

  const [clearOpen, setClearOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!board) return null;

  const active = tasks.filter((t) => !t.archived);
  const visible = board.showCompleted
    ? active
    : active.filter((t) => !t.completed);
  const archivedCount = tasks.filter((t) => t.archived).length;
  const editTaskObj = editId ? tasks.find((t) => t.id === editId) : undefined;

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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setArchivedOpen(true)}
        >
          <Archive className="size-4" />
          Archived{archivedCount > 0 ? ` (${archivedCount})` : ''}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setClearOpen(true)}
        >
          <Eraser className="size-4" />
          Clear
        </Button>
      </BoardHeader>

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
          })
        }
      />

      <TaskFormDialog
        open={!!editTaskObj}
        onOpenChange={(o) => !o && setEditId(null)}
        mode="edit"
        heading="Edit task"
        initial={
          editTaskObj
            ? {
                title: editTaskObj.title,
                description: editTaskObj.description,
                tags: editTaskObj.tags,
              }
            : undefined
        }
        allTags={allTags}
        onSubmit={(v) => {
          if (editId) {
            editTask(editId, {
              title: v.title,
              description: v.description,
              tags: v.tags,
            });
          }
          setEditId(null);
        }}
      />

      <ArchivedTasksDrawer
        boardId={boardId}
        open={archivedOpen}
        onOpenChange={setArchivedOpen}
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
    </div>
  );
}
