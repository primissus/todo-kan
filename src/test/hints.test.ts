import { afterEach, describe, expect, it, vi } from 'vitest';
import { collectHintTargets, generateLabels } from '@/lib/hints';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('generateLabels', () => {
  it('returns n unique labels', () => {
    const labels = generateLabels(5);
    expect(labels).toHaveLength(5);
    expect(new Set(labels).size).toBe(5);
  });

  it('uses single chars while they fit', () => {
    expect(generateLabels(3, 'abc')).toEqual(['a', 'b', 'c']);
    expect(generateLabels(3, 'abc').every((l) => l.length === 1)).toBe(true);
  });

  it('switches to uniform 2-char combos once the alphabet is exceeded', () => {
    const many = generateLabels(5, 'abc'); // 5 > 3 → all two-char
    expect(many).toHaveLength(5);
    expect(new Set(many).size).toBe(5);
    expect(many.every((l) => l.length === 2)).toBe(true);
    // combos are drawn from the alphabet
    expect(many.every((l) => l[0] !== undefined && 'abc'.includes(l[0]))).toBe(
      true,
    );
  });

  it('handles zero and negative counts', () => {
    expect(generateLabels(0)).toEqual([]);
    expect(generateLabels(-3)).toEqual([]);
  });
});

describe('collectHintTargets', () => {
  it('keeps visible interactive elements, drops hidden + nesting containers', () => {
    document.body.innerHTML = `
      <button id="b1">one</button>
      <div role="button" id="wrap"><button id="inner">x</button></div>
      <button id="hidden" style="display:none">h</button>
    `;
    // jsdom gives 0-size rects; give every element an on-screen rect so the
    // visibility gate depends on the computed style (display:none) only.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      left: 10,
      width: 20,
      height: 20,
      right: 30,
      bottom: 30,
      x: 10,
      y: 10,
      toJSON: () => ({}),
    } as DOMRect);

    const ids = collectHintTargets(document.body).map((el) => el.id);
    expect(ids).toContain('b1');
    expect(ids).toContain('inner');
    expect(ids).not.toContain('wrap'); // contains #inner → dropped
    expect(ids).not.toContain('hidden'); // display:none → dropped
  });
});
