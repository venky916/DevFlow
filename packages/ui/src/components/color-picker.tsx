'use client';

import * as Popover from '@radix-ui/react-popover';
import { ChevronDown } from 'lucide-react';

import { cn } from '../lib/cn';
import { ColorSwatch } from './color-swatch';

export const PROJECT_COLORS = [
  { label: 'Neon', value: '#00E599' }, // brand accent
  { label: 'Mint', value: '#34D399' },
  { label: 'Sky', value: '#38BDF8' },
  { label: 'Indigo', value: '#818CF8' },
  { label: 'Violet', value: '#A78BFA' },
  { label: 'Pink', value: '#F472B6' },
  { label: 'Rose', value: '#FB7185' },
  { label: 'Amber', value: '#FBBF24' },
  { label: 'Orange', value: '#FB923C' },
  { label: 'Slate', value: '#94A3B8' },
] as const;

export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[2].value; // sky

interface ColorPickerProps {
  value: string | null | undefined;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label = 'Color' }: ColorPickerProps) {
  const activeColor = value ?? DEFAULT_PROJECT_COLOR;

  return (
    <Popover.Root>
      <div className="flex flex-col gap-1.5">
        {label && <span className="text-[12px] font-medium text-text-muted">{label}</span>}
        <Popover.Trigger asChild>
          <button
            className={cn(
              'flex w-full items-center gap-2 rounded-[4px] px-3 py-2',
              'bg-bg-input border border-border-default',
              'text-[13px] text-text-primary',
              'transition-colors hover:border-border-emphasis',
              'focus:border-accent focus:outline-none',
            )}
          >
            <ColorSwatch color={activeColor} size="sm" />
            <span className="flex-1 text-left">
              {PROJECT_COLORS.find((c) => c.value === activeColor)?.label ?? 'Pick a color'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
          </button>
        </Popover.Trigger>
      </div>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className={cn(
            'z-50 rounded-[4px] border border-border-emphasis bg-bg-surface p-2 shadow-xl',
            'w-[176px]',
          )}
        >
          <div className="grid grid-cols-5 gap-1">
            {PROJECT_COLORS.map((c) => (
              <Popover.Close asChild key={c.value}>
                <button
                  title={c.label}
                  onClick={() => onChange(c.value)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-[4px] transition-all',
                    'hover:scale-110 hover:ring-2 hover:ring-white/20',
                    activeColor === c.value && 'scale-105 ring-2 ring-white/40',
                  )}
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
