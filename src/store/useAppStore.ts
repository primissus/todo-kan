import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { storage } from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { newBoardId, newColumnId, newNoteId, newTaskId } from '@/lib/id';
import { buildExport, rekey, type TransferPayload } from '@/lib/transfer';
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
  dueAt?: number;
  remindAt?: number;
}

export interface TaskPatch {
  title?: string;
  description?: string;
  tags?: string[];
  columnId?: ColumnId | null;
  completed?: boolean;
  /** `number` sets it, `null` clears it, `undefined` leaves it unchanged. */
  dueAt?: number | null;
  remindAt?: number | null;
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
  // bulk task ops (selection mode)
  archiveTasks: (taskIds: string[]) => void;
  deleteTasks: (taskIds: string[]) => void;
  /** Re-parent tasks onto another board. Kanban target → chosen/first column;
   *  TODO target → columnId cleared. Tasks already on the target are skipped. */
  moveTasksToBoard: (
    taskIds: string[],
    targetBoardId: string,
    columnId?: ColumnId | null,
  ) => void;
  // notes (a per-task thread)
  addNote: (taskId: string, text: string) => void;
  editNote: (taskId: string, noteId: string, text: string) => void;
  deleteNote: (taskId: string, noteId: string) => void;
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
  // board-level transforms
  /** Deep-copy a board + all its tasks (fresh ids), inserted after the source. */
  cloneBoard: (boardId: string, title?: string) => BoardId;
  /** Move every task of `sourceId` into `targetId`, then delete the source. */
  mergeBoardInto: (sourceId: string, targetId: string) => void;
  /** Flip a board between 'todo' and 'kanban', remapping each task. */
  convertBoard: (boardId: string) => void;
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

// "Done" is represented two different ways: the TODO `completed` flag, and the
// Kanban `isDone` column. Re-homing a task across board types must translate
// between the two so a finished task never silently becomes active (and vice
// versa). These helpers keep `moveTasksToBoard` / `mergeBoardInto` consistent
// with `convertBoard`.

/** Is this task "done" in its CURRENT board's representation? */
function taskWasDone(src: Board | undefined, tk: Task): boolean {
  if (!src) return tk.completed;
  if (src.type === 'kanban') {
    return !!src.columns.find((c) => c.id === tk.columnId)?.isDone;
  }
  return tk.completed;
}

/** The column a "done" card belongs in on a Kanban board (isDone, else last). */
function doneColumnId(b: Board): ColumnId | null {
  return (
    (b.columns.find((c) => c.isDone) ?? b.columns[b.columns.length - 1])?.id ??
    null
  );
}

export const useAppStore = create<AppState>()(
  persist(
    immer<AppState>((set, get) => ({
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
            notes: [],
            dueAt: input.dueAt,
            remindAt: input.remindAt,
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
          // `null` clears, a number sets; `undefined` leaves the field as-is.
          if (patch.dueAt !== undefined) tk.dueAt = patch.dueAt ?? undefined;
          if (patch.remindAt !== undefined)
            tk.remindAt = patch.remindAt ?? undefined;
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

      archiveTasks: (taskIds) =>
        set((s) => {
          const t = now();
          for (const id of taskIds) {
            const tk = s.tasks[id];
            if (tk && !tk.archived) {
              tk.archived = true;
              tk.updatedAt = t;
            }
          }
        }),

      deleteTasks: (taskIds) =>
        set((s) => {
          for (const id of taskIds) {
            const tk = s.tasks[id];
            if (!tk) continue;
            const b = s.boards[tk.boardId];
            if (b) b.taskIds = b.taskIds.filter((x) => x !== id);
            delete s.tasks[id];
          }
        }),

      moveTasksToBoard: (taskIds, targetBoardId, columnId) =>
        set((s) => {
          const target = s.boards[targetBoardId];
          if (!target) return;
          const t = now();
          // An explicit, valid column wins (the Move dialog's picker). Otherwise a
          // "done" card lands in the Done column, the rest in the first column.
          const explicitCol: ColumnId | null =
            target.type === 'kanban' &&
            columnId &&
            target.columns.some((c) => c.id === columnId)
              ? columnId
              : null;
          const firstCol = target.columns[0]?.id ?? null;
          const doneCol = doneColumnId(target);
          const touchedSources = new Set<string>();
          for (const id of taskIds) {
            const tk = s.tasks[id];
            if (!tk || tk.boardId === targetBoardId) continue;
            const src = s.boards[tk.boardId];
            const wasDone = taskWasDone(src, tk);
            if (src) {
              src.taskIds = src.taskIds.filter((x) => x !== id);
              touchedSources.add(src.id);
            }
            tk.boardId = targetBoardId as BoardId;
            if (target.type === 'kanban') {
              tk.columnId = explicitCol ?? (wasDone ? doneCol : firstCol);
              tk.completed = false; // kanban tracks done via the column
            } else {
              tk.columnId = null;
              tk.completed = wasDone; // carry the done state onto the TODO list
            }
            tk.updatedAt = t;
            if (!target.taskIds.includes(id as TaskId)) {
              target.taskIds.push(id as TaskId);
            }
          }
          for (const sid of touchedSources) {
            const src = s.boards[sid];
            if (src) src.updatedAt = t;
          }
          target.updatedAt = t;
        }),

      addNote: (taskId, text) =>
        set((s) => {
          const tk = s.tasks[taskId];
          if (!tk) return;
          // Defensive: tasks persisted before notes existed (pre-migration).
          if (!tk.notes) tk.notes = [];
          const t = now();
          tk.notes.push({ id: newNoteId(), text, createdAt: t, updatedAt: t });
          tk.updatedAt = t;
        }),

      editNote: (taskId, noteId, text) =>
        set((s) => {
          const tk = s.tasks[taskId];
          const note = tk?.notes?.find((n) => n.id === noteId);
          if (!tk || !note) return;
          note.text = text;
          note.updatedAt = now();
          tk.updatedAt = note.updatedAt;
        }),

      deleteNote: (taskId, noteId) =>
        set((s) => {
          const tk = s.tasks[taskId];
          if (!tk?.notes) return;
          tk.notes = tk.notes.filter((n) => n.id !== noteId);
          tk.updatedAt = now();
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

      cloneBoard: (boardId, title) => {
        const state = get();
        const src = state.boards[boardId];
        if (!src) return boardId as BoardId;
        // Reuse the export→rekey path so the copy gets fresh, collision-proof ids
        // for the board, its columns AND every task (incl. archived).
        const { boards, tasks } = rekey(
          buildExport([boardId], state.boards, state.tasks),
        );
        const clone = boards[0];
        if (!clone) return boardId as BoardId;
        const t = now();
        clone.title =
          title?.trim() || `Copy of ${src.title || 'Untitled'}`;
        clone.archived = false;
        clone.createdAt = t;
        clone.updatedAt = t;
        set((s) => {
          for (const tk of tasks) s.tasks[tk.id] = tk;
          s.boards[clone.id] = clone;
          const idx = s.boardOrder.indexOf(boardId);
          if (idx >= 0) s.boardOrder.splice(idx + 1, 0, clone.id);
          else s.boardOrder.unshift(clone.id);
        });
        return clone.id;
      },

      mergeBoardInto: (sourceId, targetId) =>
        set((s) => {
          const src = s.boards[sourceId];
          const target = s.boards[targetId];
          if (!src || !target || sourceId === targetId) return;
          const t = now();
          const firstCol = target.columns[0]?.id ?? null;
          const doneCol = doneColumnId(target);
          for (const id of src.taskIds) {
            const tk = s.tasks[id];
            if (!tk) continue;
            const wasDone = taskWasDone(src, tk);
            if (target.type === 'kanban') {
              // Preserve a kanban→kanban move by matching column titles; else
              // place by done-status (Done column vs first).
              let col: ColumnId | null = wasDone ? doneCol : firstCol;
              if (src.type === 'kanban' && tk.columnId) {
                const srcCol = src.columns.find((c) => c.id === tk.columnId);
                const match =
                  srcCol &&
                  target.columns.find((c) => c.title === srcCol.title);
                col = match?.id ?? col;
              }
              tk.columnId = col;
              tk.completed = false;
            } else {
              tk.columnId = null;
              tk.completed = wasDone;
            }
            tk.boardId = targetId as BoardId;
            tk.updatedAt = t;
            target.taskIds.push(id as TaskId);
          }
          target.updatedAt = t;
          delete s.boards[sourceId];
          s.boardOrder = s.boardOrder.filter((x) => x !== sourceId);
        }),

      convertBoard: (boardId) =>
        set((s) => {
          const b = s.boards[boardId];
          if (!b) return;
          const t = now();
          if (b.type === 'todo') {
            // → kanban: give it default columns; completed cards land in Done,
            // the rest in the first column. Clear `completed` since kanban tracks
            // done via the column (avoids a stale flag if it converts back).
            b.type = 'kanban';
            b.columns = makeColumns();
            const first = b.columns[0]?.id ?? null;
            const done =
              (b.columns.find((c) => c.isDone) ?? b.columns[b.columns.length - 1])
                ?.id ?? first;
            for (const id of b.taskIds) {
              const tk = s.tasks[id];
              if (!tk) continue;
              tk.columnId = tk.completed ? done : first;
              tk.completed = false;
              tk.updatedAt = t;
            }
          } else {
            // → todo: derive `completed` from Done-column membership (so a stale
            // flag on a non-Done card is cleared too); clear columns.
            const doneIds = new Set(
              b.columns.filter((c) => c.isDone).map((c) => c.id),
            );
            for (const id of b.taskIds) {
              const tk = s.tasks[id];
              if (!tk) continue;
              tk.completed = !!(tk.columnId && doneIds.has(tk.columnId));
              tk.columnId = null;
              tk.updatedAt = t;
            }
            b.type = 'todo';
            b.columns = [];
          }
          b.updatedAt = t;
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
      version: 3,
      storage: createJSONStorage(() => storage),
      // Migrations are cumulative (each runs for any persisted version below it):
      //   v1 → v2: tasks gained a `notes` thread → backfill `[]`.
      //   v2 → v3: tasks gained optional `dueAt`/`remindAt` — no backfill needed
      //            (absent === "none"); the version bump just records the change.
      // Backfilling `notes` keeps every loaded task normalized so read/render code
      // can treat `notes` as always-present regardless of the file's age.
      migrate: (persisted) => {
        const s = persisted as Partial<DataState> | undefined;
        if (s?.tasks) {
          for (const t of Object.values(s.tasks)) {
            if (!Array.isArray((t as Task).notes)) (t as Task).notes = [];
          }
        }
        return s as DataState;
      },
      partialize: (s) => ({
        boards: s.boards,
        boardOrder: s.boardOrder,
        tasks: s.tasks,
      }),
    },
  ),
);
