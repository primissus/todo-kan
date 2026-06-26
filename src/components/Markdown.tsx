import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Linkify } from '@/components/Linkify';
import { parseMarkdown, type MdBlock, type MdInline } from '@/lib/markdown';

export interface MarkdownProps {
  /** Free text rendered as a small Markdown subset (see lib/markdown.ts). */
  text: string;
}

/**
 * Render a task description or note as Markdown. Emits React elements directly
 * (never dangerouslySetInnerHTML) so it's XSS-safe by construction; bare URLs in
 * text are linkified via <Linkify>, explicit links are scheme-guarded by the
 * parser. Inherits the base text size/color from its container, so it adapts to
 * compact card previews and the larger dialog view alike.
 */
export function Markdown({ text }: MarkdownProps) {
  const blocks = parseMarkdown(text);
  return (
    <div className="space-y-2 break-words">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

const HEADING_SIZE = ['text-[1.3em]', 'text-[1.15em]', 'text-[1.05em]'];

function Block({ block }: { block: MdBlock }) {
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level}` as 'h1';
      const size = HEADING_SIZE[block.level - 1] ?? 'text-[1em]';
      return (
        <Tag className={`font-semibold leading-snug ${size}`}>
          <Inline nodes={block.children} />
        </Tag>
      );
    }
    case 'paragraph':
      return (
        <p>
          <Inline nodes={block.children} />
        </p>
      );
    case 'blockquote':
      return (
        <blockquote className="border-l-2 border-border pl-3 text-muted-foreground italic">
          <Inline nodes={block.children} />
        </blockquote>
      );
    case 'code':
      return <CodeBlock value={block.value} />;
    case 'list':
      return block.ordered ? (
        <ol className="list-decimal space-y-1 pl-5">
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline nodes={item} />
            </li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc space-y-1 pl-5">
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline nodes={item} />
            </li>
          ))}
        </ul>
      );
  }
}

function Inline({ nodes }: { nodes: MdInline[] }) {
  return (
    <>
      {nodes.map((node, i) => (
        <InlineNode key={i} node={node} />
      ))}
    </>
  );
}

function InlineNode({ node }: { node: MdInline }) {
  switch (node.type) {
    case 'text':
      return <Linkify text={node.value} />;
    case 'break':
      return <br />;
    case 'code':
      return (
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {node.value}
        </code>
      );
    case 'strong':
      return (
        <strong className="font-semibold">
          <Inline nodes={node.children} />
        </strong>
      );
    case 'em':
      return (
        <em className="italic">
          <Inline nodes={node.children} />
        </em>
      );
    case 'link':
      // Mirror Linkify's anchor: new tab + stop bubbling so a link inside a
      // draggable card opens instead of starting a drag / selecting the card.
      return (
        <a
          href={node.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium break-all text-primary underline underline-offset-2 hover:opacity-80"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Inline nodes={node.children} />
        </a>
      );
  }
}

/** A fenced code block (no syntax highlighting) with a tiny copy button. */
function CodeBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  };

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md bg-muted p-2.5 pr-9 text-[0.85em]">
        <code className="font-mono whitespace-pre">{value}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-1.5 right-1.5 opacity-70 hover:opacity-100"
        aria-label={copied ? 'Copied' : 'Copy code'}
        onClick={(e) => {
          e.stopPropagation();
          void copy();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </Button>
    </div>
  );
}
