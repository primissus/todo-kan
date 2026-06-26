import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { Archive, CalendarClock, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
import { Markdown } from '@/components/Markdown';
import { NoteThread } from '@/features/NoteThread';
import { formatDateTime } from '@/lib/datetime';
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
 * Unified task view/edit modal — opened on Enter / click / the card's open button.
 * It opens **read-only**: title, Markdown description, due date and labels are shown
 * for reading, with the discussion thread below. **Status and Reminder stay live
 * controls in the read-only view** (the two most common quick edits). Press
 * **Shift+E** (or the Edit button) to reveal the full form, whose fields commit LIVE
 * to the store as you edit (no Save/Discard — the only unsaved state is an
 * in-progress note draft, which prompts on close).
 * **Shift+C** jumps to the comment box; **"Done editing"** returns to the
 * read-only view. **Escape** first steps out of a focused field (nothing is lost —
 * fields auto-save), then closes the dialog on a second Escape when no field is
 * focused.
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

  const [editMode, setEditMode] = useState(false);
  const [noteUnsaved, setNoteUnsaved] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset to read-only when the dialog CLOSES, so the next open's first paint is
  // already the read-only view. (Resetting on open runs after paint → a one-frame
  // flash of the stale edit form, whose autoFocus'd input briefly steals focus.)
  useEffect(() => {
    if (!open) setEditMode(false);
  }, [open]);

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

  // Modal-local accelerators: Shift+E → edit, Shift+C → jump to the comment box.
  // Ignored while typing in a field so they don't eat the keystroke.
  const onShortcut = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k !== 'e' && k !== 'c') return;
    const ae = document.activeElement as HTMLElement | null;
    const typing =
      !!ae &&
      (ae.tagName === 'INPUT' ||
        ae.tagName === 'TEXTAREA' ||
        ae.tagName === 'SELECT' ||
        ae.isContentEditable);
    if (typing) return;
    if (k === 'e') {
      if (editMode) return;
      e.preventDefault();
      setEditMode(true);
    } else {
      e.preventDefault();
      composeRef.current?.focus();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) requestClose();
      }}
    >
      <DialogContent
        ref={contentRef}
        tabIndex={-1}
        className="sm:max-w-lg"
        onKeyDown={onShortcut}
        onEscapeKeyDown={(e) => {
          // Esc "steps out" of a focused field first (without closing — fields
          // already auto-save, so nothing is lost); it only closes the dialog
          // when no field is focused (a second Esc, after focus moved off).
          const ae = document.activeElement as HTMLElement | null;
          const inField =
            !!ae &&
            !!contentRef.current?.contains(ae) &&
            (ae.tagName === 'INPUT' ||
              ae.tagName === 'TEXTAREA' ||
              ae.tagName === 'SELECT' ||
              ae.isContentEditable);
          if (inField) {
            e.preventDefault();
            contentRef.current?.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">
            {editMode ? 'Edit task' : 'Task details'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1">
          {editMode ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="task-title">Title</Label>
                <Input
                  id="task-title"
                  autoFocus
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
                    timeFirst
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
            </>
          ) : (
            <ReadOnlyView
              title={task.title}
              description={task.description}
              columns={columns}
              columnId={task.columnId}
              onColumnChange={(id) => patch({ columnId: id })}
              dueAt={task.dueAt}
              remindAt={task.remindAt ?? null}
              onReminderChange={onReminderChange}
              tags={task.tags}
              onEdit={() => setEditMode(true)}
            />
          )}

          <Separator />

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Discussion</Label>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                <Kbd>⇧C</Kbd> to comment
              </span>
            </div>
            <NoteThread
              taskId={taskId}
              resetKey={taskId}
              onUnsavedChange={setNoteUnsaved}
              composeRef={composeRef}
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
          {editMode ? (
            <Button type="button" size="sm" onClick={() => setEditMode(false)}>
              Done editing
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={requestClose}>
              Done
            </Button>
          )}
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

/** A small inline keycap, matching the muted hint style used elsewhere. */
function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1 font-sans text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

interface ReadOnlyViewProps {
  title: string;
  description: string;
  /** Undefined on TODO boards (no columns); the board's columns on Kanban. */
  columns?: Column[];
  columnId: ColumnId | null;
  onColumnChange: (id: ColumnId) => void;
  dueAt?: number;
  remindAt: number | null;
  onReminderChange: (value: number | null) => void;
  tags: string[];
  onEdit: () => void;
}

/**
 * The read-only presentation of a task. Most fields are display-only (edit them
 * via the Edit button), but **Status and Reminder are live controls** here so the
 * two most common quick changes don't require entering edit mode.
 */
function ReadOnlyView({
  title,
  description,
  columns,
  columnId,
  onColumnChange,
  dueAt,
  remindAt,
  onReminderChange,
  tags,
  onEdit,
}: ReadOnlyViewProps) {
  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-lg leading-snug font-semibold break-words">
          {title || (
            <span className="font-normal text-muted-foreground">Untitled task</span>
          )}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          aria-keyshortcuts="Shift+E"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
          Edit
          <Kbd>⇧E</Kbd>
        </Button>
      </div>

      {description.trim() ? (
        <div className="text-sm break-words text-foreground/90">
          <Markdown text={description} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No description.</p>
      )}

      <dl className="grid gap-2 text-sm">
        {columns ? (
          <Row term="Status">
            <Select
              value={columnId ?? columns[0]?.id}
              onValueChange={(v) => onColumnChange(v as ColumnId)}
            >
              <SelectTrigger aria-label="Status" className="w-full">
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
          </Row>
        ) : null}

        {dueAt ? (
          <Row term="Due">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {formatDateTime(dueAt)}
            </span>
          </Row>
        ) : null}

        <Row term="Reminder">
          <DateTimePicker
            label="Reminder"
            placeholder="No reminder"
            timeFirst
            value={remindAt}
            onChange={onReminderChange}
          />
        </Row>

        {tags.length > 0 ? (
          <Row term="Labels" alignTop>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          </Row>
        ) : null}
      </dl>
    </div>
  );
}

function Row({
  term,
  alignTop,
  children,
}: {
  term: string;
  alignTop?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex gap-3 ${alignTop ? 'items-start' : 'items-center'}`}>
      <dt
        className={`w-20 shrink-0 text-muted-foreground ${alignTop ? 'pt-0.5' : ''}`}
      >
        {term}
      </dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
