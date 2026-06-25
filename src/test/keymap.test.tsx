import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { HintOverlay } from '@/components/HintOverlay';
import { useAppStore } from '@/store/useAppStore';
import { initialUiState, useUiStore } from '@/store/useUiStore';

beforeEach(() => {
  useAppStore.setState({ boards: {}, boardOrder: [], tasks: {} });
  useUiStore.setState({ ...initialUiState });
  localStorage.clear();
  window.location.hash = '';
});

async function renderKanban() {
  const app = useAppStore.getState();
  const id = app.createBoard('kanban');
  const col0 = useAppStore.getState().boards[id].columns[0].id;
  const a = useAppStore.getState().addTask(id, { title: 'Alpha', columnId: col0 });
  const b = useAppStore.getState().addTask(id, { title: 'Beta', columnId: col0 });
  window.location.hash = `#/board/${id}`;
  render(<App />);
  await screen.findByText('Alpha');
  return { id, col0, a: a as string, b: b as string };
}

async function renderKanbanMulti() {
  const id = useAppStore.getState().createBoard('kanban');
  const cols = useAppStore.getState().boards[id].columns;
  const col0 = cols[0].id;
  const col1 = cols[1].id;
  const a = useAppStore.getState().addTask(id, { title: 'Alpha', columnId: col0 });
  const b = useAppStore.getState().addTask(id, { title: 'Beta', columnId: col0 });
  const g = useAppStore.getState().addTask(id, { title: 'Gamma', columnId: col1 });
  window.location.hash = `#/board/${id}`;
  render(<App />);
  await screen.findByText('Gamma');
  return { id, col0, col1, a: a as string, b: b as string, g: g as string };
}

async function renderHome() {
  const a = useAppStore.getState().createBoard('todo', 'Board A');
  const b = useAppStore.getState().createBoard('kanban', 'Board B');
  window.location.hash = '';
  render(<App />);
  await screen.findByText('Board B');
  // boardOrder is newest-first → [b, a]
  return { a: a as string, b: b as string };
}

async function renderTodo() {
  const id = useAppStore.getState().createBoard('todo');
  const a = useAppStore.getState().addTask(id, { title: 'One' });
  const b = useAppStore.getState().addTask(id, { title: 'Two' });
  window.location.hash = `#/board/${id}`;
  render(<App />);
  await screen.findByText('One');
  return { id, a: a as string, b: b as string };
}

describe('global keymap — kanban', () => {
  it('j / k move the cursor between cards', async () => {
    const { a, b } = await renderKanban();
    fireEvent.keyDown(window, { key: 'j' });
    expect(useUiStore.getState().selectedId).toBe(a);
    fireEvent.keyDown(window, { key: 'j' });
    expect(useUiStore.getState().selectedId).toBe(b);
    fireEvent.keyDown(window, { key: 'k' });
    expect(useUiStore.getState().selectedId).toBe(a);
  });

  it('m + j + Enter relocates a card and commits', async () => {
    const { id, a, b } = await renderKanban();
    fireEvent.keyDown(window, { key: 'j' }); // select Alpha
    fireEvent.keyDown(window, { key: 'm' });
    expect(useUiStore.getState().moveMode).toBe(true);
    fireEvent.keyDown(window, { key: 'j' }); // move Alpha below Beta
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(useUiStore.getState().moveMode).toBe(false);
    const order = useAppStore.getState().boards[id].taskIds as string[];
    expect(order.indexOf(a)).toBeGreaterThan(order.indexOf(b));
  });

  it('m + j + Esc reverts the move', async () => {
    const { id } = await renderKanban();
    fireEvent.keyDown(window, { key: 'j' }); // select Alpha
    const before = useAppStore.getState().boards[id].taskIds.slice();
    fireEvent.keyDown(window, { key: 'm' });
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUiStore.getState().moveMode).toBe(false);
    expect(useAppStore.getState().boards[id].taskIds).toEqual(before);
  });

  it('Shift+N opens the new-card dialog', async () => {
    await renderKanban();
    fireEvent.keyDown(window, { key: 'N', shiftKey: true });
    expect(useUiStore.getState().newOpen).toBe(true);
  });
});

describe('global keymap — todo', () => {
  it('a archives the selected task and advances the cursor', async () => {
    const { a, b } = await renderTodo();
    fireEvent.keyDown(window, { key: 'j' });
    expect(useUiStore.getState().selectedId).toBe(a);
    fireEvent.keyDown(window, { key: 'a' });
    expect(useAppStore.getState().tasks[a].archived).toBe(true);
    expect(useUiStore.getState().selectedId).toBe(b);
  });
});

describe('global keymap — global shortcuts & guard', () => {
  it('/ opens the search palette', async () => {
    await renderKanban();
    fireEvent.keyDown(window, { key: '/' });
    expect(useUiStore.getState().paletteOpen).toBe(true);
  });

  it('⌘K opens the search palette', async () => {
    await renderKanban();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(useUiStore.getState().paletteOpen).toBe(true);
  });

  it('? opens the help dialog', async () => {
    await renderKanban();
    fireEvent.keyDown(window, { key: '?' });
    expect(useUiStore.getState().helpOpen).toBe(true);
  });

  it('ignores navigation keys while an input is focused', async () => {
    await renderKanban();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(window, { key: 'j' });
    expect(useUiStore.getState().selectedId).toBeNull();
    input.remove();
  });

  it('ignores modifier combos other than ⌘/Ctrl+K', async () => {
    await renderKanban();
    fireEvent.keyDown(window, { key: 'j', metaKey: true });
    expect(useUiStore.getState().selectedId).toBeNull();
  });

  it('Enter on the selected card works even when a button holds focus', async () => {
    const { a } = await renderKanban();
    fireEvent.keyDown(window, { key: 'j' }); // select Alpha
    screen.getByLabelText('Settings').focus();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(useUiStore.getState().editId).toBe(a);
  });

  it('CapsLock (uppercase J) still moves the cursor', async () => {
    const { a } = await renderKanban();
    fireEvent.keyDown(window, { key: 'J' }); // capslock, shiftKey false
    expect(useUiStore.getState().selectedId).toBe(a);
  });
});

describe('global keymap — kanban horizontal + columns', () => {
  it('l moves the cursor to the next column', async () => {
    const { g } = await renderKanbanMulti();
    fireEvent.keyDown(window, { key: 'j' }); // select Alpha (col0)
    fireEvent.keyDown(window, { key: 'l' }); // → col1
    expect(useUiStore.getState().selectedId).toBe(g);
  });

  it('m + l + Esc reverts a cross-column move (restores columnId)', async () => {
    const { id, col0, a } = await renderKanbanMulti();
    fireEvent.keyDown(window, { key: 'j' }); // select Alpha (col0)
    const before = useAppStore.getState().boards[id].taskIds.slice();
    fireEvent.keyDown(window, { key: 'm' });
    fireEvent.keyDown(window, { key: 'l' }); // move Alpha into col1
    expect(useAppStore.getState().tasks[a].columnId).toBe(
      useAppStore.getState().boards[id].columns[1].id,
    );
    fireEvent.keyDown(window, { key: 'Escape' }); // revert
    expect(useAppStore.getState().tasks[a].columnId).toBe(col0);
    expect(useAppStore.getState().boards[id].taskIds).toEqual(before);
  });

  it('Shift+C opens the columns settings', async () => {
    await renderKanbanMulti();
    fireEvent.keyDown(window, { key: 'C', shiftKey: true });
    expect(useUiStore.getState().kanbanColumnsOpen).toBe(true);
  });
});

describe('global keymap — home', () => {
  it('j selects the first board', async () => {
    const { b } = await renderHome();
    fireEvent.keyDown(window, { key: 'j' });
    expect(useUiStore.getState().selectedId).toBe(b);
  });

  it('Enter opens the selected board', async () => {
    const { b } = await renderHome();
    fireEvent.keyDown(window, { key: 'j' }); // select Board B
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(window.location.hash).toContain(encodeURIComponent(b));
  });

  it('a archives the selected board and advances the cursor', async () => {
    const { a, b } = await renderHome();
    fireEvent.keyDown(window, { key: 'j' }); // select Board B (first)
    fireEvent.keyDown(window, { key: 'a' });
    expect(useAppStore.getState().boards[b].archived).toBe(true);
    expect(useUiStore.getState().selectedId).toBe(a);
  });

  it('Shift+N creates a new list and opens it', async () => {
    await renderHome();
    const before = Object.keys(useAppStore.getState().boards).length;
    fireEvent.keyDown(window, { key: 'N', shiftKey: true });
    expect(Object.keys(useAppStore.getState().boards).length).toBe(before + 1);
    expect(window.location.hash).toContain('/board/');
  });

  it('Shift+A toggles "show archived"', async () => {
    await renderHome();
    expect(useUiStore.getState().homeShowArchived).toBe(false);
    fireEvent.keyDown(window, { key: 'A', shiftKey: true });
    expect(useUiStore.getState().homeShowArchived).toBe(true);
  });
});

describe('CommandPalette', () => {
  it('choosing a task jumps the cursor to it and closes', async () => {
    const user = userEvent.setup();
    const { b } = await renderKanban();
    fireEvent.keyDown(window, { key: '/' });
    const input = await screen.findByPlaceholderText(/search this board/i);
    await user.type(input, 'Beta{Enter}');
    expect(useUiStore.getState().selectedId).toBe(b);
    expect(useUiStore.getState().paletteOpen).toBe(false);
  });
});

describe('HintOverlay', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('typing a hint label clicks the target and exits hint mode', () => {
    const btn = document.createElement('button');
    const onClick = vi.fn();
    btn.addEventListener('click', onClick);
    btn.textContent = 'Target';
    document.body.appendChild(btn);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 5,
      left: 5,
      width: 10,
      height: 10,
      right: 15,
      bottom: 15,
      x: 5,
      y: 5,
      toJSON: () => ({}),
    } as DOMRect);

    render(<HintOverlay />);
    act(() => useUiStore.getState().setHintsActive(true));
    // Only one target → first label is the first alphabet char ('f').
    fireEvent.keyDown(window, { key: 'f' });

    expect(onClick).toHaveBeenCalled();
    expect(useUiStore.getState().hintsActive).toBe(false);
    btn.remove();
  });
});
