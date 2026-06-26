import { useEffect, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { ThemeControls } from '@/components/ThemeControls';
import { ExportDialog } from '@/components/ExportDialog';
import { ImportDialog } from '@/components/ImportDialog';
import { TypeToConfirmModal } from '@/components/TypeToConfirmModal';
import { APP_VERSION } from '@/lib/version';
import {
  notificationPermission,
  notificationsEnabled,
  requestNotificationPermission,
  setNotificationsEnabled,
  type PermissionState,
} from '@/lib/notifications';
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
  const [notifOn, setNotifOn] = useState(false);
  const [perm, setPerm] = useState<PermissionState>('default');

  // Read live notification state each time settings opens.
  useEffect(() => {
    if (open) {
      setNotifOn(notificationsEnabled());
      setPerm(notificationPermission());
    }
  }, [open]);

  const onToggleNotifications = async (value: boolean) => {
    setNotifOn(value);
    setNotificationsEnabled(value);
    if (value && notificationPermission() === 'default') {
      const res = await requestNotificationPermission();
      setPerm(res);
      if (res !== 'granted') {
        toast.warning('Allow notifications in your browser to get reminders.');
      }
    }
  };

  const permHint =
    perm === 'unsupported'
      ? 'Not supported in this browser.'
      : perm === 'granted'
        ? 'Reminders show while the app is open.'
        : perm === 'denied'
          ? 'Blocked — enable notifications in browser settings.'
          : 'Set a reminder on a task to grant permission.';

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
            <Label>Reminders</Label>
            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="grid gap-0.5">
                <span className="text-sm font-medium">
                  Notification reminders
                </span>
                <span className="text-xs text-muted-foreground">{permHint}</span>
              </div>
              <Switch
                checked={notifOn}
                onCheckedChange={onToggleNotifications}
                aria-label="Enable notification reminders"
              />
            </div>
          </div>

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

          <Separator />

          <p className="text-center text-xs text-muted-foreground">
            todo<span className="text-primary">·</span>kan · v{APP_VERSION}
          </p>
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
