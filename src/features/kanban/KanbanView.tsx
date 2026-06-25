import { useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Archive, CheckCheck, Eraser, Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BoardHeader } from '@/features/BoardHeader';
import { Column } from '@/features/kanban/Column';
import { KanbanCard } from '@/features/kanban/KanbanCard';
import { TaskFormDialog } from '@/features/TaskFormDialog';
import { ArchivedTasksDrawer } from '@/features/ArchivedTasksDrawer';
import { ColumnsSettings } from '@/features/kanban/ColumnsSettings';
import { TypeToConfirmModal } from '@/components/TypeToConfirmModal';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import { useAllTags, useBoard, useBoardTasks } from '@/store/selectors';
import type { ColumnId } from '@/lib/types/domain';

export interface KanbanViewProps {
  boardId: string;
}

function overColumnId(
  over: DragOverEvent['over'] | DragEndEvent['over'],
): ColumnId | null {
  if (!over) return null;
  const data = over.data.current;
  if (data?.type === 'column') return data.columnId as ColumnId;
  if (data?.type === 'card') return data.columnId as ColumnId;
  return null;
}

export function KanbanView({ boardId }: KanbanViewProps) {
  const board = useBoard(boardId);
  const tasks = useBoardTasks(boardId);
  const allTags = useAllTags();

  const addTask = useAppStore((s) => s.addTask);
  const editTask = useAppStore((s) => s.editTask);
  const archiveDone = useAppStore((s) => s.archiveDone);
  const clearBoard = useAppStore((s) => s.clearBoard);

  // Modal flags live in useUiStore so the global keymap can open them directly.
  const newOpen = useUiStore((s) => s.newOpen);
  const setNewOpen = useUiStore((s) => s.setNewOpen);
  const editId = useUiStore((s) => s.editId);
  const setEditId = useUiStore((s) => s.setEditId);
  const archivedOpen = useUiStore((s) => s.archivedOpen);
  const setArchivedOpen = useUiStore((s) => s.setArchivedOpen);
  const columnsOpen = useUiStore((s) => s.kanbanColumnsOpen);
  const setColumnsOpen = useUiStore((s) => s.setKanbanColumnsOpen);

  const [newColumnId, setNewColumnId] = useState<ColumnId | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!board) return null;

  const active = tasks.filter((t) => !t.archived);
  const archivedCount = tasks.length - active.length;
  const editTaskObj = editId ? tasks.find((t) => t.id === editId) : undefined;
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : undefined;

  const handleDragStart = (e: DragStartEvent) =>
    setActiveId(String(e.active.id));

  const handleDragOver = (e: DragOverEvent) => {
    const { active: a, over } = e;
    if (!over) return;
    const activeTaskId = String(a.id);
    const overId = String(over.id);
    if (activeTaskId === overId) return;

    const state = useAppStore.getState();
    const dragged = state.tasks[activeTaskId];
    if (!dragged) return;
    const targetCol = overColumnId(over);
    if (!targetCol) return;

    // Cross-column hop happens live; same-column reordering is finalized on drop.
    if (dragged.columnId !== targetCol) {
      const before = over.data.current?.type === 'column' ? null : overId;
      state.moveTaskToColumn(activeTaskId, targetCol, before);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active: a, over } = e;
    if (!over) return;
    const activeTaskId = String(a.id);
    const overId = String(over.id);
    const state = useAppStore.getState();
    const dragged = state.tasks[activeTaskId];
    if (!dragged) return;
    const targetCol = overColumnId(over);
    if (!targetCol) return;

    if (over.data.current?.type === 'column') {
      state.moveTaskToColumn(activeTaskId, targetCol, null);
    } else if (activeTaskId !== overId) {
      state.moveTaskToColumn(activeTaskId, targetCol, overId);
    }
  };

  return (
    <div>
      <BoardHeader board={board}>
        <Button
          size="sm"
          onClick={() => {
            setNewColumnId(null);
            setNewOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add card
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setColumnsOpen(true)}
        >
          <Settings2 className="size-4" />
          Columns
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => archiveDone(boardId)}
        >
          <CheckCheck className="size-4" />
          Archive done
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        {/*
         * Mobile: columns stack vertically (full width). md+: full-bleed
         * horizontal scroller — `mx-[calc(50%-50vw)]` breaks out of <main>'s
         * max-w-6xl container to span the whole viewport, with px padding so
         * cards aren't flush to the edges. The inner `w-max mx-auto` track
         * centers the columns when they fit and collapses its margins (no
         * edge clipping, padding preserved) when they overflow and scroll.
         */}
        <div className="pb-4 md:mx-[calc(50%-50vw)] md:overflow-x-auto md:px-[20vw]">
          <div className="flex flex-col gap-3 md:w-max md:flex-row md:mx-auto">
            {board.columns
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  tasks={active.filter((t) => t.columnId === col.id)}
                  onAdd={(colId) => {
                    setNewColumnId(colId as ColumnId);
                    setNewOpen(true);
                  }}
                  onEditTask={(taskId) => setEditId(taskId)}
                />
              ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? <KanbanCard task={activeTask} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <TaskFormDialog
        open={newOpen}
        onOpenChange={(o) => {
          setNewOpen(o);
          // Don't let a per-column "+" target leak into the next open (e.g. Shift+N).
          if (!o) setNewColumnId(null);
        }}
        mode="create"
        heading="New card"
        columns={board.columns}
        initial={{ columnId: newColumnId ?? board.columns[0]?.id ?? null }}
        allTags={allTags}
        onSubmit={(v) =>
          addTask(boardId, {
            title: v.title,
            description: v.description,
            tags: v.tags,
            columnId: v.columnId,
          })
        }
      />

      <TaskFormDialog
        open={!!editTaskObj}
        onOpenChange={(o) => !o && setEditId(null)}
        mode="edit"
        heading="Edit card"
        columns={board.columns}
        initial={
          editTaskObj
            ? {
                title: editTaskObj.title,
                description: editTaskObj.description,
                tags: editTaskObj.tags,
                columnId: editTaskObj.columnId,
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
              columnId: v.columnId,
            });
          }
          setEditId(null);
        }}
      />

      <ColumnsSettings
        boardId={boardId}
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
      />

      <ArchivedTasksDrawer
        boardId={boardId}
        open={archivedOpen}
        onOpenChange={setArchivedOpen}
      />

      <TypeToConfirmModal
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear this board?"
        description="This permanently deletes every card on this board (including archived)."
        phrase="clear"
        confirmLabel="Clear board"
        onConfirm={() => clearBoard(boardId)}
      />
    </div>
  );
}
