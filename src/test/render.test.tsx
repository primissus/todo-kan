import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { TodoView } from '@/features/todo/TodoView';
import { KanbanView } from '@/features/kanban/KanbanView';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';

beforeEach(() => {
  useAppStore.setState({ boards: {}, boardOrder: [], tasks: {} });
  localStorage.clear();
  window.location.hash = '';
});

describe('App shell', () => {
  it('renders the home empty state', () => {
    render(<App />);
    expect(screen.getByText(/No lists yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^New/i })).toBeInTheDocument();
  });

  it('opens the settings dialog with theme controls', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /settings/i }));
    expect(await screen.findByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });
});

describe('TodoView', () => {
  it('adds a task through the dialog and toggles completion', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    render(<TodoView boardId={id} />);

    await user.click(screen.getByRole('button', { name: /add task/i }));
    const title = await screen.findByLabelText('Title');
    await user.type(title, 'Write tests');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Write tests')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /toggle complete/i }));
    const task = Object.values(useAppStore.getState().tasks)[0];
    expect(task.completed).toBe(true);
  });

  it('renders a URL in the description as a new-tab link', () => {
    const id = useAppStore.getState().createBoard('todo');
    useAppStore
      .getState()
      .addTask(id, { title: 'L', description: 'see https://example.com now' });
    render(<TodoView boardId={id} />);

    const link = screen.getByRole('link', { name: 'https://example.com' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('adds, edits and deletes a note through the notes dialog', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    const t = useAppStore.getState().addTask(id, { title: 'Task' });
    render(<TodoView boardId={id} />);

    // Open the thread from the row's Notes button.
    await user.click(screen.getByRole('button', { name: /^notes/i }));

    // Add.
    await user.type(await screen.findByLabelText('Add a note'), 'My first note');
    await user.click(screen.getByRole('button', { name: 'Add note' }));
    expect(await screen.findByText('My first note')).toBeInTheDocument();
    expect(useAppStore.getState().tasks[t].notes).toHaveLength(1);

    // Edit.
    await user.click(screen.getByRole('button', { name: /^Edit note/ }));
    const editBox = screen.getByLabelText('Edit note');
    await user.clear(editBox);
    await user.type(editBox, 'edited note');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('edited note')).toBeInTheDocument();

    // Delete (confirm).
    await user.click(screen.getByRole('button', { name: /^Delete note/ }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(useAppStore.getState().tasks[t].notes).toHaveLength(0);
  });

  it('saving an unchanged note does not mark it edited', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    const t = useAppStore.getState().addTask(id, { title: 'Task' });
    useAppStore.getState().addNote(t, 'untouched');
    render(<TodoView boardId={id} />);

    await user.click(screen.getByRole('button', { name: /^notes/i }));
    await user.click(await screen.findByRole('button', { name: /^Edit note/ }));
    // Save without changing anything.
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.queryByText(/edited/)).not.toBeInTheDocument();
    const note = useAppStore.getState().tasks[t].notes[0];
    expect(note.updatedAt).toBe(note.createdAt);
  });

  it('confirms before discarding an in-progress edit when switching notes', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    const t = useAppStore.getState().addTask(id, { title: 'Task' });
    useAppStore.getState().addNote(t, 'note A');
    useAppStore.getState().addNote(t, 'note B');
    render(<TodoView boardId={id} />);

    await user.click(screen.getByRole('button', { name: /^notes/i }));
    // Edit the first note and make it dirty.
    const editButtons = await screen.findAllByRole('button', { name: /^Edit note/ });
    await user.click(editButtons[0]);
    const editBox = screen.getByLabelText('Edit note');
    await user.type(editBox, ' changed');

    // Click the other note's Edit — should prompt instead of silently switching.
    await user.click(screen.getByRole('button', { name: /^Edit note/ }));
    expect(await screen.findByText('Discard changes?')).toBeInTheDocument();

    // Discard → switches to note B's text; nothing was persisted for A.
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByLabelText('Edit note')).toHaveValue('note B');
    expect(useAppStore.getState().tasks[t].notes[0].text).toBe('note A');
  });
});

describe('TaskDialog (read-only view → edit + discussion)', () => {
  it('opens read-only, edits in a buffered form, commits on Done editing', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    const t = useAppStore.getState().addTask(id, { title: 'Original' });
    render(<TodoView boardId={id} />);

    await user.click(screen.getByRole('button', { name: 'Open task' }));

    // Read-only by default: the title shows as a heading and the discussion is
    // present, but there is no editable Title field yet.
    expect(
      await screen.findByRole('heading', { name: 'Original' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Add a note')).toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).toBeNull();

    // Edit reveals the form; typing edits a buffered draft — NOT the store yet.
    await user.click(screen.getByRole('button', { name: /Edit/ }));
    const titleInput = await screen.findByLabelText('Title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Renamed');
    expect(useAppStore.getState().tasks[t].title).toBe('Original');

    // Done editing commits the draft and returns to read-only.
    await user.click(screen.getByRole('button', { name: 'Done editing' }));
    expect(useAppStore.getState().tasks[t].title).toBe('Renamed');
    expect(
      await screen.findByRole('heading', { name: 'Renamed' }),
    ).toBeInTheDocument();
  });

  it('⌘/Ctrl+Enter in the edit form saves the draft and returns to read-only', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    const t = useAppStore.getState().addTask(id, { title: 'Original' });
    render(<TodoView boardId={id} />);

    await user.click(screen.getByRole('button', { name: 'Open task' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'E', shiftKey: true });
    const titleInput = await screen.findByLabelText('Title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Saved');
    expect(useAppStore.getState().tasks[t].title).toBe('Original');

    fireEvent.keyDown(titleInput, { key: 'Enter', metaKey: true });
    // RHF handleSubmit is async, so the commit lands a microtask later.
    await waitFor(() =>
      expect(useAppStore.getState().tasks[t].title).toBe('Saved'),
    );
    // Back to read-only, dialog still open.
    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Esc steps out of the edit field first, then prompts to discard a dirty draft', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    const t = useAppStore.getState().addTask(id, { title: 'Original' });
    render(<TodoView boardId={id} />);

    await user.click(screen.getByRole('button', { name: 'Open task' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'E', shiftKey: true });
    const titleInput = await screen.findByLabelText('Title');
    await user.type(titleInput, ' edited');
    titleInput.focus();

    // First Esc: blurs the field — no discard modal yet.
    fireEvent.keyDown(titleInput, { key: 'Escape' });
    expect(titleInput).not.toHaveFocus();
    expect(screen.queryByText('Discard changes?')).toBeNull();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();

    // Second Esc (no field focused): dirty draft → discard confirm.
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(await screen.findByText('Discard changes?')).toBeInTheDocument();

    // Confirm discard → reverts to read-only; the store was never touched.
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(useAppStore.getState().tasks[t].title).toBe('Original');
    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());
    expect(screen.getByRole('heading', { name: 'Original' })).toBeInTheDocument();
  });

  it('Esc twice on a clean draft returns to read-only with no discard prompt', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    useAppStore.getState().addTask(id, { title: 'Original' });
    render(<TodoView boardId={id} />);

    await user.click(screen.getByRole('button', { name: 'Open task' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'E', shiftKey: true });
    const titleInput = await screen.findByLabelText('Title');
    titleInput.focus();

    // First Esc blurs the field; second Esc cancels the (clean) edit — no modal.
    fireEvent.keyDown(titleInput, { key: 'Escape' });
    expect(titleInput).not.toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByText('Discard changes?')).toBeNull();
    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());
    expect(screen.getByRole('heading', { name: 'Original' })).toBeInTheDocument();
  });

  it('⌘/Ctrl+Enter closes the task dialog', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    useAppStore.getState().addTask(id, { title: 'Original' });
    render(<TodoView boardId={id} />);

    await user.click(screen.getByRole('button', { name: 'Open task' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Enter', metaKey: true });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('Shift+E enters edit mode', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    useAppStore.getState().addTask(id, { title: 'Original' });
    render(<TodoView boardId={id} />);

    await user.click(screen.getByRole('button', { name: 'Open task' }));
    await screen.findByRole('heading', { name: 'Original' });
    expect(screen.queryByLabelText('Title')).toBeNull();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'E', shiftKey: true });
    // The buffered draft is seeded from the task (reset(snapshot)).
    expect(await screen.findByLabelText('Title')).toHaveValue('Original');
  });

  it('Shift+C focuses the comment box', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    useAppStore.getState().addTask(id, { title: 'Original' });
    render(<TodoView boardId={id} />);

    await user.click(screen.getByRole('button', { name: 'Open task' }));
    await screen.findByRole('heading', { name: 'Original' });

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'C', shiftKey: true });
    expect(screen.getByLabelText('Add a note')).toHaveFocus();
  });

  it('Esc steps out of a focused field first, then closes (read-only)', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    useAppStore.getState().addTask(id, { title: 'Original' });
    render(<TodoView boardId={id} />);

    await user.click(screen.getByRole('button', { name: 'Open task' }));
    await screen.findByRole('heading', { name: 'Original' });

    // Focus the comment box — a field in the read-only view.
    const note = screen.getByLabelText('Add a note');
    note.focus();
    expect(note).toHaveFocus();

    // First Esc: field loses focus, dialog stays open.
    fireEvent.keyDown(note, { key: 'Escape' });
    expect(note).not.toHaveFocus();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Second Esc (nothing focused): dialog closes.
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('exposes a live Reminder control in the read-only view (no edit needed)', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    useAppStore.getState().addTask(id, { title: 'Original' });
    render(<TodoView boardId={id} />);

    await user.click(screen.getByRole('button', { name: 'Open task' }));
    await screen.findByRole('heading', { name: 'Original' });

    // Still read-only (no Title field), but the Reminder picker is right there.
    expect(screen.queryByLabelText('Title')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reminder' })).toBeInTheDocument();
  });

  it('exposes a live Status control in the read-only view (Kanban)', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('kanban');
    const col0 = useAppStore.getState().boards[id].columns[0].id;
    useAppStore.getState().addTask(id, { title: 'Card', columnId: col0 });
    render(<KanbanView boardId={id} />);

    await user.click(screen.getByRole('button', { name: 'Open card' }));
    await screen.findByRole('heading', { name: 'Card' });

    expect(screen.queryByLabelText('Title')).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
  });
});

describe('Selection mode', () => {
  it('clicking a TODO row toggles its selection; per-task controls are suppressed', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    const t = useAppStore.getState().addTask(id, { title: 'Pick me' });
    useUiStore.getState().enterSelectionMode();
    render(<TodoView boardId={id} />);

    // The whole row becomes the click target; the open/archive/complete controls go away.
    expect(screen.queryByRole('button', { name: 'Open task' })).toBeNull();
    expect(
      screen.queryByRole('checkbox', { name: /toggle complete/i }),
    ).toBeNull();

    const row = screen.getByRole('button', { name: /Pick me/ });
    await user.click(row);
    expect(useUiStore.getState().selectedTaskIds).toContain(t);

    // Clicking again toggles it back off.
    await user.click(row);
    expect(useUiStore.getState().selectedTaskIds).not.toContain(t);
  });

  it('clicking a Kanban card toggles its selection; the open button is suppressed', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('kanban');
    const col0 = useAppStore.getState().boards[id].columns[0].id;
    const t = useAppStore.getState().addTask(id, { title: 'Card X', columnId: col0 });
    useUiStore.getState().enterSelectionMode();
    render(<KanbanView boardId={id} />);

    expect(screen.queryByRole('button', { name: 'Open card' })).toBeNull();

    const card = screen.getByRole('button', { name: /Card X/ });
    await user.click(card);
    expect(useUiStore.getState().selectedTaskIds).toContain(t);
  });
});

describe('Home search', () => {
  it('type:task jumps to the matching task on its board', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo', 'Groceries');
    const t = useAppStore.getState().addTask(id, { title: 'Buy milk' });
    window.location.hash = '';
    render(<App />);

    const search = await screen.findByLabelText('Search');
    await user.type(search, 'type:task milk');

    const hit = await screen.findByRole('button', { name: /Buy milk/i });
    await user.click(hit);

    await waitFor(() => {
      expect(window.location.hash).toContain(encodeURIComponent(id));
      expect(useUiStore.getState().selectedId).toBe(t);
    });
  });
});

describe('KanbanView', () => {
  it('renders default columns and adds a card', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('kanban');
    render(<KanbanView boardId={id} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add card' }));
    const title = await screen.findByLabelText('Title');
    await user.type(title, 'Card one');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Card one')).toBeInTheDocument();
    const task = Object.values(useAppStore.getState().tasks)[0];
    expect(task.columnId).toBe(useAppStore.getState().boards[id].columns[0].id);
  });
});
