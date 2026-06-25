import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { MODES, THEME_FAMILIES, type Mode } from '@/lib/theme';
import { useThemeControls } from '@/hooks/useTheme';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const MODE_ICON: Record<Mode, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/** Theme family dropdown (req 7.1) + appearance light/dark/system (req 7.2). */
export function ThemeControls() {
  const { mode, family, setMode, setFamily } = useThemeControls();

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="theme-family">Theme</Label>
        <Select value={family} onValueChange={setFamily}>
          <SelectTrigger id="theme-family" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEME_FAMILIES.map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Appearance</Label>
        <div className="grid grid-cols-3 gap-1 rounded-md border p-1">
          {MODES.map(([key, label]) => {
            const Icon = MODE_ICON[key];
            return (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={mode === key ? 'default' : 'ghost'}
                className="justify-center gap-1.5"
                onClick={() => setMode(key)}
              >
                <Icon className="size-4" />
                {label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
