import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Trash2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ThemeControls } from '@/components/ThemeControls';
import { ExportDialog } from '@/components/ExportDialog';
import { ImportDialog } from '@/components/ImportDialog';
import { TypeToConfirmModal } from '@/components/TypeToConfirmModal';
import { useAppStore } from '@/store/useAppStore';

export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Global settings: theme, appearance, export, import, clear-all (req 7). */
export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const clearAll = useAppStore((s) => s.clearAll);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  // Avoid stacked modals: close settings before opening a sub-dialog.
  const openSub = (setter: (v: boolean) => void) => {
    onOpenChange(false);
    setter(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <ThemeControls />

          <Separator />

          <div className="grid gap-2">
            <Label>Data</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => openSub(setExportOpen)}
              >
                <Download className="size-4" />
                Export
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => openSub(setImportOpen)}
              >
                <Upload className="size-4" />
                Import
              </Button>
            </div>
            <Button
              variant="destructive"
              onClick={() => openSub(setClearOpen)}
            >
              <Trash2 className="size-4" />
              Clear all data
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <TypeToConfirmModal
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear all data"
        description="This permanently deletes every list, board, and task. This cannot be undone."
        phrase="delete all tasks"
        confirmLabel="Delete everything"
        onConfirm={() => {
          clearAll();
          toast.success('All data cleared.');
        }}
      />
    </>
  );
}
