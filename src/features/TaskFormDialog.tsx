import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagInput } from '@/components/TagInput';
import { ConfirmModal } from '@/components/ConfirmModal';
import type { Column, ColumnId } from '@/lib/types/domain';

export interface TaskFormValues {
  title: string;
  description: string;
  tags: string[];
  columnId?: ColumnId | null;
}

export interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  heading: string;
  initial?: Partial<TaskFormValues>;
  /** When provided, a status (column) <Select> is shown (kanban). */
  columns?: Column[];
  allTags: string[];
  onSubmit: (values: TaskFormValues) => void;
}

/**
 * New / edit task form, shared by TODO and Kanban. Saving applies immediately
 * (no confirm step); the Kanban variant shows a status dropdown (req 11.8).
 * Closing a dirty form (Esc / outside-click / X / Cancel) asks to confirm the
 * discard so typed-but-unsaved input isn't lost.
 */
export function TaskFormDialog({
  open,
  onOpenChange,
  mode,
  heading,
  initial,
  columns,
  allTags,
  onSubmit,
}: TaskFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [columnId, setColumnId] = useState<ColumnId | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const baseTitle = initial?.title ?? '';
  const baseDescription = initial?.description ?? '';
  const baseTags = initial?.tags ?? [];
  const baseColumnId = initial?.columnId ?? columns?.[0]?.id ?? null;

  useEffect(() => {
    if (open) {
      setTitle(baseTitle);
      setDescription(baseDescription);
      setTags(baseTags);
      setColumnId(baseColumnId);
      setConfirmDiscard(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const valid = title.trim().length > 0;

  // Dirty = the user has typed/changed something away from the opening values.
  const dirty =
    title.trim() !== baseTitle.trim() ||
    description.trim() !== baseDescription.trim() ||
    tags.length !== baseTags.length ||
    tags.some((t, i) => t !== baseTags[i]) ||
    (!!columns && columnId !== baseColumnId);

  const build = (): TaskFormValues => ({
    title: title.trim(),
    description: description.trim(),
    tags,
    columnId: columns ? columnId : null,
  });

  const submit = () => {
    if (!valid) return;
    onSubmit(build());
    onOpenChange(false);
  };

  // Any close gesture (Esc / outside-click / X / Cancel) routes through here so
  // a dirty form prompts before discarding; a clean one just closes.
  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) requestClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
        </DialogHeader>

        {/*
         * Real <form> so Enter natively submits from any single-line input
         * (title, the empty chips input) — the description <Textarea> keeps
         * Enter for newlines, with Cmd/Ctrl+Enter as a submit shortcut.
         */}
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
              }}
              placeholder="Optional details…"
              rows={3}
            />
          </div>

          {columns ? (
            <div className="grid gap-2">
              <Label htmlFor="task-status">Status</Label>
              <Select
                value={columnId ?? columns[0]?.id}
                onValueChange={(v) => setColumnId(v as ColumnId)}
              >
                <SelectTrigger id="task-status" className="w-full">
                  <SelectValue placeholder="Select a column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label>Labels</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              suggestions={allTags}
              placeholder="Add labels…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              {mode === 'edit' ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <ConfirmModal
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard changes?"
        description="Your unsaved changes will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={() => onOpenChange(false)}
      />
    </Dialog>
  );
}
