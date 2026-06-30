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

  it('resetModals exits selection mode and clears the selection', () => {
    const ui = () => useUiStore.getState();
    ui().enterSelectionMode();
    ui().setSelectedTasks(['t1', 't2']);
    ui().setSelectorOpen(true);
    ui().resetModals();
    expect(ui().selectionMode).toBe(false);
    expect(ui().selectedTaskIds).toEqual([]);
    expect(ui().selectorOpen).toBe(false);
  });

  it('toggles the home "show archived" flag', () => {
    expect(useUiStore.getState().homeShowArchived).toBe(false);
    useUiStore.getState().toggleHomeShowArchived();
    expect(useUiStore.getState().homeShowArchived).toBe(true);
    useUiStore.getState().toggleHomeShowArchived();
    expect(useUiStore.getState().homeShowArchived).toBe(false);
  });
});
