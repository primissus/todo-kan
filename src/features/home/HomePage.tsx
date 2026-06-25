import { useState } from 'react';
import {
  ArchiveRestore,
  ChevronDown,
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
import { filterBySearch } from '@/lib/search';
import { goBoard } from '@/lib/router';
import { useAppStore } from '@/store/useAppStore';
import { useOrderedBoards } from '@/store/selectors';
import type { BoardType } from '@/lib/types/domain';

export function HomePage() {
  const boards = useOrderedBoards();
  const createBoard = useAppStore((s) => s.createBoard);
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const debounced = useDebouncedValue(query, 150);

  const active = filterBySearch(
    boards.filter((b) => !b.archived),
    debounced,
  );
  const archived = filterBySearch(
    boards.filter((b) => b.archived),
    debounced,
  );

  const onCreate = (type: BoardType) => {
    const id = createBoard(type);
    goBoard(id);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar value={query} onChange={setQuery} className="flex-1" />
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

      {active.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {query
              ? 'No lists or boards match your search.'
              : 'No lists yet. Create your first TODO list or Kanban board.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((b) => (
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
            onClick={() => setShowArchived((v) => !v)}
          >
            <ArchiveRestore className="size-4" />
            {showArchived ? 'Hide' : 'Show'} archived (
            {boards.filter((b) => b.archived).length})
          </Button>
          {showArchived && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archived.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No archived items match your search.
                </p>
              ) : (
                archived.map((b) => <BoardCard key={b.id} board={b} archived />)
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
