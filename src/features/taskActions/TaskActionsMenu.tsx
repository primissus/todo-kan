import type { PointerEvent as ReactPointerEvent } from 'react';
import { Copy, Eye, FolderInput, MoreVertical, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';
import { useIsActionsMenuOpen } from '@/hooks/useSelection';
import { requestMove } from '@/features/selection/bulkActions';

export interface TaskActionsMenuProps {
  taskId: string;
  /** Open the task's view/edit dialog — the menu's "View" item. */
  onView: () => void;
  /** Extra classes for the ⋮ trigger button (default size-7). */
  className?: string;
  /** Size class for the ⋮ glyph (Kanban size-3.5, TODO size-4). */
  iconClassName?: string;
  /** Kanban cards spread drag listeners on the card — stop the trigger's
   *  pointerdown from starting a drag. */
  onTriggerPointerDown?: (e: ReactPointerEvent) => void;
}

/**
 * Per-task actions menu (the ⋮ dropdown on a Kanban card / TODO row). Holds the
 * task-level actions: Move (to another list), Clone (duplicate in place), View
 * (open the dialog) and Delete. Archive stays a standalone button on the card.
 *
 * Open state lives in `useUiStore.actionsMenuId` (not local state) so the global
 * keymap's `.` shortcut can open the cursored task's menu, and only one menu is
 * ever open app-wide. The Move + Delete dialogs are already lifted to the board
 * views (useUiStore.moveOpen / deleteId), so selecting those items just sets the
 * shared flags — no dialog lives inside this closing menu (which Radix unmounts).
 */
export function TaskActionsMenu({
  taskId,
  onView,
  className,
  iconClassName,
  onTriggerPointerDown,
}: TaskActionsMenuProps) {
  const open = useIsActionsMenuOpen(taskId);
  const setActionsMenuId = useUiStore((s) => s.setActionsMenuId);
  const setDeleteId = useUiStore((s) => s.setDeleteId);
  const cloneTask = useAppStore((s) => s.cloneTask);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => setActionsMenuId(o ? taskId : null)}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-7', className)}
          aria-label="Task actions"
          onPointerDown={onTriggerPointerDown}
        >
          <MoreVertical className={cn('size-4', iconClassName)} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => requestMove([taskId])}>
          <FolderInput className="size-4" />
          Move to…
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            cloneTask(taskId);
            toast.success('Task cloned');
          }}
        >
          <Copy className="size-4" />
          Clone
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onView}>
          <Eye className="size-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => setDeleteId(taskId)}
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
