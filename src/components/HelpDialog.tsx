// Keyboard shortcuts cheat sheet (opened with `?` or the header button).
// Rendered entirely from lib/keymap.ts so it can never drift from the bindings.

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KEY_CATEGORIES, visibleBindings } from '@/lib/keymap';
import { useUiStore } from '@/store/useUiStore';

export function HelpDialog() {
  const open = useUiStore((s) => s.helpOpen);
  const setOpen = useUiStore((s) => s.setHelpOpen);
  const vimEnabled = useUiStore((s) => s.vimEnabled);
  const bindings = visibleBindings(vimEnabled);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm" role="status">
          Vim keys are{' '}
          <span className={vimEnabled ? 'font-semibold text-primary' : 'font-semibold'}>
            {vimEnabled ? 'ON' : 'OFF'}
          </span>
          . Type{' '}
          <kbd className="rounded border bg-muted px-1 font-mono text-xs">:</kbd>{' '}
          <kbd className="rounded border bg-muted px-1 font-mono text-xs">q</kbd>{' '}
          <kbd className="rounded border bg-muted px-1 font-mono text-xs">↵</kbd> to
          toggle. Without them, the arrow keys,{' '}
          <kbd className="rounded border bg-muted px-1 font-mono text-xs">Enter</kbd> and{' '}
          <kbd className="rounded border bg-muted px-1 font-mono text-xs">⌘K</kbd> still
          work.
        </div>
        <div className="grid gap-5">
          {KEY_CATEGORIES.map((cat) => {
            const rows = bindings.filter((b) => b.category === cat);
            if (rows.length === 0) return null;
            return (
              <div key={cat} className="grid gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {cat}
                </h3>
                <dl className="grid gap-1.5">
                  {rows.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-4"
                    >
                      <dt className="text-sm">{b.label}</dt>
                      <dd className="flex shrink-0 items-center gap-1">
                        {b.keys.map((k, ki) => (
                          <kbd
                            key={ki}
                            className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                          >
                            {k}
                          </kbd>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
