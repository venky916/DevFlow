'use client';

import * as RadixRadio from '@radix-ui/react-radio-group';

import { cn } from '../lib/cn';

export interface RadioOption {
  label: string;
  value: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  className?: string;
}

export function RadioGroup({ options, value, onValueChange, label, className }: RadioGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="font-mono text-[11px] tracking-[0.03em] text-text-muted uppercase">
          {label}
        </label>
      )}
      <RadixRadio.Root
        value={value}
        onValueChange={onValueChange}
        className={cn('flex flex-col gap-2', className)}
      >
        {options.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <RadixRadio.Item
              value={opt.value}
              id={opt.value}
              className={cn(
                'h-4 w-4 rounded-full border border-border-emphasis bg-bg-surface',
                'focus:border-accent focus:outline-none',
                'data-[state=checked]:border-accent',
              )}
            >
              <RadixRadio.Indicator className="relative flex h-full w-full items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-accent after:content-['']" />
            </RadixRadio.Item>
            <label htmlFor={opt.value} className="cursor-pointer text-sm text-text-secondary">
              {opt.label}
            </label>
          </div>
        ))}
      </RadixRadio.Root>
    </div>
  );
}
