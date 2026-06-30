import { useEffect, useMemo, useState } from 'react';
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
import { SearchBar } from '@/components/SearchBar';
import { cn } from '@/lib/utils';
import { filterBySearch } from '@/lib/search';
import { useUiStore } from '@/store/useUiStore';
import { useBoard, useBoardTasks } from '@/store/selectors';

export interface TaskSelectorDialogProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Searchable task picker (req: a selector that checks multiple/all tasks with a
 * search bar). Edits a buffered draft set and, on apply, writes it to the shared
 * selection and turns on selection mode (where the bulk actions live).
 */
export function TaskSelectorDialog({
  boardId,
  open,
  onOpenChange,
}: TaskSelectorDialogProps) {
  const board = useBoard(boardId);
  const tasks = useBoardTasks(boardId);
  const setSelectedTasks = useUiStore((s) => s.setSelectedTasks);
  const enterSelectionMode = useUiStore((s) => s.enterSelectionMode);

  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>([]);

  // Seed the draft from the live selection each time the dialog opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setDraft(useUiStore.getState().selectedTaskIds);
    }
  }, [open]);

  const active = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);
  const filtered = useMemo(
    () => filterBySearch(active, query),
    [active, query],
  );

  const draftSet = useMemo(() => new Set<string>(draft), [draft]);
  const filteredIds: string[] = filtered.map((t) => t.id);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => draftSet.has(id));

  const toggle = (id: string) =>
    setDraft((d) =>
      d.includes(id) ? d.filter((x) => x !== id) : [...d, id],
    );

  const toggleAllFiltered = () =>
    setDraft((d) => {
      if (allFilteredSelected) return d.filter((id) => !filteredIds.includes(id));
      const set = new Set(d);
      for (const id of filteredIds) set.add(id);
      return [...set];
    });

  const apply = () => {
    setSelectedTasks(draft);
    if (draft.length > 0) enterSelectionMode();
    onOpenChange(false);
  };

  const columnTitle = (columnId: string | null) =>
    board?.columns.find((c) => c.id === columnId)?.title;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select tasks</DialogTitle>
          <DialogDescription>
            Search and check the tasks you want to act on.
          </DialogDescription>
        </DialogHeader>

        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Filter tasks…"
        />

        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={toggleAllFiltered}
            disabled={filteredIds.length === 0}
            className="font-medium text-foreground hover:underline disabled:opacity-50"
          >
            {allFilteredSelected ? 'Clear all' : 'Select all'}
            {query.trim() ? ' (filtered)' : ''}
          </button>
          <span>{draft.length} selected</span>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {active.length === 0 ? 'No tasks in this list.' : 'No tasks match.'}
            </p>
          ) : (
            <ul className="divide-y">
              {filtered.map((t) => {
                const checked = draftSet.has(t.id);
                const col = columnTitle(t.columnId);
                return (
                  <li key={t.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-accent/50">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(t.id)}
                        aria-label={`Select ${t.title || 'Untitled task'}`}
                      />
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate',
                          t.completed && 'text-muted-foreground line-through',
                        )}
                      >
                        {t.title || 'Untitled task'}
                      </span>
                      {col ? (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {col}
                        </span>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={draft.length === 0} onClick={apply}>
            Select {draft.length} task{draft.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
