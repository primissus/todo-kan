import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface TypeToConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** The exact phrase the user must type to enable the action. */
  phrase: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/**
 * Destructive-action guard requiring the user to type an exact phrase
 * (req 7.3 "delete all tasks", req 10.7 / 11.10 "clear").
 */
export function TypeToConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  phrase,
  confirmLabel = 'Confirm',
  destructive = true,
  onConfirm,
}: TypeToConfirmModalProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!open) setValue('');
  }, [open]);

  const matches = value.trim() === phrase;

  const submit = () => {
    if (!matches) return;
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="confirm-phrase">
            Type <code className="rounded bg-muted px-1 py-0.5 text-foreground">{phrase}</code> to confirm
          </Label>
          <Input
            id="confirm-phrase"
            autoFocus
            autoComplete="off"
            value={value}
            placeholder={phrase}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={!matches}
            onClick={submit}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
