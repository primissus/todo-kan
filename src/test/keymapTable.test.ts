import { describe, expect, it } from 'vitest';
import { visibleBindings } from '@/lib/keymap';

describe('visibleBindings (Help dialog content by mode)', () => {
  it('hides Vim-only rows and the j/k/h/l aliases when Vim keys are off', () => {
    const rows = visibleBindings(false);
    const labels = rows.map((r) => r.label);

    // Vim-only actions are dropped entirely.
    expect(labels.some((l) => l.startsWith('Archive'))).toBe(false);
    expect(labels.some((l) => l.startsWith('Delete'))).toBe(false);
    expect(rows.some((r) => r.category === 'Move mode')).toBe(false);

    // Navigation stays, but shows only the arrow token.
    const down = rows.find((r) => r.label.startsWith('Move cursor down'));
    expect(down?.keys).toEqual(['↓']);

    // Always-available keys remain (Enter, ⌘K, the :q toggle).
    expect(labels.some((l) => l.startsWith('Open the selected item'))).toBe(true);
    expect(rows.some((r) => r.keys.join('') === ':q↵')).toBe(true);
  });

  it('shows Vim-only rows and folds in j/k/h/l when Vim keys are on', () => {
    const rows = visibleBindings(true);
    const labels = rows.map((r) => r.label);

    expect(labels.some((l) => l.startsWith('Archive'))).toBe(true);
    expect(labels.some((l) => l.startsWith('Delete the selected task'))).toBe(true);
    expect(rows.some((r) => r.category === 'Move mode')).toBe(true);

    const down = rows.find((r) => r.label.startsWith('Move cursor down'));
    expect(down?.keys).toEqual(['j', '↓']);
  });
});
