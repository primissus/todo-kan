import { useState } from 'react';
import { toast } from 'sonner';
import { Archive, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagInput } from '@/components/TagInput';
import { DateTimePicker } from '@/components/DateTimePicker';
import { ConfirmModal } from '@/components/ConfirmModal';
import { NoteThread } from '@/features/NoteThread';
import {
  notificationPermission,
  requestNotificationPermission,
} from '@/lib/notifications';
import { useAppStore } from '@/store/useAppStore';
import type { Column, ColumnId } from '@/lib/types/domain';

export interface TaskDialogProps {
  /** Task to view/edit; read live from the store. */
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Provided on Kanban → shows a status (column) selector. */
  columns?: Column[];
  allTags: string[];
}

/**
 * Unified task view/edit modal — opened on Enter / click / the card's open button
 * (it replaced the separate edit dialog). The detail fields (title, description,
 * status, due date, reminder, labels) commit LIVE to the store as you edit, and
 * the discussion thread is embedded below. Because everything auto-saves, there's
 * no Save/Discard for the fields; the only unsaved state is an in-progress note
 * draft, which prompts a discard confirm on close.
 */
export function TaskDialog({
  taskId,
  open,
  onOpenChange,
  columns,
  allTags,
}: TaskDialogProps) {
  const task = useAppStore((s) => (taskId ? s.tasks[taskId] : undefined));
  const editTask = useAppStore((s) => s.editTask);
  const archiveTask = useAppStore((s) => s.archiveTask);
  const deleteTask = useAppStore((s) => s.deleteTask);

  const [noteUnsaved, setNoteUnsaved] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!taskId || !task) {
    // Keep a (closed) Dialog mounted so the open/close transition stays smooth.
    return <Dialog open={open} onOpenChange={onOpenChange} />;
  }

  const patch = (p: Parameters<typeof editTask>[1]) => editTask(taskId, p);

  // Setting a reminder asks for notification permission on this user gesture, and
  // explains when reminders can't actually be delivered.
  const onReminderChange = async (value: number | null) => {
    patch({ remindAt: value });
    if (value == null) return;
    const perm = notificationPermission();
    if (perm === 'unsupported') {
      toast.warning('Notifications are not available in this browser.');
      return;
    }
    if (perm === 'default') {
      const res = await requestNotificationPermission();
      if (res !== 'granted') {
        toast.warning('Reminder saved, but notifications are blocked.');
      }
    } else if (perm === 'denied') {
      toast.warning('Reminder saved, but notifications are blocked.');
    }
  };

  const requestClose = () => {
    if (noteUnsaved) setConfirmClose(true);
    else onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) requestClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">Task details</DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={task.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="What needs doing?"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={task.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Optional details…"
              rows={3}
            />
          </div>

          {columns ? (
            <div className="grid gap-2">
              <Label htmlFor="task-status">Status</Label>
              <Select
                value={task.columnId ?? columns[0]?.id}
                onValueChange={(v) => patch({ columnId: v as ColumnId })}
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

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Due date</Label>
              <DateTimePicker
                label="Due date"
                placeholder="No due date"
                value={task.dueAt ?? null}
                onChange={(v) => patch({ dueAt: v })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Reminder</Label>
              <DateTimePicker
                label="Reminder"
                placeholder="No reminder"
                value={task.remindAt ?? null}
                onChange={onReminderChange}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Labels</Label>
            <TagInput
              value={task.tags}
              onChange={(tags) => patch({ tags })}
              suggestions={allTags}
              placeholder="Add labels…"
            />
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label>Discussion</Label>
            <NoteThread
              taskId={taskId}
              resetKey={taskId}
              onUnsavedChange={setNoteUnsaved}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            aria-label="Delete task"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
            Delete task
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              archiveTask(taskId);
              onOpenChange(false);
            }}
          >
            <Archive className="size-4" />
            Archive
          </Button>
          <Button type="button" size="sm" onClick={requestClose}>
            Done
          </Button>
        </div>
      </DialogContent>

      <ConfirmModal
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Discard changes?"
        description="Your unsaved note text will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={() => onOpenChange(false)}
      />

      <ConfirmModal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this task?"
        description={`"${task.title || 'Untitled task'}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          deleteTask(taskId);
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
