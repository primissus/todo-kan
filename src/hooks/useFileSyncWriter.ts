// Auto-save driver for the linked file (see src/lib/fileSync.ts). Mounted once
// in App. When a file is linked, every change to the domain data debounce-writes
// the whole dataset back to the file. No-ops while nothing is linked.

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { isLinked, saveNow } from '@/lib/fileSync';

const DEBOUNCE_MS = 800;

export function useFileSyncWriter(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (!isLinked()) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void saveNow();
      }, DEBOUNCE_MS);
    };

    // immer gives the changed slice a fresh reference, so identity checks tell
    // a real data mutation from an unrelated set().
    const unsub = useAppStore.subscribe((s, prev) => {
      if (
        s.boards !== prev.boards ||
        s.tasks !== prev.tasks ||
        s.boardOrder !== prev.boardOrder
      ) {
        schedule();
      }
    });

    // Flush a pending debounced write immediately when the tab is hidden, so the
    // file is current the moment the user switches away (or closes). saveNow()
    // is serialized, so this can't race the timer's own write.
    const onHidden = () => {
      if (document.visibilityState !== 'hidden' || !isLinked()) return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      void saveNow();
    };
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onHidden);
      unsub();
    };
  }, []);
}
