import { useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KanbanCard } from '@/features/kanban/KanbanCard';
import { useIsSelected } from '@/hooks/useSelection';
import { cn } from '@/lib/utils';
import type { Column as ColumnType, Task } from '@/lib/types/domain';

export interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onAdd: (columnId: string) => void;
  onEditTask: (taskId: string) => void;
}

export function Column({ column, tasks, onAdd, onEditTask }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  // The column header is a keyboard-cursor target (the row above its first card):
  // `selectedId === column.id` highlights it and scrolls it into view.
  const headerSelected = useIsSelected(column.id);
  const headerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (headerSelected) {
      headerRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [headerSelected]);

  return (
    <div className="flex w-full flex-col rounded-lg bg-muted/40 md:w-[clamp(288px,22vw,500px)] md:shrink-0 tall:md:h-full tall:md:min-h-0 short:md:min-h-[420px]">
      <div
        ref={headerRef}
        className={cn(
          'flex shrink-0 items-center gap-2 rounded-md px-3 py-2.5',
          headerSelected && 'ring-2 ring-ring ring-inset',
        )}
      >
        <h3 className="text-sm font-semibold">{column.title}</h3>
        <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label={`Add card to ${column.title}`}
          onClick={() => onAdd(column.id)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          // p-2 (not px-2 pb-2): the top padding keeps the first card's focus
          // ring from being clipped by this column's vertical overflow scroll.
          'flex min-h-24 flex-1 flex-col gap-2 p-2 transition-colors tall:md:min-h-0 tall:md:overflow-y-auto',
          isOver && 'bg-accent/40',
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((t) => (
            <KanbanCard
              key={t.id}
              task={t}
              onEdit={() => onEditTask(t.id)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed py-6 text-xs text-muted-foreground">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
