"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";

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
  placeholder = "Select...",
  label,
  disabled,
  className,
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] uppercase tracking-[0.03em] text-text-muted font-mono">
          {label}
        </label>
      )}
      <RadixSelect.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <RadixSelect.Trigger
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-[4px] border border-border-emphasis bg-bg-surface px-3 text-sm text-text-primary",
            "focus:outline-none focus:border-accent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "data-[placeholder]:text-text-disabled",
            className,
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            className="z-50 min-w-[8rem] overflow-hidden rounded-[4px] border border-border-emphasis bg-bg-surface shadow-lg"
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((opt) => {
                // skip empty value items — show as placeholder instead
                if (!opt.value) return null;
                return (
                  <RadixSelect.Item
                    key={opt.value}
                    value={opt.value}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-[3px] py-1.5 pl-7 pr-3 text-sm text-text-secondary outline-none",
                      "hover:bg-bg-hover hover:text-text-primary",
                      "data-[highlighted]:bg-bg-hover data-[highlighted]:text-text-primary",
                      "data-[state=checked]:text-text-primary",
                    )}
                  >
                    <RadixSelect.ItemIndicator className="absolute left-2 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-accent" />
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
