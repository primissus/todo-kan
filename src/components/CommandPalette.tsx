// Search palette opened by `/`, ⌘K or Ctrl+K. Searches the CURRENT board's tasks
// (or, on Home, the lists/boards). Choosing a task moves the cursor to it (and
// scrolls it into view); choosing a board navigates to it. Reuses lib/search's
// Fuse.js filter and the shared SearchBar.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchBar } from '@/components/SearchBar';
import { cn } from '@/lib/utils';
import { filterBySearch } from '@/lib/search';
import { goBoard, useRoute } from '@/lib/router';
import { useUiStore } from '@/store/useUiStore';
import { useBoard, useBoardTasks, useOrderedBoards } from '@/store/selectors';

interface Item {
  id: string;
  title: string;
  description: string;
  tags: string[];
  kind: 'board' | 'task';
  sub?: string;
}

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const setSelected = useUiStore((s) => s.setSelected);
  const route = useRoute();
  const boards = useOrderedBoards();
  const boardId = route.name === 'board' ? route.id : '';
  const board = useBoard(boardId);
  const tasks = useBoardTasks(boardId);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const items: Item[] = useMemo(() => {
    if (route.name === 'home') {
      return boards
        .filter((b) => !b.archived)
        .map((b) => ({
          id: b.id,
          title: b.title || 'Untitled',
          description: b.description,
          tags: b.tags,
          kind: 'board' as const,
          sub: b.type === 'kanban' ? 'Kanban' : 'List',
        }));
    }
    // Only offer tasks that are actually visible on the board — otherwise jumping
    // to a hidden (completed-and-hidden) task would strand the cursor off-screen.
    const showCompleted = board?.showCompleted ?? true;
    return tasks
      .filter((t) => !t.archived && (showCompleted || !t.completed))
      .map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        tags: t.tags,
        kind: 'task' as const,
      }));
  }, [route.name, boards, tasks, board?.showCompleted]);

  const results = useMemo(
    () => filterBySearch(items, query).slice(0, 50),
    [items, query],
  );

  useEffect(() => setActive(0), [query]);
  // Keep the keyboard-highlighted row visible inside the scroll container.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (item: Item) => {
    setOpen(false);
    if (item.kind === 'board') goBoard(item.id);
    else setSelected(item.id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[active];
      if (item) choose(item);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[12%] max-w-lg translate-y-0 gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search and jump to a task or board.
        </DialogDescription>
        <div className="border-b p-2" onKeyDown={onKeyDown}>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder={
              route.name === 'home'
                ? 'Search lists & boards…'
                : 'Search this board…'
            }
          />
        </div>
        <ul
          role="listbox"
          aria-label="Search results"
          className="max-h-80 overflow-y-auto p-1"
        >
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches
            </li>
          ) : (
            results.map((item, i) => (
              <li key={item.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  ref={i === active ? activeRef : null}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(item)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm',
                    i === active && 'bg-accent text-accent-foreground',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {item.title || 'Untitled'}
                  </span>
                  {item.sub ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.sub}
                    </span>
                  ) : null}
                  {item.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
