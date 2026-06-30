import { toast } from 'sonner';
import { TypeToConfirmModal } from '@/components/TypeToConfirmModal';
import { useAppStore } from '@/store/useAppStore';
import type { Board } from '@/lib/types/domain';

export interface ConvertListDialogProps {
  board: Board;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Convert a board between its two types (todo ⇄ kanban). Type-to-confirm
 *  (`convert list`) since it re-homes every task. */
export function ConvertListDialog({ board, open, onOpenChange }: ConvertListDialogProps) {
  const convertBoard = useAppStore((s) => s.convertBoard);
  const toKanban = board.type === 'todo';

  const description = toKanban
    ? 'Turns this TODO list into a Kanban board with the default columns ' +
      '(Pending, In Progress, Review, Done). Completed tasks move to Done; the ' +
      'rest start in Pending.'
    : 'Turns this Kanban board into a TODO list. Cards in the Done column become ' +
      'completed tasks; the columns are removed.';

  return (
    <TypeToConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={toKanban ? 'Convert to Kanban board' : 'Convert to TODO list'}
      description={description}
      phrase="convert list"
      confirmLabel="Convert list"
      destructive={false}
      onConfirm={() => {
        convertBoard(board.id);
        toast.success(toKanban ? 'Converted to Kanban board' : 'Converted to TODO list');
      }}
    />
  );
}
