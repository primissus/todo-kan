import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown, safeHref } from '@/lib/markdown';

describe('parseMarkdown (blocks)', () => {
  it('returns [] for empty input', () => {
    expect(parseMarkdown('')).toEqual([]);
  });

  it('parses ATX headings with their level', () => {
    expect(parseMarkdown('### Title')).toEqual([
      { type: 'heading', level: 3, children: [{ type: 'text', value: 'Title' }] },
    ]);
  });

  it('keeps a single newline as a soft break inside a paragraph', () => {
    expect(parseMarkdown('a\nb')).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'a' },
          { type: 'break' },
          { type: 'text', value: 'b' },
        ],
      },
    ]);
  });

  it('splits paragraphs on a blank line', () => {
    const blocks = parseMarkdown('one\n\ntwo');
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.type === 'paragraph')).toBe(true);
  });

  it('parses unordered and ordered lists', () => {
    expect(parseMarkdown('- a\n- b')).toEqual([
      {
        type: 'list',
        ordered: false,
        items: [[{ type: 'text', value: 'a' }], [{ type: 'text', value: 'b' }]],
      },
    ]);
    const ol = parseMarkdown('1. a\n2) b')[0];
    expect(ol).toMatchObject({ type: 'list', ordered: true });
  });

  it('parses a blockquote', () => {
    expect(parseMarkdown('> hi')).toEqual([
      { type: 'blockquote', children: [{ type: 'text', value: 'hi' }] },
    ]);
  });

  it('captures a fenced code block verbatim (no inline parsing, info string ignored)', () => {
    const blocks = parseMarkdown('```js\n**not bold** `x`\n```');
    expect(blocks).toEqual([{ type: 'code', value: '**not bold** `x`' }]);
  });

  it('lets a heading interrupt a paragraph without a blank line', () => {
    const blocks = parseMarkdown('para\n# Head');
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'heading']);
  });
});

describe('parseInline (marks)', () => {
  it('parses bold, italic, and both', () => {
    expect(parseInline('**b**')).toEqual([
      { type: 'strong', children: [{ type: 'text', value: 'b' }] },
    ]);
    expect(parseInline('*i*')).toEqual([
      { type: 'em', children: [{ type: 'text', value: 'i' }] },
    ]);
    expect(parseInline('___x___')).toEqual([
      {
        type: 'strong',
        children: [{ type: 'em', children: [{ type: 'text', value: 'x' }] }],
      },
    ]);
  });

  it('treats inline code as literal (no nested emphasis)', () => {
    expect(parseInline('`a *b* c`')).toEqual([{ type: 'code', value: 'a *b* c' }]);
  });

  it('does not italicize underscores inside a word', () => {
    expect(parseInline('a_b_c')).toEqual([{ type: 'text', value: 'a_b_c' }]);
  });

  it('does not emphasize across a space-flanked delimiter', () => {
    expect(parseInline('2 * 3 * 4')).toEqual([{ type: 'text', value: '2 * 3 * 4' }]);
  });

  it('honors backslash escapes', () => {
    expect(parseInline('\\*x\\*')).toEqual([{ type: 'text', value: '*x*' }]);
  });

  it('leaves a bare URL as text (Linkify handles it at render time)', () => {
    expect(parseInline('see https://x.com')).toEqual([
      { type: 'text', value: 'see https://x.com' },
    ]);
  });

  it('parses [label](url) into a sanitized link', () => {
    expect(parseInline('[go](https://x.com)')).toEqual([
      {
        type: 'link',
        href: 'https://x.com',
        children: [{ type: 'text', value: 'go' }],
      },
    ]);
  });

  it('drops an unsafe-scheme link to plain label text', () => {
    expect(parseInline('[x](javascript:alert(1))')).toEqual([
      { type: 'text', value: 'x' },
    ]);
  });
});

describe('safeHref', () => {
  it('allows http/https/mailto', () => {
    expect(safeHref('http://a.com')).toBe('http://a.com');
    expect(safeHref('https://a.com')).toBe('https://a.com');
    expect(safeHref('mailto:a@b.com')).toBe('mailto:a@b.com');
  });

  it('rejects dangerous schemes', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,x')).toBeNull();
    expect(safeHref('vbscript:msgbox(1)')).toBeNull();
  });

  it('passes relative targets through and prefixes bare domains', () => {
    expect(safeHref('#anchor')).toBe('#anchor');
    expect(safeHref('/path')).toBe('/path');
    expect(safeHref('example.com/x')).toBe('https://example.com/x');
  });
});
