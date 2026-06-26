import { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Linkify } from '@/components/Linkify';
import { useAppStore } from '@/store/useAppStore';

export interface NotesDialogProps {
  /** Task whose thread to show; the dialog reads it live from the store. */
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTs(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '';
  }
}

// One confirm modal serves three jobs: deleting a note, discarding unsaved text
// on close, or discarding an in-progress edit when switching to another note.
type Pending =
  | { kind: 'delete'; id: string }
  | { kind: 'discard' }
  | { kind: 'switch'; id: string; text: string }
  | null;

/**
 * A task's note thread: read it, add to it, edit or delete individual notes.
 * Every note action commits immediately (it's a thread, not a form), so there's
 * no Save/Discard for the list itself — but anything that would drop unsaved
 * draft/edit text (closing, or switching the open edit to another note) prompts a
 * discard confirm, matching the app's "don't lose typed input" rule. Note text is
 * linkified just like task descriptions.
 */
export function NotesDialog({ taskId, open, onOpenChange }: NotesDialogProps) {
  const task = useAppStore((s) => (taskId ? s.tasks[taskId] : undefined));
  const addNote = useAppStore((s) => s.addNote);
  const editNote = useAppStore((s) => s.editNote);
  const deleteNote = useAppStore((s) => s.deleteNote);

  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [pending, setPending] = useState<Pending>(null);

  // Reset everything each time the dialog opens.
  useEffect(() => {
    if (open) {
      setDraft('');
      setEditingId(null);
      setEditDraft('');
      setPending(null);
    }
  }, [open]);

  const notes = task?.notes ?? [];
  const editingNote = editingId ? notes.find((n) => n.id === editingId) : undefined;
  const editDirty = !!editingNote && editDraft.trim() !== editingNote.text.trim();
  const hasUnsaved = draft.trim().length > 0 || editDirty;

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const startEdit = (id: string, text: string) => {
    // Switching away from a dirty edit would silently lose it — confirm first.
    if (editDirty && editingId !== id) {
      setPending({ kind: 'switch', id, text });
      return;
    }
    setEditingId(id);
    setEditDraft(text);
  };

  const submitAdd = () => {
    const text = draft.trim();
    if (!text || !taskId) return;
    addNote(taskId, text);
    setDraft('');
  };

  const saveEdit = () => {
    const text = editDraft.trim();
    if (!text || !taskId || !editingId) return;
    // Only touch the store (and bump updatedAt / the "edited" marker) on a real
    // change; an unchanged Save just leaves edit mode.
    if (editDirty) editNote(taskId, editingId, text);
    cancelEdit();
  };

  // Any close gesture routes through here so unsaved text prompts first.
  const requestClose = () => {
    if (hasUnsaved) setPending({ kind: 'discard' });
    else onOpenChange(false);
  };

  const confirmPending = () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      if (taskId) deleteNote(taskId, pending.id);
      if (editingId === pending.id) cancelEdit();
    } else if (pending.kind === 'switch') {
      setEditingId(pending.id);
      setEditDraft(pending.text);
    } else {
      onOpenChange(false);
    }
    setPending(null);
  };

  // The confirm copy is derived from a ref, not `pending` directly: `pending`
  // goes null the instant we confirm, but Radix keeps the modal mounted through
  // its ~200ms close animation — reading `pending` there would flash the other
  // branch's text. The ref holds the last shown copy until it finishes closing.
  const confirmCopy = useRef({ title: '', description: '', confirmLabel: '' });
  if (pending) {
    confirmCopy.current =
      pending.kind === 'delete'
        ? {
            title: 'Delete this note?',
            description: 'This note will be permanently deleted.',
            confirmLabel: 'Delete',
          }
        : {
            title: 'Discard changes?',
            description: 'Your unsaved note text will be lost.',
            confirmLabel: 'Discard',
          };
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) requestClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Notes</DialogTitle>
          <DialogDescription className="truncate">
            {task ? task.title || 'Untitled task' : ''}
          </DialogDescription>
        </DialogHeader>

        {notes.length > 0 ? (
          <ScrollArea className="max-h-[50vh]">
            <ul className="grid gap-2 pr-3">
              {notes.map((n) => {
                const stamp = formatTs(n.createdAt);
                const ctx = stamp ? ` from ${stamp}` : '';
                return (
                  <li key={n.id} className="rounded-md border bg-card p-2.5">
                    {editingId === n.id ? (
                      <div className="grid gap-2">
                        <Textarea
                          autoFocus
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              saveEdit();
                            }
                          }}
                          rows={3}
                          aria-label="Edit note"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!editDraft.trim()}
                            onClick={saveEdit}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm break-words whitespace-pre-wrap">
                          <Linkify text={n.text} />
                        </p>
                        <div className="mt-1.5 flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {stamp}
                            {n.updatedAt > n.createdAt ? ' · edited' : ''}
                          </span>
                          <div className="flex-1" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            aria-label={`Edit note${ctx}`}
                            onClick={() => startEdit(n.id, n.text)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive"
                            aria-label={`Delete note${ctx}`}
                            onClick={() => setPending({ kind: 'delete', id: n.id })}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        ) : (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            No notes yet. Add the first one below.
          </div>
        )}

        <div className="grid gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submitAdd();
              }
            }}
            placeholder="Add a note…"
            rows={3}
            aria-label="Add a note"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              ⌘/Ctrl + Enter to add
            </span>
            <Button
              type="button"
              size="sm"
              disabled={!draft.trim()}
              onClick={submitAdd}
            >
              <MessageSquarePlus className="size-4" />
              Add note
            </Button>
          </div>
        </div>
      </DialogContent>

      <ConfirmModal
        open={pending !== null}
        onOpenChange={(o) => {
          if (!o) setPending(null);
        }}
        title={confirmCopy.current.title}
        description={confirmCopy.current.description}
        confirmLabel={confirmCopy.current.confirmLabel}
        destructive
        onConfirm={confirmPending}
      />
    </Dialog>
  );
}
