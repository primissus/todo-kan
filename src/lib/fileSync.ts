// Link a single on-disk file and auto-save the WHOLE dataset to it via the
// File System Access API — so the user never has to re-download an export.
//
// The file handle lives in memory ONLY. Persisting a handle across reloads would
// require IndexedDB (handles aren't JSON-serializable), which this project
// deliberately avoids (the single-file file:// build can't use IndexedDB). So
// the link is session-scoped: after a reload the user re-links once.
//
// Where the API is unavailable (Firefox/Safari today, and the file:// single-file
// build) `isFileSyncSupported()` is false and the UI falls back to plain Export.

import { useSyncExternalStore } from 'react';
import {
  buildExport,
  parseImport,
  serializeExport,
  type TransferPayload,
} from '@/lib/transfer';
import { useAppStore } from '@/store/useAppStore';

export interface FileSyncState {
  /** Linked file's name, or null when no file is linked. */
  fileName: string | null;
  /** Outcome of the most recent write attempt. */
  status: 'idle' | 'saving' | 'saved' | 'error';
  /** Unix ms of the last successful save (null until the first one). */
  lastSavedAt: number | null;
  /** Human-readable message from the last failed write, if any. */
  error: string | null;
}

// ---- module-level state + a tiny pub/sub (handle is intentionally non-React) --

let handle: FileSystemFileHandle | null = null;
let state: FileSyncState = {
  fileName: null,
  status: 'idle',
  lastSavedAt: null,
  error: null,
};

const listeners = new Set<() => void>();

function setState(patch: Partial<FileSyncState>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function isLinked(): boolean {
  return handle !== null;
}

// Hoisted so their identity is stable across renders — useSyncExternalStore
// re-subscribes whenever `subscribe` changes, and `state` is replaced
// immutably so getSnapshot stays tear-free.
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): FileSyncState {
  return state;
}

/** Subscribe to link/status changes. */
export function useFileSync(): FileSyncState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ---- capability detection ----------------------------------------------------

export function isFileSyncSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.showOpenFilePicker === 'function' &&
    typeof window.showSaveFilePicker === 'function'
  );
}

const JSON_TYPES: FilePickerAcceptType[] = [
  { description: 'todo·kan backup', accept: { 'application/json': ['.json'] } },
];

const DEFAULT_NAME = 'todo-kan-backup.json';

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

// ---- pickers (return null when the user cancels) -----------------------------

/** Pick an EXISTING file to link (read + write back). */
export async function pickFileToLink(): Promise<FileSystemFileHandle | null> {
  if (!isFileSyncSupported()) return null;
  try {
    const [h] = await window.showOpenFilePicker!({
      multiple: false,
      types: JSON_TYPES,
    });
    return h ?? null;
  } catch (e) {
    if (isAbort(e)) return null;
    throw e;
  }
}

/** Create (or choose) a NEW file to link. */
export async function pickNewFile(): Promise<FileSystemFileHandle | null> {
  if (!isFileSyncSupported()) return null;
  try {
    return await window.showSaveFilePicker!({
      suggestedName: DEFAULT_NAME,
      types: JSON_TYPES,
    });
  } catch (e) {
    if (isAbort(e)) return null;
    throw e;
  }
}

// ---- read / link helpers -----------------------------------------------------

/** Read a handle's current text contents (may be ''). */
export async function readHandle(h: FileSystemFileHandle): Promise<string> {
  const file = await h.getFile();
  return file.text();
}

/** The full-dataset export payload built from the live store (all boards). */
export function currentPayload(): TransferPayload {
  const { boards, boardOrder, tasks } = useAppStore.getState();
  return buildExport(boardOrder, boards, tasks);
}

/**
 * Read + parse a handle into a payload. Returns null for an empty file (a fresh
 * target). Throws a user-facing Error for non-empty, non-todo·kan content
 * (delegated to parseImport).
 */
export async function readLinkedPayload(
  h: FileSystemFileHandle,
): Promise<TransferPayload | null> {
  const text = await readHandle(h);
  if (text.trim() === '') return null;
  return parseImport(text);
}

/** Adopt a handle as the linked file (does not write). */
export function setLinked(h: FileSystemFileHandle): void {
  handle = h;
  setState({ fileName: h.name, status: 'idle', error: null });
}

/** Stop syncing; the on-disk file is left untouched. */
export function unlink(): void {
  handle = null;
  setState({ fileName: null, status: 'idle', error: null, lastSavedAt: null });
}

// ---- writing -----------------------------------------------------------------

async function ensureWritable(h: FileSystemFileHandle): Promise<boolean> {
  // Engines without the permission API (or that grant on pick) just write.
  if (typeof h.queryPermission !== 'function') return true;
  const opts = { mode: 'readwrite' as const };
  if ((await h.queryPermission(opts)) === 'granted') return true;
  if (typeof h.requestPermission !== 'function') return true;
  return (await h.requestPermission(opts)) === 'granted';
}

async function doWrite(): Promise<boolean> {
  const h = handle;
  if (!h) return false;
  setState({ status: 'saving', error: null });
  try {
    if (!(await ensureWritable(h))) {
      setState({
        status: 'error',
        error: 'Permission to write the file was denied — re-link it.',
      });
      return false;
    }
    const writable = await h.createWritable();
    try {
      await writable.write(serializeExport(currentPayload()));
    } finally {
      await writable.close();
    }
    setState({ status: 'saved', lastSavedAt: Date.now(), error: null });
    return true;
  } catch (e) {
    setState({
      status: 'error',
      error: e instanceof Error ? e.message : 'Could not write the file.',
    });
    return false;
  }
}

// Serialize writes through a chain so a manual "Save now" and a debounced
// auto-save never open two writables on the same handle at once. doWrite never
// throws, so the chain never poisons.
let writeChain: Promise<boolean> = Promise.resolve(true);

/** Write the current dataset to the linked file. Resolves false when unlinked. */
export function saveNow(): Promise<boolean> {
  if (!handle) return Promise.resolve(false);
  writeChain = writeChain.then(doWrite, doWrite);
  return writeChain;
}
