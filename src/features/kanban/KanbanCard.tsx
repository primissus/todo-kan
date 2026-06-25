import { useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useIsMoveTarget, useIsSelected } from '@/hooks/useSelection';
import type { Task } from '@/lib/types/domain';

export interface KanbanCardProps {
  task: Task;
  onEdit?: () => void;
  /** Rendered inside the DragOverlay (no sortable wiring). */
  overlay?: boolean;
}

export function KanbanCard({ task, onEdit, overlay = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'card', columnId: task.columnId },
  });
  const archiveTask = useAppStore((s) => s.archiveTask);
  const selected = useIsSelected(task.id);
  const moveTarget = useIsMoveTarget(task.id);

  const nodeRef = useRef<HTMLDivElement | null>(null);
  const setRefs = (node: HTMLDivElement | null) => {
    nodeRef.current = node;
    setNodeRef(node);
  };
  useEffect(() => {
    if (selected || moveTarget) {
      nodeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [selected, moveTarget]);

  const style = overlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  const stopDrag = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };

  return (
    <div
      ref={overlay ? undefined : setRefs}
      style={style}
      className={cn(
        'group/card scroll-mt-20 rounded-md border bg-card p-2.5 text-card-foreground shadow-xs',
        !overlay && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
        overlay && 'rotate-1 cursor-grabbing shadow-lg',
        selected &&
          'ring-2 ring-ring ring-offset-2 ring-offset-background',
        moveTarget &&
          'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg',
      )}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
    >
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium break-words">
          {task.title}
        </p>
        {!overlay && (
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/card:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Edit card"
              {...stopDrag}
              onClick={onEdit}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Archive card"
              {...stopDrag}
              onClick={() => archiveTask(task.id)}
            >
              <Archive className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {task.description ? (
        <p className="mt-1 text-xs whitespace-pre-wrap break-words text-muted-foreground">
          {task.description}
        </p>
      ) : null}

      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
