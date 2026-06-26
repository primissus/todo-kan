import { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Linkify } from '@/components/Linkify';
import { useAppStore } from '@/store/useAppStore';

export interface NoteThreadProps {
  /** Task whose thread to show; read live from the store. */
  taskId: string;
  /** Reset internal drafts (called when the host dialog (re)opens). */
  resetKey?: unknown;
  /** Reports whether there's unsaved draft/edit text, so the host can guard close. */
  onUnsavedChange?: (unsaved: boolean) => void;
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

// One confirm modal serves two jobs: deleting a note, or discarding an in-progress
// edit when switching to another note. (Closing the host dialog with unsaved text
// is guarded by the host via `onUnsavedChange`.)
type Pending =
  | { kind: 'delete'; id: string }
  | { kind: 'switch'; id: string; text: string }
  | null;

/**
 * A task's note/discussion thread: read it, add to it, edit or delete individual
 * notes. Every note action commits immediately (it's a thread, not a form). The
 * only unsaved state is an in-progress draft/edit — switching the open edit to
 * another note prompts a discard confirm, and the host dialog is told via
 * `onUnsavedChange` so closing can prompt too. Note text is linkified like
 * descriptions. Extracted from the former standalone NotesDialog so it can live
 * inside the unified TaskDialog.
 */
export function NoteThread({ taskId, resetKey, onUnsavedChange }: NoteThreadProps) {
  const task = useAppStore((s) => s.tasks[taskId]);
  const addNote = useAppStore((s) => s.addNote);
  const editNote = useAppStore((s) => s.editNote);
  const deleteNote = useAppStore((s) => s.deleteNote);

  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [pending, setPending] = useState<Pending>(null);

  // Reset drafts whenever the host signals a (re)open.
  useEffect(() => {
    setDraft('');
    setEditingId(null);
    setEditDraft('');
    setPending(null);
  }, [resetKey]);

  const notes = task?.notes ?? [];
  const editingNote = editingId ? notes.find((n) => n.id === editingId) : undefined;
  const editDirty = !!editingNote && editDraft.trim() !== editingNote.text.trim();
  const hasUnsaved = draft.trim().length > 0 || editDirty;

  useEffect(() => {
    onUnsavedChange?.(hasUnsaved);
  }, [hasUnsaved, onUnsavedChange]);

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const startEdit = (id: string, text: string) => {
    if (editDirty && editingId !== id) {
      setPending({ kind: 'switch', id, text });
      return;
    }
    setEditingId(id);
    setEditDraft(text);
  };

  const submitAdd = () => {
    const text = draft.trim();
    if (!text) return;
    addNote(taskId, text);
    setDraft('');
  };

  const saveEdit = () => {
    const text = editDraft.trim();
    if (!text || !editingId) return;
    if (editDirty) editNote(taskId, editingId, text);
    cancelEdit();
  };

  const confirmPending = () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      deleteNote(taskId, pending.id);
      if (editingId === pending.id) cancelEdit();
    } else {
      setEditingId(pending.id);
      setEditDraft(pending.text);
    }
    setPending(null);
  };

  // Keep the confirm copy stable through Radix's close animation (see NotesDialog
  // history): `pending` goes null on confirm but the modal is still mounted.
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
    <div className="grid gap-2">
      {notes.length > 0 ? (
        <ScrollArea className="max-h-[40vh]">
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
        <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
          No notes yet. Add the first one below.
        </div>
      )}

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
        rows={2}
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
    </div>
  );
}
