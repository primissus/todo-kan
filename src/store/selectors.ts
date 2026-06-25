import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from './useAppStore';
import type { Board, Task } from '@/lib/types/domain';

/** All boards in display order (active + archived; caller filters). */
export function useOrderedBoards(): Board[] {
  return useAppStore(
    useShallow((s) =>
      s.boardOrder
        .map((id) => s.boards[id])
        .filter((b): b is Board => !!b),
    ),
  );
}

export function useBoard(boardId: string): Board | undefined {
  return useAppStore((s) => s.boards[boardId]);
}

/** A board's tasks in order (includes archived/completed; caller filters). */
export function useBoardTasks(boardId: string): Task[] {
  return useAppStore(
    useShallow((s) => {
      const b = s.boards[boardId];
      if (!b) return [] as Task[];
      return b.taskIds
        .map((id) => s.tasks[id])
        .filter((t): t is Task => !!t);
    }),
  );
}

/** Collect every distinct tag across all boards + tasks (for autocomplete). */
export function useAllTags(): string[] {
  return useAppStore(
    useShallow((s) => {
      const set = new Set<string>();
      for (const b of Object.values(s.boards)) b.tags.forEach((t) => set.add(t));
      for (const t of Object.values(s.tasks)) t.tags.forEach((x) => set.add(x));
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    }),
  );
}
