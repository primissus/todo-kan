import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArchiveRestore,
  ChevronDown,
  Circle,
  Columns3,
  ListTodo,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SearchBar } from '@/components/SearchBar';
import { BoardCard } from '@/features/home/BoardCard';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';
import { filterBySearch, parseQuery, type Searchable } from '@/lib/search';
import { goBoard } from '@/lib/router';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import { useAllTasks, useOrderedBoards } from '@/store/selectors';
import type { BoardType } from '@/lib/types/domain';

interface TaskItem extends Searchable {
  id: string;
  boardId: string;
  boardTitle: string;
}

interface Result {
  id: string;
  kind: 'list' | 'task';
  title: string;
  /** Right-aligned hint: list type, or the parent board for a task. */
  sub: string;
  boardId: string;
  listType?: BoardType;
}

export function HomePage() {
  const boards = useOrderedBoards();
  const allTasks = useAllTasks();
  const createBoard = useAppStore((s) => s.createBoard);
  // Search + "show archived" live in useUiStore so the keyboard cursor (and the
  // Shift+A shortcut) navigate/toggle the same state the grid shows.
  const query = useUiStore((s) => s.homeQuery);
  const setQuery = useUiStore((s) => s.setHomeQuery);
  const setPendingSelect = useUiStore((s) => s.setPendingSelect);
  const showArchived = useUiStore((s) => s.homeShowArchived);
  const toggleShowArchived = useUiStore((s) => s.toggleHomeShowArchived);
  const debounced = useDebouncedValue(query, 150);

  const pq = parseQuery(debounced);
  const searching = debounced.trim().length > 0 || pq.kind !== undefined;
  const showLists = pq.kind !== 'task';
  const showTasks = pq.kind !== 'list';

  const activeBoards = boards.filter((b) => !b.archived);

  // Cross-board task list for search (non-archived tasks on non-archived boards).
  const taskItems = useMemo<TaskItem[]>(() => {
    const byId = new Map(boards.map((b) => [b.id, b]));
    const out: TaskItem[] = [];
    for (const t of allTasks) {
      if (t.archived) continue;
      const b = byId.get(t.boardId);
      if (!b || b.archived) continue;
      out.push({
        id: t.id,
        boardId: t.boardId,
        boardTitle: b.title || 'Untitled',
        title: t.title,
        description: t.description,
        tags: t.tags,
      });
    }
    return out;
  }, [allTasks, boards]);

  const listMatches = showLists ? filterBySearch(activeBoards, debounced) : [];
  const taskMatches = showTasks ? filterBySearch(taskItems, debounced) : [];

  const results = useMemo<Result[]>(() => {
    const lists: Result[] = listMatches.map((b) => ({
      id: b.id,
      kind: 'list',
      title: b.title || 'Untitled',
      sub: b.type === 'kanban' ? 'Kanban' : 'List',
      boardId: b.id,
      listType: b.type,
    }));
    const tasks: Result[] = taskMatches.map((t) => ({
      id: t.id,
      kind: 'task',
      title: t.title || 'Untitled task',
      sub: t.boardTitle,
      boardId: t.boardId,
    }));
    return [...lists, ...tasks].slice(0, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, boards, taskItems]);

  // Inline keyboard nav over the results (the global keymap is suppressed while
  // the search input is focused), CommandPalette-style.
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => setActiveIndex(0), [debounced]);
  useEffect(() => {
    if (searching) activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, searching]);

  const onCreate = (type: BoardType) => {
    const id = createBoard(type);
    goBoard(id);
  };

  // Open a result: a list navigates; a task navigates to its board and stashes a
  // pending selection so the board view scrolls to / highlights it on arrival.
  const choose = (r: Result) => {
    if (r.kind === 'task') setPendingSelect(r.id);
    setQuery('');
    goBoard(r.boardId);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!searching || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) choose(r);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1" onKeyDown={onSearchKeyDown}>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search lists & tasks — try type:task, type:list, #tag"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New
              <ChevronDown className="size-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCreate('todo')}>
              <ListTodo className="size-4" />
              TODO list
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreate('kanban')}>
              <Columns3 className="size-4" />
              Kanban board
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {searching ? (
        results.length === 0 ? (
          <div className="rounded-lg border border-dashed py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No lists or tasks match your search.
            </p>
          </div>
        ) : (
          <ul
            role="listbox"
            aria-label="Search results"
            className="grid gap-1 rounded-lg border p-1"
          >
            {results.map((r, i) => {
              const Icon =
                r.kind === 'task'
                  ? Circle
                  : r.listType === 'kanban'
                    ? Columns3
                    : ListTodo;
              return (
                <li key={`${r.kind}:${r.id}`} role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    ref={i === activeIndex ? activeRef : null}
                    onMouseMove={() => setActiveIndex(i)}
                    onClick={() => choose(r)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm',
                      i === activeIndex && 'bg-accent text-accent-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{r.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {r.kind === 'task' ? `in ${r.sub}` : r.sub}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <>
          {activeBoards.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No lists yet. Create your first TODO list or Kanban board.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeBoards.map((b) => (
                <BoardCard key={b.id} board={b} />
              ))}
            </div>
          )}

          {boards.some((b) => b.archived) && (
            <div className="mt-8">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => toggleShowArchived()}
              >
                <ArchiveRestore className="size-4" />
                {showArchived ? 'Hide' : 'Show'} archived (
                {boards.filter((b) => b.archived).length})
              </Button>
              {showArchived && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {boards
                    .filter((b) => b.archived)
                    .map((b) => (
                      <BoardCard key={b.id} board={b} archived />
                    ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
