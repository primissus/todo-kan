import { useCallback, useEffect, useState } from 'react';
import {
  applyActiveTheme,
  applyTheme,
  getActiveFamily,
  getStoredMode,
  resolveActiveConcrete,
  saveFamily,
  saveMode,
  type Mode,
} from '@/lib/theme';

/**
 * App-root effect: apply the active theme on mount and keep `system` mode in
 * sync with OS appearance changes. Mount once (e.g. in App).
 */
export function useSystemThemeSync(): void {
  useEffect(() => {
    applyActiveTheme();
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }
    const onChange = () => {
      if (getStoredMode() === 'system') applyActiveTheme();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
}

export interface ThemeControls {
  mode: Mode;
  family: string;
  setMode: (m: Mode) => void;
  setFamily: (f: string) => void;
}

/** Read/write theme family + appearance mode; applies immediately on change. */
export function useThemeControls(): ThemeControls {
  const [mode, setModeState] = useState<Mode>(() => getStoredMode());
  const [family, setFamilyState] = useState<string>(() => getActiveFamily());

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    saveMode(m);
    applyTheme(resolveActiveConcrete());
  }, []);

  const setFamily = useCallback((f: string) => {
    setFamilyState(f);
    saveFamily(f);
    applyTheme(resolveActiveConcrete());
  }, []);

  return { mode, family, setMode, setFamily };
}
