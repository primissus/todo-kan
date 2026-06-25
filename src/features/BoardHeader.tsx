import { type ReactNode, useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TagInput } from '@/components/TagInput';
import { goHome } from '@/lib/router';
import { useAppStore } from '@/store/useAppStore';
import { useAllTags } from '@/store/selectors';
import type { Board } from '@/lib/types/domain';

export interface BoardHeaderProps {
  board: Board;
  /** Board-type-specific action buttons rendered in the toolbar row. */
  children?: ReactNode;
}

/** Editable board title/description/tags + back button (req 10.1 / 11.1). */
export function BoardHeader({ board, children }: BoardHeaderProps) {
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
    <div className="mb-5">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 mb-2 text-muted-foreground"
        onClick={goHome}
      >
        <ChevronLeft className="size-4" />
        All lists
      </Button>

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

      <div className="mt-3 max-w-md">
        <TagInput
          value={board.tags}
          onChange={(tags) => updateBoardMeta(board.id, { tags })}
          suggestions={allTags}
          placeholder="Add tags…"
        />
      </div>

      {children ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
