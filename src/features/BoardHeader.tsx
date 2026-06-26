import { type ReactNode, useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TagInput } from '@/components/TagInput';
import { cn } from '@/lib/utils';
import { goHome } from '@/lib/router';
import { useAppStore } from '@/store/useAppStore';
import { useAllTags } from '@/store/selectors';
import type { Board } from '@/lib/types/domain';

export interface BoardHeaderProps {
  board: Board;
  /** Board-type-specific action buttons rendered in the toolbar row. */
  children?: ReactNode;
  /**
   * When true, on a wide-enough header (container ≥ @xl ≈ 576px) the tags +
   * actions block moves inline to the RIGHT of the title instead of stacking
   * below it — used by the Kanban board to reclaim vertical space for the
   * columns. Default false keeps the always-stacked layout (the TODO list).
   */
  wide?: boolean;
}

/** Editable board title/description/tags + back button (req 10.1 / 11.1). */
export function BoardHeader({
  board,
  children,
  wide = false,
}: BoardHeaderProps) {
  const updateBoardMeta = useAppStore((s) => s.updateBoardMeta);
  const allTags = useAllTags();
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description);

  // Reset local fields only when switching to a different board.
  useEffect(() => {
    setTitle(board.title);
    setDescription(board.description);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  const commitTitle = () => {
    const next = title.trim();
    if (next !== board.title) updateBoardMeta(board.id, { title: next });
  };
  const commitDescription = () => {
    if (description !== board.description) {
      updateBoardMeta(board.id, { description });
    }
  };

  return (
    <div className="@container mb-5">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 mb-2 text-muted-foreground"
        onClick={goHome}
      >
        <ChevronLeft className="size-4" />
        All lists
      </Button>

      <div
        className={cn(
          'flex flex-col gap-4',
          wide && '@xl:flex-row @xl:items-start @xl:justify-between @xl:gap-6',
        )}
      >
        {/* Title + description. min-w-0 lets the block shrink beside the toolbar. */}
        <div className={cn('min-w-0', wide && '@xl:flex-1')}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            placeholder="Untitled"
            aria-label="Board title"
            className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={commitDescription}
            placeholder="Add a description…"
            rows={1}
            aria-label="Board description"
            className="mt-1 w-full resize-none bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        {/*
         * Tags + actions. DOM order is tags→actions, so the stacked layout (the
         * TODO list, and the Kanban board on narrow viewports) is unchanged.
         * When `wide` (Kanban) and the header is wide enough (@xl ≈ 576px) the
         * block sits to the RIGHT of the title as two lines — actions on top
         * (`@xl:order-last` lifts them above the tags), tags below — filling the
         * otherwise-empty top-right and shrinking the header so the columns get
         * the reclaimed height (via the flex chain, no magic numbers).
         */}
        <div
          className={cn(
            'flex flex-col gap-3',
            wide && '@xl:w-80 @xl:shrink-0 @xl:items-end',
          )}
        >
          <div
            className={cn(
              'max-w-md',
              wide && '@xl:order-last @xl:w-full @xl:max-w-none',
            )}
          >
            <TagInput
              value={board.tags}
              onChange={(tags) => updateBoardMeta(board.id, { tags })}
              suggestions={allTags}
              placeholder="Add tags…"
            />
          </div>

          {children ? (
            <div
              className={cn(
                'flex flex-wrap items-center gap-2',
                wide && '@xl:justify-end',
              )}
            >
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
