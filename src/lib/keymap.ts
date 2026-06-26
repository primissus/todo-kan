// Declarative shortcut reference. This is the single source of truth for the
// Help dialog (components/HelpDialog.tsx). The actual dispatch lives in
// hooks/useGlobalKeymap.ts and is kept in lockstep with this table by hand —
// when you add a binding, add it here too so Help never drifts.
//
// Vim keys are opt-in (useUiStore.vimEnabled). A binding marked `vimOnly` only
// fires — and is only listed — when Vim keys are on. `vimKeys` are extra display
// tokens (the j/k/h/l aliases) shown alongside `keys` only in Vim mode. The Help
// dialog renders the right subset for the current mode via `visibleBindings()`.

export interface KeyBinding {
  /** Display tokens always shown when this row is visible, e.g. ['↓']. */
  keys: string[];
  /** Extra tokens shown only when Vim keys are on, e.g. ['j']. */
  vimKeys?: string[];
  label: string;
  category: string;
  /** Hide the whole row when Vim keys are off. */
  vimOnly?: boolean;
}

export const KEY_CATEGORIES = [
  'Navigation',
  'Actions',
  'Move mode',
  'Global',
] as const;

export const KEYMAP: KeyBinding[] = [
  // Navigation — arrow keys always work; j/k/h/l are the Vim aliases.
  { keys: ['↓'], vimKeys: ['j'], label: 'Move cursor down (next card / row / list)', category: 'Navigation' },
  { keys: ['↑'], vimKeys: ['k'], label: 'Move cursor up (previous card / row / list)', category: 'Navigation' },
  { keys: ['←'], vimKeys: ['h'], label: 'Move cursor to the column on the left (Kanban) / previous (Home)', category: 'Navigation' },
  { keys: ['→'], vimKeys: ['l'], label: 'Move cursor to the column on the right (Kanban) / next (Home)', category: 'Navigation' },
  { keys: ['Esc'], label: 'Clear the cursor — then back to Home (on a board)', category: 'Navigation' },

  // Actions
  { keys: ['Enter'], label: 'Open the selected item (edit task · open board · add a card on a Kanban column header)', category: 'Actions' },
  { keys: ['Shift', 'N'], label: 'New task — in the cursor’s column on Kanban / new board (Home)', category: 'Actions', vimOnly: true },
  { keys: ['a'], label: 'Archive the selected item', category: 'Actions', vimOnly: true },
  { keys: ['Shift', 'A'], label: 'Toggle archived (drawer on a board · show archived on Home)', category: 'Actions', vimOnly: true },
  { keys: ['Shift', 'C'], label: 'Configure columns (Kanban)', category: 'Actions', vimOnly: true },
  { keys: ['Shift', 'D'], label: 'Delete the selected task — permanent (Kanban · TODO)', category: 'Actions', vimOnly: true },
  { keys: ['m'], label: 'Pick up the selected item to move it', category: 'Actions', vimOnly: true },

  // Move mode — only reachable via `m`, so the whole section is Vim-only.
  { keys: ['j', 'k', 'h', 'l'], label: 'Relocate the picked-up item (also arrow keys)', category: 'Move mode', vimOnly: true },
  { keys: ['Enter'], label: 'Drop the item here', category: 'Move mode', vimOnly: true },
  { keys: ['Esc'], label: 'Cancel the move (snap back)', category: 'Move mode', vimOnly: true },

  // Global
  { keys: ['⌘', 'K'], label: 'Search this board', category: 'Global' },
  { keys: ['Ctrl', 'K'], label: 'Search this board', category: 'Global' },
  { keys: ['/'], label: 'Search this board', category: 'Global', vimOnly: true },
  { keys: ['f'], label: 'Hint mode — type a label to click anything (works inside the task form too)', category: 'Global', vimOnly: true },
  { keys: ['?'], label: 'Show this shortcuts cheat sheet', category: 'Global' },
  { keys: [':', 'q', '↵'], label: 'Toggle Vim keys on/off (off by default)', category: 'Global' },
];

/**
 * The bindings to display for the current mode: Vim-only rows are dropped when
 * Vim keys are off, and the j/k/h/l aliases are folded into `keys` when on.
 */
export function visibleBindings(vimEnabled: boolean): KeyBinding[] {
  return KEYMAP.filter((b) => vimEnabled || !b.vimOnly).map((b) =>
    vimEnabled && b.vimKeys ? { ...b, keys: [...b.vimKeys, ...b.keys] } : b,
  );
}
