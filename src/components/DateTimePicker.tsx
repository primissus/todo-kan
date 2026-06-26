import { useEffect, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  WEEKDAY_LABELS,
  combineDateTime,
  formatDate,
  formatDateTime,
  formatMonthYear,
  formatTime,
  isSameDay,
  monthMatrix,
  parseTimeInput,
  timeParts,
  toTimeInputValue,
} from '@/lib/datetime';

export interface DateTimePickerProps {
  /** Selected timestamp (unix ms) or null when unset. */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Accessible label / context, e.g. 'Due date'. */
  label?: string;
  placeholder?: string;
  id?: string;
  /**
   * Lead with the time and hide the calendar until the user opens it (used for
   * reminders, which are usually "at 9:00", the day being secondary). Default is
   * the date-first layout (calendar on top, time below).
   */
  timeFirst?: boolean;
}

const DEFAULT_TIME = { h: 9, m: 0 };

/**
 * A dependency-free, shadcn-styled date + time picker: a Popover holding a month
 * calendar grid and a native time input. No react-day-picker / date-fns so it
 * inlines cleanly into the single-file (file://) build. Stores/returns a unix-ms
 * timestamp (local-zone), or null when cleared.
 */
export function DateTimePicker({
  value,
  onChange,
  label = 'Date',
  placeholder = 'Pick a date',
  id,
  timeFirst = false,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  // time-first only: the calendar starts collapsed and reveals on click.
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewYear, setViewYear] = useState(() =>
    new Date(value ?? Date.now()).getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(() =>
    new Date(value ?? Date.now()).getMonth(),
  );

  // Jump the calendar to the selected month (or this month) each time it opens,
  // and (time-first) re-collapse it so time stays the primary control.
  useEffect(() => {
    if (open) {
      const base = new Date(value ?? Date.now());
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
      setShowCalendar(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const pickDay = (day: Date) => {
    const t = value ? timeParts(value) : DEFAULT_TIME;
    onChange(combineDateTime(day, t.h, t.m));
    // Collapse back to the time-led view once a day is chosen.
    if (timeFirst) setShowCalendar(false);
  };

  const onTimeChange = (raw: string) => {
    const t = parseTimeInput(raw);
    if (!t) return;
    const day = value ? new Date(value) : new Date();
    onChange(combineDateTime(day, t.h, t.m));
  };

  const cells = monthMatrix(viewYear, viewMonth);
  const todayMs = Date.now();

  const timeInput = (
    <Input
      id={`${id ?? 'dt'}-time`}
      type="time"
      value={value ? toTimeInputValue(value) : '09:00'}
      onChange={(e) => onTimeChange(e.target.value)}
      aria-label={`${label} time`}
    />
  );

  const calendarGrid = (
    <div>
      <div className="flex items-center justify-between gap-2 pb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">
          {formatMonthYear(viewYear, viewMonth)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <div
            key={w}
            className="py-1 text-xs font-medium text-muted-foreground"
          >
            {w}
          </div>
        ))}
        {cells.map((cell) => {
          const ms = cell.getTime();
          const inMonth = cell.getMonth() === viewMonth;
          const selected = value != null && isSameDay(ms, value);
          const isToday = isSameDay(ms, todayMs);
          return (
            <button
              key={ms}
              type="button"
              onClick={() => pickDay(cell)}
              aria-label={cell.toDateString()}
              aria-pressed={selected}
              className={cn(
                'size-8 rounded-md text-sm tabular-nums transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                !inMonth && 'text-muted-foreground/50',
                isToday && !selected && 'border border-input',
                selected &&
                  'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {cell.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-1">
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={label}
            className={cn(
              'flex-1 justify-start font-normal',
              !value && 'text-muted-foreground',
            )}
          >
            {timeFirst ? (
              <Clock className="size-4" />
            ) : (
              <CalendarDays className="size-4" />
            )}
            {value
              ? timeFirst
                ? `${formatTime(value)} · ${formatDate(value)}`
                : formatDateTime(value)
              : placeholder}
          </Button>
        </PopoverTrigger>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={() => onChange(null)}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <PopoverContent align="start" className="w-auto p-3">
        {timeFirst ? (
          // Time-first: the time leads; the calendar is hidden until requested.
          <div className="grid w-60 gap-3">
            <div className="grid gap-1.5">
              <label
                htmlFor={`${id ?? 'dt'}-time`}
                className="text-xs font-medium text-muted-foreground"
              >
                {label} time
              </label>
              {timeInput}
            </div>
            <button
              type="button"
              onClick={() => setShowCalendar((s) => !s)}
              aria-expanded={showCalendar}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <CalendarDays className="size-4 text-muted-foreground" />
              <span className="flex-1 text-left">
                {formatDate(value ?? todayMs)}
              </span>
              <ChevronDown
                className={cn(
                  'size-4 text-muted-foreground transition-transform',
                  showCalendar && 'rotate-180',
                )}
              />
            </button>
            {showCalendar ? calendarGrid : null}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          // Date-first: the calendar leads, with the time below it.
          <>
            {calendarGrid}
            <div className="mt-3 flex items-center gap-2 border-t pt-3">
              <label htmlFor={`${id ?? 'dt'}-time`} className="sr-only">
                {label} time
              </label>
              <div className="flex-1">{timeInput}</div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
