import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Columns3,
  ListTodo,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMoveTarget, useIsSelected } from '@/hooks/useSelection';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useBoardListActions } from '@/features/boardActions/useBoardListActions';
import { goBoard } from '@/lib/router';
import { useAppStore } from '@/store/useAppStore';
import { useBoardTasks } from '@/store/selectors';
import type { Board } from '@/lib/types/domain';

export interface BoardCardProps {
  board: Board;
  archived?: boolean;
}

export function BoardCard({ board, archived = false }: BoardCardProps) {
  const tasks = useBoardTasks(board.id);
  const archiveBoard = useAppStore((s) => s.archiveBoard);
  const unarchiveBoard = useAppStore((s) => s.unarchiveBoard);
  const deleteBoard = useAppStore((s) => s.deleteBoard);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const listActions = useBoardListActions(board);
  const selected = useIsSelected(board.id);
  const moveTarget = useIsMoveTarget(board.id);

  const nodeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selected || moveTarget) {
      nodeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [selected, moveTarget]);

  const active = tasks.filter((t) => !t.archived);
  const done =
    board.type === 'todo'
      ? active.filter((t) => t.completed).length
      : active.filter((t) => {
          const col = board.columns.find((c) => c.id === t.columnId);
          return col?.isDone;
        }).length;

  const Icon = board.type === 'kanban' ? Columns3 : ListTodo;

  return (
    <div
      ref={nodeRef}
      className={cn(
        'group relative flex scroll-mt-20 flex-col rounded-lg border bg-card p-4 text-card-foreground shadow-xs transition-colors hover:border-ring/50',
        selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        moveTarget &&
          'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg',
      )}
    >
      <button
        type="button"
        onClick={() => goBoard(board.id)}
        className="flex-1 text-left"
      >
        <div className="mb-1 flex items-center gap-2 pr-7">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <h3 className="truncate font-medium">{board.title || 'Untitled'}</h3>
        </div>
        {board.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {board.description}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {board.type === 'kanban' ? 'Kanban' : 'List'}
          </span>
          <span className="text-xs text-muted-foreground">
            {done}/{active.length} done
          </span>
          {board.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      </button>

      <div className="absolute right-2 top-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-60 hover:opacity-100"
              aria-label="Board actions"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!archived && (
              <>
                {listActions.items}
                <DropdownMenuSeparator />
              </>
            )}
            {archived ? (
              <DropdownMenuItem onClick={() => unarchiveBoard(board.id)}>
                <ArchiveRestore className="size-4" />
                Unarchive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => archiveBoard(board.id)}>
                <Archive className="size-4" />
                Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${board.title || 'Untitled'}"?`}
        description="This permanently deletes the list/board and all of its tasks."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteBoard(board.id)}
      />

      {!archived && listActions.dialogs}
    </div>
  );
}
