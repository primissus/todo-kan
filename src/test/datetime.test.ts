import { describe, expect, it } from 'vitest';
import {
  combineDateTime,
  isSameDay,
  monthMatrix,
  parseTimeInput,
  startOfDay,
  timeParts,
  toTimeInputValue,
} from '@/lib/datetime';

describe('monthMatrix', () => {
  it('returns 6 full weeks (42 cells) starting on a Sunday', () => {
    const cells = monthMatrix(2026, 5); // June 2026
    expect(cells).toHaveLength(42);
    expect(cells[0].getDay()).toBe(0); // Sunday-first
  });

  it("places the 1st at its weekday offset and stays monotonic", () => {
    const cells = monthMatrix(2026, 5);
    const firstOfMonth = cells.find(
      (d) => d.getDate() === 1 && d.getMonth() === 5,
    )!;
    expect(firstOfMonth).toBeDefined();
    expect(cells.indexOf(firstOfMonth)).toBe(new Date(2026, 5, 1).getDay());
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i].getTime()).toBeGreaterThan(cells[i - 1].getTime());
    }
  });
});

describe('combineDateTime / timeParts', () => {
  it('combines a day with an h:m time and reads it back', () => {
    const ts = combineDateTime(new Date(2026, 5, 15), 14, 30);
    const d = new Date(ts);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(15);
    expect(timeParts(ts)).toEqual({ h: 14, m: 30 });
  });
});

describe('time input round-trip', () => {
  it('formats and parses HH:mm', () => {
    const ts = combineDateTime(new Date(2026, 0, 1), 9, 5);
    expect(toTimeInputValue(ts)).toBe('09:05');
    expect(parseTimeInput('09:05')).toEqual({ h: 9, m: 5 });
    expect(parseTimeInput('9:05')).toEqual({ h: 9, m: 5 });
  });

  it('rejects malformed or out-of-range times', () => {
    expect(parseTimeInput('nope')).toBeNull();
    expect(parseTimeInput('25:00')).toBeNull();
    expect(parseTimeInput('10:75')).toBeNull();
  });
});

describe('isSameDay / startOfDay', () => {
  it('same day regardless of time, different across days', () => {
    const morning = combineDateTime(new Date(2026, 5, 15), 8, 0);
    const evening = combineDateTime(new Date(2026, 5, 15), 20, 0);
    const next = combineDateTime(new Date(2026, 5, 16), 8, 0);
    expect(isSameDay(morning, evening)).toBe(true);
    expect(isSameDay(morning, next)).toBe(false);
  });

  it('startOfDay strips the time component', () => {
    const ts = combineDateTime(new Date(2026, 5, 15), 14, 30);
    expect(startOfDay(ts)).toBe(combineDateTime(new Date(2026, 5, 15), 0, 0));
  });
});
