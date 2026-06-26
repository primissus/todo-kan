import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Markdown } from '@/components/Markdown';

describe('Markdown render', () => {
  it('renders a fenced code block verbatim (not linkified) with a working copy button', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<Markdown text={'```\nvisit https://x.com\n```'} />);

    // The URL inside the code block is literal text, not a link.
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('visit https://x.com')).toBeInTheDocument();

    // Copy grabs the raw block text and flips to a "Copied" state.
    await user.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith('visit https://x.com');
    expect(
      await screen.findByRole('button', { name: 'Copied' }),
    ).toBeInTheDocument();
  });

  it('renders bold and a markdown link that opens in a new tab', () => {
    render(<Markdown text={'**b** and [go](https://x.com)'} />);
    expect(screen.getByText('b').tagName).toBe('STRONG');
    const link = screen.getByRole('link', { name: 'go' });
    expect(link).toHaveAttribute('href', 'https://x.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders an unsafe-scheme link as inert text', () => {
    render(<Markdown text={'[x](javascript:alert(1))'} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('x')).toBeInTheDocument();
  });
});
