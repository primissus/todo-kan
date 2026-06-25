import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { storage } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { newBoardId, newColumnId, newTaskId } from '@/lib/id';
import { rekey, type TransferPayload } from '@/lib/transfer';
import {
  DEFAULT_COLUMN_TITLES,
  type Board,
  type BoardId,
  type BoardType,
  type Column,
  type ColumnId,
  type Task,
  type TaskId,
} from '@/lib/types/domain';

export interface TaskInput {
  title: string;
  description?: string;
  tags?: string[];
  columnId?: ColumnId | null;
}

export interface TaskPatch {
  title?: string;
  description?: string;
  tags?: string[];
  columnId?: ColumnId | null;
  completed?: boolean;
}

export interface BoardMetaPatch {
  title?: string;
  description?: string;
  tags?: string[];
}

export type ImportMode = 'merge' | 'replace';

interface DataState {
  boards: Record<string, Board>;
  boardOrder: string[];
  tasks: Record<string, Task>;
}

interface Actions {
  // boards
  createBoard: (type: BoardType, title?: string) => BoardId;
  updateBoardMeta: (boardId: string, patch: BoardMetaPatch) => void;
  deleteBoard: (boardId: string) => void;
  archiveBoard: (boardId: string) => void;
  unarchiveBoard: (boardId: string) => void;
  setShowCompleted: (boardId: string, value: boolean) => void;
  reorderBoard: (activeBoardId: string, overBoardId: string) => void;
  // columns (kanban)
  setColumns: (boardId: string, columns: Column[]) => void;
  archiveDone: (boardId: string) => void;
  // tasks
  addTask: (boardId: string, input: TaskInput) => TaskId;
  editTask: (taskId: string, patch: TaskPatch) => void;
  deleteTask: (taskId: string) => void;
  toggleComplete: (taskId: string) => void;
  archiveTask: (taskId: string) => void;
  unarchiveTask: (taskId: string) => void;
  // dnd
  reorderTaskInBoard: (
    boardId: string,
    activeTaskId: string,
    overTaskId: string,
  ) => void;
  moveTaskToColumn: (
    taskId: string,
    columnId: ColumnId,
    beforeTaskId: string | null,
  ) => void;
  // bulk
  clearBoard: (boardId: string) => void;
  clearAll: () => void;
  importBoards: (payload: TransferPayload, mode: ImportMode) => number;
  // keyboard move-mode revert (restore a snapshotted order)
  restoreTaskOrder: (
    boardId: string,
    taskIds: string[],
    taskId?: string,
    columnId?: ColumnId | null,
  ) => void;
  restoreBoardOrder: (order: string[]) => void;
}

export type AppState = DataState & Actions;

const now = () => Date.now();

function makeColumns(): Column[] {
  return DEFAULT_COLUMN_TITLES.map((title, i) => ({
    id: newColumnId(),
    title,
    order: i,
    isDone: i === DEFAULT_COLUMN_TITLES.length - 1,
  }));
}

export const useAppStore = create<AppState>()(
  persist(
    immer<AppState>((set) => ({
      boards: {},
      boardOrder: [],
      tasks: {},

      createBoard: (type, title) => {
        const id = newBoardId();
        const t = now();
        set((s) => {
          s.boards[id] = {
            id,
            type,
            title: title ?? (type === 'kanban' ? 'New board' : 'New list'),
            description: '',
            tags: [],
            columns: type === 'kanban' ? makeColumns() : [],
            taskIds: [],
            showCompleted: true,
            archived: false,
            createdAt: t,
            updatedAt: t,
          };
          s.boardOrder.unshift(id);
        });
        return id;
      },

      updateBoardMeta: (boardId, patch) =>
        set((s) => {
          const b = s.boards[boardId];
          if (!b) return;
          if (patch.title !== undefined) b.title = patch.title;
          if (patch.description !== undefined) b.description = patch.description;
          if (patch.tags !== undefined) b.tags = patch.tags;
          b.updatedAt = now();
        }),

      deleteBoard: (boardId) =>
        set((s) => {
          const b = s.boards[boardId];
          if (!b) return;
          for (const tid of b.taskIds) delete s.tasks[tid];
          delete s.boards[boardId];
          s.boardOrder = s.boardOrder.filter((x) => x !== boardId);
        }),

      archiveBoard: (boardId) =>
        set((s) => {
          const b = s.boards[boardId];
          if (b) {
            b.archived = true;
            b.updatedAt = now();
          }
        }),

      unarchiveBoard: (boardId) =>
        set((s) => {
          const b = s.boards[boardId];
          if (b) {
            b.archived = false;
            b.updatedAt = now();
          }
        }),

      setShowCompleted: (boardId, value) =>
        set((s) => {
          const b = s.boards[boardId];
          if (b) b.showCompleted = value;
        }),

      reorderBoard: (activeBoardId, overBoardId) =>
        set((s) => {
          const from = s.boardOrder.indexOf(activeBoardId);
          const to = s.boardOrder.indexOf(overBoardId);
          if (from < 0 || to < 0 || from === to) return;
          s.boardOrder.splice(from, 1);
          s.boardOrder.splice(to, 0, activeBoardId);
        }),

      setColumns: (boardId, columns) =>
        set((s) => {
          const b = s.boards[boardId];
          if (!b || b.type !== 'kanban') return;
          const valid = new Set(columns.map((c) => c.id));
          const first = columns[0]?.id ?? null;
          b.columns = columns;
          for (const tid of b.taskIds) {
            const tk = s.tasks[tid];
            if (tk && (tk.columnId == null || !valid.has(tk.columnId))) {
              tk.columnId = first;
            }
          }
          b.updatedAt = now();
        }),

      archiveDone: (boardId) =>
        set((s) => {
          const b = s.boards[boardId];
          if (!b || b.type !== 'kanban') return;
          const done =
            b.columns.find((c) => c.isDone) ?? b.columns[b.columns.length - 1];
          if (!done) return;
          for (const tid of b.taskIds) {
            const tk = s.tasks[tid];
            if (tk && tk.columnId === done.id && !tk.archived) {
              tk.archived = true;
              tk.updatedAt = now();
            }
          }
          b.updatedAt = now();
        }),

      addTask: (boardId, input) => {
        const id = newTaskId();
        const t = now();
        set((s) => {
          const b = s.boards[boardId];
          if (!b) return;
          let columnId: ColumnId | null = null;
          if (b.type === 'kanban') {
            columnId = input.columnId ?? b.columns[0]?.id ?? null;
          }
          s.tasks[id] = {
            id,
            boardId: boardId as BoardId,
            title: input.title,
            description: input.description ?? '',
            tags: input.tags ?? [],
            completed: false,
            columnId,
            archived: false,
            createdAt: t,
            updatedAt: t,
          };
          b.taskIds.push(id);
          b.updatedAt = t;
        });
        return id;
      },

      editTask: (taskId, patch) =>
        set((s) => {
          const tk = s.tasks[taskId];
          if (!tk) return;
          if (patch.title !== undefined) tk.title = patch.title;
          if (patch.description !== undefined) tk.description = patch.description;
          if (patch.tags !== undefined) tk.tags = patch.tags;
          if (patch.completed !== undefined) tk.completed = patch.completed;
          if (patch.columnId !== undefined && patch.columnId !== tk.columnId) {
            tk.columnId = patch.columnId;
            // Move to the end of the new column's group for a tidy result.
            const b = s.boards[tk.boardId];
            if (b && patch.columnId) {
              b.taskIds = b.taskIds.filter((x) => x !== taskId);
              let lastIdx = -1;
              b.taskIds.forEach((x, i) => {
                if (s.tasks[x]?.columnId === patch.columnId) lastIdx = i;
              });
              b.taskIds.splice(lastIdx + 1, 0, taskId as TaskId);
            }
          }
          tk.updatedAt = now();
        }),

      deleteTask: (taskId) =>
        set((s) => {
          const tk = s.tasks[taskId];
          if (!tk) return;
          const b = s.boards[tk.boardId];
          if (b) b.taskIds = b.taskIds.filter((x) => x !== taskId);
          delete s.tasks[taskId];
        }),

      toggleComplete: (taskId) =>
        set((s) => {
          const tk = s.tasks[taskId];
          if (tk) {
            tk.completed = !tk.completed;
            tk.updatedAt = now();
          }
        }),

      archiveTask: (taskId) =>
        set((s) => {
          const tk = s.tasks[taskId];
          if (tk) {
            tk.archived = true;
            tk.updatedAt = now();
          }
        }),

      unarchiveTask: (taskId) =>
        set((s) => {
          const tk = s.tasks[taskId];
          if (tk) {
            tk.archived = false;
            tk.updatedAt = now();
          }
        }),

      reorderTaskInBoard: (boardId, activeTaskId, overTaskId) =>
        set((s) => {
          const b = s.boards[boardId];
          if (!b) return;
          const from = b.taskIds.indexOf(activeTaskId as TaskId);
          const to = b.taskIds.indexOf(overTaskId as TaskId);
          if (from < 0 || to < 0 || from === to) return;
          b.taskIds.splice(from, 1);
          b.taskIds.splice(to, 0, activeTaskId as TaskId);
          b.updatedAt = now();
        }),

      moveTaskToColumn: (taskId, columnId, beforeTaskId) =>
        set((s) => {
          const tk = s.tasks[taskId];
          if (!tk) return;
          const b = s.boards[tk.boardId];
          if (!b) return;
          tk.columnId = columnId;
          tk.updatedAt = now();

          const ids = b.taskIds.filter((x) => x !== taskId);
          let insertAt: number;
          if (beforeTaskId && ids.includes(beforeTaskId as TaskId)) {
            insertAt = ids.indexOf(beforeTaskId as TaskId);
          } else {
            // place after the last existing card in the target column
            let lastIdx = -1;
            ids.forEach((x, i) => {
              if (s.tasks[x]?.columnId === columnId) lastIdx = i;
            });
            insertAt = lastIdx === -1 ? ids.length : lastIdx + 1;
          }
          ids.splice(insertAt, 0, taskId as TaskId);
          b.taskIds = ids;
          b.updatedAt = now();
        }),

      clearBoard: (boardId) =>
        set((s) => {
          const b = s.boards[boardId];
          if (!b) return;
          for (const tid of b.taskIds) delete s.tasks[tid];
          b.taskIds = [];
          b.updatedAt = now();
        }),

      clearAll: () =>
        set((s) => {
          s.boards = {};
          s.boardOrder = [];
          s.tasks = {};
        }),

      importBoards: (payload, mode) => {
        const { boards, tasks } = rekey(payload);
        set((s) => {
          if (mode === 'replace') {
            s.boards = {};
            s.boardOrder = [];
            s.tasks = {};
          }
          for (const t of tasks) s.tasks[t.id] = t;
          for (const b of boards) s.boards[b.id] = b;
          s.boardOrder.unshift(...boards.map((b) => b.id));
        });
        return boards.length;
      },

      restoreTaskOrder: (boardId, taskIds, taskId, columnId) =>
        set((s) => {
          const b = s.boards[boardId];
          if (!b) return;
          // Keep only ids that still exist (defensive against deletes mid-move).
          b.taskIds = taskIds.filter((id) => s.tasks[id]) as TaskId[];
          if (taskId && columnId !== undefined) {
            const tk = s.tasks[taskId];
            if (tk) tk.columnId = columnId;
          }
          b.updatedAt = now();
        }),

      restoreBoardOrder: (order) =>
        set((s) => {
          s.boardOrder = order.filter((id) => s.boards[id]);
        }),
    })),
    {
      name: STORAGE_KEYS.app,
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({
        boards: s.boards,
        boardOrder: s.boardOrder,
        tasks: s.tasks,
      }),
    },
  ),
);
