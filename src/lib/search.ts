import Fuse from 'fuse.js';
import type { IFuseOptions } from 'fuse.js';

/** Anything searchable shares these three fields (boards and tasks both do). */
export interface Searchable {
  title: string;
  description: string;
  tags: string[];
}

export interface ParsedQuery {
  term: string;
  /** A leading `#` switches to tag-only matching (req 4). */
  tagOnly: boolean;
}

export function parseQuery(raw: string): ParsedQuery {
  const trimmed = raw.trim();
  if (trimmed.startsWith('#')) {
    return { term: trimmed.slice(1).trim(), tagOnly: true };
  }
  return { term: trimmed, tagOnly: false };
}

const FULL_KEYS: IFuseOptions<Searchable>['keys'] = [
  { name: 'title', weight: 0.6 },
  { name: 'tags', weight: 0.3 },
  { name: 'description', weight: 0.1 },
];

const TAG_KEYS: IFuseOptions<Searchable>['keys'] = [{ name: 'tags', weight: 1 }];

const BASE_OPTS: IFuseOptions<Searchable> = {
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: false,
  shouldSort: true,
};

/**
 * Fuzzy-filter items. Empty term → all items (preserving input order).
 * `#tag` queries match against tags only (fuzzy-on-tags).
 */
export function filterBySearch<T extends Searchable>(
  items: T[],
  raw: string,
): T[] {
  const { term, tagOnly } = parseQuery(raw);
  if (!term) return items;
  const fuse = new Fuse(items, {
    ...BASE_OPTS,
    keys: tagOnly ? TAG_KEYS : FULL_KEYS,
  });
  return fuse.search(term).map((r) => r.item);
}
