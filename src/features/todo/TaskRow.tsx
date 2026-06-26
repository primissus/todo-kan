import { useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, GripVertical, MessageSquare, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Linkify } from '@/components/Linkify';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import { useIsMoveTarget, useIsSelected } from '@/hooks/useSelection';
import type { Task } from '@/lib/types/domain';

export interface TaskRowProps {
  task: Task;
  onEdit: () => void;
}

export function TaskRow({ task, onEdit }: TaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const toggleComplete = useAppStore((s) => s.toggleComplete);
  const archiveTask = useAppStore((s) => s.archiveTask);
  const setNotesId = useUiStore((s) => s.setNotesId);
  const selected = useIsSelected(task.id);
  const moveTarget = useIsMoveTarget(task.id);
  const noteCount = task.notes?.length ?? 0;

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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setRefs}
      style={style}
      className={cn(
        'flex scroll-mt-20 items-start gap-2 rounded-md border bg-card p-2.5',
        isDragging && 'relative z-10 opacity-80 shadow-lg',
        selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        moveTarget &&
          'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg',
      )}
    >
      <button
        type="button"
        className="mt-0.5 cursor-grab touch-none text-muted-foreground/60 hover:text-muted-foreground"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <Checkbox
        checked={task.completed}
        onCheckedChange={() => toggleComplete(task.id)}
        className="mt-0.5"
        aria-label="Toggle complete"
      />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-medium break-words',
            task.completed && 'text-muted-foreground line-through',
          )}
        >
          {task.title}
        </p>
        {task.description ? (
          <p className="mt-0.5 text-sm whitespace-pre-wrap break-words text-muted-foreground">
            <Linkify text={task.description} />
          </p>
        ) : null}
        {task.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
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

      <div className="flex shrink-0 gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-muted-foreground"
          aria-label={noteCount > 0 ? `Notes (${noteCount})` : 'Notes'}
          onClick={() => setNotesId(task.id)}
        >
          <MessageSquare className="size-4" />
          {noteCount > 0 ? (
            <span className="text-xs tabular-nums">{noteCount}</span>
          ) : null}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Edit task"
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Archive task"
          onClick={() => archiveTask(task.id)}
        >
          <Archive className="size-4" />
        </Button>
      </div>
    </div>
  );
}
