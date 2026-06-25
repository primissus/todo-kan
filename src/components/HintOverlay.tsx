// Vimium-style "f" hint mode. When active, overlays a letter label on every
// visible interactive element; typing a label clicks it. Esc cancels.
// Uses a capture-phase listener so it intercepts keys before the global keymap.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { collectHintTargets, generateLabels } from '@/lib/hints';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/useUiStore';

interface Hint {
  el: HTMLElement;
  label: string;
  top: number;
  left: number;
}

export function HintOverlay() {
  const active = useUiStore((s) => s.hintsActive);
  const setHintsActive = useUiStore((s) => s.setHintsActive);
  const [hints, setHints] = useState<Hint[]>([]);
  const [typed, setTyped] = useState('');

  // Snapshot the clickable targets when hint mode turns on.
  useEffect(() => {
    if (!active) {
      setHints([]);
      setTyped('');
      return;
    }
    const els = collectHintTargets(document.body);
    const labels = generateLabels(els.length);
    setHints(
      els.map((el, i) => {
        const r = el.getBoundingClientRect();
        return { el, label: labels[i], top: r.top, left: r.left };
      }),
    );
    setTyped('');
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setHintsActive(false);
        return;
      }
      if (e.key === 'Backspace') {
        setTyped((s) => s.slice(0, -1));
        return;
      }
      if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return;
      const next = typed + e.key.toLowerCase();
      const matches = hints.filter((h) => h.label.startsWith(next));
      if (matches.length === 0) return;
      const exact = hints.find((h) => h.label === next);
      if (exact) {
        setHintsActive(false);
        exact.el.focus?.();
        exact.el.click();
        return;
      }
      setTyped(next);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active, hints, typed, setHintsActive]);

  if (!active || hints.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[100]">
      {hints.map((h, i) => {
        const match = h.label.startsWith(typed);
        return (
          <span
            key={`${h.label}-${i}`}
            style={{ position: 'fixed', top: h.top, left: h.left }}
            className={cn(
              'rounded bg-primary px-1 py-0.5 font-mono text-[11px] font-semibold leading-none text-primary-foreground shadow ring-1 ring-ring',
              !match && 'opacity-30',
            )}
          >
            {h.label.split('').map((c, ci) => (
              <span key={ci} className={ci < typed.length ? 'opacity-60' : ''}>
                {c}
              </span>
            ))}
          </span>
        );
      })}
    </div>,
    document.body,
  );
}
