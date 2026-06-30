import { useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, Bell, CalendarClock, Eye, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Markdown } from '@/components/Markdown';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/datetime';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import {
  useIsMoveTarget,
  useIsSelected,
  useIsTaskSelected,
  useSelectionMode,
} from '@/hooks/useSelection';
import type { Task } from '@/lib/types/domain';

export interface KanbanCardProps {
  task: Task;
  onEdit?: () => void;
  /** Rendered inside the DragOverlay (no sortable wiring). */
  overlay?: boolean;
}

export function KanbanCard({ task, onEdit, overlay = false }: KanbanCardProps) {
  const selectionMode = useSelectionMode();
  const taskSelected = useIsTaskSelected(task.id);
  const toggleTaskSelected = useUiStore((s) => s.toggleTaskSelected);
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
    // In selection mode the whole card is a select target — no dragging.
    disabled: selectionMode,
  });
  const archiveTask = useAppStore((s) => s.archiveTask);
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
        !overlay && !selectionMode && 'cursor-grab active:cursor-grabbing',
        !overlay && selectionMode && 'cursor-pointer select-none',
        isDragging && 'opacity-40',
        overlay && 'rotate-1 cursor-grabbing shadow-lg',
        selected &&
          'ring-2 ring-ring ring-offset-2 ring-offset-background',
        moveTarget &&
          'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg',
        taskSelected && 'bg-accent/40',
      )}
      {...(overlay || selectionMode ? {} : attributes)}
      {...(overlay || selectionMode ? {} : listeners)}
      {...(!overlay && selectionMode
        ? {
            onClick: () => toggleTaskSelected(task.id),
            role: 'button',
            'aria-pressed': taskSelected,
          }
        : {})}
    >
      <div className="flex items-start gap-2">
        {!overlay && selectionMode && (
          // Display-only — the whole card is the click target in selection mode.
          <Checkbox
            checked={taskSelected}
            className="pointer-events-none mt-0.5"
            aria-hidden
          />
        )}
        {overlay || selectionMode ? (
          <p className="min-w-0 flex-1 text-sm font-medium break-words">
            {task.title || (overlay ? '' : 'Untitled task')}
          </p>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="min-w-0 flex-1 cursor-pointer text-left text-sm font-medium break-words hover:underline"
          >
            {task.title || 'Untitled task'}
          </button>
        )}
        {!overlay && !selectionMode && (
          <div
            className={cn(
              'flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/card:opacity-100',
              // Selected via the keyboard cursor → reveal the actions (it has no
              // hover), matching how a focused row exposes them in the TODO list.
              selected && 'opacity-100',
            )}
          >
            {noteCount === 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Notes"
                {...stopDrag}
                onClick={onEdit}
              >
                <MessageSquare className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Open card"
              {...stopDrag}
              onClick={onEdit}
            >
              <Eye className="size-3.5" />
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
        <div
          className={cn(
            'mt-1 text-xs break-words text-muted-foreground',
            // Keep links/code inert so a click selects the card.
            selectionMode && 'pointer-events-none',
          )}
        >
          <Markdown text={task.description} />
        </div>
      ) : null}

      {(task.dueAt != null || task.remindAt != null) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {task.dueAt != null && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
                task.dueAt < Date.now()
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
              className="size-3 text-muted-foreground"
              aria-label="Reminder set"
            />
          )}
        </div>
      )}

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

      {noteCount > 0 && (
        <div className="mt-2">
          {overlay || selectionMode ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="size-3.5" />
              <span className="tabular-nums">{noteCount}</span>
            </span>
          ) : (
            <button
              type="button"
              aria-label={`Notes (${noteCount})`}
              className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground"
              {...stopDrag}
              onClick={onEdit}
            >
              <MessageSquare className="size-3.5" />
              <span className="tabular-nums">{noteCount}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
