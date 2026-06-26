import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { buildExport, rekey } from '@/lib/transfer';
import type { Task } from '@/lib/types/domain';

const s = () => useAppStore.getState();
const task = (id: string) => s().tasks[id];

beforeEach(() => {
  useAppStore.setState({ boards: {}, boardOrder: [], tasks: {} });
  localStorage.clear();
});

describe('task notes', () => {
  it('new tasks start with an empty notes thread', () => {
    const id = s().createBoard('todo');
    const t = s().addTask(id, { title: 'x' });
    expect(task(t).notes).toEqual([]);
  });

  it('adds notes in order, stamping created/updated', () => {
    const id = s().createBoard('todo');
    const t = s().addTask(id, { title: 'x' });
    s().addNote(t, 'first');
    s().addNote(t, 'second');
    const notes = task(t).notes;
    expect(notes.map((n) => n.text)).toEqual(['first', 'second']);
    expect(notes[0].createdAt).toBe(notes[0].updatedAt);
    expect(notes[0].id).not.toBe(notes[1].id);
  });

  it('edits a note (text + updatedAt) without touching others', () => {
    const id = s().createBoard('todo');
    const t = s().addTask(id, { title: 'x' });
    s().addNote(t, 'a');
    s().addNote(t, 'b');
    const [n0, n1] = task(t).notes;
    s().editNote(t, n0.id, 'a-edited');
    const after = task(t).notes;
    expect(after[0].text).toBe('a-edited');
    expect(after[0].updatedAt).toBeGreaterThanOrEqual(after[0].createdAt);
    expect(after[1].text).toBe('b');
    expect(after[1].id).toBe(n1.id);
  });

  it('deletes a single note', () => {
    const id = s().createBoard('todo');
    const t = s().addTask(id, { title: 'x' });
    s().addNote(t, 'a');
    s().addNote(t, 'b');
    const keep = task(t).notes[1].id;
    s().deleteNote(t, task(t).notes[0].id);
    expect(task(t).notes.map((n) => n.id)).toEqual([keep]);
  });

  it('addNote is resilient to legacy tasks with no notes field', () => {
    const id = s().createBoard('todo');
    const t = s().addTask(id, { title: 'x' });
    // Simulate a task persisted before notes existed.
    const legacy: Partial<Task> = { ...task(t) };
    delete legacy.notes;
    useAppStore.setState({
      tasks: { ...s().tasks, [t]: legacy as unknown as Task },
    });
    expect(task(t).notes).toBeUndefined();
    s().addNote(t, 'recovered');
    expect(task(t).notes.map((n) => n.text)).toEqual(['recovered']);
  });

  it('survives export → import with fresh note ids and preserved text', () => {
    const id = s().createBoard('kanban');
    const c0 = s().boards[id].columns[0].id;
    const t = s().addTask(id, { title: 'a', columnId: c0 });
    s().addNote(t, 'keep me');
    const originalNoteId = task(t).notes[0].id;

    const payload = buildExport([id], s().boards, s().tasks);
    const r = rekey(payload);

    expect(r.tasks[0].notes).toHaveLength(1);
    expect(r.tasks[0].notes[0].text).toBe('keep me');
    expect(r.tasks[0].notes[0].id).not.toBe(originalNoteId);
  });

  it('rekey tolerates tasks exported before notes existed', () => {
    const id = s().createBoard('todo');
    s().addTask(id, { title: 'a' });
    // Round-trip through JSON (as a real import does) so we get mutable plain
    // objects, then strip notes to mimic an older export file.
    const payload = JSON.parse(
      JSON.stringify(buildExport([id], s().boards, s().tasks)),
    );
    delete payload.tasks[0].notes;
    expect(rekey(payload).tasks[0].notes).toEqual([]);
  });
});
