import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  FilePlus2,
  FolderOpen,
  RefreshCw,
  Save,
  Unlink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/datetime';
import { useAppStore } from '@/store/useAppStore';
import {
  parseImport,
  payloadsEqual,
  summarizePayload,
  type TransferPayload,
} from '@/lib/transfer';
import {
  currentPayload,
  isFileSyncSupported,
  pickFileToLink,
  pickNewFile,
  readHandle,
  saveNow,
  setLinked,
  unlink,
  useFileSync,
  type FileSyncState,
} from '@/lib/fileSync';

// A picked file whose content conflicts with (or isn't) a todo·kan backup, held
// until the user resolves the overwrite direction.
type Pending =
  | { kind: 'conflict'; handle: FileSystemFileHandle; file: TransferPayload }
  | { kind: 'foreign'; handle: FileSystemFileHandle; message: string }
  | null;

/**
 * "Sync to a file": link a JSON file once and todo·kan auto-saves the whole
 * dataset to it. On link we read + compare the file with the current data; if
 * they differ a banner lets the user pick which side wins before syncing.
 */
export function FileSyncSection() {
  const supported = isFileSyncSupported();
  const sync = useFileSync();
  const importBoards = useAppStore((s) => s.importBoards);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);

  if (!supported) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Saving directly to a file isn’t supported in this browser. Use{' '}
        <strong>Export</strong> below to download a copy instead.
      </div>
    );
  }

  // setBusy(true) BEFORE the picker disables both buttons while the native
  // dialog is open (a second click would throw "file picker already active").
  const linkExisting = async () => {
    setBusy(true);
    try {
      const h = await pickFileToLink();
      if (!h) return;
      const text = await readHandle(h);
      if (text.trim() === '') {
        // Empty file → nothing to overwrite; just link and write.
        setLinked(h);
        if (await saveNow()) toast.success(`Linked — auto-saving to ${h.name}.`);
        else toast.error(`Linked ${h.name}, but couldn’t write to it — check permissions.`);
        return;
      }
      let file: TransferPayload;
      try {
        file = parseImport(text);
      } catch (e) {
        setPending({
          kind: 'foreign',
          handle: h,
          message: e instanceof Error ? e.message : 'Unrecognized file.',
        });
        return;
      }
      if (payloadsEqual(currentPayload(), file)) {
        setLinked(h);
        toast.success(`Linked to ${h.name} — already in sync.`);
        return;
      }
      setPending({ kind: 'conflict', handle: h, file });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open the file.');
    } finally {
      setBusy(false);
    }
  };

  const newFile = async () => {
    setBusy(true);
    try {
      const h = await pickNewFile();
      if (!h) return;
      setLinked(h);
      if (await saveNow()) toast.success(`Created ${h.name} — auto-saving to it.`);
      else toast.error(`Created ${h.name}, but couldn’t write to it — check permissions.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open the file picker.');
    } finally {
      setBusy(false);
    }
  };

  // Conflict: replace the app's data with the file's, then keep syncing.
  const loadFromFile = async () => {
    if (pending?.kind !== 'conflict') return;
    const h = pending.handle;
    setBusy(true);
    try {
      importBoards(pending.file, 'replace');
      setLinked(h);
      const ok = await saveNow();
      setPending(null);
      if (ok) toast.success(`Loaded ${h.name} — now auto-saving to it.`);
      else toast.error(`Loaded ${h.name}, but couldn’t write back — check permissions or re-link.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load the file.');
    } finally {
      setBusy(false);
    }
  };

  // Conflict/foreign: keep the app's data and overwrite the file, then sync.
  const overwriteFile = async () => {
    if (!pending) return;
    const h = pending.handle;
    setBusy(true);
    try {
      setLinked(h);
      const ok = await saveNow();
      setPending(null);
      if (ok) toast.success(`Saved your data to ${h.name} — auto-saving from now on.`);
      else toast.error(`Couldn’t write to ${h.name} — check permissions or re-link.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not write the file.');
    } finally {
      setBusy(false);
    }
  };

  const doUnlink = () => {
    unlink();
    toast.message('Stopped auto-saving to the file.');
  };

  // Conflict: file holds a different todo·kan backup. Counts alone can't tell the
  // two sides apart (a rename/reorder/new due date leaves them equal), so we also
  // surface the file's last-saved time and say so outright.
  if (pending?.kind === 'conflict') {
    const app = summarizePayload(currentPayload());
    const file = summarizePayload(pending.file);
    const savedAt = formatDateTime(pending.file.exportedAt);
    return (
      <div className="grid gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="grid gap-1 text-sm">
            <span className="font-medium">This file already has data</span>
            <span className="text-xs text-muted-foreground">
              <strong className="break-all">{pending.handle.name}</strong>
              {savedAt ? ` — last saved ${savedAt}` : ''}. It holds {file.boards} list
              {file.boards === 1 ? '' : 's'} / {file.tasks} task
              {file.tasks === 1 ? '' : 's'}; this app has {app.boards} list
              {app.boards === 1 ? '' : 's'} / {app.tasks} task
              {app.tasks === 1 ? '' : 's'}. The counts can match even when the
              contents differ — pick which to keep; the other side is overwritten.
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={loadFromFile}>
            Load file into app
          </Button>
          <Button size="sm" disabled={busy} onClick={overwriteFile}>
            Keep this app’s data
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setPending(null)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Foreign: not a todo·kan backup at all — linking can only overwrite it.
  if (pending?.kind === 'foreign') {
    const app = summarizePayload(currentPayload());
    return (
      <div className="grid gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="grid gap-1 text-sm">
            <span className="font-medium">This file isn’t a todo·kan backup</span>
            <span className="text-xs text-muted-foreground">
              {pending.message} Linking overwrites{' '}
              <strong className="break-all">{pending.handle.name}</strong> with this
              app’s data ({app.boards} list{app.boards === 1 ? '' : 's'} / {app.tasks}{' '}
              task{app.tasks === 1 ? '' : 's'}).
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={overwriteFile}>
            Overwrite & link
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setPending(null)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (sync.fileName) {
    return (
      <div className="grid gap-2 rounded-md border p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="grid min-w-0 gap-0.5">
            <span className="text-sm font-medium">Auto-saving to file</span>
            <span className="truncate text-xs text-muted-foreground">
              {sync.fileName}
            </span>
          </div>
          <StatusPill status={sync.status} />
        </div>
        {sync.status === 'error' && sync.error && (
          <p className="text-xs text-destructive">{sync.error}</p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={busy || sync.status === 'saving'}
            onClick={() => void saveNow()}
          >
            <Save className="size-4" />
            Save now
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={doUnlink}>
            <Unlink className="size-4" />
            Unlink
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-md border p-3">
      <div className="grid gap-0.5">
        <span className="text-sm font-medium">Sync to a file</span>
        <span className="text-xs text-muted-foreground">
          Link a JSON file and todo·kan saves to it automatically on every change —
          no more repeated downloads. Session only: re-link after a page reload.
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={linkExisting}
        >
          <FolderOpen className="size-4" />
          Link file…
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={newFile}
        >
          <FilePlus2 className="size-4" />
          New file…
        </Button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: FileSyncState['status'] }) {
  if (status === 'saving') {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <RefreshCw className="size-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <Check className="size-3" />
        Saved
      </span>
    );
  }
  if (status === 'error') {
    return <span className="shrink-0 text-xs text-destructive">Error</span>;
  }
  return null;
}
