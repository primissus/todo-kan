// Polls the store for tasks whose reminder time has arrived and fires a system
// notification once each. Mounted once in `App`. Fires only while the tab is open
// (see lib/notifications.ts for why there's no Service Worker). Deduplicates with
// an in-memory set keyed by task id + reminder time, so a reminder fires once per
// session; on reload a still-recent missed reminder fires once more (handy when
// the app was closed), but anything older than a day is skipped to avoid a flood.

import { useEffect, useRef } from 'react';
import { canFireNotifications, fireNotification } from '@/lib/notifications';
import { formatDateTime } from '@/lib/datetime';
import { goBoard } from '@/lib/router';
import { useAppStore } from '@/store/useAppStore';
import { useUiStore } from '@/store/useUiStore';

const TICK_MS = 30_000;
const STALE_MS = 24 * 60 * 60 * 1000;

export function useReminderScheduler(): void {
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    const check = () => {
      if (!canFireNotifications()) return;
      const now = Date.now();
      const { tasks } = useAppStore.getState();
      for (const t of Object.values(tasks)) {
        if (t.archived || t.completed || t.remindAt == null) continue;
        const key = `${t.id}:${t.remindAt}`;
        if (fired.current.has(key)) continue;
        if (t.remindAt <= now && now - t.remindAt <= STALE_MS) {
          fired.current.add(key);
          fireNotification(t.title || 'Task reminder', {
            body: t.dueAt
              ? `Due ${formatDateTime(t.dueAt)}`
              : t.description || undefined,
            tag: t.id,
            onClick: () => {
              goBoard(t.boardId);
              useUiStore.getState().setPendingSelect(t.id);
            },
          });
        }
      }
    };

    check();
    const interval = setInterval(check, TICK_MS);
    return () => clearInterval(interval);
  }, []);
}
