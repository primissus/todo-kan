import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store/useAppStore';
import { useOrderedBoards } from '@/store/selectors';
import type { Board } from '@/lib/types/domain';

export interface MergeListDialogProps {
  board: Board;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONFIRM_PHRASE = 'merge list';

/** Merge this list's tasks into another list, then delete the source. Guarded by
 *  a type-to-confirm (`merge list`) because it's destructive (source is removed). */
export function MergeListDialog({ board, open, onOpenChange }: MergeListDialogProps) {
  const boards = useOrderedBoards();
  const mergeBoardInto = useAppStore((s) => s.mergeBoardInto);
  const [targetId, setTargetId] = useState('');
  const [phrase, setPhrase] = useState('');

  useEffect(() => {
    if (open) {
      setTargetId('');
      setPhrase('');
    }
  }, [open]);

  // Any other non-archived board is a valid destination.
  const targets = boards.filter((b) => b.id !== board.id && !b.archived);
  const target = targets.find((b) => b.id === targetId);
  const ready = !!target && phrase.trim() === CONFIRM_PHRASE;

  const submit = () => {
    if (!ready || !target) return;
    mergeBoardInto(board.id, target.id);
    toast.success(`Merged into “${target.title || 'Untitled'}”`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge list into…</DialogTitle>
          <DialogDescription>
            Moves every task from “{board.title || 'Untitled'}” into the chosen
            list, then deletes this one. This can’t be undone.
          </DialogDescription>
        </DialogHeader>

        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            There’s no other list to merge into. Create one first.
          </p>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Destination list</Label>
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

            <div className="grid gap-2">
              <Label htmlFor="merge-confirm">
                Type{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                  {CONFIRM_PHRASE}
                </code>{' '}
                to confirm
              </Label>
              <Input
                id="merge-confirm"
                autoComplete="off"
                value={phrase}
                placeholder={CONFIRM_PHRASE}
                onChange={(e) => setPhrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!ready} onClick={submit}>
            Merge list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
