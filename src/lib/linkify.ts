// Pure URL tokenizer for free-text (task descriptions + notes). Splits a string
// into ordered text/link segments so the UI can render bare URLs as clickable
// anchors without an HTML/markdown parser. Kept framework-free + side-effect-free
// so it's trivially unit-testable; the React renderer lives in
// components/Linkify.tsx.

export interface LinkSegment {
  /** 'link' carries a resolved `href`; 'text' is rendered verbatim. */
  type: 'text' | 'link';
  value: string;
  href?: string;
}

// http(s):// or bare www. followed by non-space, non-angle-bracket chars. The
// leading \b keeps us off mid-word matches (e.g. "foowww.x") without needing
// lookbehind (Safari/older-engine safe for the file:// single-file build).
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>]+/gi;

const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

/**
 * Trailing punctuation usually isn't part of the URL ("see https://x.com." or
 * "(https://x.com)"). Peel it off into a separate text tail, but keep balanced
 * brackets so URLs like .../Foo_(bar) survive intact.
 */
function trimTrailing(url: string): { url: string; tail: string } {
  let tail = '';
  while (url.length > 0) {
    const ch = url[url.length - 1];
    if ('.,;:!?'.includes(ch) || ch === '"' || ch === "'") {
      tail = ch + tail;
      url = url.slice(0, -1);
      continue;
    }
    const opener = CLOSERS[ch];
    if (opener) {
      const opens = url.split(opener).length - 1;
      const closes = url.split(ch).length - 1;
      if (closes > opens) {
        tail = ch + tail;
        url = url.slice(0, -1);
        continue;
      }
    }
    break;
  }
  return { url, tail };
}

/**
 * Split `text` into ordered segments. Returns a single text segment when there
 * are no URLs, and `[]` for an empty string.
 */
export function parseLinks(text: string): LinkSegment[] {
  const segments: LinkSegment[] = [];
  let last = 0;
  URL_RE.lastIndex = 0; // reset: the regex is module-level + global
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(text)) !== null) {
    const start = m.index;
    const { url, tail } = trimTrailing(m[0]);
    if (start > last) segments.push({ type: 'text', value: text.slice(last, start) });
    // Bare-domain matches are case-insensitive (URL_RE has /i), so a "Www."/"WWW."
    // spelling must still get the https:// prefix — otherwise the href is a
    // scheme-less (relative) path that breaks, especially under file://.
    const href = /^www\./i.test(url) ? `https://${url}` : url;
    segments.push({ type: 'link', value: url, href });
    if (tail) segments.push({ type: 'text', value: tail });
    last = start + m[0].length;
    if (URL_RE.lastIndex === start) URL_RE.lastIndex++; // zero-width safety
  }
  if (last < text.length) segments.push({ type: 'text', value: text.slice(last) });
  return segments;
}
