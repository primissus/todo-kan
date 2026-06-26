import { Fragment } from 'react';
import { parseLinks } from '@/lib/linkify';

export interface LinkifyProps {
  /** Free text; bare URLs become anchors, everything else renders verbatim. */
  text: string;
}

/**
 * Render text with bare URLs turned into clickable links. Drop it inside a
 * `whitespace-pre-wrap` block to preserve newlines. Clicks/pointer-downs are
 * stopped from bubbling so a link inside a draggable Kanban card opens the URL
 * instead of starting a drag or selecting the card.
 */
export function Linkify({ text }: LinkifyProps) {
  return (
    <>
      {parseLinks(text).map((seg, i) =>
        seg.type === 'link' ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-medium break-all text-primary underline underline-offset-2 hover:opacity-80"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {seg.value}
          </a>
        ) : (
          <Fragment key={i}>{seg.value}</Fragment>
        ),
      )}
    </>
  );
}
