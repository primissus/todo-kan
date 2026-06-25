// Centralized localStorage keys.
// NOTE: theme keys live in src/lib/theme.ts (MODE_KEY / FAMILY_KEY) — they are
// deliberately kept OUT of the Zustand-persisted blob so the inline FOUC script
// can read them synchronously before any bundle runs.

export const STORAGE_KEYS = {
  /** Zustand persist root (boards / boardOrder / tasks). */
  app: 'todo-kan:v1',
} as const;

export const EXPORT_APP_ID = 'todo-kan';
export const EXPORT_SCHEMA_VERSION = 1;
