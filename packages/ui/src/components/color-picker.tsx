"use client";

import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";
import { ColorSwatch } from "./color-swatch";

export const PROJECT_COLORS = [
  { label: "Neon", value: "#00E599" }, // brand accent
  { label: "Mint", value: "#34D399" },
  { label: "Sky", value: "#38BDF8" },
  { label: "Indigo", value: "#818CF8" },
  { label: "Violet", value: "#A78BFA" },
  { label: "Pink", value: "#F472B6" },
  { label: "Rose", value: "#FB7185" },
  { label: "Amber", value: "#FBBF24" },
  { label: "Orange", value: "#FB923C" },
  { label: "Slate", value: "#94A3B8" },
] as const;

export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[2].value; // sky

interface ColorPickerProps {
  value: string | null | undefined;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({
  value,
  onChange,
  label = "Color",
}: ColorPickerProps) {
  const activeColor = value ?? DEFAULT_PROJECT_COLOR;

  return (
    <Popover.Root>
      <div className="flex flex-col gap-1.5">
        {label && (
          <span className="text-[12px] text-text-muted font-medium">
            {label}
          </span>
        )}
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 px-3 py-2 w-full rounded-[4px]",
              "border border-border-default bg-bg-input",
              "text-[13px] text-text-primary",
              "hover:border-border-emphasis transition-colors",
              "focus:outline-none focus:border-accent",
            )}
          >
            <ColorSwatch color={activeColor} size="sm" />
            <span className="flex-1 text-left">
              {PROJECT_COLORS.find((c) => c.value === activeColor)?.label ??
                "Pick a color"}
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
            "z-50 rounded-[4px] border border-border-emphasis bg-bg-surface shadow-xl p-2",
            "w-[176px]",
          )}
        >
          <div className="grid grid-cols-5 gap-1">
            {PROJECT_COLORS.map((c) => (
              <Popover.Close asChild key={c.value}>
                <button
                  type="button"
                  title={c.label}
                  onClick={() => onChange(c.value)}
                  className={cn(
                    "h-7 w-7 rounded-[4px] flex items-center justify-center transition-all",
                    "hover:scale-110 hover:ring-2 hover:ring-white/20",
                    activeColor === c.value && "ring-2 ring-white/40 scale-105",
                    
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
