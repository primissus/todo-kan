import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { TodoView } from '@/features/todo/TodoView';
import { KanbanView } from '@/features/kanban/KanbanView';
import { useAppStore } from '@/store/useAppStore';

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
