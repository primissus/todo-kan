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
  /** A leading `type:task` / `type:list` scopes Home search to one kind. */
  kind?: 'task' | 'list';
}

export function parseQuery(raw: string): ParsedQuery {
  let rest = raw.trim();

  // `type:task` / `type:list` prefix (parsed before `#` so "type:task #x" works).
  let kind: 'task' | 'list' | undefined;
  const typeMatch = /^type:(task|list)\b\s*/i.exec(rest);
  if (typeMatch) {
    kind = typeMatch[1].toLowerCase() as 'task' | 'list';
    rest = rest.slice(typeMatch[0].length);
  }

  if (rest.startsWith('#')) {
    return { term: rest.slice(1).trim(), tagOnly: true, kind };
  }
  return { term: rest, tagOnly: false, kind };
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
