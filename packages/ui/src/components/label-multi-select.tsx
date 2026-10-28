'use client';

import * as Popover from '@radix-ui/react-popover';
import { Check, Tag, X } from 'lucide-react';

import { cn } from '../lib/cn';
import { LabelChip } from './label-chip';

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelMultiSelectProps {
  labels: Label[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  disabled?: boolean;
}

export function LabelMultiSelect({
  labels,
  selectedIds,
  onChange,
  label,
  disabled,
}: LabelMultiSelectProps) {
  const selectedLabels = labels.filter((l) => selectedIds.includes(l.id));

  const toggle = (labelId: string) => {
    if (disabled) return;
    if (selectedIds.includes(labelId)) {
      onChange(selectedIds.filter((id) => id !== labelId));
    } else {
      onChange([...selectedIds, labelId]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="font-mono text-[11px] tracking-[0.03em] text-text-muted uppercase">
          {label}
        </label>
      )}

      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            disabled={disabled}
            className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-[4px] border border-border-emphasis bg-bg-overlay px-3 py-1.5 text-left transition-colors focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {selectedLabels.length === 0 ? (
              <span className="flex items-center gap-2 text-sm text-text-disabled">
                <Tag className="h-3.5 w-3.5" />
                No labels
              </span>
            ) : (
              selectedLabels.map((l) => (
                <span key={l.id} className="inline-flex items-center gap-0.5">
                  <LabelChip name={l.name} color={l.color} size="sm" />
                  {!disabled && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(l.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          toggle(l.id);
                        }
                      }}
                      className="text-text-muted transition-colors hover:text-text-primary"
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  )}
                </span>
              ))
            )}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-50 w-[220px] rounded-[4px] border border-border-emphasis bg-bg-surface p-1 shadow-lg"
          >
            {labels.map((l) => {
              const checked = selectedIds.includes(l.id);
              return (
                <button
                  key={l.id}
                  onClick={() => toggle(l.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-left text-[13px] transition-colors',
                    checked
                      ? 'bg-accent-subtle text-text-primary'
                      : 'text-text-secondary hover:bg-bg-hover',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border',
                      checked ? 'border-accent bg-accent' : 'border-border-emphasis',
                    )}
                  >
                    {checked && <Check className="h-2.5 w-2.5 text-white" />}
                  </span>
                  <LabelChip name={l.name} color={l.color} size="sm" />
                </button>
              );
            })}
            {labels.length === 0 && (
              <p className="px-2 py-3 text-center text-[12px] text-text-muted">No labels yet</p>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
