// Declarative shortcut reference. This is the single source of truth for the
// Help dialog (components/HelpDialog.tsx). The actual dispatch lives in
// hooks/useGlobalKeymap.ts and is kept in lockstep with this table by hand —
// when you add a binding, add it here too so Help never drifts.

export interface KeyBinding {
  /** Display tokens, e.g. ['j', '↓']. */
  keys: string[];
  label: string;
  category: string;
}

export const KEY_CATEGORIES = [
  'Navigation',
  'Actions',
  'Move mode',
  'Global',
] as const;

export const KEYMAP: KeyBinding[] = [
  // Navigation
  { keys: ['j', '↓'], label: 'Move cursor down (next card / row / list)', category: 'Navigation' },
  { keys: ['k', '↑'], label: 'Move cursor up (previous card / row / list)', category: 'Navigation' },
  { keys: ['h', '←'], label: 'Move cursor to the column on the left (Kanban) / previous (Home)', category: 'Navigation' },
  { keys: ['l', '→'], label: 'Move cursor to the column on the right (Kanban) / next (Home)', category: 'Navigation' },
  { keys: ['Esc'], label: 'Clear the cursor', category: 'Navigation' },

  // Actions
  { keys: ['Enter'], label: 'Open the selected item (edit task · open board)', category: 'Actions' },
  { keys: ['a'], label: 'Archive the selected item', category: 'Actions' },
  { keys: ['Shift', 'A'], label: 'Toggle archived (drawer on a board · show archived on Home)', category: 'Actions' },
  { keys: ['Shift', 'C'], label: 'Configure columns (Kanban)', category: 'Actions' },
  { keys: ['m'], label: 'Pick up the selected item to move it', category: 'Actions' },

  // Move mode
  { keys: ['j', 'k', 'h', 'l'], label: 'Relocate the picked-up item (also arrow keys)', category: 'Move mode' },
  { keys: ['Enter'], label: 'Drop the item here', category: 'Move mode' },
  { keys: ['Esc'], label: 'Cancel the move (snap back)', category: 'Move mode' },

  // Global
  { keys: ['/'], label: 'Search this board', category: 'Global' },
  { keys: ['⌘', 'K'], label: 'Search this board', category: 'Global' },
  { keys: ['Ctrl', 'K'], label: 'Search this board', category: 'Global' },
  { keys: ['f'], label: 'Hint mode — type a label to click anything', category: 'Global' },
  { keys: ['?'], label: 'Show this shortcuts cheat sheet', category: 'Global' },
];
