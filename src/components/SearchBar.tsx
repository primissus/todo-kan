import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Search input. A leading `#` switches to tag-only matching (see lib/search). */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search title, description, #tags…',
  className,
}: SearchBarProps) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8"
        aria-label="Search"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
