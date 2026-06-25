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
 * New / edit task form, shared by TODO and Kanban. Edits go through a confirm
 * modal (req 10.6 / 11.7); the Kanban variant shows a status dropdown (req 11.8).
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? '');
      setDescription(initial?.description ?? '');
      setTags(initial?.tags ?? []);
      setColumnId(
        initial?.columnId ?? columns?.[0]?.id ?? null,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const valid = title.trim().length > 0;

  const build = (): TaskFormValues => ({
    title: title.trim(),
    description: description.trim(),
    tags,
    columnId: columns ? columnId : null,
  });

  const submit = () => {
    if (!valid) return;
    if (mode === 'edit') {
      setConfirmOpen(true);
    } else {
      onSubmit(build());
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
                }}
                placeholder="What needs doing?"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!valid}>
              {mode === 'edit' ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Save changes?"
        description="Update this task with your edits."
        confirmLabel="Save"
        onConfirm={() => {
          onSubmit(build());
          onOpenChange(false);
        }}
      />
    </>
  );
}
