// Tiny hand-rolled Markdown parser for task descriptions + notes. Kept
// framework-free and side-effect-free (trivially unit-testable); the React
// renderer lives in components/Markdown.tsx. We parse to an AST of plain objects
// (never an HTML string) so the renderer can emit React elements directly — no
// dangerouslySetInnerHTML, no sanitizer needed. URL autolinking of bare URLs in
// text leaves is delegated to the existing lib/linkify.ts via <Linkify>.
//
// Supported subset (by design — no images/tables/highlighting/strikethrough/HR):
//   block:  headings (#..######), fenced code (``` / ~~~), blockquotes (>),
//           unordered (-/*/+) & ordered (1. / 1)) lists, paragraphs
//   inline: **bold**, *italic*, ***both***, `code`, [label](url), \escapes,
//           soft line breaks, bare URLs (via Linkify)

export type MdInline =
  | { type: 'text'; value: string }
  /** A soft line break (single newline inside a paragraph/quote) → <br>. */
  | { type: 'break' }
  /** Inline code span; `value` is literal (no nested parsing). */
  | { type: 'code'; value: string }
  | { type: 'strong'; children: MdInline[] }
  | { type: 'em'; children: MdInline[] }
  /** Explicit link; `href` is already sanitized by safeHref. */
  | { type: 'link'; href: string; children: MdInline[] };

export type MdBlock =
  | { type: 'heading'; level: number; children: MdInline[] }
  | { type: 'paragraph'; children: MdInline[] }
  | { type: 'blockquote'; children: MdInline[] }
  /** Fenced code block; `value` is the verbatim inner text (no inline parsing). */
  | { type: 'code'; value: string }
  | { type: 'list'; ordered: boolean; items: MdInline[][] };

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const FENCE_RE = /^(`{3,}|~{3,})(.*)$/;
const QUOTE_RE = /^>\s?/;
const LIST_RE = /^\s*(?:[-*+]|\d+[.)])\s+/;
const ORDERED_RE = /^\s*\d+[.)]\s+/;

function isListItem(line: string): boolean {
  return LIST_RE.test(line);
}

/** A line that begins a new block, so it interrupts an open paragraph. */
function isBlockStart(line: string): boolean {
  return (
    HEADING_RE.test(line) ||
    FENCE_RE.test(line) ||
    QUOTE_RE.test(line) ||
    isListItem(line)
  );
}

/**
 * Parse free-text Markdown into an ordered list of block nodes. Returns `[]` for
 * empty input. Whitespace-only lines separate blocks; CR/CRLF are normalized.
 */
export function parseMarkdown(text: string): MdBlock[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MdBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    // Fenced code: capture verbatim until a matching (or longer) closing fence.
    const fence = FENCE_RE.exec(line);
    if (fence) {
      const marker = fence[1][0];
      const len = fence[1].length;
      const closeRe = new RegExp(`^\\${marker}{${len},}\\s*$`);
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !closeRe.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume the closing fence (if present)
      blocks.push({ type: 'code', value: codeLines.join('\n') });
      continue;
    }

    // Heading.
    const heading = HEADING_RE.exec(line);
    if (heading) {
      const content = heading[2].replace(/\s+#+\s*$/, '').trim();
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        children: parseInline(content),
      });
      i++;
      continue;
    }

    // Blockquote: consecutive `>` lines, inner content parsed inline.
    if (QUOTE_RE.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        quoteLines.push(lines[i].replace(QUOTE_RE, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', children: inlineWithBreaks(quoteLines) });
      continue;
    }

    // List: group consecutive items of the same ordered/unordered kind.
    if (isListItem(line)) {
      const ordered = ORDERED_RE.test(line);
      const items: MdInline[][] = [];
      while (
        i < lines.length &&
        isListItem(lines[i]) &&
        ORDERED_RE.test(lines[i]) === ordered
      ) {
        const content = lines[i].replace(LIST_RE, '');
        items.push(parseInline(content));
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Paragraph: run until a blank line or an interrupting block start.
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !isBlockStart(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', children: inlineWithBreaks(paraLines) });
  }

  return blocks;
}

/** Inline-parse each line and join them with soft `break` nodes. */
function inlineWithBreaks(lines: string[]): MdInline[] {
  const out: MdInline[] = [];
  lines.forEach((line, idx) => {
    if (idx > 0) out.push({ type: 'break' });
    out.push(...parseInline(line));
  });
  return out;
}

const ESCAPABLE = '\\`*_{}[]()#+-.!>~';

function countRun(text: string, start: number, ch: string): number {
  let n = 0;
  while (start + n < text.length && text[start + n] === ch) n++;
  return n;
}

function isAlnum(ch: string | undefined): boolean {
  return ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
}

/**
 * Parse one line's worth of inline Markdown into inline nodes. Plain runs are
 * left as `text` nodes (the renderer linkifies bare URLs inside them).
 */
export function parseInline(text: string): MdInline[] {
  const nodes: MdInline[] = [];
  let buf = '';
  let i = 0;

  const flush = () => {
    if (buf) {
      nodes.push({ type: 'text', value: buf });
      buf = '';
    }
  };

  while (i < text.length) {
    const ch = text[i];

    // Backslash escape: the next char is taken literally.
    if (ch === '\\' && i + 1 < text.length && ESCAPABLE.includes(text[i + 1])) {
      buf += text[i + 1];
      i += 2;
      continue;
    }

    // Inline code: a run of N backticks closed by the next run of N backticks.
    if (ch === '`') {
      const run = countRun(text, i, '`');
      const close = findCodeClose(text, i + run, run);
      if (close !== -1) {
        flush();
        nodes.push({ type: 'code', value: trimCodeSpan(text.slice(i + run, close)) });
        i = close + run;
        continue;
      }
      buf += ch;
      i++;
      continue;
    }

    // Explicit link: [label](url).
    if (ch === '[') {
      const link = parseLink(text, i);
      if (link) {
        flush();
        nodes.push(...link.nodes);
        i = link.end;
        continue;
      }
      buf += ch;
      i++;
      continue;
    }

    // Emphasis: * / _ runs (strong / em / both).
    if (ch === '*' || ch === '_') {
      const em = parseEmphasis(text, i, ch);
      if (em) {
        flush();
        nodes.push(em.node);
        i = em.end;
        continue;
      }
      buf += ch;
      i++;
      continue;
    }

    buf += ch;
    i++;
  }

  flush();
  return nodes;
}

/** Find the start index of the closing backtick run of exactly `run` length. */
function findCodeClose(text: string, from: number, run: number): number {
  let k = from;
  while (k < text.length) {
    if (text[k] === '`') {
      const c = countRun(text, k, '`');
      if (c === run) return k;
      k += c;
    } else {
      k++;
    }
  }
  return -1;
}

/** CommonMark: drop one leading+trailing space if the span isn't all spaces. */
function trimCodeSpan(code: string): string {
  if (code.length > 1 && code[0] === ' ' && code[code.length - 1] === ' ' && code.trim() !== '') {
    return code.slice(1, -1);
  }
  return code;
}

interface InlineMatch {
  node: MdInline;
  end: number;
}

function parseEmphasis(text: string, i: number, marker: '*' | '_'): InlineMatch | null {
  const run = countRun(text, i, marker);
  const n = Math.min(run, 3); // 1=em, 2=strong, 3=strong+em
  const contentStart = i + n;

  // Must have non-space content right after the opening delimiter.
  if (contentStart >= text.length || /\s/.test(text[contentStart])) return null;
  // `_` does not open inside a word (snake_case stays plain).
  if (marker === '_' && isAlnum(text[i - 1])) return null;

  const close = findEmphasisClose(text, contentStart, marker, n);
  if (close === -1) return null;
  // `_` does not close inside a word.
  if (marker === '_' && isAlnum(text[close + n])) return null;

  const inner = parseInline(text.slice(contentStart, close));
  let node: MdInline;
  if (n === 3) node = { type: 'strong', children: [{ type: 'em', children: inner }] };
  else if (n === 2) node = { type: 'strong', children: inner };
  else node = { type: 'em', children: inner };

  return { node, end: close + n };
}

/** Find the start of a closing delimiter run of length >= n with non-space before it. */
function findEmphasisClose(
  text: string,
  contentStart: number,
  marker: string,
  n: number,
): number {
  let k = contentStart;
  while (k < text.length) {
    if (text[k] === marker) {
      const c = countRun(text, k, marker);
      if (c >= n && k > contentStart && !/\s/.test(text[k - 1])) return k;
      k += c;
    } else {
      k++;
    }
  }
  return -1;
}

/** Parse `[label](url)` starting at `text[start] === '['`. */
function parseLink(text: string, start: number): { nodes: MdInline[]; end: number } | null {
  // Scan the label, honoring escapes and one level of bracket nesting.
  let i = start + 1;
  let depth = 1;
  let label = '';
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\' && i + 1 < text.length) {
      label += ch + text[i + 1];
      i += 2;
      continue;
    }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) break;
    }
    label += ch;
    i++;
  }
  if (depth !== 0 || text[i] !== ']' || text[i + 1] !== '(') return null;

  // Scan the URL up to the matching close paren (allowing escapes + nesting).
  i += 2;
  const urlStart = i;
  depth = 1;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\' && i + 1 < text.length) {
      i += 2;
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }
  if (depth !== 0) return null;
  const rawUrl = text.slice(urlStart, i).trim();
  const end = i + 1; // past the ')'

  const children = parseInline(label);
  const href = safeHref(rawUrl);
  // Unsafe/empty scheme → render the label as plain text (no anchor).
  if (!href) return { nodes: children, end };
  return { nodes: [{ type: 'link', href, children }], end };
}

/**
 * Resolve a link target to a safe href or `null`. Allows http/https/mailto and
 * relative targets; bare domains get an https:// prefix; everything else
 * (javascript:, data:, vbscript:, file:, …) is rejected.
 */
export function safeHref(raw: string): string | null {
  const u = raw.trim();
  if (!u) return null;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(u);
  if (scheme) {
    const s = scheme[1].toLowerCase();
    return s === 'http' || s === 'https' || s === 'mailto' ? u : null;
  }
  if (u.startsWith('#') || u.startsWith('/') || u.startsWith('.')) return u;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(u)) return `https://${u}`;
  return null;
}
