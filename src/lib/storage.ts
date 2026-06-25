// Thin, swappable, never-throws key/value storage boundary.
//
// localStorage is used (not IndexedDB) so the single-file build works from
// file:// (Chrome blocks IndexedDB on file:// origins). If a future need arises,
// this is the one place to swap engines. Satisfies Zustand persist's synchronous
// StateStorage shape directly.

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function createStorage(): KeyValueStorage {
  let ok = false;
  try {
    const probe = '__todokan_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    ok = true;
  } catch {
    ok = false;
  }

  if (!ok) {
    // file:// edge / Safari private mode → degrade to in-memory (session-only).
    const mem = new Map<string, string>();
    return {
      getItem: (k) => (mem.has(k) ? (mem.get(k) as string) : null),
      setItem: (k, v) => {
        mem.set(k, v);
      },
      removeItem: (k) => {
        mem.delete(k);
      },
    };
  }

  return {
    getItem: (k) => {
      try {
        return window.localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => {
      try {
        window.localStorage.setItem(k, v);
      } catch {
        /* quota / disabled — ignore */
      }
    },
    removeItem: (k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    },
  };
}

export const storage: KeyValueStorage = createStorage();
