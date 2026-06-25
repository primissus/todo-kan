import * as React from 'react';
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/** Track the active appearance from <html data-mode>, set by theme.ts. */
function useDocMode(): 'light' | 'dark' {
  const [mode, setMode] = React.useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' &&
    document.documentElement.dataset.mode === 'dark'
      ? 'dark'
      : 'light',
  );
  React.useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => {
      setMode(el.dataset.mode === 'dark' ? 'dark' : 'light');
    });
    obs.observe(el, { attributes: true, attributeFilter: ['data-mode'] });
    return () => obs.disconnect();
  }, []);
  return mode;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useDocMode();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
