import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { HintOverlay } from '@/components/HintOverlay';
import { useAppStore } from '@/store/useAppStore';
import { initialUiState, useUiStore } from '@/store/useUiStore';

beforeEach(() => {
  useAppStore.setState({ boards: {}, boardOrder: [], tasks: {} });
  // Most tests exercise the Vim motions, which are opt-in — enable them here and
  // flip back to the off-by-default behaviour in the dedicated gating tests.
  useUiStore.setState({ ...initialUiState, vimEnabled: true });
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

  it('Shift+D confirms first, then deletes and advances the cursor', async () => {
    const user = userEvent.setup();
    const { a, b } = await renderTodo();
    fireEvent.keyDown(window, { key: 'j' });
    expect(useUiStore.getState().selectedId).toBe(a);
    fireEvent.keyDown(window, { key: 'D', shiftKey: true });
    // Pending confirmation — nothing deleted yet.
    expect(useUiStore.getState().deleteId).toBe(a);
    expect(useAppStore.getState().tasks[a]).toBeDefined();
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(useAppStore.getState().tasks[a]).toBeUndefined();
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

describe('global keymap — kanban column headers', () => {
  it('up on the first card selects the column header', async () => {
    const { col0, a } = await renderKanban();
    fireEvent.keyDown(window, { key: 'j' }); // select Alpha (first card)
    expect(useUiStore.getState().selectedId).toBe(a);
    fireEvent.keyDown(window, { key: 'k' }); // up → column header
    expect(useUiStore.getState().selectedId).toBe(col0);
  });

  it('down on a column header selects its first card', async () => {
    const { col0, a } = await renderKanban();
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'k' }); // header
    expect(useUiStore.getState().selectedId).toBe(col0);
    fireEvent.keyDown(window, { key: 'j' }); // back down → first card
    expect(useUiStore.getState().selectedId).toBe(a);
  });

  it('headers navigate left/right across columns, including empty ones', async () => {
    const { id, col0 } = await renderKanban();
    const cols = useAppStore.getState().boards[id].columns; // only col0 has cards
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'k' }); // header col0
    expect(useUiStore.getState().selectedId).toBe(col0);
    fireEvent.keyDown(window, { key: 'l' }); // → empty col1 header
    expect(useUiStore.getState().selectedId).toBe(cols[1].id);
    fireEvent.keyDown(window, { key: 'l' }); // → empty col2 header
    expect(useUiStore.getState().selectedId).toBe(cols[2].id);
    fireEvent.keyDown(window, { key: 'h' }); // ← back to col1 header
    expect(useUiStore.getState().selectedId).toBe(cols[1].id);
  });

  it('Shift+N targets the cursor’s column (from a card)', async () => {
    const { id } = await renderKanbanMulti();
    const cols = useAppStore.getState().boards[id].columns;
    fireEvent.keyDown(window, { key: 'j' }); // Alpha (col0)
    fireEvent.keyDown(window, { key: 'l' }); // Gamma (col1)
    fireEvent.keyDown(window, { key: 'N', shiftKey: true });
    expect(useUiStore.getState().newOpen).toBe(true);
    expect(useUiStore.getState().newColumnId).toBe(cols[1].id);
  });

  it('Shift+N on an empty column header targets that column', async () => {
    const { id } = await renderKanban();
    const cols = useAppStore.getState().boards[id].columns;
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'k' }); // header col0
    fireEvent.keyDown(window, { key: 'l' }); // header col1 (empty)
    fireEvent.keyDown(window, { key: 'N', shiftKey: true });
    expect(useUiStore.getState().newColumnId).toBe(cols[1].id);
  });

  it('a card added via Shift+N on a column lands in that column', async () => {
    const user = userEvent.setup();
    const { id } = await renderKanban();
    const cols = useAppStore.getState().boards[id].columns;
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'k' }); // header col0
    fireEvent.keyDown(window, { key: 'l' }); // header col1 (empty)
    fireEvent.keyDown(window, { key: 'N', shiftKey: true });

    const title = await screen.findByLabelText('Title');
    await user.type(title, 'In col1');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      const t = Object.values(useAppStore.getState().tasks).find(
        (x) => x.title === 'In col1',
      );
      expect(t?.columnId).toBe(cols[1].id);
    });
  });

  it('Enter on a column header opens the new-card form for that column', async () => {
    const { id } = await renderKanban();
    const cols = useAppStore.getState().boards[id].columns;
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'k' }); // header col0
    fireEvent.keyDown(window, { key: 'l' }); // header col1
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(useUiStore.getState().newOpen).toBe(true);
    expect(useUiStore.getState().newColumnId).toBe(cols[1].id);
  });

  it('archiving the last card in a column lands the cursor on its header', async () => {
    const { col0, b } = await renderKanban(); // col0 has Alpha, Beta
    fireEvent.keyDown(window, { key: 'j' }); // Alpha
    fireEvent.keyDown(window, { key: 'a' }); // archive Alpha → cursor advances to Beta
    expect(useUiStore.getState().selectedId).toBe(b);
    fireEvent.keyDown(window, { key: 'a' }); // archive Beta (last) → cursor to header
    expect(useUiStore.getState().selectedId).toBe(col0);
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

describe('global keymap — Vim toggle', () => {
  it('with Vim off, letter motions are inert but arrows + Enter still work', async () => {
    const { a } = await renderTodo();
    act(() => useUiStore.setState({ vimEnabled: false }));

    fireEvent.keyDown(window, { key: 'j' }); // letter motion → ignored
    expect(useUiStore.getState().selectedId).toBeNull();

    fireEvent.keyDown(window, { key: 'ArrowDown' }); // arrows still navigate
    expect(useUiStore.getState().selectedId).toBe(a);

    fireEvent.keyDown(window, { key: 'Enter' }); // Enter still opens
    expect(useUiStore.getState().editId).toBe(a);
  });

  it(': opens the command line and `q` ↵ toggles Vim keys', async () => {
    const user = userEvent.setup();
    await renderTodo();
    act(() => useUiStore.setState({ vimEnabled: false }));

    fireEvent.keyDown(window, { key: ':' });
    expect(useUiStore.getState().cmdline).toBe('');

    const input = await screen.findByLabelText('Command line');
    await user.type(input, 'q{Enter}');
    expect(useUiStore.getState().vimEnabled).toBe(true);
    expect(useUiStore.getState().cmdline).toBeNull();
  });
});

describe('global keymap — Esc back-out', () => {
  it('clears the cursor first, then leaves the board for Home', async () => {
    await renderTodo();
    fireEvent.keyDown(window, { key: 'j' });
    expect(useUiStore.getState().selectedId).not.toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' }); // 1st Esc clears the cursor
    expect(useUiStore.getState().selectedId).toBeNull();
    expect(window.location.hash).toContain('/board/');

    fireEvent.keyDown(window, { key: 'Escape' }); // 2nd Esc → Home
    expect(window.location.hash).toBe('#/');
  });
});

describe('TaskFormDialog — discard guard', () => {
  it('Esc on a pristine form closes it without confirming', async () => {
    const user = userEvent.setup();
    await renderTodo();
    fireEvent.keyDown(window, { key: 'N', shiftKey: true });
    await screen.findByLabelText('Title');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });

  it('Esc on a dirty form confirms; Discard closes without saving', async () => {
    const user = userEvent.setup();
    await renderTodo();
    fireEvent.keyDown(window, { key: 'N', shiftKey: true });
    const title = await screen.findByLabelText('Title');
    await user.type(title, 'Draft');
    await user.keyboard('{Escape}');

    expect(await screen.findByText('Discard changes?')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument(); // still open

    await user.click(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());
    expect(
      Object.values(useAppStore.getState().tasks).some(
        (t) => t.title === 'Draft',
      ),
    ).toBe(false);
  });
});

describe('ArchivedTasksDrawer — keyboard', () => {
  async function openDrawerWithTwoArchived() {
    const id = useAppStore.getState().createBoard('todo');
    const a = useAppStore.getState().addTask(id, { title: 'One' }) as string;
    const b = useAppStore.getState().addTask(id, { title: 'Two' }) as string;
    useAppStore.getState().archiveTask(a);
    useAppStore.getState().archiveTask(b);
    window.location.hash = `#/board/${id}`;
    render(<App />);
    fireEvent.keyDown(window, { key: 'A', shiftKey: true }); // open the drawer
    const listbox = await screen.findByRole('listbox', {
      name: 'Archived tasks',
    });
    return { a, b, listbox };
  }

  it('arrows move the highlight; Enter restores the highlighted task', async () => {
    const { a, b, listbox } = await openDrawerWithTwoArchived();
    // Order follows board order [a, b]; first row selected on open.
    expect(within(listbox).getAllByRole('option')[0]).toHaveAttribute(
      'aria-selected',
      'true',
    );

    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(within(listbox).getAllByRole('option')[1]).toHaveAttribute(
      'aria-selected',
      'true',
    );

    fireEvent.keyDown(listbox, { key: 'Enter' }); // restore the 2nd (Two = b)
    expect(useAppStore.getState().tasks[b].archived).toBe(false);
    expect(useAppStore.getState().tasks[a].archived).toBe(true);
  });

  it('Delete removes the highlighted archived task', async () => {
    const { a, listbox } = await openDrawerWithTwoArchived();
    fireEvent.keyDown(listbox, { key: 'Delete' }); // delete the 1st (One = a)
    expect(useAppStore.getState().tasks[a]).toBeUndefined();
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

describe('f hint mode reaches an open dialog (the task form)', () => {
  it('activates hints over an open dialog once focus leaves the fields', async () => {
    await renderKanban();
    fireEvent.keyDown(window, { key: 'N', shiftKey: true });
    expect(await screen.findByLabelText('Title')).toBeInTheDocument();
    // Hints must yield to typing, so step out of the autofocused title field.
    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.keyDown(window, { key: 'f' });
    expect(useUiStore.getState().hintsActive).toBe(true);
  });

  it('yields to typing — f in a focused form field is a literal keystroke', async () => {
    await renderKanban();
    fireEvent.keyDown(window, { key: 'N', shiftKey: true });
    const title = await screen.findByLabelText('Title');
    title.focus();
    fireEvent.keyDown(window, { key: 'f' });
    expect(useUiStore.getState().hintsActive).toBe(false);
  });
});

describe('bulk selection (keyboard)', () => {
  it('s enters selection mode; Enter toggles the cursored task; s exits', async () => {
    const { a } = await renderTodo();
    fireEvent.keyDown(window, { key: 'j' }); // cursor → a
    expect(useUiStore.getState().selectedId).toBe(a);
    fireEvent.keyDown(window, { key: 's' });
    expect(useUiStore.getState().selectionMode).toBe(true);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(useUiStore.getState().selectedTaskIds).toContain(a);
    fireEvent.keyDown(window, { key: 'Enter' }); // toggle off
    expect(useUiStore.getState().selectedTaskIds).not.toContain(a);
    fireEvent.keyDown(window, { key: 's' });
    expect(useUiStore.getState().selectionMode).toBe(false);
  });

  it('x selects the cursored task, entering selection mode', async () => {
    const { a } = await renderTodo();
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'x' });
    expect(useUiStore.getState().selectionMode).toBe(true);
    expect(useUiStore.getState().selectedTaskIds).toEqual([a]);
  });

  it('Space toggles the cursored task in selection mode (works without Vim keys)', async () => {
    const { a } = await renderTodo();
    useUiStore.setState({ vimEnabled: false });
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // cursor → a (arrows always work)
    act(() => useUiStore.getState().enterSelectionMode());
    fireEvent.keyDown(window, { key: ' ' });
    expect(useUiStore.getState().selectedTaskIds).toContain(a);
  });

  it('a archives the whole selection and exits selection mode', async () => {
    const { a, b } = await renderTodo();
    act(() => {
      useUiStore.getState().enterSelectionMode();
      useUiStore.getState().setSelectedTasks([a, b]);
    });
    fireEvent.keyDown(window, { key: 'a' });
    expect(useAppStore.getState().tasks[a].archived).toBe(true);
    expect(useAppStore.getState().tasks[b].archived).toBe(true);
    expect(useUiStore.getState().selectionMode).toBe(false);
  });

  it('⇧D opens the bulk delete confirm for the selection', async () => {
    const { a } = await renderTodo();
    act(() => {
      useUiStore.getState().enterSelectionMode();
      useUiStore.getState().setSelectedTasks([a]);
    });
    fireEvent.keyDown(window, { key: 'D', shiftKey: true });
    expect(useUiStore.getState().bulkDeleteOpen).toBe(true);
  });

  it('⇧M opens the move dialog for the selection', async () => {
    const { a, b } = await renderTodo();
    act(() => {
      useUiStore.getState().enterSelectionMode();
      useUiStore.getState().setSelectedTasks([a, b]);
    });
    fireEvent.keyDown(window, { key: 'M', shiftKey: true });
    expect(useUiStore.getState().moveOpen).toBe(true);
    expect(useUiStore.getState().moveTaskIds).toEqual([a, b]);
  });

  it('Esc leaves selection mode before clearing the cursor', async () => {
    const { a } = await renderTodo();
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'x' }); // select a + enter selection mode
    expect(useUiStore.getState().selectionMode).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUiStore.getState().selectionMode).toBe(false);
    // cursor survives the first Esc (selection mode consumed it)
    expect(useUiStore.getState().selectedId).toBe(a);
  });
});

describe('actions menu shortcut (.)', () => {
  it('opens the cursored task’s actions menu; Clone duplicates it', async () => {
    const user = userEvent.setup();
    const { a } = await renderTodo(); // tasks "One", "Two"
    fireEvent.keyDown(window, { key: 'j' }); // cursor → One
    fireEvent.keyDown(window, { key: '.' });
    expect(useUiStore.getState().actionsMenuId).toBe(a);

    await user.click(await screen.findByRole('menuitem', { name: 'Clone' }));
    const ones = Object.values(useAppStore.getState().tasks).filter(
      (t) => t.title === 'One',
    );
    expect(ones).toHaveLength(2); // original + clone
    // Selecting an item closes the menu.
    await waitFor(() =>
      expect(useUiStore.getState().actionsMenuId).toBeNull(),
    );
  });

  it('opens the cursored board’s actions menu on Home', async () => {
    const { b } = await renderHome();
    fireEvent.keyDown(window, { key: 'j' }); // cursor → Board B (first)
    fireEvent.keyDown(window, { key: '.' });
    expect(useUiStore.getState().actionsMenuId).toBe(b);
  });

  it('works with Vim keys off (it is an always-available shortcut)', async () => {
    const { a } = await renderTodo();
    act(() => useUiStore.setState({ vimEnabled: false }));
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // cursor → One
    fireEvent.keyDown(window, { key: '.' });
    expect(useUiStore.getState().actionsMenuId).toBe(a);
  });

  it('is a no-op with no cursor, in selection mode, or on a Kanban header', async () => {
    await renderTodo();
    fireEvent.keyDown(window, { key: '.' }); // no cursor
    expect(useUiStore.getState().actionsMenuId).toBeNull();

    fireEvent.keyDown(window, { key: 'j' }); // cursor → a task
    fireEvent.keyDown(window, { key: 's' }); // enter selection mode
    fireEvent.keyDown(window, { key: '.' });
    expect(useUiStore.getState().actionsMenuId).toBeNull();
  });

  it('on a Kanban column header, . does not open a menu', async () => {
    const { col0 } = await renderKanban();
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'k' }); // cursor → column header
    expect(useUiStore.getState().selectedId).toBe(col0);
    fireEvent.keyDown(window, { key: '.' });
    expect(useUiStore.getState().actionsMenuId).toBeNull();
  });

  it('holds the cursor still while the actions menu is open (menu owns keys)', async () => {
    const { a } = await renderTodo();
    fireEvent.keyDown(window, { key: 'j' }); // cursor → One
    fireEvent.keyDown(window, { key: '.' }); // open the menu
    await screen.findByRole('menuitem', { name: 'Clone' });
    fireEvent.keyDown(window, { key: 'j' }); // should be swallowed
    expect(useUiStore.getState().selectedId).toBe(a); // did not advance
  });
});

describe('Home lists grid navigation', () => {
  it('moves by a row vertically and by a column horizontally', async () => {
    const realMM = window.matchMedia;
    // 2-column grid: (min-width: 640px) matches, (min-width: 1024px) does not.
    window.matchMedia = ((q: string) => ({
      matches: q.includes('640'),
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      for (const n of ['A', 'B', 'C', 'D']) {
        useAppStore.getState().createBoard('todo', n);
      }
      window.location.hash = '';
      render(<App />);
      await screen.findByText('A');
      const order = useAppStore.getState().boardOrder;

      fireEvent.keyDown(window, { key: 'ArrowDown' }); // → first list (index 0)
      expect(useUiStore.getState().selectedId).toBe(order[0]);
      fireEvent.keyDown(window, { key: 'ArrowDown' }); // down a row → +2
      expect(useUiStore.getState().selectedId).toBe(order[2]);
      fireEvent.keyDown(window, { key: 'ArrowUp' }); // back up a row → 0
      expect(useUiStore.getState().selectedId).toBe(order[0]);
      fireEvent.keyDown(window, { key: 'ArrowRight' }); // right a column → +1
      expect(useUiStore.getState().selectedId).toBe(order[1]);
    } finally {
      window.matchMedia = realMM;
    }
  });
});

describe('review fixes', () => {
  it('does not navigate the hidden board grid while Home search is active', async () => {
    await renderHome();
    act(() => useUiStore.getState().setHomeQuery('board'));
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(useUiStore.getState().selectedId).toBeNull();
    fireEvent.keyDown(window, { key: 'Enter' });
    // Still on Home (Enter didn't jump to an off-screen board).
    expect(window.location.hash).toBe('');
  });

  it('⇧M is a no-op in selection mode with an empty selection', async () => {
    await renderTodo();
    fireEvent.keyDown(window, { key: 'j' }); // cursor → a task
    fireEvent.keyDown(window, { key: 's' }); // enter selection mode, nothing checked
    expect(useUiStore.getState().selectionMode).toBe(true);
    expect(useUiStore.getState().selectedTaskIds).toEqual([]);
    fireEvent.keyDown(window, { key: 'M', shiftKey: true });
    expect(useUiStore.getState().moveOpen).toBe(false);
  });
});
