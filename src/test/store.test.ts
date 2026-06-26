import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { buildExport, parseImport, rekey } from '@/lib/transfer';
import { filterBySearch, parseQuery } from '@/lib/search';

const s = () => useAppStore.getState();
const task = (id: string) => s().tasks[id];
const board = (id: string) => s().boards[id];
const colTasks = (boardId: string, columnId: string) =>
  board(boardId).taskIds.filter((tid) => task(tid).columnId === columnId);

beforeEach(() => {
  useAppStore.setState({ boards: {}, boardOrder: [], tasks: {} });
  localStorage.clear();
});

describe('boards & columns', () => {
  it('creates a kanban board with 4 default columns, last marked done', () => {
    const id = useAppStore.getState().createBoard('kanban');
    const b = board(id);
    expect(b.columns.map((c) => c.title)).toEqual([
      'Pending',
      'In Progress',
      'Review',
      'Done',
    ]);
    expect(b.columns.filter((c) => c.isDone)).toHaveLength(1);
    expect(b.columns[3].isDone).toBe(true);
  });

  it('creates a todo board with no columns', () => {
    const id = s().createBoard('todo');
    expect(board(id).type).toBe('todo');
    expect(board(id).columns).toHaveLength(0);
  });
});

describe('tasks', () => {
  it('adds kanban task to the first column by default and appends in order', () => {
    const id = s().createBoard('kanban');
    const c0 = board(id).columns[0].id;
    const t1 = s().addTask(id, { title: 'a' });
    const t2 = s().addTask(id, { title: 'b' });
    expect(task(t1).columnId).toBe(c0);
    expect(colTasks(id, c0)).toEqual([t1, t2]);
  });

  it('toggles completion on todo tasks', () => {
    const id = s().createBoard('todo');
    const t = s().addTask(id, { title: 'x' });
    expect(task(t).completed).toBe(false);
    s().toggleComplete(t);
    expect(task(t).completed).toBe(true);
  });

  it('reorders within a list (arrayMove semantics)', () => {
    const id = s().createBoard('todo');
    const a = s().addTask(id, { title: 'a' });
    const b = s().addTask(id, { title: 'b' });
    const c = s().addTask(id, { title: 'c' });
    expect(board(id).taskIds).toEqual([a, b, c]);
    s().reorderTaskInBoard(id, c, a); // move c to a's position
    expect(board(id).taskIds).toEqual([c, a, b]);
  });
});

describe('kanban cross-column moves', () => {
  it('moves a card to the end of another column, then before a specific card', () => {
    const id = s().createBoard('kanban');
    const [c0, c1] = board(id).columns.map((c) => c.id);
    const t1 = s().addTask(id, { title: 'a', columnId: c0 });
    const t2 = s().addTask(id, { title: 'b', columnId: c0 });
    const t3 = s().addTask(id, { title: 'c', columnId: c1 });

    s().moveTaskToColumn(t1, c1, null); // end of c1
    expect(task(t1).columnId).toBe(c1);
    expect(colTasks(id, c1)).toEqual([t3, t1]);
    expect(colTasks(id, c0)).toEqual([t2]);

    s().moveTaskToColumn(t2, c1, t3); // before t3
    expect(colTasks(id, c1)).toEqual([t2, t3, t1]);
    expect(colTasks(id, c0)).toEqual([]);
  });
});

describe('archiving', () => {
  it('archive done targets only the done column', () => {
    const id = s().createBoard('kanban');
    const cols = board(id).columns;
    const c0 = cols[0].id;
    const done = cols.find((c) => c.isDone)!.id;
    const t1 = s().addTask(id, { title: 'a', columnId: c0 });
    const t2 = s().addTask(id, { title: 'b', columnId: done });
    s().archiveDone(id);
    expect(task(t1).archived).toBe(false);
    expect(task(t2).archived).toBe(true);
  });

  it('archives and unarchives a single task', () => {
    const id = s().createBoard('todo');
    const t = s().addTask(id, { title: 'x' });
    s().archiveTask(t);
    expect(task(t).archived).toBe(true);
    s().unarchiveTask(t);
    expect(task(t).archived).toBe(false);
  });
});

describe('columns editing', () => {
  it('reassigns orphaned cards to the first column when a column is removed', () => {
    const id = s().createBoard('kanban');
    const [c0, c1] = board(id).columns.map((c) => c.id);
    const t = s().addTask(id, { title: 'a', columnId: c1 });
    // keep only c0
    s().setColumns(id, [{ id: c0, title: 'Only', order: 0, isDone: true }]);
    expect(task(t).columnId).toBe(c0);
  });
});

describe('clear', () => {
  it('clearBoard removes every task of the board', () => {
    const id = s().createBoard('todo');
    s().addTask(id, { title: 'a' });
    s().addTask(id, { title: 'b' });
    expect(board(id).taskIds).toHaveLength(2);
    s().clearBoard(id);
    expect(board(id).taskIds).toHaveLength(0);
    expect(Object.keys(s().tasks)).toHaveLength(0);
  });

  it('clearAll wipes all data', () => {
    s().createBoard('todo');
    s().createBoard('kanban');
    s().clearAll();
    expect(Object.keys(s().boards)).toHaveLength(0);
    expect(s().boardOrder).toHaveLength(0);
  });
});

describe('export / import', () => {
  it('round-trips with regenerated ids (collision-proof)', () => {
    const id = s().createBoard('kanban');
    const c0 = board(id).columns[0].id;
    s().addTask(id, { title: 'a', columnId: c0 });

    const payload = buildExport([id], s().boards, s().tasks);
    expect(payload.boards).toHaveLength(1);
    expect(payload.tasks).toHaveLength(1);

    const beforeBoards = Object.keys(s().boards).length;
    const n = s().importBoards(payload, 'merge');
    expect(n).toBe(1);
    expect(Object.keys(s().boards).length).toBe(beforeBoards + 1);

    // the imported board has a new id and its task points at it
    const ids = Object.keys(s().boards);
    expect(ids).toContain(id);
    const importedId = ids.find((x) => x !== id)!;
    expect(importedId).not.toBe(id);
    const importedTasks = board(importedId).taskIds;
    expect(importedTasks).toHaveLength(1);
    expect(task(importedTasks[0]).boardId).toBe(importedId);
  });

  it('replace mode clears existing data first', () => {
    const keep = s().createBoard('todo');
    const payload = buildExport([keep], s().boards, s().tasks);
    s().createBoard('kanban'); // extra board that should be wiped
    s().importBoards(payload, 'replace');
    expect(Object.keys(s().boards)).toHaveLength(1);
  });

  it('rekey produces fresh ids and remaps columnId', () => {
    const id = s().createBoard('kanban');
    const c0 = board(id).columns[0].id;
    const t = s().addTask(id, { title: 'a', columnId: c0 });
    const payload = buildExport([id], s().boards, s().tasks);
    const r = rekey(payload);
    expect(r.boards[0].id).not.toBe(id);
    expect(r.tasks[0].id).not.toBe(t);
    expect(r.tasks[0].boardId).toBe(r.boards[0].id);
    // remapped column id belongs to the new board
    expect(r.boards[0].columns.some((c) => c.id === r.tasks[0].columnId)).toBe(
      true,
    );
  });

  it('parseImport rejects bad input', () => {
    expect(() => parseImport('not json')).toThrow();
    expect(() => parseImport(JSON.stringify({ app: 'other' }))).toThrow();
    expect(() =>
      parseImport(JSON.stringify({ app: 'todo-kan', schemaVersion: 99 })),
    ).toThrow();
  });
});

describe('search', () => {
  const items = [
    { title: 'Buy milk', description: 'whole milk', tags: ['groceries'] },
    { title: 'Call Bob', description: 'about taxes', tags: ['errand', 'urgent'] },
  ];

  it('fuzzy matches title/description', () => {
    expect(filterBySearch(items, 'milk')).toHaveLength(1);
    expect(filterBySearch(items, 'taxes')[0].title).toBe('Call Bob');
  });

  it('#tag matches only tags', () => {
    expect(filterBySearch(items, '#errand')).toHaveLength(1);
    expect(filterBySearch(items, '#errand')[0].title).toBe('Call Bob');
    // a word that exists in a title but not in tags returns nothing in tag mode
    expect(filterBySearch(items, '#milk')).toHaveLength(0);
  });

  it('empty query returns all', () => {
    expect(filterBySearch(items, '')).toHaveLength(2);
  });

  it('parses a leading type:task / type:list filter (and strips it)', () => {
    expect(parseQuery('type:task milk')).toEqual({
      term: 'milk',
      tagOnly: false,
      kind: 'task',
    });
    expect(parseQuery('type:list')).toEqual({
      term: '',
      tagOnly: false,
      kind: 'list',
    });
    // type: combines with the #tag prefix
    expect(parseQuery('type:task #urgent')).toEqual({
      term: 'urgent',
      tagOnly: true,
      kind: 'task',
    });
    // no prefix → no kind, plain term
    expect(parseQuery('design')).toEqual({ term: 'design', tagOnly: false });
  });
});

describe('task scheduling (dueAt / remindAt)', () => {
  it('stores dueAt/remindAt on add and reads them back', () => {
    const id = s().createBoard('todo');
    const t = s().addTask(id, { title: 'x', dueAt: 1000, remindAt: 900 });
    expect(task(t).dueAt).toBe(1000);
    expect(task(t).remindAt).toBe(900);
  });

  it('edits and clears dueAt/remindAt (null clears, undefined leaves as-is)', () => {
    const id = s().createBoard('todo');
    const t = s().addTask(id, { title: 'x', dueAt: 1000, remindAt: 900 });

    s().editTask(t, { dueAt: 2000 });
    expect(task(t).dueAt).toBe(2000);
    expect(task(t).remindAt).toBe(900); // untouched

    s().editTask(t, { dueAt: null });
    expect(task(t).dueAt).toBeUndefined();
    expect(task(t).remindAt).toBe(900); // still untouched

    s().editTask(t, { remindAt: null });
    expect(task(t).remindAt).toBeUndefined();
  });
});
