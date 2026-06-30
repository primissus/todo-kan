import { beforeEach, describe, expect, it } from 'vitest';
import { initialUiState, useUiStore } from '@/store/useUiStore';
import type { ColumnId } from '@/lib/types/domain';

beforeEach(() => useUiStore.setState({ ...initialUiState }));

describe('useUiStore', () => {
  it('sets and clears the selection cursor', () => {
    useUiStore.getState().setSelected('t1');
    expect(useUiStore.getState().selectedId).toBe('t1');
    useUiStore.getState().setSelected(null);
    expect(useUiStore.getState().selectedId).toBeNull();
  });

  it('beginMove snapshots origin order; endMove clears it', () => {
    useUiStore.getState().beginMove({
      kind: 'task',
      id: 't1',
      boardId: 'b1',
      originColumnId: 'c1' as ColumnId,
      originOrder: ['t1', 't2', 't3'],
    });
    const s = useUiStore.getState();
    expect(s.moveMode).toBe(true);
    expect(s.moveSnapshot?.originOrder).toEqual(['t1', 't2', 't3']);
    expect(s.moveSnapshot?.originColumnId).toBe('c1');

    useUiStore.getState().endMove();
    expect(useUiStore.getState().moveMode).toBe(false);
    expect(useUiStore.getState().moveSnapshot).toBeNull();
  });

  it('manages the bulk task selection set', () => {
    const ui = () => useUiStore.getState();
    ui().enterSelectionMode();
    expect(ui().selectionMode).toBe(true);

    ui().toggleTaskSelected('t1');
    ui().toggleTaskSelected('t2');
    expect(ui().selectedTaskIds).toEqual(['t1', 't2']);
    ui().toggleTaskSelected('t1'); // toggle off
    expect(ui().selectedTaskIds).toEqual(['t2']);

    ui().setSelectedTasks(['a', 'b', 'c']);
    expect(ui().selectedTaskIds).toEqual(['a', 'b', 'c']);
    ui().clearTaskSelection();
    expect(ui().selectedTaskIds).toEqual([]);

    ui().setSelectedTasks(['x']);
    ui().exitSelectionMode();
    expect(ui().selectionMode).toBe(false);
    expect(ui().selectedTaskIds).toEqual([]);
    expect(ui().selectorOpen).toBe(false);
  });

  it('openMove stores the target ids and opens the move dialog', () => {
    const ui = () => useUiStore.getState();
    ui().openMove(['t1', 't2']);
    expect(ui().moveOpen).toBe(true);
    expect(ui().moveTaskIds).toEqual(['t1', 't2']);
    ui().setMoveOpen(false);
    expect(ui().moveOpen).toBe(false);
  });

  it('openBulkDelete snapshots the ids and opens the confirm', () => {
    const ui = () => useUiStore.getState();
    ui().openBulkDelete(['t1', 't2']);
    expect(ui().bulkDeleteOpen).toBe(true);
    expect(ui().bulkDeleteIds).toEqual(['t1', 't2']);
  });

  it('tracks the open per-item actions menu', () => {
    const ui = () => useUiStore.getState();
    expect(ui().actionsMenuId).toBeNull();
    ui().setActionsMenuId('t1');
    expect(ui().actionsMenuId).toBe('t1');
    ui().setActionsMenuId(null);
    expect(ui().actionsMenuId).toBeNull();
  });

  it('resetModals exits selection mode and clears all selection/move/delete flags', () => {
    const ui = () => useUiStore.getState();
    ui().enterSelectionMode();
    ui().setSelectedTasks(['t1', 't2']);
    ui().setSelectorOpen(true);
    ui().openMove(['t1']);
    ui().setBulkDeleteOpen(true);
    ui().setActionsMenuId('t1');
    ui().resetModals();
    expect(ui().selectionMode).toBe(false);
    expect(ui().selectedTaskIds).toEqual([]);
    expect(ui().selectorOpen).toBe(false);
    expect(ui().moveOpen).toBe(false);
    expect(ui().moveTaskIds).toEqual([]);
    expect(ui().bulkDeleteOpen).toBe(false);
    expect(ui().actionsMenuId).toBeNull();
  });

  it('toggles the home "show archived" flag', () => {
    expect(useUiStore.getState().homeShowArchived).toBe(false);
    useUiStore.getState().toggleHomeShowArchived();
    expect(useUiStore.getState().homeShowArchived).toBe(true);
    useUiStore.getState().toggleHomeShowArchived();
    expect(useUiStore.getState().homeShowArchived).toBe(false);
  });
});
