"use client";

import * as Popover from "@radix-ui/react-popover";
import { PROJECT_COLORS } from "./color-picker";
import { cn } from "../lib/cn";

interface ColorDotProps {
  color: string;
  onChange: (color: string) => void;
  size?: "sm" | "md";
}

export function ColorDot({ color, onChange, size = "sm" }: ColorDotProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "rounded-full shrink-0 hover:ring-2 hover:ring-white/20 transition-all",
            size === "sm" ? "h-5 w-5" : "h-6 w-6",
          )}
          style={{ backgroundColor: color }}
          aria-label="Change color"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 rounded-[4px] border border-border-emphasis bg-bg-surface shadow-xl p-2 w-[176px]"
        >
          <div className="grid grid-cols-5 gap-1">
            {PROJECT_COLORS.map((c) => (
              <Popover.Close asChild key={c.value}>
                <button
                  type="button"
                  title={c.label}
                  onClick={() => onChange(c.value)}
                  className="h-7 w-7 rounded-[4px] hover:scale-110 hover:ring-2 hover:ring-white/20 transition-all"
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
