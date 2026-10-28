'use client';

import * as Popover from '@radix-ui/react-popover';

import { cn } from '../lib/cn';
import { PROJECT_COLORS } from './color-picker';

interface ColorDotProps {
  color: string;
  onChange: (color: string) => void;
  size?: 'sm' | 'md';
}

export function ColorDot({ color, onChange, size = 'sm' }: ColorDotProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'shrink-0 rounded-full transition-all hover:ring-2 hover:ring-text-primary/20',
            size === 'sm' ? 'size-5' : 'size-6',
          )}
          style={{ backgroundColor: color }}
          aria-label="Change color"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-44 rounded-base border border-border-emphasis bg-bg-surface p-2 shadow-xl"
        >
          <div className="grid grid-cols-5 gap-1">
            {PROJECT_COLORS.map((c) => (
              <Popover.Close asChild key={c.value}>
                <button
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => onChange(c.value)}
                  className="size-7 rounded-base transition-all hover:scale-110 hover:ring-2 hover:ring-text-primary/20"
                  style={{ backgroundColor: c.value }}
                />
              </Popover.Close>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
