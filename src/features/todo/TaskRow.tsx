import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, GripVertical, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-2 rounded-md border bg-card p-2.5',
        isDragging && 'relative z-10 opacity-80 shadow-lg',
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
            {task.description}
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
