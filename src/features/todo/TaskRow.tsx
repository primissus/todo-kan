import { useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Archive,
  Bell,
  CalendarClock,
  GripVertical,
  MessageSquare,
  SquarePen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Markdown } from '@/components/Markdown';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/datetime';
import { useAppStore } from '@/store/useAppStore';
import { useIsMoveTarget, useIsSelected } from '@/hooks/useSelection';
import type { Task } from '@/lib/types/domain';

export interface TaskRowProps {
  task: Task;
  /** Open the unified task dialog (view/edit + discussion). */
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
  const selected = useIsSelected(task.id);
  const moveTarget = useIsMoveTarget(task.id);
  const noteCount = task.notes?.length ?? 0;
  const overdue =
    task.dueAt != null && !task.completed && task.dueAt < Date.now();

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
        'group flex scroll-mt-20 items-start gap-2 rounded-md border bg-card px-2.5 py-2',
        isDragging && 'relative z-10 opacity-80 shadow-lg',
        selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        moveTarget &&
          'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg',
      )}
    >
      <button
        type="button"
        className="mt-1 cursor-grab touch-none text-muted-foreground/60 hover:text-muted-foreground"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <Checkbox
        checked={task.completed}
        onCheckedChange={() => toggleComplete(task.id)}
        className="mt-1"
        aria-label="Toggle complete"
      />

      <div className="min-w-0 flex-1">
        {/* Title + labels + actions share one line so each task stays compact. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className={cn(
              'min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline',
              task.completed && 'text-muted-foreground line-through',
            )}
          >
            {task.title || 'Untitled task'}
          </button>

          {task.tags.length > 0 && (
            <div className="hidden shrink-0 items-center gap-1 sm:flex">
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

          {task.dueAt != null && (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs',
                overdue
                  ? 'bg-destructive/15 text-destructive'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <CalendarClock className="size-3" />
              {formatDateTime(task.dueAt)}
            </span>
          )}
          {task.remindAt != null && (
            <Bell
              className="size-3 shrink-0 text-muted-foreground"
              aria-label="Reminder set"
            />
          )}

          {/* Dynamic actions: revealed on hover / keyboard focus to save space. */}
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 gap-1"
              aria-label={noteCount > 0 ? `Notes (${noteCount})` : 'Notes'}
              onClick={onEdit}
            >
              <MessageSquare className="size-4" />
              {noteCount > 0 ? (
                <span className="text-xs tabular-nums">{noteCount}</span>
              ) : null}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Open task"
              onClick={onEdit}
            >
              <SquarePen className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Archive task"
              onClick={() => archiveTask(task.id)}
            >
              <Archive className="size-4" />
            </Button>
          </div>
        </div>

        {task.description ? (
          <div className="mt-0.5 text-sm break-words text-muted-foreground">
            <Markdown text={task.description} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
