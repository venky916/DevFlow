"use client";

import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import {
  CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "../lib/cn";

// ─── types ────────────────────────────────────────────────────────
// RHF stores Date object
// Zod schema: z.coerce.date()
// JSON.stringify → ISO string automatically
interface DateTimePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  minuteStep?: 1 | 5 | 10 | 15 | 30;
  className?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDisplay(date: Date): string {
  return (
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + ` · ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
  );
}

// ─── component ────────────────────────────────────────────────────
export function DateTimePicker({
  value,
  onChange,
  label,
  error,
  placeholder = "Pick date & time",
  disabled,
  minDate,
  maxDate,
  minuteStep = 15,
  className,
}: DateTimePickerProps) {
  // internal draft state — committed on every change
  const [hour, setHour] = useState(value ? value.getUTCHours() : 9);
  const [minute, setMinute] = useState(value ? value.getUTCMinutes() : 0);

  // combine selected date with current hour/minute into UTC Date
  const buildDate = useCallback((date: Date, h: number, m: number): Date => {
    const d = new Date(date);
    d.setUTCHours(h, m, 0, 0);
    return d;
  }, []);

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) {
      onChange(null);
      return;
    }
    onChange(buildDate(day, hour, minute));
  };

  const changeHour = (delta: number) => {
    const next = (hour + delta + 24) % 24;
    setHour(next);
    if (value) onChange(buildDate(value, next, minute));
  };

  const changeMinute = (delta: number) => {
    const steps = 60 / minuteStep;
    const currentStep = Math.round(minute / minuteStep);
    const nextStep = (currentStep + delta + steps) % steps;
    const next = nextStep * minuteStep;
    setMinute(next);
    if (value) onChange(buildDate(value, hour, next));
  };

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
              "flex h-9 w-full items-center justify-between rounded-[4px] border border-border-emphasis bg-bg-overlay px-3 text-sm transition-colors",
              "focus:outline-none focus:border-accent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              value ? "text-text-primary" : "text-text-disabled",
              error && "border-danger-text",
            )}
          >
            <span className="flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5 text-text-muted shrink-0" />
              {value ? formatDisplay(value) : placeholder}
            </span>
            {value && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onChange(null);
                  }
                }}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className={cn(
              "z-50 rounded-[4px] border border-border-emphasis bg-bg-surface shadow-lg",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            )}
          >
            {/* ── calendar ─────────────────────────────── */}
            <DayPicker
              mode="single"
              selected={value ?? undefined}
              onSelect={handleDaySelect}
              disabled={[
                ...(minDate ? [{ before: minDate }] : []),
                ...(maxDate ? [{ after: maxDate }] : []),
              ]}
              showOutsideDays
              classNames={{
                root: "p-3 pb-0",
                months: "flex flex-col",
                month: "space-y-3",
                month_caption: "flex items-center justify-between px-1 mb-1",
                caption_label: "text-sm font-medium text-text-primary",
                nav: "flex items-center gap-1",
                button_previous: cn(
                  "h-7 w-7 flex items-center justify-center rounded-[4px] border border-border-emphasis",
                  "text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors",
                ),
                button_next: cn(
                  "h-7 w-7 flex items-center justify-center rounded-[4px] border border-border-emphasis",
                  "text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors",
                ),
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday:
                  "w-9 text-[11px] text-text-muted font-mono text-center pb-1",
                week: "flex mt-1",
                day: "p-0",
                day_button: cn(
                  "h-9 w-9 text-sm text-text-secondary rounded-[4px] transition-colors",
                  "hover:bg-bg-hover hover:text-text-primary",
                  "focus:outline-none focus:bg-bg-hover",
                ),
                selected: "!bg-accent !text-white rounded-[4px]",
                today: "text-accent font-medium",
                outside: "text-text-disabled opacity-50",
                disabled: "text-text-disabled opacity-30 cursor-not-allowed",
              }}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === "left" ? (
                    <ChevronLeft className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  ),
              }}
            />

            {/* ── time picker ──────────────────────────── */}
            <div className="border-t border-border-emphasis mx-3 mt-3 pt-3 pb-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] text-text-muted font-mono uppercase tracking-wider">
                  <Clock className="h-3 w-3" />
                  Time (UTC)
                </span>

                {/* hour + minute spinners */}
                <div className="flex items-center gap-1">
                  {/* hour */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => changeHour(1)}
                      className="h-6 w-6 flex items-center justify-center rounded-[3px] hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm font-mono font-medium text-text-primary w-8 text-center select-none">
                      {pad(hour)}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeHour(-1)}
                      className="h-6 w-6 flex items-center justify-center rounded-[3px] hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <span className="text-text-muted font-mono text-sm pb-px">
                    :
                  </span>

                  {/* minute */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => changeMinute(1)}
                      className="h-6 w-6 flex items-center justify-center rounded-[3px] hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm font-mono font-medium text-text-primary w-8 text-center select-none">
                      {pad(minute)}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeMinute(-1)}
                      className="h-6 w-6 flex items-center justify-center rounded-[3px] hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {error && <p className="text-[11px] text-danger-text">{error}</p>}
    </div>
  );
}
