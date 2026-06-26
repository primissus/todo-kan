import { describe, expect, it } from 'vitest';
import {
  fingerprintPayload,
  parseImport,
  payloadsEqual,
  serializeExport,
  summarizePayload,
  type TransferPayload,
} from '@/lib/transfer';
import { EXPORT_APP_ID, EXPORT_SCHEMA_VERSION } from '@/lib/storageKeys';
import type {
  Board,
  BoardId,
  ColumnId,
  NoteId,
  Task,
  TaskId,
} from '@/lib/types/domain';

// A two-task kanban board, parameterized by an id `suffix` and `exportedAt` so we
// can produce the SAME content under DIFFERENT ids/timestamps (what import does).
function sample(
  suffix: string,
  exportedAt: number,
  firstTitle = 'Buy milk',
): TransferPayload {
  const colTodo = `c-todo-${suffix}` as ColumnId;
  const colDone = `c-done-${suffix}` as ColumnId;
  const board: Board = {
    id: `b-${suffix}` as BoardId,
    type: 'kanban',
    title: 'Groceries',
    description: 'weekly',
    tags: ['home'],
    columns: [
      { id: colTodo, title: 'Todo', order: 0 },
      { id: colDone, title: 'Done', order: 1, isDone: true },
    ],
    taskIds: [`t1-${suffix}` as TaskId, `t2-${suffix}` as TaskId],
    showCompleted: true,
    archived: false,
    createdAt: 10,
    updatedAt: 20,
  };
  const tasks: Task[] = [
    {
      id: `t1-${suffix}` as TaskId,
      boardId: board.id,
      title: firstTitle,
      description: '',
      tags: [],
      completed: false,
      columnId: colTodo,
      archived: false,
      notes: [],
      createdAt: 11,
      updatedAt: 12,
    },
    {
      id: `t2-${suffix}` as TaskId,
      boardId: board.id,
      title: 'Eggs',
      description: 'a dozen',
      tags: ['urgent'],
      completed: false,
      columnId: colDone,
      archived: false,
      notes: [
        { id: `n-${suffix}` as NoteId, text: 'remember', createdAt: 1, updatedAt: 1 },
      ],
      createdAt: 13,
      updatedAt: 14,
    },
  ];
  return {
    app: EXPORT_APP_ID,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt,
    boards: [board],
    tasks,
  };
}

const empty: TransferPayload = {
  app: EXPORT_APP_ID,
  schemaVersion: EXPORT_SCHEMA_VERSION,
  exportedAt: 0,
  boards: [],
  tasks: [],
};

describe('payloadsEqual', () => {
  it('treats same content with different ids + exportedAt as equal', () => {
    // This is the crux: import re-keys every id, so the comparison must be
    // id-independent (and ignore the volatile exportedAt / timestamps).
    expect(payloadsEqual(sample('a', 100), sample('b', 999))).toBe(true);
  });

  it('detects a changed task title', () => {
    expect(payloadsEqual(sample('a', 1), sample('b', 1, 'Buy bread'))).toBe(false);
  });

  it('detects a different task order', () => {
    const reordered = sample('b', 1);
    reordered.boards[0].taskIds = [...reordered.boards[0].taskIds].reverse();
    expect(payloadsEqual(sample('a', 1), reordered)).toBe(false);
  });

  it('is robust to column id differences but sensitive to column titles', () => {
    const renamed = sample('b', 1);
    renamed.boards[0].columns[0].title = 'Backlog';
    expect(payloadsEqual(sample('a', 1), renamed)).toBe(false);
  });

  it('considers two empty payloads equal', () => {
    expect(payloadsEqual(empty, { ...empty, exportedAt: 50 })).toBe(true);
  });

  it('survives a serialize → parseImport round-trip', () => {
    const parsed = parseImport(serializeExport(sample('a', 100)));
    expect(payloadsEqual(sample('a', 100), parsed)).toBe(true);
  });
});

describe('fingerprintPayload', () => {
  it('is stable regardless of exportedAt', () => {
    expect(fingerprintPayload(sample('a', 1))).toBe(fingerprintPayload(sample('a', 2)));
  });
});

describe('summarizePayload', () => {
  it('counts boards and tasks', () => {
    expect(summarizePayload(sample('a', 1))).toEqual({ boards: 1, tasks: 2 });
  });

  it('counts an empty payload as zeros', () => {
    expect(summarizePayload(empty)).toEqual({ boards: 0, tasks: 0 });
  });
});
