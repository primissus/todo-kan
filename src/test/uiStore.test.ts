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

  it('toggles the home "show archived" flag', () => {
    expect(useUiStore.getState().homeShowArchived).toBe(false);
    useUiStore.getState().toggleHomeShowArchived();
    expect(useUiStore.getState().homeShowArchived).toBe(true);
    useUiStore.getState().toggleHomeShowArchived();
    expect(useUiStore.getState().homeShowArchived).toBe(false);
  });
});
