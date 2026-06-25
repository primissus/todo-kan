import { useMemo, useRef, useState } from 'react';
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from '@floating-ui/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  id?: string;
  className?: string;
}

/**
 * Chips input with a Floating-UI autocomplete popover over existing tags.
 * Enter / comma adds; Backspace on empty removes the last chip; arrow keys
 * navigate suggestions (virtual listbox, input keeps focus).
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Add tag…',
  id,
  className,
}: TagInputProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  const hasTag = (t: string) =>
    value.some((v) => v.toLowerCase() === t.toLowerCase());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suggestions
      .filter((s) => !hasTag(s))
      .filter((s) => (q ? s.toLowerCase().includes(q) : true))
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, suggestions, value]);

  const { refs, floatingStyles, context } = useFloating<HTMLInputElement>({
    open: open && filtered.length > 0,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements, availableHeight }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
            maxHeight: `${Math.min(240, availableHeight)}px`,
          });
        },
        padding: 8,
      }),
    ],
  });

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'listbox' });
  const listNav = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    virtual: true,
    loop: true,
  });
  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [dismiss, role, listNav],
  );

  const addTag = (raw: string) => {
    const t = raw.trim();
    if (!t || hasTag(t)) {
      setQuery('');
      return;
    }
    onChange([...value, t]);
    setQuery('');
    setActiveIndex(null);
  };

  const removeTag = (t: string) => onChange(value.filter((v) => v !== t));

  return (
    <div className={className}>
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
        onClick={() => refs.domReference.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              className="rounded-sm opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={refs.setReference}
          value={query}
          placeholder={value.length === 0 ? placeholder : ''}
          autoComplete="off"
          className="min-w-[6rem] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          {...getReferenceProps({
            onChange: (e) => {
              setQuery((e.target as HTMLInputElement).value);
              setOpen(true);
            },
            onFocus: () => setOpen(true),
            onKeyDown(e) {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (
                  activeIndex !== null &&
                  filtered[activeIndex] &&
                  open
                ) {
                  addTag(filtered[activeIndex]);
                } else if (query.trim()) {
                  addTag(query);
                }
              } else if (e.key === ',') {
                e.preventDefault();
                if (query.trim()) addTag(query);
              } else if (
                e.key === 'Backspace' &&
                query === '' &&
                value.length > 0
              ) {
                removeTag(value[value.length - 1]);
              }
            },
          })}
        />
      </div>

      {open && filtered.length > 0 && (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            initialFocus={-1}
            visuallyHiddenDismiss
          >
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-50 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            >
              {filtered.map((item, index) => (
                <div
                  key={item}
                  ref={(node) => {
                    listRef.current[index] = node;
                  }}
                  role="option"
                  aria-selected={activeIndex === index}
                  {...getItemProps({
                    onClick() {
                      addTag(item);
                      refs.domReference.current?.focus();
                    },
                  })}
                  className={cn(
                    'cursor-pointer rounded-sm px-2 py-1.5 text-sm',
                    activeIndex === index
                      ? 'bg-accent text-accent-foreground'
                      : '',
                  )}
                >
                  {item}
                </div>
              ))}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}
