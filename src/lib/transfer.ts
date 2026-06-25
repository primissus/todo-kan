// Export / import of boards + tasks as a JSON envelope.
// Import ALWAYS regenerates ids (collision-proof: importing the same file twice
// yields independent copies).

import { EXPORT_APP_ID, EXPORT_SCHEMA_VERSION } from './storageKeys';
import { newBoardId, newColumnId, newTaskId } from './id';
import type {
  Board,
  BoardId,
  ColumnId,
  Task,
  TaskId,
} from './types/domain';

export interface TransferPayload {
  app: string;
  schemaVersion: number;
  exportedAt: number;
  boards: Board[];
  tasks: Task[];
}

/** Collect the selected boards and all of their tasks into an export envelope. */
export function buildExport(
  boardIds: string[],
  boards: Record<string, Board>,
  tasks: Record<string, Task>,
): TransferPayload {
  const selBoards: Board[] = [];
  const selTasks: Task[] = [];
  for (const id of boardIds) {
    const b = boards[id];
    if (!b) continue;
    selBoards.push(b);
    for (const tid of b.taskIds) {
      const t = tasks[tid];
      if (t) selTasks.push(t);
    }
  }
  return {
    app: EXPORT_APP_ID,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: Date.now(),
    boards: selBoards,
    tasks: selTasks,
  };
}

export function serializeExport(payload: TransferPayload): string {
  return JSON.stringify(payload, null, 2);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

/** Parse + validate an import file. Throws a user-facing Error on bad input. */
export function parseImport(text: string): TransferPayload {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  if (!isRecord(data)) throw new Error('Unexpected file format.');
  if (data.app !== EXPORT_APP_ID) {
    throw new Error('This file is not a todo-kan export.');
  }
  if (
    typeof data.schemaVersion !== 'number' ||
    data.schemaVersion > EXPORT_SCHEMA_VERSION
  ) {
    throw new Error('This export was made by a newer version of todo-kan.');
  }
  if (!Array.isArray(data.boards) || !Array.isArray(data.tasks)) {
    throw new Error('Export is missing boards or tasks.');
  }
  for (const b of data.boards) {
    if (!isRecord(b) || typeof b.id !== 'string' || typeof b.title !== 'string') {
      throw new Error('Export contains a malformed board.');
    }
  }
  for (const t of data.tasks) {
    if (!isRecord(t) || typeof t.id !== 'string' || typeof t.boardId !== 'string') {
      throw new Error('Export contains a malformed task.');
    }
  }
  return {
    app: data.app,
    schemaVersion: data.schemaVersion,
    exportedAt: typeof data.exportedAt === 'number' ? data.exportedAt : Date.now(),
    boards: data.boards as Board[],
    tasks: data.tasks as Task[],
  };
}

export interface RekeyResult {
  boards: Board[];
  tasks: Task[];
}

/**
 * Regenerate every board/column/task id and remap references. After this, the
 * returned data shares no ids with anything already in the store, and kanban
 * tasks are guaranteed a valid columnId (falling back to the first column).
 */
export function rekey(payload: TransferPayload): RekeyResult {
  const boardIdMap = new Map<string, BoardId>();
  const colIdMap = new Map<string, ColumnId>();
  const taskIdMap = new Map<string, TaskId>();

  for (const b of payload.boards) {
    boardIdMap.set(b.id, newBoardId());
    for (const c of b.columns ?? []) colIdMap.set(c.id, newColumnId());
  }
  for (const t of payload.tasks) taskIdMap.set(t.id, newTaskId());

  const boards: Board[] = payload.boards.map((b) => ({
    ...b,
    id: boardIdMap.get(b.id) as BoardId,
    columns: (b.columns ?? []).map((c) => ({
      ...c,
      id: colIdMap.get(c.id) as ColumnId,
    })),
    taskIds: (b.taskIds ?? [])
      .map((tid) => taskIdMap.get(tid))
      .filter((x): x is TaskId => !!x),
  }));

  const boardById = new Map(boards.map((b) => [b.id, b] as const));

  const tasks: Task[] = payload.tasks.map((t) => {
    const boardId = boardIdMap.get(t.boardId) as BoardId;
    const board = boardById.get(boardId);
    let columnId: ColumnId | null = t.columnId
      ? colIdMap.get(t.columnId) ?? null
      : null;
    // A kanban task must land in a real column.
    if (board && board.type === 'kanban') {
      const valid = columnId && board.columns.some((c) => c.id === columnId);
      if (!valid) columnId = board.columns[0]?.id ?? null;
    } else {
      columnId = null;
    }
    return {
      ...t,
      id: taskIdMap.get(t.id) as TaskId,
      boardId,
      columnId,
    };
  });

  return { boards, tasks };
}
