'use client';

import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useId } from 'react';

import { cn } from '../lib/cn';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  label,
  disabled,
  className,
}: SelectProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="font-mono text-2xs tracking-wide text-text-muted uppercase">
          {label}
        </label>
      )}
      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <RadixSelect.Trigger
          id={id}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-base border border-border-emphasis bg-bg-surface px-3 text-sm text-text-primary',
            'focus:border-accent focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'data-[placeholder]:text-text-disabled',
            className,
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="size-3.5 text-text-muted" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            className="z-50 min-w-32 overflow-hidden rounded-base border border-border-emphasis bg-bg-surface shadow-lg"
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((opt) => {
                // skip empty value items, shown as the placeholder instead
                if (!opt.value) return null;
                return (
                  <RadixSelect.Item
                    key={opt.value}
                    value={opt.value}
                    className={cn(
                      'relative flex cursor-pointer items-center rounded-sm py-1.5 pr-3 pl-7 text-sm text-text-secondary outline-none select-none',
                      'hover:bg-bg-hover hover:text-text-primary',
                      'data-[highlighted]:bg-bg-hover data-[highlighted]:text-text-primary',
                      'data-[state=checked]:text-text-primary',
                    )}
                  >
                    <RadixSelect.ItemIndicator className="absolute left-2 flex items-center justify-center">
                      <Check className="size-3.5 text-accent" />
                    </RadixSelect.ItemIndicator>
                    <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                  </RadixSelect.Item>
                );
              })}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
