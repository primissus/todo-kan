import { useEffect, useState } from 'react';
import { Keyboard, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { SettingsDialog } from '@/components/SettingsDialog';
import { CommandPalette } from '@/components/CommandPalette';
import { HelpDialog } from '@/components/HelpDialog';
import { HintOverlay } from '@/components/HintOverlay';
import { KeyboardStatus } from '@/components/KeyboardStatus';
import { useSystemThemeSync } from '@/hooks/useTheme';
import { useGlobalKeymap } from '@/hooks/useGlobalKeymap';
import { goHome, useRoute } from '@/lib/router';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import { HomePage } from '@/features/home/HomePage';
import { TodoView } from '@/features/todo/TodoView';
import { KanbanView } from '@/features/kanban/KanbanView';

export default function App() {
  useSystemThemeSync();
  useGlobalKeymap();
  const route = useRoute();
  const setHelpOpen = useUiStore((s) => s.setHelpOpen);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const board = useAppStore((s) =>
    route.name === 'board' ? s.boards[route.id] : undefined,
  );

  // Stale/invalid board hash → bounce home.
  useEffect(() => {
    if (route.name === 'board' && !board) goHome();
  }, [route, board]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={goHome}
            className="text-lg font-semibold tracking-tight"
          >
            todo<span className="text-primary">·</span>kan
          </button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (press ?)"
            onClick={() => setHelpOpen(true)}
          >
            <Keyboard className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="size-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        {route.name === 'home' && <HomePage />}
        {route.name === 'board' && board?.type === 'todo' && (
          <TodoView boardId={board.id} />
        )}
        {route.name === 'board' && board?.type === 'kanban' && (
          <KanbanView boardId={board.id} />
        )}
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CommandPalette />
      <HelpDialog />
      <HintOverlay />
      <KeyboardStatus />
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
