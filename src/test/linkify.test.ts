import { describe, expect, it } from 'vitest';
import { parseLinks } from '@/lib/linkify';

const links = (text: string) =>
  parseLinks(text).filter((s) => s.type === 'link');

describe('parseLinks', () => {
  it('returns one text segment for plain text (and [] for empty)', () => {
    expect(parseLinks('just words')).toEqual([
      { type: 'text', value: 'just words' },
    ]);
    expect(parseLinks('')).toEqual([]);
  });

  it('detects an http(s) URL and resolves its href', () => {
    const segs = parseLinks('go to https://example.com now');
    expect(segs).toEqual([
      { type: 'text', value: 'go to ' },
      { type: 'link', value: 'https://example.com', href: 'https://example.com' },
      { type: 'text', value: ' now' },
    ]);
  });

  it('prefixes bare www. links with https://', () => {
    const [link] = links('see www.example.com');
    expect(link).toEqual({
      type: 'link',
      value: 'www.example.com',
      href: 'https://www.example.com',
    });
  });

  it('prefixes mixed/upper-case www. links too (no broken relative href)', () => {
    expect(links('go WWW.Example.com')[0].href).toBe('https://WWW.Example.com');
    expect(links('go Www.example.com')[0].href).toBe('https://Www.example.com');
  });

  it('finds multiple URLs in one string', () => {
    const found = links('http://a.com and https://b.org/x');
    expect(found.map((l) => l.href)).toEqual([
      'http://a.com',
      'https://b.org/x',
    ]);
  });

  it('strips trailing sentence punctuation out of the link', () => {
    expect(links('visit https://example.com.')[0].value).toBe(
      'https://example.com',
    );
    const wrapped = parseLinks('(https://example.com)');
    expect(wrapped.find((s) => s.type === 'link')?.value).toBe(
      'https://example.com',
    );
    // the stripped ")" stays as text
    expect(wrapped[wrapped.length - 1]).toEqual({ type: 'text', value: ')' });
  });

  it('keeps balanced parentheses inside a URL', () => {
    const url = 'https://en.wikipedia.org/wiki/Foo_(bar)';
    expect(links(`see ${url} here`)[0].value).toBe(url);
  });

  it('preserves a query string and path', () => {
    const url = 'https://example.com/a/b?x=1&y=2#frag';
    expect(links(url)[0].value).toBe(url);
  });

  it('does not match bare words or mid-word "www"', () => {
    expect(links('email me at not-a-link please')).toHaveLength(0);
    expect(links('foowww.bar')).toHaveLength(0);
  });

  it('preserves newlines as text segments', () => {
    const segs = parseLinks('line1\nhttps://x.com\nline2');
    expect(segs[0]).toEqual({ type: 'text', value: 'line1\n' });
    expect(segs[1].type).toBe('link');
    expect(segs[2]).toEqual({ type: 'text', value: '\nline2' });
  });
});
