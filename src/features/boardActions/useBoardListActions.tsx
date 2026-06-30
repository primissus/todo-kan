import { type ReactNode, useState } from 'react';
import { ArrowLeftRight, Copy, GitMerge } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { CloneListDialog } from './CloneListDialog';
import { MergeListDialog } from './MergeListDialog';
import { ConvertListDialog } from './ConvertListDialog';
import type { Board } from '@/lib/types/domain';

export interface BoardListActions {
  /** The Clone / Merge / Convert `DropdownMenuItem`s (place inside a menu). */
  items: ReactNode;
  /** The backing dialogs — render OUTSIDE the dropdown (a Dialog inside
   *  DropdownMenuContent unmounts when the menu closes). */
  dialogs: ReactNode;
}

/**
 * Shared list-item actions (Clone, Merge into…, Convert) for a board. Used by the
 * Home BoardCard menu and both board-view header menus so the wiring lives in one
 * place. Returns the menu items and the dialog layer separately because Radix
 * unmounts anything inside a closing DropdownMenuContent.
 */
export function useBoardListActions(
  board: Board | undefined,
): BoardListActions {
  const [cloneOpen, setCloneOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  // Hooks must run unconditionally; render nothing until the board exists.
  if (!board) return { items: null, dialogs: null };

  const items = (
    <>
      <DropdownMenuItem onClick={() => setCloneOpen(true)}>
        <Copy className="size-4" />
        Clone
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setMergeOpen(true)}>
        <GitMerge className="size-4" />
        Merge into…
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setConvertOpen(true)}>
        <ArrowLeftRight className="size-4" />
        Convert to {board.type === 'todo' ? 'Kanban board' : 'TODO list'}
      </DropdownMenuItem>
    </>
  );

  const dialogs = (
    <>
      <CloneListDialog board={board} open={cloneOpen} onOpenChange={setCloneOpen} />
      <MergeListDialog board={board} open={mergeOpen} onOpenChange={setMergeOpen} />
      <ConvertListDialog
        board={board}
        open={convertOpen}
        onOpenChange={setConvertOpen}
      />
    </>
  );

  return { items, dialogs };
}
