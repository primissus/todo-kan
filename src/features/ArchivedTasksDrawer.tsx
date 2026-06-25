import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArchiveRestore, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import { useBoard, useBoardTasks } from '@/store/selectors';

export interface ArchivedTasksDrawerProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Per-board archived tasks list with unarchive/delete (req 10.9 / 11.11).
 *
 * Keyboard-navigable like the rest of the app: a local cursor (the global keymap
 * is suppressed while any dialog is open). Arrow keys always move it; j/k also do
 * when Vim keys are on. Enter / `u` restores the highlighted task; Delete /
 * Backspace removes it. Initial focus is parked on the list container so Enter
 * acts on the cursor rather than triggering whichever button Radix would focus.
 */
export function ArchivedTasksDrawer({
  boardId,
  open,
  onOpenChange,
}: ArchivedTasksDrawerProps) {
  const board = useBoard(boardId);
  const archived = useBoardTasks(boardId).filter((t) => t.archived);
  const unarchiveTask = useAppStore((s) => s.unarchiveTask);
  const deleteTask = useAppStore((s) => s.deleteTask);

  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reset to the top each time the drawer opens.
  useEffect(() => {
    if (open) setCursor(0);
  }, [open]);

  // Keep the cursor in range as the list shrinks (after restore/delete).
  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, archived.length - 1)));
  }, [archived.length]);

  // Scroll the highlighted row into view.
  useEffect(() => {
    if (open) rowRefs.current[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor, open]);

  const columnTitle = (columnId: string | null) =>
    board?.columns.find((c) => c.id === columnId)?.title;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (archived.length === 0) return;
    const vim = useUiStore.getState().vimEnabled;
    const key = e.key;
    const lower = key.length === 1 ? key.toLowerCase() : key;

    if (key === 'ArrowDown' || (vim && lower === 'j')) {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, archived.length - 1));
      return;
    }
    if (key === 'ArrowUp' || (vim && lower === 'k')) {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
      return;
    }
    const cur = archived[cursor];
    if (!cur) return;
    if (key === 'Enter' || (vim && lower === 'u')) {
      e.preventDefault();
      unarchiveTask(cur.id);
      return;
    }
    if (key === 'Delete' || key === 'Backspace') {
      e.preventDefault();
      deleteTask(cur.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onOpenAutoFocus={(e) => {
          if (archived.length === 0) return; // let Radix focus the close button
          e.preventDefault();
          listRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Archived tasks</DialogTitle>
          <DialogDescription>
            {archived.length === 0
              ? 'No archived tasks.'
              : `${archived.length} archived ${
                  archived.length === 1 ? 'task' : 'tasks'
                } · ↑↓ navigate · Enter restore · Del delete`}
          </DialogDescription>
        </DialogHeader>

        {archived.length > 0 && (
          <div
            ref={listRef}
            tabIndex={-1}
            role="listbox"
            aria-label="Archived tasks"
            aria-activedescendant={`archived-row-${cursor}`}
            onKeyDown={onKeyDown}
            className="outline-none"
          >
            <ScrollArea className="max-h-[60vh]">
              <div className="grid gap-2 pr-3">
                {archived.map((t, i) => (
                  <div
                    key={t.id}
                    id={`archived-row-${i}`}
                    ref={(el) => {
                      rowRefs.current[i] = el;
                    }}
                    role="option"
                    aria-selected={i === cursor}
                    onClick={() => setCursor(i)}
                    className={cn(
                      'flex items-start gap-2 rounded-md border p-2.5',
                      i === cursor &&
                        'ring-2 ring-ring ring-offset-2 ring-offset-background',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      {board?.type === 'kanban' && t.columnId ? (
                        <span className="text-xs text-muted-foreground">
                          {columnTitle(t.columnId)}
                        </span>
                      ) : null}
                      {t.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {t.tags.map((tag) => (
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
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="Unarchive"
                        onClick={() => unarchiveTask(t.id)}
                      >
                        <ArchiveRestore className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        aria-label="Delete"
                        onClick={() => deleteTask(t.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
