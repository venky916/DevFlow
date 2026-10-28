'use client';

import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useCallback, useState } from 'react';

import { cn } from '../lib/cn';

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
  return String(n).padStart(2, '0');
}

function parseTime(val?: string | null) {
  if (!val) return { h: 9, m: 0 };
  const [hs = '9', ms = '0'] = val.split(':');
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
  placeholder = 'Pick a time',
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
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label className="font-mono text-[11px] tracking-[0.03em] text-text-muted uppercase">
          {label}
        </label>
      )}

      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            disabled={disabled}
            className={cn(
              'flex h-9 w-full items-center gap-2 rounded-[4px] border border-border-emphasis bg-bg-overlay px-3 text-sm transition-colors',
              'focus:border-accent focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              displayValue ? 'text-text-primary' : 'text-text-disabled',
              error && 'border-danger-text',
            )}
          >
            <Clock className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            {displayValue ?? placeholder}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className={cn(
              'z-50 rounded-[4px] border border-border-emphasis bg-bg-surface p-4 shadow-lg',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            )}
          >
            {/* display */}
            <div className="mb-4 text-center font-mono text-2xl font-medium tracking-widest text-text-primary">
              {pad(hour)}:{pad(minute)}
            </div>

            {/* spinners */}
            <div className="flex items-center justify-center gap-6">
              {/* hour column */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => changeHour(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <span className="w-7 text-center font-mono text-xs text-text-muted select-none">
                  HH
                </span>
                <button
                  onClick={() => changeHour(-1)}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <span className="mb-1 font-mono text-lg text-text-muted">:</span>

              {/* minute column */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => changeMinute(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <span className="w-7 text-center font-mono text-xs text-text-muted select-none">
                  MM
                </span>
                <button
                  onClick={() => changeMinute(-1)}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* quick presets */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {['09:00', '12:00', '17:00', '18:30'].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    const { h, m } = parseTime(t);
                    setHour(h);
                    setMinute(m);
                    commit(h, m);
                  }}
                  className={cn(
                    'rounded-[4px] border border-border-emphasis px-2 py-1 font-mono text-[11px] transition-colors',
                    'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
                    value === t && 'border-accent bg-accent/10 text-accent',
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
