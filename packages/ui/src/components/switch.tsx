"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "../lib/cn";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
}: SwitchProps) {
  return (
    <div className="flex items-center gap-3">
      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          "focus:outline-none",
          checked ? "bg-accent" : "bg-bg-overlay",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <RadixSwitch.Thumb
          className={cn(
            "block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
            "translate-x-[3px] data-[state=checked]:translate-x-[19px]",
          )}
        />
      </RadixSwitch.Root>
      {label && (
        <span className="text-[13px] text-text-secondary">{label}</span>
      )}
    </div>
  );
}
