import { useEffect, useState } from 'react';
import { Columns3, ListTodo } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store/useAppStore';
import { useOrderedBoards } from '@/store/selectors';
import type { ColumnId } from '@/lib/types/domain';

/** Column-picker sentinel: keep each task's status (don't force one column). */
const KEEP_STATUS = '__current__';

export interface MoveToListDialogProps {
  taskIds: string[];
  sourceBoardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful move (count moved, destination title). */
  onMoved?: (count: number, targetTitle: string) => void;
}

/** Move the selected tasks onto another list/board (req: move into a different
 *  list, todo or kanban). When the target is Kanban, choose the landing column. */
export function MoveToListDialog({
  taskIds,
  sourceBoardId,
  open,
  onOpenChange,
  onMoved,
}: MoveToListDialogProps) {
  const boards = useOrderedBoards();
  const moveTasksToBoard = useAppStore((s) => s.moveTasksToBoard);
  const [targetId, setTargetId] = useState('');
  const [columnId, setColumnId] = useState<string>('');

  useEffect(() => {
    if (open) {
      setTargetId('');
      setColumnId('');
    }
  }, [open]);

  const targets = boards.filter((b) => b.id !== sourceBoardId && !b.archived);
  const target = targets.find((b) => b.id === targetId);
  const isKanbanTarget = target?.type === 'kanban';

  // Default a Kanban target to "Current" — keep each task's status.
  useEffect(() => {
    setColumnId(isKanbanTarget ? KEEP_STATUS : '');
  }, [targetId, isKanbanTarget]);

  const submit = () => {
    if (!target || taskIds.length === 0) return;
    // null → TODO target; undefined → keep status; else the chosen column.
    const columnArg: ColumnId | null | undefined = !isKanbanTarget
      ? null
      : columnId === KEEP_STATUS
        ? undefined
        : (columnId as ColumnId);
    moveTasksToBoard(taskIds, target.id, columnArg);
    onMoved?.(taskIds.length, target.title || 'Untitled');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Move {taskIds.length} task{taskIds.length === 1 ? '' : 's'} to…
          </DialogTitle>
          <DialogDescription>
            Choose the list or board to move the selected task
            {taskIds.length === 1 ? '' : 's'} into.
          </DialogDescription>
        </DialogHeader>

        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            There’s no other list to move into. Create one first.
          </p>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Destination</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a list…" />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.type === 'kanban' ? (
                        <Columns3 className="size-4" />
                      ) : (
                        <ListTodo className="size-4" />
                      )}
                      {b.title || 'Untitled'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isKanbanTarget && target ? (
              <div className="grid gap-2">
                <Label>Column</Label>
                <Select value={columnId} onValueChange={setColumnId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a column…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={KEEP_STATUS}>
                      Current (keep status)
                    </SelectItem>
                    <SelectSeparator />
                    {target.columns
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!target} onClick={submit}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
