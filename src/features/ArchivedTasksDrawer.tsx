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
import { useAppStore } from '@/store/useAppStore';
import { useBoard, useBoardTasks } from '@/store/selectors';

export interface ArchivedTasksDrawerProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Per-board archived tasks list with unarchive/delete (req 10.9 / 11.11). */
export function ArchivedTasksDrawer({
  boardId,
  open,
  onOpenChange,
}: ArchivedTasksDrawerProps) {
  const board = useBoard(boardId);
  const archived = useBoardTasks(boardId).filter((t) => t.archived);
  const unarchiveTask = useAppStore((s) => s.unarchiveTask);
  const deleteTask = useAppStore((s) => s.deleteTask);

  const columnTitle = (columnId: string | null) =>
    board?.columns.find((c) => c.id === columnId)?.title;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Archived tasks</DialogTitle>
          <DialogDescription>
            {archived.length === 0
              ? 'No archived tasks.'
              : `${archived.length} archived ${
                  archived.length === 1 ? 'task' : 'tasks'
                }.`}
          </DialogDescription>
        </DialogHeader>

        {archived.length > 0 && (
          <ScrollArea className="max-h-[60vh]">
            <div className="grid gap-2 pr-3">
              {archived.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-2 rounded-md border p-2.5"
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
        )}
      </DialogContent>
    </Dialog>
  );
}
