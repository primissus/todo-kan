import type { BoardId, ColumnId, NoteId, TaskId } from './types/domain';

function uuidv4Fallback(): string {
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h
      .slice(6, 8)
      .join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
  }
  // Last resort (non-secure context, ancient engine).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** RFC4122 v4 id. Chrome treats file:// as a secure context, so the single-file
 *  build keeps native randomUUID; the fallback covers the rare cases it doesn't. */
export function newId(): string {
  const c = globalThis.crypto;
  return typeof c?.randomUUID === 'function' ? c.randomUUID() : uuidv4Fallback();
}

export const newBoardId = (): BoardId => newId() as BoardId;
export const newTaskId = (): TaskId => newId() as TaskId;
export const newColumnId = (): ColumnId => newId() as ColumnId;
export const newNoteId = (): NoteId => newId() as NoteId;
