// Orchestration for the bulk-selection actions, shared by the SelectionToolbar
// (mouse) and useGlobalKeymap (a / ⇧D / ⇧M). Kept out of the components so both
// entry points run identical logic. Reads the live selection from useUiStore.

import { toast } from 'sonner';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';

const plural = (n: number) => (n === 1 ? '' : 's');

/** Leave selection mode and drop the cursor (selected tasks may now be gone). */
export function finishSelection(): void {
  const ui = useUiStore.getState();
  ui.exitSelectionMode();
  ui.setSelected(null);
}

/** Archive the whole selection immediately (no confirm), then exit. */
export function archiveSelection(): void {
  const ids = useUiStore.getState().selectedTaskIds;
  if (ids.length === 0) return;
  const tasks = useAppStore.getState().tasks;
  // Count what actually changes (ignore ids already archived / gone).
  const n = ids.filter((id) => tasks[id] && !tasks[id]!.archived).length;
  useAppStore.getState().archiveTasks(ids);
  if (n > 0) toast.success(`Archived ${n} task${plural(n)}`);
  finishSelection();
}

/** Open the bulk-delete confirm; snapshots the selection so the confirm count is
 *  stable and the delete acts on exactly what was confirmed. */
export function requestDeleteSelection(): void {
  const ids = useUiStore.getState().selectedTaskIds;
  if (ids.length === 0) return;
  useUiStore.getState().openBulkDelete(ids);
}

/** Delete the snapshotted set (called on confirm), then exit. */
export function deleteSelection(): void {
  const ids = useUiStore.getState().bulkDeleteIds;
  if (ids.length === 0) return;
  const tasks = useAppStore.getState().tasks;
  const n = ids.filter((id) => tasks[id]).length; // ignore ids already gone
  useAppStore.getState().deleteTasks(ids);
  if (n > 0) toast.success(`Deleted ${n} task${plural(n)}`);
  finishSelection();
}

/** Open the Move-to-list dialog for `ids` (the selection, or one cursored task). */
export function requestMove(ids: string[]): void {
  if (ids.length === 0) return;
  useUiStore.getState().openMove(ids);
}

/** Report a completed move (called by the dialog), then exit selection mode. */
export function completeMove(count: number, targetTitle: string): void {
  toast.success(`Moved ${count} task${plural(count)} to “${targetTitle}”`);
  finishSelection();
}
