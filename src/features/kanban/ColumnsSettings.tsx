import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCheck, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { newColumnId } from '@/lib/id';
import { useAppStore } from '@/store/useAppStore';
import { useBoard } from '@/store/selectors';
import type { Column, ColumnId } from '@/lib/types/domain';

interface DraftColumn {
  id: ColumnId;
  title: string;
  isDone: boolean;
}

export interface ColumnsSettingsProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Define a Kanban board's columns; one is the "Done" target (req 11.2). */
export function ColumnsSettings({
  boardId,
  open,
  onOpenChange,
}: ColumnsSettingsProps) {
  const board = useBoard(boardId);
  const setColumns = useAppStore((s) => s.setColumns);
  const [cols, setCols] = useState<DraftColumn[]>([]);

  useEffect(() => {
    if (open && board) {
      setCols(
        board.columns
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((c) => ({ id: c.id, title: c.title, isDone: !!c.isDone })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const rename = (i: number, title: string) =>
    setCols((prev) => prev.map((c, idx) => (idx === i ? { ...c, title } : c)));

  const remove = (i: number) =>
    setCols((prev) => prev.filter((_, idx) => idx !== i));

  const add = () =>
    setCols((prev) => [
      ...prev,
      { id: newColumnId(), title: 'New column', isDone: false },
    ]);

  const move = (i: number, dir: -1 | 1) =>
    setCols((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const setDone = (i: number) =>
    setCols((prev) => prev.map((c, idx) => ({ ...c, isDone: idx === i })));

  const save = () => {
    if (cols.length === 0) return;
    let doneSeen = false;
    const cleaned: Column[] = cols.map((c, i) => {
      let isDone = c.isDone;
      if (isDone && doneSeen) isDone = false;
      if (isDone) doneSeen = true;
      return {
        id: c.id,
        title: c.title.trim() || 'Untitled',
        order: i,
        isDone,
      };
    });
    if (!doneSeen) cleaned[cleaned.length - 1].isDone = true;
    setColumns(boardId, cleaned);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Columns</DialogTitle>
          <DialogDescription>
            Add, rename, reorder, or remove columns. The highlighted column is
            the “Done” target for “Archive done”.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="grid gap-2 pr-3">
            {cols.map((c, i) => (
              <div key={c.id} className="flex items-center gap-1.5">
                <Input
                  value={c.title}
                  onChange={(e) => rename(i, e.target.value)}
                  placeholder="Column name"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant={c.isDone ? 'default' : 'ghost'}
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label="Mark as Done column"
                  title="Mark as the Done column"
                  onClick={() => setDone(i)}
                >
                  <CheckCheck className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label="Move down"
                  disabled={i === cols.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn('size-8 shrink-0 text-destructive')}
                  aria-label="Remove column"
                  disabled={cols.length === 1}
                  onClick={() => remove(i)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" />
          Add column
        </Button>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={cols.length === 0}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
