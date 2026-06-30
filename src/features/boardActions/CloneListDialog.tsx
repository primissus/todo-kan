import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/useAppStore';
import type { Board } from '@/lib/types/domain';

export interface CloneListDialogProps {
  board: Board;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Clone a whole list/board (req: clone action) — asks for the copy's title. */
export function CloneListDialog({ board, open, onOpenChange }: CloneListDialogProps) {
  const cloneBoard = useAppStore((s) => s.cloneBoard);
  const [title, setTitle] = useState('');

  // Reset to the suggested name each time it opens (for the current board).
  useEffect(() => {
    if (open) setTitle(`Copy of ${board.title || 'Untitled'}`);
  }, [open, board.title]);

  const kind = board.type === 'kanban' ? 'board' : 'list';

  const submit = () => {
    cloneBoard(board.id, title);
    toast.success(`${kind === 'board' ? 'Board' : 'List'} cloned`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clone {kind}</DialogTitle>
          <DialogDescription>
            Creates a copy of “{board.title || 'Untitled'}” with all of its tasks.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="clone-title">New title</Label>
          <Input
            id="clone-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Clone</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
