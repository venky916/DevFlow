"use client";

import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "../lib/cn";

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DatePicker({
  value,
  onChange,
  label,
  error,
  placeholder = "Pick a date",
  disabled,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  // tracks which month the calendar grid is showing —
  // independent from `value` so navigating (prev/next) doesn't
  // get fought by the parent's controlled value on every render
  const [month, setMonth] = useState<Date>(value ?? new Date());

  // when the selected value changes from OUTSIDE this component
  // (form reset, editing a different sprint, etc), jump the
  // visible month to match it — this is the part that was missing
  useEffect(() => {
    if (value) setMonth(value);
  }, [value]);

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
                aria-label="Clear date"
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
            <DayPicker
              mode="single"
              selected={value ?? undefined}
              onSelect={(date) => onChange(date ?? null)}
              month={month}
              onMonthChange={setMonth}
              disabled={[
                ...(minDate ? [{ before: minDate }] : []),
                ...(maxDate ? [{ after: maxDate }] : []),
              ]}
              showOutsideDays
              classNames={{
                root: "p-3",
                months: "flex flex-col",
                month: "space-y-4",
                month_caption: "flex items-center justify-between px-1 my-2",
                caption_label: "text-sm font-medium text-text-primary",
                nav: "flex items-center gap-4",
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
                range_middle: "bg-accent/10",
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
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {error && <p className="text-[11px] text-danger-text">{error}</p>}
    </div>
  );
}
