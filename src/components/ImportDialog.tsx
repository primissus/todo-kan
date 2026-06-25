import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAppStore, type ImportMode } from '@/store/useAppStore';
import { parseImport, type TransferPayload } from '@/lib/transfer';

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Import boards from a JSON export; ids are regenerated on import (req 7.5). */
export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const importBoards = useAppStore((s) => s.importBoards);
  const fileRef = useRef<HTMLInputElement>(null);
  const [payload, setPayload] = useState<TransferPayload | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<ImportMode>('merge');

  useEffect(() => {
    if (!open) {
      setPayload(null);
      setFileName('');
      setError('');
      setMode('merge');
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [open]);

  const onFile = async (file: File) => {
    setError('');
    setPayload(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      setPayload(parseImport(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read file.');
    }
  };

  const doImport = () => {
    if (!payload) return;
    const count = importBoards(payload, mode);
    toast.success(`Imported ${count} ${count === 1 ? 'item' : 'items'}.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import</DialogTitle>
          <DialogDescription>
            Import lists and boards from a todo-kan JSON export. Items get fresh
            ids, so importing never overwrites existing data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            {fileName || 'Choose JSON file…'}
          </Button>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : payload ? (
            <p className="text-sm text-muted-foreground">
              Ready to import <strong>{payload.boards.length}</strong>{' '}
              {payload.boards.length === 1 ? 'item' : 'items'}.
            </p>
          ) : null}

          {payload ? (
            <div className="grid gap-2">
              <Label>Mode</Label>
              <div className="grid grid-cols-2 gap-1 rounded-md border p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'merge' ? 'default' : 'ghost'}
                  onClick={() => setMode('merge')}
                >
                  Merge
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'replace' ? 'default' : 'ghost'}
                  onClick={() => setMode('replace')}
                >
                  Replace all
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={doImport} disabled={!payload}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
