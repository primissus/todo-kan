import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('TaskDialog (unified view/edit + discussion)', () => {
  it('opens from the row and live-edits the title', async () => {
    const user = userEvent.setup();
    const id = useAppStore.getState().createBoard('todo');
    const t = useAppStore.getState().addTask(id, { title: 'Original' });
    render(<TodoView boardId={id} />);

    await user.click(screen.getByRole('button', { name: 'Open task' }));

    // The unified dialog shows the scheduling fields and the discussion thread.
    expect(await screen.findByText('Due date')).toBeInTheDocument();
    expect(screen.getByText('Discussion')).toBeInTheDocument();

    const titleInput = screen.getByLabelText('Title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Renamed');
    expect(useAppStore.getState().tasks[t].title).toBe('Renamed');
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
