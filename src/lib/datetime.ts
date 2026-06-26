// Pure date/time helpers for the dependency-free date-time picker (no date-fns /
// react-day-picker — those would add a heavy dep and complicate the single-file
// build). Everything here is timezone-naive in the LOCAL zone: timestamps are
// unix ms, calendar math goes through the `new Date(y, m, d, …)` local
// constructor, so a "day" always means the user's local day.

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

/** Midnight (local) of the day containing `ts`. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Same calendar day (local) for two timestamps? */
export function isSameDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

/**
 * The 42 days (6 weeks, Sunday-first) covering the month grid for `year`/`month`
 * (0-based month). Includes the trailing days of the previous month and leading
 * days of the next so every row is full.
 */
export function monthMatrix(year: number, month: number): Date[] {
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(year, month, 1 - firstWeekday + i));
  }
  return cells;
}

/** `{ h, m }` (local) for a timestamp. */
export function timeParts(ts: number): { h: number; m: number } {
  const d = new Date(ts);
  return { h: d.getHours(), m: d.getMinutes() };
}

/** Combine a calendar day with an h:m time into a local unix-ms timestamp. */
export function combineDateTime(day: Date, h: number, m: number): number {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0).getTime();
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `ts` → "HH:mm" for an `<input type="time">`. */
export function toTimeInputValue(ts: number): string {
  const { h, m } = timeParts(ts);
  return `${pad2(h)}:${pad2(m)}`;
}

/** Parse "HH:mm" → `{ h, m }`; returns null when malformed. */
export function parseTimeInput(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

/** Display a full due/reminder stamp, e.g. "Jun 28, 9:00 AM" (locale-aware). */
export function formatDateTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** Time-only stamp, e.g. "9:00 AM" (locale-aware). */
export function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** Date-only stamp, e.g. "Sat, Jun 28" (locale-aware). */
export function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/** Long month + year header, e.g. "June 2026" (locale-aware). */
export function formatMonthYear(year: number, month: number): string {
  try {
    return new Date(year, month, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return `${year}-${pad2(month + 1)}`;
  }
}

/** True once a due/reminder time is in the past relative to `now`. */
export function isPast(ts: number, now: number): boolean {
  return ts < now;
}
