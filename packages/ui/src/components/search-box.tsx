// packages/ui/src/components/search-box.tsx
'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '../lib/cn';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchBox({
  value,
  onChange,
  placeholder = 'Search issues...',
  debounceMs = 300,
}: Props) {
  const [expanded, setExpanded] = useState(!!value);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // keep local text in sync if parent resets filters externally (e.g. "clear all")
  useEffect(() => {
    setLocalValue(value);
    if (value) setExpanded(true);
  }, [value]);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  const handleType = (next: string) => {
    setLocalValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), debounceMs);
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    // only collapse back to icon if there's nothing typed — an active
    // search should stay visible so the user can see/edit what's filtering
    if (!localValue) setExpanded(false);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
        title="Search issues"
      >
        <Search className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'flex h-7 shrink-0 items-center gap-1.5 rounded-[4px] border border-border-default bg-bg-hover px-2 transition-all',
        'w-[220px] focus-within:border-border-emphasis',
      )}
    >
      <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" />
      <input
        ref={inputRef}
        value={localValue}
        onChange={(e) => handleType(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === 'Escape' && handleClear()}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="shrink-0 cursor-pointer text-text-muted transition-colors hover:text-text-primary"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
