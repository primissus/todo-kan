// Theme logic, ported from vegapunk/docs-web-app/src/theme.ts and adapted to drive
// shadcn's semantic CSS variables (see src/styles/theme.css).
//
// Theme-mode + theme-family live in their OWN localStorage keys (NOT inside the
// Zustand-persisted blob) so the inline FOUC script in index.html can read them
// synchronously before any bundle loads. Keep the keys + default family in sync
// with that inline script.

export type Mode = 'light' | 'dark' | 'system';

/** [familyKey, displayLabel] — order drives the Theme dropdown. */
export const THEME_FAMILIES: [string, string][] = [
  ['default', 'Default'],
  ['gruvbox', 'Gruvbox'],
  ['nord', 'Nord'],
];

/** [modeKey, displayLabel] — order drives the Appearance control. */
export const MODES: [Mode, string][] = [
  ['light', 'Light'],
  ['dark', 'Dark'],
  ['system', 'System'],
];

const DEFAULT_FAMILY = 'default';
const DEFAULT_MODE: Mode = 'system';

export const MODE_KEY = 'theme-mode';
export const FAMILY_KEY = 'theme-family';

const FAMILY_KEYS = new Set(THEME_FAMILIES.map(([k]) => k));

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* private mode / file:// quota — ignore */
  }
}

export function getStoredMode(): Mode {
  const v = safeGet(MODE_KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : DEFAULT_MODE;
}

export function saveMode(mode: Mode): void {
  safeSet(MODE_KEY, mode);
}

export function getStoredFamily(): string {
  const v = safeGet(FAMILY_KEY);
  return v && FAMILY_KEYS.has(v) ? v : DEFAULT_FAMILY;
}

export function saveFamily(family: string): void {
  safeSet(FAMILY_KEY, family);
}

export function familyFromConcrete(concrete: string): string {
  return concrete.replace(/-(light|dark)$/, '');
}

function concreteKey(family: string, dark: boolean): string {
  return `${family}-${dark ? 'dark' : 'light'}`;
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/** The active "<family>-<light|dark>" key, resolving `system` against the OS. */
export function resolveActiveConcrete(): string {
  const mode = getStoredMode();
  const family = getStoredFamily();
  if (mode === 'light') return concreteKey(family, false);
  if (mode === 'dark') return concreteKey(family, true);
  return concreteKey(family, systemPrefersDark());
}

/** Stamp data-theme + data-mode on <html>; CSS in theme.css does the rest. */
export function applyTheme(concrete: string): void {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.dataset.theme = concrete;
  el.dataset.mode = concrete.endsWith('-dark') ? 'dark' : 'light';
}

export function applyActiveTheme(): void {
  applyTheme(resolveActiveConcrete());
}

export function getActiveFamily(): string {
  return getStoredFamily();
}
