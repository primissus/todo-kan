import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOrderedBoards } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { buildExport, serializeExport } from '@/lib/transfer';

function downloadJson(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Pick which boards to export (with select-all) → JSON download (req 7.4). */
export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const boards = useOrderedBoards();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setSelected(new Set(boards.map((b) => b.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const allSelected = boards.length > 0 && selected.size === boards.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(boards.map((b) => b.id)));

  const doExport = () => {
    const { boards: allBoards, tasks } = useAppStore.getState();
    const ids = boards.map((b) => b.id).filter((id) => selected.has(id));
    const payload = buildExport(ids, allBoards, tasks);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(`todo-kan-export-${stamp}.json`, serializeExport(payload));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>
            Select the lists and boards to export as a JSON file.
          </DialogDescription>
        </DialogHeader>

        {boards.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to export yet.</p>
        ) : (
          <div className="grid gap-2">
            <label className="flex items-center gap-2 rounded-md px-1 py-1 text-sm font-medium">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              Select all ({boards.length})
            </label>
            <ScrollArea className="max-h-64 rounded-md border">
              <div className="grid gap-0.5 p-1">
                {boards.map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={selected.has(b.id)}
                      onCheckedChange={() => toggle(b.id)}
                    />
                    <span className="flex-1 truncate">{b.title}</span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {b.type === 'kanban' ? 'Kanban' : 'List'}
                    </span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={doExport} disabled={selected.size === 0}>
            Export {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
