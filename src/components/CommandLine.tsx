// Bottom-left Vim-style command line + mode indicator.
//
// Vim key motions are opt-in (useUiStore.vimEnabled, off by default). The only
// way to flip them is here: press `:` (handled in useGlobalKeymap) to open this
// line, type `q`, press Enter. `:q` toggles Vim keys on/off — quirky, but it's
// the gesture the app is specified around.
//
// While the line is open its <input> holds focus, so the global keymap's guard
// (shouldHandle) ignores every key — the input owns typing, Enter and Esc.

import { useUiStore } from '@/store/useUiStore';

/** Run a command typed after the leading `:`. Only `q` is bound (toggle Vim). */
function runCommand(raw: string): void {
  const cmd = raw.trim().toLowerCase();
  const ui = useUiStore.getState();
  if (cmd === 'q') ui.toggleVim();
  // Unknown commands: just close (below). Keep the surface deliberately tiny.
  ui.closeCmdline();
}

export function CommandLine() {
  const cmdline = useUiStore((s) => s.cmdline);
  const vimEnabled = useUiStore((s) => s.vimEnabled);
  const setCmdline = useUiStore((s) => s.setCmdline);
  const closeCmdline = useUiStore((s) => s.closeCmdline);
  const openCmdline = useUiStore((s) => s.openCmdline);

  const open = cmdline !== null;

  return (
    <div className="fixed bottom-3 left-3 z-[80]">
      {open ? (
        <form
          className="flex items-center gap-1 rounded-md border bg-popover px-2 py-1 font-mono text-sm text-popover-foreground shadow-lg"
          onSubmit={(e) => {
            e.preventDefault();
            runCommand(cmdline ?? '');
          }}
        >
          <span className="text-muted-foreground select-none">:</span>
          <input
            autoFocus
            aria-label="Command line"
            className="w-40 bg-transparent outline-none placeholder:text-muted-foreground/60"
            placeholder="q ↵ toggles Vim keys"
            value={cmdline ?? ''}
            onChange={(e) => setCmdline(e.target.value)}
            onBlur={closeCmdline}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                closeCmdline();
              }
            }}
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={openCmdline}
          title="Type : then q then Enter to toggle Vim keys"
          className="rounded-md border bg-popover/80 px-2 py-1 font-mono text-xs shadow-sm backdrop-blur transition-colors hover:bg-popover"
        >
          {vimEnabled ? (
            <span className="font-medium text-primary">— VIM —</span>
          ) : (
            <span className="text-muted-foreground">:</span>
          )}
        </button>
      )}
    </div>
  );
}
