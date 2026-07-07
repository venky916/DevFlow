"use client";

import * as Popover from "@radix-ui/react-popover";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "../lib/cn";

// ─── types ────────────────────────────────────────────────────────
// RHF stores the value as "HH:MM" string
// Zod schema: z.string().regex(/^\d{2}:\d{2}$/)
interface TimePickerProps {
  value?: string | null; // "09:00"
  onChange: (time: string | null) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  minuteStep?: 1 | 5 | 10 | 15 | 30;
  className?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseTime(val?: string | null) {
  if (!val) return { h: 9, m: 0 };
  const [hs = "9", ms = "0"] = val.split(":");
  const h = Number(hs);
  const m = Number(ms);
  return { h: isNaN(h) ? 9 : h, m: isNaN(m) ? 0 : m };
}

// ─── component ────────────────────────────────────────────────────
export function TimePicker({
  value,
  onChange,
  label,
  error,
  placeholder = "Pick a time",
  disabled,
  minuteStep = 15,
  className,
}: TimePickerProps) {
  const { h: initH, m: initM } = parseTime(value);
  const [hour, setHour] = useState(initH);
  const [minute, setMinute] = useState(initM);

  const commit = useCallback(
    (h: number, m: number) => {
      onChange(`${pad(h)}:${pad(m)}`);
    },
    [onChange],
  );

  const changeHour = (delta: number) => {
    const next = (hour + delta + 24) % 24;
    setHour(next);
    commit(next, minute);
  };

  const changeMinute = (delta: number) => {
    const steps = 60 / minuteStep;
    const currentStep = Math.round(minute / minuteStep);
    const nextStep = (currentStep + delta + steps) % steps;
    const next = nextStep * minuteStep;
    setMinute(next);
    commit(hour, next);
  };

  const displayValue = value ? `${pad(hour)}:${pad(minute)}` : null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label className="text-[11px] uppercase tracking-[0.03em] text-text-muted font-mono">
          {label}
        </label>
      )}

      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-[4px] border border-border-emphasis bg-bg-overlay px-3 text-sm transition-colors",
              "focus:outline-none focus:border-accent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              displayValue ? "text-text-primary" : "text-text-disabled",
              error && "border-danger-text",
            )}
          >
            <Clock className="h-3.5 w-3.5 text-text-muted shrink-0" />
            {displayValue ?? placeholder}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className={cn(
              "z-50 rounded-[4px] border border-border-emphasis bg-bg-surface shadow-lg p-4",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            )}
          >
            {/* display */}
            <div className="text-center text-2xl font-mono font-medium text-text-primary mb-4 tracking-widest">
              {pad(hour)}:{pad(minute)}
            </div>

            {/* spinners */}
            <div className="flex items-center gap-6 justify-center">
              {/* hour column */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => changeHour(1)}
                  className="h-7 w-7 flex items-center justify-center rounded-[4px] hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <span className="text-xs text-text-muted font-mono w-7 text-center select-none">
                  HH
                </span>
                <button
                  type="button"
                  onClick={() => changeHour(-1)}
                  className="h-7 w-7 flex items-center justify-center rounded-[4px] hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <span className="text-text-muted font-mono text-lg mb-1">:</span>

              {/* minute column */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => changeMinute(1)}
                  className="h-7 w-7 flex items-center justify-center rounded-[4px] hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <span className="text-xs text-text-muted font-mono w-7 text-center select-none">
                  MM
                </span>
                <button
                  type="button"
                  onClick={() => changeMinute(-1)}
                  className="h-7 w-7 flex items-center justify-center rounded-[4px] hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* quick presets */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["09:00", "12:00", "17:00", "18:30"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    const { h, m } = parseTime(t);
                    setHour(h);
                    setMinute(m);
                    commit(h, m);
                  }}
                  className={cn(
                    "rounded-[4px] border border-border-emphasis px-2 py-1 text-[11px] font-mono transition-colors",
                    "hover:bg-bg-hover text-text-secondary hover:text-text-primary",
                    value === t && "bg-accent/10 border-accent text-accent",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {error && <p className="text-[11px] text-danger-text">{error}</p>}
    </div>
  );
}
