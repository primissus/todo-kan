// Pure helpers for Vimium-style "f" hint mode. Kept free of React/DOM-mutation
// so they're unit-testable; the overlay (components/HintOverlay.tsx) wires them
// to the live DOM + keyboard.

// Home-row-first so the common (few-target) case uses the easiest keys.
export const HINT_ALPHABET = 'fjdkslagheiwoqptyrubnvmcxz';

/**
 * Generate `n` unique, short, lowercase hint labels. Single chars while they
 * last, then uniform two-char combos. Deterministic (no randomness).
 */
export function generateLabels(n: number, alphabet = HINT_ALPHABET): string[] {
  if (n <= 0) return [];
  const chars = Array.from(new Set(alphabet.split('')));
  if (n <= chars.length) return chars.slice(0, n);
  const out: string[] = [];
  for (const a of chars) {
    for (const b of chars) {
      out.push(a + b);
      if (out.length >= n) return out;
    }
  }
  return out;
}

const HINT_SELECTOR =
  'button:not(:disabled), a[href], [role="button"], ' +
  'input:not([type="hidden"]):not([disabled]), [data-hint]';

/** Is this element visible + on-screen enough to deserve a hint? */
export function isHintable(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const vw = window.innerWidth || 0;
  const vh = window.innerHeight || 0;
  // Reject if fully outside the viewport.
  if (rect.bottom < 0 || rect.right < 0 || rect.top > vh || rect.left > vw) {
    return false;
  }
  const style = getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  // Skip opacity:0 hover-only controls (e.g. card edit/archive) — those are
  // reachable via `Enter`/`a` once a card is selected.
  if (parseFloat(style.opacity || '1') === 0) return false;
  return true;
}

/**
 * Collect the deepest visible interactive elements under `root`. When one
 * candidate contains another (e.g. a card button wrapping an icon), keep only
 * the inner one so a single hint maps to a single action.
 */
export function collectHintTargets(root: ParentNode = document): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(HINT_SELECTOR));
  const visible = all.filter(isHintable);
  return visible.filter(
    (el) => !visible.some((other) => other !== el && el.contains(other)),
  );
}
