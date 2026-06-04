"use client";

import * as RadixRadio from "@radix-ui/react-radio-group";
import { cn } from "../lib/cn";

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

export function RadioGroup({
  options,
  value,
  onValueChange,
  label,
  className,
}: RadioGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-[11px] uppercase tracking-[0.03em] text-text-muted font-mono">
          {label}
        </label>
      )}
      <RadixRadio.Root
        value={value}
        onValueChange={onValueChange}
        className={cn("flex flex-col gap-2", className)}
      >
        {options.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <RadixRadio.Item
              value={opt.value}
              id={opt.value}
              className={cn(
                "h-4 w-4 rounded-full border border-border-emphasis bg-bg-surface",
                "focus:outline-none focus:border-accent",
                "data-[state=checked]:border-accent",
              )}
            >
              <RadixRadio.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-2 after:h-2 after:rounded-full after:bg-accent" />
            </RadixRadio.Item>
            <label
              htmlFor={opt.value}
              className="text-sm text-text-secondary cursor-pointer"
            >
              {opt.label}
            </label>
          </div>
        ))}
      </RadixRadio.Root>
    </div>
  );
}
