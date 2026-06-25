// Normalized domain model — the single source of truth for the app.
//
// Tasks live in a flat `tasks: Record<TaskId, Task>` map in the store; each
// board keeps an ordered `taskIds: TaskId[]` that is the ONE source of order
// (both for a TODO list and, filtered per column, for a Kanban board).

export type BoardId = string & { readonly __brand: 'BoardId' };
export type TaskId = string & { readonly __brand: 'TaskId' };
export type ColumnId = string & { readonly __brand: 'ColumnId' };

export type BoardType = 'todo' | 'kanban';

/** Free-text chips. No normalized registry — autocomplete scans existing tags. */
export type Tag = string;

export interface Column {
  id: ColumnId;
  title: string;
  order: number; // 0-based, contiguous
  /** Marks the "archive Done" target — robust to renaming/reordering. */
  isDone?: boolean;
}

export const DEFAULT_COLUMN_TITLES = [
  'Pending',
  'In Progress',
  'Review',
  'Done',
] as const;

export interface Task {
  id: TaskId;
  boardId: BoardId;
  title: string;
  description: string; // '' when empty, never undefined
  tags: Tag[]; // labels / chips
  completed: boolean; // todo only; ignored for kanban
  columnId: ColumnId | null; // kanban only; null for todo
  archived: boolean; // task-level archive
  createdAt: number;
  updatedAt: number;
}

export interface Board {
  id: BoardId;
  type: BoardType; // discriminant
  title: string;
  description: string;
  tags: Tag[]; // board-level chips
  columns: Column[]; // kanban only; [] for todo
  taskIds: TaskId[]; // ordered list of ALL this board's tasks (the order source)
  showCompleted: boolean; // per-list toggle (todo)
  archived: boolean; // board-level archive
  createdAt: number;
  updatedAt: number;
}

export const isKanban = (b: Board): boolean => b.type === 'kanban';
export const isTodo = (b: Board): boolean => b.type === 'todo';

/** Shape persisted by Zustand `persist` (also the export/import envelope payload). */
export interface PersistedData {
  boards: Record<string, Board>;
  boardOrder: string[];
  tasks: Record<string, Task>;
}
